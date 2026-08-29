'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { QuizResult } from '@/lib/types';
import ResultsDashboard from '@/components/ResultsDashboard';
import LoadingSpinner from '@/components/LoadingSpinner';
import AppNav from '@/components/AppNav';
import Link from 'next/link';
import { ChevronLeft, Zap, RotateCcw, Share2, Check, Ban } from 'lucide-react';
import { useQuizStore } from '@/store/quiz-store';
import { shuffleQuestions } from '@/lib/quiz-utils';

export default function QuizDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [result, setResult] = useState<QuizResult | null>(null);
  const [loading, setLoading] = useState(true);
  const { startQuiz } = useQuizStore();

  /* ── Share: create a public challenge link + copy to clipboard ── */
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [shareCopied, setShareCopied] = useState(false);
  const [shareBusy, setShareBusy] = useState(false);

  const handleShare = async () => {
    setShareBusy(true);
    try {
      let token = shareToken;
      if (!token) {
        const res = await fetch('/api/share', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ resultId: params.id }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Failed to create link');
        token = data.token;
        setShareToken(token);
      }
      await navigator.clipboard.writeText(`${window.location.origin}/q/${token}`);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2500);
    } catch {
      // clipboard or network failure - button state simply resets
    } finally {
      setShareBusy(false);
    }
  };

  const handleRevoke = async () => {
    if (!shareToken) return;
    if (!confirm('Revoke this link? Anyone with it will lose access (leaderboard is kept).')) return;
    await fetch(`/api/share/${shareToken}`, { method: 'DELETE' });
    setShareToken(null);
    setShareCopied(false);
  };

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
          <div className="flex items-center gap-2 self-start sm:self-auto">
            {shareToken && (
              <button
                onClick={handleRevoke}
                aria-label="Revoke share link"
                className="flex items-center gap-1.5 bg-white/5 border border-white/10 text-white/50 hover:text-red-400 hover:border-red-500/30 font-medium px-4 py-2.5 rounded-xl transition-all text-sm cursor-pointer"
              >
                <Ban size={14} />
                Revoke
              </button>
            )}
            <button
              onClick={handleShare}
              disabled={shareBusy}
              className="flex items-center gap-2 bg-white/10 border border-white/20 text-white font-semibold px-5 py-2.5 rounded-xl hover:bg-white/15 disabled:opacity-60 transition-all text-sm cursor-pointer"
            >
              {shareCopied ? <><Check size={15} className="text-green-400" /> Link copied!</> : <><Share2 size={15} /> Share</>}
            </button>
            <button
              onClick={handleRetake}
              className="flex items-center gap-2 bg-white text-black font-semibold px-6 py-2.5 rounded-xl hover:bg-white/90 transition-colors text-sm cursor-pointer"
            >
              <RotateCcw size={15} />
              Retake Quiz
            </button>
          </div>
        </div>

        <ResultsDashboard result={result} onRetake={() => router.push('/upload')} />
      </main>
    </div>
  );
}
