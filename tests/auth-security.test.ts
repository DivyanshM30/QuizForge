import { describe, expect, it } from 'vitest';
import {
  canUseGoogleIdentity,
  isValidEmail,
  normalizeEmail,
  resolveAuthSecret,
} from '@/lib/auth-security';

describe('authentication security boundaries', () => {
  it('normalizes equivalent user-entered email forms', () => {
    expect(normalizeEmail('  Student@Example.COM ')).toBe('student@example.com');
    expect(isValidEmail('student@example.com')).toBe(true);
    expect(isValidEmail('not-an-email')).toBe(false);
  });

  it('blocks Google auto-linking to an existing credentials identity', () => {
    expect(
      canUseGoogleIdentity(
        { password: 'bcrypt-hash', googleSubject: null },
        'google-subject'
      )
    ).toBe(false);
  });

  it('preserves new and existing OAuth-only Google sign-in', () => {
    expect(canUseGoogleIdentity(null, 'google-subject')).toBe(true);
    expect(
      canUseGoogleIdentity(
        { password: null, googleSubject: null },
        'google-subject'
      )
    ).toBe(true);
  });

  it('preserves an explicitly identified Google account after it adds a password', () => {
    expect(
      canUseGoogleIdentity(
        { password: 'bcrypt-hash', googleSubject: 'google-subject' },
        'google-subject'
      )
    ).toBe(true);
  });

  it('fails closed when the production session secret is missing', () => {
    expect(() => resolveAuthSecret(undefined, 'production')).toThrow(
      'NEXTAUTH_SECRET must be configured in production'
    );
    expect(resolveAuthSecret(undefined, 'development')).toBeUndefined();
    expect(resolveAuthSecret('configured-secret', 'production')).toBe('configured-secret');
  });
});
