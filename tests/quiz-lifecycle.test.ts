import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useQuizStore } from '@/store/quiz-store';
import type { Question } from '@/lib/types';

const questions: Question[] = [{ id: 'q1', question: 'One?', options: { a: '1', b: '2', c: '3', d: '4' }, correctAnswer: 'a', explanation: 'One', topic: 'Numbers', difficulty: 'easy' }];
const config = { numQuestions: 1, timeLimit: 5, difficulty: 'easy' as const };
const state = () => useQuizStore.getState();
const start = (proof = 'attempt-a') => state().startQuiz(questions, config, proof);

describe('quiz completion lifecycle', () => {
  beforeEach(() => state().resetQuiz());
  afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

  it('accepts an answer in the final millisecond without expiring early', () => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000);
    start();
    vi.setSystemTime(1_000 + config.timeLimit * 60_000 - 1);
    expect(state().getRemainingTime()).toBe(1);
    expect(state().submitAnswer('a', 'sure')).toBe(true);
    expect(state().session?.userAnswers).toEqual(['a']);
  });

  it.each([0, 60_000])('rejects late input when a timer callback is delayed by %i ms', async delay => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000);
    const fetcher = vi.fn().mockResolvedValue(Response.json({ result: { id: 'saved' } }));
    vi.stubGlobal('fetch', fetcher);
    state().startQuiz([...questions, { ...questions[0], id: 'q2' }], { ...config, numQuestions: 2 }, 'attempt');
    state().submitAnswer('b', 'unsure');
    state().nextQuestion();
    vi.setSystemTime(1_000 + config.timeLimit * 60_000 + delay);
    expect(state().getRemainingTime()).toBe(0);
    expect(state().submitAnswer('a', 'sure')).toBe(false);
    expect(state().session?.userAnswers).toEqual(['b', null]);
    expect(state().session?.confidences).toEqual(['unsure', null]);
    await Promise.all([state().saveQuiz(), state().saveQuiz()]);
    expect(fetcher).toHaveBeenCalledOnce();
    expect(JSON.parse(fetcher.mock.calls[0][1].body)).toMatchObject({
      userAnswers: ['b', null], confidences: ['unsure', null],
    });
  });

  it('prevents advancing questions after the deadline', () => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000);
    state().startQuiz([...questions, { ...questions[0], id: 'q2' }], { ...config, numQuestions: 2 }, 'attempt');
    state().submitAnswer('a');
    vi.setSystemTime(1_000 + config.timeLimit * 60_000);
    state().nextQuestion();
    expect(state().session?.currentQuestionIndex).toBe(0);
  });

  it('freezes answers and makes one request when completion fires twice', async () => {
    let resolve!: (response: Response) => void;
    const fetcher = vi.fn(() => new Promise<Response>(r => { resolve = r; }));
    vi.stubGlobal('fetch', fetcher);
    start();
    state().submitAnswer('b');
    const first = state().saveQuiz();
    await state().saveQuiz();
    state().submitAnswer('a');
    state().nextQuestion();
    expect(state().session?.userAnswers).toEqual(['b']);
    expect(fetcher).toHaveBeenCalledOnce();
    resolve(Response.json({ result: { id: 'server-id', score: 0, timeTaken: 12 } }));
    await first;
    expect(state().session).toBeNull();
    expect(state().result).toMatchObject({ id: 'server-id', timeTaken: 12 });
    expect(state().saveStatus).toBe('saved');
  });

  it('retains an identical submission for explicit retry after failure', async () => {
    const fetcher = vi.fn().mockRejectedValueOnce(new Error('Offline')).mockResolvedValueOnce(Response.json({ result: { id: 'saved' } }));
    vi.stubGlobal('fetch', fetcher);
    start();
    state().submitAnswer('a');
    await state().saveQuiz();
    expect(state().saveStatus).toBe('failed');
    expect(state().session?.userAnswers).toEqual(['a']);
    await state().saveQuiz();
    expect(fetcher).toHaveBeenCalledOnce();
    await state().saveQuiz(true);
    expect(fetcher.mock.calls[0][1].body).toBe(fetcher.mock.calls[1][1].body);
    expect(state().saveStatus).toBe('saved');
  });

  it.each(['success', 'failure'])('ignores stale %s after another attempt starts', async outcome => {
    let resolve!: (response: Response) => void;
    let reject!: (error: Error) => void;
    vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>((r, j) => { resolve = r; reject = j; })));
    start();
    const pending = state().saveQuiz();
    start('attempt-b');
    if (outcome === 'success') resolve(Response.json({ result: { id: 'old-result' } }));
    else reject(new Error('old failure'));
    await pending;
    expect(state().session?.quizProof).toBe('attempt-b');
    expect(state().saveStatus).toBe('idle');
    expect(state().result).toBeNull();
  });

  it('times out a stalled save and keeps answers retryable', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('fetch', vi.fn((_url, init) => new Promise((_resolve, reject) => {
      init.signal.addEventListener('abort', () => reject(new Error('Aborted')));
    })));
    start();
    const pending = state().saveQuiz();
    await vi.advanceTimersByTimeAsync(30_000);
    await pending;
    expect(state().saveStatus).toBe('failed');
    expect(state().saveError).toContain('timed out');
    expect(state().session).not.toBeNull();
  });

  it('keeps a non-JSON server failure retryable with a readable message', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('<html>Unavailable</html>', { status: 503 })));
    start();
    await state().saveQuiz();
    expect(state().saveStatus).toBe('failed');
    expect(state().saveError).toBe('Failed to save quiz result. Please retry.');
    expect(state().session).not.toBeNull();
  });
});
