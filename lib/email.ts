/**
 * Minimal email sender using Resend's plain HTTPS API (no SDK dependency).
 * In development (or when RESEND_API_KEY is unset) it logs the email to the
 * server console instead, so the reset flow is fully testable locally.
 */

interface SendEmailArgs {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: SendEmailArgs): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || 'QuizForge <onboarding@resend.dev>';

  if (!apiKey) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('RESEND_API_KEY must be configured in production');
    }
    console.log(`[email:dev-fallback] To: ${to}\nSubject: ${subject}\n${html}`);
    return;
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from, to, subject, html }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Email send failed (${res.status}): ${body}`);
  }
}

export function passwordResetEmailHtml(resetUrl: string): string {
  return `
  <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;background:#0a0a0a;color:#f1f5f9;border-radius:16px">
    <h1 style="font-size:20px;margin:0 0 16px">Reset your QuizForge password</h1>
    <p style="color:#94a3b8;font-size:14px;line-height:1.6">
      Someone (hopefully you) requested a password reset. This link is valid for
      <strong>1 hour</strong> and can be used once.
    </p>
    <a href="${resetUrl}"
       style="display:inline-block;margin:16px 0;padding:12px 24px;background:#ffffff;color:#000000;border-radius:12px;text-decoration:none;font-weight:bold;font-size:14px">
      Reset password
    </a>
    <p style="color:#64748b;font-size:12px;line-height:1.6">
      If you didn't request this, you can safely ignore this email — your
      password will not change.
    </p>
  </div>`;
}
