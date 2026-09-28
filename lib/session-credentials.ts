import { createHash, timingSafeEqual } from 'node:crypto';

interface CredentialState {
  id: string;
  password: string | null;
  googleSubject: string | null;
}

/**
 * A revocation marker, authenticated by NextAuth's encrypted JWT, not a bearer
 * credential. The salted bcrypt hash changes atomically with the password.
 * Never expose the hash or marker through the public session response.
 */
export function credentialStamp(user: CredentialState): string {
  return createHash('sha256')
    .update(JSON.stringify(['quizforge-session-v1', user.id, user.password, user.googleSubject]))
    .digest('hex');
}

export function matchesCredentialStamp(stamp: unknown, user: CredentialState): boolean {
  return typeof stamp === 'string' && /^[a-f0-9]{64}$/.test(stamp) &&
    timingSafeEqual(Buffer.from(stamp, 'hex'), Buffer.from(credentialStamp(user), 'hex'));
}
