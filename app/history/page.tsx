'use client';

import { useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import QuizHistory from '@/components/QuizHistory';
import Link from 'next/link';
import Image from 'next/image';
import ThemeToggle from '@/components/ThemeToggle';

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

      {/* Global Sticky Navigation Header */}
      <header className="sticky top-0 z-40 border-b border-indigo-100 dark:border-slate-800 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-4 py-3 md:px-8">
          <div className="flex items-center justify-between gap-3">
            <Link href="/" className="flex items-center gap-3">
              <div className="relative flex h-10 w-10 items-center justify-center rounded-xl overflow-hidden shadow-sm">
                <Image src="/logo.png" alt="QuizForge Logo" width={40} height={40} className="object-cover" />
              </div>
              <div className="leading-tight">
                <div className="text-sm font-bold text-indigo-950 dark:text-slate-100">QuizForge AI</div>
                <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Upload → Generate → Simulate</div>
              </div>
            </Link>

            <div className="flex items-center gap-2">
              <ThemeToggle />
              <Link
                href="/upload"
                className="hidden sm:inline-flex bg-white dark:bg-slate-900 hover:bg-indigo-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold px-4 py-2 rounded-lg transition-colors border border-indigo-100 dark:border-slate-800 shadow-sm mr-2"
              >
                Dashboard
              </Link>
              <Link
                href="/upload"
                className="inline-flex bg-primary-600 hover:bg-primary-700 text-white font-bold px-4 py-2 rounded-lg transition-colors shadow-sm"
              >
                New Quiz
              </Link>
              <button
                onClick={() => signOut({ callbackUrl: '/' })}
                className="hidden sm:inline-flex bg-white dark:bg-slate-900 hover:bg-indigo-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold px-4 py-2 rounded-lg transition-colors border border-indigo-100 dark:border-slate-800 shadow-sm ml-2"
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
