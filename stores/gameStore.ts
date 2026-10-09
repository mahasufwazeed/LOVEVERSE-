import { create } from 'zustand';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { GameType, TicTacToeState, QuizState, WouldYouRatherState, TruthDareState } from '../types';
import type { RealtimeChannel } from '@supabase/supabase-js';

export const QUIZ_QUESTIONS = [
  'What was the exact moment you realized you had feelings for me?',
  'What is our dream romantic vacation destination?',
  'What is your favorite memory of us together?',
  'What little thing do I do that always makes you smile?',
  'Which song will forever remind you of our love?',
  'If we had an entire weekend with no obligations, how would we spend it?',
];

export const WOULD_YOU_RATHER_PROMPTS = [
  { optionA: 'A cozy candlelit dinner at home cooked together', optionB: 'An spontaneous late-night road trip under the stars' },
  { optionA: 'A weekend in a secluded mountain cabin', optionB: 'A luxury beach resort with ocean view balcony' },
  { optionA: 'Holding hands while walking through a quiet park', optionB: 'Slow dancing in the living room to our favorite songs' },
  { optionA: 'Watching the sunrise together with fresh coffee', optionB: 'Watching the sunset on a rooftop wrapped in a blanket' },
];

export const TRUTH_DARE_PROMPTS = {
  truth: [
    'What was the first thing you noticed about me when we first met?',
    'What is your favorite physical feature of mine?',
    'What is one secret dream you have for our future together?',
    'What romantic movie scene reminds you the most of our relationship?',
  ],
  dare: [
    'Send an audio voice note singing a 15-second love song chorus.',
    'Give your partner three genuine, heartfelt compliments right now.',
    'Send a cute selfie making a heart gesture with your hands.',
    'Send a 10-second video blowing a kiss to your screen.',
  ],
  romantic: [
    'Describe the feeling of our very first kiss in 3 words.',
    'Write a short 4-line love poem dedicated to your partner.',
    'Name 3 things in your life that are better because we are together.',
  ],
};

interface GameState {
  currentGameType: GameType;
  tictactoe: TicTacToeState;
  quiz: QuizState;
  wouldYouRather: WouldYouRatherState;
  truthDare: TruthDareState;
  channel: RealtimeChannel | null;
  setGameType: (type: GameType) => void;
  makeTicTacToeMove: (index: number, userId: string, coupleId: string) => void;
  resetTicTacToe: (coupleId: string) => void;
  submitQuizAnswer: (answer: string, userId: string, coupleId: string) => void;
  nextQuizQuestion: (coupleId: string) => void;
  selectWouldYouRather: (choice: 1 | 2, userId: string, coupleId: string) => void;
  nextWouldYouRather: (coupleId: string) => void;
  nextTruthDare: (category: 'truth' | 'dare' | 'romantic', userId: string, coupleId: string) => void;
  subscribeToGames: (coupleId: string, myUserId: string) => void;
  unsubscribeFromGames: () => void;
}

const initialTicTacToe: TicTacToeState = {
  board: Array(9).fill(null),
  turn: 'X',
  playerX: '',
  playerO: '',
  winner: null,
};

function checkTicTacToeWinner(board: (string | null)[]): string | null {
  const winLines = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // cols
    [0, 4, 8], [2, 4, 6],           // diags
  ];

  for (const [a, b, c] of winLines) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a];
    }
  }

  if (board.every((cell) => cell !== null)) {
    return 'draw';
  }

  return null;
}

