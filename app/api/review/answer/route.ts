import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit';
import { scheduleNext, REVIEW_INTERVALS_DAYS, type Confidence } from '@/lib/review';
import type { Question } from '@/lib/types';

export const dynamic = 'force-dynamic';

/**
 * Grade one review answer server-side and reschedule (or graduate) the item.
 * The client never decides correctness.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    const userId = session.user.id;

    const rl = checkRateLimit(`review-answer:${userId}`, 60, 10 * 60 * 1000);
    if (!rl.success) {
      return NextResponse.json({ message: 'Slow down a little' }, { status: 429 });
    }

    const { itemId, answer, confidence } = await req.json();
    const conf: Confidence = confidence === 'sure' || confidence === 'unsure' ? confidence : null;
    if (!itemId || !['a', 'b', 'c', 'd'].includes(answer)) {
      return NextResponse.json({ message: 'Invalid request' }, { status: 400 });
    }

    const item = await prisma.reviewItem.findFirst({
      where: { id: itemId, userId },
    });
    if (!item) {
      return NextResponse.json({ message: 'Review item not found' }, { status: 404 });
    }

    const question = JSON.parse(item.question) as Question;
    const correct = answer === question.correctAnswer;
    const next = scheduleNext(item.stage, correct, conf);

    if (next.graduated) {
      await prisma.reviewItem.delete({ where: { id: item.id } });
    } else {
      await prisma.reviewItem.update({
        where: { id: item.id },
        data: {
          stage: next.nextStage,
          dueAt: next.nextDueAt,
          reps: { increment: 1 },
          lapses: correct ? undefined : { increment: 1 },
          lastResult: correct ? 'correct' : 'wrong',
        },
      });
    }

    return NextResponse.json({
      correct,
      correctAnswer: question.correctAnswer,
      explanation: question.explanation,
      graduated: next.graduated,
      nextInDays: next.graduated ? null : REVIEW_INTERVALS_DAYS[next.nextStage],
    });
  } catch (error) {
    console.error('Review answer error:', error);
    return NextResponse.json({ message: 'Failed to record answer' }, { status: 500 });
  }
}
