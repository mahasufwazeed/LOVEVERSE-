import * as THREE from 'three';
import { CharacterState, InteractionPhase, CoupleInteraction } from '../../types';

export interface InteractionPhaseTimeline {
  turningDuration: number;
  approachDuration: number;
  alignDuration: number;
  interactionDuration: number;
  reactionDuration: number;
  returnDuration: number;
  totalDuration: number;
}

export const DEFAULT_TIMELINES: Record<CoupleInteraction, InteractionPhaseTimeline> = {
  hug: {
    turningDuration: 0.4,
    approachDuration: 1.1,
    alignDuration: 0.35,
    interactionDuration: 2.3,
    reactionDuration: 0.75,
    returnDuration: 0.9,
    totalDuration: 5.8,
  },
  kiss: {
    turningDuration: 0.35,
    approachDuration: 0.95,
    alignDuration: 0.4,
    interactionDuration: 2.2,
    reactionDuration: 0.8,
    returnDuration: 0.9,
    totalDuration: 5.6,
  },
  forehead_kiss: {
    turningDuration: 0.4,
    approachDuration: 1.0,
    alignDuration: 0.4,
    interactionDuration: 2.1,
    reactionDuration: 0.8,
    returnDuration: 0.9,
    totalDuration: 5.6,
  },
  cuddle: {
    turningDuration: 0.4,
    approachDuration: 1.2,
    alignDuration: 0.4,
    interactionDuration: 3.5,
    reactionDuration: 0.8,
    returnDuration: 1.0,
    totalDuration: 7.3,
  },
  hold_hands: {
    turningDuration: 0.35,
    approachDuration: 0.9,
    alignDuration: 0.35,
    interactionDuration: 3.2,
    reactionDuration: 0.6,
    returnDuration: 0.8,
    totalDuration: 6.2,
  },
  dance: {
    turningDuration: 0.35,
    approachDuration: 0.9,
    alignDuration: 0.45,
    interactionDuration: 3.8,
    reactionDuration: 0.7,
    returnDuration: 0.9,
    totalDuration: 7.1,
  },
  blow_kiss: {
    turningDuration: 0.3,
    approachDuration: 0.2, // Stands in place, slight step forward
    alignDuration: 0.3,
    interactionDuration: 2.4,
    reactionDuration: 1.0,
    returnDuration: 0.6,
    totalDuration: 4.8,
  },
  flying_hearts: {
    turningDuration: 0.3,
    approachDuration: 0.2,
    alignDuration: 0.3,
    interactionDuration: 2.4,
    reactionDuration: 0.8,
    returnDuration: 0.6,
    totalDuration: 4.6,
  },
  sit_together: {
    turningDuration: 0.4,
    approachDuration: 1.3,
    alignDuration: 0.5,
    interactionDuration: 3.8,
    reactionDuration: 0.7,
    returnDuration: 1.0,
    totalDuration: 7.7,
  },
  sleep_beside: {
    turningDuration: 0.4,
    approachDuration: 1.4,
    alignDuration: 0.6,
    interactionDuration: 4.2,
    reactionDuration: 0.8,
    returnDuration: 1.0,
    totalDuration: 8.4,
  },
  walk: {
    turningDuration: 0.3,
    approachDuration: 2.5,
    alignDuration: 0.2,
    interactionDuration: 0.1,
    reactionDuration: 0.1,
    returnDuration: 0.2,
    totalDuration: 3.4,
  },
  wave: {
    turningDuration: 0.3,
    approachDuration: 0.1,
    alignDuration: 0.2,
    interactionDuration: 2.0,
    reactionDuration: 0.6,
    returnDuration: 0.4,
    totalDuration: 3.6,
  },
  idle: {
    turningDuration: 0,
    approachDuration: 0,
    alignDuration: 0,
    interactionDuration: 0,
    reactionDuration: 0,
    returnDuration: 0,
    totalDuration: 0,
  },
};

export class AnimationStateMachine {
  private currentState: CharacterState = 'IDLE';
  private currentPhase: InteractionPhase = 'IDLE';
  private interaction: CoupleInteraction = 'idle';
  private timeline: InteractionPhaseTimeline = DEFAULT_TIMELINES.idle;
  private phaseTimer: number = 0;
  private totalElapsed: number = 0;
  private isCompleted: boolean = false;

