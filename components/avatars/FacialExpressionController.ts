import * as THREE from 'three';
import { FacialExpression } from '../../types';
import { AvatarParts } from './AvatarRenderer';

export class FacialExpressionController {
  private parts: AvatarParts;
  private currentExpression: FacialExpression = 'happy';

  constructor(parts: AvatarParts) {
    this.parts = parts;
    this.applyExpression('happy');
  }

  public setExpression(expr: FacialExpression) {
    this.currentExpression = expr;
    this.applyExpression(expr);
  }

  public getExpression(): FacialExpression {
    return this.currentExpression;
  }

  public applyExpression(expr: FacialExpression) {
    const { mouth, eyebrows, cheeks, eyes, head } = this.parts;
    const blushMat = cheeks.left.material as THREE.MeshBasicMaterial;

    // Reset scales and rotations before applying specific expression
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
        eyebrows.left.rotation.z = -0.22; // Inner tilted up
        eyebrows.right.rotation.z = 0.22;
        blushMat.opacity = 0.2;
        break;

      case 'blushing':
        mouth.rotation.x = Math.PI;
        mouth.scale.set(0.9, 0.8, 1);
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
        // Squint eyes
        eyes.left.scale.set(1.2, 0.45, 1);
        eyes.right.scale.set(1.2, 0.45, 1);
        blushMat.opacity = 0.75;
        break;

      case 'shy':
        mouth.rotation.x = Math.PI;
        mouth.scale.set(0.8, 0.8, 1);
        mouth.rotation.z = 0.12; // Quirky shy smile
        eyebrows.left.position.y = 1.51;
        eyebrows.right.position.y = 1.51;
        blushMat.opacity = 0.95;
        head.rotation.z = -0.12;
        break;

      case 'surprised':
        mouth.rotation.x = Math.PI * 0.5; // 'O' shape mouth
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
        mouth.scale.set(1.15, 1.1, 1);
        blushMat.opacity = 0.88;
        eyebrows.left.position.y = 1.5;
        eyebrows.right.position.y = 1.5;
        head.rotation.z = 0.06;
        break;
    }
  }
}
