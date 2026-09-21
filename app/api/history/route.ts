import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { createHistoryAnalytics, type HistorySummary } from '@/lib/history-analytics';
import type { QuizResult } from '@prisma/client';

export const dynamic = 'force-dynamic';
const PAGE_SIZE = 20;
const BATCH_SIZE = 100;
const summarySelect = { id: true, createdAt: true, accuracy: true, score: true, totalQuestions: true, timeTaken: true, config: true, weakTopics: true } as const;
const analyticsSelect = { ...summarySelect, topicPerformance: true, questions: true, userAnswers: true, confidences: true } as const;
const orderBy = [{ createdAt: 'desc' as const }, { id: 'desc' as const }];
const before = (row: { createdAt: Date; id: string }) => ({ OR: [{ createdAt: { lt: row.createdAt } }, { createdAt: row.createdAt, id: { lt: row.id } }] });

function summarize(row: Pick<QuizResult, keyof typeof summarySelect>): HistorySummary {
  return { id: row.id, createdAt: row.createdAt, accuracy: row.accuracy, score: row.score,
    totalQuestions: row.totalQuestions, timeTaken: row.timeTaken,
    timestamp: row.createdAt.getTime(), config: JSON.parse(row.config), weakTopics: JSON.parse(row.weakTopics) };
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    const userId = session.user.id;
    const params = new URL(req.url).searchParams;
    if (params.get('view') === 'dashboard') {
      const analytics = createHistoryAnalytics();
      const items: HistorySummary[] = [];
      let last: { createdAt: Date; id: string } | null = null;
      const asOf = new Date();
      while (true) {
        const rows: Pick<QuizResult, keyof typeof analyticsSelect>[] = await prisma.quizResult.findMany({
          where: { userId, createdAt: { lte: asOf }, ...(last ? before(last) : {}) },
          orderBy, take: BATCH_SIZE, select: analyticsSelect,
        });
        for (const row of rows) {
          if (items.length < 6) items.push(summarize(row));
          analytics.add({ ...row,
            topicPerformance: JSON.parse(row.topicPerformance),
            questions: row.confidences ? JSON.parse(row.questions) : [],
            userAnswers: row.confidences ? JSON.parse(row.userAnswers) : [],
            confidences: row.confidences ? JSON.parse(row.confidences) : null,
          });
        }
        if (rows.length < BATCH_SIZE) break;
        last = rows[rows.length - 1];
      }
      return NextResponse.json({ items, nextCursor: null, analytics: analytics.finish() });
    }
    const cursor = params.get('cursor');
    if (cursor && cursor.length > 200) return NextResponse.json({ message: 'Invalid history cursor' }, { status: 400 });
    const last = cursor ? await prisma.quizResult.findFirst({ where: { id: cursor, userId }, select: { id: true, createdAt: true } }) : null;
    if (cursor && !last) return NextResponse.json({ message: 'History changed. Reload the list to continue.' }, { status: 400 });
    const rows = await prisma.quizResult.findMany({
      where: { userId, ...(last ? before(last) : {}) }, orderBy,
      select: summarySelect, take: PAGE_SIZE + 1,
    });
    const items = rows.slice(0, PAGE_SIZE).map(summarize);
    return NextResponse.json({ items, nextCursor: rows.length > PAGE_SIZE ? items[items.length - 1].id : null });
  } catch (error) {
    console.error('Fetch history error:', error);
    return NextResponse.json({ message: 'An error occurred while fetching history' }, { status: 500 });
  }
}
