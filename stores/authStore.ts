import { create } from 'zustand';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { UserProfile, AvatarConfig, ProfileLabel } from '../types';
import type { Session, User } from '@supabase/supabase-js';
import { generateLoveverseId, mockPartnerStore } from '../services/PartnerConnectionService';

interface AuthState {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  isLoading: boolean;
  error: string | null;
  initialize: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (
    email: string,
    password: string,
    displayName?: string,
    profileLabel?: ProfileLabel
  ) => Promise<{
    error?: string;
    requiresEmailConfirmation?: boolean;
  }>;
  loginAsDemo: () => void;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  updateAvatarConfig: (config: AvatarConfig) => Promise<void>;
  setProfileLabel: (label: ProfileLabel) => Promise<void>;
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
          const userLoveverseId = profile.public_loveverse_id || generateLoveverseId();
          set({
            profile: {
              id: profile.id,
              displayName: profile.display_name,
              avatarConfig: profile.avatar_config || defaultAvatarConfig,
              avatarUrl: profile.avatar_url,
              anniversaryDate: profile.anniversary_date,
              coupleId: profile.couple_id,
              publicLoveverseId: userLoveverseId,
              profileLabel: (profile.profile_label as ProfileLabel) || 'partner',
            },
          });
        } else {
          // Default profile
          const userLoveverseId = generateLoveverseId();
          const newProfile: UserProfile = {
            id: session.user.id,
            displayName: session.user.email?.split('@')[0] || 'Sweetheart',
            avatarConfig: defaultAvatarConfig,
            publicLoveverseId: userLoveverseId,
            profileLabel: 'partner',
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
                publicLoveverseId: data.public_loveverse_id || generateLoveverseId(),
                profileLabel: (data.profile_label as ProfileLabel) || 'partner',
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

  signUp: async (email, password, displayName, profileLabel = 'partner') => {
    set({ isLoading: true, error: null });
    if (!isSupabaseConfigured) {
      const message =
        'Account creation is not configured. Replace the Supabase placeholder URL and publishable key in .env, then restart the Expo server.';
      set({ isLoading: false, error: message });
      return { error: message };
    }

    const name = displayName?.trim() || email.split('@')[0] || 'Sweetheart';
    const newLoveverseId = generateLoveverseId();

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: name,
          profile_label: profileLabel,
          public_loveverse_id: newLoveverseId,
        },
      },
    });

    if (error) {
      set({ isLoading: false, error: error.message });
      return { error: error.message };
    }

    if (data.user) {
      if (data.session) {
        const { error: profileError } = await supabase.from('profiles').upsert({
          id: data.user.id,
          display_name: name,
          avatar_config: defaultAvatarConfig,
          public_loveverse_id: newLoveverseId,
          profile_label: profileLabel,
        });
        if (profileError) {
          const message = `Account created, but profile setup failed: ${profileError.message}`;
          set({ isLoading: false, error: message });
          return { error: message };
        }
      }
      set({
        session: data.session,
        user: data.user,
        profile: {
          id: data.user.id,
          displayName: name,
          avatarConfig: defaultAvatarConfig,
          publicLoveverseId: newLoveverseId,
          profileLabel,
        },
      });
    }

    set({ isLoading: false });
    return { requiresEmailConfirmation: Boolean(data.user && !data.session) };
  },

  loginAsDemo: () => {
    const demoUser = {
      id: 'demo-user-123',
      email: 'sweetheart@loveverse.app',
      user_metadata: { display_name: 'Alex', profile_label: 'him' },
      app_metadata: {},
      aud: 'authenticated',
      created_at: new Date().toISOString(),
    } as any;

    const demoProfile: UserProfile = {
      id: 'demo-user-123',
      displayName: 'Alex',
      avatarConfig: {
        skinColor: '#FDDFB2',
        hairStyle: 'short',
        hairColor: '#4A2B11',
        eyeColor: '#3E2723',
        shirtColor: '#4A90E2',
        pantsColor: '#2C3E50',
        accessory: 'glasses',
        expression: 'happy',
      },
      coupleId: 'demo-couple-456',
      publicLoveverseId: 'LV-A7K92MP4TX',
      profileLabel: 'him',
    };

    mockPartnerStore.registerUser({
      id: 'demo-user-123',
      publicLoveverseId: 'LV-A7K92MP4TX',
      displayName: 'Alex',
      profileLabel: 'him',
      avatarConfig: demoProfile.avatarConfig,
      coupleId: 'demo-couple-456',
    });

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
        public_loveverse_id: updated.publicLoveverseId,
        profile_label: updated.profileLabel,
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

  setProfileLabel: async (label: ProfileLabel) => {
    const current = get().profile;
    if (!current) return;
    const updated = { ...current, profileLabel: label };
    set({ profile: updated });

    if (isSupabaseConfigured) {
      await supabase
        .from('profiles')
        .update({ profile_label: label })
        .eq('id', current.id);
    }

    const mock = mockPartnerStore.users.get(current.id);
    if (mock) {
      mock.profileLabel = label;
    }
  },
}));
