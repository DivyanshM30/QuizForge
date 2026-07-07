'use client';

import { formatTime, accuracyTextClass } from '@/lib/quiz-utils';
import { useHistory } from '@/hooks/useHistory';
import Link from 'next/link';
import { Trash2, ChevronRight, FileText, Zap } from 'lucide-react';

export default function QuizHistory() {
  const { history, isLoading, error, refetch } = useHistory();

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this quiz result?')) return;
    try {
      const res = await fetch(`/api/history/${id}`, { method: 'DELETE' });
      if (res.ok) refetch();
      else alert('Failed to delete');
    } catch { alert('An error occurred'); }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-2 border-white/10 border-t-white/60 rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return <p className="text-center text-red-400 py-12 text-sm">{error}</p>;
  }

  if (history.length === 0) {
    return (
      <div className="liquid-glass rounded-3xl p-16 text-center space-y-5 max-w-md mx-auto">
        <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto">
          <FileText size={24} className="text-white/30" />
        </div>
        <div className="space-y-1">
          <h3 className="text-white font-medium">No quizzes yet</h3>
          <p className="text-white/40 text-sm">Complete a quiz to see your history here.</p>
        </div>
        <Link
          href="/upload"
          className="inline-flex items-center gap-2 bg-white text-black font-semibold px-6 py-2.5 rounded-xl hover:bg-white/90 transition-colors text-sm cursor-pointer"
        >
          <Zap size={14} />
          Start a Quiz
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3 max-w-4xl mx-auto">
      {history.map((quiz) => (
        <div
          key={quiz.id}
          className="liquid-glass rounded-2xl px-6 py-5 flex flex-col md:flex-row md:items-center gap-4 hover:bg-white/[0.03] transition-colors"
        >
          {/* Score + meta */}
          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center gap-3 flex-wrap">
              <span className={`text-2xl font-bold tabular-nums ${accuracyTextClass(quiz.accuracy)}`}>
                {quiz.accuracy}%
              </span>
              <span className="text-white/50 text-sm">
                {quiz.score}/{quiz.totalQuestions} correct
              </span>
              <span className="text-white/30 text-sm tabular-nums">
                {formatTime(quiz.timeTaken)}
              </span>
            </div>
            <p className="text-white/30 text-xs tabular-nums">
              {new Date(quiz.createdAt || quiz.timestamp || Date.now()).toLocaleString()}
            </p>
            {quiz.weakTopics?.length > 0 && (
              <p className="text-white/30 text-xs truncate">
                Weak: {quiz.weakTopics.slice(0, 3).join(', ')}{quiz.weakTopics.length > 3 ? '…' : ''}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => handleDelete(quiz.id)}
              aria-label="Delete quiz"
              className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-red-400 hover:border-red-500/30 transition-all cursor-pointer"
            >
              <Trash2 size={14} />
            </button>
            <Link
              href={`/history/${quiz.id}`}
              className="flex items-center gap-1.5 bg-white/10 border border-white/10 text-white/70 hover:text-white hover:bg-white/10 font-medium px-4 py-2 rounded-xl transition-all text-sm cursor-pointer"
            >
              Details <ChevronRight size={14} />
            </Link>
          </div>
        </div>
      ))}
    </div>
  );
}
