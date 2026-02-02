import { NextRequest, NextResponse } from 'next/server';
import { generateQuestions } from '@/lib/gemini';
import { QuizConfig, Question } from '@/lib/types';

export const runtime = 'nodejs';
export const maxDuration = 120;

export async function POST(request: NextRequest) {
  try {
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
    if (quizConfig.numQuestions < 5 || quizConfig.numQuestions > 50) {
      return NextResponse.json(
        { error: 'Number of questions must be between 5 and 50' },
        { status: 400 }
      );
    }

    if (quizConfig.timeLimit < 5 || quizConfig.timeLimit > 120) {
      return NextResponse.json(
        { error: 'Time limit must be between 5 and 120 minutes' },
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
      } catch (error: any) {
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
  } catch (error: any) {
    console.error('Error generating questions:', error);
    return NextResponse.json(
      {
        error: error.message || 'Failed to generate questions',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
