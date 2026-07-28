'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import AppNav from '@/components/AppNav';
import LoadingSpinner from '@/components/LoadingSpinner';
import { Trophy, ChevronRight, AlertCircle, Sparkles } from 'lucide-react';

interface PublicQuestion {
  id: string;
  question: string;
  options: { a: string; b: string; c: string; d: string };
  topic: string;
}

interface LeaderboardEntry {
  name: string;
  score: number;
  total: number;
  at: string;
}

interface ReviewRow {
  question: string;
  yourAnswer: string | null;
  correctAnswer: 'a' | 'b' | 'c' | 'd';
  options: { a: string; b: string; c: string; d: string };
  explanation: string;
  correct: boolean;
}

type Phase = 'intro' | 'quiz' | 'done';

export default function PublicQuizPage() {
  const params = useParams();
  const token = params.token as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [questions, setQuestions] = useState<PublicQuestion[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);

  const [phase, setPhase] = useState<Phase>('intro');
  const [name, setName] = useState('');
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<(string | null)[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [score, setScore] = useState<{ score: number; total: number } | null>(null);
  const [review, setReview] = useState<ReviewRow[]>([]);

  useEffect(() => {
    fetch(`/api/share/${token}`)
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.message || 'Failed to load quiz');
        setTitle(data.title);
        setQuestions(data.questions);
        setLeaderboard(data.leaderboard);
        setAnswers(new Array(data.questions.length).fill(null));
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load quiz'))
      .finally(() => setLoading(false));
  }, [token]);

  const current = questions[index];

  const handleNext = async () => {
    const newAnswers = [...answers];
    newAnswers[index] = selected;
    setAnswers(newAnswers);
    setSelected(null);

    if (index < questions.length - 1) {
      setIndex(index + 1);
      return;
    }

    // Last question — submit for server-side grading
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/share/${token}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), answers: newAnswers }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to submit');
      setScore({ score: data.score, total: data.total });
      setReview(data.review);
      setLeaderboard(data.leaderboard);
      setPhase('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex flex-col">
        <AppNav />
        <div className="flex-1 flex items-center justify-center">
          <LoadingSpinner message="Loading quiz…" />
        </div>
      </div>
    );
  }

  if (error && questions.length === 0) {
    return (
      <div className="min-h-screen bg-black flex flex-col text-white">
        <AppNav />
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="liquid-glass-card rounded-3xl p-12 text-center space-y-4 max-w-md">
            <AlertCircle size={28} className="text-red-400 mx-auto" />
            <p className="text-white/70 text-sm">{error}</p>
            <Link href="/" className="inline-flex bg-white text-black font-semibold px-6 py-2.5 rounded-xl hover:bg-white/90 transition-colors text-sm">
              Go to QuizForge
            </Link>
          </div>
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

        {/* ── Intro ── */}
        {phase === 'intro' && (
          <div className="space-y-6 fade-in">
            <div className="text-center space-y-2">
              <p className="text-white/40 text-xs font-medium uppercase tracking-widest">
                A friend challenged you
              </p>
              <h1 className="font-display text-4xl md:text-5xl text-white tracking-tight">{title}</h1>
              <p className="text-white/50 text-sm">{questions.length} questions · no account needed</p>
            </div>

            <div className="liquid-glass rounded-3xl p-8 space-y-4 max-w-sm mx-auto">
              <div className="space-y-1.5">
                <label htmlFor="player-name" className="text-white/60 text-xs font-medium uppercase tracking-widest">
                  Your name
                </label>
                <input
                  id="player-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={40}
                  placeholder="e.g. Divyansh"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/40 text-sm outline-none focus:border-white/30 focus:bg-white/10 transition-all"
                />
              </div>
              <button
                onClick={() => name.trim() && setPhase('quiz')}
                disabled={!name.trim()}
                className="w-full bg-white text-black font-semibold py-3 rounded-xl hover:bg-white/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer text-sm"
              >
                Start quiz
              </button>
            </div>

            {leaderboard.length > 0 && (
              <Leaderboard entries={leaderboard} highlight={null} />
            )}
          </div>
        )}

        {/* ── Quiz ── */}
        {phase === 'quiz' && current && (
          <div className="space-y-5 fade-in">
            <div className="flex items-center justify-between gap-4">
              <span className="text-white/50 text-sm font-medium tabular-nums">
                {index + 1} <span className="text-white/55">/ {questions.length}</span>
              </span>
              <span className="text-white/40 text-xs uppercase tracking-widest">{title}</span>
            </div>
            <div className="h-px bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-white/70 rounded-full transition-all duration-500"
                style={{ width: `${((index + 1) / questions.length) * 100}%` }}
              />
            </div>

            {error && (
              <div className="liquid-glass rounded-2xl px-4 py-3 flex items-center gap-2.5 text-red-400 text-sm">
                <AlertCircle size={16} className="flex-shrink-0" />
                {error}
              </div>
            )}

            <div className="liquid-glass-card rounded-3xl p-7 space-y-6">
              <div className="space-y-2">
                <p className="text-white/40 text-xs font-medium uppercase tracking-widest">{current.topic}</p>
                <h2 className="text-xl font-semibold text-white leading-relaxed">{current.question}</h2>
              </div>

              <div className="space-y-2.5">
                {(['a', 'b', 'c', 'd'] as const).map((option) => (
                  <button
                    key={option}
                    onClick={() => setSelected(option)}
                    className={`w-full text-left p-4 rounded-2xl border transition-all duration-200 cursor-pointer flex items-center gap-3 ${
                      selected === option
                        ? 'border-white/50 bg-white/10 text-white'
                        : 'border-white/10 bg-white/[0.03] text-white/70 hover:border-white/25 hover:bg-white/[0.07] hover:text-white'
                    }`}
                  >
                    <span className="w-7 h-7 rounded-lg border border-current/30 flex items-center justify-center text-xs font-bold flex-shrink-0 uppercase">
                      {option}
                    </span>
                    <span className="text-sm leading-relaxed">{current.options[option]}</span>
                  </button>
                ))}
              </div>

              <button
                onClick={handleNext}
                disabled={!selected || submitting}
                className="w-full flex items-center justify-center gap-1.5 bg-white text-black font-semibold py-3.5 rounded-xl hover:bg-white/90 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
              >
                {submitting
                  ? 'Scoring…'
                  : index < questions.length - 1
                    ? <>Next <ChevronRight size={15} /></>
                    : 'Finish & see score'}
              </button>
            </div>
          </div>
        )}

        {/* ── Results ── */}
        {phase === 'done' && score && (
          <div className="space-y-6 fade-in">
            <div className="liquid-glass-card rounded-3xl p-10 text-center space-y-3">
              <span className="w-14 h-14 rounded-2xl bg-green-500/10 border border-green-500/20 flex items-center justify-center mx-auto">
                <Sparkles size={22} className="text-green-400" />
              </span>
              <h1 className="font-display text-4xl text-white tracking-tight">
                {score.score}<span className="text-white/55 text-2xl">/{score.total}</span>
              </h1>
              <p className="text-white/50 text-sm">Nice one, {name.trim()}!</p>
              <Link
                href="/register"
                className="inline-flex items-center gap-2 bg-white text-black font-semibold px-6 py-2.5 rounded-xl hover:bg-white/90 transition-colors text-sm mt-2"
              >
                Make your own quiz — free
              </Link>
            </div>

            <Leaderboard entries={leaderboard} highlight={name.trim()} />

            {/* Answer review */}
            <div className="space-y-3">
              <h2 className="text-white/40 text-xs font-medium uppercase tracking-widest">Answer review</h2>
              {review.map((r, i) => (
                <div key={i} className="liquid-glass rounded-2xl p-5 space-y-2">
                  <p className="text-white text-sm font-medium leading-relaxed">
                    {i + 1}. {r.question}
                  </p>
                  <p className={`text-xs ${r.correct ? 'text-green-400' : 'text-red-400'}`}>
                    {r.correct
                      ? `✓ Correct — ${r.correctAnswer.toUpperCase()}) ${r.options[r.correctAnswer]}`
                      : `✗ You picked ${r.yourAnswer ? `${r.yourAnswer.toUpperCase()}) ${r.options[r.yourAnswer as 'a' | 'b' | 'c' | 'd']}` : 'nothing'} — correct: ${r.correctAnswer.toUpperCase()}) ${r.options[r.correctAnswer]}`}
                  </p>
                  {r.explanation && (
                    <p className="text-white/50 text-xs leading-relaxed">{r.explanation}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

/* ── Leaderboard ── */
function Leaderboard({ entries, highlight }: { entries: LeaderboardEntry[]; highlight: string | null }) {
  if (entries.length === 0) return null;
  return (
    <div className="space-y-3">
      <h2 className="text-white/40 text-xs font-medium uppercase tracking-widest flex items-center gap-1.5">
        <Trophy size={12} className="text-amber-400" /> Leaderboard
      </h2>
      <div className="liquid-glass rounded-2xl divide-y divide-white/5">
        {entries.map((e, i) => (
          <div
            key={`${e.name}-${e.at}`}
            className={`flex items-center gap-3 px-5 py-3 ${
              highlight && e.name === highlight ? 'bg-white/[0.05]' : ''
            }`}
          >
            <span className={`w-6 text-center text-sm font-bold tabular-nums ${
              i === 0 ? 'text-amber-400' : i === 1 ? 'text-white/70' : i === 2 ? 'text-amber-700' : 'text-white/40'
            }`}>
              {i + 1}
            </span>
            <span className="flex-1 min-w-0 text-white/80 text-sm truncate">{e.name}</span>
            <span className="text-white font-semibold text-sm tabular-nums">
              {e.score}/{e.total}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
