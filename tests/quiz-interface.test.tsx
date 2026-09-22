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

it('shows editable exam answers without correctness or explanations and supports revisiting', () => {
  state().startQuiz([question, { ...question, id: 'q2' }], { numQuestions: 2, timeLimit: 5, difficulty: 'easy', mode: 'exam' }, 'proof', null, Date.now());
  state().submitAnswer('b');
  const html = render();
  expect(html).toContain('Finish exam');
  expect(html).not.toContain('Submit Answer');
  expect(html).not.toContain('text-green');
  expect(html).not.toContain('Ask AI');
  expect(state().goToQuestion(1)).toBe(true);
  expect(state().goToQuestion(0)).toBe(true);
  state().submitAnswer('a');
  expect(state().session?.userAnswers).toEqual(['a', null]);
  expect(state().goToQuestion(-1)).toBe(false);
  expect(state().goToQuestion(2)).toBe(false);
});

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

it('hides practice questions while paused and restores the submitted question on resume', () => {
  state().startQuiz([question], { numQuestions: 1, timeLimit: 5, difficulty: 'easy' }, 'proof');
  state().submitAnswer('b');
  state().pauseQuiz();
  const paused = render();
  expect(paused).toContain('Practice paused');
  expect(paused).toContain('Resume practice');
  expect(paused).toContain('Attempt expires in');
  expect(paused).not.toContain('Question?');
  state().resumeQuiz();
  expect(render()).toContain('Finish Quiz');
  expect(render()).toContain('Pause practice');
});

it('never offers pause controls in exam mode', () => {
  state().startQuiz([question], { numQuestions: 1, timeLimit: 5, difficulty: 'easy', mode: 'exam' }, 'proof');
  expect(render()).not.toContain('Pause practice');
  expect(render()).not.toContain('Resume practice');
});
