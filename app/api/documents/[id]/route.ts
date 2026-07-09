import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/** Fetch one document including its text (for "new quiz from this document"). */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const doc = await prisma.document.findFirst({
      where: { id: params.id, userId: session.user.id },
    });
    if (!doc) {
      return NextResponse.json({ message: 'Document not found' }, { status: 404 });
    }

    return NextResponse.json(doc);
  } catch (error) {
    console.error('Get document error:', error);
    return NextResponse.json({ message: 'Failed to load document' }, { status: 500 });
  }
}

/** Rename a document. */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { title } = await req.json();
    if (!title || typeof title !== 'string' || title.trim().length === 0 || title.length > 120) {
      return NextResponse.json({ message: 'Invalid title' }, { status: 400 });
    }

    const { count } = await prisma.document.updateMany({
      where: { id: params.id, userId: session.user.id },
      data: { title: title.trim() },
    });
    if (count === 0) {
      return NextResponse.json({ message: 'Document not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Renamed' });
  } catch (error) {
    console.error('Rename document error:', error);
    return NextResponse.json({ message: 'Failed to rename document' }, { status: 500 });
  }
}

/** Delete a document (quiz results keep existing — documentId is set null). */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { count } = await prisma.document.deleteMany({
      where: { id: params.id, userId: session.user.id },
    });
    if (count === 0) {
      return NextResponse.json({ message: 'Document not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Deleted' });
  } catch (error) {
    console.error('Delete document error:', error);
    return NextResponse.json({ message: 'Failed to delete document' }, { status: 500 });
  }
}
