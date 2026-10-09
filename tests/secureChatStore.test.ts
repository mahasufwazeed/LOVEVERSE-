jest.mock('../lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(async () => ({ data: null })),
          order: jest.fn(() => ({
            limit: jest.fn(async () => ({ data: [] })),
          })),
        })),
      })),
      upsert: jest.fn(async () => ({ data: null })),
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn(async () => ({ data: { id: 'saved-id', created_at: new Date().toISOString() } })),
        })),
      })),
      delete: jest.fn(() => ({
        eq: jest.fn(async () => ({ data: null })),
      })),
      update: jest.fn(() => ({
        eq: jest.fn(async () => ({ data: null })),
      })),
    })),
    channel: jest.fn(() => ({
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn().mockReturnThis(),
      send: jest.fn(),
    })),
    removeChannel: jest.fn(),
    auth: {
      getUser: jest.fn(async () => ({ data: { user: { id: 'user-alice-id' } } })),
    },
    storage: {
      from: jest.fn(() => ({
        upload: jest.fn(async () => ({ data: { path: 'uploaded.bin' } })),
      })),
    },
  },
  isSupabaseConfigured: false,
}));

jest.mock('expo-secure-store', () => {
  const store = new Map<string, string>();
  return {
    setItemAsync: jest.fn(async (key: string, val: string) => {
      store.set(key, val);
    }),
    getItemAsync: jest.fn(async (key: string) => {
      return store.get(key) || null;
    }),
    deleteItemAsync: jest.fn(async (key: string) => {
      store.delete(key);
    }),
    WHEN_UNLOCKED_THIS_DEVICE_ONLY: 1,
  };
});

jest.mock('expo-crypto', () => {
  const nodeCrypto = require('crypto');
  return {
    getRandomValues: (arr: Uint8Array) => nodeCrypto.randomFillSync(arr),
    getRandomBytes: (len: number) => nodeCrypto.randomBytes(len),
  };
});

jest.mock('expo-local-authentication', () => ({
  hasHardwareAsync: jest.fn(async () => true),
  isEnrolledAsync: jest.fn(async () => true),
  authenticateAsync: jest.fn(async () => ({ success: true })),
}));

import { useSecureChatStore } from '../stores/secureChatStore';
import { useSecureGalleryStore } from '../stores/secureGalleryStore';
import { utf8ToBytes } from '../lib/crypto/utils';

