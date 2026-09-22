import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { ATTEMPT_STORAGE_KEY, connectAttemptRecovery, parseAttemptDraft } from '@/lib/attempt-recovery';
import { watchAttemptDeadline } from '@/lib/attempt-deadline';
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

it('cannot resume an expired pause or extend its hard deadline with repeated pauses', () => {
  state().startQuiz(questions, config, 'proof');
  const deadline = state().session!.hardDeadline!;
  vi.setSystemTime(160_000);
  state().pauseQuiz();
  vi.setSystemTime(220_000);
  state().pauseQuiz();
  expect(state().session!.pausedAt).toBe(160_000);
  state().resumeQuiz();
  expect(state().getRemainingTime()).toBe(240);
  vi.setSystemTime(280_000);
  state().pauseQuiz();
  vi.setSystemTime(deadline);
  reload();
  const expired = state().session;
  state().resumeQuiz();
  expect(state().session).toBe(expired);
  expect(state().getRemainingTime()).toBe(0);
  expect(state().session!.hardDeadline).toBe(deadline);
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

it.each(['practice', 'exam'] as const)('restores a failed %s save with the same payload and no automatic retry', async mode => {
  const fetcher = vi.fn().mockRejectedValueOnce(new Error('Offline'))
    .mockResolvedValueOnce(Response.json({ result: { id: 'saved' } }));
  vi.stubGlobal('fetch', fetcher);
  state().startQuiz(questions, { ...config, mode, cram: false }, 'proof', 'doc');
  state().submitAnswer('b', 'unsure');
  await state().saveQuiz();
  reload();
  expect(state().saveStatus).toBe('failed');
  const frozen = state().session;
  state().pauseQuiz();
  state().resumeQuiz();
  state().nextQuestion();
  expect(state().goToQuestion(1)).toBe(false);
  expect(state().submitAnswer('a')).toBe(false);
  expect(state().session).toBe(frozen);
  await state().saveQuiz();
  expect(fetcher).toHaveBeenCalledOnce();
  await state().saveQuiz(true);
  expect(JSON.parse(fetcher.mock.calls[1][1].body)).toEqual(JSON.parse(fetcher.mock.calls[0][1].body));
  expect(values.has(ATTEMPT_STORAGE_KEY)).toBe(false);
});

it('persists the latest state when reconnecting after an unsubscribed interval', () => {
  state().startQuiz(questions, config, 'proof');
  stop();
  state().submitAnswer('c', 'sure');
  stop = connectAttemptRecovery('user', storage);
  reload();
  expect(state().session!.userAnswers[0]).toBe('c');
  expect(state().session!.confidences[0]).toBe('sure');
});

it('does not resurrect an attempt reset while recovery was disconnected', () => {
  state().startQuiz(questions, config, 'proof');
  stop();
  state().resetQuiz();
  stop = connectAttemptRecovery('user', storage);
  reload();
  expect(state().session).toBeNull();
  expect(values.has(ATTEMPT_STORAGE_KEY)).toBe(false);
});

it.each(['success', 'failure'])('ignores an old account save %s after switching accounts', async outcome => {
  let resolve!: (response: Response) => void;
  let reject!: (error: Error) => void;
  vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>((r, j) => { resolve = r; reject = j; })));
  state().startQuiz(questions, config, 'old-proof');
  const pending = state().saveQuiz();
  stop();
  stop = connectAttemptRecovery('other', storage);
  state().startQuiz(questions, config, 'new-proof');
  if (outcome === 'success') resolve(Response.json({ result: { id: 'old-result' } }));
  else reject(new Error('old failure'));
  await pending;
  expect(state().session!.quizProof).toBe('new-proof');
  expect(state().result).toBeNull();
  expect(state().saveStatus).toBe('idle');
  expect(JSON.parse(values.get(ATTEMPT_STORAGE_KEY)!)).toMatchObject({ ownerId: 'other', session: { quizProof: 'new-proof' } });
});

it('does not let a stale recovery subscription relabel another account draft', () => {
  state().startQuiz(questions, config, 'old-proof');
  const oldStop = stop;
  stop = connectAttemptRecovery('other', storage);
  const writes = vi.spyOn(storage, 'setItem');
  try {
    state().startQuiz(questions, config, 'new-proof');
    expect(writes).toHaveBeenCalled();
    for (const [, raw] of writes.mock.calls) {
      expect(JSON.parse(raw).ownerId).toBe('other');
    }
    oldStop();
    reload('other');
    expect(state().session!.quizProof).toBe('new-proof');
    expect(state().ownerId).toBe('other');
  } finally { oldStop(); }
});

it.each(['practice', 'exam', 'paused practice'] as const)('submits an overdue restored %s once and restores a failed submission for retry', async mode => {
  const fetcher = vi.fn().mockRejectedValueOnce(new Error('Offline'))
    .mockResolvedValueOnce(Response.json({ result: { id: 'saved' } }));
  vi.stubGlobal('fetch', fetcher);
  state().startQuiz(questions, { ...config, mode: mode === 'exam' ? 'exam' : 'practice' }, 'proof');
  state().submitAnswer('d', 'sure');
  if (mode === 'paused practice') state().pauseQuiz();
  const expires = mode === 'paused practice' ? state().session!.hardDeadline! : 400_000;
  vi.setSystemTime(expires + 1);
  reload();
  let stopDeadline = watchAttemptDeadline('user');
  try {
    await vi.advanceTimersByTimeAsync(0);
    expect(fetcher).toHaveBeenCalledOnce();
    expect(state().saveStatus).toBe('failed');
    stopDeadline();
    reload();
    stopDeadline = watchAttemptDeadline('user');
    await vi.advanceTimersByTimeAsync(5000);
    expect(fetcher).toHaveBeenCalledOnce();
    expect(state().submitAnswer('a')).toBe(false);
    await state().saveQuiz(true);
    expect(JSON.parse(fetcher.mock.calls[1][1].body)).toEqual(JSON.parse(fetcher.mock.calls[0][1].body));
    expect(state().result?.id).toBe('saved');
    expect(values.has(ATTEMPT_STORAGE_KEY)).toBe(false);
  } finally { stopDeadline(); }
});
