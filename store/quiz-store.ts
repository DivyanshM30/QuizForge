import { create } from 'zustand';
import { Question, QuizConfig, QuizSession } from '@/lib/types';

interface QuizStore {
  session: QuizSession | null;
  documentText: string | null;
  isAnalyzing: boolean;
  isGenerating: boolean;
  error: string | null;

  // Actions
  setDocumentText: (text: string) => void;
  setAnalyzing: (isAnalyzing: boolean) => void;
  setGenerating: (isGenerating: boolean) => void;
  setError: (error: string | null) => void;
  startQuiz: (questions: Question[], config: QuizConfig) => void;
  submitAnswer: (answer: string) => void;
  nextQuestion: () => void;
  endQuiz: () => void;
  resetQuiz: () => void;
  getCurrentQuestion: () => Question | null;
  getRemainingTime: () => number;
  updateTimer: () => void;
}

export const useQuizStore = create<QuizStore>((set, get) => ({
  session: null,
  documentText: null,
  isAnalyzing: false,
  isGenerating: false,
  error: null,

  setDocumentText: (text: string) => set({ documentText: text }),

  setAnalyzing: (isAnalyzing: boolean) => set({ isAnalyzing }),

  setGenerating: (isGenerating: boolean) => set({ isGenerating }),

  setError: (error: string | null) => set({ error }),

  startQuiz: (questions: Question[], config: QuizConfig) => {
    const timeLimitSeconds = config.timeLimit * 60;
    const session: QuizSession = {
      questions,
      currentQuestionIndex: 0,
      userAnswers: new Array(questions.length).fill(null),
      startTime: Date.now(),
      timeLimit: timeLimitSeconds,
      config,
    };
    set({ session, error: null });
  },

  submitAnswer: (answer: string) => {
    const { session } = get();
    if (!session) return;

    const newAnswers = [...session.userAnswers];
    newAnswers[session.currentQuestionIndex] = answer;

    set({
      session: {
        ...session,
        userAnswers: newAnswers,
      },
    });
  },

  nextQuestion: () => {
    const { session } = get();
    if (!session) return;

    if (session.currentQuestionIndex < session.questions.length - 1) {
      set({
        session: {
          ...session,
          currentQuestionIndex: session.currentQuestionIndex + 1,
        },
      });
    }
  },

  endQuiz: () => {
    set({ session: null });
  },

  resetQuiz: () => {
    set({
      session: null,
      documentText: null,
      isAnalyzing: false,
      isGenerating: false,
      error: null,
    });
  },

  getCurrentQuestion: () => {
    const { session } = get();
    if (!session) return null;
    return session.questions[session.currentQuestionIndex] || null;
  },

  getRemainingTime: () => {
    const { session } = get();
    if (!session) return 0;

    const elapsed = (Date.now() - session.startTime) / 1000;
    const remaining = session.timeLimit - elapsed;
    return Math.max(0, Math.floor(remaining));
  },

  updateTimer: () => {
    // This is called periodically to update the timer
    // The actual time calculation is done in getRemainingTime
    const { session } = get();
    if (session) {
      const remaining = get().getRemainingTime();
      if (remaining <= 0) {
        get().endQuiz();
      }
    }
  },
}));
