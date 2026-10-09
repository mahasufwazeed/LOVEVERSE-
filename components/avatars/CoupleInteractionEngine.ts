import { CoupleInteraction, FacialExpression } from '../../types';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface InteractionRequest {
  id: string;
  senderId: string;
  senderName: string;
  type: CoupleInteraction;
  timestamp: number;
}

export type InteractionState = 'idle' | 'requesting' | 'accepted' | 'playing' | 'completed';

export class CoupleInteractionEngine {
  private channel: RealtimeChannel | null = null;
  private currentUserId: string = '';
  private coupleId: string = '';
  private onInteractionTrigger: (interaction: CoupleInteraction, expression: FacialExpression) => void;
  private onRequestReceived: (req: InteractionRequest) => void;
  private activeState: InteractionState = 'idle';

  constructor(
    onTrigger: (interaction: CoupleInteraction, expression: FacialExpression) => void,
    onRequest: (req: InteractionRequest) => void
  ) {
    this.onInteractionTrigger = onTrigger;
    this.onRequestReceived = onRequest;
  }

  public init(channel: RealtimeChannel, userId: string, coupleId: string) {
    this.channel = channel;
    this.currentUserId = userId;
    this.coupleId = coupleId;

    // Listen for broadcast interaction requests
    this.channel.on('broadcast', { event: 'interaction_req' }, (msg) => {
      const payload = msg.payload as InteractionRequest;
      if (payload && payload.senderId !== this.currentUserId) {
        this.onRequestReceived(payload);
      }
    });

    // Listen for interaction acceptance
    this.channel.on('broadcast', { event: 'interaction_start' }, (msg) => {
      const { type, expression } = msg.payload || {};
      if (type) {
        this.executeInteraction(type, expression || 'loving');
      }
    });
  }

  public requestInteraction(type: CoupleInteraction, senderName: string) {
    const req: InteractionRequest = {
      id: 'req-' + Date.now(),
      senderId: this.currentUserId,
      senderName,
      type,
      timestamp: Date.now(),
    };

    if (this.channel) {
      this.channel.send({
        type: 'broadcast',
        event: 'interaction_req',
        payload: req,
      });
    }

    // Play optimistic trigger immediately on sender side
    this.executeInteraction(type, 'loving');
  }

  public acceptInteraction(req: InteractionRequest) {
    if (this.channel) {
      this.channel.send({
        type: 'broadcast',
        event: 'interaction_start',
        payload: { type: req.type, expression: 'loving' },
      });
    }

    this.executeInteraction(req.type, 'loving');
  }

  public executeInteraction(type: CoupleInteraction, expr: FacialExpression = 'loving') {
    this.activeState = 'playing';
    this.onInteractionTrigger(type, expr);

    // After 3.5 seconds, return smoothly to idle
    setTimeout(() => {
      this.activeState = 'idle';
      this.onInteractionTrigger('idle', 'happy');
    }, 3500);
  }

  public getState(): InteractionState {
    return this.activeState;
  }
}
