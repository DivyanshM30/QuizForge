import { create } from 'zustand';
import { Question, QuizConfig, QuizSession, Confidence } from '@/lib/types';

interface QuizStore {
  session: QuizSession | null;
  documentText: string | null;
  documentId: string | null;
  isAnalyzing: boolean;
  isGenerating: boolean;
  error: string | null;

  // Actions
  setDocumentText: (text: string) => void;
  setDocumentId: (id: string | null) => void;
  setAnalyzing: (isAnalyzing: boolean) => void;
  setGenerating: (isGenerating: boolean) => void;
  setError: (error: string | null) => void;
  startQuiz: (questions: Question[], config: QuizConfig) => void;
  submitAnswer: (answer: string, confidence?: Confidence) => void;
  nextQuestion: () => void;
  endQuiz: () => void;
  resetQuiz: () => void;
  getCurrentQuestion: () => Question | null;
  getRemainingTime: () => number;
}

export const useQuizStore = create<QuizStore>((set, get) => ({
  session: null,
  documentText: null,
  documentId: null,
  isAnalyzing: false,
  isGenerating: false,
  error: null,

  setDocumentText: (text: string) => set({ documentText: text }),

  setDocumentId: (id: string | null) => set({ documentId: id }),

  setAnalyzing: (isAnalyzing: boolean) => set({ isAnalyzing }),

  setGenerating: (isGenerating: boolean) => set({ isGenerating }),

  setError: (error: string | null) => set({ error }),

  startQuiz: (questions: Question[], config: QuizConfig) => {
    const timeLimitSeconds = config.timeLimit * 60;
    const session: QuizSession = {
      questions,
      currentQuestionIndex: 0,
      userAnswers: new Array(questions.length).fill(null),
      confidences: new Array(questions.length).fill(null),
      startTime: Date.now(),
      timeLimit: timeLimitSeconds,
      config,
    };
    set({ session, error: null });
  },

  submitAnswer: (answer: string, confidence: Confidence = null) => {
    const { session } = get();
    if (!session) return;

    const newAnswers = [...session.userAnswers];
    newAnswers[session.currentQuestionIndex] = answer;
    const newConfidences = [...session.confidences];
    newConfidences[session.currentQuestionIndex] = confidence;

    set({
      session: {
        ...session,
        userAnswers: newAnswers,
        confidences: newConfidences,
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
      documentId: null,
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
}));
