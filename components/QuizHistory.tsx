'use client';

import { useEffect, useState } from 'react';
import { QuizResult } from '@/lib/types';
import { formatTime } from '@/lib/quiz-utils';
import Link from 'next/link';

export default function QuizHistory() {
  const [history, setHistory] = useState<QuizResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = async () => {
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
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this quiz result?')) {
      try {
        const res = await fetch(`/api/history/${id}`, { method: 'DELETE' });
        if (res.ok) {
          fetchHistory();
        } else {
          alert('Failed to delete history');
        }
      } catch (err) {
        alert('An error occurred');
      }
    }
  };

  if (isLoading) {
    return (
      <div className="w-full max-w-4xl mx-auto flex justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full max-w-4xl mx-auto text-center text-red-400 py-12">
        {error}
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="w-full max-w-4xl mx-auto">
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-12 border border-gray-700 text-center">
          <div className="w-16 h-16 rounded-full bg-gray-700/50 flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-gray-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-gray-300 mb-2">No Quiz History</h3>
          <p className="text-gray-500 mb-6">Complete a quiz to see your results here.</p>
          <Link
            href="/upload"
            className="inline-block bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            Start a New Quiz
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-3xl font-bold text-gray-100">Quiz History</h2>
      </div>

      <div className="space-y-4">
        {history.map((quiz) => (
          <div
            key={quiz.id}
            className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700 hover:border-primary-500/50 transition-all"
          >
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-4 mb-2">
                  <div className="text-2xl font-bold text-primary-400">
                    {quiz.score}/{quiz.totalQuestions}
                  </div>
                  <div className="text-lg font-semibold text-gray-300">
                    {quiz.accuracy}% Accuracy
                  </div>
                  <div className="text-sm text-gray-400">
                    {formatTime(quiz.timeTaken)} / {formatTime(quiz.timeLimit)}
                  </div>
                </div>
                <div className="text-sm text-gray-500">
                  {new Date(quiz.createdAt || quiz.timestamp || Date.now()).toLocaleString()}
                </div>
                {quiz.weakTopics && quiz.weakTopics.length > 0 && (
                  <div className="mt-2 text-sm text-gray-400">
                    Weak topics: {quiz.weakTopics.slice(0, 3).join(', ')}
                    {quiz.weakTopics.length > 3 && '...'}
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <Link
                  href={`/history/${quiz.id}`}
                  className="bg-primary-600 hover:bg-primary-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                >
                  View Details
                </Link>
                <button
                  onClick={() => handleDelete(quiz.id)}
                  className="bg-red-600/20 hover:bg-red-600/30 text-red-400 font-semibold py-2 px-4 rounded-lg transition-colors border border-red-500/30"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
