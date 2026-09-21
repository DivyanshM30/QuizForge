import { beforeEach, expect, it } from 'vitest';
import { issueQuiz } from '@/lib/quiz-issuance';
import { openExam } from '@/lib/exam-token';
import { validateQuizConfig } from '@/lib/quiz-submission';
import { verifyQuizProof } from '@/lib/quiz-proof';

const questions = Array.from({ length: 5 }, (_, i) => ({ id: `${i}`, question: 'Which?', options: { a: 'A', b: 'B', c: 'C', d: 'D' }, correctAnswer: 'b', explanation: 'Secret explanation', topic: 'T', difficulty: 'easy' }));
const config = { numQuestions: 5, timeLimit: 5, difficulty: 'easy', mode: 'exam' };
beforeEach(() => { process.env.NEXTAUTH_SECRET = 'exam-test-secret'; });

it('issues only public questions and binds the encrypted key to the authenticated user', () => {
  const issued = issueQuiz('u', questions, config, null);
  if (!issued.ok) throw new Error(issued.error);
  expect(JSON.stringify(issued.value)).not.toContain('correctAnswer');
  expect(JSON.stringify(issued.value)).not.toContain('Secret explanation');
  const content = openExam(issued.value.quizProof, 'u');
  expect(content?.questions).toEqual(questions);
  expect(openExam(issued.value.quizProof, 'other')).toBeNull();
  const parts = issued.value.quizProof.split('.');
  parts[3] = (parts[3][0] === 'A' ? 'B' : 'A') + parts[3].slice(1);
  expect(openExam(parts.join('.'), 'u')).toBeNull();
  expect(openExam('exam1.bad', 'u')).toBeNull();
  if (!content) throw new Error('No content');
  const claims = verifyQuizProof(content.quizProof, 'u', content.questions, content.config);
  expect(claims).not.toBeNull();
  expect(claims!.expiresAt - claims!.issuedAt).toBe(330_000);
  expect(verifyQuizProof(content.quizProof, 'u', content.questions, { ...content.config, mode: 'practice' })).toBeNull();
});

it('rejects unknown modes and exam/cram combinations', () => {
  expect(validateQuizConfig({ ...config, mode: 'invalid' }).ok).toBe(false);
  expect(validateQuizConfig({ ...config, cram: true }).ok).toBe(false);
});
