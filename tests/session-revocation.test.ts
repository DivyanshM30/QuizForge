import { beforeEach, describe, expect, it, vi } from 'vitest';
import bcrypt from 'bcryptjs';
import type { JWT } from 'next-auth/jwt';
import { encode } from 'next-auth/jwt';
import { getServerSession } from 'next-auth/next';
import type { CredentialsConfig } from 'next-auth/providers/credentials';
import type { NextAuthOptions } from 'next-auth';

const db = vi.hoisted(() => ({
  user: null as null | { id: string; email: string; name: string; password: string | null; googleSubject: string | null },
  findUnique: vi.fn(), findFirst: vi.fn(), update: vi.fn(), create: vi.fn(),
  cookie: '', findMany: vi.fn(),
}));
vi.mock('@/lib/prisma', () => ({ prisma: { user: db, quizResult: { findMany: db.findMany } } }));
vi.mock('next-auth/next', async (importOriginal) => {
  const actual = await importOriginal<typeof import('next-auth/next')>();
  return { ...actual, getServerSession: (...args: Parameters<typeof actual.getServerSession>) => {
    if (args.length !== 1) return actual.getServerSession(...args);
    return actual.getServerSession(
      { headers: {}, cookies: { 'next-auth.session-token': db.cookie } } as never,
      { getHeader: vi.fn(), setHeader: vi.fn() } as never,
      { ...args[0] as NextAuthOptions, secret: 'isolated-session-revocation-test-secret', logger: { error: vi.fn(), warn: vi.fn(), debug: vi.fn() } },
    );
  } };
});
import { authOptions } from '@/lib/auth';
import { GET as history } from '@/app/api/history/route';

const secret = 'isolated-session-revocation-test-secret';
const credentialsAccount = { provider: 'credentials', type: 'credentials', providerAccountId: 'u1' } as const;
const googleAccount = { provider: 'google', type: 'oauth', providerAccountId: 'google-subject' } as const;
const jwt = (args: object) => authOptions.callbacks!.jwt!(args as never);
const authorize = (password = 'old-password') => (authOptions.providers[0] as CredentialsConfig).options!.authorize!(
  { email: 'learner@example.invalid', password }, {} as never,
);
async function login() {
  const user = await authorize();
  expect(user).not.toBeNull();
  return jwt({ token: { sub: user!.id }, user, account: credentialsAccount });
}
async function resolve(token: JWT) {
  const cookie = await encode({ token, secret });
  const setHeader = vi.fn();
  const session = await getServerSession(
    { headers: {}, cookies: { 'next-auth.session-token': cookie } } as never,
    { getHeader: vi.fn(), setHeader } as never,
    { ...authOptions, secret, logger: { error: vi.fn(), warn: vi.fn(), debug: vi.fn() } },
  );
  return { session, setHeader };
}

