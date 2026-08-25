export interface ExistingAuthIdentity {
  password: string | null;
  googleSubject: string | null;
}

export function normalizeEmail(email: string): string {
  return email.trim().normalize('NFKC').toLowerCase();
}

export function isValidEmail(email: string): boolean {
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Google may reuse an existing OAuth-only identity, but it must never be
 * silently linked to an unverified credentials account with the same email.
 */
export function canUseGoogleIdentity(
  existingUser: ExistingAuthIdentity | null,
  googleSubject: string
): boolean {
  return (
    existingUser === null ||
    existingUser.googleSubject === googleSubject ||
    (existingUser.googleSubject === null && existingUser.password === null)
  );
}

export function resolveAuthSecret(
  secret: string | undefined,
  nodeEnv: string | undefined
): string | undefined {
  if (!secret && nodeEnv === 'production') {
    throw new Error('NEXTAUTH_SECRET must be configured in production');
  }

  return secret;
}
