'use client';

import { useEffect, useState } from 'react';
import { QuizResult } from '@/lib/types';
import { formatTime } from '@/lib/quiz-utils';
import Link from 'next/link';

const STORAGE_KEY = 'quiz-history';

export function saveQuizToHistory(result: QuizResult) {
  if (typeof window === 'undefined') return;

  const history = getQuizHistory();
  history.unshift(result);
  // Keep only last 50 quizzes
  const limitedHistory = history.slice(0, 50);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(limitedHistory));
}

export function getQuizHistory(): QuizResult[] {
  if (typeof window === 'undefined') return [];

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function deleteQuizFromHistory(id: string) {
  if (typeof window === 'undefined') return;

  const history = getQuizHistory();
  const filtered = history.filter((quiz) => quiz.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
}

export function clearQuizHistory() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}

export default function QuizHistory() {
  const [history, setHistory] = useState<QuizResult[]>([]);

  useEffect(() => {
    setHistory(getQuizHistory());
  }, []);

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this quiz result?')) {
      deleteQuizFromHistory(id);
      setHistory(getQuizHistory());
    }
  };

  const handleClearAll = () => {
    if (confirm('Are you sure you want to clear all quiz history? This cannot be undone.')) {
      clearQuizHistory();
      setHistory([]);
    }
  };

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
            href="/"
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
        <button
          onClick={handleClearAll}
          className="bg-red-600/20 hover:bg-red-600/30 text-red-400 font-semibold py-2 px-4 rounded-lg transition-colors border border-red-500/30"
        >
          Clear All
        </button>
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
                  {new Date(quiz.timestamp).toLocaleString()}
                </div>
                {quiz.weakTopics.length > 0 && (
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
