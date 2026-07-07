'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import QuizHistory from '@/components/QuizHistory';
import AppNav from '@/components/AppNav';

export default function HistoryPage() {
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login');
  }, [status, router]);

  return (
    <div className="min-h-screen bg-black flex flex-col text-white">
      {/* Ambient glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[350px] rounded-full bg-white/[0.025] blur-3xl" />
      </div>

      <AppNav />

      <main className="relative z-10 flex-1 max-w-5xl mx-auto w-full px-4 py-8 md:px-6 md:py-10">
        <div className="mb-8 text-center space-y-1">
          <h1
            className="font-display text-4xl md:text-5xl text-white tracking-tight"
          >
            Your quiz history
          </h1>
          <p className="text-white/50 text-sm">
            Review past attempts, track your progress
          </p>
        </div>
        <QuizHistory />
      </main>
    </div>
  );
}
