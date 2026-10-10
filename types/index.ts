export type FacialExpression =
  | 'happy'
  | 'sad'
  | 'blushing'
  | 'excited'
  | 'laughing'
  | 'shy'
  | 'surprised'
  | 'loving';

export type CoupleInteraction =
  | 'hug'
  | 'kiss'
  | 'cuddle'
  | 'hold_hands'
  | 'forehead_kiss'
  | 'flying_hearts'
  | 'blow_kiss'
  | 'dance'
  | 'sit_together'
  | 'sleep_beside'
  | 'idle'
  | 'walk'
  | 'wave';

export type InteractionType = CoupleInteraction;

export type CharacterState =
  | 'IDLE'
  | 'WALKING'
  | 'TURNING'
  | 'APPROACHING_PARTNER'
  | 'ALIGNING'
  | 'INTERACTING'
  | 'REACTING'
  | 'RETURNING_TO_IDLE'
  | 'SITTING'
  | 'LYING_DOWN'
  | 'SLEEPING';

export type InteractionPhase =
  | 'IDLE'
  | 'TURNING'
  | 'APPROACHING'
  | 'ALIGNING'
  | 'ACTION'
  | 'REACTION'
  | 'RETURNING';

export interface AvatarConfig {
  genderPresentation?: 'masculine' | 'feminine' | 'neutral';
  faceShape?: 'round' | 'oval' | 'square' | 'heart';
  skinColor: string;
  hairStyle: 'short' | 'long' | 'wavy' | 'curly' | 'bun' | 'spiky' | 'bob' | 'afro';
  hairColor: string;
  eyeColor: string;
  eyebrowStyle?: 'arched' | 'straight' | 'rounded';
  eyebrowColor?: string;
  noseType?: 'cute' | 'button' | 'straight';
  lipColor?: string;
  bodyType?: 'masculine' | 'feminine' | 'neutral';
  shirtStyle?: 'tshirt' | 'hoodie' | 'sweater' | 'dress';
  shirtColor: string;
  pantsColor: string;
  shoesColor?: string;
  glasses?: 'none' | 'round' | 'square' | 'sunglasses';
  accessory?: 'none' | 'glasses' | 'flower' | 'crown' | 'hat' | 'beanie' | 'earrings';
  expression?: FacialExpression;
}

export interface UserProfile {
  id: string;
  email?: string;
  displayName: string;
  avatarConfig: AvatarConfig;
  avatarUrl?: string;
  anniversaryDate?: string;
  coupleId?: string | null;
  createdAt?: string;
}

export interface Couple {
  id: string;
  inviteCode: string;
  anniversaryDate?: string;
  status: 'active' | 'disconnected';
  createdAt: string;
  partner?: UserProfile | null;
}

export interface MessageReaction {
  id: string;
  messageId: string;
  userId: string;
  emoji: string;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  coupleId: string;
  senderId: string;
  content: string;
  messageType: 'text' | 'hug_card' | 'kiss_card' | 'media' | 'system' | 'avatar_sticker';
  mediaUrl?: string;
  stickerData?: {
    interaction: CoupleInteraction;
    caption: string;
    senderConfig?: AvatarConfig;
    partnerConfig?: AvatarConfig;
  };
  createdAt: string;
  reactions?: MessageReaction[];
  pending?: boolean;
}

export interface AvatarInteraction {
  id: number;
  coupleId: string;
  senderId: string;
  interactionType: CoupleInteraction;
  createdAt: string;
}

export interface Vector3D {
  x: number;
  y: number;
  z: number;
}

export type AvatarAnimationState = CoupleInteraction;

export interface AvatarPresenceState {
  userId: string;
  position: Vector3D;
  targetPosition?: Vector3D;
  rotation: number;
  animation: AvatarAnimationState;
  expression: FacialExpression;
  updatedAt: number;
}

export type GameType = 'tictactoe' | 'quiz' | 'would_you_rather' | 'truth_dare';

export interface TicTacToeState {
  board: (string | null)[];
  turn: 'X' | 'O';
  playerX: string;
  playerO: string;
  winner: string | null;
}

export interface QuizState {
  currentQuestionIndex: number;
  answers: { [userId: string]: string };
  revealed: boolean;
}

export interface WouldYouRatherState {
  currentPromptIndex: number;
  choices: { [userId: string]: 1 | 2 };
  revealed: boolean;
}

export interface TruthDareState {
  category: 'truth' | 'dare' | 'romantic';
  promptIndex: number;
  activeUser: string;
  completed: boolean;
}

export interface GameSession {
  id: string;
  coupleId: string;
  gameType: GameType;
  currentTurn?: string;
  status: 'active' | 'completed' | 'abandoned';
  gameState: any;
  winnerId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WatchState {
  coupleId: string;
  videoUrl: string;
  isPlaying: boolean;
  currentTimeSeconds: number;
  controllerId?: string;
  updatedAt: string;
}

export interface SharedMemory {
  id: string;
  coupleId: string;
  creatorId: string;
  title: string;
  description?: string;
  memoryDate: string;
  imageUrl?: string;
  createdAt: string;
}

export interface AvatarStickerDef {
  id: string;
  title: string;
  category: string;
  description: string;
  interaction: CoupleInteraction;
  expression: FacialExpression;
  badge: string;
  bgGradient: [string, string];
}
