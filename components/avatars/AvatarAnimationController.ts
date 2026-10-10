import * as THREE from 'three';
import { CoupleInteraction, CharacterState, InteractionPhase } from '../../types';
import { AvatarParts } from './AvatarRenderer';
import { KinematicsEngine } from './KinematicsEngine';
import { AnimationStateMachine } from './AnimationStateMachine';
import { FurnitureAnchorManager, FurnitureAnchorPair } from './FurnitureAnchorManager';
import { FacialExpressionController } from './FacialExpressionController';
import { ProjectileHearts3D } from '../world/ProjectileHearts3D';
import { RoomObject } from '../../types/room';

export class AvatarAnimationController {
  private userParts: AvatarParts;
  private partnerParts: AvatarParts;
  private stateMachine: AnimationStateMachine;

  // Controllers
  private userExprController?: FacialExpressionController;
  private partnerExprController?: FacialExpressionController;
  private projectileSystem?: ProjectileHearts3D;

  // Resting Coordinates
  private readonly USER_DEFAULT_REST = new THREE.Vector3(-0.75, 0, 0.2);
  private readonly PARTNER_DEFAULT_REST = new THREE.Vector3(0.75, 0, 0.2);

  private userRestPos = new THREE.Vector3(-0.75, 0, 0.2);
  private partnerRestPos = new THREE.Vector3(0.75, 0, 0.2);

  // Dynamic Anchors
  private currentAnchors: FurnitureAnchorPair;
  private roomObjects: RoomObject[] = [];

  // Internal Tracking
  private currentInteraction: CoupleInteraction = 'idle';
  private walkTime: number = 0;
  private heartFired: boolean = false;

  constructor(
    user: AvatarParts,
    partner: AvatarParts,
    roomObjects: RoomObject[] = []
  ) {
    this.userParts = user;
    this.partnerParts = partner;
    this.roomObjects = roomObjects;
    this.stateMachine = new AnimationStateMachine();

    this.currentAnchors = FurnitureAnchorManager.getInteractionAnchors('idle', roomObjects);
    this.resetToIdle();
  }

  public setFacialControllers(userExpr: FacialExpressionController, partnerExpr: FacialExpressionController) {
    this.userExprController = userExpr;
    this.partnerExprController = partnerExpr;
  }

  public setProjectileSystem(system: ProjectileHearts3D) {
    this.projectileSystem = system;
  }

  public setRoomObjects(objects: RoomObject[]) {
    this.roomObjects = objects;
  }

  public setInteraction(interaction: CoupleInteraction, startTimestamp?: number) {
    this.currentInteraction = interaction;
    this.stateMachine.startInteraction(interaction, startTimestamp);
    this.currentAnchors = FurnitureAnchorManager.getInteractionAnchors(interaction, this.roomObjects);
    this.walkTime = 0;
    this.heartFired = false;

    if (this.userExprController && this.partnerExprController) {
      if (interaction === 'kiss' || interaction === 'forehead_kiss') {
        this.userExprController.setExpression('loving');
        this.partnerExprController.setExpression('blushing');
      } else if (interaction === 'dance' || interaction === 'flying_hearts') {
        this.userExprController.setExpression('excited');
        this.partnerExprController.setExpression('laughing');
      } else if (interaction === 'sleep_beside') {
        this.userExprController.setExpression('loving');
        this.partnerExprController.setExpression('loving');
      }
    }
  }

  public getInteraction(): CoupleInteraction {
    return this.stateMachine.getInteraction();
  }

  public getPhase(): InteractionPhase {
    return this.stateMachine.getPhase();
  }

  public getUserState(): CharacterState {
    return this.stateMachine.getState();
  }

  public getPartnerState(): CharacterState {
    return this.stateMachine.getState();
  }

  public cancel() {
    this.stateMachine.cancel();
    this.currentInteraction = 'idle';
  }

