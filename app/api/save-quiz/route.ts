import { NextRequest, NextResponse } from 'next/server';
import { QuizResult } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const quizResult: QuizResult = body;

    if (!quizResult) {
      return NextResponse.json(
        { error: 'No quiz result provided' },
        { status: 400 }
      );
    }

    // Validate quiz result structure
    if (!quizResult.id || !quizResult.questions || !quizResult.userAnswers) {
      return NextResponse.json(
        { error: 'Invalid quiz result structure' },
        { status: 400 }
      );
    }

    // Note: Actual storage happens client-side using localStorage
    // This endpoint just validates and confirms
    return NextResponse.json({
      success: true,
      message: 'Quiz result validated. Save to localStorage on client side.',
      quizId: quizResult.id,
    });
  } catch (error: any) {
    console.error('Error saving quiz:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to save quiz' },
      { status: 500 }
    );
  }
}
