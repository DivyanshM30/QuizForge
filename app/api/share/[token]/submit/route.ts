import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkRateLimit } from '@/lib/rate-limit';
import type { Question } from '@/lib/types';

export const dynamic = 'force-dynamic';

/**
 * Anonymous submission: grade server-side, record a leaderboard entry,
 * return the score + full answer key for review.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    // Public endpoint - rate limit by IP
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const rl = checkRateLimit(`share-submit:${ip}`, 10, 10 * 60 * 1000);
    if (!rl.success) {
      return NextResponse.json({ message: 'Too many submissions - try again later' }, { status: 429 });
    }

    const share = await prisma.shareLink.findUnique({ where: { token } });
    if (!share || share.revoked) {
      return NextResponse.json({ message: 'This quiz link does not exist or was revoked' }, { status: 404 });
    }

    const { name, answers } = await req.json();
    if (!name || typeof name !== 'string' || name.trim().length === 0 || name.length > 40) {
      return NextResponse.json({ message: 'Enter a name (max 40 characters)' }, { status: 400 });
    }

    const questions = JSON.parse(share.questions) as Question[];
    if (!Array.isArray(answers) || answers.length !== questions.length) {
      return NextResponse.json({ message: 'Invalid answers payload' }, { status: 400 });
    }

    let score = 0;
    const review = questions.map((q, i) => {
      const answer = ['a', 'b', 'c', 'd'].includes(answers[i]) ? answers[i] : null;
      const correct = answer === q.correctAnswer;
      if (correct) score++;
      return {
        question: q.question,
        yourAnswer: answer,
        correctAnswer: q.correctAnswer,
        options: q.options,
        explanation: q.explanation,
        correct,
      };
    });

    await prisma.shareEntry.create({
      data: {
        shareId: share.id,
        name: name.trim(),
        score,
        total: questions.length,
      },
    });

    const leaderboard = await prisma.shareEntry.findMany({
      where: { shareId: share.id },
      orderBy: [{ score: 'desc' }, { createdAt: 'asc' }],
      take: 20,
      select: { name: true, score: true, total: true, createdAt: true },
    });

    return NextResponse.json({
      score,
      total: questions.length,
      review,
      leaderboard: leaderboard.map((e) => ({
        name: e.name, score: e.score, total: e.total, at: e.createdAt,
      })),
    });
  } catch (error) {
    console.error('Share submit error:', error);
    return NextResponse.json({ message: 'Failed to submit answers' }, { status: 500 });
  }
}