  /**
   * Main per-frame update loop executing state machine and physical kinematics
   */
  public update(delta: number, elapsedTime: number) {
    const { phase, state, phaseProgress } = this.stateMachine.update(delta);

    // Update facial procedural blinking
    if (this.userExprController) this.userExprController.update(delta);
    if (this.partnerExprController) this.partnerExprController.update(delta);

    const uGroup = this.userParts.group;
    const pGroup = this.partnerParts.group;
    const inter = this.currentInteraction;
    const anchors = this.currentAnchors;

    // Reset eye closure unless explicitly in intimate phase
    if (this.userExprController) this.userExprController.setEyesClosed(false);
    if (this.partnerExprController) this.partnerExprController.setEyesClosed(false);

    switch (phase) {
      case 'TURNING': {
        // Step 1: Smoothly orient avatars towards target anchors or partner
        const targetUserAngle = KinematicsEngine.getAngleToTarget(uGroup.position, anchors.userTarget);
        const targetPartnerAngle = KinematicsEngine.getAngleToTarget(pGroup.position, anchors.partnerTarget);

        uGroup.rotation.y = KinematicsEngine.rotateTowardAngle(uGroup.rotation.y, targetUserAngle, 0.18);
        pGroup.rotation.y = KinematicsEngine.rotateTowardAngle(pGroup.rotation.y, targetPartnerAngle, 0.18);

        // Gentle turn weight shift
        KinematicsEngine.applyLivingIdle(this.userParts, elapsedTime, 0);
        KinematicsEngine.applyLivingIdle(this.partnerParts, elapsedTime, 0.5);
        break;
      }

      case 'APPROACHING': {
        // Step 2: Walk naturally towards interaction anchor positions
        this.walkTime += delta;
        const ease = KinematicsEngine.easeInOut(phaseProgress);

        // Root motion translation
        uGroup.position.x = THREE.MathUtils.lerp(this.userRestPos.x, anchors.userTarget.x, ease);
        uGroup.position.z = THREE.MathUtils.lerp(this.userRestPos.z, anchors.userTarget.z, ease);

        pGroup.position.x = THREE.MathUtils.lerp(this.partnerRestPos.x, anchors.partnerTarget.x, ease);
        pGroup.position.z = THREE.MathUtils.lerp(this.partnerRestPos.z, anchors.partnerTarget.z, ease);

        // Natural walking kinematics (leg swinging, arm balancing, hip bobs)
        KinematicsEngine.applyWalkingGait(this.userParts, this.walkTime, 1.0);
        KinematicsEngine.applyWalkingGait(this.partnerParts, this.walkTime, 1.0);

        // Keep eyes on partner during approach
        KinematicsEngine.applyLookAtTarget(this.userParts, pGroup.position);
        KinematicsEngine.applyLookAtTarget(this.partnerParts, uGroup.position);
        break;
      }

      case 'ALIGNING': {
        // Step 3: Decelerate smoothly, align stances, and establish intimate eye contact
        const ease = KinematicsEngine.easeOut(phaseProgress);

        uGroup.position.x = THREE.MathUtils.lerp(uGroup.position.x, anchors.userTarget.x, 0.2);
        uGroup.position.z = THREE.MathUtils.lerp(uGroup.position.z, anchors.userTarget.z, 0.2);

        pGroup.position.x = THREE.MathUtils.lerp(pGroup.position.x, anchors.partnerTarget.x, 0.2);
        pGroup.position.z = THREE.MathUtils.lerp(pGroup.position.z, anchors.partnerTarget.z, 0.2);

        uGroup.rotation.y = KinematicsEngine.rotateTowardAngle(uGroup.rotation.y, anchors.userRotationY, 0.16);
        pGroup.rotation.y = KinematicsEngine.rotateTowardAngle(pGroup.rotation.y, anchors.partnerRotationY, 0.16);

        // Soften limbs into resting alignment
        this.resetLimbsToNeutral(this.userParts, 0.2);
        this.resetLimbsToNeutral(this.partnerParts, 0.2);

        // Look directly at each other's eyes
        KinematicsEngine.applyLookAtTarget(this.userParts, pGroup.position);
        KinematicsEngine.applyLookAtTarget(this.partnerParts, uGroup.position);
        break;
      }

      case 'ACTION': {
        // Step 4: Execute coordinated, physically believable couple interactions
        this.executeInteractionPhase(inter, phaseProgress, elapsedTime);
        break;
      }

      case 'REACTION': {
        // Step 5: Emotional payoff reaction (warm smile, blush, soft gaze, gentle release)
        this.executeReactionPhase(inter, phaseProgress, elapsedTime);
        break;
      }

      case 'RETURNING': {
        // Step 6: Step backward smoothly with walking gait back to rest positions
        this.walkTime += delta;
        const ease = KinematicsEngine.easeInOut(phaseProgress);

        uGroup.position.x = THREE.MathUtils.lerp(anchors.userTarget.x, this.userRestPos.x, ease);
        uGroup.position.z = THREE.MathUtils.lerp(anchors.userTarget.z, this.userRestPos.z, ease);
        uGroup.position.y = THREE.MathUtils.lerp(anchors.elevationY || 0, 0, ease);

        pGroup.position.x = THREE.MathUtils.lerp(anchors.partnerTarget.x, this.partnerRestPos.x, ease);
        pGroup.position.z = THREE.MathUtils.lerp(anchors.partnerTarget.z, this.partnerRestPos.z, ease);
        pGroup.position.y = THREE.MathUtils.lerp(anchors.elevationY || 0, 0, ease);

        uGroup.rotation.y = KinematicsEngine.rotateTowardAngle(uGroup.rotation.y, 0.3, 0.1);
        pGroup.rotation.y = KinematicsEngine.rotateTowardAngle(pGroup.rotation.y, -0.3, 0.1);
        uGroup.rotation.x = THREE.MathUtils.lerp(uGroup.rotation.x, 0, 0.15);
        pGroup.rotation.x = THREE.MathUtils.lerp(pGroup.rotation.x, 0, 0.15);

        KinematicsEngine.applyWalkingGait(this.userParts, this.walkTime, 0.7);
        KinematicsEngine.applyWalkingGait(this.partnerParts, this.walkTime, 0.7);
        break;
      }

      case 'IDLE':
      default: {
        // Living Idle: Gentle breathing, natural micro weight-shifts, posture relaxation
        uGroup.position.x = THREE.MathUtils.lerp(uGroup.position.x, this.userRestPos.x, 0.08);
        pGroup.position.x = THREE.MathUtils.lerp(pGroup.position.x, this.partnerRestPos.x, 0.08);
        uGroup.position.z = THREE.MathUtils.lerp(uGroup.position.z, this.userRestPos.z, 0.08);
        pGroup.position.z = THREE.MathUtils.lerp(pGroup.position.z, this.partnerRestPos.z, 0.08);
        uGroup.position.y = THREE.MathUtils.lerp(uGroup.position.y, 0, 0.08);
        pGroup.position.y = THREE.MathUtils.lerp(pGroup.position.y, 0, 0.08);

        uGroup.rotation.x = THREE.MathUtils.lerp(uGroup.rotation.x, 0, 0.08);
        pGroup.rotation.x = THREE.MathUtils.lerp(pGroup.rotation.x, 0, 0.08);
        uGroup.rotation.y = THREE.MathUtils.lerp(uGroup.rotation.y, 0.3, 0.08);
        pGroup.rotation.y = THREE.MathUtils.lerp(pGroup.rotation.y, -0.3, 0.08);

        KinematicsEngine.applyLivingIdle(this.userParts, elapsedTime, 0);
        KinematicsEngine.applyLivingIdle(this.partnerParts, elapsedTime, 0.65);
        break;
      }
    }
  }

