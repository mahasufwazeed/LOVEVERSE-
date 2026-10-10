import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { CoupleInteraction, FacialExpression } from '../types';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface SynchronizedInteractionPayload {
  interactionId: string;
  type: CoupleInteraction;
  expression: FacialExpression;
  initiatorId: string;
  partnerId?: string;
  startTimestamp: number;
  durationMs: number;
  phase: string;
}

export class PartnerSynchronizationService {
  private channel: RealtimeChannel | null = null;
  private coupleId: string | null = null;
  private userId: string | null = null;
  private onInteractionCallback?: (payload: SynchronizedInteractionPayload) => void;
  private onCancelCallback?: () => void;

  public initialize(
    coupleId: string,
    userId: string,
    onInteraction: (payload: SynchronizedInteractionPayload) => void,
    onCancel: () => void
  ) {
    this.coupleId = coupleId;
    this.userId = userId;
    this.onInteractionCallback = onInteraction;
    this.onCancelCallback = onCancel;

    if (!isSupabaseConfigured || !coupleId || coupleId === 'solo-space') return;

    this.disconnect();

    const channel = supabase.channel(`couple:${coupleId}:sync_interactions`);

    channel.on('broadcast', { event: 'synchronized_interaction' }, (msg) => {
      const payload = msg.payload as SynchronizedInteractionPayload;
      if (payload && payload.initiatorId !== this.userId) {
        // Calculate latency compensation
        const now = Date.now();
        const latency = Math.max(0, now - payload.startTimestamp);

        // Discard expired requests (> 10s old)
        if (latency < 10000) {
          this.onInteractionCallback?.(payload);
        }
      }
    });

    channel.on('broadcast', { event: 'cancel_interaction' }, () => {
      this.onCancelCallback?.();
    });

    channel.subscribe();
    this.channel = channel;
  }

  public broadcastInteraction(
    type: CoupleInteraction,
    expression: FacialExpression,
    durationMs: number = 5800
  ): SynchronizedInteractionPayload {
    const payload: SynchronizedInteractionPayload = {
      interactionId: `int_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      type,
      expression,
      initiatorId: this.userId || 'local-user',
      startTimestamp: Date.now(),
      durationMs,
      phase: 'TURNING',
    };

    if (this.channel) {
      this.channel.send({
        type: 'broadcast',
        event: 'synchronized_interaction',
        payload,
      });
    }

    return payload;
  }

  public broadcastCancel() {
    if (this.channel) {
      this.channel.send({
        type: 'broadcast',
        event: 'cancel_interaction',
        payload: { userId: this.userId, timestamp: Date.now() },
      });
    }
  }

  public disconnect() {
    if (this.channel) {
      supabase.removeChannel(this.channel);
      this.channel = null;
    }
  }
}

export const partnerSyncService = new PartnerSynchronizationService();
