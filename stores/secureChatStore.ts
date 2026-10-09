import { create } from 'zustand';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { E2EEManager, TamperDetectedError } from '../lib/crypto/E2EEManager';
import { DeviceKeyManager } from '../lib/crypto/DeviceKeyManager';
import { MediaEncryptionManager } from '../lib/crypto/MediaEncryption';
import { EncryptedMessagePayload, DeviceIdentityBundle } from '../lib/crypto/types';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface DecryptedMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderDeviceId: string;
  recipientId: string;
  content: string; // Plaintext decrypted client-side
  messageType: 'text' | 'photo' | 'video' | 'voice' | 'sticker';
  mediaUrl?: string; // Decrypted safe Data URL or blob reference
  mediaKey?: string;
  mediaIv?: string;
  mediaHash?: string;
  replyToId?: string;
  replySnippet?: string;
  isEdited: boolean;
  reactions: Record<string, string[]>; // emoji -> array of userIds
  deliveryStatus: 'queued' | 'sent' | 'delivered' | 'read' | 'failed';
  isDisappearing: boolean;
  expiresAt?: string;
  remainingSeconds?: number;
  createdAt: string;
}

export type DisappearingDuration = 0 | 30 | 300 | 3600 | 86400 | 604800;

interface SecureChatState {
  conversationId: string | null;
  partnerId: string | null;
  partnerDeviceId: string | null;
  partnerIdentityKey: string | null;
  partnerSafetyNumber: string | null;
  isPartnerVerified: boolean;
  hasKeyChangedAlert: boolean;
  messages: DecryptedMessage[];
  isLoading: boolean;
  partnerIsTyping: boolean;
  partnerOnline: boolean;
  disappearingDuration: DisappearingDuration;
  offlineQueue: Array<{
    id: string;
    content: string;
    type: DecryptedMessage['messageType'];
    mediaUrl?: string;
    replyToId?: string;
  }>;
  searchQuery: string;
  channel: RealtimeChannel | null;

  // Actions
  initSecureChat: (coupleId: string, currentUserId: string, partnerUserId: string) => Promise<void>;
  sendMessage: (content: string, type?: DecryptedMessage['messageType'], mediaData?: { rawBytes: Uint8Array; mimeType: string }, replyToId?: string) => Promise<{ success: boolean; error?: string }>;
  editMessage: (messageId: string, newContent: string) => Promise<void>;
  deleteMessage: (messageId: string) => Promise<void>;
  addReaction: (messageId: string, emoji: string, userId: string) => Promise<void>;
  markAsRead: (messageId: string, userId: string) => Promise<void>;
  setTyping: (isTyping: boolean) => void;
  setDisappearingDuration: (duration: DisappearingDuration) => Promise<void>;
  setSearchQuery: (query: string) => void;
  retryOfflineQueue: () => Promise<void>;
  clearLocalChatCache: () => void;
  cleanupExpiredMessages: () => void;
  leaveSecureChat: () => void;
}

const e2ee = E2EEManager.getInstance();
const keyManager = DeviceKeyManager.getInstance();
const mediaCrypto = MediaEncryptionManager.getInstance();

