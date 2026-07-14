import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/** Due review items (max 20 per session) + queue counts. */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    const userId = session.user.id;
    const now = new Date();

    const prefs = await prisma.user.findUnique({
      where: { id: userId },
      select: { reviewEnabled: true },
    });
    if (!prefs?.reviewEnabled) {
      return NextResponse.json({ enabled: false, items: [], dueCount: 0, totalCount: 0 });
    }

    const [items, dueCount, totalCount] = await Promise.all([
      prisma.reviewItem.findMany({
        where: { userId, dueAt: { lte: now } },
        orderBy: { dueAt: 'asc' },
        take: 20,
        select: { id: true, question: true, topic: true, stage: true },
      }),
      prisma.reviewItem.count({ where: { userId, dueAt: { lte: now } } }),
      prisma.reviewItem.count({ where: { userId } }),
    ]);

    return NextResponse.json({
      enabled: true,
      items: items.map((i) => ({
        id: i.id,
        topic: i.topic,
        stage: i.stage,
        question: JSON.parse(i.question),
      })),
      dueCount,
      totalCount,
    });
  } catch (error) {
    console.error('Review due error:', error);
    return NextResponse.json({ message: 'Failed to load reviews' }, { status: 500 });
  }
}
