/**
 * ============================================================================
 * ❤️ LOVEVERSE UNIQUE ID & PARTNER CONNECTION ENGINE
 * Him & Her | Partner Pairing | Real-Time Synchronization | Unreal Engine 5
 * ============================================================================
 */

import { supabase, isSupabaseConfigured } from '../lib/supabase';
import {
  ProfileLabel,
  PartnerRequest,
  PartnerRequestStatus,
  PublicPartnerProfile,
  AvatarConfig,
} from '../types';

// Unambiguous, cryptographically secure 32-character alphabet (no 0/O, 1/I ambiguity)
const SECURE_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
const LOVEVERSE_ID_LENGTH = 10;
const COUPLE_ID_LENGTH = 10;

export type RealtimePartnerEventType =
  | 'new_request'
  | 'request_accepted'
  | 'request_rejected'
  | 'request_cancelled'
  | 'partner_connected'
  | 'partner_disconnected';

export interface RealtimePartnerEventData {
  type: RealtimePartnerEventType;
  requestId?: string;
  request?: PartnerRequest;
  coupleId?: string;
  publicCoupleId?: string;
  sender?: PublicPartnerProfile;
  receiver?: PublicPartnerProfile;
  timestamp: string;
}

/**
 * Generate a cryptographically secure random string from the given alphabet
 */
export function generateSecureString(length: number, alphabet = SECURE_ALPHABET): string {
  let result = '';
  const cryptoObj =
    typeof globalThis !== 'undefined' && globalThis.crypto
      ? globalThis.crypto
      : undefined;

  if (cryptoObj?.getRandomValues) {
    const bytes = new Uint8Array(length);
    cryptoObj.getRandomValues(bytes);
    for (let i = 0; i < length; i++) {
      result += alphabet[bytes[i] % alphabet.length];
    }
  } else {
    // Math.random fallback (e.g. edge environments)
    for (let i = 0; i < length; i++) {
      const idx = Math.floor(Math.random() * alphabet.length);
      result += alphabet[idx];
    }
  }
  return result;
}

/**
 * Automatically generate a permanent, unique LoveVerse ID for a user.
 * Format: LV-XXXXXXXXXX (e.g. LV-7KQ92MP4TX)
 */
export function generateLoveverseId(): string {
  return `LV-${generateSecureString(LOVEVERSE_ID_LENGTH)}`;
}

/**
 * Automatically generate a private Couple ID when two partners pair.
 * Format: CP-XXXXXXXXXX (e.g. CP-9TX42RK8M2)
 */
export function generateCoupleId(): string {
  return `CP-${generateSecureString(COUPLE_ID_LENGTH)}`;
}

/**
 * Validates a LoveVerse ID format: LV- followed by at least 10 uppercase alphanumeric chars
 */
export function isValidLoveverseId(id: string): boolean {
  if (!id || typeof id !== 'string') return false;
  const clean = id.trim().toUpperCase();
  return /^LV-[A-Z0-9]{10,}$/.test(clean);
}

/**
 * Validates a Couple ID format: CP- followed by at least 10 uppercase alphanumeric chars
 */
export function isValidCoupleId(id: string): boolean {
  if (!id || typeof id !== 'string') return false;
  const clean = id.trim().toUpperCase();
  return /^CP-[A-Z0-9]{10,}$/.test(clean);
}

/**
 * Normalizes input: uppercase, trimmed, prepends LV- if user entered only the 10 characters
 */
export function normalizeLoveverseId(raw: string): string {
  if (!raw) return '';
  let trimmed = raw.trim().toUpperCase().replace(/\s+/g, '');
  if (!trimmed.startsWith('LV-')) {
    if (trimmed.startsWith('LV')) {
      trimmed = 'LV-' + trimmed.slice(2);
    } else {
      trimmed = 'LV-' + trimmed;
    }
  }
  return trimmed;
}

// ----------------------------------------------------------------------------
// Rate Limiter (Protects against ID enumeration and spamming)
// ----------------------------------------------------------------------------
class RateLimiter {
  private requests: Map<string, number[]> = new Map();

  check(actionKey: string, maxPerWindow: number, windowMs: number): boolean {
    const now = Date.now();
    const timestamps = this.requests.get(actionKey) || [];
    const valid = timestamps.filter((t) => now - t < windowMs);
    if (valid.length >= maxPerWindow) {
      return false; // Rate limited
    }
    valid.push(now);
    this.requests.set(actionKey, valid);
    return true;
  }

