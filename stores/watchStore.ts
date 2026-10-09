import { create } from 'zustand';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

export const DRIFT_TOLERANCE_SECONDS = 0.75; // Small drift ignored to avoid audio jitter

interface WatchSyncState {
  videoUrl: string;
  isPlaying: boolean;
  currentTime: number;
  lastSyncTimestamp: number;
  isRemoteCommand: boolean;
  channel: RealtimeChannel | null;
  setVideoUrl: (url: string) => void;
  broadcastPlayback: (isPlaying: boolean, currentTime: number, url?: string, senderId?: string) => void;
  subscribeToWatch: (
    coupleId: string,
    myUserId: string,
    onRemoteSync: (isPlaying: boolean, targetTime: number, url: string) => void
  ) => void;
  unsubscribeFromWatch: () => void;
}

export const useWatchStore = create<WatchSyncState>((set, get) => ({
  videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
  isPlaying: false,
  currentTime: 0,
  lastSyncTimestamp: 0,
  isRemoteCommand: false,
  channel: null,

  setVideoUrl: (url) => set({ videoUrl: url }),

  broadcastPlayback: (isPlaying, currentTime, url, senderId) => {
    const { channel, videoUrl, isRemoteCommand } = get();
    if (isRemoteCommand) return; // Prevent echoing remote syncs

    const activeUrl = url || videoUrl;
    set({ isPlaying, currentTime, videoUrl: activeUrl });

    if (channel) {
      channel.send({
        type: 'broadcast',
        event: 'playback_sync',
        payload: {
          isPlaying,
          currentTime,
          videoUrl: activeUrl,
          sentAt: Date.now(),
          senderId,
        },
      });
    }
  },

  subscribeToWatch: (coupleId, myUserId, onRemoteSync) => {
    if (!isSupabaseConfigured || !coupleId) return;
    get().unsubscribeFromWatch();

    const channel = supabase.channel(`couple:${coupleId}:watch`);

    channel.on('broadcast', { event: 'playback_sync' }, (msg) => {
      const payload = msg.payload;
      if (!payload || payload.senderId === myUserId) return;

      const { isPlaying, currentTime, videoUrl, sentAt } = payload;
      const latencySeconds = Math.max(0, (Date.now() - (sentAt || Date.now())) / 1000);
      const expectedTime = isPlaying ? currentTime + latencySeconds : currentTime;

      set({ isRemoteCommand: true, videoUrl, isPlaying, currentTime: expectedTime });
      onRemoteSync(isPlaying, expectedTime, videoUrl);

      setTimeout(() => {
        set({ isRemoteCommand: false });
      }, 500);
    });

    channel.subscribe();
    set({ channel });
  },

  unsubscribeFromWatch: () => {
    const channel = get().channel;
    if (channel) {
      supabase.removeChannel(channel);
      set({ channel: null });
    }
  },
}));
