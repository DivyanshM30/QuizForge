import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/** Get the current user's profile (incl. whether a password is set). */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, name: true, email: true, password: true, createdAt: true },
    });
    if (!user) return NextResponse.json({ message: 'Not found' }, { status: 404 });
    return NextResponse.json({
      id: user.id,
      name: user.name,
      email: user.email,
      hasPassword: Boolean(user.password),
      createdAt: user.createdAt,
    });
  } catch (error) {
    console.error('Get account error:', error);
    return NextResponse.json({ message: 'Failed to load account' }, { status: 500 });
  }
}

/** Update profile (name). */
export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { name } = await req.json();
    if (typeof name !== 'string' || name.trim().length === 0 || name.length > 80) {
      return NextResponse.json({ message: 'Invalid name' }, { status: 400 });
    }

    await prisma.user.update({
      where: { id: session.user.id },
      data: { name: name.trim() },
    });

    return NextResponse.json({ message: 'Profile updated' });
  } catch (error) {
    console.error('Update account error:', error);
    return NextResponse.json({ message: 'Failed to update profile' }, { status: 500 });
  }
}

/** Delete account and all data (documents + results cascade in schema). */
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { confirm } = await req.json().catch(() => ({}));
    if (confirm !== 'DELETE') {
      return NextResponse.json(
        { message: 'Confirmation required' },
        { status: 400 }
      );
    }

    await prisma.user.delete({ where: { id: session.user.id } });

    return NextResponse.json({ message: 'Account deleted' });
  } catch (error) {
    console.error('Delete account error:', error);
    return NextResponse.json({ message: 'Failed to delete account' }, { status: 500 });
  }
}
