import { NextRequest, NextResponse } from 'next/server';
import { parseDocument } from '@/lib/document-parser';
import { validateFile } from '@/lib/file-validation';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit';
import { prisma } from '@/lib/prisma';
import { getErrorMessage } from '@/lib/quiz-utils';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized — please sign in' },
        { status: 401 }
      );
    }

    // Rate limit: 20 uploads per 10 minutes per user
    const userId = session.user.id || session.user.email || 'anon';
    const rl = checkRateLimit(`analyze:${userId}`, 20, 10 * 60 * 1000);
    if (!rl.success) {
      return NextResponse.json(
        { error: 'Too many requests — please try again later' },
        { status: 429 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file
    const validation = validateFile(file);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    // Parse document
    const parsed = await parseDocument(file);

    // Persist to the user's document library (keep the 20 most recent).
    let documentId: string | null = null;
    if (session.user.id) {
      try {
        const doc = await prisma.document.create({
          data: {
            userId: session.user.id,
            title: file.name.replace(/\.(pdf|docx)$/i, ''),
            text: parsed.text,
            wordCount: parsed.wordCount,
          },
        });
        documentId = doc.id;

        const excess = await prisma.document.findMany({
          where: { userId: session.user.id },
          orderBy: { createdAt: 'desc' },
          skip: 20,
          select: { id: true },
        });
        if (excess.length > 0) {
          await prisma.document.deleteMany({
            where: { id: { in: excess.map((d) => d.id) } },
          });
        }
      } catch (e) {
        // Library persistence is best-effort — never block the quiz flow on it.
        console.error('Document save failed:', e);
      }
    }

    return NextResponse.json({
      success: true,
      documentId,
      text: parsed.text,
      wordCount: parsed.wordCount,
      pageCount: parsed.pageCount,
    });
  } catch (error) {
    console.error('Error analyzing document:', error);
    const message = getErrorMessage(error, 'Failed to analyze document');

    // Treat parsing/structure issues as a 400 (client input problem), not a 500
    const isBadPdf =
      message.toLowerCase().includes('failed to parse pdf') ||
      message.toLowerCase().includes('pdf appears to be corrupted') ||
      message.toLowerCase().includes('invalid pdf structure');

    return NextResponse.json(
      { error: message },
      { status: isBadPdf ? 400 : 500 }
    );
  }
}
