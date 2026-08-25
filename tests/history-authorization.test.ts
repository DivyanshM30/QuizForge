import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  session: undefined as undefined | { user?: { id?: string } },
  findMany: vi.fn(),
}));

vi.mock('next-auth/next', () => ({
  getServerSession: vi.fn(async () => mocks.session),
}));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/prisma', () => ({
  prisma: { quizResult: { findMany: mocks.findMany } },
}));

import { GET } from '@/app/api/history/route';

describe('history authorization', () => {
  beforeEach(() => {
    mocks.session = undefined;
    mocks.findMany.mockReset();
  });

  it('fails closed when a session has no stable user id', async () => {
    mocks.session = { user: {} };

    const response = await GET();

    expect(response.status).toBe(401);
    expect(mocks.findMany).not.toHaveBeenCalled();
  });

  it('scopes legitimate history reads to the authenticated user id', async () => {
    mocks.session = { user: { id: 'user-123' } };
    mocks.findMany.mockResolvedValue([]);

    const response = await GET();

    expect(response.status).toBe(200);
    expect(mocks.findMany).toHaveBeenCalledWith({
      where: { userId: 'user-123' },
      orderBy: { createdAt: 'desc' },
    });
  });
});
