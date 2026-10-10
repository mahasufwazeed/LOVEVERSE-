jest.mock('../lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
    channel: jest.fn(() => ({
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn(),
      send: jest.fn(),
    })),
    removeChannel: jest.fn(),
  },
  isSupabaseConfigured: false,
}));

import * as THREE from 'three';
import { createBitmojiAvatar } from '../components/avatars/AvatarRenderer';
import { FacialExpressionController } from '../components/avatars/FacialExpressionController';
import { AvatarAnimationController } from '../components/avatars/AvatarAnimationController';
import { AnimationStateMachine } from '../components/avatars/AnimationStateMachine';
import { KinematicsEngine } from '../components/avatars/KinematicsEngine';
import { FurnitureAnchorManager } from '../components/avatars/FurnitureAnchorManager';
import { partnerSyncService } from '../services/PartnerSynchronizationService';
import { COUPLE_STICKERS } from '../constants/stickers';
import { AvatarConfig, CoupleInteraction, FacialExpression } from '../types';
import { RoomObject } from '../types/room';

describe('3D Bitmoji-Style Couple Avatar Engine & Realism Systems', () => {
  const dummyConfig: AvatarConfig = {
    skinColor: '#FDDFB2',
    hairStyle: 'wavy',
    hairColor: '#4A2B11',
    eyeColor: '#3E2723',
    shirtColor: '#FF5C8A',
    pantsColor: '#292238',
    expression: 'happy',
  };

  it('procedurally generates 3D avatar with all anatomical and facial parts', () => {
    const parts = createBitmojiAvatar(dummyConfig, false);

    expect(parts.group).toBeDefined();
    expect(parts.head).toBeDefined();
    expect(parts.hair).toBeDefined();
    expect(parts.eyes.left).toBeDefined();
    expect(parts.eyes.right).toBeDefined();
    expect(parts.eyebrows.left).toBeDefined();
    expect(parts.eyebrows.right).toBeDefined();
    expect(parts.mouth).toBeDefined();
    expect(parts.cheeks.left).toBeDefined();
    expect(parts.cheeks.right).toBeDefined();
    expect(parts.torso).toBeDefined();
    expect(parts.arms.left).toBeDefined();
    expect(parts.arms.right).toBeDefined();
    expect(parts.legs.left).toBeDefined();
    expect(parts.legs.right).toBeDefined();
  });

  it('morphs facial expressions across all 8 emotional states', () => {
    const parts = createBitmojiAvatar(dummyConfig, false);
    const controller = new FacialExpressionController(parts);

    const expressions: FacialExpression[] = [
      'happy',
      'sad',
      'blushing',
      'excited',
      'laughing',
      'shy',
      'surprised',
      'loving',
    ];

    expressions.forEach((expr) => {
      controller.setExpression(expr);
      expect(controller.getExpression()).toBe(expr);
    });
  });

  it('simulates procedural eye blinking and closed-eyes states', () => {
    const parts = createBitmojiAvatar(dummyConfig, false);
    const controller = new FacialExpressionController(parts);

    // Initial open state
    expect(parts.eyes.left.scale.y).toBeCloseTo(1.0, 1);

    // Force eyes closed (during intimate kiss/sleep)
    controller.setEyesClosed(true);
    controller.update(0.016);
    expect(parts.eyes.left.scale.y).toBeCloseTo(0.08, 2);

    // Release forced eyes closed
    controller.setEyesClosed(false);
    controller.update(0.016);
    expect(parts.eyes.left.scale.y).toBeGreaterThan(0.08);
  });

  it('applies bipedal walking gait kinematics with counter-oscillating limbs', () => {
    const parts = createBitmojiAvatar(dummyConfig, false);

    // Apply walk gait at quarter cycle
    KinematicsEngine.applyWalkingGait(parts, 0.25, 1.0);

    // Opposite legs must have opposite signs
    expect(parts.legs.left.rotation.x).not.toBe(0);
    expect(Math.sign(parts.legs.left.rotation.x)).toBe(-Math.sign(parts.legs.right.rotation.x));

    // Arms counter-balance legs
    expect(Math.sign(parts.arms.left.rotation.x)).toBe(-Math.sign(parts.legs.left.rotation.x));
    expect(parts.group.position.y).toBeGreaterThanOrEqual(0); // Vertical hip bob
  });

  it('applies look-at constraints within anatomical human neck limits', () => {
    const parts = createBitmojiAvatar(dummyConfig, false);

    // Target far to the side (+90 degrees)
    const targetPos = new THREE.Vector3(5, 1.4, 0);
    KinematicsEngine.applyLookAtTarget(parts, targetPos, 0.75, 0.45);

    // Yaw must be clamped to max yaw limit (~0.75 rad)
    expect(Math.abs(parts.head.rotation.y)).toBeLessThanOrEqual(0.75);
  });

  it('progresses through multi-phase deterministic interaction timeline', () => {
    const sm = new AnimationStateMachine();
    sm.startInteraction('hug');

    expect(sm.getPhase()).toBe('TURNING');
    expect(sm.getState()).toBe('TURNING');

    // Advance into APPROACHING
    sm.update(0.5);
    expect(sm.getPhase()).toBe('APPROACHING');
    expect(sm.getState()).toBe('APPROACHING_PARTNER');

    // Advance into ALIGNING
    sm.update(1.2);
    expect(sm.getPhase()).toBe('ALIGNING');
    expect(sm.getState()).toBe('ALIGNING');

    // Advance into ACTION (INTERACTING)
    sm.update(0.5);
    expect(sm.getPhase()).toBe('ACTION');
    expect(sm.getState()).toBe('INTERACTING');

    // Advance into REACTION
    sm.update(2.4);
    expect(sm.getPhase()).toBe('REACTION');
    expect(sm.getState()).toBe('REACTING');

    // Advance into RETURNING
    sm.update(0.8);
    expect(sm.getPhase()).toBe('RETURNING');
    expect(sm.getState()).toBe('RETURNING_TO_IDLE');

    // Advance to completion
    sm.update(1.2);
    expect(sm.getPhase()).toBe('IDLE');
    expect(sm.getState()).toBe('IDLE');
  });

  it('dynamically queries room furniture anchors for bed and sofa interactions', () => {
    const roomObjects: RoomObject[] = [
      {
        id: 'obj_bed',
        catalogId: 'double_bed',
        position: { x: -1.5, y: 0, z: -1.0 },
        rotationY: 0,
        color: '#FF6B8B',
      },
      {
        id: 'obj_sofa',
        catalogId: 'plush_sofa',
        position: { x: 0.5, y: 0, z: 0.5 },
        rotationY: Math.PI,
        color: '#6C4AB6',
      },
    ];

    // Bed anchor test
    const bedAnchors = FurnitureAnchorManager.getInteractionAnchors('sleep_beside', roomObjects);
    expect(bedAnchors.type).toBe('bed');
    expect(bedAnchors.userTarget.x).toBeCloseTo(-1.95, 1);
    expect(bedAnchors.partnerTarget.x).toBeCloseTo(-1.05, 1);
    expect(bedAnchors.elevationY).toBe(0.42);

    // Sofa anchor test
    const sofaAnchors = FurnitureAnchorManager.getInteractionAnchors('sit_together', roomObjects);
    expect(sofaAnchors.type).toBe('sofa');
    expect(sofaAnchors.elevationY).toBe(0.36);

    // Fallback standing anchor
    const standAnchors = FurnitureAnchorManager.getInteractionAnchors('hug', []);
    expect(standAnchors.type).toBe('standing');
  });

  it('executes all 10 realistic couple interactions across full timeline', () => {
    const userParts = createBitmojiAvatar(dummyConfig, false);
    const partnerParts = createBitmojiAvatar(dummyConfig, true);
    const animController = new AvatarAnimationController(userParts, partnerParts);

    const userExpr = new FacialExpressionController(userParts);
    const partnerExpr = new FacialExpressionController(partnerParts);
    animController.setFacialControllers(userExpr, partnerExpr);

    const interactions: CoupleInteraction[] = [
      'hug',
      'kiss',
      'cuddle',
      'hold_hands',
      'forehead_kiss',
      'flying_hearts',
      'blow_kiss',
      'dance',
      'sit_together',
      'sleep_beside',
    ];

    interactions.forEach((inter) => {
      animController.setInteraction(inter);
      expect(animController.getInteraction()).toBe(inter);

      // Phase 1: Turning & Approach
      animController.update(0.5, 0.5);
      expect(animController.getPhase()).toBeDefined();

      // Phase 2: Action / Interaction
      animController.update(1.8, 2.3);
      expect(animController.getUserState()).toBeDefined();

      // Phase 3: Reaction & Completion
      animController.update(4.0, 6.3);
    });
  });

  it('broadcasts deterministic multiplayer interaction payloads', () => {
    partnerSyncService.initialize('couple_123', 'user_abc', () => {}, () => {});
    const payload = partnerSyncService.broadcastInteraction('kiss', 'loving', 5600);

    expect(payload.interactionId).toBeDefined();
    expect(payload.type).toBe('kiss');
    expect(payload.expression).toBe('loving');
    expect(payload.initiatorId).toBe('user_abc');
    expect(payload.durationMs).toBe(5600);
    expect(payload.startTimestamp).toBeLessThanOrEqual(Date.now());
  });

  it('contains comprehensive Bitmoji animated couple stickers with valid actions', () => {
    expect(COUPLE_STICKERS.length).toBeGreaterThanOrEqual(7);

    COUPLE_STICKERS.forEach((stk) => {
      expect(stk.id).toBeDefined();
      expect(stk.title).toBeDefined();
      expect(stk.interaction).toBeDefined();
      expect(stk.expression).toBeDefined();
      expect(stk.badge).toBeDefined();
    });
  });
});
