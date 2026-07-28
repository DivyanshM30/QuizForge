import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit';
import { explainAnswer, relevantExcerpt } from '@/lib/gemini';
import { getErrorMessage } from '@/lib/quiz-utils';
import type { Question } from '@/lib/types';

export const runtime = 'nodejs';
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

function isQuestion(q: unknown): q is Question {
  if (!q || typeof q !== 'object') return false;
  const obj = q as Record<string, unknown>;
  const opts = obj.options as Record<string, unknown> | undefined;
  return (
    typeof obj.question === 'string' &&
    !!opts &&
    ['a', 'b', 'c', 'd'].every((k) => typeof opts[k] === 'string') &&
    ['a', 'b', 'c', 'd'].includes(obj.correctAnswer as string)
  );
}

/** AI follow-up explanation, grounded in the user's own document when possible. */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    const userId = session.user.id;

    // AI calls are expensive — keep this tight.
    const rl = checkRateLimit(`explain:${userId}`, 10, 10 * 60 * 1000);
    if (!rl.success) {
      return NextResponse.json(
        { message: 'Too many follow-ups — please wait a few minutes' },
        { status: 429 }
      );
    }

    const { question, userAnswer, query, documentId } = await req.json();

    if (!isQuestion(question)) {
      return NextResponse.json({ message: 'Invalid question payload' }, { status: 400 });
    }
    if (!query || typeof query !== 'string' || query.trim().length < 3 || query.length > 500) {
      return NextResponse.json(
        { message: 'Ask a question between 3 and 500 characters' },
        { status: 400 }
      );
    }
    const answer =
      typeof userAnswer === 'string' && ['a', 'b', 'c', 'd'].includes(userAnswer)
        ? userAnswer
        : null;

    // Best-effort grounding: fetch the source document if the user still owns it.
    let context: string | undefined;
    if (documentId && typeof documentId === 'string') {
      const doc = await prisma.document.findFirst({
        where: { id: documentId, userId },
        select: { text: true },
      });
      if (doc) {
        const excerpt = relevantExcerpt(doc.text, question.question);
        if (excerpt) context = excerpt;
      }
    }

    const explanation = await explainAnswer(question, answer, query.trim(), context);

    return NextResponse.json({ explanation, grounded: Boolean(context) });
  } catch (error) {
    console.error('Explain error:', error);
    return NextResponse.json(
      { message: getErrorMessage(error, 'Failed to get an explanation') },
      { status: 500 }
    );
  }
}
