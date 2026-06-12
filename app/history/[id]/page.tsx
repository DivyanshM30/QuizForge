'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { QuizResult } from '@/lib/types';
import ResultsDashboard from '@/components/ResultsDashboard';
import Link from 'next/link';
import LoadingSpinner from '@/components/LoadingSpinner';

export default function QuizDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [result, setResult] = useState<QuizResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchQuiz = async () => {
      try {
        const res = await fetch(`/api/history/${params.id}`);
        if (!res.ok) {
          router.push('/history');
          return;
        }
        const data = await res.json();
        setResult(data);
      } catch (error) {
        console.error('Failed to fetch quiz', error);
        router.push('/history');
      } finally {
        setLoading(false);
      }
    };
    
    fetchQuiz();
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
                className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 mb-2 inline-block font-semibold transition-colors"
              >
                ← Back to History
              </Link>
              <h1 className="text-4xl font-bold text-indigo-950 dark:text-slate-100">Quiz Results</h1>
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
