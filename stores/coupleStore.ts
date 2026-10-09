import { create } from 'zustand';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Couple, UserProfile } from '../types';

interface CoupleState {
  couple: Couple | null;
  partner: UserProfile | null;
  inviteCode: string | null;
  isLoading: boolean;
  error: string | null;
  loadCouple: (userId: string) => Promise<void>;
  createSpace: () => Promise<{ code?: string; error?: string }>;
  joinSpace: (code: string) => Promise<{ error?: string }>;
  disconnect: () => Promise<{ error?: string }>;
  setDemoCouple: () => void;
}

export const useCoupleStore = create<CoupleState>((set, get) => ({
  couple: null,
  partner: null,
  inviteCode: null,
  isLoading: false,
  error: null,

  setDemoCouple: () => {
    const demoPartner: UserProfile = {
      id: 'demo-partner-456',
      displayName: 'Darling 💕',
      avatarConfig: {
        skinColor: '#F5C6A5',
        hairStyle: 'short',
        hairColor: '#1E1E24',
        eyeColor: '#2B2D42',
        shirtColor: '#6C4AB6',
        pantsColor: '#3D348B',
        accessory: 'none',
        expression: 'loving',
      },
      coupleId: 'demo-couple-456',
    };

    set({
      couple: {
        id: 'demo-couple-456',
        inviteCode: 'LOVE99',
        status: 'active',
        createdAt: new Date().toISOString(),
      },
      partner: demoPartner,
      inviteCode: 'LOVE99',
      isLoading: false,
      error: null,
    });
  },

  loadCouple: async (userId: string) => {
    if (userId === 'demo-user-123') {
      get().setDemoCouple();
      return;
    }
    if (!isSupabaseConfigured || !userId) return;
    try {
      set({ isLoading: true, error: null });

      // Find user's couple membership
      const { data: member, error: memberErr } = await supabase
        .from('couple_members')
        .select('couple_id')
        .eq('user_id', userId)
        .maybeSingle();

      if (memberErr || !member) {
        // Check old table fallback if migration in progress
        const { data: legacyMember } = await supabase
          .from('members')
          .select('space_id')
          .eq('user_id', userId)
          .maybeSingle();

        if (legacyMember) {
          set({
            couple: {
              id: legacyMember.space_id,
              inviteCode: '',
              status: 'active',
              createdAt: new Date().toISOString(),
            },
          });
        } else {
          set({ couple: null, partner: null });
        }
        set({ isLoading: false });
        return;
      }

      const coupleId = member.couple_id;

      // Fetch couple record
      const { data: coupleData } = await supabase
        .from('couples')
        .select('*')
        .eq('id', coupleId)
        .single();

      // Find partner ID
      const { data: partnerMember } = await supabase
        .from('couple_members')
        .select('user_id')
        .eq('couple_id', coupleId)
        .neq('user_id', userId)
        .maybeSingle();

      let partnerProfile: UserProfile | null = null;
      if (partnerMember) {
        const { data: pData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', partnerMember.user_id)
          .maybeSingle();

        if (pData) {
          partnerProfile = {
            id: pData.id,
            displayName: pData.display_name,
            avatarConfig: pData.avatar_config,
            avatarUrl: pData.avatar_url,
          };
        }
      }

      set({
        couple: coupleData
          ? {
              id: coupleData.id,
              inviteCode: coupleData.invite_code,
              anniversaryDate: coupleData.anniversary_date,
              status: coupleData.status,
              createdAt: coupleData.created_at,
              partner: partnerProfile,
            }
          : {
              id: coupleId,
              inviteCode: '',
              status: 'active',
              createdAt: new Date().toISOString(),
              partner: partnerProfile,
            },
        partner: partnerProfile,
        inviteCode: coupleData?.invite_code || null,
        isLoading: false,
      });
    } catch (e: any) {
      set({ error: e.message, isLoading: false });
    }
  },

  createSpace: async () => {
    set({ isLoading: true, error: null });
    try {
      // Call create_space RPC
      const { data, error } = await supabase.rpc('create_space');
      if (error) {
        set({ error: error.message, isLoading: false });
        return { error: error.message };
      }

      const spaceId = data[0]?.space_id;
      const code = data[0]?.code;

      set({
        couple: {
          id: spaceId,
          inviteCode: code,
          status: 'active',
          createdAt: new Date().toISOString(),
        },
        inviteCode: code,
        isLoading: false,
      });

      return { code };
    } catch (e: any) {
      set({ error: e.message, isLoading: false });
      return { error: e.message };
    }
  },

  joinSpace: async (code: string) => {
    set({ isLoading: true, error: null });
    try {
      const trimmed = code.trim().toUpperCase();
      const { data, error } = await supabase.rpc('join_space', { p_code: trimmed });
      if (error) {
        set({ error: error.message, isLoading: false });
        return { error: error.message };
      }

      set({
        couple: {
          id: data,
          inviteCode: trimmed,
          status: 'active',
          createdAt: new Date().toISOString(),
        },
        isLoading: false,
      });

      return {};
    } catch (e: any) {
      set({ error: e.message, isLoading: false });
      return { error: e.message };
    }
  },

  disconnect: async () => {
    set({ isLoading: true });
    try {
      const coupleId = get().couple?.id;
      if (coupleId) {
        // Disconnect member
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from('couple_members').delete().eq('user_id', user.id);
          await supabase.from('members').delete().eq('user_id', user.id);
        }
      }
      set({ couple: null, partner: null, inviteCode: null, isLoading: false });
      return {};
    } catch (e: any) {
      set({ error: e.message, isLoading: false });
      return { error: e.message };
    }
  },
}));
