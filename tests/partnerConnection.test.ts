/**
 * ============================================================================
 * ❤️ LOVEVERSE PARTNER CONNECTION ENGINE TEST SUITE
 * Him & Her | Partner Pairing | Real-Time Synchronization | Unreal Engine 5
 * ============================================================================
 */

jest.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
      onAuthStateChange: jest.fn(),
      getUser: jest.fn(),
    },
    from: jest.fn(),
    rpc: jest.fn(),
    channel: jest.fn(),
    removeChannel: jest.fn(),
  },
  isSupabaseConfigured: false,
}));

import {
  generateLoveverseId,
  generateCoupleId,
  isValidLoveverseId,
  isValidCoupleId,
  normalizeLoveverseId,
  PartnerConnectionService,
  mockPartnerStore,
  rateLimiter,
  RealtimePartnerEventData,
} from '../services/PartnerConnectionService';
import {
  buildUnrealSessionUrl,
  validateUnrealSessionAuth,
} from '../lib/unreal';

describe('LoveVerse Unique ID & Partner Connection Engine', () => {
  beforeEach(() => {
    mockPartnerStore.reset();
    rateLimiter.reset();
  });

  describe('1. Unique LoveVerse & Couple ID Generation', () => {
    it('generates a valid, cryptographically secure LoveVerse ID with LV- prefix and 10 random characters', () => {
      const id = generateLoveverseId();
      expect(id).toMatch(/^LV-[A-Z0-9]{10}$/);
      expect(isValidLoveverseId(id)).toBe(true);
    });

    it('generates a valid Couple ID with CP- prefix and 10 random characters', () => {
      const coupleId = generateCoupleId();
      expect(coupleId).toMatch(/^CP-[A-Z0-9]{10}$/);
      expect(isValidCoupleId(coupleId)).toBe(true);
    });

    it('ensures high entropy and collision resistance over 1,000 iterations', () => {
      const idSet = new Set<string>();
      for (let i = 0; i < 1000; i++) {
        const id = generateLoveverseId();
        expect(idSet.has(id)).toBe(false);
        idSet.add(id);
      }
      expect(idSet.size).toBe(1000);
    });

    it('validates and normalizes LoveVerse ID input strings correctly', () => {
      expect(isValidLoveverseId('LV-7KQ92MP4TX')).toBe(true);
      expect(isValidLoveverseId('lv-7kq92mp4tx')).toBe(true);
      expect(isValidLoveverseId('INVALID-ID')).toBe(false);
      expect(isValidLoveverseId('LV-123')).toBe(false); // too short

      // Normalization handles case and missing LV- prefix
      expect(normalizeLoveverseId('7kq92mp4tx')).toBe('LV-7KQ92MP4TX');
      expect(normalizeLoveverseId('lv7kq92mp4tx')).toBe('LV-7KQ92MP4TX');
      expect(normalizeLoveverseId(' LV-7KQ92MP4TX ')).toBe('LV-7KQ92MP4TX');
    });
  });

  describe('2. Him & Her Profile Setup & Partner Search', () => {
    const userAlex = {
      id: 'user-alex-101',
      publicLoveverseId: 'LV-A7K92MP4TX',
      displayName: 'Alex',
      profileLabel: 'him' as const,
      avatarConfig: {
        skinColor: '#FDDFB2',
        hairStyle: 'short' as const,
        hairColor: '#4A2B11',
        eyeColor: '#3E2723',
        shirtColor: '#4A90E2',
        pantsColor: '#2C3E50',
        expression: 'happy' as const,
      },
    };

    const userEmma = {
      id: 'user-emma-202',
      publicLoveverseId: 'LV-M4R81X92PL',
      displayName: 'Emma',
      profileLabel: 'her' as const,
      avatarConfig: {
        skinColor: '#FDDFB2',
        hairStyle: 'wavy' as const,
        hairColor: '#D35400',
        eyeColor: '#27AE60',
        shirtColor: '#FF5C8A',
        pantsColor: '#8E44AD',
        expression: 'loving' as const,
      },
    };

    beforeEach(() => {
      mockPartnerStore.registerUser({ ...userAlex });
      mockPartnerStore.registerUser({ ...userEmma });
    });

    it('searches for partner by exact LoveVerse ID and returns safe public profile', async () => {
      const res = await PartnerConnectionService.searchPartner(
        userAlex.id,
        userEmma.publicLoveverseId
      );

      expect(res.error).toBeUndefined();
      expect(res.partner).toBeDefined();
      expect(res.partner?.displayName).toBe('Emma');
      expect(res.partner?.profileLabel).toBe('her');
      expect(res.partner?.publicLoveverseId).toBe('LV-M4R81X92PL');
      // Privacy check: sensitive data like email or internal auth id should never leak
      expect((res.partner as any).email).toBeUndefined();
      expect((res.partner as any).phoneNumber).toBeUndefined();
    });

    it('prevents searching for own LoveVerse ID', async () => {
      const res = await PartnerConnectionService.searchPartner(
        userAlex.id,
        userAlex.publicLoveverseId
      );
      expect(res.error).toMatch(/cannot connect with your own/i);
    });

    it('returns error when partner ID does not exist', async () => {
      const res = await PartnerConnectionService.searchPartner(
        userAlex.id,
        'LV-NONEXIST99'
      );
      expect(res.error).toMatch(/No partner found/i);
    });
  });

  describe('3. Partner Request Engine & State Transitions', () => {
    const userAlex = {
      id: 'user-alex-101',
      publicLoveverseId: 'LV-A7K92MP4TX',
      displayName: 'Alex',
      profileLabel: 'him' as const,
      avatarConfig: {
        skinColor: '#FDDFB2',
        hairStyle: 'short' as const,
        hairColor: '#4A2B11',
        eyeColor: '#3E2723',
        shirtColor: '#4A90E2',
        pantsColor: '#2C3E50',
      },
    };

    const userEmma = {
      id: 'user-emma-202',
      publicLoveverseId: 'LV-M4R81X92PL',
      displayName: 'Emma',
      profileLabel: 'her' as const,
      avatarConfig: {
        skinColor: '#FDDFB2',
        hairStyle: 'wavy' as const,
        hairColor: '#D35400',
        eyeColor: '#27AE60',
        shirtColor: '#FF5C8A',
        pantsColor: '#8E44AD',
      },
    };

    beforeEach(() => {
      mockPartnerStore.registerUser({ ...userAlex });
      mockPartnerStore.registerUser({ ...userEmma });
    });

    it('creates a pending partner request from Alex to Emma', async () => {
      const res = await PartnerConnectionService.sendPartnerRequest(
        userAlex.id,
        userEmma.publicLoveverseId
      );

      expect(res.error).toBeUndefined();
      expect(res.request).toBeDefined();
      expect(res.request?.status).toBe('pending');
      expect(res.request?.senderUserId).toBe(userAlex.id);
      expect(res.request?.receiverUserId).toBe(userEmma.id);
    });

    it('prevents sending partner requests to oneself', async () => {
      const res = await PartnerConnectionService.sendPartnerRequest(
        userAlex.id,
        userAlex.publicLoveverseId
      );
      expect(res.error).toMatch(/cannot send a partner request to yourself/i);
    });

    it('prevents duplicate pending requests in either direction', async () => {
      // Alex sends to Emma
      await PartnerConnectionService.sendPartnerRequest(
        userAlex.id,
        userEmma.publicLoveverseId
      );

      // Duplicate 1: Alex sends again to Emma
      const dup1 = await PartnerConnectionService.sendPartnerRequest(
        userAlex.id,
        userEmma.publicLoveverseId
      );
      expect(dup1.error).toMatch(/already exists/i);

      // Duplicate 2: Emma sends to Alex while request is pending
      const dup2 = await PartnerConnectionService.sendPartnerRequest(
        userEmma.id,
        userAlex.publicLoveverseId
      );
      expect(dup2.error).toMatch(/already exists/i);
    });

    it('allows recipient to reject a request, updating state to rejected', async () => {
      const sendRes = await PartnerConnectionService.sendPartnerRequest(
        userAlex.id,
        userEmma.publicLoveverseId
      );
      const requestId = sendRes.request!.id;

      const rejectRes = await PartnerConnectionService.rejectPartnerRequest(
        userEmma.id,
        requestId
      );
      expect(rejectRes.error).toBeUndefined();

      const storedReq = mockPartnerStore.requests.get(requestId);
      expect(storedReq?.status).toBe('rejected');
    });

    it('allows sender to cancel a pending request, updating state to cancelled', async () => {
      const sendRes = await PartnerConnectionService.sendPartnerRequest(
        userAlex.id,
        userEmma.publicLoveverseId
      );
      const requestId = sendRes.request!.id;

      const cancelRes = await PartnerConnectionService.cancelPartnerRequest(
        userAlex.id,
        requestId
      );
      expect(cancelRes.error).toBeUndefined();

      const storedReq = mockPartnerStore.requests.get(requestId);
      expect(storedReq?.status).toBe('cancelled');
    });

    it('prevents unauthorized users from accepting or cancelling requests', async () => {
      const sendRes = await PartnerConnectionService.sendPartnerRequest(
        userAlex.id,
        userEmma.publicLoveverseId
      );
      const requestId = sendRes.request!.id;

      // Sender (Alex) cannot accept their own request
      const badAccept = await PartnerConnectionService.acceptPartnerRequest(
        userAlex.id,
        requestId
      );
      expect(badAccept.error).toMatch(/Only the recipient/i);

      // Recipient (Emma) cannot cancel Alex's request
      const badCancel = await PartnerConnectionService.cancelPartnerRequest(
        userEmma.id,
        requestId
      );
      expect(badCancel.error).toMatch(/Only the sender/i);
    });
  });

  describe('4. Atomic Couple Creation & Request Expiration', () => {
    const userAlex = {
      id: 'user-alex-101',
      publicLoveverseId: 'LV-A7K92MP4TX',
      displayName: 'Alex',
      profileLabel: 'him' as const,
      avatarConfig: {
        skinColor: '#FDDFB2',
        hairStyle: 'short' as const,
        hairColor: '#4A2B11',
        eyeColor: '#3E2723',
        shirtColor: '#4A90E2',
        pantsColor: '#2C3E50',
      },
    };

    const userEmma = {
      id: 'user-emma-202',
      publicLoveverseId: 'LV-M4R81X92PL',
      displayName: 'Emma',
      profileLabel: 'her' as const,
      avatarConfig: {
        skinColor: '#FDDFB2',
        hairStyle: 'wavy' as const,
        hairColor: '#D35400',
        eyeColor: '#27AE60',
        shirtColor: '#FF5C8A',
        pantsColor: '#8E44AD',
      },
    };

    const userLucas = {
      id: 'user-lucas-303',
      publicLoveverseId: 'LV-L9C74PQ11X',
      displayName: 'Lucas',
      profileLabel: 'him' as const,
      avatarConfig: {
        skinColor: '#FDDFB2',
        hairStyle: 'short' as const,
        hairColor: '#1E1E24',
        eyeColor: '#2B2D42',
        shirtColor: '#6C4AB6',
        pantsColor: '#3D348B',
      },
    };

    beforeEach(() => {
      mockPartnerStore.registerUser({ ...userAlex });
      mockPartnerStore.registerUser({ ...userEmma });
      mockPartnerStore.registerUser({ ...userLucas });
    });

    it('atomically creates couple relationship and 3D room upon acceptance', async () => {
      const sendRes = await PartnerConnectionService.sendPartnerRequest(
        userAlex.id,
        userEmma.publicLoveverseId
      );
      const requestId = sendRes.request!.id;

      const acceptRes = await PartnerConnectionService.acceptPartnerRequest(
        userEmma.id,
        requestId
      );

      expect(acceptRes.error).toBeUndefined();
      expect(acceptRes.coupleId).toBeDefined();
      expect(acceptRes.publicCoupleId).toMatch(/^CP-[A-Z0-9]{10}$/);

      // Verify request status is accepted
      expect(mockPartnerStore.requests.get(requestId)?.status).toBe('accepted');

      // Verify both users are now in the active couple
      expect(mockPartnerStore.users.get(userAlex.id)?.coupleId).toBe(acceptRes.coupleId);
      expect(mockPartnerStore.users.get(userEmma.id)?.coupleId).toBe(acceptRes.coupleId);

      // Verify room configuration was created
      const couple = mockPartnerStore.couples.get(acceptRes.coupleId!);
      expect(couple).toBeDefined();
      expect(couple?.roomConfig.ue5_map).toBe('LoveVerse_Villa_Map');
      expect(couple?.roomConfig.unrealSessionReady).toBe(true);
    });

    it('cancels all other pending requests when a user accepts a couple request', async () => {
      // Alex sends to Emma
      const req1 = await PartnerConnectionService.sendPartnerRequest(
        userAlex.id,
        userEmma.publicLoveverseId
      );

      // Lucas also sends to Emma
      const req2 = await PartnerConnectionService.sendPartnerRequest(
        userLucas.id,
        userEmma.publicLoveverseId
      );

      // Emma accepts Alex's request
      await PartnerConnectionService.acceptPartnerRequest(userEmma.id, req1.request!.id);

      // Lucas's request to Emma should now be cancelled automatically
      expect(mockPartnerStore.requests.get(req2.request!.id)?.status).toBe('cancelled');
    });

    it('prevents already paired users from sending or receiving new requests', async () => {
      // Pair Alex and Emma
      const req = await PartnerConnectionService.sendPartnerRequest(
        userAlex.id,
        userEmma.publicLoveverseId
      );
      await PartnerConnectionService.acceptPartnerRequest(userEmma.id, req.request!.id);

      // Alex attempts to send request to Lucas
      const badSend = await PartnerConnectionService.sendPartnerRequest(
        userAlex.id,
        userLucas.publicLoveverseId
      );
      expect(badSend.error).toMatch(/already connected/i);

      // Lucas attempts to send request to Emma
      const badReceive = await PartnerConnectionService.sendPartnerRequest(
        userLucas.id,
        userEmma.publicLoveverseId
      );
      expect(badReceive.error).toMatch(/already connected/i);
    });

    it('rejects expired partner requests', async () => {
      const sendRes = await PartnerConnectionService.sendPartnerRequest(
        userAlex.id,
        userEmma.publicLoveverseId
      );
      const req = mockPartnerStore.requests.get(sendRes.request!.id)!;

      // Force expiration in the past
      req.expiresAt = new Date(Date.now() - 10000).toISOString();

      const acceptRes = await PartnerConnectionService.acceptPartnerRequest(
        userEmma.id,
        req.id
      );
      expect(acceptRes.error).toMatch(/expired/i);
      expect(req.status).toBe('expired');
    });
  });

  describe('5. Real-Time Notifications & Safety Features', () => {
    const userAlex = {
      id: 'user-alex-101',
      publicLoveverseId: 'LV-A7K92MP4TX',
      displayName: 'Alex',
      profileLabel: 'him' as const,
      avatarConfig: {
        skinColor: '#FDDFB2',
        hairStyle: 'short' as const,
        hairColor: '#4A2B11',
        eyeColor: '#3E2723',
        shirtColor: '#4A90E2',
        pantsColor: '#2C3E50',
      },
    };

    const userEmma = {
      id: 'user-emma-202',
      publicLoveverseId: 'LV-M4R81X92PL',
      displayName: 'Emma',
      profileLabel: 'her' as const,
      avatarConfig: {
        skinColor: '#FDDFB2',
        hairStyle: 'wavy' as const,
        hairColor: '#D35400',
        eyeColor: '#27AE60',
        shirtColor: '#FF5C8A',
        pantsColor: '#8E44AD',
      },
    };

    beforeEach(() => {
      mockPartnerStore.registerUser({ ...userAlex });
      mockPartnerStore.registerUser({ ...userEmma });
    });

    it('emits real-time event updates on new request and acceptance', async () => {
      const receivedEvents: RealtimePartnerEventData[] = [];
      const unsubscribe = mockPartnerStore.subscribe((ev) => receivedEvents.push(ev));

      // 1. Alex sends request
      const sendRes = await PartnerConnectionService.sendPartnerRequest(
        userAlex.id,
        userEmma.publicLoveverseId
      );

      expect(receivedEvents.length).toBe(1);
      expect(receivedEvents[0].type).toBe('new_request');
      expect(receivedEvents[0].requestId).toBe(sendRes.request!.id);

      // 2. Emma accepts request
      await PartnerConnectionService.acceptPartnerRequest(
        userEmma.id,
        sendRes.request!.id
      );

      expect(receivedEvents.length).toBe(3);
      expect(receivedEvents[1].type).toBe('request_accepted');
      expect(receivedEvents[2].type).toBe('partner_connected');

      unsubscribe();
    });

    it('enforces blocking and reporting to protect users from unwanted requests', async () => {
      // Alex blocks Emma
      await PartnerConnectionService.blockUser(userAlex.id, userEmma.id);

      // Emma cannot search Alex
      const searchRes = await PartnerConnectionService.searchPartner(
        userEmma.id,
        userAlex.publicLoveverseId
      );
      expect(searchRes.error).toMatch(/No partner found/i);

      // Emma cannot send request to Alex
      const sendRes = await PartnerConnectionService.sendPartnerRequest(
        userEmma.id,
        userAlex.publicLoveverseId
      );
      expect(sendRes.error).toMatch(/Unable to send request/i);

      // Reporting works smoothly
      const reportRes = await PartnerConnectionService.reportUser(
        userAlex.id,
        userEmma.id,
        'Harassment'
      );
      expect(reportRes.error).toBeUndefined();
      expect(mockPartnerStore.reports.length).toBe(1);
    });
  });

  describe('6. Unreal Engine 5 Session Authorization', () => {
    it('validates session authorization correctly', () => {
      // Valid pairing
      const valid = validateUnrealSessionAuth({
        userId: 'user-alex-101',
        coupleId: 'couple-space-789',
        publicCoupleId: 'CP-9TX42RK8M2',
      });
      expect(valid.authorized).toBe(true);

      // Missing user ID
      const missingUser = validateUnrealSessionAuth({
        coupleId: 'couple-space-789',
      });
      expect(missingUser.authorized).toBe(false);

      // Missing couple pairing authorization
      const missingCouple = validateUnrealSessionAuth({
        userId: 'user-alex-101',
      });
      expect(missingCouple.authorized).toBe(false);
    });

    it('builds an authorized Unreal Engine 5 session URL with all partner parameters', () => {
      const sessionUrl = buildUnrealSessionUrl({
        coupleId: 'couple-12345',
        publicCoupleId: 'CP-9TX42RK8M2',
        userId: 'user-alex-101',
        userLoveverseId: 'LV-A7K92MP4TX',
        partnerLoveverseId: 'LV-M4R81X92PL',
        role: 'him',
      });

      expect(sessionUrl).toContain('coupleId=couple-12345');
      expect(sessionUrl).toContain('publicCoupleId=CP-9TX42RK8M2');
      expect(sessionUrl).toContain('userId=user-alex-101');
      expect(sessionUrl).toContain('userLoveverseId=LV-A7K92MP4TX');
      expect(sessionUrl).toContain('partnerLoveverseId=LV-M4R81X92PL');
      expect(sessionUrl).toContain('role=him');
      expect(sessionUrl).toContain('source=loveverse');
    });
  });

  describe('7. End-to-End Simulation: Alex & Emma Pairing Flow', () => {
    it('simulates the complete user flow from ID generation to connected 3D room session', async () => {
      // Step 1: User A registers (Alex, Him)
      const alexId = generateLoveverseId();
      const alex = mockPartnerStore.registerUser({
        id: 'user-alex-sim',
        publicLoveverseId: alexId,
        displayName: 'Alex',
        profileLabel: 'him',
        avatarConfig: {
          skinColor: '#FDDFB2',
          hairStyle: 'short',
          hairColor: '#4A2B11',
          eyeColor: '#3E2723',
          shirtColor: '#4A90E2',
          pantsColor: '#2C3E50',
        },
      });

      // Step 2: User B registers (Emma, Her)
      const emmaId = generateLoveverseId();
      const emma = mockPartnerStore.registerUser({
        id: 'user-emma-sim',
        publicLoveverseId: emmaId,
        displayName: 'Emma',
        profileLabel: 'her',
        avatarConfig: {
          skinColor: '#FDDFB2',
          hairStyle: 'wavy',
          hairColor: '#D35400',
          eyeColor: '#27AE60',
          shirtColor: '#FF5C8A',
          pantsColor: '#8E44AD',
        },
      });

      // Step 3: Emma searches Alex by ID
      const searchRes = await PartnerConnectionService.searchPartner(emma.id, alex.publicLoveverseId);
      expect(searchRes.partner?.displayName).toBe('Alex');
      expect(searchRes.partner?.profileLabel).toBe('him');

      // Step 4: Emma sends Partner Request to Alex
      const reqRes = await PartnerConnectionService.sendPartnerRequest(emma.id, alex.publicLoveverseId);
      expect(reqRes.request?.status).toBe('pending');

      // Step 5: Alex receives and accepts the request
      const acceptRes = await PartnerConnectionService.acceptPartnerRequest(
        alex.id,
        reqRes.request!.id
      );
      expect(acceptRes.publicCoupleId).toBeDefined();

      // Step 6: Both partners generate their authorized UE5 3D room URLs
      const alexUe5Url = buildUnrealSessionUrl({
        coupleId: acceptRes.coupleId,
        publicCoupleId: acceptRes.publicCoupleId,
        userId: alex.id,
        userLoveverseId: alex.publicLoveverseId,
        partnerLoveverseId: emma.publicLoveverseId,
        role: 'him',
      });

      const emmaUe5Url = buildUnrealSessionUrl({
        coupleId: acceptRes.coupleId,
        publicCoupleId: acceptRes.publicCoupleId,
        userId: emma.id,
        userLoveverseId: emma.publicLoveverseId,
        partnerLoveverseId: alex.publicLoveverseId,
        role: 'her',
      });

      expect(alexUe5Url).toBeTruthy();
      expect(emmaUe5Url).toBeTruthy();
      expect(alexUe5Url).toContain(`publicCoupleId=${acceptRes.publicCoupleId}`);
      expect(emmaUe5Url).toContain(`publicCoupleId=${acceptRes.publicCoupleId}`);
    });
  });
});
