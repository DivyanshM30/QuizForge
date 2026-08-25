import { afterEach, describe, expect, it, vi } from 'vitest';
import { sendEmail } from '@/lib/email';

describe('password-reset email fallback', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('never logs reset email contents in production', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('RESEND_API_KEY', '');
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    await expect(
      sendEmail({ to: 'user@example.com', subject: 'Reset', html: 'secret-reset-url' })
    ).rejects.toThrow('RESEND_API_KEY must be configured in production');
    expect(log).not.toHaveBeenCalled();
  });
});
