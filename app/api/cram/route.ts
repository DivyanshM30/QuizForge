import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit';
import { questionHash } from '@/lib/review';
import type { Question } from '@/lib/types';

export const dynamic = 'force-dynamic';

const WEAK_TOPIC_THRESHOLD = 60; // topics under this accuracy feed the pool
const MIN_POOL = 5;

/**
 * Build a "cram" question set from the user's own history:
 * 1. questions they previously answered wrong (highest priority, most-missed first)
 * 2. questions from topics with < 60% lifetime accuracy
 * Deduped by question hash across all past quizzes.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    const userId = session.user.id;

    const rl = checkRateLimit(`cram:${userId}`, 10, 10 * 60 * 1000);
    if (!rl.success) {
      return NextResponse.json({ message: 'Too many requests — please try again later' }, { status: 429 });
    }

    const countParam = Number(req.nextUrl.searchParams.get('count')) || 10;
    const count = [10, 20, 30].includes(countParam) ? countParam : 10;

    const results = await prisma.quizResult.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: { questions: true, userAnswers: true },
    });

    if (results.length === 0) {
      return NextResponse.json(
        { message: 'Take a few quizzes first — Cram Mode studies your past mistakes' },
        { status: 400 }
      );
    }

    // Aggregate across history
    const missed = new Map<string, { q: Question; times: number }>();
    const byTopic = new Map<string, { correct: number; total: number }>();
    const topicPool = new Map<string, Question[]>();

    for (const r of results) {
      let questions: Question[];
      let answers: (string | null)[];
      try {
        questions = JSON.parse(r.questions);
        answers = JSON.parse(r.userAnswers);
      } catch {
        continue;
      }
      questions.forEach((q, i) => {
        const topic = q.topic || 'General';
        const stats = byTopic.get(topic) || { correct: 0, total: 0 };
        stats.total++;
        const wrong = answers[i] !== q.correctAnswer;
        if (!wrong) stats.correct++;
        byTopic.set(topic, stats);

        const pool = topicPool.get(topic) || [];
        if (pool.length < 100) topicPool.set(topic, [...pool, q]);

        if (wrong) {
          const hash = questionHash(q);
          const entry = missed.get(hash);
          missed.set(hash, { q, times: (entry?.times || 0) + 1 });
        }
      });
    }

    // Priority 1: most-missed questions
    const picked: Question[] = [];
    const pickedHashes = new Set<string>();
    const missedSorted = Array.from(missed.entries()).sort((a, b) => b[1].times - a[1].times);
    for (const [hash, { q }] of missedSorted) {
      if (picked.length >= count) break;
      picked.push(q);
      pickedHashes.add(hash);
    }

    // Priority 2: fill from weak topics (< threshold accuracy)
    if (picked.length < count) {
      const weakTopics = Array.from(byTopic.entries())
        .filter(([, s]) => s.total >= 2 && (s.correct / s.total) * 100 < WEAK_TOPIC_THRESHOLD)
        .sort((a, b) => a[1].correct / a[1].total - b[1].correct / b[1].total)
        .map(([topic]) => topic);

      outer: for (const topic of weakTopics) {
        for (const q of topicPool.get(topic) || []) {
          if (picked.length >= count) break outer;
          const hash = questionHash(q);
          if (pickedHashes.has(hash)) continue;
          picked.push(q);
          pickedHashes.add(hash);
        }
      }
    }

    if (picked.length < MIN_POOL) {
      return NextResponse.json(
        { message: 'Not enough weak spots found yet — nice work! Take more quizzes to feed Cram Mode.' },
        { status: 400 }
      );
    }

    return NextResponse.json({ questions: picked });
  } catch (error) {
    console.error('Cram error:', error);
    return NextResponse.json({ message: 'Failed to build cram quiz' }, { status: 500 });
  }
}
