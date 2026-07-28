import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

/** Create (or return the existing) public share link for a quiz result. */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    const userId = session.user.id;

    const rl = checkRateLimit(`share:${userId}`, 10, 10 * 60 * 1000);
    if (!rl.success) {
      return NextResponse.json({ message: 'Too many requests — try again later' }, { status: 429 });
    }

    const { resultId } = await req.json();
    if (!resultId || typeof resultId !== 'string') {
      return NextResponse.json({ message: 'resultId required' }, { status: 400 });
    }

    const result = await prisma.quizResult.findFirst({
      where: { id: resultId, userId },
      include: { document: { select: { title: true } } },
    });
    if (!result) {
      return NextResponse.json({ message: 'Quiz not found' }, { status: 404 });
    }

    // Reuse an existing active link for this result
    const existing = await prisma.shareLink.findFirst({
      where: { ownerId: userId, resultId, revoked: false },
    });
    if (existing) {
      return NextResponse.json({ token: existing.token, existed: true });
    }

    const share = await prisma.shareLink.create({
      data: {
        token: randomBytes(9).toString('base64url'), // 12-char URL-safe token
        ownerId: userId,
        resultId,
        title: result.document?.title
          ? `Quiz: ${result.document.title}`
          : 'QuizForge challenge',
        questions: result.questions, // already a JSON string snapshot
      },
    });

    return NextResponse.json({ token: share.token, existed: false }, { status: 201 });
  } catch (error) {
    console.error('Share create error:', error);
    return NextResponse.json({ message: 'Failed to create share link' }, { status: 500 });
  }
}
