import { create } from 'zustand';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { UserProfile, AvatarConfig } from '../types';
import type { Session, User } from '@supabase/supabase-js';

interface AuthState {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  isLoading: boolean;
  error: string | null;
  initialize: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (email: string, password: string, displayName?: string) => Promise<{ error?: string }>;
  loginAsDemo: () => void;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  updateAvatarConfig: (config: AvatarConfig) => Promise<void>;
}

const defaultAvatarConfig: AvatarConfig = {
  skinColor: '#FDDFB2',
  hairStyle: 'wavy',
  hairColor: '#4A2B11',
  eyeColor: '#3E2723',
  shirtColor: '#FF5C8A',
  pantsColor: '#292238',
  accessory: 'none',
};

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  user: null,
  profile: null,
  isLoading: true,
  error: null,

  initialize: async () => {
    try {
      set({ isLoading: true, error: null });
      if (!isSupabaseConfigured) {
        set({ isLoading: false });
        return;
      }

      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        set({ error: error.message, isLoading: false });
        return;
      }

      if (session?.user) {
        set({ session, user: session.user });
        // Fetch or create profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .maybeSingle();

        if (profile) {
          set({
            profile: {
              id: profile.id,
              displayName: profile.display_name,
              avatarConfig: profile.avatar_config || defaultAvatarConfig,
              avatarUrl: profile.avatar_url,
              anniversaryDate: profile.anniversary_date,
              coupleId: profile.couple_id,
            },
          });
        } else {
          // Default profile
          const newProfile: UserProfile = {
            id: session.user.id,
            displayName: session.user.email?.split('@')[0] || 'Sweetheart',
            avatarConfig: defaultAvatarConfig,
          };
          set({ profile: newProfile });
        }
      } else {
        set({ session: null, user: null, profile: null });
      }

      // Listen for auth state changes
      supabase.auth.onAuthStateChange(async (_event, newSession) => {
        set({ session: newSession, user: newSession?.user || null });
        if (newSession?.user) {
          const { data } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', newSession.user.id)
            .maybeSingle();
          if (data) {
            set({
              profile: {
                id: data.id,
                displayName: data.display_name,
                avatarConfig: data.avatar_config || defaultAvatarConfig,
                anniversaryDate: data.anniversary_date,
                coupleId: data.couple_id,
              },
            });
          }
        } else {
          set({ profile: null });
        }
      });
    } catch (e: any) {
      set({ error: e.message || 'Initialization failed' });
    } finally {
      set({ isLoading: false });
    }
  },

  signIn: async (email, password) => {
    set({ isLoading: true, error: null });
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      set({ isLoading: false, error: error.message });
      return { error: error.message };
    }
    set({ session: data.session, user: data.user, isLoading: false });
    return {};
  },

  signUp: async (email, password, displayName) => {
    set({ isLoading: true, error: null });
    const name = displayName?.trim() || email.split('@')[0] || 'Sweetheart';
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: name },
      },
    });

    if (error) {
      set({ isLoading: false, error: error.message });
      return { error: error.message };
    }

    if (data.user) {
      // Upsert profile
      await supabase.from('profiles').upsert({
        id: data.user.id,
        display_name: name,
        avatar_config: defaultAvatarConfig,
      });
      set({
        session: data.session,
        user: data.user,
        profile: {
          id: data.user.id,
          displayName: name,
          avatarConfig: defaultAvatarConfig,
        },
      });
    }

    set({ isLoading: false });
    return {};
  },

  loginAsDemo: () => {
    const demoUser = {
      id: 'demo-user-123',
      email: 'sweetheart@loveverse.app',
      user_metadata: { display_name: 'Sweetheart' },
      app_metadata: {},
      aud: 'authenticated',
      created_at: new Date().toISOString(),
    } as any;

    const demoProfile: UserProfile = {
      id: 'demo-user-123',
      displayName: 'Sweetheart',
      avatarConfig: {
        skinColor: '#FDDFB2',
        hairStyle: 'wavy',
        hairColor: '#4A2B11',
        eyeColor: '#3E2723',
        shirtColor: '#FF5C8A',
        pantsColor: '#292238',
        accessory: 'glasses',
        expression: 'happy',
      },
      coupleId: 'demo-couple-456',
    };

    set({
      session: { user: demoUser } as any,
      user: demoUser,
      profile: demoProfile,
      isLoading: false,
      error: null,
    });
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ session: null, user: null, profile: null });
  },

  updateProfile: async (updates) => {
    const current = get().profile;
    if (!current) return;
    const updated = { ...current, ...updates };
    set({ profile: updated });

    if (isSupabaseConfigured) {
      await supabase.from('profiles').upsert({
        id: current.id,
        display_name: updated.displayName,
        anniversary_date: updated.anniversaryDate,
        avatar_config: updated.avatarConfig,
      });
    }
  },

  updateAvatarConfig: async (config) => {
    const current = get().profile;
    if (!current) return;
    const updated = { ...current, avatarConfig: config };
    set({ profile: updated });

    if (isSupabaseConfigured) {
      await supabase.from('profiles').update({
        avatar_config: config,
      }).eq('id', current.id);
    }
  },
}));
