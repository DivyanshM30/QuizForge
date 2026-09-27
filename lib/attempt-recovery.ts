import { useQuizStore } from '@/store/quiz-store';
import { parseQuestion, validateQuizConfig } from './quiz-submission';
import type { QuizSession } from './types';

export const ATTEMPT_STORAGE_KEY = 'quizforge-attempt-v1';
type StorageAccess = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
const record = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0;

/** Browser drafts are untrusted. Grading and proof verification remain server-owned. */
export function parseAttemptDraft(raw: string, ownerId: string) {
  if (raw.length > 4_000_000) throw new Error('Draft too large');
  const draft: unknown = JSON.parse(raw);
  if (!record(draft) || draft.version !== 1 || draft.ownerId !== ownerId || !record(draft.session)) throw new Error('Invalid draft');
  const s = draft.session;
  const config = validateQuizConfig(s.config);
  if (!config.ok || !Array.isArray(s.questions) || s.questions.length !== config.value.numQuestions ||
      !finite(s.startTime) || !finite(s.timeLimit) || s.timeLimit !== config.value.timeLimit * 60 ||
      !finite(s.hardDeadline) || !Number.isInteger(s.currentQuestionIndex) ||
      (s.currentQuestionIndex as number) < 0 || (s.currentQuestionIndex as number) >= s.questions.length ||
      typeof s.quizProof !== 'string' || s.quizProof.length === 0 || s.quizProof.length > 2_100_000 ||
      !Array.isArray(s.userAnswers) || s.userAnswers.length !== s.questions.length ||
      s.userAnswers.some(a => a !== null && !['a', 'b', 'c', 'd'].includes(a)) ||
      !Array.isArray(s.confidences) || s.confidences.length !== s.questions.length ||
      s.confidences.some(c => c !== null && !['sure', 'unsure'].includes(c)) ||
      (s.pausedAt !== undefined && (!finite(s.pausedAt) || config.value.mode === 'exam')) ||
      !['idle', 'saving', 'failed'].includes(String(draft.saveStatus)) ||
      (draft.documentId !== null && (typeof draft.documentId !== 'string' || draft.documentId.length > 200))) throw new Error('Invalid draft');
  const exam = config.value.mode === 'exam';
  const questions = s.questions.map(q => {
    if (!record(q)) throw new Error('Invalid question');
    const parsed = parseQuestion(exam ? { ...q, correctAnswer: 'a', explanation: '' } : q);
    if (!parsed) throw new Error('Invalid question');
    return exam ? { id: parsed.id, question: parsed.question, options: parsed.options, topic: parsed.topic, difficulty: parsed.difficulty } : parsed;
  });
  const session: QuizSession = {
    questions, config: {
      ...config.value,
      // Keep explicitly supplied defaults so a restored retry retains its payload.
      ...(record(s.config) && s.config.mode === 'practice' ? { mode: 'practice' as const } : {}),
      ...(record(s.config) && s.config.cram === false ? { cram: false } : {}),
    }, startTime: s.startTime, timeLimit: s.timeLimit,
    hardDeadline: s.hardDeadline, pausedAt: s.pausedAt as number | undefined,
    currentQuestionIndex: s.currentQuestionIndex as number, quizProof: s.quizProof,
    userAnswers: s.userAnswers, confidences: s.confidences,
  };
  return { session, documentId: draft.documentId as string | null, saveStatus: draft.saveStatus === 'idle' ? 'idle' as const : 'failed' as const };
}

/** One draft per tab, isolated by account. Never persist source documents or results. */
export function connectAttemptRecovery(ownerId: string | null, storage: StorageAccess) {
  const state = useQuizStore.getState();
  if (state.ownerId !== ownerId || ownerId === null) {
    state.resetQuiz();
    useQuizStore.setState({ ownerId, recoveryError: null });
    try {
      const raw = storage.getItem(ATTEMPT_STORAGE_KEY);
      if (ownerId && raw) {
        const restored = parseAttemptDraft(raw, ownerId);
        useQuizStore.setState({ ...restored, saveError: restored.saveStatus === 'failed' ? 'The previous save was interrupted. Retry to retrieve or save your result.' : null });
      } else if (!ownerId) storage.removeItem(ATTEMPT_STORAGE_KEY);
    } catch {
      try { storage.removeItem(ATTEMPT_STORAGE_KEY); } catch { /* Storage may be blocked. */ }
      useQuizStore.setState({ recoveryError: 'This tab could not restore a saved attempt. Keep the page open while taking a quiz.' });
    }
  }
  const persist = () => {
    const current = useQuizStore.getState();
    // An obsolete connection must never write another account's attempt.
    if (current.ownerId !== ownerId) return;
    try {
      if (!ownerId || !current.session) storage.removeItem(ATTEMPT_STORAGE_KEY);
      else storage.setItem(ATTEMPT_STORAGE_KEY, JSON.stringify({ version: 1, ownerId, session: current.session, documentId: current.documentId, saveStatus: current.saveStatus }));
      if (current.recoveryError) useQuizStore.setState({ recoveryError: null });
    } catch {
      // Avoid leaving a stale snapshot that could overwrite more recent answers on reload.
      try { storage.removeItem(ATTEMPT_STORAGE_KEY); } catch { /* Best effort only. */ }
      useQuizStore.setState({ recoveryError: 'Refresh recovery is unavailable in this tab. Keep this page open until your result is saved.' });
    }
  };
  // Effects may reconnect after auth revalidation or a remount. Capture changes
  // made while disconnected instead of waiting for the next answer to be edited.
  const connected = useQuizStore.getState();
  if (connected.session || !connected.recoveryError) persist();
  return useQuizStore.subscribe((current, previous) => {
    if (current.session !== previous.session || current.saveStatus !== previous.saveStatus || current.documentId !== previous.documentId) persist();
  });
}
