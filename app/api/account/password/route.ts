import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

/** Change password (requires the current one). */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const rl = checkRateLimit(`change-password:${session.user.id}`, 5, 15 * 60 * 1000);
    if (!rl.success) {
      return NextResponse.json(
        { message: 'Too many attempts - please try again later' },
        { status: 429 }
      );
    }

    const { currentPassword, newPassword } = await req.json();

    if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 8) {
      return NextResponse.json(
        { message: 'New password must be at least 8 characters long' },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({ where: { id: session.user.id } });
    if (!user) return NextResponse.json({ message: 'Not found' }, { status: 404 });

    if (!user.password) {
      return NextResponse.json(
        { message: 'This account uses Google sign-in. Use "Forgot password" to set a password first.' },
        { status: 400 }
      );
    }

    const valid = await bcrypt.compare(currentPassword ?? '', user.password);
    if (!valid) {
      return NextResponse.json({ message: 'Current password is incorrect' }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const changed = await prisma.$transaction(async (tx) => {
      // A password reset/change that won while bcrypt ran must not be undone.
      const result = await tx.user.updateMany({
        where: { id: user.id, password: user.password },
        data: { password: hashedPassword },
      });
      if (result.count !== 1) return false;
      await tx.passwordResetToken.deleteMany({ where: { userId: user.id } });
      return true;
    });
    if (!changed) return NextResponse.json({ message: 'Your credentials changed. Sign in again before changing your password.' }, { status: 409 });

    return NextResponse.json({ message: 'Password updated. Sign in again with your new password.' });
  } catch (error) {
    console.error('Change password error:', error);
    return NextResponse.json({ message: 'Failed to change password' }, { status: 500 });
  }
}
