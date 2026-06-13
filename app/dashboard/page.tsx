'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, AreaChart, Area, LineChart, Line,
} from 'recharts';
import {
  TrendingUp, Trophy, Target, Clock, Zap, ChevronRight,
  Upload, Sparkles, X, Loader2, FileText, Flame, BarChart3,
} from 'lucide-react';
import Link from 'next/link';
import { QuizResult } from '@/lib/types';
import { formatTime } from '@/lib/quiz-utils';
import { validateFile } from '@/lib/file-validation';
import { useQuizStore } from '@/store/quiz-store';
import AppNav from '@/components/AppNav';

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

/* ─── Accuracy color helper ──────────────────────────────── */
const accuracyColor = (acc: number) =>
  acc >= 80 ? 'text-green-400' : acc >= 60 ? 'text-yellow-400' : 'text-red-400';

const getBarColor = (pct: number) =>
  pct >= 80 ? '#4ade80' : pct >= 60 ? '#facc15' : '#f87171';

/* ─── Component ──────────────────────────────────────────── */
export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const selectedFileRef = useRef<File | null>(null);
  const { setDocumentText } = useQuizStore();

  const [history, setHistory] = useState<QuizResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Upload state
  const [fileName, setFileName] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadState, setUploadState] = useState<'idle' | 'uploading' | 'analyzing' | 'error'>('idle');
  const [uploadError, setUploadError] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login');
  }, [status, router]);

  const fetchHistory = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/history');
      if (!res.ok) throw new Error('Failed to fetch history');
      const data = await res.json();
      setHistory(data);
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === 'authenticated') fetchHistory();
  }, [status, fetchHistory]);

  /* ── Analytics computation ── */
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
  const streak = (() => {
    let count = 0;
    for (const q of history) {
      if (q.accuracy >= 60) count++;
      else break;
    }
    return count;
  })();

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
  const topicAggregated = (() => {
    const map = new Map<string, { correct: number; total: number }>();
    history.forEach(q => {
      q.topicPerformance?.forEach(tp => {
        const existing = map.get(tp.topic) || { correct: 0, total: 0 };
        existing.correct += tp.correct;
        existing.total += tp.total;
        map.set(tp.topic, existing);
      });
    });
    return Array.from(map.entries())
      .map(([topic, stats]) => ({
        topic: topic.length > 16 ? topic.slice(0, 16) + '…' : topic,
        fullTopic: topic,
        percentage: Math.round((stats.correct / stats.total) * 100),
        correct: stats.correct,
        total: stats.total,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);
  })();

  /* ── File upload handlers (mirrored from HeroSection) ── */
  const processFile = useCallback(async (file: File) => {
    const validation = validateFile(file);
    if (!validation.valid) {
      setUploadError(validation.error || 'Invalid file');
      setUploadState('error');
      return;
    }
    setFileName(file.name);
    setUploadError(null);
    setUploadState('uploading');
    try {
      const formData = new FormData();
      formData.append('file', file);
      setUploadState('analyzing');
      const res = await fetch('/api/analyze-document', { method: 'POST', body: formData });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to analyze document');
      }
      const data = await res.json();
      setDocumentText(data.text);
      router.push('/upload?step=config');
    } catch (err: any) {
      setUploadError(err.message || 'Upload failed');
      setUploadState('error');
    }
  }, [router, setDocumentText]);

  const selectFile = (file: File) => {
    const validation = validateFile(file);
    if (!validation.valid) {
      setUploadError(validation.error || 'Invalid file');
      setUploadState('error');
      selectedFileRef.current = null;
      return;
    }
    selectedFileRef.current = file;
    setFileName(file.name);
    setUploadState('idle');
    setUploadError(null);
  };

  const handleGenerate = () => {
    if (isBusy) return;
    if (uploadState === 'error') {
      setUploadState('idle');
      setFileName(null);
      selectedFileRef.current = null;
      return;
    }
    if (selectedFileRef.current) {
      processFile(selectedFileRef.current);
    } else {
      fileInputRef.current?.click();
    }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) selectFile(file);
    e.target.value = '';
  };

  const onDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const onDragLeave = () => setIsDragging(false);
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) selectFile(file);
  };

  const isBusy = uploadState === 'uploading' || uploadState === 'analyzing';

  const pillLabel = () => {
    if (uploadState === 'uploading') return 'Uploading…';
    if (uploadState === 'analyzing') return 'Reading document…';
    if (uploadState === 'error') return uploadError ?? 'Upload failed — click Generate to retry';
    return fileName ?? 'Drop your PDF, DOCX, or click to browse…';
  };

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

        {/* ── Page Header ── */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 animate-fade-in">
          <div className="space-y-1">
            <h1
              className="text-4xl md:text-5xl text-white tracking-tight"
              style={{ fontFamily: "'Instrument Serif', serif" }}
            >
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
          <div className="grid md:grid-cols-2 gap-4 animate-fade-in" style={{ animationDelay: '200ms' }}>

            {/* Accuracy over time */}
            <div className="liquid-glass rounded-2xl p-5 space-y-4">
              <div className="flex items-center gap-2">
                <TrendingUp size={14} className="text-white/40" />
                <span className="text-white/40 text-xs font-medium uppercase tracking-widest">
                  Accuracy Over Time
                </span>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={performanceData} margin={{ top: 4, right: 4, bottom: 4, left: -20 }}>
                  <defs>
                    <linearGradient id="accGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#818cf8" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#818cf8" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="2 4" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis
                    dataKey="quiz"
                    stroke="rgba(255,255,255,0.15)"
                    tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }}
                  />
                  <YAxis
                    stroke="rgba(255,255,255,0.15)"
                    tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }}
                    domain={[0, 100]}
                    width={35}
                  />
                  <Tooltip
                    contentStyle={{
                      background: 'rgba(0,0,0,0.85)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '12px',
                      color: 'white',
                      fontSize: 12,
                    }}
                    formatter={(value: number) => [`${value}%`, 'Accuracy']}
                  />
                  <Area
                    type="monotone"
                    dataKey="accuracy"
                    stroke="#818cf8"
                    strokeWidth={2}
                    fill="url(#accGradient)"
                    dot={{ r: 3, fill: '#818cf8', stroke: '#818cf8' }}
                    activeDot={{ r: 5, fill: '#a5b4fc' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Topic mastery */}
            {topicAggregated.length > 0 && (
              <div className="liquid-glass rounded-2xl p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <BarChart3 size={14} className="text-white/40" />
                  <span className="text-white/40 text-xs font-medium uppercase tracking-widest">
                    Topic Mastery
                  </span>
                </div>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={topicAggregated} margin={{ top: 4, right: 4, bottom: 50, left: -20 }}>
                    <CartesianGrid strokeDasharray="2 4" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis
                      dataKey="topic"
                      stroke="rgba(255,255,255,0.15)"
                      tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }}
                      angle={-35}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis
                      stroke="rgba(255,255,255,0.15)"
                      tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }}
                      domain={[0, 100]}
                      width={35}
                    />
                    <Tooltip
                      cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                      contentStyle={{
                        background: 'rgba(0,0,0,0.85)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '12px',
                        color: 'white',
                        fontSize: 12,
                      }}
                      formatter={(value: number, _: any, props: any) => [
                        `${value}%  (${props.payload.correct}/${props.payload.total})`,
                        props.payload.fullTopic,
                      ]}
                    />
                    <Bar dataKey="percentage" radius={[6, 6, 0, 0]}>
                      {topicAggregated.map((entry, i) => (
                        <Cell key={i} fill={getBarColor(entry.percentage)} fillOpacity={0.8} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        )}

        {/* ── New Quiz Upload ── */}
        <div className="animate-fade-in" style={{ animationDelay: '250ms' }}>
          <div className="flex items-center gap-2 mb-3">
            <Sparkles size={14} className="text-white/40" />
            <span className="text-white/40 text-xs font-medium uppercase tracking-widest">
              Start a New Quiz
            </span>
          </div>
          <div
            className={`liquid-glass rounded-2xl pl-5 pr-2 py-3 flex items-center gap-3 transition-all duration-200 cursor-pointer ${
              isDragging ? 'ring-1 ring-white/30 bg-white/5' : 'hover:bg-white/[0.03]'
            } ${uploadState === 'error' ? 'ring-1 ring-red-500/40' : ''}`}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            onClick={() => !isBusy && fileInputRef.current?.click()}
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
                onClick={(e) => { e.stopPropagation(); setFileName(null); setUploadState('idle'); selectedFileRef.current = null; }}
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
              accept=".pdf,.doc,.docx,.ppt,.pptx,.txt"
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
              <span className="text-white/40 text-xs font-medium uppercase tracking-widest">
                Recent Quizzes
              </span>
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
                    <span className={`text-2xl font-bold tabular-nums ${accuracyColor(quiz.accuracy)}`}>
                      {quiz.accuracy}%
                    </span>
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-white/50 text-sm">
                          {quiz.score}/{quiz.totalQuestions} correct
                        </span>
                        <span className="text-white/20 text-xs">•</span>
                        <span className="text-white/30 text-sm tabular-nums">
                          {formatTime(quiz.timeTaken)}
                        </span>
                      </div>
                      <p className="text-white/20 text-xs tabular-nums">
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
