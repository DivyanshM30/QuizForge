'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AppNav from '@/components/AppNav';
import LoadingSpinner from '@/components/LoadingSpinner';
import { Question, Confidence } from '@/lib/types';
import { Brain, CheckCircle2, Sparkles, ChevronRight, AlertCircle } from 'lucide-react';

interface ReviewQuestion {
  id: string;
  topic: string;
  stage: number;
  question: Question;
}

interface Feedback {
  correct: boolean;
  correctAnswer: 'a' | 'b' | 'c' | 'd';
  explanation: string;
  graduated: boolean;
  nextInDays: number | null;
}

export default function ReviewPage() {
  const { status } = useSession();
  const router = useRouter();

  const [items, setItems] = useState<ReviewQuestion[]>([]);
  const [enabled, setEnabled] = useState(true);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selected, setSelected] = useState<'a' | 'b' | 'c' | 'd' | null>(null);
  const [confidence, setConfidence] = useState<Confidence>(null);
  const [confidenceEnabled, setConfidenceEnabled] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [stats, setStats] = useState({ correct: 0, graduated: 0 });

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login');
  }, [status, router]);

  const fetchDue = useCallback(async () => {
    try {
      const res = await fetch('/api/review/due');
      if (!res.ok) throw new Error('Failed to load reviews');
      const data = await res.json();
      setEnabled(data.enabled !== false);
      setItems(data.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load reviews');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === 'authenticated') fetchDue();
  }, [status, fetchDue]);

  useEffect(() => {
    if (status !== 'authenticated') return;
    fetch('/api/account')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setConfidenceEnabled(Boolean(d?.confidenceEnabled)))
      .catch(() => setConfidenceEnabled(false));
  }, [status]);

  const current = items[index] ?? null;
  const done = !loading && items.length > 0 && index >= items.length;

  const handleSubmit = async () => {
    if (!current || !selected || feedback || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/review/answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemId: current.id,
          answer: selected,
          confidence: confidenceEnabled ? confidence : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to record answer');
      setFeedback(data);
      setStats((s) => ({
        correct: s.correct + (data.correct ? 1 : 0),
        graduated: s.graduated + (data.graduated ? 1 : 0),
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to record answer');
    } finally {
      setSubmitting(false);
    }
  };

  const handleNext = () => {
    setSelected(null);
    setConfidence(null);
    setFeedback(null);
    setIndex((i) => i + 1);
  };

  const optionClass = (option: 'a' | 'b' | 'c' | 'd') => {
    const base =
      'w-full text-left p-4 rounded-2xl border transition-all duration-200 cursor-pointer flex items-center gap-3 ';
    if (feedback) {
      if (option === feedback.correctAnswer) return base + 'border-green-500/60 bg-green-500/10 text-green-300';
      if (option === selected && !feedback.correct) return base + 'border-red-500/60 bg-red-500/10 text-red-300';
      return base + 'border-white/5 bg-white/[0.02] text-white/30';
    }
    if (selected === option) return base + 'border-white/50 bg-white/10 text-white';
    return base + 'border-white/10 bg-white/[0.03] text-white/70 hover:border-white/25 hover:bg-white/[0.07] hover:text-white';
  };

  if (loading || status === 'loading') {
    return (
      <div className="min-h-screen bg-black flex flex-col">
        <AppNav />
        <div className="flex-1 flex items-center justify-center">
          <LoadingSpinner message="Loading your review queue…" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex flex-col text-white">
      {/* Ambient glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[350px] rounded-full bg-white/[0.025] blur-3xl" />
      </div>

      <AppNav />

      <main className="relative z-10 flex-1 max-w-3xl mx-auto w-full px-4 py-8 md:px-6 md:py-10 space-y-6">

        {/* Feature not enabled */}
        {!enabled && (
          <div className="liquid-glass-card rounded-3xl p-12 text-center space-y-4 max-w-xl mx-auto mt-8">
            <span className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto">
              <Brain size={22} className="text-white/40" />
            </span>
            <div className="space-y-1">
              <h1 className="font-display text-3xl text-white tracking-tight">Spaced repetition is off</h1>
              <p className="text-white/50 text-sm">
                Turn it on from your dashboard and missed questions will come back
                for review on a 1 → 3 → 7 → 21 day schedule.
              </p>
            </div>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 bg-white text-black font-semibold px-6 py-2.5 rounded-xl hover:bg-white/90 transition-colors text-sm"
            >
              Go to Dashboard
            </Link>
          </div>
        )}

        {/* Empty queue */}
        {enabled && items.length === 0 && (
          <div className="liquid-glass-card rounded-3xl p-12 text-center space-y-4 max-w-xl mx-auto mt-8">
            <span className="w-14 h-14 rounded-2xl bg-green-500/10 border border-green-500/20 flex items-center justify-center mx-auto">
              <CheckCircle2 size={22} className="text-green-400" />
            </span>
            <div className="space-y-1">
              <h1 className="font-display text-3xl text-white tracking-tight">All caught up</h1>
              <p className="text-white/50 text-sm">
                Nothing due for review. Missed questions from your quizzes will appear here on their schedule.
              </p>
            </div>
            <Link
              href="/upload"
              className="inline-flex items-center gap-2 bg-white text-black font-semibold px-6 py-2.5 rounded-xl hover:bg-white/90 transition-colors text-sm"
            >
              Take a quiz
            </Link>
          </div>
        )}

        {/* Session complete */}
        {done && (
          <div className="liquid-glass-card rounded-3xl p-12 text-center space-y-4 max-w-xl mx-auto mt-8 fade-in">
            <span className="w-14 h-14 rounded-2xl bg-green-500/10 border border-green-500/20 flex items-center justify-center mx-auto">
              <Sparkles size={22} className="text-green-400" />
            </span>
            <div className="space-y-1">
              <h1 className="font-display text-3xl text-white tracking-tight">Review complete</h1>
              <p className="text-white/50 text-sm">
                {stats.correct}/{items.length} correct
                {stats.graduated > 0 && ` · ${stats.graduated} ${stats.graduated === 1 ? 'question' : 'questions'} mastered`}
              </p>
            </div>
            <div className="flex items-center justify-center gap-3">
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 bg-white text-black font-semibold px-6 py-2.5 rounded-xl hover:bg-white/90 transition-colors text-sm"
              >
                Back to Dashboard
              </Link>
            </div>
          </div>
        )}

        {/* Active review */}
        {current && !done && (
          <div className="space-y-5 fade-in">
            {/* Header */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                  <Brain size={15} className="text-white/50" />
                </span>
                <h1 className="text-white font-semibold">Daily Review</h1>
              </div>
              <span className="text-white/50 text-sm font-medium tabular-nums">
                {index + 1} <span className="text-white/55">/ {items.length}</span>
              </span>
            </div>

            {/* Progress */}
            <div className="h-px bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-white/70 rounded-full transition-all duration-500"
                style={{ width: `${((index + (feedback ? 1 : 0)) / items.length) * 100}%` }}
              />
            </div>

            {error && (
              <div className="liquid-glass rounded-2xl px-4 py-3 flex items-center gap-2.5 text-red-400 text-sm">
                <AlertCircle size={16} className="flex-shrink-0" />
                {error}
              </div>
            )}

            {/* Question card */}
            <div className="liquid-glass-card rounded-3xl p-7 space-y-6">
              <div className="space-y-2">
                <p className="text-white/40 text-xs font-medium uppercase tracking-widest">
                  {current.topic} · missed before
                </p>
                <h2 className="text-xl font-semibold text-white leading-relaxed">
                  {current.question.question}
                </h2>
              </div>

              <div className="space-y-2.5">
                {(['a', 'b', 'c', 'd'] as const).map((option) => (
                  <button
                    key={option}
                    onClick={() => !feedback && setSelected(option)}
                    disabled={Boolean(feedback)}
                    className={optionClass(option)}
                  >
                    <span className="w-7 h-7 rounded-lg border border-current/30 flex items-center justify-center text-xs font-bold flex-shrink-0 uppercase">
                      {option}
                    </span>
                    <span className="text-sm leading-relaxed">{current.question.options[option]}</span>
                    {feedback && option === feedback.correctAnswer && (
                      <span className="ml-auto text-green-400 text-lg leading-none">✓</span>
                    )}
                    {feedback && option === selected && !feedback.correct && (
                      <span className="ml-auto text-red-400 text-lg leading-none">✗</span>
                    )}
                  </button>
                ))}
              </div>

              {/* Confidence capture (opt-in) */}
              {confidenceEnabled && !feedback && (
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <span id="review-confidence-label" className="text-white/40 text-xs font-medium uppercase tracking-widest">
                    How confident are you?
                  </span>
                  <div role="group" aria-labelledby="review-confidence-label" className="flex items-center gap-2">
                    {(['sure', 'unsure'] as const).map((level) => (
                      <button
                        key={level}
                        onClick={() => setConfidence(confidence === level ? null : level)}
                        aria-pressed={confidence === level}
                        className={`px-4 py-1.5 rounded-full text-xs font-semibold capitalize transition-all cursor-pointer border ${
                          confidence === level
                            ? level === 'sure'
                              ? 'bg-green-500/15 border-green-500/40 text-green-300'
                              : 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                            : 'bg-white/5 border-white/10 text-white/50 hover:text-white hover:bg-white/10'
                        }`}
                      >
                        {level}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Feedback / actions */}
              {feedback ? (
                <div className="space-y-4">
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-2">
                    <p className={`text-sm font-semibold ${feedback.correct ? 'text-green-400' : 'text-red-400'}`}>
                      {feedback.correct
                        ? feedback.graduated
                          ? 'Correct - mastered! This one is retired from review. 🎉'
                          : `Correct - next review in ${feedback.nextInDays} ${feedback.nextInDays === 1 ? 'day' : 'days'}`
                        : 'Incorrect - back to the start of the ladder, due again tomorrow'}
                    </p>
                    {feedback.explanation && (
                      <p className="text-white/60 text-sm leading-relaxed">{feedback.explanation}</p>
                    )}
                  </div>
                  <button
                    onClick={handleNext}
                    className="w-full flex items-center justify-center gap-1.5 bg-white text-black font-semibold py-3.5 rounded-xl hover:bg-white/90 transition-all cursor-pointer"
                  >
                    {index < items.length - 1 ? <>Next <ChevronRight size={15} /></> : 'Finish review'}
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={!selected || submitting}
                  className="w-full bg-white text-black font-semibold py-3.5 rounded-xl hover:bg-white/90 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
                >
                  {submitting ? 'Checking…' : 'Submit Answer'}
                </button>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