export const useGameStore = create<GameState>((set, get) => ({
  currentGameType: 'tictactoe',
  tictactoe: initialTicTacToe,
  quiz: { currentQuestionIndex: 0, answers: {}, revealed: false },
  wouldYouRather: { currentPromptIndex: 0, choices: {}, revealed: false },
  truthDare: { category: 'romantic', promptIndex: 0, activeUser: '', completed: false },
  channel: null,

  setGameType: (type) => set({ currentGameType: type }),

  makeTicTacToeMove: (index, userId, coupleId) => {
    const { tictactoe, channel } = get();
    if (tictactoe.board[index] || tictactoe.winner) return;

    const nextBoard = [...tictactoe.board];
    nextBoard[index] = tictactoe.turn;
    const winner = checkTicTacToeWinner(nextBoard);
    const nextTurn = tictactoe.turn === 'X' ? 'O' : 'X';

    const updatedState: TicTacToeState = {
      ...tictactoe,
      board: nextBoard,
      turn: nextTurn,
      winner,
    };

    set({ tictactoe: updatedState });

    if (channel) {
      channel.send({
        type: 'broadcast',
        event: 'game_update',
        payload: { gameType: 'tictactoe', state: updatedState, senderId: userId },
      });
    }

    if (isSupabaseConfigured) {
      supabase.from('events').insert({
        space_id: coupleId,
        sender: userId,
        kind: 'game',
        payload: { tictactoe: updatedState },
      }).then(() => {});
    }
  },

  resetTicTacToe: (coupleId) => {
    const resetState = { ...initialTicTacToe };
    set({ tictactoe: resetState });

    const channel = get().channel;
    if (channel) {
      channel.send({
        type: 'broadcast',
        event: 'game_update',
        payload: { gameType: 'tictactoe', state: resetState },
      });
    }
  },

  submitQuizAnswer: (answer, userId, coupleId) => {
    const { quiz, channel } = get();
    const updatedAnswers = { ...quiz.answers, [userId]: answer };
    const hasBothAnswers = Object.keys(updatedAnswers).length >= 2;

    const updatedQuiz: QuizState = {
      ...quiz,
      answers: updatedAnswers,
      revealed: hasBothAnswers,
    };

    set({ quiz: updatedQuiz });

    if (channel) {
      channel.send({
        type: 'broadcast',
        event: 'game_update',
        payload: { gameType: 'quiz', state: updatedQuiz },
      });
    }
  },

  nextQuizQuestion: (coupleId) => {
    const { quiz, channel } = get();
    const nextIndex = (quiz.currentQuestionIndex + 1) % QUIZ_QUESTIONS.length;
    const updatedQuiz: QuizState = {
      currentQuestionIndex: nextIndex,
      answers: {},
      revealed: false,
    };

    set({ quiz: updatedQuiz });

    if (channel) {
      channel.send({
        type: 'broadcast',
        event: 'game_update',
        payload: { gameType: 'quiz', state: updatedQuiz },
      });
    }
  },

  selectWouldYouRather: (choice, userId, coupleId) => {
    const { wouldYouRather, channel } = get();
    const updatedChoices = { ...wouldYouRather.choices, [userId]: choice };
    const revealed = Object.keys(updatedChoices).length >= 2;

    const updatedWYR: WouldYouRatherState = {
      ...wouldYouRather,
      choices: updatedChoices,
      revealed,
    };

    set({ wouldYouRather: updatedWYR });

    if (channel) {
      channel.send({
        type: 'broadcast',
        event: 'game_update',
        payload: { gameType: 'would_you_rather', state: updatedWYR },
      });
    }
  },

  nextWouldYouRather: (coupleId) => {
    const { wouldYouRather, channel } = get();
    const nextIndex = (wouldYouRather.currentPromptIndex + 1) % WOULD_YOU_RATHER_PROMPTS.length;
    const updatedWYR: WouldYouRatherState = {
      currentPromptIndex: nextIndex,
      choices: {},
      revealed: false,
    };

    set({ wouldYouRather: updatedWYR });

    if (channel) {
      channel.send({
        type: 'broadcast',
        event: 'game_update',
        payload: { gameType: 'would_you_rather', state: updatedWYR },
      });
    }
  },

  nextTruthDare: (category, userId, coupleId) => {
    const prompts = TRUTH_DARE_PROMPTS[category];
    const nextIndex = Math.floor(Math.random() * prompts.length);
    const updated: TruthDareState = {
      category,
      promptIndex: nextIndex,
      activeUser: userId,
      completed: false,
    };

    set({ truthDare: updated });

    const channel = get().channel;
    if (channel) {
      channel.send({
        type: 'broadcast',
        event: 'game_update',
        payload: { gameType: 'truth_dare', state: updated },
      });
    }
  },

  subscribeToGames: (coupleId, myUserId) => {
    if (!isSupabaseConfigured || !coupleId) return;
    get().unsubscribeFromGames();

    const channel = supabase.channel(`couple:${coupleId}:games`);

    channel.on('broadcast', { event: 'game_update' }, (msg) => {
      const { gameType, state } = msg.payload || {};
      if (gameType === 'tictactoe') set({ tictactoe: state });
      if (gameType === 'quiz') set({ quiz: state });
      if (gameType === 'would_you_rather') set({ wouldYouRather: state });
      if (gameType === 'truth_dare') set({ truthDare: state });
    });

    channel.subscribe();
    set({ channel });
  },

  unsubscribeFromGames: () => {
    const channel = get().channel;
    if (channel) {
      supabase.removeChannel(channel);
      set({ channel: null });
    }
  },
}));
