import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createHash } from 'node:crypto';
import { NextRequest } from 'next/server';

const state = vi.hoisted(() => ({
  password: 'old-hash', authenticated: true,
  record: null as null | { id: string; userId: string; tokenHash: string; expiresAt: Date },
  hash: vi.fn(), compare: vi.fn(), update: vi.fn(), updateMany: vi.fn(), deleteMany: vi.fn(),
  findToken: vi.fn(), transaction: vi.fn(),
}));
vi.mock('bcryptjs', () => ({ default: { hash: state.hash, compare: state.compare } }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('next-auth/next', () => ({ getServerSession: async () => state.authenticated ? { user: { id: 'u1' } } : null }));
vi.mock('@/lib/rate-limit', () => ({ checkRateLimit: () => ({ success: true }) }));
vi.mock('@/lib/prisma', () => ({ prisma: {
  user: { findUnique: async () => ({ id: 'u1', password: state.password }), update: state.update, updateMany: state.updateMany },
  passwordResetToken: { findUnique: state.findToken, deleteMany: state.deleteMany },
  $transaction: state.transaction,
} }));
import { POST as reset } from '@/app/api/auth/reset-password/route';
import { POST as change } from '@/app/api/account/password/route';

const request = (body: object) => new NextRequest('http://localhost/api/password', { method: 'POST', body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } });
const resetRequest = () => request({ token: 'mailbox-token', password: 'new-password' });
const changeRequest = () => request({ currentPassword: 'old-password', newPassword: 'new-password' });
function deferred() { let resolve!: () => void; const promise = new Promise<void>(r => { resolve = r; }); return { promise, resolve }; }

describe('password-write recovery boundaries (mock database)', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    state.password = 'old-hash'; state.authenticated = true;
    state.record = { id: 'reset1', userId: 'u1', tokenHash: createHash('sha256').update('mailbox-token').digest('hex'), expiresAt: new Date(Date.now() + 60_000) };
    state.findToken.mockImplementation(async () => state.record && { ...state.record });
    state.hash.mockResolvedValue('new-hash'); state.compare.mockResolvedValue(true);
    state.update.mockImplementation(async ({ data }) => { state.password = data.password; });
    state.updateMany.mockImplementation(async ({ where, data }) => {
      if (state.password !== where.password || where.id !== 'u1') return { count: 0 };
      state.password = data.password; return { count: 1 };
    });
    state.deleteMany.mockImplementation(async ({ where }) => {
      if (!state.record) return { count: 0 };
      if (where.id && (where.id !== state.record.id || where.tokenHash !== state.record.tokenHash || state.record.expiresAt <= where.expiresAt.gt)) return { count: 0 };
      state.record = null; return { count: 1 };
    });
    // Model commit/rollback and serialization on the shared user row.
    // This is not a live PostgreSQL lock/deadlock test.
    let tail = Promise.resolve();
    state.transaction.mockImplementation((run) => {
      const task = tail.then(async () => {
        const snapshot = { password: state.password, record: state.record };
        try { return await run({ user: { update: state.update, updateMany: state.updateMany }, passwordResetToken: { deleteMany: state.deleteMany } }); }
        catch (error) { Object.assign(state, snapshot); throw error; }
      });
      tail = task.then(() => undefined, () => undefined);
      return task;
    });
  });

  it('changes a verified password and invalidates outstanding reset links', async () => {
    expect((await change(changeRequest())).status).toBe(200);
    expect(state.password).toBe('new-hash'); expect(state.record).toBeNull();
  });

  it('does not let a delayed change overwrite a newer recovered password', async () => {
    const started = deferred(); const release = deferred();
    state.hash.mockImplementation(async () => { started.resolve(); await release.promise; return 'stale-change-hash'; });
    const pending = change(changeRequest()); await started.promise;
    state.password = 'recovered-hash'; release.resolve();
    expect((await pending).status).toBe(409);
    expect(state.password).toBe('recovered-hash');
    expect(state.deleteMany).not.toHaveBeenCalled();
  });

  it('rejects an incorrect current password without changing credentials', async () => {
    state.compare.mockResolvedValue(false);
    expect((await change(changeRequest())).status).toBe(400);
    expect(state.transaction).not.toHaveBeenCalled();
  });

  it('requires an authenticated session for password change', async () => {
    state.authenticated = false;
    expect((await change(changeRequest())).status).toBe(401);
    expect(state.hash).not.toHaveBeenCalled();
  });

  it('allows one consumer of the same reset link when both passed the initial lookup', async () => {
    const bothHashing = deferred(); const release = deferred(); let count = 0;
    state.hash.mockImplementation(async () => { const attempt = ++count; if (count === 2) bothHashing.resolve(); await release.promise; return `new-hash-${attempt}`; });
    const one = reset(resetRequest()); const two = reset(resetRequest());
    await bothHashing.promise; release.resolve();
    expect((await Promise.all([one, two])).map(r => r.status).sort()).toEqual([200, 400]);
    expect(state.password).toBe('new-hash-1'); expect(state.record).toBeNull();
  });

  it('rejects a token that expires while password hashing runs', async () => {
    state.hash.mockImplementation(async () => { state.record!.expiresAt = new Date(0); return 'new-hash'; });
    expect((await reset(resetRequest())).status).toBe(400);
    expect(state.password).toBe('old-hash');
  });

  it('does not accept a reset link removed by a concurrent password change', async () => {
    state.hash.mockImplementation(async () => { state.record = null; return 'new-hash'; });
    expect((await reset(resetRequest())).status).toBe(400);
    expect(state.password).toBe('old-hash');
  });

  it('returns failure when the reset transaction fails, without reporting success', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    state.update.mockRejectedValue(new Error('simulated transaction failure'));
    expect((await reset(resetRequest())).status).toBe(500);
    expect(state.password).toBe('old-hash'); expect(state.record).not.toBeNull();
  });
});