describe('credential-bound NextAuth sessions', () => {
  beforeEach(async () => {
    vi.resetAllMocks();
    db.cookie = '';
    db.findMany.mockResolvedValue([]);
    db.user = { id: 'u1', email: 'learner@example.invalid', name: 'Learner', password: await bcrypt.hash('old-password', 4), googleSubject: null };
    db.findFirst.mockImplementation(async () => db.user && { ...db.user });
    db.findUnique.mockImplementation(async () => db.user && { ...db.user });
    db.update.mockImplementation(async ({ data }) => { Object.assign(db.user!, data); return { ...db.user! }; });
    db.create.mockImplementation(async ({ data }) => { db.user = { id: 'new-google-user', password: null, ...data }; return { ...db.user! }; });
  });

  it('keeps a legitimate credentials session and omits its internal marker from the public session', async () => {
    const token = await login();
    const { session } = await resolve(token);
    expect(session?.user.id).toBe('u1');
    expect(JSON.stringify(session)).not.toContain(db.user!.password);
    expect(session).not.toHaveProperty('credentialStamp');
    expect(session?.user).not.toHaveProperty('credentialStamp');
  });

  it('revokes both old sessions after a password write, while a fresh login works', async () => {
    const first = await login();
    const second = await login();
    db.user!.password = await bcrypt.hash('new-password', 4);
    for (const token of [first, second]) {
      const { session, setHeader } = await resolve(token);
      expect(session).toBeNull();
      expect(JSON.stringify(setHeader.mock.calls)).toContain('Max-Age=0');
    }
    expect(await authorize()).toBeNull();
    const user = await authorize('new-password');
    const fresh = await jwt({ token: { sub: user!.id }, user, account: credentialsAccount });
    expect((await resolve(fresh)).session?.user.id).toBe('u1');
  });

  it('does not bless a stale credentials authorization snapshot after recovery', async () => {
    const user = await authorize();
    db.user!.password = await bcrypt.hash('new-password', 4);
    await expect(jwt({ token: { sub: user!.id }, user, account: credentialsAccount })).rejects.toThrow();
  });

  it('rejects legacy tokens instead of upgrading them during refresh', async () => {
    expect((await resolve({ sub: 'u1' })).session).toBeNull();
  });

  it('denies a private API request using a previously valid encrypted cookie', async () => {
    db.cookie = await encode({ token: await login(), secret });
    expect((await history(new Request('http://localhost/api/history'))).status).toBe(200);
    db.findMany.mockClear();
    db.user!.password = await bcrypt.hash('new-password', 4);
    expect((await history(new Request('http://localhost/api/history'))).status).toBe(401);
    expect(db.findMany).not.toHaveBeenCalled();
  });

  it('rejects malformed or differently bound credential markers', async () => {
    const token = await login();
    for (const credentialStamp of ['', 'g'.repeat(64), '0'.repeat(64)]) {
      expect((await resolve({ ...token, credentialStamp })).session).toBeNull();
    }
    db.user!.id = 'different-user';
    expect((await resolve(token)).session).toBeNull();
  });

  it('rejects deleted users and fails closed on database failure', async () => {
    const token = await login();
    db.user = null;
    expect((await resolve(token)).session).toBeNull();
    db.findUnique.mockRejectedValue(new Error('database unavailable'));
    expect((await resolve(token)).session).toBeNull();
  });

  it('ignores client update payloads and preserves sessions across profile edits', async () => {
    const token = await login();
    db.user!.name = 'New name';
    const updated = await jwt({ token, trigger: 'update', session: { sub: 'victim', credentialStamp: 'forged' } });
    expect(updated.sub).toBe('u1');
    expect((await resolve(updated)).session?.user.id).toBe('u1');
    db.user!.password = await bcrypt.hash('new-password', 4);
    await expect(jwt({ token, trigger: 'update', session: { user: { id: 'u1' } } })).rejects.toThrow();
  });

  it('binds Google-only sessions and revokes them when a password is added', async () => {
    db.user!.password = null;
    db.user!.googleSubject = 'google-subject';
    const user = { id: 'provider-user', email: db.user!.email, name: 'Learner' };
    expect(await authOptions.callbacks!.signIn!({ user, account: googleAccount, profile: { sub: 'google-subject', email_verified: true } } as never)).toBe(true);
    const token = await jwt({ token: { sub: 'provider-user' }, user, account: googleAccount });
    expect((await resolve(token)).session?.user.id).toBe('u1');
    db.user!.password = await bcrypt.hash('new-password', 4);
    expect((await resolve(token)).session).toBeNull();
  });

  it('creates a bound session for a new verified Google identity', async () => {
    db.user = null;
    const user = { id: 'provider-user', email: 'new@example.invalid', name: 'New' };
    expect(await authOptions.callbacks!.signIn!({ user, account: googleAccount, profile: { sub: 'google-subject', email_verified: true } } as never)).toBe(true);
    const token = await jwt({ token: { sub: 'provider-user' }, user, account: googleAccount });
    expect((await resolve(token)).session?.user.id).toBe('new-google-user');
  });
});
