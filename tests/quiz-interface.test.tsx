import { beforeEach, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import QuizInterface from '@/components/QuizInterface';
import { useQuizStore } from '@/store/quiz-store';
import type { Question } from '@/lib/types';

vi.mock('@/store/quiz-store', async importOriginal => {
  const actual = await importOriginal<typeof import('@/store/quiz-store')>();
  return { useQuizStore: Object.assign(() => actual.useQuizStore.getState(), actual.useQuizStore) };
});
vi.mock('@/components/Timer', () => ({ default: () => null }));
vi.mock('@/components/FeedbackModal', () => ({ default: () => null }));

const question: Question = { id: 'q', question: 'Question?', options: { a: 'Alpha', b: 'Beta', c: 'Gamma', d: 'Delta' }, correctAnswer: 'a', explanation: '', topic: 'T', difficulty: 'easy' };
const state = () => useQuizStore.getState();
const render = () => renderToStaticMarkup(<QuizInterface onComplete={() => {}} />);
beforeEach(() => state().resetQuiz());

it('derives submitted status on remount and keeps the final completion action available', () => {
  state().startQuiz([question], { numQuestions: 1, timeLimit: 5, difficulty: 'easy' }, 'proof');
  expect(render()).toContain('Submit Answer');
  state().submitAnswer('b');
  const html = render();
  expect(html).not.toContain('Submit Answer');
  expect(html).toContain('Finish Quiz');
  expect(html.match(/disabled=""/g)).toHaveLength(4);
});

it('presents the next question as unanswered while retaining the previous answer', () => {
  state().startQuiz([question, { ...question, id: 'q2' }], { numQuestions: 2, timeLimit: 5, difficulty: 'easy' }, 'proof');
  state().submitAnswer('a');
  expect(render()).toContain('Next Question');
  state().nextQuestion();
  expect(render()).toContain('Submit Answer');
  expect(state().session?.userAnswers).toEqual(['a', null]);
});