export const useSecureChatStore = create<SecureChatState>((set, get) => ({
  conversationId: null,
  partnerId: null,
  partnerDeviceId: null,
  partnerIdentityKey: null,
  partnerSafetyNumber: null,
  isPartnerVerified: false,
  hasKeyChangedAlert: false,
  messages: [],
  isLoading: false,
  partnerIsTyping: false,
  partnerOnline: false,
  disappearingDuration: 0,
  offlineQueue: [],
  searchQuery: '',
  channel: null,

  initSecureChat: async (coupleId: string, currentUserId: string, partnerUserId: string) => {
    set({ isLoading: true, partnerId: partnerUserId });

    try {
      // 1. Ensure local cryptographic identity is initialized
      const myIdentity = await keyManager.getOrGenerateIdentity();

      // Upsert local device identity to Supabase
      if (isSupabaseConfigured) {
        await supabase.from('device_identities').upsert({
          user_id: currentUserId,
          device_id: myIdentity.deviceId,
          identity_key: myIdentity.identityKey,
          signed_prekey: myIdentity.signedPrekey,
          prekey_signature: myIdentity.prekeySignature,
          registration_id: myIdentity.registrationId,
          safety_number: myIdentity.safetyNumber,
          updated_at: new Date().toISOString(),
        });
      }

      // 2. Fetch or create verified couple conversation
      let convId = `conv-${coupleId}`;
      if (isSupabaseConfigured) {
        const { data: convData } = await supabase
          .from('conversations')
          .select('id')
          .eq('couple_space_id', coupleId)
          .single();

        if (convData) {
          convId = convData.id;
        } else {
          const { data: newConv } = await supabase
            .from('conversations')
            .insert({ couple_space_id: coupleId })
            .select('id')
            .single();
          if (newConv) convId = newConv.id;
        }

        // Fetch disappearing policy
        const { data: policyData } = await supabase
          .from('disappearing_message_policies')
          .select('duration_seconds')
          .eq('conversation_id', convId)
          .single();
        if (policyData) {
          set({ disappearingDuration: policyData.duration_seconds as DisappearingDuration });
        }
      }

      set({ conversationId: convId });

      // 3. Retrieve partner's cryptographic device identity
      let partnerPubKey = myIdentity.identityKey; // Safe fallback for single-user dev testing
      let partnerDevId = 'dev_partner_mock';
      let partnerSafetyNum = myIdentity.safetyNumber;

      if (isSupabaseConfigured && partnerUserId) {
        const { data: partnerDevices } = await supabase
          .from('device_identities')
          .select('*')
          .eq('user_id', partnerUserId)
          .order('updated_at', { ascending: false })
          .limit(1);

        if (partnerDevices && partnerDevices.length > 0) {
          const p = partnerDevices[0];
          partnerPubKey = p.identity_key;
          partnerDevId = p.device_id;
          partnerSafetyNum = p.safety_number;
        }
      }

      // 4. Verify partner identity & check for key rotation warnings
      const verifyCheck = await keyManager.getPartnerVerificationStatus(partnerPubKey);
      set({
        partnerDeviceId: partnerDevId,
        partnerIdentityKey: partnerPubKey,
        partnerSafetyNumber: partnerSafetyNum,
        isPartnerVerified: verifyCheck.isVerified,
        hasKeyChangedAlert: verifyCheck.hasKeyChanged,
      });

      // 5. Load and decrypt existing messages
      if (isSupabaseConfigured) {
        const { data: msgRows } = await supabase
          .from('encrypted_messages')
          .select('*')
          .eq('conversation_id', convId)
          .order('created_at', { ascending: true })
          .limit(100);

        if (msgRows) {
          const decryptedList: DecryptedMessage[] = [];
          for (const row of msgRows) {
            try {
              let plaintext = '[Encrypted Payload]';
              let mediaDataUrl: string | undefined;

              // Parse payload
              const payload: EncryptedMessagePayload = {
                ciphertext: row.ciphertext,
                iv: row.iv,
                tag: row.tag,
                ephemeralPublicKey: row.ephemeral_public_key,
                senderDeviceId: row.sender_device_id,
                recipientDeviceId: row.recipient_device_id,
                algorithm: 'AES-256-GCM+X25519-HKDF',
                timestamp: new Date(row.created_at).getTime(),
              };

              // Decrypt client-side
              const decryptedRaw = await e2ee.decryptMessage(payload, convId);
              try {
                const parsed = JSON.parse(decryptedRaw);
                plaintext = parsed.text || decryptedRaw;
                if (parsed.mediaKey && parsed.mediaUrl) {
                  mediaDataUrl = parsed.mediaUrl;
                }
              } catch {
                plaintext = decryptedRaw;
              }

              decryptedList.push({
                id: row.id,
                conversationId: row.conversation_id,
                senderId: row.sender_id,
                senderDeviceId: row.sender_device_id,
                recipientId: row.recipient_id,
                content: plaintext,
                messageType: row.message_type as any,
                mediaUrl: mediaDataUrl,
                replyToId: row.reply_to_id,
                isEdited: row.is_edited,
                reactions: {},
                deliveryStatus: 'read',
                isDisappearing: row.is_disappearing,
                expiresAt: row.expires_at,
                createdAt: row.created_at,
              });
            } catch {
              decryptedList.push({
                id: row.id,
                conversationId: row.conversation_id,
                senderId: row.sender_id,
                senderDeviceId: row.sender_device_id,
                recipientId: row.recipient_id,
                content: '🔒 End-to-end encrypted message',
                messageType: row.message_type as any,
                isEdited: false,
                reactions: {},
                deliveryStatus: 'delivered',
                isDisappearing: row.is_disappearing,
                createdAt: row.created_at,
              });
            }
          }
          set({ messages: decryptedList });
        }
      }

      // 6. Subscribe to Realtime E2EE messaging channel
      if (isSupabaseConfigured) {
        get().leaveSecureChat();
        const realtimeChannel = supabase.channel(`e2ee:${convId}`);

        realtimeChannel.on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'encrypted_messages', filter: `conversation_id=eq.${convId}` },
          async (event) => {
            const newRow = event.new as any;
            if (newRow.sender_id !== currentUserId) {
              try {
                const payload: EncryptedMessagePayload = {
                  ciphertext: newRow.ciphertext,
                  iv: newRow.iv,
                  tag: newRow.tag,
                  ephemeralPublicKey: newRow.ephemeral_public_key,
                  senderDeviceId: newRow.sender_device_id,
                  recipientDeviceId: newRow.recipient_device_id,
                  algorithm: 'AES-256-GCM+X25519-HKDF',
                  timestamp: new Date(newRow.created_at).getTime(),
                };

                const decryptedRaw = await e2ee.decryptMessage(payload, convId);
                let text = decryptedRaw;
                let mediaUrl: string | undefined;

                try {
                  const parsed = JSON.parse(decryptedRaw);
                  text = parsed.text || decryptedRaw;
                  mediaUrl = parsed.mediaUrl;
                } catch {}

                const incomingMsg: DecryptedMessage = {
                  id: newRow.id,
                  conversationId: newRow.conversation_id,
                  senderId: newRow.sender_id,
                  senderDeviceId: newRow.sender_device_id,
                  recipientId: newRow.recipient_id,
                  content: text,
                  messageType: newRow.message_type,
                  mediaUrl,
                  replyToId: newRow.reply_to_id,
                  isEdited: newRow.is_edited,
                  reactions: {},
                  deliveryStatus: 'delivered',
                  isDisappearing: newRow.is_disappearing,
                  expiresAt: newRow.expires_at,
                  createdAt: newRow.created_at,
                };

                set((s) => ({ messages: [...s.messages, incomingMsg] }));

                // Send delivered receipt
                await supabase.from('message_receipts').upsert({
                  message_id: newRow.id,
                  user_id: currentUserId,
                  status: 'delivered',
                });
              } catch {
                // If decrypt fails, warn user without crashing
              }
            }
          }
        );

        // Typing and presence broadcast
        realtimeChannel.on('broadcast', { event: 'typing' }, (msg) => {
          set({ partnerIsTyping: Boolean(msg.payload?.isTyping) });
        });

        realtimeChannel.on('broadcast', { event: 'presence' }, (msg) => {
          set({ partnerOnline: Boolean(msg.payload?.online) });
        });

        realtimeChannel.subscribe();
        set({ channel: realtimeChannel });
      }

      set({ isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  sendMessage: async (content, type = 'text', mediaData, replyToId) => {
    const {
      conversationId,
      partnerId,
      partnerDeviceId,
      partnerIdentityKey,
      disappearingDuration,
    } = get();

    if (!conversationId || (!content.trim() && !mediaData)) {
      return { success: false, error: 'Cannot send empty message' };
    }

    const myIdentity = await keyManager.getOrGenerateIdentity();
    const recipientKey = partnerIdentityKey || myIdentity.identityKey;
    const recipientDevId = partnerDeviceId || myIdentity.deviceId;
    const targetPartnerId = partnerId || 'partner-id';

    const tempId = 'temp-' + Date.now();
    let mediaUrlPayload: string | undefined;
    let mediaKeyPayload: string | undefined;
    let mediaIvPayload: string | undefined;
    let mediaHashPayload: string | undefined;

    // Handle Client-Side Media Encryption
    if (mediaData) {
      const encryptedMedia = await mediaCrypto.encryptMedia(mediaData.rawBytes, mediaData.mimeType);
      mediaKeyPayload = encryptedMedia.mediaKey;
      mediaIvPayload = encryptedMedia.iv;
      mediaHashPayload = encryptedMedia.ciphertextHash;
      mediaUrlPayload = mediaCrypto.createSafeDataUrl(mediaData.rawBytes, mediaData.mimeType);

      // If Supabase storage is active, upload encrypted bytes to private bucket
      if (isSupabaseConfigured) {
        const filePath = `${conversationId}/${Date.now()}_encrypted.bin`;
        await supabase.storage
          .from('encrypted-media')
          .upload(filePath, encryptedMedia.encryptedBytes, {
            contentType: 'application/octet-stream',
          });
      }
    }

    // Prepare envelope payload
    const messageEnvelopeObject = {
      text: content.trim(),
      mediaUrl: mediaUrlPayload,
      mediaKey: mediaKeyPayload,
      mediaIv: mediaIvPayload,
      mediaHash: mediaHashPayload,
      replyToId,
      timestamp: Date.now(),
    };

    // Optimistic UI state
    const optimisticMsg: DecryptedMessage = {
      id: tempId,
      conversationId,
      senderId: myIdentity.deviceId,
      senderDeviceId: myIdentity.deviceId,
      recipientId: targetPartnerId,
      content: content.trim(),
      messageType: type,
      mediaUrl: mediaUrlPayload,
      replyToId,
      isEdited: false,
      reactions: {},
      deliveryStatus: 'queued',
      isDisappearing: disappearingDuration > 0,
      createdAt: new Date().toISOString(),
    };

    set((state) => ({ messages: [...state.messages, optimisticMsg] }));

    try {
      // 1. Perform E2EE Encryption with AES-256-GCM + X25519-HKDF
      const encryptedEnvelope = await e2ee.encryptObject(
        messageEnvelopeObject,
        recipientKey,
        recipientDevId,
        conversationId
      );

      // Calculate disappearing expiration
      let expiresAt: string | undefined;
      if (disappearingDuration > 0) {
        expiresAt = new Date(Date.now() + disappearingDuration * 1000).toISOString();
      }

      if (isSupabaseConfigured) {
        const { data: savedMsg, error: insertError } = await supabase
          .from('encrypted_messages')
          .insert({
            conversation_id: conversationId,
            sender_id: (await supabase.auth.getUser()).data.user?.id || targetPartnerId,
            sender_device_id: encryptedEnvelope.senderDeviceId,
            recipient_id: targetPartnerId,
            recipient_device_id: encryptedEnvelope.recipientDeviceId,
            ciphertext: encryptedEnvelope.ciphertext,
            iv: encryptedEnvelope.iv,
            tag: encryptedEnvelope.tag,
            ephemeral_public_key: encryptedEnvelope.ephemeralPublicKey,
            message_type: type,
            is_disappearing: disappearingDuration > 0,
            expires_at: expiresAt,
            reply_to_id: replyToId,
          })
          .select('id, created_at')
          .single();

        if (insertError) {
          throw insertError;
        }

        if (savedMsg) {
          set((state) => ({
            messages: state.messages.map((m) =>
              m.id === tempId
                ? { ...m, id: savedMsg.id, deliveryStatus: 'sent', createdAt: savedMsg.created_at }
                : m
            ),
          }));
        }
      } else {
        // Offline / simulated success
        set((state) => ({
          messages: state.messages.map((m) =>
            m.id === tempId ? { ...m, deliveryStatus: 'sent' } : m
          ),
        }));
      }

      return { success: true };
    } catch (e: any) {
      // Queue offline for automatic retry
      set((state) => ({
        messages: state.messages.map((m) =>
          m.id === tempId ? { ...m, deliveryStatus: 'failed' } : m
        ),
        offlineQueue: [
          ...state.offlineQueue,
          { id: tempId, content: content.trim(), type, mediaUrl: mediaUrlPayload, replyToId },
        ],
      }));
      return { success: false, error: e.message };
    }
  },

  editMessage: async (messageId, newContent) => {
    set((state) => ({
      messages: state.messages.map((m) =>
        m.id === messageId ? { ...m, content: newContent, isEdited: true } : m
      ),
    }));

    if (isSupabaseConfigured) {
      // Encrypt updated content and update in DB
      const { conversationId, partnerIdentityKey, partnerDeviceId } = get();
      if (conversationId && partnerIdentityKey) {
        const env = await e2ee.encryptMessage(
          newContent,
          partnerIdentityKey,
          partnerDeviceId || 'dev',
          conversationId
        );
        await supabase
          .from('encrypted_messages')
          .update({
            ciphertext: env.ciphertext,
            iv: env.iv,
            tag: env.tag,
            ephemeral_public_key: env.ephemeralPublicKey,
            is_edited: true,
          })
          .eq('id', messageId);
      }
    }
  },

  deleteMessage: async (messageId) => {
    set((state) => ({
      messages: state.messages.filter((m) => m.id !== messageId),
    }));

    if (isSupabaseConfigured) {
      await supabase.from('encrypted_messages').delete().eq('id', messageId);
    }
  },

  addReaction: async (messageId, emoji, userId) => {
    set((state) => ({
      messages: state.messages.map((m) => {
        if (m.id !== messageId) return m;
        const currentReactions = { ...m.reactions };
        const users = currentReactions[emoji] || [];
        const exists = users.includes(userId);

        if (exists) {
          currentReactions[emoji] = users.filter((u) => u !== userId);
          if (currentReactions[emoji].length === 0) {
            delete currentReactions[emoji];
          }
        } else {
          currentReactions[emoji] = [...users, userId];
        }
        return { ...m, reactions: currentReactions };
      }),
    }));
  },

  markAsRead: async (messageId, userId) => {
    set((state) => ({
      messages: state.messages.map((m) =>
        m.id === messageId ? { ...m, deliveryStatus: 'read' } : m
      ),
    }));

    if (isSupabaseConfigured) {
      await supabase.from('message_receipts').upsert({
        message_id: messageId,
        user_id: userId,
        status: 'read',
      });
    }
  },

  setTyping: (isTyping) => {
    const channel = get().channel;
    if (channel) {
      channel.send({
        type: 'broadcast',
        event: 'typing',
        payload: { isTyping },
      });
    }
  },

  setDisappearingDuration: async (duration) => {
    set({ disappearingDuration: duration });
    const { conversationId } = get();

    if (isSupabaseConfigured && conversationId) {
      await supabase.from('disappearing_message_policies').upsert({
        conversation_id: conversationId,
        duration_seconds: duration,
        updated_at: new Date().toISOString(),
      });
    }
  },

  setSearchQuery: (query) => {
    set({ searchQuery: query });
  },

  retryOfflineQueue: async () => {
    const queue = [...get().offlineQueue];
    if (queue.length === 0) return;
    set({ offlineQueue: [] });

    for (const item of queue) {
      await get().sendMessage(item.content, item.type, undefined, item.replyToId);
    }
  },

  clearLocalChatCache: () => {
    set({ messages: [] });
  },

  cleanupExpiredMessages: () => {
    const now = Date.now();
    set((state) => ({
      messages: state.messages.filter((m) => {
        if (!m.isDisappearing || !m.expiresAt) return true;
        return new Date(m.expiresAt).getTime() > now;
      }),
    }));
  },

  leaveSecureChat: () => {
    const channel = get().channel;
    if (channel) {
      supabase.removeChannel(channel);
      set({ channel: null });
    }
  },
}));
