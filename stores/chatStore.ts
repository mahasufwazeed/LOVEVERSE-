import { create } from 'zustand';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { ChatMessage, MessageReaction } from '../types';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface ChatState {
  messages: ChatMessage[];
  isLoading: boolean;
  partnerIsTyping: boolean;
  channel: RealtimeChannel | null;
  loadMessages: (coupleId: string) => Promise<void>;
  sendMessage: (coupleId: string, senderId: string, content: string, type?: ChatMessage['messageType']) => Promise<{ error?: string }>;
  addReaction: (messageId: string, userId: string, emoji: string) => Promise<void>;
  setTyping: (coupleId: string, isTyping: boolean) => void;
  subscribeToChat: (coupleId: string, currentUserId: string) => void;
  unsubscribeFromChat: () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  isLoading: false,
  partnerIsTyping: false,
  channel: null,

  loadMessages: async (coupleId: string) => {
    if (!isSupabaseConfigured || !coupleId) return;
    try {
      set({ isLoading: true });

      // First check messages table
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('couple_id', coupleId)
        .order('created_at', { ascending: true })
        .limit(100);

      if (data && !error && data.length > 0) {
        set({
          messages: data.map((m) => ({
            id: m.id,
            coupleId: m.couple_id,
            senderId: m.sender_id,
            content: m.content,
            messageType: m.message_type || 'text',
            mediaUrl: m.media_url,
            createdAt: m.created_at,
          })),
          isLoading: false,
        });
        return;
      }

      // Fallback to legacy events table (kind = 'chat')
      const { data: eventData } = await supabase
        .from('events')
        .select('*')
        .eq('space_id', coupleId)
        .eq('kind', 'chat')
        .order('id', { ascending: true })
        .limit(100);

      if (eventData) {
        set({
          messages: eventData.map((e) => ({
            id: String(e.id),
            coupleId: e.space_id,
            senderId: e.sender,
            content: e.payload?.text || '',
            messageType: 'text',
            createdAt: e.created_at,
          })),
          isLoading: false,
        });
      } else {
        set({ messages: [], isLoading: false });
      }
    } catch {
      set({ isLoading: false });
    }
  },

  sendMessage: async (coupleId, senderId, content, type = 'text') => {
    if (!content.trim()) return {};

    const tempId = 'temp-' + Date.now();
    const optimisticMsg: ChatMessage = {
      id: tempId,
      coupleId,
      senderId,
      content: content.trim(),
      messageType: type,
      createdAt: new Date().toISOString(),
      pending: true,
    };

    // Optimistic insert
    set((state) => ({ messages: [...state.messages, optimisticMsg] }));

    try {
      // Send to messages table
      const { data, error } = await supabase.from('messages').insert({
        couple_id: coupleId,
        sender_id: senderId,
        content: content.trim(),
        message_type: type,
      }).select().single();

      if (!error && data) {
        // Replace temp message with server message
        set((state) => ({
          messages: state.messages.map((m) =>
            m.id === tempId ? { ...m, id: data.id, pending: false } : m
          ),
        }));
      } else {
        // Fallback to events table
        await supabase.from('events').insert({
          space_id: coupleId,
          sender: senderId,
          kind: 'chat',
          payload: { text: content.trim() },
        });
        set((state) => ({
          messages: state.messages.map((m) =>
            m.id === tempId ? { ...m, pending: false } : m
          ),
        }));
      }
      return {};
    } catch (e: any) {
      return { error: e.message };
    }
  },

  addReaction: async (messageId, userId, emoji) => {
    set((state) => ({
      messages: state.messages.map((m) => {
        if (m.id !== messageId) return m;
        const reactions = m.reactions || [];
        const exists = reactions.some((r) => r.userId === userId && r.emoji === emoji);
        return {
          ...m,
          reactions: exists
            ? reactions.filter((r) => !(r.userId === userId && r.emoji === emoji))
            : [...reactions, { id: 'temp-' + Date.now(), messageId, userId, emoji, createdAt: new Date().toISOString() }],
        };
      }),
    }));

    if (isSupabaseConfigured) {
      await supabase.from('message_reactions').upsert({
        message_id: messageId,
        user_id: userId,
        emoji,
      });
    }
  },

  setTyping: (coupleId, isTyping) => {
    const channel = get().channel;
    if (channel) {
      channel.send({
        type: 'broadcast',
        event: 'typing',
        payload: { isTyping },
      });
    }
  },

  subscribeToChat: (coupleId, currentUserId) => {
    if (!isSupabaseConfigured || !coupleId) return;
    get().unsubscribeFromChat();

    const channel = supabase.channel(`couple:${coupleId}:chat`);

    // Listen for new messages in PostgreSQL
    channel.on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages', filter: `couple_id=eq.${coupleId}` },
      (payload) => {
        const newMsg = payload.new as any;
        if (newMsg && newMsg.sender_id !== currentUserId) {
          set((state) => {
            if (state.messages.some((m) => m.id === newMsg.id)) return state;
            return {
              messages: [
                ...state.messages,
                {
                  id: newMsg.id,
                  coupleId: newMsg.couple_id,
                  senderId: newMsg.sender_id,
                  content: newMsg.content,
                  messageType: newMsg.message_type || 'text',
                  mediaUrl: newMsg.media_url,
                  createdAt: newMsg.created_at,
                },
              ],
            };
          });
        }
      }
    );

    // Listen for broadcast typing status
    channel.on('broadcast', { event: 'typing' }, (payload) => {
      set({ partnerIsTyping: Boolean(payload.payload?.isTyping) });
    });

    channel.subscribe();
    set({ channel });
  },

  unsubscribeFromChat: () => {
    const channel = get().channel;
    if (channel) {
      supabase.removeChannel(channel);
      set({ channel: null });
    }
  },
}));
