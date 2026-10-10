import { create } from 'zustand';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Vector3D, CoupleInteraction, FacialExpression, AvatarInteraction } from '../types';
import { DEFAULT_TIMELINES } from '../components/avatars/AnimationStateMachine';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface WorldState {
  myPosition: Vector3D;
  partnerPosition: Vector3D;
  currentInteraction: CoupleInteraction;
  myExpression: FacialExpression;
  partnerExpression: FacialExpression;
  isHeartsActive: boolean;
  channel: RealtimeChannel | null;
  recentInteractions: AvatarInteraction[];
  setMyPosition: (pos: Vector3D) => void;
  setMyExpression: (expr: FacialExpression) => void;
  triggerInteraction: (
    coupleId: string,
    senderId: string,
    type: CoupleInteraction,
    expr?: FacialExpression
  ) => Promise<void>;
  broadcastPosition: (pos: Vector3D, anim: CoupleInteraction, expr: FacialExpression) => void;
  subscribeToWorld: (coupleId: string, myUserId: string) => void;
  unsubscribeFromWorld: () => void;
}

export const useWorldStore = create<WorldState>((set, get) => ({
  myPosition: { x: -0.75, y: 0, z: 0.2 },
  partnerPosition: { x: 0.75, y: 0, z: 0.2 },
  currentInteraction: 'idle',
  myExpression: 'happy',
  partnerExpression: 'loving',
  isHeartsActive: false,
  channel: null,
  recentInteractions: [],

  setMyPosition: (pos) => set({ myPosition: pos }),
  setMyExpression: (expr) => {
    set({ myExpression: expr });
    const channel = get().channel;
    if (channel) {
      channel.send({
        type: 'broadcast',
        event: 'expression_update',
        payload: { expression: expr },
      });
    }
  },

  broadcastPosition: (pos, anim, expr) => {
    const channel = get().channel;
    if (channel) {
      channel.send({
        type: 'broadcast',
        event: 'avatar_transform',
        payload: { position: pos, animation: anim, expression: expr },
      });
    }
  },

  triggerInteraction: async (coupleId, senderId, type, expr = 'loving') => {
    const isRomantic = type !== 'idle';

    // Optimistic local animation
    set({
      currentInteraction: type,
      myExpression: expr,
      partnerExpression: expr,
      isHeartsActive: isRomantic,
    });

    // Dynamic duration from deterministic animation timeline
    const durationMs = (DEFAULT_TIMELINES[type]?.totalDuration || 5.8) * 1000;

    setTimeout(() => {
      if (get().currentInteraction === type) {
        set({
          currentInteraction: 'idle',
          myExpression: 'happy',
          partnerExpression: 'happy',
          isHeartsActive: false,
        });
      }
    }, durationMs);

    const channel = get().channel;
    if (channel) {
      channel.send({
        type: 'broadcast',
        event: 'interaction_event',
        payload: { type, expression: expr, senderId, timestamp: Date.now() },
      });
    }

    if (
      isSupabaseConfigured &&
      coupleId &&
      coupleId !== 'solo-space' &&
      coupleId !== 'demo-space' &&
      senderId &&
      senderId !== 'local-user'
    ) {
      try {
        await supabase.from('avatar_interactions').insert({
          couple_id: coupleId,
          sender_id: senderId,
          interaction_type: type,
        });

        // Also log to legacy events table for backward-compatibility
        await supabase.from('events').insert({
          space_id: coupleId,
          sender: senderId,
          kind: type,
          payload: { type, expression: expr },
        });
      } catch {
        // Fallback gracefully
      }
    }
  },

  subscribeToWorld: (coupleId, myUserId) => {
    if (!isSupabaseConfigured || !coupleId) return;
    get().unsubscribeFromWorld();

    const channel = supabase.channel(`couple:${coupleId}:world`);

    // Broadcast transform listener
    channel.on('broadcast', { event: 'avatar_transform' }, (msg) => {
      if (msg.payload?.position) {
        set({
          partnerPosition: msg.payload.position,
          currentInteraction: msg.payload.animation || 'idle',
          partnerExpression: msg.payload.expression || 'loving',
        });
      }
    });

    // Broadcast expression update listener
    channel.on('broadcast', { event: 'expression_update' }, (msg) => {
      if (msg.payload?.expression) {
        set({ partnerExpression: msg.payload.expression });
      }
    });

    // Broadcast interaction trigger
    channel.on('broadcast', { event: 'interaction_event' }, (msg) => {
      const payload = msg.payload;
      if (payload && payload.senderId !== myUserId) {
        const type = payload.type as CoupleInteraction;
        const expr = (payload.expression || 'loving') as FacialExpression;
        const isRomantic = ['hug', 'kiss', 'cuddle', 'flying_hearts', 'blow_kiss', 'forehead_kiss'].includes(type);

        set({
          currentInteraction: type,
          myExpression: expr,
          partnerExpression: expr,
          isHeartsActive: isRomantic,
        });

        const durationMs = (DEFAULT_TIMELINES[type]?.totalDuration || 5.8) * 1000;

        setTimeout(() => {
          if (get().currentInteraction === type) {
            set({
              currentInteraction: 'idle',
              myExpression: 'happy',
              partnerExpression: 'happy',
              isHeartsActive: false,
            });
          }
        }, durationMs);
      }
    });

    channel.subscribe();
    set({ channel });
  },

  unsubscribeFromWorld: () => {
    const channel = get().channel;
    if (channel) {
      supabase.removeChannel(channel);
      set({ channel: null });
    }
  },
}));
