import * as THREE from 'three';
import { AvatarParts } from './AvatarRenderer';

export interface WalkGaitParams {
  strideFrequency: number;
  strideLength: number;
  hipBob: number;
  armSwing: number;
  torsoTwist: number;
}

export const DEFAULT_WALK_GAIT: WalkGaitParams = {
  strideFrequency: 6.2, // Steps per second in rad/s
  strideLength: 0.62,   // Leg rotation amplitude in radians
  hipBob: 0.045,        // Vertical bobbing amplitude
  armSwing: 0.55,       // Arm rotation amplitude
  torsoTwist: 0.04,     // Subtle torso sway
};

export class KinematicsEngine {
  /**
   * Applies realistic bipedal walking kinematics to avatar limbs and root
   */
  public static applyWalkingGait(
    parts: AvatarParts,
    walkCycleTime: number,
    walkSpeed: number = 1.0,
    gait: WalkGaitParams = DEFAULT_WALK_GAIT
  ) {
    const phase = walkCycleTime * gait.strideFrequency * walkSpeed;
    const legSwing = Math.sin(phase) * gait.strideLength;
    const armSwing = Math.sin(phase) * gait.armSwing;

    // 1. Legs counter-oscillation
    parts.legs.left.rotation.x = legSwing;
    parts.legs.right.rotation.x = -legSwing;

    // Slight outward toe angle
    parts.legs.left.rotation.y = 0.05;
    parts.legs.right.rotation.y = -0.05;

    // 2. Arms counter-balance legs (natural human arm swing)
    parts.arms.left.rotation.x = -armSwing;
    parts.arms.right.rotation.x = armSwing;
    parts.arms.left.rotation.z = -0.08 - Math.abs(armSwing) * 0.04;
    parts.arms.right.rotation.z = 0.08 + Math.abs(armSwing) * 0.04;

    // 3. Vertical hip bob (2 bobs per full left-right cycle)
    const bob = Math.abs(Math.sin(phase)) * gait.hipBob;
    parts.group.position.y = bob;

    // 4. Pelvis & Torso subtle weight shift and twist
    parts.torso.rotation.y = -Math.sin(phase) * gait.torsoTwist;
    parts.torso.rotation.z = Math.cos(phase) * 0.02;

    // 5. Head stays level with subtle counter-bob
    parts.head.position.y = 1.38 - bob * 0.5;
  }

  /**
   * Applies subtle natural living idle animations (breathing, weight shifts, arm relax)
   */
  public static applyLivingIdle(
    parts: AvatarParts,
    elapsedTime: number,
    offset: number = 0
  ) {
    const t = elapsedTime + offset;

    // 1. Natural breathing rhythm (~14-16 breaths per minute)
    const breathPhase = t * 2.2;
    const breath = Math.sin(breathPhase) * 0.016;
    parts.group.position.y = breath;
    parts.torso.scale.set(1 + breath * 0.4, 1 + breath * 0.3, 1 + breath * 0.5);

    // 2. Natural posture weight shifting (slow cycle ~0.5 Hz)
    const weightShift = Math.sin(t * 0.7) * 0.015;
    parts.group.rotation.z = weightShift;
    parts.group.position.x += weightShift * 0.02;

    // 3. Relaxed resting arms with gentle breathing sway
    parts.arms.left.rotation.set(0.04 + breath * 0.8, 0, -0.06);
    parts.arms.right.rotation.set(0.04 + breath * 0.8, 0, 0.06);

    // 4. Relaxed legs
    parts.legs.left.rotation.set(0, 0.04, 0);
    parts.legs.right.rotation.set(0, -0.04, 0);

    // 5. Head gentle natural micro-tilt
    parts.head.rotation.z = Math.sin(t * 0.9) * 0.02;
    parts.head.rotation.x = Math.sin(t * 1.3) * 0.015;
  }

  /**
   * Constrains head to look toward target in 3D world space with human anatomical limits
   */
  public static applyLookAtTarget(
    avatarParts: AvatarParts,
    targetWorldPos: THREE.Vector3,
    maxYaw: number = 0.75, // ~43 degrees
    maxPitch: number = 0.45 // ~25 degrees
  ) {
    const headWorldPos = new THREE.Vector3();
    avatarParts.head.getWorldPosition(headWorldPos);

    // Calculate relative direction vector in avatar local space
    const dir = targetWorldPos.clone().sub(headWorldPos);
    const avatarWorldRot = avatarParts.group.rotation.y;

    // Global yaw angle to target
    const targetAngle = Math.atan2(dir.x, dir.z);
    let deltaYaw = targetAngle - avatarWorldRot;

    // Normalize angle to [-PI, PI]
    while (deltaYaw > Math.PI) deltaYaw -= Math.PI * 2;
    while (deltaYaw < -Math.PI) deltaYaw += Math.PI * 2;

    const clampedYaw = THREE.MathUtils.clamp(deltaYaw, -maxYaw, maxYaw);

    // Pitch calculation
    const horizDist = Math.sqrt(dir.x * dir.x + dir.z * dir.z);
    const targetPitch = -Math.atan2(dir.y, horizDist);
    const clampedPitch = THREE.MathUtils.clamp(targetPitch, -maxPitch, maxPitch);

    // Smoothly apply clamped rotation
    avatarParts.head.rotation.y = THREE.MathUtils.lerp(avatarParts.head.rotation.y, clampedYaw, 0.12);
    avatarParts.head.rotation.x = THREE.MathUtils.lerp(avatarParts.head.rotation.x, clampedPitch, 0.12);
  }

  /**
   * Smoothly rotates character towards a target world angle with shortest angular distance
   */
  public static rotateTowardAngle(
    currentAngle: number,
    targetAngle: number,
    turnRate: number = 0.12
  ): number {
    let diff = targetAngle - currentAngle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    return currentAngle + diff * turnRate;
  }

  /**
   * Calculates angle from source position to destination position in XZ plane
   */
  public static getAngleToTarget(
    source: THREE.Vector3 | { x: number; z: number },
    target: THREE.Vector3 | { x: number; z: number }
  ): number {
    const dx = target.x - source.x;
    const dz = target.z - source.z;
    return Math.atan2(dx, dz);
  }

  /**
   * Smooth cubic ease in-out curve for natural human acceleration and deceleration
   */
  public static easeInOut(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  /**
   * Smooth ease out curve (for gentle deceleration when arriving)
   */
  public static easeOut(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }
}