  reset(actionKey?: string) {
    if (actionKey) {
      this.requests.delete(actionKey);
    } else {
      this.requests.clear();
    }
  }
}

export const rateLimiter = new RateLimiter();

// ----------------------------------------------------------------------------
// In-Memory Simulated State (Used for offline, unit testing & demo mode)
// ----------------------------------------------------------------------------
interface MockUserRecord {
  id: string;
  publicLoveverseId: string;
  displayName: string;
  profileLabel: ProfileLabel;
  avatarConfig: AvatarConfig;
  avatarUrl?: string;
  coupleId?: string | null;
}

interface MockCoupleRecord {
  id: string;
  publicCoupleId: string;
  inviteCode: string;
  partnerAUserId: string;
  partnerBUserId: string;
  status: 'active' | 'disconnected';
  createdAt: string;
  roomConfig: any;
}

class MockPartnerStore {
  users: Map<string, MockUserRecord> = new Map();
  requests: Map<string, PartnerRequest> = new Map();
  couples: Map<string, MockCoupleRecord> = new Map();
  blocked: Set<string> = new Set(); // "blocker:blocked"
  reports: Array<{ id: string; reporterId: string; reportedId: string; reason: string }> = [];
  listeners: Set<(event: RealtimePartnerEventData) => void> = new Set();

  reset() {
    this.users.clear();
    this.requests.clear();
    this.couples.clear();
    this.blocked.clear();
    this.reports = [];
    this.listeners.clear();
  }

  registerUser(user: MockUserRecord) {
    this.users.set(user.id, user);
    return user;
  }

  emit(event: RealtimePartnerEventData) {
    this.listeners.forEach((fn) => {
      try {
        fn(event);
      } catch (e) {
        console.error('Error in mock event listener:', e);
      }
    });
  }

  subscribe(listener: (event: RealtimePartnerEventData) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}

export const mockPartnerStore = new MockPartnerStore();

// Pre-seed mock store with standard demo profiles for Him & Her
mockPartnerStore.registerUser({
  id: 'demo-user-alex',
  publicLoveverseId: 'LV-A7K92MP4TX',
  displayName: 'Alex',
  profileLabel: 'him',
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
});

mockPartnerStore.registerUser({
  id: 'demo-user-emma',
  publicLoveverseId: 'LV-M4R81X92PL',
  displayName: 'Emma',
  profileLabel: 'her',
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
});

// ----------------------------------------------------------------------------
// Partner Connection Service API Implementation
// ----------------------------------------------------------------------------

export class PartnerConnectionService {
  /**
   * Search for a partner by their exact LoveVerse ID (LV-XXXXXXXXXX).
   * Returns only safe public profile data.
   * Excludes phone numbers, emails, passwords, and private internal UUIDs.
   */
  static async searchPartner(
    currentUserId: string,
    loveverseId: string
  ): Promise<{ partner?: PublicPartnerProfile; error?: string }> {
    const normalized = normalizeLoveverseId(loveverseId);
    if (!isValidLoveverseId(normalized)) {
      return { error: 'Please enter a valid LoveVerse ID (e.g. LV-7KQ92MP4TX)' };
    }

    // Rate limit: 12 searches per minute per user
    if (!rateLimiter.check(`search:${currentUserId}`, 12, 60000)) {
      return { error: 'Search rate limit exceeded. Please wait a moment.' };
    }

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase.rpc('search_partner_by_id', {
          p_loveverse_id: normalized,
        });

        if (error) {
          return { error: error.message };
        }

        if (!data || data.length === 0) {
          return { error: `No partner found with ID ${normalized}` };
        }

        const row = data[0];
        const partner: PublicPartnerProfile = {
          id: row.id,
          publicLoveverseId: row.public_loveverse_id,
          displayName: row.display_name,
          profileLabel: (row.profile_label as ProfileLabel) || 'partner',
          avatarConfig: row.avatar_config,
          avatarUrl: row.avatar_url,
        };

        return { partner };
      } catch (err: any) {
        return { error: err.message || 'Error searching partner' };
      }
    }

