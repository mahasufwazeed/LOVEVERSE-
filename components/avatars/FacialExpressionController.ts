import * as THREE from 'three';
import { FacialExpression } from '../../types';
import { AvatarParts } from './AvatarRenderer';

export class FacialExpressionController {
  private parts: AvatarParts;
  private currentExpression: FacialExpression = 'happy';
  private targetExpression: FacialExpression = 'happy';

  // Blinking system
  private blinkTimer: number = 2.0;
  private nextBlinkInterval: number = 3.0;
  private isBlinking: boolean = false;
  private blinkProgress: number = 0;
  private isEyesClosedForced: boolean = false;

  // Gaze offset
  private gazeOffset: THREE.Vector2 = new THREE.Vector2(0, 0);

  constructor(parts: AvatarParts) {
    this.parts = parts;
    this.nextBlinkInterval = 2.5 + Math.random() * 2.5;
    this.applyExpression('happy');
  }

  public setExpression(expr: FacialExpression) {
    this.currentExpression = expr;
    this.targetExpression = expr;
    this.applyExpression(expr);
  }

  public getExpression(): FacialExpression {
    return this.currentExpression;
  }

  /**
   * Forces eyes closed (e.g. during kiss embrace or sleep)
   */
  public setEyesClosed(closed: boolean) {
    this.isEyesClosedForced = closed;
  }

  /**
   * Adjusts avatar pupil gaze direction (-1.0 to 1.0)
   */
  public setGaze(x: number, y: number) {
    this.gazeOffset.set(
      THREE.MathUtils.clamp(x, -0.02, 0.02),
      THREE.MathUtils.clamp(y, -0.015, 0.015)
    );
  }

  /**
   * Per-frame update for procedural blinking, gaze, and micro-movements
   */
  public update(delta: number) {
    // 1. Procedural blinking simulation
    if (this.isEyesClosedForced) {
      this.parts.eyes.left.scale.y = 0.08;
      this.parts.eyes.right.scale.y = 0.08;
      return;
    }

    this.blinkTimer += delta;

    if (!this.isBlinking && this.blinkTimer >= this.nextBlinkInterval) {
      this.isBlinking = true;
      this.blinkTimer = 0;
      this.blinkProgress = 0;
      // Randomize next interval (2.2s to 5.0s)
      this.nextBlinkInterval = 2.2 + Math.random() * 2.8;
    }

    if (this.isBlinking) {
      // Fast blink cycle (~140ms)
      this.blinkProgress += delta * 7.5;
      if (this.blinkProgress >= 1.0) {
        this.isBlinking = false;
        this.blinkProgress = 0;
        this.parts.eyes.left.scale.y = 1.0;
        this.parts.eyes.right.scale.y = 1.0;
      } else {
        // Parabolic blink curve
        const blinkAmount = Math.sin(this.blinkProgress * Math.PI);
        const eyeScaleY = THREE.MathUtils.lerp(1.0, 0.08, blinkAmount);
        this.parts.eyes.left.scale.y = eyeScaleY;
        this.parts.eyes.right.scale.y = eyeScaleY;
      }
    } else {
      // Normal open eye state
      const baseEyeScaleY = this.currentExpression === 'laughing' ? 0.45 : 1.0;
      this.parts.eyes.left.scale.y = THREE.MathUtils.lerp(this.parts.eyes.left.scale.y, baseEyeScaleY, 0.15);
      this.parts.eyes.right.scale.y = THREE.MathUtils.lerp(this.parts.eyes.right.scale.y, baseEyeScaleY, 0.15);
    }
  }

  public applyExpression(expr: FacialExpression) {
    const { mouth, eyebrows, cheeks, eyes, head } = this.parts;
    const blushMat = cheeks.left.material as THREE.MeshBasicMaterial;

    // Reset baseline transforms
    mouth.scale.set(1, 1, 1);
    mouth.rotation.set(Math.PI, 0, 0);
    mouth.position.set(0, 1.26, 0.3);
    eyebrows.left.position.y = 1.49;
    eyebrows.right.position.y = 1.49;
    eyebrows.left.rotation.z = 0.08;
    eyebrows.right.rotation.z = -0.08;
    eyes.left.scale.set(1, 1, 1);
    eyes.right.scale.set(1, 1, 1);
    head.rotation.z = 0;

    switch (expr) {
      case 'happy':
        mouth.rotation.x = Math.PI; // Smile arch
        mouth.scale.set(1.1, 1, 1);
        blushMat.opacity = 0.6;
        break;

      case 'sad':
        mouth.rotation.x = 0; // Inverted frown arch
        mouth.position.y = 1.25;
        eyebrows.left.rotation.z = -0.22;
        eyebrows.right.rotation.z = 0.22;
        blushMat.opacity = 0.2;
        break;

      case 'blushing':
        mouth.rotation.x = Math.PI;
        mouth.scale.set(0.95, 0.85, 1);
        eyebrows.left.position.y = 1.51;
        eyebrows.right.position.y = 1.51;
        blushMat.opacity = 0.95;
        head.rotation.z = 0.08;
        break;

      case 'excited':
        mouth.rotation.x = Math.PI;
        mouth.scale.set(1.4, 1.3, 1);
        eyebrows.left.position.y = 1.54;
        eyebrows.right.position.y = 1.54;
        eyes.left.scale.set(1.15, 1.15, 1);
        eyes.right.scale.set(1.15, 1.15, 1);
        blushMat.opacity = 0.8;
        break;

      case 'laughing':
        mouth.rotation.x = Math.PI;
        mouth.scale.set(1.5, 1.6, 1.2);
        eyebrows.left.position.y = 1.53;
        eyebrows.right.position.y = 1.53;
        eyes.left.scale.set(1.2, 0.45, 1);
        eyes.right.scale.set(1.2, 0.45, 1);
        blushMat.opacity = 0.75;
        break;

      case 'shy':
        mouth.rotation.x = Math.PI;
        mouth.scale.set(0.8, 0.8, 1);
        mouth.rotation.z = 0.12;
        eyebrows.left.position.y = 1.51;
        eyebrows.right.position.y = 1.51;
        blushMat.opacity = 0.95;
        head.rotation.z = -0.12;
        break;

      case 'surprised':
        mouth.rotation.x = Math.PI * 0.5;
        mouth.scale.set(0.7, 1.4, 1);
        eyebrows.left.position.y = 1.57;
        eyebrows.right.position.y = 1.57;
        eyes.left.scale.set(1.3, 1.3, 1);
        eyes.right.scale.set(1.3, 1.3, 1);
        blushMat.opacity = 0.4;
        break;

      case 'loving':
      default:
        mouth.rotation.x = Math.PI;
        mouth.scale.set(1.2, 1.15, 1);
        blushMat.opacity = 0.88;
        eyebrows.left.position.y = 1.5;
        eyebrows.right.position.y = 1.5;
        head.rotation.z = 0.06;
        break;
    }
  }
}
