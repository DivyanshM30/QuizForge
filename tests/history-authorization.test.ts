import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  session: undefined as undefined | { user?: { id?: string } },
  findMany: vi.fn(),
  findFirst: vi.fn(),
}));

vi.mock('next-auth/next', () => ({
  getServerSession: vi.fn(async () => mocks.session),
}));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/prisma', () => ({
  prisma: { quizResult: { findMany: mocks.findMany, findFirst: mocks.findFirst } },
}));

import { GET } from '@/app/api/history/route';

describe('history authorization', () => {
  beforeEach(() => {
    mocks.session = undefined;
    mocks.findMany.mockReset();
    mocks.findFirst.mockReset();
  });

  it('fails closed when a session has no stable user id', async () => {
    mocks.session = { user: {} };

    const response = await GET(new Request('http://localhost/api/history'));

    expect(response.status).toBe(401);
    expect(mocks.findMany).not.toHaveBeenCalled();
  });

  it('scopes legitimate history reads to the authenticated user id', async () => {
    mocks.session = { user: { id: 'user-123' } };
    mocks.findMany.mockResolvedValue([]);

    const response = await GET(new Request('http://localhost/api/history'));

    expect(response.status).toBe(200);
    expect(mocks.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId: 'user-123' },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: 21,
    }));
    expect(mocks.findMany.mock.calls[0][0].select.questions).toBeUndefined();
  });

  it('bounds list responses and validates cursor ownership', async () => {
    mocks.session = { user: { id: 'u' } };
    const rows = Array.from({ length: 21 }, (_, i) => ({ id: `q${i}`, createdAt: new Date(), config: '{}', weakTopics: '[]' }));
    mocks.findMany.mockResolvedValue(rows);
    const response = await GET(new Request('http://localhost/api/history'));
    const data = await response.json();
    expect(data.items).toHaveLength(20);
    expect(data.nextCursor).toBe('q19');
    mocks.findFirst.mockResolvedValue(null);
    expect((await GET(new Request('http://localhost/api/history?cursor=someone-elses-quiz'))).status).toBe(400);
    expect(mocks.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'someone-elses-quiz', userId: 'u' } }));
    expect(mocks.findMany).toHaveBeenCalledOnce();
  });

  it('aggregates all dashboard batches while returning only recent summaries', async () => {
    mocks.session = { user: { id: 'u' } };
    const rows = Array.from({ length: 125 }, (_, i) => ({
      id: `q${i}`, createdAt: new Date(2_000_000 - i), config: '{}', weakTopics: '[]',
      accuracy: 80, score: 4, totalQuestions: 5, timeTaken: 60,
      topicPerformance: JSON.stringify([{ topic: 'Math', correct: 4, total: 5 }]),
      questions: JSON.stringify([{ topic: 'Math', correctAnswer: 'a' }]),
      userAnswers: '["b"]', confidences: '["sure"]',
    }));
    mocks.findMany.mockResolvedValueOnce(rows.slice(0, 100)).mockResolvedValueOnce(rows.slice(100));
    const response = await GET(new Request('http://localhost/api/history?view=dashboard'));
    const data = await response.json();
    expect(data.items).toHaveLength(6);
    expect(data.items[0].questions).toBeUndefined();
    expect(data.analytics).toMatchObject({ totalQuizzes: 125, totalQuestions: 625, totalCorrect: 500, avgScore: 80, avgTime: 60, streak: 125, confidentlyWrong: 125, confidenceRated: 125 });
    expect(data.analytics.performanceData).toHaveLength(10);
    expect(data.analytics.topicAggregated[0]).toMatchObject({ fullTopic: 'Math', total: 625, percentage: 80 });
    expect(mocks.findMany.mock.calls.every(([query]) => query.where.userId === 'u' && query.take === 100)).toBe(true);
    expect(mocks.findMany.mock.calls[1][0].where.OR).toEqual([{ createdAt: { lt: rows[99].createdAt } }, { createdAt: rows[99].createdAt, id: { lt: 'q99' } }]);
  });
});
