import { create } from 'zustand';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Couple, UserProfile, PartnerRequest, PublicPartnerProfile } from '../types';
import {
  PartnerConnectionService,
  RealtimePartnerEventData,
} from '../services/PartnerConnectionService';

interface CoupleState {
  couple: Couple | null;
  partner: UserProfile | null;
  inviteCode: string | null;
  publicCoupleId: string | null;
  incomingRequests: PartnerRequest[];
  outgoingRequests: PartnerRequest[];
  foundPartner: PublicPartnerProfile | null;
  isSearching: boolean;
  isLoading: boolean;
  error: string | null;

  // Pairing & Requests
  loadCouple: (userId: string) => Promise<void>;
  searchPartner: (
    loveverseId: string,
    currentUserId: string
  ) => Promise<{ partner?: PublicPartnerProfile; error?: string }>;
  clearFoundPartner: () => void;
  sendPartnerRequest: (
    senderUserId: string,
    receiverLoveverseId: string
  ) => Promise<{ request?: PartnerRequest; error?: string }>;
  acceptPartnerRequest: (
    receiverUserId: string,
    requestId: string
  ) => Promise<{ coupleId?: string; publicCoupleId?: string; error?: string }>;
  rejectPartnerRequest: (
    receiverUserId: string,
    requestId: string
  ) => Promise<{ error?: string }>;
  cancelPartnerRequest: (
    senderUserId: string,
    requestId: string
  ) => Promise<{ error?: string }>;
  fetchRequests: (userId: string) => Promise<void>;
  subscribeToRequests: (userId: string) => () => void;
  blockUser: (currentUserId: string, targetUserId: string) => Promise<{ error?: string }>;
  reportUser: (
    currentUserId: string,
    targetUserId: string,
    reason: string
  ) => Promise<{ error?: string }>;

  // Legacy & Utility
  createSpace: () => Promise<{ code?: string; error?: string }>;
  joinSpace: (code: string) => Promise<{ error?: string }>;
  disconnect: () => Promise<{ error?: string }>;
  setDemoCouple: () => void;
}

