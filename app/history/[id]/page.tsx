'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { QuizResult } from '@/lib/types';
import ResultsDashboard from '@/components/ResultsDashboard';
import LoadingSpinner from '@/components/LoadingSpinner';
import AppNav from '@/components/AppNav';
import Link from 'next/link';
import { ChevronLeft, Zap, RotateCcw } from 'lucide-react';
import { useQuizStore } from '@/store/quiz-store';
import { shuffleQuestions } from '@/lib/quiz-utils';

export default function QuizDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [result, setResult] = useState<QuizResult | null>(null);
  const [loading, setLoading] = useState(true);
  const { startQuiz } = useQuizStore();

  /* Retake: same questions, freshly shuffled (order + option positions). */
  const handleRetake = () => {
    if (!result) return;
    startQuiz(shuffleQuestions(result.questions), result.config);
    router.push('/upload?step=quiz');
  };

  useEffect(() => {
    const fetchQuiz = async () => {
      try {
        const res = await fetch(`/api/history/${params.id}`);
        if (!res.ok) { router.push('/history'); return; }
        setResult(await res.json());
      } catch {
        router.push('/history');
      } finally {
        setLoading(false);
      }
    };
    fetchQuiz();
  }, [params.id, router]);

  const navActions = (
    <Link
      href="/upload"
      className="flex items-center gap-1.5 liquid-glass rounded-full px-4 py-1.5 text-white text-sm font-medium hover:bg-white/5 transition-colors"
    >
      <Zap size={14} />
      New Quiz
    </Link>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex flex-col">
        <AppNav actions={navActions} />
        <div className="flex-1 flex items-center justify-center">
          <LoadingSpinner message="Loading quiz results…" />
        </div>
      </div>
    );
  }

  if (!result) return null;

  return (
    <div className="min-h-screen bg-black flex flex-col text-white">
      {/* Ambient glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[350px] rounded-full bg-white/[0.025] blur-3xl" />
      </div>

      <AppNav actions={navActions} />

      <main className="relative z-10 flex-1 max-w-5xl mx-auto w-full px-4 py-6 md:px-6 space-y-6">
        {/* Back link */}
        <Link
          href="/history"
          className="inline-flex items-center gap-1.5 text-white/40 hover:text-white/80 text-sm transition-colors"
        >
          <ChevronLeft size={15} />
          Back to History
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div className="space-y-1">
            <h1
              className="font-display text-4xl text-white tracking-tight"
            >
              Quiz Results
            </h1>
            <p className="text-white/40 text-sm">Detailed breakdown of your attempt</p>
          </div>
          <button
            onClick={handleRetake}
            className="flex items-center gap-2 bg-white text-black font-semibold px-6 py-2.5 rounded-xl hover:bg-white/90 transition-colors text-sm cursor-pointer self-start sm:self-auto"
          >
            <RotateCcw size={15} />
            Retake Quiz
          </button>
        </div>

        <ResultsDashboard result={result} onRetake={() => router.push('/upload')} />
      </main>
    </div>
  );
}
