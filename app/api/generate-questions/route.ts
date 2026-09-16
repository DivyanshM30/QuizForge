import { NextRequest, NextResponse } from 'next/server';
import { generateQuestions } from '@/lib/gemini';
import { Question } from '@/lib/types';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit';
import { getErrorMessage } from '@/lib/quiz-utils';
import { issueQuiz } from '@/lib/quiz-issuance';
import { validateQuizConfig } from '@/lib/quiz-submission';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const maxDuration = 120;

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized - please sign in' },
        { status: 401 }
      );
    }

    // Rate limit: 10 generations per 10 minutes per user (these are expensive)
    const userId = session.user.id;
    const rl = checkRateLimit(`generate:${userId}`, 10, 10 * 60 * 1000);
    if (!rl.success) {
      return NextResponse.json(
        { error: 'Too many requests - please try again later' },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { documentText, documentId, config } = body;

    if ((!documentText && !documentId) || !config) {
      return NextResponse.json(
        { error: 'Missing required quiz source or configuration' },
        { status: 400 }
      );
    }

    let sourceText = documentText;
    let linkedDocumentId: string | null = null;
    if (documentId !== undefined && documentId !== null) {
      if (typeof documentId !== 'string' || documentId.length === 0 || documentId.length > 200) {
        return NextResponse.json({ error: 'Invalid document reference' }, { status: 400 });
      }
      const document = await prisma.document.findFirst({
        where: { id: documentId, userId },
        select: { id: true, text: true },
      });
      if (!document) {
        return NextResponse.json({ error: 'Document not found' }, { status: 404 });
      }
      sourceText = document.text;
      linkedDocumentId = document.id;
    }

    if (typeof sourceText !== 'string' || sourceText.trim().length === 0) {
      return NextResponse.json({ error: 'Quiz source is empty' }, { status: 400 });
    }

    const parsedConfig = validateQuizConfig(config);
    if (!parsedConfig.ok) {
      return NextResponse.json({ error: parsedConfig.error }, { status: 400 });
    }
    const quizConfig = parsedConfig.value;

    // Generate questions with retry logic
    let questions: Question[] = [];
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      try {
        questions = await generateQuestions(sourceText, quizConfig);
        break;
      } catch (error) {
        attempts++;
        if (attempts >= maxAttempts) {
          throw error;
        }
        console.log(`Attempt ${attempts} failed, retrying...`);
        await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
      }
    }

    const issued = issueQuiz(userId, questions, quizConfig, linkedDocumentId);
    if (!issued.ok) return NextResponse.json({ error: issued.error }, { status: 422 });
    return NextResponse.json({
      success: true,
      ...issued.value,
      count: questions.length,
    });
  } catch (error) {
    console.error('Error generating questions:', error);
    return NextResponse.json(
      {
        error: getErrorMessage(error, 'Failed to generate questions'),
        details:
          process.env.NODE_ENV === 'development' && error instanceof Error
            ? error.stack
            : undefined,
      },
      { status: 500 }
    );
  }
}
