import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import type { Question } from '@/lib/types';

export const dynamic = 'force-dynamic';

/**
 * Public share payload: quiz questions WITHOUT answers/explanations
 * (grading happens server-side on submit), plus the leaderboard.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const share = await prisma.shareLink.findUnique({
      where: { token: params.token },
      include: {
        entries: { orderBy: [{ score: 'desc' }, { createdAt: 'asc' }], take: 20 },
      },
    });
    if (!share || share.revoked) {
      return NextResponse.json({ message: 'This quiz link does not exist or was revoked' }, { status: 404 });
    }

    const questions = (JSON.parse(share.questions) as Question[]).map((q) => ({
      id: q.id,
      question: q.question,
      options: q.options,
      topic: q.topic,
      // correctAnswer + explanation deliberately stripped for the public payload
    }));

    return NextResponse.json({
      title: share.title,
      questionCount: questions.length,
      questions,
      leaderboard: share.entries.map((e) => ({
        name: e.name,
        score: e.score,
        total: e.total,
        at: e.createdAt,
      })),
    });
  } catch (error) {
    console.error('Share get error:', error);
    return NextResponse.json({ message: 'Failed to load quiz' }, { status: 500 });
  }
}

/** Owner revokes the link (kept in DB so the leaderboard isn't lost). */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { count } = await prisma.shareLink.updateMany({
      where: { token: params.token, ownerId: session.user.id },
      data: { revoked: true },
    });
    if (count === 0) {
      return NextResponse.json({ message: 'Share link not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Link revoked' });
  } catch (error) {
    console.error('Share revoke error:', error);
    return NextResponse.json({ message: 'Failed to revoke link' }, { status: 500 });
  }
}
