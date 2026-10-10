import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
    fallbackLocal?: boolean;
  }>;
  loginAsDemo: () => void;
  loginAsUser: (role: 'him' | 'her') => void;
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
    const cleanEmail = email.trim().toLowerCase();

    // 1. Attempt Supabase signIn if configured
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });

        if (!error && data?.session && data?.user) {
          // Fetch remote profile
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .maybeSingle();

          const loadedProfile: UserProfile = {
            id: data.user.id,
            email: data.user.email,
            displayName: profile?.display_name || cleanEmail.split('@')[0] || 'Sweetheart',
            avatarConfig: profile?.avatar_config || defaultAvatarConfig,
            avatarUrl: profile?.avatar_url,
            anniversaryDate: profile?.anniversary_date,
            coupleId: profile?.couple_id,
            publicLoveverseId: profile?.public_loveverse_id || generateLoveverseId(),
            profileLabel: (profile?.profile_label as ProfileLabel) || 'partner',
          };

          set({ session: data.session, user: data.user, profile: loadedProfile, isLoading: false });
          return {};
        }
      } catch (err: any) {
        console.warn('Supabase remote sign in attempt:', err?.message);
      }
    }

    // 2. Check local accounts in AsyncStorage (for users created when email rate limited)
    try {
      const stored = await AsyncStorage.getItem('@loveverse_local_users');
      if (stored) {
        const accounts = JSON.parse(stored);
        const savedAccount = accounts[cleanEmail];
        if (savedAccount && savedAccount.password === password) {
          mockPartnerStore.registerUser(savedAccount.profile);
          set({
            session: { user: savedAccount.user } as any,
            user: savedAccount.user,
            profile: savedAccount.profile,
            isLoading: false,
            error: null,
          });
          return {};
        }
      }
    } catch {}

    // 3. Fast demo shortcuts: alex@loveverse.app or emma@loveverse.app
    if (cleanEmail === 'alex@loveverse.app') {
      get().loginAsUser('him');
      return {};
    }
    if (cleanEmail === 'emma@loveverse.app') {
      get().loginAsUser('her');
      return {};
    }

    const message = 'Invalid login credentials. Please check your email or use Quick Demo Sign In.';
    set({ isLoading: false, error: message });
    return { error: message };
  },

  signUp: async (email, password, displayName, profileLabel = 'partner') => {
    set({ isLoading: true, error: null });
    if (!isSupabaseConfigured) {
      const message =
        'Account creation is not configured. Replace the Supabase placeholder URL and publishable key in .env, then restart the Expo server.';
      set({ isLoading: false, error: message });
      return { error: message };
    }

    const cleanEmail = email.trim().toLowerCase();
    const name = displayName?.trim() || cleanEmail.split('@')[0] || 'Sweetheart';
    const newLoveverseId = generateLoveverseId();

    try {
      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
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
        // If Supabase free tier email rate limit is exceeded (HTTP 429 / over_email_send_rate_limit)
        const isRateLimited =
          error.message?.includes('rate limit') ||
          error.message?.includes('over_email_send_rate_limit') ||
          (error as any).status === 429;

        if (isRateLimited) {
          // Gracefully create local account so the user is NEVER blocked by SMTP limits
          const localUserId = `user-${Date.now()}`;
          const localUser = {
            id: localUserId,
            email: cleanEmail,
            user_metadata: { display_name: name, profile_label: profileLabel },
            aud: 'authenticated',
            created_at: new Date().toISOString(),
          } as any;

          const localProfile: UserProfile = {
            id: localUserId,
            email: cleanEmail,
            displayName: name,
            avatarConfig: defaultAvatarConfig,
            publicLoveverseId: newLoveverseId,
            profileLabel,
          };

          mockPartnerStore.registerUser({
            id: localUserId,
            publicLoveverseId: newLoveverseId,
            displayName: name,
            profileLabel,
            avatarConfig: defaultAvatarConfig,
          });

          // Persist account locally
          try {
            const stored = await AsyncStorage.getItem('@loveverse_local_users');
            const accounts = stored ? JSON.parse(stored) : {};
            accounts[cleanEmail] = {
              password,
              user: localUser,
              profile: localProfile,
            };
            await AsyncStorage.setItem('@loveverse_local_users', JSON.stringify(accounts));
          } catch {}

          set({
            session: { user: localUser } as any,
            user: localUser,
            profile: localProfile,
            isLoading: false,
            error: null,
          });

          return { fallbackLocal: true };
        }

        set({ isLoading: false, error: error.message });
        return { error: error.message };
      }

      if (data?.user) {
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
      return { requiresEmailConfirmation: Boolean(data?.user && !data?.session) };
    } catch (e: any) {
      set({ isLoading: false, error: e.message });
      return { error: e.message };
    }
  },

  loginAsUser: (role: 'him' | 'her') => {
    if (role === 'him') {
      const alexUser = {
        id: 'user-alex-101',
        email: 'alex@loveverse.app',
        user_metadata: { display_name: 'Alex', profile_label: 'him' },
        aud: 'authenticated',
        created_at: new Date().toISOString(),
      } as any;

      const alexProfile: UserProfile = {
        id: 'user-alex-101',
        email: 'alex@loveverse.app',
        displayName: 'Alex',
        profileLabel: 'him',
        publicLoveverseId: 'LV-A7K92MP4TX',
        avatarConfig: {
          skinColor: '#FDDFB2',
          hairStyle: 'short',
          hairColor: '#4A2B11',
          eyeColor: '#3E2723',
          shirtColor: '#4A90E2',
          pantsColor: '#2C3E50',
          accessory: 'none',
          expression: 'happy',
        },
      };

      mockPartnerStore.registerUser({
        id: 'user-alex-101',
        publicLoveverseId: 'LV-A7K92MP4TX',
        displayName: 'Alex',
        profileLabel: 'him',
        avatarConfig: alexProfile.avatarConfig,
      });

      set({
        session: { user: alexUser } as any,
        user: alexUser,
        profile: alexProfile,
        isLoading: false,
        error: null,
      });
    } else {
      const emmaUser = {
        id: 'user-emma-202',
        email: 'emma@loveverse.app',
        user_metadata: { display_name: 'Emma', profile_label: 'her' },
        aud: 'authenticated',
        created_at: new Date().toISOString(),
      } as any;

      const emmaProfile: UserProfile = {
        id: 'user-emma-202',
        email: 'emma@loveverse.app',
        displayName: 'Emma',
        profileLabel: 'her',
        publicLoveverseId: 'LV-M4R81X92PL',
        avatarConfig: {
          skinColor: '#FDDFB2',
          hairStyle: 'wavy',
          hairColor: '#D35400',
          eyeColor: '#27AE60',
          shirtColor: '#FF5C8A',
          pantsColor: '#8E44AD',
          accessory: 'flower',
          expression: 'loving',
        },
      };

      mockPartnerStore.registerUser({
        id: 'user-emma-202',
        publicLoveverseId: 'LV-M4R81X92PL',
        displayName: 'Emma',
        profileLabel: 'her',
        avatarConfig: emmaProfile.avatarConfig,
      });

      set({
        session: { user: emmaUser } as any,
        user: emmaUser,
        profile: emmaProfile,
        isLoading: false,
        error: null,
      });
    }
  },

  loginAsDemo: () => {
    get().loginAsUser('him');
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