  /**
   * Executes the coordinated interaction movements for all 10 interactions
   */
  private executeInteractionPhase(inter: CoupleInteraction, progress: number, t: number) {
    const uParts = this.userParts;
    const pParts = this.partnerParts;
    const uGroup = uParts.group;
    const pGroup = pParts.group;

    switch (inter) {
      case 'hug': {
        // 13-step Hug execution:
        // Intimate distance, open arms, embrace shoulders/waist, soft rocking sway
        const embraceProgress = Math.sin(progress * Math.PI);

        // Natural close step without clipping
        uGroup.position.x = THREE.MathUtils.lerp(uGroup.position.x, -0.22, 0.1);
        pGroup.position.x = THREE.MathUtils.lerp(pGroup.position.x, 0.22, 0.1);
        uGroup.rotation.y = THREE.MathUtils.lerp(uGroup.rotation.y, Math.PI * 0.44, 0.1);
        pGroup.rotation.y = THREE.MathUtils.lerp(pGroup.rotation.y, -Math.PI * 0.44, 0.1);

        // User wraps arms (left over partner shoulder, right around waist)
        uParts.arms.left.rotation.set(0.65, 0.2, -1.15 * embraceProgress);
        uParts.arms.right.rotation.set(0.75, -0.15, -1.25 * embraceProgress);

        // Partner wraps arms reciprocally
        pParts.arms.left.rotation.set(0.75, 0.15, 1.25 * embraceProgress);
        pParts.arms.right.rotation.set(0.65, -0.2, 1.15 * embraceProgress);

        // Gentle romantic body sway
        const sway = Math.sin(t * 2.8) * 0.04;
        uGroup.rotation.z = sway;
        pGroup.rotation.z = -sway;

        // Heads rest softly against partner
        uParts.head.rotation.z = 0.14;
        pParts.head.rotation.z = -0.14;
        break;
      }

      case 'kiss': {
        // Coordinated kiss: Close distance, opposite head tilts, leaning in, closed eyes
        uGroup.position.x = THREE.MathUtils.lerp(uGroup.position.x, -0.21, 0.12);
        pGroup.position.x = THREE.MathUtils.lerp(pGroup.position.x, 0.21, 0.12);

        uGroup.rotation.y = THREE.MathUtils.lerp(uGroup.rotation.y, Math.PI * 0.48, 0.1);
        pGroup.rotation.y = THREE.MathUtils.lerp(pGroup.rotation.y, -Math.PI * 0.48, 0.1);

        // Gentle head tilts to prevent nose/head clipping
        uParts.head.rotation.z = -0.18;
        pParts.head.rotation.z = 0.18;

        // Tender lean in
        const lean = Math.sin(progress * Math.PI) * 0.08;
        uGroup.rotation.x = lean;
        pGroup.rotation.x = -lean;

        // Hands hold partner's waist and arms softly
        uParts.arms.right.rotation.set(0.55, 0.1, -0.85);
        uParts.arms.left.rotation.set(0.3, 0, -0.3);
        pParts.arms.left.rotation.set(0.55, -0.1, 0.85);
        pParts.arms.right.rotation.set(0.3, 0, 0.3);

        // Close eyes during deep kiss
        if (progress > 0.25 && progress < 0.85) {
          if (this.userExprController) this.userExprController.setEyesClosed(true);
          if (this.partnerExprController) this.partnerExprController.setEyesClosed(true);
        }
        break;
      }

      case 'forehead_kiss': {
        // Initiator places gentle hands, leans in; receiver tilts head back and closes eyes
        uGroup.position.x = THREE.MathUtils.lerp(uGroup.position.x, -0.23, 0.1);
        pGroup.position.x = THREE.MathUtils.lerp(pGroup.position.x, 0.23, 0.1);

        // Receiver tilts head slightly back and rests hands
        pParts.head.rotation.x = -0.16;
        if (progress > 0.3 && progress < 0.85) {
          if (this.partnerExprController) this.partnerExprController.setEyesClosed(true);
        }

        // Initiator leans in and places hands on partner's cheeks/shoulders
        uParts.head.rotation.x = 0.22;
        uParts.arms.left.rotation.set(0.65, 0, -0.7);
        uParts.arms.right.rotation.set(0.65, 0, -0.7);

        pParts.arms.left.rotation.set(0.2, 0, 0.3);
        pParts.arms.right.rotation.set(0.2, 0, 0.3);
        break;
      }

      case 'cuddle': {
        // Cozy cuddling at sofa or bed
        const elev = this.currentAnchors.elevationY || 0.36;
        uGroup.position.y = THREE.MathUtils.lerp(uGroup.position.y, elev, 0.12);
        pGroup.position.y = THREE.MathUtils.lerp(pGroup.position.y, elev, 0.12);

        // Sitting posture (knees bent 90 degrees)
        uParts.legs.left.rotation.x = -Math.PI * 0.45;
        uParts.legs.right.rotation.x = -Math.PI * 0.45;
        pParts.legs.left.rotation.x = -Math.PI * 0.45;
        pParts.legs.right.rotation.x = -Math.PI * 0.45;

        // Lean together warmly
        uGroup.rotation.z = -0.12;
        pGroup.rotation.z = 0.08;

        // Partner puts arm around user's shoulder
        pParts.arms.left.rotation.set(0.25, 0, 1.25);
        // User rests head comfortably on partner's shoulder
        uParts.head.rotation.z = 0.26;
        uParts.arms.right.rotation.set(0.35, 0, -0.5);

        // Breathing cycle
        const breath = Math.sin(t * 2.2) * 0.015;
        uGroup.position.y += breath;
        pGroup.position.y += breath;
        break;
      }

      case 'hold_hands': {
        // Aligned side-by-side holding hands with continuous micro-swing
        uGroup.position.x = THREE.MathUtils.lerp(uGroup.position.x, -0.38, 0.1);
        pGroup.position.x = THREE.MathUtils.lerp(pGroup.position.x, 0.38, 0.1);
        uGroup.rotation.y = THREE.MathUtils.lerp(uGroup.rotation.y, 0.1, 0.1);
        pGroup.rotation.y = THREE.MathUtils.lerp(pGroup.rotation.y, -0.1, 0.1);

        // Hands connect at center
        const handSwing = Math.sin(t * 2.6) * 0.14;
        uParts.arms.right.rotation.set(handSwing, 0, -0.72);
        pParts.arms.left.rotation.set(handSwing, 0, 0.72);

        uParts.arms.left.rotation.set(-handSwing * 0.6, 0, -0.1);
        pParts.arms.right.rotation.set(-handSwing * 0.6, 0, 0.1);

        // Affectionate mutual glances
        uParts.head.rotation.y = 0.28;
        pParts.head.rotation.y = -0.28;
        break;
      }

      case 'dance': {
        // Coordinated couple slow romantic dance
        uGroup.position.x = THREE.MathUtils.lerp(uGroup.position.x, -0.3, 0.1);
        pGroup.position.x = THREE.MathUtils.lerp(pGroup.position.x, 0.3, 0.1);

        // Rhythmic dance steps
        const dancePhase = t * 3.6;
        const step = Math.sin(dancePhase) * 0.16;
        const bounce = Math.abs(Math.sin(dancePhase)) * 0.05;

        uGroup.position.y = bounce;
        pGroup.position.y = bounce;

        uGroup.rotation.z = step * 0.6;
        pGroup.rotation.z = -step * 0.6;

        // Couple dance posture: left hand in right hand, right hand on waist
        uParts.arms.left.rotation.set(0.5 + step, 0, -0.85);
        uParts.arms.right.rotation.set(0.45, 0, -0.75);

        pParts.arms.right.rotation.set(0.5 - step, 0, 0.85);
        pParts.arms.left.rotation.set(0.45, 0, 0.75);

        uParts.legs.left.rotation.x = step * 0.8;
        uParts.legs.right.rotation.x = -step * 0.8;
        pParts.legs.left.rotation.x = -step * 0.8;
        pParts.legs.right.rotation.x = step * 0.8;
        break;
      }

      case 'blow_kiss': {
        // Initiator blows kiss; 3D heart projectile travels to partner
        const blowCycle = Math.sin(progress * Math.PI);
        uParts.arms.right.rotation.x = -1.55 * blowCycle;
        uParts.arms.right.rotation.z = -0.35 * blowCycle;

        // Launch 3D flying heart projectile once at peak
        if (!this.heartFired && progress > 0.4 && this.projectileSystem) {
          const startPos = new THREE.Vector3().copy(uGroup.position).add(new THREE.Vector3(0.12, 1.35, 0.25));
          const targetPos = new THREE.Vector3().copy(pGroup.position).add(new THREE.Vector3(0, 1.3, 0.15));
          this.projectileSystem.launchHeart(startPos, targetPos, 1.2);
          this.heartFired = true;
        }

        // Partner looks lovingly and waves hand in reception
        pParts.arms.right.rotation.set(-0.8 + Math.sin(t * 5) * 0.2, 0, 0.5);
        break;
      }

      case 'flying_hearts': {
        // Dual affectionate gesture
        const wave = Math.sin(t * 4) * 0.35;
        uParts.arms.left.rotation.set(0.4, 0, -1.2 + wave);
        uParts.arms.right.rotation.set(0.4, 0, -1.2 - wave);
        pParts.arms.left.rotation.set(0.4, 0, 1.2 + wave);
        pParts.arms.right.rotation.set(0.4, 0, 1.2 - wave);
        break;
      }

      case 'sit_together': {
        // Sit comfortably at sofa anchor
        const elev = this.currentAnchors.elevationY || 0.36;
        uGroup.position.y = THREE.MathUtils.lerp(uGroup.position.y, elev, 0.12);
        pGroup.position.y = THREE.MathUtils.lerp(pGroup.position.y, elev, 0.12);

        uParts.legs.left.rotation.x = -Math.PI * 0.45;
        uParts.legs.right.rotation.x = -Math.PI * 0.45;
        pParts.legs.left.rotation.x = -Math.PI * 0.45;
        pParts.legs.right.rotation.x = -Math.PI * 0.45;

        uParts.arms.left.rotation.set(0.2, 0, -0.2);
        uParts.arms.right.rotation.set(0.2, 0, -0.2);
        pParts.arms.left.rotation.set(0.2, 0, 0.2);
        pParts.arms.right.rotation.set(0.2, 0, 0.2);
        break;
      }

      case 'sleep_beside': {
        // Sleep on bed mattress: Lie down horizontally, close eyes, sync breathing
        const elev = this.currentAnchors.elevationY || 0.42;
        uGroup.position.y = THREE.MathUtils.lerp(uGroup.position.y, elev, 0.12);
        pGroup.position.y = THREE.MathUtils.lerp(pGroup.position.y, elev, 0.12);

        uGroup.rotation.x = -Math.PI * 0.48;
        pGroup.rotation.x = -Math.PI * 0.48;

        // Heads rest toward each other
        uParts.head.rotation.z = 0.28;
        pParts.head.rotation.z = -0.28;

        // Arms folded or relaxed
        uParts.arms.right.rotation.set(0.3, 0, -0.4);
        pParts.arms.left.rotation.set(0.3, 0, 0.4);

        if (this.userExprController) this.userExprController.setEyesClosed(true);
        if (this.partnerExprController) this.partnerExprController.setEyesClosed(true);

        const sleepBreath = Math.sin(t * 1.6) * 0.012;
        uGroup.position.y += sleepBreath;
        pGroup.position.y += sleepBreath;
        break;
      }

      default:
        break;
    }
  }