describe('LoveVerse Secure Chat & Private Gallery Suite', () => {
  beforeEach(async () => {
    const chatStore = useSecureChatStore.getState();
    await chatStore.initSecureChat('couple-space-test-id', 'user-alice-id', 'user-bob-id');
  });

  describe('1. E2EE Message Pipeline & Queue', () => {
    it('sends an encrypted message and marks as queued or sent', async () => {
      const chatStore = useSecureChatStore.getState();
      const sendResult = await chatStore.sendMessage('Hello my love! 🥰', 'text');

      expect(sendResult.success).toBe(true);
      const messages = useSecureChatStore.getState().messages;
      expect(messages.length).toBeGreaterThan(0);

      const lastMsg = messages[messages.length - 1];
      expect(lastMsg.content).toBe('Hello my love! 🥰');
      expect(lastMsg.deliveryStatus).toBe('sent');
      expect(lastMsg.messageType).toBe('text');
    });

    it('attaches replies with replyToId referencing another message', async () => {
      const chatStore = useSecureChatStore.getState();
      await chatStore.sendMessage('Original message', 'text');
      const messages = useSecureChatStore.getState().messages;
      const originalId = messages[messages.length - 1].id;

      await chatStore.sendMessage('Reply to original', 'text', undefined, originalId);
      const updatedMessages = useSecureChatStore.getState().messages;
      const replyMsg = updatedMessages[updatedMessages.length - 1];

      expect(replyMsg.replyToId).toBe(originalId);
    });

    it('edits messages and updates isEdited flag', async () => {
      const chatStore = useSecureChatStore.getState();
      await chatStore.sendMessage('Typo text', 'text');
      const msgId = useSecureChatStore.getState().messages[useSecureChatStore.getState().messages.length - 1].id;

      await chatStore.editMessage(msgId, 'Corrected text');
      const editedMsg = useSecureChatStore.getState().messages.find((m) => m.id === msgId);

      expect(editedMsg?.content).toBe('Corrected text');
      expect(editedMsg?.isEdited).toBe(true);
    });

    it('adds and toggles emoji reactions without decrypting outer messages', async () => {
      const chatStore = useSecureChatStore.getState();
      await chatStore.sendMessage('React to me', 'text');
      const msgId = useSecureChatStore.getState().messages[useSecureChatStore.getState().messages.length - 1].id;

      await chatStore.addReaction(msgId, '❤️', 'user-alice-id');
      let msg = useSecureChatStore.getState().messages.find((m) => m.id === msgId);
      expect(msg?.reactions['❤️']).toContain('user-alice-id');

      // Toggle off
      await chatStore.addReaction(msgId, '❤️', 'user-alice-id');
      msg = useSecureChatStore.getState().messages.find((m) => m.id === msgId);
      expect(msg?.reactions['❤️']).toBeUndefined();
    });

    it('purges expired disappearing messages during cleanup', async () => {
      const chatStore = useSecureChatStore.getState();
      await chatStore.setDisappearingDuration(30);

      // Artificially inject an already expired message
      useSecureChatStore.setState((s) => ({
        messages: [
          ...s.messages,
          {
            id: 'expired-1',
            conversationId: s.conversationId || 'conv-1',
            senderId: 'alice',
            senderDeviceId: 'dev-1',
            recipientId: 'bob',
            content: 'I will vanish',
            messageType: 'text',
            isEdited: false,
            reactions: {},
            deliveryStatus: 'read',
            isDisappearing: true,
            expiresAt: new Date(Date.now() - 5000).toISOString(), // expired 5 seconds ago
            createdAt: new Date(Date.now() - 35000).toISOString(),
          },
        ],
      }));

      chatStore.cleanupExpiredMessages();
      const exists = useSecureChatStore.getState().messages.some((m) => m.id === 'expired-1');
      expect(exists).toBe(false);
    });
  });

  describe('2. Private Couple Gallery Vault', () => {
    it('uploads client-side encrypted media with encrypted metadata', async () => {
      const gallery = useSecureGalleryStore.getState();
      const mockPhoto = utf8ToBytes('RAW_PICTURE_DATA');

      const result = await gallery.uploadMediaToGallery(
        'conv-space-123',
        mockPhoto,
        'image/jpeg',
        'trip.jpg',
        'Our amazing road trip 🚗'
      );

      expect(result.success).toBe(true);
      const items = useSecureGalleryStore.getState().items;
      const uploaded = items.find((i) => i.caption === 'Our amazing road trip 🚗');

      expect(uploaded).toBeDefined();
      expect(uploaded?.mediaType).toBe('photo');
      expect(uploaded?.safeDataUrl).toBeDefined();
    });

    it('toggles favorites and creates albums', async () => {
      const gallery = useSecureGalleryStore.getState();
      const albumId = await gallery.createAlbum('Our Honeymoon 💍');

      expect(albumId).toMatch(/^album-/);
      const albums = useSecureGalleryStore.getState().albums;
      expect(albums.some((a) => a.name === 'Our Honeymoon 💍')).toBe(true);

      const firstItem = gallery.items[0];
      if (firstItem) {
        const initialFav = firstItem.isFavorite;
        await gallery.toggleFavorite(firstItem.id);
        const toggled = useSecureGalleryStore.getState().items.find((i) => i.id === firstItem.id);
        expect(toggled?.isFavorite).toBe(!initialFav);
      }
    });

    it('evicts decrypted RAM cache upon request', () => {
      const gallery = useSecureGalleryStore.getState();
      gallery.clearDecryptedMemoryCache();

      const items = useSecureGalleryStore.getState().items;
      for (const item of items) {
        expect(item.safeDataUrl).toBe('');
      }
    });
  });
});
