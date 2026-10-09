import * as THREE from 'three';
import { CoupleInteraction } from '../../types';
import { AvatarParts } from './AvatarRenderer';

export class AvatarAnimationController {
  private userParts: AvatarParts;
  private partnerParts: AvatarParts;
  private currentInteraction: CoupleInteraction = 'idle';
  private animTimer: number = 0;

  // Resting coordinates
  private readonly USER_REST_X = -0.75;
  private readonly PARTNER_REST_X = 0.75;

  constructor(user: AvatarParts, partner: AvatarParts) {
    this.userParts = user;
    this.partnerParts = partner;
    this.resetToIdle();
  }

  public setInteraction(interaction: CoupleInteraction) {
    this.currentInteraction = interaction;
    this.animTimer = 0;
  }

  public getInteraction(): CoupleInteraction {
    return this.currentInteraction;
  }

  public update(delta: number, elapsedTime: number) {
    this.animTimer += delta;
    const t = elapsedTime;
    const inter = this.currentInteraction;

    const uGroup = this.userParts.group;
    const pGroup = this.partnerParts.group;
    const uArms = this.userParts.arms;
    const pArms = this.partnerParts.arms;
    const uLegs = this.userParts.legs;
    const pLegs = this.partnerParts.legs;

    switch (inter) {
      case 'hug': {
        // Step in close to center
        uGroup.position.x = THREE.MathUtils.lerp(uGroup.position.x, -0.25, 0.08);
        pGroup.position.x = THREE.MathUtils.lerp(pGroup.position.x, 0.25, 0.08);
        uGroup.position.z = THREE.MathUtils.lerp(uGroup.position.z, 0.2, 0.08);
        pGroup.position.z = THREE.MathUtils.lerp(pGroup.position.z, 0.2, 0.08);

        // Turn towards each other
        uGroup.rotation.y = THREE.MathUtils.lerp(uGroup.rotation.y, Math.PI * 0.45, 0.08);
        pGroup.rotation.y = THREE.MathUtils.lerp(pGroup.rotation.y, -Math.PI * 0.45, 0.08);

        // Wrap arms around partner
        uArms.left.rotation.z = -1.1;
        uArms.left.rotation.x = 0.7;
        uArms.right.rotation.z = -1.2;
        uArms.right.rotation.x = 0.8;

        pArms.left.rotation.z = 1.2;
        pArms.left.rotation.x = 0.8;
        pArms.right.rotation.z = 1.1;
        pArms.right.rotation.x = 0.7;

        // Gentle rocking embrace
        const sway = Math.sin(t * 3) * 0.03;
        uGroup.rotation.z = sway;
        pGroup.rotation.z = -sway;
        break;
      }

      case 'kiss': {
        // Step very close
        uGroup.position.x = THREE.MathUtils.lerp(uGroup.position.x, -0.22, 0.08);
        pGroup.position.x = THREE.MathUtils.lerp(pGroup.position.x, 0.22, 0.08);

        // Turn and lean in
        uGroup.rotation.y = THREE.MathUtils.lerp(uGroup.rotation.y, Math.PI * 0.48, 0.08);
        pGroup.rotation.y = THREE.MathUtils.lerp(pGroup.rotation.y, -Math.PI * 0.48, 0.08);

        // Tilt heads gently
        this.userParts.head.rotation.z = -0.18;
        this.partnerParts.head.rotation.z = 0.18;

        // Hands hold partner's waist & arms
        uArms.right.rotation.set(0.6, 0, -0.9);
        pArms.left.rotation.set(0.6, 0, 0.9);
        break;
      }

      case 'cuddle': {
        // Stand or lean side-by-side
        uGroup.position.x = THREE.MathUtils.lerp(uGroup.position.x, -0.28, 0.08);
        pGroup.position.x = THREE.MathUtils.lerp(pGroup.position.x, 0.15, 0.08);

        uGroup.rotation.y = THREE.MathUtils.lerp(uGroup.rotation.y, 0.2, 0.08);
        pGroup.rotation.y = THREE.MathUtils.lerp(pGroup.rotation.y, -0.1, 0.08);

        // Partner puts arm around user's shoulder
        pArms.left.rotation.set(0.2, 0, 1.2);
        // User rests head on partner
        this.userParts.head.rotation.z = 0.24;
        uArms.right.rotation.set(0.3, 0, -0.5);
        break;
      }

      case 'hold_hands': {
        uGroup.position.x = THREE.MathUtils.lerp(uGroup.position.x, -0.4, 0.08);
        pGroup.position.x = THREE.MathUtils.lerp(pGroup.position.x, 0.4, 0.08);

        uGroup.rotation.y = THREE.MathUtils.lerp(uGroup.rotation.y, 0.1, 0.08);
        pGroup.rotation.y = THREE.MathUtils.lerp(pGroup.rotation.y, -0.1, 0.08);

        // Inner arms reach to center to clasp hands
        uArms.right.rotation.set(0.2, 0, -0.7);
        pArms.left.rotation.set(0.2, 0, 0.7);

        // Sweet gentle arm swinging
        const handSway = Math.sin(t * 2.5) * 0.12;
        uArms.right.rotation.x = handSway;
        pArms.left.rotation.x = handSway;
        break;
      }

      case 'forehead_kiss': {
        uGroup.position.x = THREE.MathUtils.lerp(uGroup.position.x, -0.24, 0.08);
        pGroup.position.x = THREE.MathUtils.lerp(pGroup.position.x, 0.24, 0.08);

        // User leans in higher, partner tilts head slightly back
        this.userParts.head.rotation.x = 0.25;
        this.partnerParts.head.rotation.x = -0.15;
        uArms.right.rotation.set(0.5, 0, -0.8);
        pArms.left.rotation.set(0.2, 0, 0.4);
        break;
      }

      case 'flying_hearts':
      case 'blow_kiss': {
        uGroup.position.x = THREE.MathUtils.lerp(uGroup.position.x, this.USER_REST_X, 0.05);
        pGroup.position.x = THREE.MathUtils.lerp(pGroup.position.x, this.PARTNER_REST_X, 0.05);

        // User raises hands to lips and blows outward
        const blowPhase = (Math.sin(t * 4) + 1) / 2;
        uArms.right.rotation.x = -1.5 * blowPhase;
        uArms.right.rotation.z = -0.4 * blowPhase;
        uArms.left.rotation.x = -1.5 * blowPhase;
        uArms.left.rotation.z = 0.4 * blowPhase;

        // Partner receives happily with wave
        pArms.right.rotation.z = -1.2 + Math.sin(t * 5) * 0.2;
        break;
      }

      case 'dance': {
        // Dance together in center
        uGroup.position.x = THREE.MathUtils.lerp(uGroup.position.x, -0.32, 0.08);
        pGroup.position.x = THREE.MathUtils.lerp(pGroup.position.x, 0.32, 0.08);

        // Turn facing
        uGroup.rotation.y = Math.PI * 0.35;
        pGroup.rotation.y = -Math.PI * 0.35;

        // Rhythmic dance steps
        const danceStep = Math.sin(t * 4) * 0.18;
        const danceBounce = Math.abs(Math.sin(t * 4)) * 0.06;

        uGroup.position.y = danceBounce;
        pGroup.position.y = danceBounce;

        uGroup.rotation.z = danceStep * 0.5;
        pGroup.rotation.z = -danceStep * 0.5;

        uArms.left.rotation.set(0.4 + danceStep, 0, -0.8);
        uArms.right.rotation.set(0.4, 0, -0.8);
        pArms.left.rotation.set(0.4, 0, 0.8);
        pArms.right.rotation.set(0.4 - danceStep, 0, 0.8);
        break;
      }

      case 'sit_together': {
        // Move towards sofa in the background
        uGroup.position.x = THREE.MathUtils.lerp(uGroup.position.x, -0.45, 0.06);
        pGroup.position.x = THREE.MathUtils.lerp(pGroup.position.x, 0.45, 0.06);
        uGroup.position.z = THREE.MathUtils.lerp(uGroup.position.z, -1.45, 0.06);
        pGroup.position.z = THREE.MathUtils.lerp(pGroup.position.z, -1.45, 0.06);

        // Sitting height and leg bend
        uGroup.position.y = 0.35;
        pGroup.position.y = 0.35;

        // Rotate legs 90 deg forward to sit
        uLegs.left.rotation.x = -Math.PI * 0.45;
        uLegs.right.rotation.x = -Math.PI * 0.45;
        pLegs.left.rotation.x = -Math.PI * 0.45;
        pLegs.right.rotation.x = -Math.PI * 0.45;

        uArms.left.rotation.set(0.3, 0, -0.2);
        uArms.right.rotation.set(0.3, 0, -0.2);
        pArms.left.rotation.set(0.3, 0, 0.2);
        pArms.right.rotation.set(0.3, 0, 0.2);
        break;
      }

      case 'sleep_beside': {
        // Move to bed position (left back)
        uGroup.position.x = THREE.MathUtils.lerp(uGroup.position.x, -1.75, 0.06);
        pGroup.position.x = THREE.MathUtils.lerp(pGroup.position.x, -1.25, 0.06);
        uGroup.position.z = THREE.MathUtils.lerp(uGroup.position.z, 0.1, 0.06);
        pGroup.position.z = THREE.MathUtils.lerp(pGroup.position.z, 0.1, 0.06);

        // Lie down
        uGroup.rotation.x = -Math.PI * 0.48;
        pGroup.rotation.x = -Math.PI * 0.48;
        uGroup.position.y = 0.38;
        pGroup.position.y = 0.38;

        this.userParts.head.rotation.z = 0.3;
        this.partnerParts.head.rotation.z = -0.3;
        break;
      }

      case 'idle':
      default: {
        // Return to resting spots
        uGroup.position.x = THREE.MathUtils.lerp(uGroup.position.x, this.USER_REST_X, 0.05);
        pGroup.position.x = THREE.MathUtils.lerp(pGroup.position.x, this.PARTNER_REST_X, 0.05);
        uGroup.position.z = THREE.MathUtils.lerp(uGroup.position.z, 0.2, 0.05);
        pGroup.position.z = THREE.MathUtils.lerp(pGroup.position.z, 0.2, 0.05);

        uGroup.rotation.y = THREE.MathUtils.lerp(uGroup.rotation.y, 0.3, 0.05);
        pGroup.rotation.y = THREE.MathUtils.lerp(pGroup.rotation.y, -0.3, 0.05);
        uGroup.rotation.x = 0;
        pGroup.rotation.x = 0;
        uGroup.rotation.z = 0;
        pGroup.rotation.z = 0;

        // Subtle natural breathing cycle
        const breath = Math.sin(t * 2.2) * 0.02;
        uGroup.position.y = breath;
        pGroup.position.y = Math.sin(t * 2.2 + 0.9) * 0.02;

        // Reset limbs
        uArms.left.rotation.set(0, 0, 0);
        uArms.right.rotation.set(0, 0, 0);
        pArms.left.rotation.set(0, 0, 0);
        pArms.right.rotation.set(0, 0, 0);
        uLegs.left.rotation.set(0, 0, 0);
        uLegs.right.rotation.set(0, 0, 0);
        pLegs.left.rotation.set(0, 0, 0);
        pLegs.right.rotation.set(0, 0, 0);
        this.userParts.head.rotation.set(0, 0, 0);
        this.partnerParts.head.rotation.set(0, 0, 0);
        break;
      }
    }
  }

  private resetToIdle() {
    this.userParts.group.position.set(this.USER_REST_X, 0, 0.2);
    this.partnerParts.group.position.set(this.PARTNER_REST_X, 0, 0.2);
  }
}
