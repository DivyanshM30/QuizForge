import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { watchAttemptDeadline } from '@/lib/attempt-deadline';
import { useQuizStore } from '@/store/quiz-store';
import type { Question } from '@/lib/types';

const questions: Question[] = [{ id: 'q', question: 'Q?', options: { a: 'A', b: 'B', c: 'C', d: 'D' }, correctAnswer: 'a', explanation: '', topic: 'T', difficulty: 'easy' }];
const config = { numQuestions: 1, timeLimit: 5, difficulty: 'easy' as const };
const state = () => useQuizStore.getState();
let stop = () => {};
let fetcher: ReturnType<typeof vi.fn>;
beforeEach(() => {
  vi.useFakeTimers(); vi.setSystemTime(100_000);
  state().resetQuiz(); useQuizStore.setState({ ownerId: 'u' });
  fetcher = vi.fn().mockResolvedValue(Response.json({ result: { id: 'saved' } }));
  vi.stubGlobal('fetch', fetcher);
});
afterEach(() => { stop(); vi.unstubAllGlobals(); vi.useRealTimers(); });

it.each(['practice', 'exam'] as const)('submits %s once without any quiz page or visible timer mounted', async mode => {
  stop = watchAttemptDeadline('u');
  state().startQuiz(questions, { ...config, mode }, 'proof');
  state().submitAnswer('b');
  await vi.advanceTimersByTimeAsync(300_000);
  expect(fetcher).toHaveBeenCalledOnce();
  expect(JSON.parse(fetcher.mock.calls[0][1].body).userAnswers).toEqual(['b']);
  expect(state().result?.id).toBe('saved');
  await vi.advanceTimersByTimeAsync(5000);
  expect(fetcher).toHaveBeenCalledOnce();
});

it('rearms when practice pauses/resumes and enforces the hard expiry while paused', async () => {
  stop = watchAttemptDeadline('u');
  state().startQuiz(questions, config, 'proof');
  await vi.advanceTimersByTimeAsync(60_000);
  state().pauseQuiz();
  await vi.advanceTimersByTimeAsync(300_000);
  expect(fetcher).not.toHaveBeenCalled();
  state().resumeQuiz();
  await vi.advanceTimersByTimeAsync(239_999);
  expect(fetcher).not.toHaveBeenCalled();
  state().pauseQuiz();
  const remaining = state().session!.hardDeadline! - Date.now();
  await vi.advanceTimersByTimeAsync(remaining);
  expect(fetcher).toHaveBeenCalledOnce();
});

it('catches up on focus and does not duplicate a simultaneous manual completion', async () => {
  const events = new EventTarget();
  stop = watchAttemptDeadline('u', [events]);
  state().startQuiz(questions, config, 'proof');
  vi.setSystemTime(400_001);
  events.dispatchEvent(new Event('focus'));
  await state().saveQuiz();
  events.dispatchEvent(new Event('visibilitychange'));
  await vi.advanceTimersByTimeAsync(1000);
  expect(fetcher).toHaveBeenCalledOnce();
});

it('restores overdue attempts on any route but leaves failed saves for explicit retry', async () => {
  state().startQuiz(questions, config, 'proof', null, 0);
  vi.setSystemTime(400_000);
  fetcher.mockRejectedValueOnce(new Error('Offline'));
  stop = watchAttemptDeadline('u');
  await vi.advanceTimersByTimeAsync(0);
  expect(state().saveStatus).toBe('failed');
  expect(state().session).not.toBeNull();
  await vi.advanceTimersByTimeAsync(5000);
  expect(fetcher).toHaveBeenCalledOnce();
  await state().saveQuiz(true);
  expect(fetcher).toHaveBeenCalledTimes(2);
  expect(state().result?.id).toBe('saved');
});

it('cancels stale deadlines after a reset or replacement attempt', async () => {
  stop = watchAttemptDeadline('u');
  state().startQuiz(questions, config, 'old');
  await vi.advanceTimersByTimeAsync(200_000);
  state().startQuiz(questions, config, 'new');
  await vi.advanceTimersByTimeAsync(100_000);
  expect(fetcher).not.toHaveBeenCalled();
  state().resetQuiz();
  await vi.advanceTimersByTimeAsync(300_000);
  expect(fetcher).not.toHaveBeenCalled();
});

it('does not submit another account and removes wake listeners on cleanup', async () => {
  const events = new EventTarget();
  stop = watchAttemptDeadline('u', [events]);
  state().startQuiz(questions, config, 'proof');
  useQuizStore.setState({ ownerId: 'other' });
  await vi.advanceTimersByTimeAsync(300_000);
  events.dispatchEvent(new Event('pageshow'));
  expect(fetcher).not.toHaveBeenCalled();
  useQuizStore.setState({ ownerId: 'u' });
  stop();
  events.dispatchEvent(new Event('focus'));
  await vi.advanceTimersByTimeAsync(1000);
  expect(fetcher).not.toHaveBeenCalled();
});
