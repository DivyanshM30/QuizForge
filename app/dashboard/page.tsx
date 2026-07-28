'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import {
  Trophy, Target, Clock, Zap, ChevronRight,
  Upload, Sparkles, X, Loader2, FileText, Flame, Brain, CheckCircle2, AlertTriangle, Flashlight,
} from 'lucide-react';
import Link from 'next/link';
import { formatTime, accuracyTextClass, shuffleQuestions } from '@/lib/quiz-utils';
import { useQuizStore } from '@/store/quiz-store';
import { useHistory } from '@/hooks/useHistory';
import { useFileUpload } from '@/hooks/useFileUpload';
import AppNav from '@/components/AppNav';

/* Recharts is lazy-loaded so it stays out of the dashboard's initial bundle. */
const DashboardCharts = dynamic(() => import('@/components/charts/DashboardCharts'), {
  ssr: false,
  loading: () => (
    <div className="grid md:grid-cols-2 gap-4">
      <div className="liquid-glass rounded-2xl h-[248px] animate-pulse" />
      <div className="liquid-glass rounded-2xl h-[248px] animate-pulse" />
    </div>
  ),
});

/* ─── Stat Card ──────────────────────────────────────────── */
interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  subtext?: string;
  color: string;
  delay?: number;
}

function StatCard({ icon, label, value, subtext, color, delay = 0 }: StatCardProps) {
  return (
    <div
      className="liquid-glass rounded-2xl p-5 space-y-3 animate-fade-in-up"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center justify-between">
        <span className="text-white/40 text-xs font-medium uppercase tracking-widest">{label}</span>
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${color}`}>
          {icon}
        </div>
      </div>
      <div>
        <div className="text-3xl font-bold text-white tabular-nums">{value}</div>
        {subtext && <p className="text-white/30 text-xs mt-0.5">{subtext}</p>}
      </div>
    </div>
  );
}

/* ─── Component ──────────────────────────────────────────── */
export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const { history, isLoading } = useHistory({ enabled: status === 'authenticated' });

  const {
    fileInputRef,
    selectedFileRef,
    fileName,
    isDragging,
    uploadState,
    isBusy,
    handleGenerate,
    onFileChange,
    onDragOver,
    onDragLeave,
    onDrop,
    clearFile,
    pillLabel,
  } = useFileUpload();

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login');
  }, [status, router]);

  /* ── Daily Review queue (opt-in) ── */
  const [review, setReview] = useState<{ enabled: boolean; dueCount: number } | null>(null);
  const [enabling, setEnabling] = useState(false);
  useEffect(() => {
    if (status !== 'authenticated') return;
    fetch('/api/review/due')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setReview(d ? { enabled: d.enabled, dueCount: d.dueCount } : null))
      .catch(() => setReview(null));
  }, [status]);

  /* ── Feature banner: announces Smart Review + confidence tracking (on by
     default), dismissible once (remembered in localStorage). */
  const [showBanner, setShowBanner] = useState(false);
  useEffect(() => {
    if (!review) { setShowBanner(false); return; }
    setShowBanner(!localStorage.getItem('features-banner-dismissed'));
  }, [review]);

  const dismissBanner = useCallback(() => {
    localStorage.setItem('features-banner-dismissed', '1');
    setShowBanner(false);
  }, []);

  /* ── Cram Mode: build a quiz from past mistakes + weak topics ── */
  const { startQuiz } = useQuizStore();
  const [cramCount, setCramCount] = useState<10 | 20 | 30>(10);
  const [cramLoading, setCramLoading] = useState(false);
  const [cramError, setCramError] = useState<string | null>(null);

  const handleCram = async () => {
    setCramLoading(true);
    setCramError(null);
    try {
      const res = await fetch(`/api/cram?count=${cramCount}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to build cram quiz');
      const questions = shuffleQuestions(data.questions);
      startQuiz(questions, {
        numQuestions: questions.length,
        timeLimit: Math.max(5, Math.ceil(questions.length * 1)),
        difficulty: 'mixed',
        cram: true,
      });
      router.push('/upload?step=quiz');
    } catch (err) {
      setCramError(err instanceof Error ? err.message : 'Failed to build cram quiz');
      setCramLoading(false);
    }
  };

  const handleEnableReview = async () => {
    setEnabling(true);
    try {
      const res = await fetch('/api/account', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewEnabled: true }),
      });
      if (res.ok) setReview({ enabled: true, dueCount: 0 });
    } finally {
      setEnabling(false);
    }
  };

  /* ── Analytics computation (memoized; only recomputes when history changes) ── */
  const {
    totalQuizzes, avgScore, topScore, totalQuestions, totalCorrect,
    avgTime, streak, performanceData, topicAggregated,
    confidentlyWrong, confidenceRated, calibrationTopics,
  } = useMemo(() => {
    const totalQuizzes = history.length;
    const avgScore = totalQuizzes > 0
      ? Math.round(history.reduce((sum, q) => sum + q.accuracy, 0) / totalQuizzes)
      : 0;
    const topScore = totalQuizzes > 0
      ? Math.max(...history.map(q => q.accuracy))
      : 0;
    const totalQuestions = history.reduce((sum, q) => sum + q.totalQuestions, 0);
    const totalCorrect = history.reduce((sum, q) => sum + q.score, 0);
    const avgTime = totalQuizzes > 0
      ? Math.round(history.reduce((sum, q) => sum + q.timeTaken, 0) / totalQuizzes)
      : 0;

    /* streak: consecutive quizzes with accuracy >= 60 (most recent first) */
    let streak = 0;
    for (const q of history) {
      if (q.accuracy >= 60) streak++;
      else break;
    }

    /* Performance over time (last 10 quizzes, chronological) */
    const performanceData = [...history]
      .reverse()
      .slice(-10)
      .map((q, i) => ({
        quiz: `#${i + 1}`,
        accuracy: q.accuracy,
        score: q.score,
        total: q.totalQuestions,
      }));

    /* Topic aggregation across all quizzes */
    const map = new Map<string, { correct: number; total: number }>();
    history.forEach(q => {
      q.topicPerformance?.forEach(tp => {
        const existing = map.get(tp.topic) || { correct: 0, total: 0 };
        existing.correct += tp.correct;
        existing.total += tp.total;
        map.set(tp.topic, existing);
      });
    });
    const topicAggregated = Array.from(map.entries())
      .map(([topic, stats]) => ({
        topic: topic.length > 16 ? topic.slice(0, 16) + '…' : topic,
        fullTopic: topic,
        percentage: Math.round((stats.correct / stats.total) * 100),
        correct: stats.correct,
        total: stats.total,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);

    /* Calibration: confidently-wrong answers (needs confidence tracking on) */
    const calibrationMap = new Map<string, number>();
    let confidentlyWrong = 0;
    let confidenceRated = 0;
    history.forEach(q => {
      if (!q.confidences) return;
      q.questions?.forEach((question, i) => {
        const conf = q.confidences?.[i];
        if (!conf) return;
        confidenceRated++;
        if (conf === 'sure' && q.userAnswers?.[i] !== question.correctAnswer) {
          confidentlyWrong++;
          const topic = question.topic || 'General';
          calibrationMap.set(topic, (calibrationMap.get(topic) || 0) + 1);
        }
      });
    });
    const calibrationTopics = Array.from(calibrationMap.entries())
      .map(([topic, count]) => ({ topic, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      totalQuizzes, avgScore, topScore, totalQuestions, totalCorrect,
      avgTime, streak, performanceData, topicAggregated,
      confidentlyWrong, confidenceRated, calibrationTopics,
    };
  }, [history]);

  /* ── Loading state ── */
  if (isLoading || status === 'loading') {
    return (
      <div className="min-h-screen bg-black flex flex-col text-white">
        <AppNav />
        <div className="flex-1 flex items-center justify-center">
          <div className="w-10 h-10 border-2 border-white/10 border-t-white/60 rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex flex-col text-white">
      {/* Ambient glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[450px] rounded-full bg-white/[0.02] blur-3xl" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[300px] rounded-full bg-indigo-500/[0.03] blur-3xl" />
      </div>

      <AppNav />

      <main className="relative z-10 flex-1 max-w-6xl mx-auto w-full px-4 py-6 md:px-6 md:py-8 space-y-8">

        {/* ── Feature notification banner (dismissible) ── */}
        {showBanner && (
          <div className="liquid-glass rounded-xl px-4 py-2.5 flex items-center gap-3 animate-fade-in border-l-2 border-amber-500/50 -mb-3">
            <Brain size={15} className="text-amber-400 flex-shrink-0" />
            <p className="flex-1 min-w-0 text-white/70 text-sm truncate">
              <span className="text-white font-medium">New:</span> Smart Review re-quizzes missed questions on a spaced schedule, and confidence tracking finds your dangerous gaps.{' '}
              <Link href="/settings" className="text-amber-400 hover:text-amber-300 font-medium underline underline-offset-2 transition-colors">
                Manage in Settings
              </Link>
            </p>
            <button
              onClick={dismissBanner}
              aria-label="Dismiss notification"
              className="w-7 h-7 rounded-lg flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all cursor-pointer flex-shrink-0"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* ── Page Header ── */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 animate-fade-in">
          <div className="space-y-1">
            <h1 className="font-display text-4xl md:text-5xl text-white tracking-tight">
              Dashboard
            </h1>
            <p className="text-white/40 text-sm">
              {session?.user?.name ? `Welcome back, ${session.user.name}` : 'Your performance at a glance'}
            </p>
          </div>
          <Link
            href="/upload"
            className="flex items-center gap-2 bg-white text-black font-semibold px-6 py-2.5 rounded-xl hover:bg-white/90 transition-colors text-sm cursor-pointer self-start md:self-auto"
          >
            <Zap size={15} />
            New Quiz
          </Link>
        </div>

        {/* ── Stat Cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard
            icon={<Target size={16} className="text-blue-400" />}
            label="Avg Score"
            value={`${avgScore}%`}
            subtext={`${totalQuizzes} quizzes taken`}
            color="bg-blue-500/10"
            delay={0}
          />
          <StatCard
            icon={<Trophy size={16} className="text-amber-400" />}
            label="Top Score"
            value={`${topScore}%`}
            subtext={`${totalCorrect}/${totalQuestions} correct overall`}
            color="bg-amber-500/10"
            delay={50}
          />
          <StatCard
            icon={<Clock size={16} className="text-emerald-400" />}
            label="Avg Time"
            value={formatTime(avgTime)}
            subtext="per quiz"
            color="bg-emerald-500/10"
            delay={100}
          />
          <StatCard
            icon={<Flame size={16} className="text-orange-400" />}
            label="Streak"
            value={streak}
            subtext={streak > 0 ? `${streak} passing quizzes in a row` : 'Take a quiz to start!'}
            color="bg-orange-500/10"
            delay={150}
          />
        </div>

        {/* ── Charts Row ── */}
        {totalQuizzes > 0 && (
          <DashboardCharts performanceData={performanceData} topicAggregated={topicAggregated} />
        )}

        {/* ── Daily Review (opt-in) ── */}
        {review !== null && (
          <div className="animate-fade-in" style={{ animationDelay: '200ms' }}>
            <div className="flex items-center gap-2 mb-3">
              <Brain size={14} className="text-white/40" />
              <h2 className="text-white/40 text-xs font-medium uppercase tracking-widest">
                Daily Review
              </h2>
            </div>
            <div className="liquid-glass rounded-2xl px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3">
              {!review.enabled ? (
                <>
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <span className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0">
                      <Brain size={16} className="text-white/50" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-white font-medium text-sm">Spaced repetition is off</p>
                      <p className="text-white/40 text-xs">
                        Enable it and questions you miss will come back for review on a
                        1 → 3 → 7 → 21 day schedule until you master them
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleEnableReview}
                    disabled={enabling}
                    className="flex items-center gap-1.5 bg-white text-black font-semibold px-5 py-2 rounded-xl hover:bg-white/90 disabled:opacity-60 transition-all text-sm cursor-pointer flex-shrink-0 self-start sm:self-auto"
                  >
                    {enabling ? 'Enabling…' : 'Enable spaced repetition'}
                  </button>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <span className={`w-10 h-10 rounded-xl border flex items-center justify-center flex-shrink-0 ${
                      review.dueCount > 0
                        ? 'bg-amber-500/10 border-amber-500/20'
                        : 'bg-green-500/10 border-green-500/20'
                    }`}>
                      {review.dueCount > 0
                        ? <Brain size={16} className="text-amber-400" />
                        : <CheckCircle2 size={16} className="text-green-400" />}
                    </span>
                    <div className="min-w-0">
                      <p className="text-white font-medium text-sm">
                        {review.dueCount > 0
                          ? `${review.dueCount} ${review.dueCount === 1 ? 'question' : 'questions'} due for review`
                          : 'All caught up'}
                      </p>
                      <p className="text-white/40 text-xs">
                        {review.dueCount > 0
                          ? 'Spaced repetition of questions you missed — a few minutes locks them in'
                          : 'Missed questions come back on a 1 → 3 → 7 → 21 day schedule'}
                      </p>
                    </div>
                  </div>
                  {review.dueCount > 0 && (
                    <Link
                      href="/review"
                      className="flex items-center gap-1.5 bg-white text-black font-semibold px-5 py-2 rounded-xl hover:bg-white/90 transition-all text-sm cursor-pointer flex-shrink-0 self-start sm:self-auto"
                    >
                      Start review <ChevronRight size={14} />
                    </Link>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* ── Calibration: dangerous gaps (confidence tracking) ── */}
        {confidenceRated > 0 && (
          <div className="animate-fade-in" style={{ animationDelay: '225ms' }}>
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle size={14} className="text-white/40" />
              <h2 className="text-white/40 text-xs font-medium uppercase tracking-widest">
                Dangerous Gaps
              </h2>
            </div>
            <div className="liquid-glass rounded-2xl px-5 py-4">
              {confidentlyWrong === 0 ? (
                <div className="flex items-center gap-4">
                  <span className="w-10 h-10 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 size={16} className="text-green-400" />
                  </span>
                  <div>
                    <p className="text-white font-medium text-sm">Well calibrated</p>
                    <p className="text-white/40 text-xs">
                      No confidently-wrong answers yet — when you&apos;re sure, you&apos;re right
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-4">
                    <span className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center flex-shrink-0">
                      <AlertTriangle size={16} className="text-red-400" />
                    </span>
                    <div>
                      <p className="text-white font-medium text-sm">
                        {confidentlyWrong} {confidentlyWrong === 1 ? 'answer' : 'answers'} you were sure about — and got wrong
                      </p>
                      <p className="text-white/40 text-xs">
                        These are your most dangerous gaps: you don&apos;t know that you don&apos;t know them
                      </p>
                    </div>
                  </div>
                  {calibrationTopics.length > 0 && (
                    <div className="flex flex-wrap gap-2 pl-14">
                      {calibrationTopics.map(({ topic, count }) => (
                        <span
                          key={topic}
                          className="px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-300 text-xs font-medium"
                        >
                          {topic} · {count}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Cram Mode ── */}
        {totalQuizzes > 0 && (
          <div className="animate-fade-in" style={{ animationDelay: '235ms' }}>
            <div className="flex items-center gap-2 mb-3">
              <Flashlight size={14} className="text-white/40" />
              <h2 className="text-white/40 text-xs font-medium uppercase tracking-widest">
                Cram Mode
              </h2>
            </div>
            <div className="liquid-glass rounded-2xl px-5 py-4 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <span className="w-10 h-10 rounded-xl bg-fuchsia-500/10 border border-fuchsia-500/20 flex items-center justify-center flex-shrink-0">
                    <Flashlight size={16} className="text-fuchsia-400" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-white font-medium text-sm">Cram your weak spots</p>
                    <p className="text-white/40 text-xs">
                      A quiz built only from questions you missed and topics under 60% — study exactly what you don&apos;t know
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 self-start sm:self-auto">
                  <div role="group" aria-label="Cram quiz length" className="flex items-center gap-1">
                    {([10, 20, 30] as const).map((n) => (
                      <button
                        key={n}
                        onClick={() => setCramCount(n)}
                        aria-pressed={cramCount === n}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold tabular-nums transition-all cursor-pointer border ${
                          cramCount === n
                            ? 'bg-white text-black border-white'
                            : 'bg-white/5 border-white/10 text-white/50 hover:text-white hover:bg-white/10'
                        }`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={handleCram}
                    disabled={cramLoading}
                    className="flex items-center gap-1.5 bg-white text-black font-semibold px-5 py-2 rounded-xl hover:bg-white/90 disabled:opacity-60 transition-all text-sm cursor-pointer"
                  >
                    {cramLoading ? <><Loader2 size={14} className="animate-spin" /> Building…</> : 'Start cram'}
                  </button>
                </div>
              </div>
              {cramError && (
                <p className="text-amber-400/90 text-xs pl-14">{cramError}</p>
              )}
            </div>
          </div>
        )}

        {/* ── New Quiz Upload ── */}
        <div className="animate-fade-in" style={{ animationDelay: '250ms' }}>
          <div className="flex items-center gap-2 mb-3">
            <Sparkles size={14} className="text-white/40" />
            <h2 className="text-white/40 text-xs font-medium uppercase tracking-widest">
              Start a New Quiz
            </h2>
          </div>
          <div
            className={`liquid-glass rounded-2xl pl-5 pr-2 py-3 flex items-center gap-3 transition-all duration-200 cursor-pointer ${
              isDragging ? 'ring-1 ring-white/30 bg-white/5' : 'hover:bg-white/[0.03]'
            } ${uploadState === 'error' ? 'ring-1 ring-red-500/40' : ''}`}
            role="button"
            tabIndex={0}
            aria-label="Upload study material — PDF or DOCX"
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            onClick={() => !isBusy && fileInputRef.current?.click()}
            onKeyDown={(e) => {
              if ((e.key === 'Enter' || e.key === ' ') && !isBusy) {
                e.preventDefault();
                fileInputRef.current?.click();
              }
            }}
          >
            {isBusy ? (
              <Loader2 size={18} className="text-white/50 flex-shrink-0 animate-spin" />
            ) : (
              <Upload size={18} className={`flex-shrink-0 transition-colors ${fileName ? 'text-white/60' : 'text-white/40'}`} />
            )}
            <span
              className={`flex-1 text-sm text-left truncate min-w-0 select-none ${
                uploadState === 'error' ? 'text-red-400' :
                (fileName || isBusy) ? 'text-white' : 'text-white/40'
              }`}
            >
              {pillLabel()}
            </span>
            {fileName && !isBusy && (
              <button
                onClick={(e) => { e.stopPropagation(); clearFile(); }}
                className="text-white/30 hover:text-white/60 transition-colors p-1 cursor-pointer flex-shrink-0"
                aria-label="Clear file"
              >
                <X size={14} />
              </button>
            )}
            <button
              aria-label="Generate quiz from file"
              disabled={isBusy}
              onClick={(e) => { e.stopPropagation(); handleGenerate(); }}
              className={`rounded-full px-5 py-2 text-sm font-semibold transition-all flex-shrink-0 flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${
                selectedFileRef.current && !isBusy && uploadState !== 'error'
                  ? 'bg-white text-black hover:bg-white/90 shadow-[0_0_20px_rgba(255,255,255,0.15)]'
                  : 'bg-white/10 text-white/70 hover:bg-white/15'
              }`}
            >
              {isBusy ? (
                <><Loader2 size={15} className="animate-spin" /> Working…</>
              ) : selectedFileRef.current ? (
                <><Sparkles size={15} /> Generate</>
              ) : (
                <>Browse</>
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx"
              className="hidden"
              aria-label="Upload study material"
              onChange={onFileChange}
            />
          </div>
        </div>

        {/* ── Recent History ── */}
        <div className="animate-fade-in" style={{ animationDelay: '300ms' }}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Clock size={14} className="text-white/40" />
              <h2 className="text-white/40 text-xs font-medium uppercase tracking-widest">
                Recent Quizzes
              </h2>
            </div>
            {history.length > 5 && (
              <Link
                href="/history"
                className="text-white/30 hover:text-white/60 text-xs font-medium transition-colors flex items-center gap-1"
              >
                View all <ChevronRight size={12} />
              </Link>
            )}
          </div>

          {history.length === 0 ? (
            <div className="liquid-glass rounded-2xl p-12 text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto">
                <FileText size={22} className="text-white/30" />
              </div>
              <div className="space-y-1">
                <h3 className="text-white font-medium">No quizzes yet</h3>
                <p className="text-white/40 text-sm">Upload a document above to start your first quiz.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {history.slice(0, 5).map((quiz) => (
                <div
                  key={quiz.id}
                  className="liquid-glass rounded-2xl px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3 hover:bg-white/[0.03] transition-colors"
                >
                  <div className="flex-1 min-w-0 flex items-center gap-4">
                    <span className={`text-2xl font-bold tabular-nums ${accuracyTextClass(quiz.accuracy)}`}>
                      {quiz.accuracy}%
                    </span>
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-white/50 text-sm">
                          {quiz.score}/{quiz.totalQuestions} correct
                        </span>
                        <span className="text-white/40 text-xs">•</span>
                        <span className="text-white/30 text-sm tabular-nums">
                          {formatTime(quiz.timeTaken)}
                        </span>
                      </div>
                      <p className="text-white/55 text-xs tabular-nums">
                        {new Date(quiz.createdAt || quiz.timestamp || Date.now()).toLocaleDateString(undefined, {
                          month: 'short', day: 'numeric', year: 'numeric',
                        })}
                      </p>
                    </div>
                  </div>
                  <Link
                    href={`/history/${quiz.id}`}
                    className="flex items-center gap-1 text-white/40 hover:text-white/70 text-sm font-medium transition-colors px-3 py-1.5 rounded-lg hover:bg-white/5"
                  >
                    Details <ChevronRight size={14} />
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>

      </main>
    </div>
  );
}
