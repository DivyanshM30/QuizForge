import { beforeEach, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import UploadPage from '@/app/upload/page';
import { useQuizStore } from '@/store/quiz-store';
import type { Question } from '@/lib/types';

vi.mock('next-auth/react', () => ({ useSession: () => ({ status: 'authenticated' }) }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }) }));
vi.mock('@/store/quiz-store', async importOriginal => {
  const actual = await importOriginal<typeof import('@/store/quiz-store')>();
  // SSR normally reads Zustand's initial snapshot. Read the active snapshot to
  // exercise page rendering after each real store transition without a DOM shim.
  return { useQuizStore: Object.assign(() => actual.useQuizStore.getState(), actual.useQuizStore) };
});
vi.mock('@/components/FileUpload', () => ({ default: () => <div>FILE_PICKER</div> }));
vi.mock('@/components/QuizConfig', () => ({ default: () => <div>CONFIG_FORM</div> }));
vi.mock('@/components/QuizInterface', () => ({ default: () => <div>ACTIVE_QUIZ</div> }));
vi.mock('@/components/ResultsDashboard', () => ({ default: () => <div>SAVED_RESULTS</div> }));
vi.mock('@/components/AppNav', () => ({ default: () => null }));

const questions: Question[] = [{ id: 'q', question: 'Q', options: { a: 'A', b: 'B', c: 'C', d: 'D' }, correctAnswer: 'a', topic: 'T', explanation: '', difficulty: 'easy' }];
const state = () => useQuizStore.getState();
const render = () => renderToStaticMarkup(<UploadPage />);
beforeEach(() => state().resetQuiz());

it.each(['hero', 'dashboard', 'library', 'direct upload'])('keeps %s generation on the active quiz and resets to upload', () => {
  state().setDocumentText('Document');
  expect(render()).toContain('CONFIG_FORM');
  state().startQuiz(questions, { numQuestions: 1, timeLimit: 5, difficulty: 'easy' }, 'proof');
  expect(render()).toContain('ACTIVE_QUIZ');
  state().submitAnswer('a');
  expect(render()).toContain('ACTIVE_QUIZ');
  expect(render()).not.toContain('CONFIG_FORM');
  state().resetQuiz();
  expect(render()).toContain('FILE_PICKER');
});

it.each(['retake', 'cram'])('renders a %s without requiring source text', () => {
  state().startQuiz(questions, { numQuestions: 1, timeLimit: 5, difficulty: 'easy' }, 'proof');
  expect(render()).toContain('ACTIVE_QUIZ');
});

it('replaces the interactive quiz with saving and retry states', () => {
  state().startQuiz(questions, { numQuestions: 1, timeLimit: 5, difficulty: 'easy' }, 'proof');
  useQuizStore.setState({ saveStatus: 'saving' });
  expect(render()).toContain('Saving your answers');
  expect(render()).not.toContain('ACTIVE_QUIZ');
  useQuizStore.setState({ saveStatus: 'failed', saveError: 'Offline' });
  expect(render()).toContain('Retry save');
  expect(render()).toContain('Offline');
  expect(render()).not.toContain('ACTIVE_QUIZ');
});
