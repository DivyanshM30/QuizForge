import { beforeEach, describe, expect, it } from 'vitest';
import { createQuizProof, verifyQuizProof } from '@/lib/quiz-proof';
import type { Question, QuizConfig } from '@/lib/types';

const questions: Question[] = [
  {
    id: 'q1',
    question: 'Which option is correct?',
    options: { a: 'Alpha', b: 'Beta', c: 'Gamma', d: 'Delta' },
    correctAnswer: 'a',
    explanation: 'Alpha is correct.',
    topic: 'Examples',
    difficulty: 'easy',
  },
  {
    id: 'q2',
    question: 'Which value comes second?',
    options: { a: 'One', b: 'Two', c: 'Three', d: 'Four' },
    correctAnswer: 'b',
    explanation: 'Two comes second.',
    topic: 'Examples',
    difficulty: 'easy',
  },
];
const config: QuizConfig = { numQuestions: 2, timeLimit: 15, difficulty: 'easy' };
const issuedAt = 1_000_000;

describe('quiz proof', () => {
  beforeEach(() => {
    process.env.NEXTAUTH_SECRET = 'test-quiz-proof-secret';
  });

  it('accepts the server-issued question set for the same user', () => {
    const proof = createQuizProof('user-123', questions, config, 'document-123', issuedAt);

    expect(verifyQuizProof(proof, 'user-123', questions, config, issuedAt + 1)).toMatchObject({
      documentId: 'document-123',
      issuedAt,
    });
  });

  it('rejects reordering or answer-key substitution after issuance', () => {
    const proof = createQuizProof('user-123', questions, config, null, issuedAt);
    const reordered = [...questions].reverse();
    const duplicateOptions: Question[] = [{
      ...questions[0],
      options: { ...questions[0].options, b: questions[0].options.a },
      correctAnswer: 'b',
    }, questions[1]];

    expect(verifyQuizProof(proof, 'user-123', reordered, config, issuedAt + 1)).toBeNull();
    expect(verifyQuizProof(proof, 'user-123', duplicateOptions, config, issuedAt + 1)).toBeNull();
  });

  it('rejects changed question content, another user, and expired proofs', () => {
    const proof = createQuizProof('user-123', questions, config, null, issuedAt);
    const changed = [{ ...questions[0], correctAnswer: 'd' as const }, questions[1]];

    expect(verifyQuizProof(proof, 'user-123', changed, config, issuedAt + 1)).toBeNull();
    expect(verifyQuizProof(proof, 'user-456', questions, config, issuedAt + 1)).toBeNull();
    expect(verifyQuizProof(proof, 'user-123', questions, config, issuedAt + 1_800_001)).toBeNull();
  });
});