export const useCoupleStore = create<CoupleState>((set, get) => ({
  couple: null,
  partner: null,
  inviteCode: null,
  publicCoupleId: null,
  incomingRequests: [],
  outgoingRequests: [],
  foundPartner: null,
  isSearching: false,
  isLoading: false,
  error: null,

  setDemoCouple: () => {
    const demoPartner: UserProfile = {
      id: 'demo-user-emma',
      displayName: 'Emma 💕',
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
      coupleId: 'demo-couple-456',
    };

    set({
      couple: {
        id: 'demo-couple-456',
        publicCoupleId: 'CP-9TX42RK8M2',
        inviteCode: 'LOVE99',
        status: 'active',
        createdAt: new Date().toISOString(),
        partner: demoPartner,
      },
      partner: demoPartner,
      inviteCode: 'LOVE99',
      publicCoupleId: 'CP-9TX42RK8M2',
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
        // Fallback for legacy members table
        const { data: legacyMember } = await supabase
          .from('members')
          .select('space_id')
          .eq('user_id', userId)
          .maybeSingle();

        if (legacyMember) {
          const { data: spaceData } = await supabase
            .from('spaces')
            .select('*')
            .eq('id', legacyMember.space_id)
            .maybeSingle();

          set({
            couple: {
              id: legacyMember.space_id,
              publicCoupleId: spaceData?.public_couple_id,
              inviteCode: spaceData?.invite_code || '',
              status: 'active',
              createdAt: spaceData?.created_at || new Date().toISOString(),
            },
            publicCoupleId: spaceData?.public_couple_id || null,
          });
        } else {
          set({ couple: null, partner: null, publicCoupleId: null });
        }
        set({ isLoading: false });
        return;
      }

      const coupleId = member.couple_id;

      // Fetch couple record
      const { data: coupleData } = await supabase
        .from('spaces')
        .select('*')
        .eq('id', coupleId)
        .maybeSingle();

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
            profileLabel: pData.profile_label || 'partner',
            publicLoveverseId: pData.public_loveverse_id,
            avatarConfig: pData.avatar_config,
            avatarUrl: pData.avatar_url,
          };
        }
      }

      set({
        couple: coupleData
          ? {
              id: coupleData.id,
              publicCoupleId: coupleData.public_couple_id,
              inviteCode: coupleData.invite_code,
              anniversaryDate: coupleData.anniversary_date,
              status: 'active',
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
        publicCoupleId: coupleData?.public_couple_id || null,
        isLoading: false,
      });
    } catch (e: any) {
      set({ error: e.message, isLoading: false });
    }
  },

  searchPartner: async (loveverseId: string, currentUserId: string) => {
    set({ isSearching: true, error: null, foundPartner: null });
    const res = await PartnerConnectionService.searchPartner(currentUserId, loveverseId);
    set({
      isSearching: false,
      foundPartner: res.partner || null,
      error: res.error || null,
    });
    return res;
  },

  clearFoundPartner: () => {
    set({ foundPartner: null, error: null });
  },

  sendPartnerRequest: async (senderUserId: string, receiverLoveverseId: string) => {
    set({ isLoading: true, error: null });
    const res = await PartnerConnectionService.sendPartnerRequest(
      senderUserId,
      receiverLoveverseId
    );
    if (res.error) {
      set({ isLoading: false, error: res.error });
      return res;
    }

    if (res.request) {
      const current = get().outgoingRequests;
      set({
        outgoingRequests: [res.request, ...current],
        isLoading: false,
        foundPartner: null,
      });
    } else {
      set({ isLoading: false });
    }
    return res;
  },

  acceptPartnerRequest: async (receiverUserId: string, requestId: string) => {
    set({ isLoading: true, error: null });
    const res = await PartnerConnectionService.acceptPartnerRequest(
      receiverUserId,
      requestId
    );

    if (res.error) {
      set({ isLoading: false, error: res.error });
      return res;
    }

    // Refresh couple & requests
    await get().loadCouple(receiverUserId);
    await get().fetchRequests(receiverUserId);

    if (res.coupleId && res.publicCoupleId) {
      set({
        publicCoupleId: res.publicCoupleId,
        inviteCode: res.inviteCode || null,
        isLoading: false,
      });
    } else {
      set({ isLoading: false });
    }

    return res;
  },

  rejectPartnerRequest: async (receiverUserId: string, requestId: string) => {
    set({ isLoading: true, error: null });
    const res = await PartnerConnectionService.rejectPartnerRequest(
      receiverUserId,
      requestId
    );
    if (!res.error) {
      const filtered = get().incomingRequests.filter((r) => r.id !== requestId);
      set({ incomingRequests: filtered, isLoading: false });
    } else {
      set({ isLoading: false, error: res.error });
    }
    return res;
  },

  cancelPartnerRequest: async (senderUserId: string, requestId: string) => {
    set({ isLoading: true, error: null });
    const res = await PartnerConnectionService.cancelPartnerRequest(
      senderUserId,
      requestId
    );
    if (!res.error) {
      const filtered = get().outgoingRequests.filter((r) => r.id !== requestId);
      set({ outgoingRequests: filtered, isLoading: false });
    } else {
      set({ isLoading: false, error: res.error });
    }
    return res;
  },

  fetchRequests: async (userId: string) => {
    if (!userId) return;
    const [inc, out] = await Promise.all([
      PartnerConnectionService.getIncomingRequests(userId),
      PartnerConnectionService.getOutgoingRequests(userId),
    ]);

    set({
      incomingRequests: inc.requests || [],
      outgoingRequests: out.requests || [],
    });
  },

  subscribeToRequests: (userId: string) => {
    if (!userId) return () => {};

    // Initial fetch
    get().fetchRequests(userId);

    // Subscribe to realtime updates
    const unsubscribe = PartnerConnectionService.subscribeToEvents(
      userId,
      async (event: RealtimePartnerEventData) => {
        // Refresh requests and couple state whenever an event occurs
        await get().fetchRequests(userId);
        if (event.type === 'request_accepted' || event.type === 'partner_connected') {
          await get().loadCouple(userId);
        }
      }
    );

    return unsubscribe;
  },

  blockUser: async (currentUserId: string, targetUserId: string) => {
    const res = await PartnerConnectionService.blockUser(currentUserId, targetUserId);
    if (!res.error) {
      await get().fetchRequests(currentUserId);
    }
    return res;
  },

  reportUser: async (currentUserId: string, targetUserId: string, reason: string) => {
    return PartnerConnectionService.reportUser(currentUserId, targetUserId, reason);
  },

  createSpace: async () => {
    set({ isLoading: true, error: null });
    try {
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
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from('couple_members').delete().eq('user_id', user.id);
          await supabase.from('members').delete().eq('user_id', user.id);
        }
      }
      set({
        couple: null,
        partner: null,
        inviteCode: null,
        publicCoupleId: null,
        incomingRequests: [],
        outgoingRequests: [],
        foundPartner: null,
        isLoading: false,
      });
      return {};
    } catch (e: any) {
      set({ error: e.message, isLoading: false });
      return { error: e.message };
    }
  },
}));
