import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { ATTEMPT_STORAGE_KEY, connectAttemptRecovery, parseAttemptDraft } from '@/lib/attempt-recovery';
import { useQuizStore } from '@/store/quiz-store';
import type { Question } from '@/lib/types';

const questions: Question[] = Array.from({ length: 5 }, (_, i) => ({ id: `q${i}`, question: 'Which?', options: { a: 'A', b: 'B', c: 'C', d: 'D' }, correctAnswer: 'a', explanation: 'Explanation', topic: 'T', difficulty: 'easy' }));
const config = { numQuestions: 5, timeLimit: 5, difficulty: 'easy' as const };
const state = () => useQuizStore.getState();
let stop = () => {};
const values = new Map<string, string>();
const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); }, removeItem: (key: string) => { values.delete(key); } };
function reload(user = 'user') {
  stop();
  state().resetQuiz();
  useQuizStore.setState({ ownerId: null, recoveryError: null });
  stop = connectAttemptRecovery(user, storage);
}
beforeEach(() => {
  values.clear();
  state().resetQuiz();
  useQuizStore.setState({ ownerId: null, recoveryError: null });
  vi.useFakeTimers();
  vi.setSystemTime(100_000);
  stop = connectAttemptRecovery('user', storage);
});
afterEach(() => { stop(); vi.useRealTimers(); vi.unstubAllGlobals(); });

it('restores submitted answers, confidence and question position without source text or results', () => {
  state().setDocumentText('Private source document');
  state().startQuiz(questions, config, 'proof', 'doc', Date.now());
  state().submitAnswer('b', 'sure');
  state().nextQuestion();
  const original = state().session;
  expect(values.get(ATTEMPT_STORAGE_KEY)).not.toContain('Private source document');
  vi.setSystemTime(130_000);
  reload();
  expect(state().session).toEqual(original);
  expect(state().getRemainingTime()).toBe(270);
  expect(state().documentId).toBe('doc');
  expect(state().documentText).toBeNull();
});

it('preserves a practice pause through refresh and resumes without resetting the attempt limit', () => {
  state().startQuiz(questions, config, 'proof', null, Date.now());
  vi.setSystemTime(160_000);
  state().pauseQuiz();
  const limit = state().session!.hardDeadline;
  expect(state().submitAnswer('a')).toBe(false);
  state().nextQuestion();
  expect(state().session!.currentQuestionIndex).toBe(0);
  vi.setSystemTime(220_000);
  reload();
  expect(state().getRemainingTime()).toBe(240);
  state().resumeQuiz();
  expect(state().getRemainingTime()).toBe(240);
  expect(state().session!.hardDeadline).toBe(limit);
  vi.setSystemTime(limit!);
  expect(state().getRemainingTime()).toBe(0);
  expect(state().submitAnswer('a')).toBe(false);
});

it('never pauses or extends an exam on refresh and strips any stored answer key', () => {
  state().startQuiz(questions, { ...config, mode: 'exam' }, 'exam1.proof', null, Date.now());
  state().pauseQuiz();
  expect(state().session!.pausedAt).toBeUndefined();
  vi.setSystemTime(160_000);
  reload();
  expect(state().getRemainingTime()).toBe(240);
  expect(state().session!.questions[0]).not.toHaveProperty('correctAnswer');
  vi.setSystemTime(400_000);
  reload();
  expect(state().getRemainingTime()).toBe(0);
});

it('restores an interrupted save frozen for an identical retry and clears the draft after success', async () => {
  state().startQuiz(questions, config, 'proof');
  state().submitAnswer('b');
  useQuizStore.setState({ saveStatus: 'saving' });
  reload();
  expect(state().saveStatus).toBe('failed');
  expect(state().submitAnswer('a')).toBe(false);
  const fetcher = vi.fn().mockResolvedValue(Response.json({ result: { id: 'saved' } }));
  vi.stubGlobal('fetch', fetcher);
  await state().saveQuiz(true);
  expect(JSON.parse(fetcher.mock.calls[0][1].body).userAnswers).toEqual(['b', null, null, null, null]);
  expect(values.has(ATTEMPT_STORAGE_KEY)).toBe(false);
});

it.each(['other-user', null])('clears recovery and memory when changing account to %s', user => {
  state().startQuiz(questions, config, 'proof');
  stop();
  stop = connectAttemptRecovery(user, storage);
  expect(state().session).toBeNull();
  expect(values.has(ATTEMPT_STORAGE_KEY)).toBe(false);
});

it('clears the draft on New Quiz and tolerates unavailable storage without losing active answers', () => {
  state().startQuiz(questions, config, 'proof');
  state().resetQuiz();
  expect(values.has(ATTEMPT_STORAGE_KEY)).toBe(false);
  stop();
  stop = connectAttemptRecovery('user', { ...storage, setItem: () => { throw new Error('Quota'); } });
  state().startQuiz(questions, config, 'proof');
  state().submitAnswer('a');
  expect(state().session!.userAnswers[0]).toBe('a');
  expect(state().recoveryError).toContain('unavailable');
});

it('discards malformed snapshots instead of crashing or restoring partial state', () => {
  values.set(ATTEMPT_STORAGE_KEY, '{bad');
  reload();
  expect(state().session).toBeNull();
  expect(state().recoveryError).toContain('could not restore');
  state().startQuiz(questions, config, 'proof');
  const draft = JSON.parse(values.get(ATTEMPT_STORAGE_KEY)!);
  draft.session.currentQuestionIndex = 99;
  expect(() => parseAttemptDraft(JSON.stringify(draft), 'user')).toThrow();
  draft.session.currentQuestionIndex = 0;
  draft.session.userAnswers = [];
  expect(() => parseAttemptDraft(JSON.stringify(draft), 'user')).toThrow();
});
