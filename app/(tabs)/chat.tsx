import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Colors, Radii, Shadows, Spacing } from '../../constants/theme';
import { useAuthStore } from '../../stores/authStore';
import { useCoupleStore } from '../../stores/coupleStore';
import { useChatStore } from '../../stores/chatStore';
import { AvatarStickerGenerator } from '../../components/avatars/AvatarStickerGenerator';
import { ChatMessage, AvatarStickerDef } from '../../types';

const EMOJI_REACTIONS = ['❤️', '🥰', '💋', '✨', '🥺'];

export default function ChatScreen() {
  const { profile } = useAuthStore();
  const { couple, partner } = useCoupleStore();
  const {
    messages,
    partnerIsTyping,
    loadMessages,
    sendMessage,
    addReaction,
    setTyping,
    subscribeToChat,
    unsubscribeFromChat,
  } = useChatStore();

  const [input, setInput] = useState('');
  const [isStickerPickerOpen, setIsStickerPickerOpen] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (couple?.id && profile?.id) {
      loadMessages(couple.id);
      subscribeToChat(couple.id, profile.id);
    }
    return () => unsubscribeFromChat();
  }, [couple?.id, profile?.id]);

  const handleSend = async (content: string, type: ChatMessage['messageType'] = 'text') => {
    if (!couple?.id || !profile?.id) {
      Alert.alert('Not Paired', 'Connect with your partner to start chatting!');
      return;
    }
    await sendMessage(couple.id, profile.id, content, type);
    setInput('');
    setTyping(couple.id, false);
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const handleSendSticker = (sticker: AvatarStickerDef) => {
    handleSend(`${sticker.badge} ${sticker.title} — ${sticker.description}`, 'avatar_sticker');
  };

  const handleInputChange = (text: string) => {
    setInput(text);
    if (couple?.id) {
      setTyping(couple.id, text.length > 0);
    }
  };

  const renderMessageItem = ({ item }: { item: ChatMessage }) => {
    const isMe = item.senderId === profile?.id;
    const isHug = item.messageType === 'hug_card';
    const isKiss = item.messageType === 'kiss_card';
    const isSticker = item.messageType === 'avatar_sticker';

    return (
      <View
        style={[
          styles.msgContainer,
          isMe ? styles.msgRight : styles.msgLeft,
        ]}
      >
        <Text style={styles.senderLabel}>
          {isMe ? 'You' : partner?.displayName || 'Partner'}
        </Text>

        {isSticker ? (
          <View style={[styles.stickerMessageCard, isMe ? styles.stickerCardMe : styles.stickerCardPartner]}>
            <View style={styles.stickerHeaderRow}>
              <Text style={{ fontSize: 28 }}>🧑🏻‍❤️‍🧑🏽</Text>
              <Text style={styles.stickerTag}>COUPLE STICKER ✨</Text>
            </View>
            <Text style={styles.stickerMessageText}>{item.content}</Text>
          </View>
        ) : isHug || isKiss ? (
          <View style={[styles.affectionCard, isHug ? styles.hugBg : styles.kissBg]}>
            <Text style={styles.affectionIcon}>{isHug ? '🫂' : '💋'}</Text>
            <Text style={styles.affectionText}>
              {isMe
                ? `You sent a sweet ${isHug ? 'hug' : 'kiss'}!`
                : `${partner?.displayName || 'Partner'} sent you a ${isHug ? 'hug' : 'kiss'}! ❤️`}
            </Text>
          </View>
        ) : (
          <View
            style={[
              styles.bubble,
              isMe ? styles.bubbleMe : styles.bubblePartner,
              item.pending && styles.pendingBubble,
            ]}
          >
            <Text style={[styles.msgText, isMe ? styles.textMe : styles.textPartner]}>
              {item.content}
            </Text>
          </View>
        )}

        {/* Timestamp & Status */}
        <View style={styles.metaRow}>
          <Text style={styles.timeText}>
            {item.createdAt ? new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
          </Text>
          {item.pending && <Text style={styles.pendingText}> · sending...</Text>}
        </View>

        {/* Reaction Bar */}
        <View style={styles.reactionRow}>
          {EMOJI_REACTIONS.map((emoji) => (
            <Pressable
              key={emoji}
              onPress={() => profile?.id && addReaction(item.id, profile.id, emoji)}
              style={styles.reactionBtn}
            >
              <Text style={styles.reactionEmoji}>{emoji}</Text>
            </Pressable>
          ))}
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
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Love Letters 💌</Text>
          <Text style={styles.headerSub}>
            {partnerIsTyping ? 'Partner is writing something sweet...' : partner?.displayName ? `Chatting with ${partner.displayName}` : 'Private Couple Chat'}
          </Text>
        </View>
      </View>

      {/* Messages List */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessageItem}
        contentContainerStyle={styles.listContent}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>💌</Text>
            <Text style={styles.emptyTitle}>Your Private Chat</Text>
            <Text style={styles.emptySubtitle}>
              Send custom 3D avatar stickers, love letters, or affectionate hug cards!
            </Text>
          </View>
        }
      />

      {/* Quick Affection & Stickers Action Bar */}
      <View style={styles.quickActions}>
        <Pressable
          style={[styles.quickChip, styles.stickerChip]}
          onPress={() => setIsStickerPickerOpen(true)}
        >
          <Text style={styles.stickerChipText}>✨ Bitmoji Stickers</Text>
        </Pressable>
        <Pressable
          style={[styles.quickChip, styles.hugChip]}
          onPress={() => handleSend('Sent a warm hug 🫂', 'hug_card')}
        >
          <Text style={styles.quickText}>🫂 Hug</Text>
        </Pressable>
        <Pressable
          style={[styles.quickChip, styles.kissChip]}
          onPress={() => handleSend('Sent a sweet kiss 💋', 'kiss_card')}
        >
          <Text style={styles.quickText}>💋 Kiss</Text>
        </Pressable>
      </View>

      {/* Input Bar */}
      <View style={styles.inputBar}>
        <TextInput
          placeholder="Write something sweet..."
          placeholderTextColor={Colors.textMuted}
          value={input}
          onChangeText={handleInputChange}
          onSubmitEditing={() => input.trim() && handleSend(input)}
          style={styles.textInput}
        />
        <Pressable
          onPress={() => input.trim() && handleSend(input)}
          disabled={!input.trim()}
          style={[styles.sendBtn, !input.trim() && styles.sendBtnDisabled]}
        >
          <Text style={styles.sendIcon}>💌</Text>
        </Pressable>
      </View>

      {/* Bitmoji Couple Stickers Drawer */}
      <AvatarStickerGenerator
        visible={isStickerPickerOpen}
        myConfig={profile?.avatarConfig}
        partnerConfig={partner?.avatarConfig}
        onSelectSticker={handleSendSticker}
        onClose={() => setIsStickerPickerOpen(false)}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.textDark,
  },
  headerSub: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  listContent: {
    padding: Spacing.md,
    paddingBottom: Spacing.lg,
  },
  msgContainer: {
    marginVertical: Spacing.xs,
    maxWidth: '84%',
  },
  msgLeft: {
    alignSelf: 'flex-start',
  },
  msgRight: {
    alignSelf: 'flex-end',
  },
  senderLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    marginBottom: 2,
    marginLeft: 4,
  },
  bubble: {
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.md,
    borderRadius: Radii.lg,
    ...Shadows.soft,
  },
  bubbleMe: {
    backgroundColor: Colors.primary,
    borderBottomRightRadius: 4,
  },
  bubblePartner: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#F8E9F2',
  },
  pendingBubble: {
    opacity: 0.7,
  },
  msgText: {
    fontSize: 15,
    lineHeight: 20,
  },
  textMe: {
    color: '#FFFFFF',
  },
  textPartner: {
    color: Colors.textDark,
  },
  affectionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Radii.lg,
    ...Shadows.card,
  },
  hugBg: {
    backgroundColor: '#FFEBF3',
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  kissBg: {
    backgroundColor: '#F3E8FF',
    borderWidth: 1.5,
    borderColor: Colors.lavender,
  },
  affectionIcon: {
    fontSize: 32,
    marginRight: Spacing.sm,
  },
  affectionText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textDark,
    flex: 1,
  },
  stickerMessageCard: {
    padding: Spacing.md,
    borderRadius: Radii.xl,
    ...Shadows.card,
    borderWidth: 1.5,
  },
  stickerCardMe: {
    backgroundColor: '#FFF0F5',
    borderColor: Colors.primary,
  },
  stickerCardPartner: {
    backgroundColor: '#F5EFFF',
    borderColor: Colors.lavender,
  },
  stickerHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  stickerTag: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.deepPurple,
    letterSpacing: 1,
  },
  stickerMessageText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textDark,
    lineHeight: 18,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    marginLeft: 4,
  },
  timeText: {
    fontSize: 10,
    color: Colors.textMuted,
  },
  pendingText: {
    fontSize: 10,
    color: Colors.primary,
  },
  reactionRow: {
    flexDirection: 'row',
    marginTop: 4,
    gap: 4,
  },
  reactionBtn: {
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  reactionEmoji: {
    fontSize: 12,
  },
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.xs,
    gap: 8,
  },
  quickChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: Radii.full,
  },
  stickerChip: {
    backgroundColor: '#F3E8FF',
    borderWidth: 1,
    borderColor: Colors.lavender,
  },
  stickerChipText: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.deepPurple,
  },
  hugChip: {
    backgroundColor: Colors.primarySoft,
  },
  kissChip: {
    backgroundColor: '#F2EBFF',
  },
  quickText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.deepPurple,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.sm,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  textInput: {
    flex: 1,
    height: 44,
    backgroundColor: Colors.background,
    borderRadius: Radii.full,
    paddingHorizontal: Spacing.md,
    fontSize: 14,
    color: Colors.textDark,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: Spacing.sm,
  },
  sendBtnDisabled: {
    opacity: 0.5,
  },
  sendIcon: {
    fontSize: 20,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 80,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: Spacing.sm,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textDark,
  },
  emptySubtitle: {
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: 'center',
    maxWidth: 240,
    marginTop: 4,
  },
});
