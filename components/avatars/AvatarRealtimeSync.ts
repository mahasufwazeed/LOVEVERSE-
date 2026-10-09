import { AvatarPresenceState, CoupleInteraction, FacialExpression, Vector3D } from '../../types';
import type { RealtimeChannel } from '@supabase/supabase-js';

export class AvatarRealtimeSync {
  private channel: RealtimeChannel;
  private userId: string;
  private lastBroadcastTime: number = 0;
  private readonly THROTTLE_MS = 33; // ~30Hz update rate

  constructor(channel: RealtimeChannel, userId: string) {
    this.channel = channel;
    this.userId = userId;
  }

  public broadcastTransform(position: Vector3D, rotation: number, animation: CoupleInteraction, expression: FacialExpression) {
    const now = Date.now();
    if (now - this.lastBroadcastTime < this.THROTTLE_MS) return;
    this.lastBroadcastTime = now;

    const state: AvatarPresenceState = {
      userId: this.userId,
      position,
      rotation,
      animation,
      expression,
      updatedAt: now,
    };

    this.channel.send({
      type: 'broadcast',
      event: 'avatar_presence',
      payload: state,
    });
  }

  public onRemotePresence(callback: (presence: AvatarPresenceState) => void) {
    this.channel.on('broadcast', { event: 'avatar_presence' }, (msg) => {
      const payload = msg.payload as AvatarPresenceState;
      if (payload && payload.userId !== this.userId) {
        callback(payload);
      }
    });
  }
}
