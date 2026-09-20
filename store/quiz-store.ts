import { create } from 'zustand';
import { Question, QuizConfig, QuizSession, QuizResult, Confidence } from '@/lib/types';
import { remainingSeconds } from '@/lib/countdown';

interface QuizStore {
  session: QuizSession | null;
  documentText: string | null;
  documentId: string | null;
  isAnalyzing: boolean;
  isGenerating: boolean;
  error: string | null;
  result: QuizResult | null;
  saveStatus: 'idle' | 'saving' | 'failed' | 'saved';
  saveError: string | null;
  saveQuiz: (retry?: boolean) => Promise<void>;

  // Actions
  setDocumentText: (text: string) => void;
  setDocumentId: (id: string | null) => void;
  setAnalyzing: (isAnalyzing: boolean) => void;
  setGenerating: (isGenerating: boolean) => void;
  setError: (error: string | null) => void;
  startQuiz: (
    questions: Question[],
    config: QuizConfig,
    quizProof: string,
    documentId?: string | null
  ) => void;
  submitAnswer: (answer: string, confidence?: Confidence) => boolean;
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
  result: null,
  saveStatus: 'idle',
  saveError: null,

  saveQuiz: async (retry = false) => {
    const { session, saveStatus } = get();
    if (!session || saveStatus === 'saving' || saveStatus === 'saved' ||
        (saveStatus === 'failed' && !retry)) return;
    // The session is immutable while completion is pending, including failed saves.
    set({ saveStatus: 'saving', saveError: null });
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000);
    try {
      const response = await fetch('/api/save-quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questions: session.questions,
          config: session.config,
          userAnswers: session.userAnswers,
          confidences: session.confidences,
          quizProof: session.quizProof,
        }),
        signal: controller.signal,
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.message || 'Failed to save quiz result. Please retry.');
      if (!data?.result?.id) throw new Error('The saved result could not be read. Please retry.');
      if (get().session !== session) return;
      set({ session: null, result: data.result, saveStatus: 'saved', saveError: null });
    } catch (error) {
      if (get().session !== session) return;
      set({
        saveStatus: 'failed',
        saveError: controller.signal.aborted
          ? 'Saving timed out. Your answers are kept here; retry to confirm the save.'
          : error instanceof Error ? error.message : 'Could not save. Please retry.',
      });
    } finally {
      clearTimeout(timeout);
    }
  },

  setDocumentText: (text: string) => set({ documentText: text, session: null, result: null, saveStatus: 'idle', saveError: null }),

  setDocumentId: (id: string | null) => set({ documentId: id }),

  setAnalyzing: (isAnalyzing: boolean) => set({ isAnalyzing }),

  setGenerating: (isGenerating: boolean) => set({ isGenerating }),

  setError: (error: string | null) => set({ error }),

  startQuiz: (questions: Question[], config: QuizConfig, quizProof: string, documentId = null) => {
    const timeLimitSeconds = config.timeLimit * 60;
    const session: QuizSession = {
      questions,
      currentQuestionIndex: 0,
      userAnswers: new Array(questions.length).fill(null),
      confidences: new Array(questions.length).fill(null),
      startTime: Date.now(),
      timeLimit: timeLimitSeconds,
      config,
      quizProof,
    };
    set({ session, documentId, error: null, result: null, saveStatus: 'idle', saveError: null });
  },

  submitAnswer: (answer: string, confidence: Confidence = null) => {
    const { session } = get();
    if (!session || get().saveStatus !== 'idle' || get().getRemainingTime() === 0) return false;

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
    return true;
  },

  nextQuestion: () => {
    const { session } = get();
    if (!session || get().saveStatus !== 'idle' || get().getRemainingTime() === 0) return;

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
      result: null,
      saveStatus: 'idle',
      saveError: null,
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

    return remainingSeconds(session.startTime + session.timeLimit * 1000);
  },
}));
