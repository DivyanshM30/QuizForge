'use client';

import QuizHistory from '@/components/QuizHistory';
import Link from 'next/link';

export default function HistoryPage() {
  return (
    <main className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
          <div className="flex items-center justify-between">
            <h1 className="text-4xl font-bold text-gray-100">Quiz History</h1>
            <Link
              href="/upload"
              className="bg-primary-600 hover:bg-primary-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
            >
              New Quiz
            </Link>
          </div>
        </header>
        <QuizHistory />
      </div>
    </main>
  );
}
