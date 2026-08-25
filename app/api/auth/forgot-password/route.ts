import { NextRequest, NextResponse } from 'next/server';
import { createHash, randomBytes } from 'crypto';
import { prisma } from '@/lib/prisma';
import { checkRateLimit } from '@/lib/rate-limit';
import { sendEmail, passwordResetEmailHtml } from '@/lib/email';
import { isValidEmail, normalizeEmail } from '@/lib/auth-security';

export const dynamic = 'force-dynamic';

const GENERIC_OK = {
  message: 'If an account exists for that email, a reset link has been sent.',
};

function genericOkResponse() {
  const developmentConsoleDelivery =
    process.env.NODE_ENV !== 'production' && !process.env.RESEND_API_KEY;

  return NextResponse.json({
    ...GENERIC_OK,
    ...(developmentConsoleDelivery ? { delivery: 'development-console' } : {}),
  });
}

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const rl = checkRateLimit(`forgot-password:${ip}`, 3, 15 * 60 * 1000);
    if (!rl.success) {
      return NextResponse.json(
        { message: 'Too many requests — please try again later' },
        { status: 429 }
      );
    }

    const { email: rawEmail } = await req.json();
    if (!rawEmail || typeof rawEmail !== 'string') {
      return NextResponse.json({ message: 'Email is required' }, { status: 400 });
    }

    const email = normalizeEmail(rawEmail);
    if (!isValidEmail(email)) return genericOkResponse();

    const user = await prisma.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
      select: { id: true },
    });

    // Always answer 200 with the same body — no user enumeration.
    if (!user) return genericOkResponse();

    const token = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(token).digest('hex');

    // One active token per user: clear any previous ones.
    await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
      },
    });

    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const resetUrl = `${baseUrl}/reset-password?token=${token}`;

    await sendEmail({
      to: email,
      subject: 'Reset your QuizForge password',
      html: passwordResetEmailHtml(resetUrl),
    });

    return genericOkResponse();
  } catch (error) {
    console.error('Forgot-password error:', error);
    // Still generic: never leak whether the account exists.
    return genericOkResponse();
  }
}
