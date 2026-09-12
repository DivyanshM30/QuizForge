import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  session: { user: { id: 'user-123' } } as { user?: { id?: string } } | undefined,
  quizCreate: vi.fn(),
  reviewPreference: vi.fn(),
  reviewCount: vi.fn(),
  reviewUpsert: vi.fn(),
  documentFindFirst: vi.fn(),
}));

vi.mock('next-auth/next', () => ({
  getServerSession: vi.fn(async () => mocks.session),
}));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/prisma', () => ({
  prisma: {
    quizResult: { create: mocks.quizCreate },
    document: { findFirst: mocks.documentFindFirst },
    user: { findUnique: mocks.reviewPreference },
    reviewItem: {
      count: mocks.reviewCount,
      upsert: mocks.reviewUpsert,
    },
  },
}));

import { POST } from '@/app/api/save-quiz/route';
import { createQuizProof } from '@/lib/quiz-proof';

const questions = Array.from({ length: 5 }, (_, index) => ({
  id: `q${index + 1}`,
  question: `Question ${index + 1}?`,
  options: { a: 'Alpha', b: 'Beta', c: 'Gamma', d: 'Delta' },
  correctAnswer: 'a' as const,
  explanation: 'Alpha is correct.',
  topic: index < 3 ? 'Topic A' : 'Topic B',
  difficulty: 'medium' as const,
}));

function submission(overrides: Record<string, unknown> = {}) {
  const config = { numQuestions: 999, timeLimit: 15, difficulty: 'medium' as const };
  return {
    score: 999,
    totalQuestions: 999,
    accuracy: 999,
    topicPerformance: [{ topic: 'Forged', correct: 999, total: 1, percentage: 999 }],
    weakTopics: [],
    revisionSuggestions: ['Forged suggestion'],
    questions,
    userAnswers: ['a', 'b', null, 'a', 'd'],
    confidences: ['sure', 'unsure', null, 'sure', 'unsure'],
    timeTaken: 120,
    timeLimit: 900,
    config,
    documentId: 'document-123',
    quizProof: createQuizProof('user-123', questions, config, 'document-123'),
    ...overrides,
  };
}

