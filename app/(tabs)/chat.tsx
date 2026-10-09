import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Image,
} from 'react-native';
import { Colors, Radii, Shadows, Spacing } from '../../constants/theme';
import { useAuthStore } from '../../stores/authStore';
import { useCoupleStore } from '../../stores/coupleStore';
import { useSecureChatStore, DecryptedMessage } from '../../stores/secureChatStore';
import { useAppLockStore } from '../../stores/appLockStore';
import { AvatarStickerGenerator } from '../../components/avatars/AvatarStickerGenerator';
import { AppLockOverlay } from '../../components/chat/AppLockOverlay';
import { PartnerSecurityModal } from '../../components/chat/PartnerSecurityModal';
import { DisappearingDurationModal } from '../../components/chat/DisappearingDurationModal';
import { SecureCoupleGalleryModal } from '../../components/gallery/SecureCoupleGalleryModal';
import { PrivacySettingsModal } from '../../components/chat/PrivacySettingsModal';
import { VoiceNoteRecorder } from '../../components/chat/VoiceNoteRecorder';
import { AvatarStickerDef } from '../../types';
import { utf8ToBytes } from '../../lib/crypto/utils';

const EMOJI_REACTIONS = ['❤️', '🥰', '💋', '✨', '🥺'];

export default function ChatScreen() {
  const { profile } = useAuthStore();
  const { couple, partner } = useCoupleStore();
  const {
    messages,
    partnerIsTyping,
    partnerOnline,
    isPartnerVerified,
    hasKeyChangedAlert,
    disappearingDuration,
    searchQuery,
    initSecureChat,
    sendMessage,
    editMessage,
    deleteMessage,
    addReaction,
    markAsRead,
    setTyping,
    setSearchQuery,
    leaveSecureChat,
    cleanupExpiredMessages,
  } = useSecureChatStore();

  const { initializeLock, recordActivity } = useAppLockStore();

  const [input, setInput] = useState('');
  const [replyingTo, setReplyingTo] = useState<DecryptedMessage | null>(null);
  const [isStickerPickerOpen, setIsStickerPickerOpen] = useState(false);
  const [isSecurityModalOpen, setIsSecurityModalOpen] = useState(false);
  const [isDisappearingModalOpen, setIsDisappearingModalOpen] = useState(false);
  const [isGalleryModalOpen, setIsGalleryModalOpen] = useState(false);
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    initializeLock();
  }, []);

  useEffect(() => {
    if (couple?.id && profile?.id) {
      const partnerId = partner?.id || 'partner';
      initSecureChat(couple.id, profile.id, partnerId);
    }
    return () => leaveSecureChat();
  }, [couple?.id, profile?.id, partner?.id]);

  // Periodic cleanup of expired disappearing messages
  useEffect(() => {
    const interval = setInterval(() => {
      cleanupExpiredMessages();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleSendText = async () => {
    if (!input.trim()) return;
    recordActivity();

    const text = input.trim();
    setInput('');
    const replyId = replyingTo?.id;
    setReplyingTo(null);
    setTyping(false);

    await sendMessage(text, 'text', undefined, replyId);
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const handleSendSticker = async (sticker: AvatarStickerDef) => {
    recordActivity();
    setIsStickerPickerOpen(false);
    await sendMessage(`${sticker.badge} ${sticker.title} — ${sticker.description}`, 'sticker');
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const handleSendVoiceNote = async (audioBytes: Uint8Array, duration: number) => {
    recordActivity();
    await sendMessage(`Voice Note (${duration}s)`, 'voice', { rawBytes: audioBytes, mimeType: 'audio/m4a' });
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const handleSimulatePhotoAttachment = async () => {
    recordActivity();
    // Simulate selecting and client-side encrypting a photo
    const sampleBytes = utf8ToBytes(`PHOTO_IMAGE_BYTES_${Date.now()}`);
    await sendMessage('Sent a private encrypted photo 📸', 'photo', { rawBytes: sampleBytes, mimeType: 'image/jpeg' });
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const handleInputChange = (text: string) => {
    setInput(text);
    setTyping(text.length > 0);
    recordActivity();
  };

  const formatDisappearingBadge = () => {
    if (disappearingDuration === 0) return null;
    if (disappearingDuration === 30) return '30s';
    if (disappearingDuration === 300) return '5m';
    if (disappearingDuration === 3600) return '1h';
    if (disappearingDuration === 86400) return '24h';
    if (disappearingDuration === 604800) return '7d';
    return null;
  };

  // Filter messages based on search
  const displayedMessages = searchQuery.trim()
    ? messages.filter((m) => m.content.toLowerCase().includes(searchQuery.toLowerCase()))
    : messages;

  const renderMessageItem = ({ item }: { item: DecryptedMessage }) => {
    const isMe = item.senderId !== partner?.id;
    const isSticker = item.messageType === 'sticker';
    const isVoice = item.messageType === 'voice';
    const isPhoto = item.messageType === 'photo';

    return (
      <View style={[styles.msgContainer, isMe ? styles.msgRight : styles.msgLeft]}>
        {/* Reply reference preview */}
        {item.replyToId && (
          <View style={styles.replyPreviewCard}>
            <Text style={styles.replyPreviewLabel}>Replying to message</Text>
          </View>
        )}

        {/* Message bubble */}
        {isSticker ? (
          <View style={[styles.stickerCard, isMe ? styles.stickerCardMe : styles.stickerCardPartner]}>
            <View style={styles.stickerHeaderRow}>
              <Text style={{ fontSize: 26 }}>🧑🏻‍❤️‍🧑🏽</Text>
              <Text style={styles.stickerTag}>COUPLE STICKER ✨</Text>
            </View>
            <Text style={styles.stickerText}>{item.content}</Text>
          </View>
        ) : isPhoto ? (
          <View style={[styles.photoCard, isMe ? styles.photoCardMe : styles.photoCardPartner]}>
            {item.mediaUrl ? (
              <Image source={{ uri: item.mediaUrl }} style={styles.chatImage} />
            ) : (
              <View style={styles.encryptedMediaBox}>
                <Text style={{ fontSize: 32 }}>📸</Text>
                <Text style={styles.encryptedMediaText}>🔒 Encrypted Photo</Text>
              </View>
            )}
            <Text style={styles.photoCaption}>{item.content}</Text>
          </View>
        ) : isVoice ? (
          <View style={[styles.voiceBubble, isMe ? styles.bubbleMe : styles.bubblePartner]}>
            <Text style={{ fontSize: 20 }}>🎙️</Text>
            <View style={styles.voiceWaveContainer}>
              <View style={[styles.waveLine, { height: 12 }]} />
              <View style={[styles.waveLine, { height: 18 }]} />
              <View style={[styles.waveLine, { height: 24 }]} />
              <View style={[styles.waveLine, { height: 14 }]} />
              <View style={[styles.waveLine, { height: 8 }]} />
            </View>
            <Text style={[styles.voiceText, isMe ? styles.textMe : styles.textPartner]}>
              {item.content}
            </Text>
          </View>
        ) : (
          <TouchableOpacity
            activeOpacity={0.9}
            onLongPress={() => {
              Alert.alert(
                'Message Options',
                item.content,
                [
                  { text: 'Reply', onPress: () => setReplyingTo(item) },
                  isMe ? { text: 'Edit', onPress: () => {
                    Alert.prompt?.('Edit Message', '', (newText) => {
                      if (newText) editMessage(item.id, newText);
                    }, 'plain-text', item.content);
                  }} : { text: 'Cancel', style: 'cancel' },
                  { text: 'Delete', style: 'destructive', onPress: () => deleteMessage(item.id) },
                  { text: 'Cancel', style: 'cancel' },
                ]
              );
            }}
            style={[
              styles.bubble,
              isMe ? styles.bubbleMe : styles.bubblePartner,
              item.deliveryStatus === 'failed' && styles.failedBubble,
            ]}
          >
            <Text style={[styles.msgText, isMe ? styles.textMe : styles.textPartner]}>
              {item.content}
            </Text>
            {item.isEdited && <Text style={styles.editedTag}>(edited)</Text>}
          </TouchableOpacity>
        )}

        {/* Timestamp, disappearing countdown & delivery receipts */}
        <View style={styles.metaRow}>
          {item.isDisappearing && (
            <Text style={styles.disappearingTag}>⏳ </Text>
          )}
          <Text style={styles.timeText}>
            {item.createdAt ? new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
          </Text>
          {isMe && (
            <Text style={styles.receiptText}>
              {item.deliveryStatus === 'read' ? ' ✓✓' : item.deliveryStatus === 'delivered' ? ' ✓✓' : item.deliveryStatus === 'sent' ? ' ✓' : ' ⏳'}
            </Text>
          )}
        </View>

        {/* Reaction Bar */}
        <View style={styles.reactionRow}>
          {EMOJI_REACTIONS.map((emoji) => {
            const hasReacted = item.reactions[emoji]?.includes(profile?.id || 'me');
            return (
              <TouchableOpacity
                key={emoji}
                onPress={() => profile?.id && addReaction(item.id, emoji, profile.id)}
                style={[styles.reactionBtn, hasReacted && styles.reactionBtnActive]}
              >
                <Text style={styles.reactionEmoji}>{emoji}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* App Lock Protection Modal */}
      <AppLockOverlay />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.partnerAvatarCircle}>
            <Text style={{ fontSize: 22 }}>💑</Text>
            {partnerOnline && <View style={styles.onlineDot} />}
          </View>
          <View>
            <View style={styles.nameRow}>
              <Text style={styles.partnerName}>{partner?.displayName || 'My Sweetheart'}</Text>
              <TouchableOpacity
                onPress={() => setIsSecurityModalOpen(true)}
                style={[styles.verifiedBadge, isPartnerVerified && styles.verifiedBadgeActive]}
              >
                <Text style={styles.verifiedBadgeText}>
                  {isPartnerVerified ? '🔒 Verified' : '🛡️ E2EE'}
                </Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.presenceSub}>
              {partnerIsTyping
                ? 'typing something romantic...'
                : partnerOnline
                ? 'Online now ❤️'
                : 'Encrypted with AES-256-GCM'}
            </Text>
          </View>
        </View>

        <View style={styles.headerRight}>
          {/* Disappearing indicator */}
          <TouchableOpacity
            style={[styles.iconBtn, disappearingDuration > 0 && styles.iconBtnActive]}
            onPress={() => setIsDisappearingModalOpen(true)}
          >
            <Text style={styles.headerIconText}>⏳</Text>
            {formatDisappearingBadge() && (
              <Text style={styles.disappearingDurationText}>{formatDisappearingBadge()}</Text>
            )}
          </TouchableOpacity>

          {/* Private Couple Vault Gallery */}
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => setIsGalleryModalOpen(true)}
          >
            <Text style={styles.headerIconText}>💎</Text>
          </TouchableOpacity>

          {/* Privacy & App Lock Settings */}
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => setIsPrivacyModalOpen(true)}
          >
            <Text style={styles.headerIconText}>⚙️</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Untrusted Key Change Banner */}
      {hasKeyChangedAlert && (
        <TouchableOpacity
          style={styles.keyChangeAlertBar}
          onPress={() => setIsSecurityModalOpen(true)}
        >
          <Text style={styles.keyChangeAlertIcon}>⚠️</Text>
          <Text style={styles.keyChangeAlertText}>
            Partner security safety number changed! Tap to verify keys.
          </Text>
        </TouchableOpacity>
      )}

      {/* Search Bar Toggle */}
      {isSearching && (
        <View style={styles.searchBar}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search decrypted chat history..."
            placeholderTextColor="#718096"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          <TouchableOpacity onPress={() => { setIsSearching(false); setSearchQuery(''); }}>
            <Text style={styles.searchCancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Message List */}
      <FlatList
        ref={flatListRef}
        data={displayedMessages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessageItem}
        contentContainerStyle={styles.listContent}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🔒</Text>
            <Text style={styles.emptyTitle}>End-to-End Encrypted</Text>
            <Text style={styles.emptySubtitle}>
              Messages, photos, videos, and voice notes in this couple chat are encrypted on your device. Only you and your partner can read them.
            </Text>
          </View>
        }
      />

      {/* Reply Banner */}
      {replyingTo && (
        <View style={styles.replyingBar}>
          <View style={{ flex: 1 }}>
            <Text style={styles.replyingTitle}>Replying to {replyingTo.content.slice(0, 30)}...</Text>
          </View>
          <TouchableOpacity onPress={() => setReplyingTo(null)} style={styles.replyCancelBtn}>
            <Text style={{ color: '#FFFFFE', fontSize: 13 }}>✕</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Quick Action Bar */}
      <View style={styles.quickBar}>
        <TouchableOpacity
          style={styles.quickChip}
          onPress={() => setIsStickerPickerOpen(true)}
        >
          <Text style={styles.quickChipText}>✨ Stickers</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.quickChip}
          onPress={handleSimulatePhotoAttachment}
        >
          <Text style={styles.quickChipText}>📸 Encrypted Photo</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.quickChip}
          onPress={() => sendMessage('Sent a warm hug 🫂', 'text')}
        >
          <Text style={styles.quickChipText}>🫂 Hug</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.quickChip}
          onPress={() => sendMessage('Sent a sweet kiss 💋', 'text')}
        >
          <Text style={styles.quickChipText}>💋 Kiss</Text>
        </TouchableOpacity>
      </View>

      {/* Chat Input Bar */}
      <View style={styles.inputContainer}>
        {/* Voice Note Recorder */}
        <VoiceNoteRecorder onSendVoiceNote={handleSendVoiceNote} />

        <TextInput
          placeholder="Send encrypted love letter..."
          placeholderTextColor="#718096"
          value={input}
          onChangeText={handleInputChange}
          onSubmitEditing={handleSendText}
          style={styles.textInput}
        />

        <TouchableOpacity
          onPress={handleSendText}
          disabled={!input.trim()}
          style={[styles.sendBtn, !input.trim() && styles.sendBtnDisabled]}
        >
          <Text style={styles.sendIcon}>➤</Text>
        </TouchableOpacity>
      </View>

      {/* Bitmoji Couple Stickers Drawer */}
      <AvatarStickerGenerator
        visible={isStickerPickerOpen}
        myConfig={profile?.avatarConfig}
        partnerConfig={partner?.avatarConfig}
        onSelectSticker={handleSendSticker}
        onClose={() => setIsStickerPickerOpen(false)}
      />

      {/* Partner Cryptographic Identity Verification Modal */}
      <PartnerSecurityModal
        visible={isSecurityModalOpen}
        onClose={() => setIsSecurityModalOpen(false)}
      />

      {/* Disappearing Messages Duration Modal */}
      <DisappearingDurationModal
        visible={isDisappearingModalOpen}
        onClose={() => setIsDisappearingModalOpen(false)}
      />

      {/* Private Couple Vault Gallery Modal */}
      <SecureCoupleGalleryModal
        visible={isGalleryModalOpen}
        onClose={() => setIsGalleryModalOpen(false)}
        conversationId={couple?.id || 'couple-space'}
      />

      {/* Privacy Settings Modal */}
      <PrivacySettingsModal
        visible={isPrivacyModalOpen}
        onClose={() => setIsPrivacyModalOpen(false)}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F0E17',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 45,
    paddingBottom: 12,
    backgroundColor: '#161522',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  partnerAvatarCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255, 107, 139, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  onlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#2ED573',
    borderWidth: 2,
    borderColor: '#161522',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  partnerName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFE',
  },
  verifiedBadge: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  verifiedBadgeActive: {
    backgroundColor: 'rgba(46, 213, 115, 0.2)',
  },
  verifiedBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#2ED573',
  },
  presenceSub: {
    fontSize: 11,
    color: '#A7A9BE',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  iconBtnActive: {
    backgroundColor: 'rgba(255, 107, 139, 0.2)',
  },
  headerIconText: {
    fontSize: 16,
  },
  disappearingDurationText: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    fontSize: 8,
    fontWeight: '700',
    color: '#FF6B8B',
    backgroundColor: '#0F0E17',
    borderRadius: 4,
    paddingHorizontal: 2,
  },
  keyChangeAlertBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF4757',
    paddingVertical: 8,
    paddingHorizontal: 14,
    gap: 8,
  },
  keyChangeAlertIcon: {
    fontSize: 14,
  },
  keyChangeAlertText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C1B2A',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
    gap: 10,
  },
  searchInput: {
    flex: 1,
    color: '#FFFFFE',
    fontSize: 13,
  },
  searchCancelText: {
    color: '#FF6B8B',
    fontSize: 12,
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 100,
    paddingHorizontal: 30,
  },
  emptyIcon: {
    fontSize: 44,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFE',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#A7A9BE',
    textAlign: 'center',
    lineHeight: 18,
  },
  msgContainer: {
    marginBottom: 16,
    maxWidth: '82%',
  },
  msgRight: {
    alignSelf: 'flex-end',
    alignItems: 'flex-end',
  },
  msgLeft: {
    alignSelf: 'flex-start',
    alignItems: 'flex-start',
  },
  bubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
  },
  bubbleMe: {
    backgroundColor: '#FF6B8B',
    borderBottomRightRadius: 4,
  },
  bubblePartner: {
    backgroundColor: '#1C1B2A',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  failedBubble: {
    backgroundColor: '#718096',
  },
  msgText: {
    fontSize: 14,
    lineHeight: 20,
  },
  textMe: {
    color: '#FFFFFF',
  },
  textPartner: {
    color: '#FFFFFE',
  },
  editedTag: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 2,
    fontStyle: 'italic',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  disappearingTag: {
    fontSize: 11,
  },
  timeText: {
    fontSize: 10,
    color: '#A7A9BE',
  },
  receiptText: {
    fontSize: 10,
    color: '#2ED573',
    fontWeight: '700',
  },
  stickerCard: {
    padding: 12,
    borderRadius: 18,
    borderWidth: 1,
    maxWidth: 260,
  },
  stickerCardMe: {
    backgroundColor: 'rgba(255, 107, 139, 0.15)',
    borderColor: '#FF6B8B',
    borderBottomRightRadius: 4,
  },
  stickerCardPartner: {
    backgroundColor: '#1C1B2A',
    borderColor: 'rgba(255,255,255,0.1)',
    borderBottomLeftRadius: 4,
  },
  stickerHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  stickerTag: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FF6B8B',
  },
  stickerText: {
    fontSize: 13,
    color: '#FFFFFE',
    fontWeight: '600',
  },
  photoCard: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#1C1B2A',
    maxWidth: 240,
  },
  photoCardMe: {
    borderBottomRightRadius: 4,
  },
  photoCardPartner: {
    borderBottomLeftRadius: 4,
  },
  chatImage: {
    width: 240,
    height: 180,
  },
  encryptedMediaBox: {
    width: 240,
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#161522',
  },
  encryptedMediaText: {
    fontSize: 12,
    color: '#FF6B8B',
    fontWeight: '700',
    marginTop: 6,
  },
  photoCaption: {
    padding: 10,
    fontSize: 12,
    color: '#FFFFFE',
  },
  voiceBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
    gap: 10,
  },
  voiceWaveContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  waveLine: {
    width: 3,
    borderRadius: 2,
    backgroundColor: '#FFFFFE',
  },
  voiceText: {
    fontSize: 13,
    fontWeight: '600',
  },
  replyPreviewCard: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 4,
  },
  replyPreviewLabel: {
    fontSize: 10,
    color: '#A7A9BE',
  },
  reactionRow: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 4,
  },
  reactionBtn: {
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  reactionBtnActive: {
    backgroundColor: 'rgba(255, 107, 139, 0.3)',
  },
  reactionEmoji: {
    fontSize: 12,
  },
  replyingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C1B2A',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  replyingTitle: {
    fontSize: 12,
    color: '#FF6B8B',
    fontWeight: '600',
  },
  replyCancelBtn: {
    padding: 4,
  },
  quickBar: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#161522',
    gap: 8,
  },
  quickChip: {
    backgroundColor: '#1C1B2A',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  quickChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#A7A9BE',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#161522',
    gap: 8,
  },
  textInput: {
    flex: 1,
    backgroundColor: '#0F0E17',
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: '#FFFFFE',
    fontSize: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FF6B8B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    opacity: 0.4,
  },
  sendIcon: {
    color: '#FFFFFF',
    fontSize: 16,
    marginLeft: 2,
  },
});