  public startInteraction(interaction: CoupleInteraction, startTimestamp?: number) {
    this.interaction = interaction;
    this.timeline = DEFAULT_TIMELINES[interaction] || DEFAULT_TIMELINES.hug;
    this.totalElapsed = 0;
    this.phaseTimer = 0;
    this.isCompleted = false;

    if (interaction === 'idle') {
      this.currentState = 'IDLE';
      this.currentPhase = 'IDLE';
    } else {
      this.currentPhase = 'TURNING';
      this.currentState = 'TURNING';
    }
  }

  /**
   * Deterministically updates state machine based on delta time or network synchronized time
   */
  public update(delta: number): {
    phase: InteractionPhase;
    state: CharacterState;
    phaseProgress: number; // 0.0 to 1.0 within current phase
    totalProgress: number; // 0.0 to 1.0 across full interaction
    isDone: boolean;
  } {
    if (this.interaction === 'idle' || this.isCompleted) {
      return {
        phase: 'IDLE',
        state: 'IDLE',
        phaseProgress: 1.0,
        totalProgress: 1.0,
        isDone: true,
      };
    }

    this.totalElapsed += delta;
    const t = this.totalElapsed;
    const tl = this.timeline;

    const tTurnEnd = tl.turningDuration;
    const tApproachEnd = tTurnEnd + tl.approachDuration;
    const tAlignEnd = tApproachEnd + tl.alignDuration;
    const tActionEnd = tAlignEnd + tl.interactionDuration;
    const tReactionEnd = tActionEnd + tl.reactionDuration;
    const tReturnEnd = tReactionEnd + tl.returnDuration;

    let phase: InteractionPhase;
    let state: CharacterState;
    let phaseProgress: number;

    if (t < tTurnEnd) {
      phase = 'TURNING';
      state = 'TURNING';
      phaseProgress = tl.turningDuration > 0 ? t / tl.turningDuration : 1.0;
    } else if (t < tApproachEnd) {
      phase = 'APPROACHING';
      state = 'APPROACHING_PARTNER';
      const dur = tl.approachDuration;
      phaseProgress = dur > 0 ? (t - tTurnEnd) / dur : 1.0;
    } else if (t < tAlignEnd) {
      phase = 'ALIGNING';
      state = 'ALIGNING';
      const dur = tl.alignDuration;
      phaseProgress = dur > 0 ? (t - tApproachEnd) / dur : 1.0;
    } else if (t < tActionEnd) {
      phase = 'ACTION';
      if (this.interaction === 'sit_together') {
        state = 'SITTING';
      } else if (this.interaction === 'sleep_beside') {
        state = 'SLEEPING';
      } else {
        state = 'INTERACTING';
      }
      const dur = tl.interactionDuration;
      phaseProgress = dur > 0 ? (t - tAlignEnd) / dur : 1.0;
    } else if (t < tReactionEnd) {
      phase = 'REACTION';
      state = 'REACTING';
      const dur = tl.reactionDuration;
      phaseProgress = dur > 0 ? (t - tActionEnd) / dur : 1.0;
    } else if (t < tReturnEnd) {
      phase = 'RETURNING';
      state = 'RETURNING_TO_IDLE';
      const dur = tl.returnDuration;
      phaseProgress = dur > 0 ? (t - tReactionEnd) / dur : 1.0;
    } else {
      phase = 'IDLE';
      state = 'IDLE';
      phaseProgress = 1.0;
      this.isCompleted = true;
    }

    this.currentPhase = phase;
    this.currentState = state;

    const totalProgress = THREE.MathUtils.clamp(t / tl.totalDuration, 0, 1);

    return {
      phase,
      state,
      phaseProgress: THREE.MathUtils.clamp(phaseProgress, 0, 1),
      totalProgress,
      isDone: this.isCompleted,
    };
  }

  public getPhase(): InteractionPhase {
    return this.currentPhase;
  }

  public getState(): CharacterState {
    return this.currentState;
  }

  public getInteraction(): CoupleInteraction {
    return this.interaction;
  }

  public cancel() {
    this.interaction = 'idle';
    this.currentPhase = 'IDLE';
    this.currentState = 'IDLE';
    this.isCompleted = true;
  }
}
