'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { QuizResult } from '@/lib/types';
import ResultsDashboard from '@/components/ResultsDashboard';
import { getQuizHistory } from '@/components/QuizHistory';
import Link from 'next/link';
import LoadingSpinner from '@/components/LoadingSpinner';

export default function QuizDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [result, setResult] = useState<QuizResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const history = getQuizHistory();
    const quiz = history.find((q) => q.id === params.id);
    
    if (quiz) {
      setResult(quiz);
    } else {
      // Quiz not found, redirect to history
      router.push('/history');
    }
    setLoading(false);
  }, [params.id, router]);

  if (loading) {
    return (
      <main className="min-h-screen p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          <LoadingSpinner message="Loading quiz results..." />
        </div>
      </main>
    );
  }

  if (!result) {
    return null;
  }

  return (
    <main className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <Link
                href="/history"
                className="text-primary-400 hover:text-primary-300 mb-2 inline-block"
              >
                ← Back to History
              </Link>
              <h1 className="text-4xl font-bold text-gray-100">Quiz Results</h1>
            </div>
            <Link
              href="/upload"
              className="bg-primary-600 hover:bg-primary-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
            >
              New Quiz
            </Link>
          </div>
        </header>
        <ResultsDashboard
          result={result}
          onRetake={() => router.push('/upload')}
        />
      </div>
    </main>
  );
}