    // Offline / Mock fallback
    for (const user of mockPartnerStore.users.values()) {
      if (user.publicLoveverseId === normalized) {
        if (user.id === currentUserId) {
          return { error: 'You cannot connect with your own LoveVerse ID!' };
        }
        if (mockPartnerStore.blocked.has(`${currentUserId}:${user.id}`) ||
            mockPartnerStore.blocked.has(`${user.id}:${currentUserId}`)) {
          return { error: `No partner found with ID ${normalized}` };
        }
        return {
          partner: {
            id: user.id,
            publicLoveverseId: user.publicLoveverseId,
            displayName: user.displayName,
            profileLabel: user.profileLabel,
            avatarConfig: user.avatarConfig,
            avatarUrl: user.avatarUrl,
          },
        };
      }
    }

    return { error: `No partner found with ID ${normalized}` };
  }

  /**
   * Send a partner request to a partner identified by their LoveVerse ID.
   */
  static async sendPartnerRequest(
    senderUserId: string,
    receiverLoveverseId: string
  ): Promise<{ request?: PartnerRequest; error?: string }> {
    const normalized = normalizeLoveverseId(receiverLoveverseId);
    if (!isValidLoveverseId(normalized)) {
      return { error: 'Invalid LoveVerse ID format' };
    }

    // Rate limit: 6 requests per minute
    if (!rateLimiter.check(`req:${senderUserId}`, 6, 60000)) {
      return { error: 'Request rate limit exceeded. Please wait a moment.' };
    }

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase.rpc('send_partner_request', {
          p_receiver_loveverse_id: normalized,
        });

        if (error) {
          return { error: error.message };
        }

        const request: PartnerRequest = {
          id: data.id,
          senderUserId: data.sender_user_id,
          receiverUserId: data.receiver_user_id,
          status: data.status,
          createdAt: data.created_at,
          updatedAt: data.created_at,
          expiresAt: data.expires_at,
        };

        return { request };
      } catch (err: any) {
        return { error: err.message || 'Failed to send partner request' };
      }
    }

    // Offline / Mock fallback
    const sender = mockPartnerStore.users.get(senderUserId);
    if (!sender) {
      return { error: 'Sender user profile not found' };
    }
    if (sender.coupleId) {
      return { error: 'You are already connected with a partner' };
    }

    let target: MockUserRecord | undefined;
    for (const u of mockPartnerStore.users.values()) {
      if (u.publicLoveverseId === normalized) {
        target = u;
        break;
      }
    }

    if (!target) {
      return { error: `Partner ID ${normalized} not found` };
    }

    if (target.id === senderUserId) {
      return { error: 'You cannot send a partner request to yourself' };
    }

    if (target.coupleId) {
      return { error: 'This user is already connected with a partner' };
    }

    if (mockPartnerStore.blocked.has(`${senderUserId}:${target.id}`) ||
        mockPartnerStore.blocked.has(`${target.id}:${senderUserId}`)) {
      return { error: 'Unable to send request to this user' };
    }

    // Check for existing pending request
    for (const req of mockPartnerStore.requests.values()) {
      if (
        req.status === 'pending' &&
        ((req.senderUserId === senderUserId && req.receiverUserId === target.id) ||
         (req.senderUserId === target.id && req.receiverUserId === senderUserId))
      ) {
        return { error: 'A pending partner request already exists between you' };
      }
    }

    const requestId = `req-${Date.now()}-${generateSecureString(6)}`;
    const now = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString();

    const newRequest: PartnerRequest = {
      id: requestId,
      senderUserId: sender.id,
      receiverUserId: target.id,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
      expiresAt,
      sender: {
        id: sender.id,
        publicLoveverseId: sender.publicLoveverseId,
        displayName: sender.displayName,
        profileLabel: sender.profileLabel,
        avatarConfig: sender.avatarConfig,
      },
      receiver: {
        id: target.id,
        publicLoveverseId: target.publicLoveverseId,
        displayName: target.displayName,
        profileLabel: target.profileLabel,
        avatarConfig: target.avatarConfig,
      },
    };

    mockPartnerStore.requests.set(requestId, newRequest);

    // Emit Realtime Event for incoming request
    mockPartnerStore.emit({
      type: 'new_request',
      requestId,
      request: newRequest,
      sender: newRequest.sender,
      receiver: newRequest.receiver,
      timestamp: now,
    });

    return { request: newRequest };
  }

  /**
   * Accept an incoming partner request.
   * Atomically pairs both users, generates a Couple ID, and creates their 3D couple room.
   */
  static async acceptPartnerRequest(
    receiverUserId: string,
    requestId: string
  ): Promise<{
    coupleId?: string;
    publicCoupleId?: string;
    inviteCode?: string;
    error?: string;
  }> {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase.rpc('accept_partner_request', {
          p_request_id: requestId,
        });

        if (error) {
          return { error: error.message };
        }

        return {
          coupleId: data.couple_id,
          publicCoupleId: data.public_couple_id,
          inviteCode: data.invite_code,
        };
      } catch (err: any) {
        return { error: err.message || 'Failed to accept partner request' };
      }
    }

    // Offline / Mock fallback
    const req = mockPartnerStore.requests.get(requestId);
    if (!req) {
      return { error: 'Request not found' };
    }

    if (req.receiverUserId !== receiverUserId) {
      return { error: 'Only the recipient can accept this request' };
    }

    if (req.status !== 'pending') {
      return { error: `Request is not pending (status: ${req.status})` };
    }

    if (new Date(req.expiresAt).getTime() < Date.now()) {
      req.status = 'expired';
      req.updatedAt = new Date().toISOString();
      return { error: 'Partner request has expired' };
    }

    const sender = mockPartnerStore.users.get(req.senderUserId);
    const receiver = mockPartnerStore.users.get(receiverUserId);

    if (!sender || !receiver) {
      return { error: 'User profile not found' };
    }

    if (sender.coupleId || receiver.coupleId) {
      return { error: 'One or both users are already in an active couple' };
    }

    // Atomic couple creation
    const coupleId = `couple-${Date.now()}`;
    const publicCoupleId = generateCoupleId();
    const inviteCode = generateSecureString(6);
    const now = new Date().toISOString();

    const coupleRecord: MockCoupleRecord = {
      id: coupleId,
      publicCoupleId,
      inviteCode,
      partnerAUserId: sender.id,
      partnerBUserId: receiver.id,
      status: 'active',
      createdAt: now,
      roomConfig: {
        theme: 'romantic_villa',
        ue5_map: 'LoveVerse_Villa_Map',
        partner_a: sender.id,
        partner_b: receiver.id,
        unrealSessionReady: true,
      },
    };

    mockPartnerStore.couples.set(coupleId, coupleRecord);
    sender.coupleId = coupleId;
    receiver.coupleId = coupleId;
    req.status = 'accepted';
    req.updatedAt = now;

    // Cancel all other pending requests for both users
    for (const otherReq of mockPartnerStore.requests.values()) {
      if (otherReq.id !== requestId && otherReq.status === 'pending') {
        if (
          otherReq.senderUserId === sender.id ||
          otherReq.receiverUserId === sender.id ||
          otherReq.senderUserId === receiver.id ||
          otherReq.receiverUserId === receiver.id
        ) {
          otherReq.status = 'cancelled';
          otherReq.updatedAt = now;
        }
      }
    }

    // Realtime notification
    mockPartnerStore.emit({
      type: 'request_accepted',
      requestId,
      coupleId,
      publicCoupleId,
      sender: req.sender,
      receiver: req.receiver,
      timestamp: now,
    });

    mockPartnerStore.emit({
      type: 'partner_connected',
      coupleId,
      publicCoupleId,
      sender: req.sender,
      receiver: req.receiver,
      timestamp: now,
    });

    return {
      coupleId,
      publicCoupleId,
      inviteCode,
    };
  }

  /**
   * Reject an incoming partner request.
   */
  static async rejectPartnerRequest(
    receiverUserId: string,
    requestId: string
  ): Promise<{ error?: string }> {
    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase.rpc('reject_partner_request', {
          p_request_id: requestId,
        });
        if (error) return { error: error.message };
        return {};
      } catch (err: any) {
        return { error: err.message || 'Failed to reject request' };
      }
    }

    const req = mockPartnerStore.requests.get(requestId);
    if (!req) return { error: 'Request not found' };
    if (req.receiverUserId !== receiverUserId) {
      return { error: 'Only the recipient can decline this request' };
    }
    if (req.status !== 'pending') {
      return { error: 'Request is not pending' };
    }

    req.status = 'rejected';
    req.updatedAt = new Date().toISOString();

    mockPartnerStore.emit({
      type: 'request_rejected',
      requestId,
      sender: req.sender,
      receiver: req.receiver,
      timestamp: req.updatedAt,
    });

    return {};
  }

  /**
   * Cancel an outgoing partner request.
   */
  static async cancelPartnerRequest(
    senderUserId: string,
    requestId: string
  ): Promise<{ error?: string }> {
    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase.rpc('cancel_partner_request', {
          p_request_id: requestId,
        });
        if (error) return { error: error.message };
        return {};
      } catch (err: any) {
        return { error: err.message || 'Failed to cancel request' };
      }
    }

    const req = mockPartnerStore.requests.get(requestId);
    if (!req) return { error: 'Request not found' };
    if (req.senderUserId !== senderUserId) {
      return { error: 'Only the sender can cancel this request' };
    }
    if (req.status !== 'pending') {
      return { error: 'Request is not pending' };
    }

    req.status = 'cancelled';
    req.updatedAt = new Date().toISOString();

    mockPartnerStore.emit({
      type: 'request_cancelled',
      requestId,
      sender: req.sender,
      receiver: req.receiver,
      timestamp: req.updatedAt,
    });

    return {};
  }

  /**
   * Retrieve incoming pending requests for the current user.
   */
  static async getIncomingRequests(
    userId: string
  ): Promise<{ requests: PartnerRequest[]; error?: string }> {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('partner_requests')
          .select(`
            id,
            sender_user_id,
            receiver_user_id,
            status,
            created_at,
            updated_at,
            expires_at,
            sender:profiles!partner_requests_sender_user_id_fkey(
              id,
              public_loveverse_id,
              display_name,
              profile_label,
              avatar_config,
              avatar_url
            )
          `)
          .eq('receiver_user_id', userId)
          .eq('status', 'pending')
          .order('created_at', { ascending: false });

        if (error) return { requests: [], error: error.message };

        const mapped: PartnerRequest[] = (data || []).map((row: any) => ({
          id: row.id,
          senderUserId: row.sender_user_id,
          receiverUserId: row.receiver_user_id,
          status: row.status as PartnerRequestStatus,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
          expiresAt: row.expires_at,
          sender: row.sender
            ? {
                id: row.sender.id,
                publicLoveverseId: row.sender.public_loveverse_id,
                displayName: row.sender.display_name,
                profileLabel: row.sender.profile_label || 'partner',
                avatarConfig: row.sender.avatar_config,
                avatarUrl: row.sender.avatar_url,
              }
            : undefined,
        }));

        return { requests: mapped };
      } catch (err: any) {
        return { requests: [], error: err.message };
      }
    }

    // Mock fallback
    const result: PartnerRequest[] = [];
    for (const req of mockPartnerStore.requests.values()) {
      if (req.receiverUserId === userId && req.status === 'pending') {
        const sender = mockPartnerStore.users.get(req.senderUserId);
        result.push({
          ...req,
          sender: sender
            ? {
                id: sender.id,
                publicLoveverseId: sender.publicLoveverseId,
                displayName: sender.displayName,
                profileLabel: sender.profileLabel,
                avatarConfig: sender.avatarConfig,
                avatarUrl: sender.avatarUrl,
              }
            : undefined,
        });
      }
    }
    return { requests: result };
  }

  /**
   * Retrieve outgoing pending requests sent by the current user.
   */
  static async getOutgoingRequests(
    userId: string
  ): Promise<{ requests: PartnerRequest[]; error?: string }> {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('partner_requests')
          .select(`
            id,
            sender_user_id,
            receiver_user_id,
            status,
            created_at,
            updated_at,
            expires_at,
            receiver:profiles!partner_requests_receiver_user_id_fkey(
              id,
              public_loveverse_id,
              display_name,
              profile_label,
              avatar_config,
              avatar_url
            )
          `)
          .eq('sender_user_id', userId)
          .eq('status', 'pending')
          .order('created_at', { ascending: false });

        if (error) return { requests: [], error: error.message };

        const mapped: PartnerRequest[] = (data || []).map((row: any) => ({
          id: row.id,
          senderUserId: row.sender_user_id,
          receiverUserId: row.receiver_user_id,
          status: row.status as PartnerRequestStatus,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
          expiresAt: row.expires_at,
          receiver: row.receiver
            ? {
                id: row.receiver.id,
                publicLoveverseId: row.receiver.public_loveverse_id,
                displayName: row.receiver.display_name,
                profileLabel: row.receiver.profile_label || 'partner',
                avatarConfig: row.receiver.avatar_config,
                avatarUrl: row.receiver.avatar_url,
              }
            : undefined,
        }));

        return { requests: mapped };
      } catch (err: any) {
        return { requests: [], error: err.message };
      }
    }

    // Mock fallback
    const result: PartnerRequest[] = [];
    for (const req of mockPartnerStore.requests.values()) {
      if (req.senderUserId === userId && req.status === 'pending') {
        const receiver = mockPartnerStore.users.get(req.receiverUserId);
        result.push({
          ...req,
          receiver: receiver
            ? {
                id: receiver.id,
                publicLoveverseId: receiver.publicLoveverseId,
                displayName: receiver.displayName,
                profileLabel: receiver.profileLabel,
                avatarConfig: receiver.avatarConfig,
                avatarUrl: receiver.avatarUrl,
              }
            : undefined,
        });
      }
    }
    return { requests: result };
  }

  /**
   * Block another user to prevent requests and interaction.
   */
  static async blockUser(
    currentUserId: string,
    targetUserId: string
  ): Promise<{ error?: string }> {
    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase.rpc('block_user', {
          p_target_id: targetUserId,
        });
        if (error) return { error: error.message };
        return {};
      } catch (err: any) {
        return { error: err.message };
      }
    }

    mockPartnerStore.blocked.add(`${currentUserId}:${targetUserId}`);
    // Cancel pending requests between them
    for (const req of mockPartnerStore.requests.values()) {
      if (
        req.status === 'pending' &&
        ((req.senderUserId === currentUserId && req.receiverUserId === targetUserId) ||
         (req.senderUserId === targetUserId && req.receiverUserId === currentUserId))
      ) {
        req.status = 'cancelled';
        req.updatedAt = new Date().toISOString();
      }
    }
    return {};
  }

  /**
   * Report a user for inappropriate behavior.
   */
  static async reportUser(
    currentUserId: string,
    targetUserId: string,
    reason: string,
    details?: string
  ): Promise<{ error?: string }> {
    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase.rpc('report_user', {
          p_target_id: targetUserId,
          p_reason: reason,
          p_details: details || null,
        });
        if (error) return { error: error.message };
        return {};
      } catch (err: any) {
        return { error: err.message };
      }
    }

    mockPartnerStore.reports.push({
      id: `rep-${Date.now()}`,
      reporterId: currentUserId,
      reportedId: targetUserId,
      reason,
    });
    return {};
  }

  /**
   * Subscribe to real-time partner connection events.
   */
  static subscribeToEvents(
    userId: string,
    onEvent: (event: RealtimePartnerEventData) => void
  ): () => void {
    if (!isSupabaseConfigured) {
      return mockPartnerStore.subscribe(onEvent);
    }

    // Supabase Realtime channel
    const channelName = `partner_requests:${userId}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'partner_requests',
          filter: `receiver_user_id=eq.${userId}`,
        },
        (payload: any) => {
          if (payload.eventType === 'INSERT') {
            onEvent({
              type: 'new_request',
              requestId: payload.new.id,
              timestamp: payload.new.created_at,
            });
          } else if (payload.eventType === 'UPDATE') {
            const status = payload.new.status;
            if (status === 'accepted') {
              onEvent({
                type: 'request_accepted',
                requestId: payload.new.id,
                timestamp: payload.new.updated_at,
              });
            } else if (status === 'rejected') {
              onEvent({
                type: 'request_rejected',
                requestId: payload.new.id,
                timestamp: payload.new.updated_at,
              });
            } else if (status === 'cancelled') {
              onEvent({
                type: 'request_cancelled',
                requestId: payload.new.id,
                timestamp: payload.new.updated_at,
              });
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'partner_requests',
          filter: `sender_user_id=eq.${userId}`,
        },
        (payload: any) => {
          if (payload.eventType === 'UPDATE') {
            const status = payload.new.status;
            if (status === 'accepted') {
              onEvent({
                type: 'request_accepted',
                requestId: payload.new.id,
                timestamp: payload.new.updated_at,
              });
            } else if (status === 'rejected') {
              onEvent({
                type: 'request_rejected',
                requestId: payload.new.id,
                timestamp: payload.new.updated_at,
              });
            } else if (status === 'cancelled') {
              onEvent({
                type: 'request_cancelled',
                requestId: payload.new.id,
                timestamp: payload.new.updated_at,
              });
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }
}
