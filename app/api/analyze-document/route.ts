import { NextRequest, NextResponse } from 'next/server';
import { parseDocument } from '@/lib/document-parser';
import { validateFile } from '@/lib/file-validation';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
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

    return NextResponse.json({
      success: true,
      text: parsed.text,
      wordCount: parsed.wordCount,
      pageCount: parsed.pageCount,
    });
  } catch (error: any) {
    console.error('Error analyzing document:', error);
    const message = error?.message || 'Failed to analyze document';

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
