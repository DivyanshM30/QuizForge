import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { checkRateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

class InvalidResetTokenError extends Error {}

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const rl = checkRateLimit(`reset-password:${ip}`, 5, 15 * 60 * 1000);
    if (!rl.success) {
      return NextResponse.json(
        { message: 'Too many attempts - please try again later' },
        { status: 429 }
      );
    }

    const { token, password } = await req.json();

    if (!token || typeof token !== 'string') {
      return NextResponse.json({ message: 'Invalid reset link' }, { status: 400 });
    }
    if (!password || typeof password !== 'string' || password.length < 8) {
      return NextResponse.json(
        { message: 'Password must be at least 8 characters long' },
        { status: 400 }
      );
    }

    const tokenHash = createHash('sha256').update(token).digest('hex');
    const record = await prisma.passwordResetToken.findUnique({
      where: { tokenHash },
    });

    if (!record || record.expiresAt <= new Date()) {
      return NextResponse.json(
        { message: 'This reset link is invalid or has expired. Please request a new one.' },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await prisma.$transaction(async (tx) => {
      // Lock/write the user before tokens, matching change-password's lock order.
      // This write MUST roll back if the token cannot be consumed below.
      await tx.user.update({
        where: { id: record.userId },
        data: { password: hashedPassword },
      });
      // A pre-hash lookup is not a reservation; only one transaction may consume it.
      const consumed = await tx.passwordResetToken.deleteMany({
        where: { id: record.id, tokenHash, expiresAt: { gt: new Date() } },
      });
      if (consumed.count !== 1) throw new InvalidResetTokenError();
      await tx.passwordResetToken.deleteMany({ where: { userId: record.userId } });
    });

    return NextResponse.json({ message: 'Password updated - you can now sign in.' });
  } catch (error) {
    if (error instanceof InvalidResetTokenError) {
      return NextResponse.json({ message: 'This reset link is invalid or has expired. Please request a new one.' }, { status: 400 });
    }
    console.error('Reset-password error:', error);
    return NextResponse.json(
      { message: 'An error occurred. Please try again.' },
      { status: 500 }
    );
  }
}
