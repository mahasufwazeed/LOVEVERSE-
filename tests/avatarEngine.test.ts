import { createBitmojiAvatar } from '../components/avatars/AvatarRenderer';
import { FacialExpressionController } from '../components/avatars/FacialExpressionController';
import { AvatarAnimationController } from '../components/avatars/AvatarAnimationController';
import { COUPLE_STICKERS } from '../constants/stickers';
import { AvatarConfig, CoupleInteraction, FacialExpression } from '../types';

describe('3D Bitmoji-Style Couple Avatar Engine', () => {
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

  it('executes 10 romantic couple skeletal animations without errors', () => {
    const userParts = createBitmojiAvatar(dummyConfig, false);
    const partnerParts = createBitmojiAvatar(dummyConfig, true);
    const animController = new AvatarAnimationController(userParts, partnerParts);

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
      'idle',
      'walk',
      'wave',
    ];

    interactions.forEach((inter) => {
      animController.setInteraction(inter);
      expect(animController.getInteraction()).toBe(inter);

      // Simulate animation frames
      animController.update(0.016, 1.0);
      animController.update(0.016, 2.5);
    });
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
