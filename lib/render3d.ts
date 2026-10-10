import { CoupleInteraction, FacialExpression } from '../types';

export interface Render3DAction {
  type: CoupleInteraction;
  title: string;
  expression: FacialExpression;
  description: string;
}

export const REALISTIC_3D_ACTIONS: Render3DAction[] = [
  {
    type: 'hug',
    title: 'Real Hug',
    expression: 'loving',
    description: 'Avatars step close, open arms, embrace, sway, then release naturally.',
  },
  {
    type: 'kiss',
    title: 'Kiss',
    expression: 'blushing',
    description: 'Characters align face-to-face, lean in, pause softly, and return to idle.',
  },
  {
    type: 'cuddle',
    title: 'Cuddle',
    expression: 'loving',
    description: 'Both avatars move into a close relaxed pose with gentle head movement.',
  },
  {
    type: 'hold_hands',
    title: 'Hold Hands',
    expression: 'happy',
    description: 'Hands meet at a safe distance with synced arm rotation and eye contact.',
  },
  {
    type: 'forehead_kiss',
    title: 'Forehead Kiss',
    expression: 'blushing',
    description: 'One avatar leans upward while the partner tilts down for a gentle kiss.',
  },
  {
    type: 'blow_kiss',
    title: 'Blow Kiss',
    expression: 'loving',
    description: 'Hand rises to lips, sends heart particles, and returns with a smile.',
  },
  {
    type: 'dance',
    title: 'Dance',
    expression: 'laughing',
    description: 'Both avatars face each other with mirrored body sway and arm motion.',
  },
  {
    type: 'sit_together',
    title: 'Sit Together',
    expression: 'happy',
    description: 'Characters find the sofa anchor, sit side-by-side, and settle into pose.',
  },
  {
    type: 'sleep_beside',
    title: 'Sleep Beside',
    expression: 'loving',
    description: 'Avatars move to the bed anchor and shift into a calm lying pose.',
  },
  {
    type: 'flying_hearts',
    title: 'Flying Hearts',
    expression: 'excited',
    description: 'Heart particles rise between both characters while the camera focuses in.',
  },
];

export const RENDER3D_ENGINE_FEATURES = [
  'Real-time Supabase sync for couple actions',
  'Editable 3D couple room with templates and furniture',
  'Bitmoji-style modular avatar renderer',
  'Camera presets for isometric, front, top, and couple focus',
  'Unreal Engine Pixel Streaming handoff when configured',
];