  /**
   * Emotional reaction and release phase
   */
  private executeReactionPhase(inter: CoupleInteraction, progress: number, t: number) {
    const ease = KinematicsEngine.easeOut(progress);

    // Gently ease arms back toward resting position
    this.resetLimbsToNeutral(this.userParts, 0.1);
    this.resetLimbsToNeutral(this.partnerParts, 0.1);

    // Sweet lingering smile and eye contact
    KinematicsEngine.applyLookAtTarget(this.userParts, this.partnerParts.group.position);
    KinematicsEngine.applyLookAtTarget(this.partnerParts, this.userParts.group.position);

    if (this.userExprController && this.partnerExprController) {
      if (inter === 'kiss' || inter === 'hug' || inter === 'forehead_kiss') {
        this.userExprController.setExpression('blushing');
        this.partnerExprController.setExpression('loving');
      }
    }
  }

  private resetLimbsToNeutral(parts: AvatarParts, rate: number = 0.12) {
    parts.arms.left.rotation.x = THREE.MathUtils.lerp(parts.arms.left.rotation.x, 0, rate);
    parts.arms.left.rotation.y = THREE.MathUtils.lerp(parts.arms.left.rotation.y, 0, rate);
    parts.arms.left.rotation.z = THREE.MathUtils.lerp(parts.arms.left.rotation.z, -0.06, rate);

    parts.arms.right.rotation.x = THREE.MathUtils.lerp(parts.arms.right.rotation.x, 0, rate);
    parts.arms.right.rotation.y = THREE.MathUtils.lerp(parts.arms.right.rotation.y, 0, rate);
    parts.arms.right.rotation.z = THREE.MathUtils.lerp(parts.arms.right.rotation.z, 0.06, rate);

    parts.legs.left.rotation.x = THREE.MathUtils.lerp(parts.legs.left.rotation.x, 0, rate);
    parts.legs.right.rotation.x = THREE.MathUtils.lerp(parts.legs.right.rotation.x, 0, rate);

    parts.head.rotation.x = THREE.MathUtils.lerp(parts.head.rotation.x, 0, rate);
    parts.head.rotation.y = THREE.MathUtils.lerp(parts.head.rotation.y, 0, rate);
    parts.head.rotation.z = THREE.MathUtils.lerp(parts.head.rotation.z, 0, rate);
  }

  private resetToIdle() {
    this.userParts.group.position.copy(this.USER_DEFAULT_REST);
    this.partnerParts.group.position.copy(this.PARTNER_DEFAULT_REST);
    this.userParts.group.rotation.set(0, 0.3, 0);
    this.partnerParts.group.rotation.set(0, -0.3, 0);
  }
}
