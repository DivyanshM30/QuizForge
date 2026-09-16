import { beforeEach, expect, it } from 'vitest';
import { issueQuiz } from '@/lib/quiz-issuance';
import { validateQuizSubmission } from '@/lib/quiz-submission';
import { verifyQuizProof } from '@/lib/quiz-proof';

const question = { id: 'q', question: 'Which?', options: { a: 'A', b: 'B', c: 'C', d: 'D' }, correctAnswer: 'a', explanation: '', topic: 'T'.repeat(200), difficulty: 'easy' };
const questions = Array.from({ length: 5 }, (_, i) => ({ ...question, id: `q${i}` }));
const config = { numQuestions: 5, timeLimit: 5, difficulty: 'easy' };
beforeEach(() => { process.env.NEXTAUTH_SECRET = 'test-secret'; });

it('canonicalizes issued questions and round-trips them through submission and proof validation', () => {
  const issued = issueQuiz('u', questions.map(q => ({ extra: 'discard', ...q })), config, null);
  expect(issued.ok).toBe(true);
  if (!issued.ok) throw new Error(issued.error);
  const submission = validateQuizSubmission({ ...issued.value, userAnswers: Array(5).fill(null) });
  expect(submission.ok).toBe(true);
  if (!submission.ok) throw new Error(submission.error);
  expect(verifyQuizProof(submission.value.quizProof, 'u', submission.value.questions, submission.value.config)).not.toBeNull();
});

it('rejects an oversized topic and legacy short quizzes before signing', () => {
  expect(issueQuiz('u', [{ ...question, topic: 'T'.repeat(201) }, ...questions.slice(1)], config, null).ok).toBe(false);
  expect(issueQuiz('u', questions.slice(0, 2), config, null).ok).toBe(false);
});
