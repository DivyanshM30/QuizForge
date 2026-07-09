import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/** List the user's document library (metadata only — no full text). */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const documents = await prisma.document.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        wordCount: true,
        createdAt: true,
        _count: { select: { results: true } },
      },
    });

    return NextResponse.json(
      documents.map((d) => ({
        id: d.id,
        title: d.title,
        wordCount: d.wordCount,
        createdAt: d.createdAt,
        quizCount: d._count.results,
      }))
    );
  } catch (error) {
    console.error('List documents error:', error);
    return NextResponse.json({ message: 'Failed to load documents' }, { status: 500 });
  }
}
