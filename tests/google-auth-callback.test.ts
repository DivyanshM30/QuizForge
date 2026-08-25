import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  findUnique: vi.fn(),
  findFirst: vi.fn(),
  update: vi.fn(),
  create: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: mocks.findUnique,
      findFirst: mocks.findFirst,
      update: mocks.update,
      create: mocks.create,
    },
  },
}));

import { authOptions } from '@/lib/auth';

const googleAccount = {
  provider: 'google',
  providerAccountId: 'google-subject',
  type: 'oauth',
} as const;

describe('Google authentication callback', () => {
  beforeEach(() => {
    mocks.findUnique.mockReset();
    mocks.findFirst.mockReset();
    mocks.update.mockReset();
    mocks.create.mockReset();
  });

  it('does not merge a verified Google email into a credentials account', async () => {
    mocks.findUnique.mockResolvedValue(null);
    mocks.findFirst.mockResolvedValue({
      id: 'credentials-user',
      email: 'victim@example.com',
      password: 'bcrypt-hash',
      googleSubject: null,
    });

    const result = await authOptions.callbacks?.signIn?.({
      user: { id: 'google-user', email: 'victim@example.com' },
      account: googleAccount,
      profile: { sub: 'google-subject', email_verified: true } as never,
      credentials: undefined,
      email: undefined,
    });

    expect(result).toBe(false);
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it('uses the stable Google subject for an already linked dual-method account', async () => {
    mocks.findUnique.mockResolvedValue({
      id: 'linked-user',
      email: 'user@example.com',
      password: 'bcrypt-hash',
      googleSubject: 'google-subject',
    });

    const result = await authOptions.callbacks?.signIn?.({
      user: { id: 'google-user', email: 'USER@example.com', name: 'User' },
      account: googleAccount,
      profile: { sub: 'google-subject', email_verified: true } as never,
      credentials: undefined,
      email: undefined,
    });

    expect(result).toBe(true);
    expect(mocks.update).toHaveBeenCalledWith({
      where: { id: 'linked-user' },
      data: { googleSubject: 'google-subject', name: 'User' },
    });
  });

  it('rejects an unverified Google profile', async () => {
    const result = await authOptions.callbacks?.signIn?.({
      user: { id: 'google-user', email: 'user@example.com' },
      account: googleAccount,
      profile: { sub: 'google-subject', email_verified: false } as never,
      credentials: undefined,
      email: undefined,
    });

    expect(result).toBe(false);
    expect(mocks.findUnique).not.toHaveBeenCalled();
  });
});
