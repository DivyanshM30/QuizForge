'use client';

import { useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import QuizHistory from '@/components/QuizHistory';
import Link from 'next/link';
import Image from 'next/image';

export default function HistoryPage() {
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  return (
    <main className="min-h-screen">
      {/* Background glowing effects */}
      <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-32 -left-24 h-96 w-96 rounded-full bg-primary-500/15 blur-3xl" />
        <div className="absolute top-40 -right-24 h-[32rem] w-[32rem] rounded-full bg-fuchsia-500/10 blur-3xl" />
        <div className="absolute bottom-[-8rem] left-1/3 h-[28rem] w-[28rem] rounded-full bg-cyan-500/10 blur-3xl" />
      </div>

      {/* Global Sticky Navigation Header */}
      <header className="sticky top-0 z-40 border-b border-white/5 bg-slate-950/40 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 py-3 md:px-8">
          <div className="flex items-center justify-between gap-3">
            <Link href="/" className="flex items-center gap-3">
              <div className="relative flex h-10 w-10 items-center justify-center rounded-xl overflow-hidden shadow-lg shadow-primary-500/20">
                <Image src="/logo.png" alt="QuizForge Logo" width={40} height={40} className="object-cover" />
              </div>
              <div className="leading-tight">
                <div className="text-sm font-semibold text-gray-100">QuizForge AI</div>
                <div className="text-xs text-gray-400">Upload → Generate → Simulate</div>
              </div>
            </Link>

            <div className="flex items-center gap-2">
              <Link
                href="/upload"
                className="hidden sm:inline-flex bg-white/5 hover:bg-white/10 text-gray-100 font-semibold px-4 py-2 rounded-lg transition-colors border border-white/10 mr-2"
              >
                Dashboard
              </Link>
              <Link
                href="/upload"
                className="inline-flex bg-primary-600 hover:bg-primary-700 text-white font-semibold px-4 py-2 rounded-lg transition-colors"
              >
                New Quiz
              </Link>
              <button
                onClick={() => signOut({ callbackUrl: '/' })}
                className="hidden sm:inline-flex bg-white/5 hover:bg-white/10 text-gray-100 font-semibold px-4 py-2 rounded-lg transition-colors border border-white/10 ml-2"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 py-8 md:px-8">
        <QuizHistory />
      </div>
    </main>
  );
}