function request(body: unknown) {
  return new Request('http://localhost/api/save-quiz', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('save quiz integrity', () => {
  beforeEach(() => {
    process.env.NEXTAUTH_SECRET = 'test-quiz-proof-secret';
    mocks.session = { user: { id: 'user-123' } };
    mocks.quizCreate.mockReset().mockImplementation(async ({ data }) => ({
      id: 'result-123',
      createdAt: new Date('2026-08-30T00:00:00.000Z'),
      ...data,
    }));
    mocks.reviewPreference.mockReset().mockResolvedValue({ reviewEnabled: false });
    mocks.reviewCount.mockReset();
    mocks.reviewUpsert.mockReset();
    mocks.documentFindFirst.mockReset().mockResolvedValue({ id: 'document-123' });
  });

  it('rejects unauthenticated submissions before validation or persistence', async () => {
    mocks.session = undefined;

    const response = await POST(request(submission()));

    expect(response.status).toBe(401);
    expect(mocks.quizCreate).not.toHaveBeenCalled();
  });

  it('recomputes all derived metrics instead of trusting forged client values', async () => {
    const response = await POST(request(submission()));

    expect(response.status).toBe(201);
    expect(mocks.quizCreate).toHaveBeenCalledOnce();

    const data = mocks.quizCreate.mock.calls[0][0].data;
    expect(data).toMatchObject({
      userId: 'user-123',
      documentId: 'document-123',
      score: 2,
      totalQuestions: 5,
      accuracy: 40,
      timeLimit: 900,
    });
    expect(data.timeTaken).toBeGreaterThanOrEqual(0);
    expect(data.timeTaken).toBeLessThanOrEqual(5);
    expect(JSON.parse(data.config)).toEqual({
      numQuestions: 5,
      timeLimit: 15,
      difficulty: 'medium',
    });
    expect(JSON.parse(data.topicPerformance)).toEqual([
      { topic: 'Topic A', correct: 1, total: 3, percentage: 33 },
      { topic: 'Topic B', correct: 1, total: 2, percentage: 50 },
    ]);
    expect(JSON.parse(data.weakTopics)).toEqual(['Topic A', 'Topic B']);
    expect(JSON.parse(data.revisionSuggestions)).not.toContain('Forged suggestion');
  });

  it('rejects answer arrays that do not match the submitted questions', async () => {
    const response = await POST(request(submission({ userAnswers: ['a', 'b', 'invalid'] })));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      message: 'Quiz answers do not match the submitted questions',
    });
    expect(mocks.quizCreate).not.toHaveBeenCalled();
  });

  it('rejects a changed answer key even when the submitted metrics are plausible', async () => {
    const changedQuestions = questions.map((question, index) =>
      index === 0 ? { ...question, correctAnswer: 'b' as const } : question
    );
    const response = await POST(request(submission({ questions: changedQuestions })));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ message: 'Quiz verification failed' });
    expect(mocks.quizCreate).not.toHaveBeenCalled();
  });

  it('rejects a proof issued for another user', async () => {
    const config = { numQuestions: 5, timeLimit: 15, difficulty: 'medium' as const };
    const response = await POST(
      request(submission({ quizProof: createQuizProof('other-user', questions, config, null) }))
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ message: 'Quiz verification failed' });
    expect(mocks.quizCreate).not.toHaveBeenCalled();
  });

  it('rejects invalid confidence values before review side effects', async () => {
    const response = await POST(
      request(submission({ confidences: ['sure', 'certain', null, 'sure', 'unsure'] }))
    );

    expect(response.status).toBe(400);
    expect(mocks.quizCreate).not.toHaveBeenCalled();
    expect(mocks.reviewPreference).not.toHaveBeenCalled();
    expect(mocks.reviewUpsert).not.toHaveBeenCalled();
  });

  it('preserves the authenticated legitimate save flow', async () => {
    const config = { numQuestions: 5, timeLimit: 15, difficulty: 'medium' as const };
    const response = await POST(
      request(submission({
        score: undefined,
        totalQuestions: undefined,
        accuracy: undefined,
        topicPerformance: undefined,
        weakTopics: undefined,
        revisionSuggestions: undefined,
        documentId: 'ignored-client-document',
        quizProof: createQuizProof('user-123', questions, config, null),
      }))
    );

    expect(response.status).toBe(201);
    expect(mocks.quizCreate).toHaveBeenCalledOnce();
    expect(mocks.quizCreate.mock.calls[0][0].data.documentId).toBeNull();
  });

  it('binds the saved document to the server-issued proof', async () => {
    const response = await POST(
      request(submission({ documentId: 'different-owned-document' }))
    );

    expect(response.status).toBe(201);
    expect(mocks.quizCreate.mock.calls[0][0].data.documentId).toBe('document-123');
  });

  it('still saves when the signed source document was deleted mid-quiz', async () => {
    mocks.documentFindFirst.mockResolvedValueOnce(null);

    const response = await POST(request(submission()));

    expect(response.status).toBe(201);
    expect(mocks.quizCreate.mock.calls[0][0].data.documentId).toBeNull();
  });

  it('retries without the document if it is deleted during persistence', async () => {
    mocks.quizCreate
      .mockRejectedValueOnce({ code: 'P2003' })
      .mockImplementationOnce(async ({ data }) => ({ id: data.id, ...data }));

    const response = await POST(request(submission()));

    expect(response.status).toBe(201);
    expect(mocks.quizCreate).toHaveBeenCalledTimes(2);
    expect(mocks.quizCreate.mock.calls[1][0].data.documentId).toBeNull();
  });

  it('rejects replay of an already-consumed quiz proof', async () => {
    const body = submission();
    const first = await POST(request(body));
    mocks.quizCreate.mockRejectedValueOnce({ code: 'P2002' });
    const replay = await POST(request(body));

    expect(first.status).toBe(201);
    expect(replay.status).toBe(409);
    await expect(replay.json()).resolves.toEqual({
      message: 'Quiz result has already been saved',
    });
  });
});
