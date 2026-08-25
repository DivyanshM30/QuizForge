import { NextRequest, NextResponse } from 'next/server';
import { generateQuestions } from '@/lib/gemini';
import { QuizConfig, Question } from '@/lib/types';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit';
import { QUIZ_LIMITS } from '@/lib/constants';
import { getErrorMessage } from '@/lib/quiz-utils';

export const runtime = 'nodejs';
export const maxDuration = 120;

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized — please sign in' },
        { status: 401 }
      );
    }

    // Rate limit: 10 generations per 10 minutes per user (these are expensive)
    const userId = session.user.id;
    const rl = checkRateLimit(`generate:${userId}`, 10, 10 * 60 * 1000);
    if (!rl.success) {
      return NextResponse.json(
        { error: 'Too many requests — please try again later' },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { documentText, config } = body;

    if (!documentText || !config) {
      return NextResponse.json(
        { error: 'Missing required fields: documentText and config' },
        { status: 400 }
      );
    }

    const quizConfig: QuizConfig = {
      numQuestions: config.numQuestions || 10,
      timeLimit: config.timeLimit || 15,
      difficulty: config.difficulty || 'medium',
    };

    // Validate config
    if (
      quizConfig.numQuestions < QUIZ_LIMITS.MIN_QUESTIONS ||
      quizConfig.numQuestions > QUIZ_LIMITS.MAX_QUESTIONS
    ) {
      return NextResponse.json(
        { error: `Number of questions must be between ${QUIZ_LIMITS.MIN_QUESTIONS} and ${QUIZ_LIMITS.MAX_QUESTIONS}` },
        { status: 400 }
      );
    }

    if (
      quizConfig.timeLimit < QUIZ_LIMITS.MIN_TIME ||
      quizConfig.timeLimit > QUIZ_LIMITS.MAX_TIME
    ) {
      return NextResponse.json(
        { error: `Time limit must be between ${QUIZ_LIMITS.MIN_TIME} and ${QUIZ_LIMITS.MAX_TIME} minutes` },
        { status: 400 }
      );
    }

    // Generate questions with retry logic
    let questions: Question[] = [];
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      try {
        questions = await generateQuestions(documentText, quizConfig);
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

    return NextResponse.json({
      success: true,
      questions,
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
