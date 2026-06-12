'use client';

import { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useQuizStore } from '@/store/quiz-store';
import FileUpload from '@/components/FileUpload';
import QuizConfig from '@/components/QuizConfig';
import QuizInterface from '@/components/QuizInterface';
import ResultsDashboard from '@/components/ResultsDashboard';
import LoadingSpinner from '@/components/LoadingSpinner';
import { QuizConfig as QuizConfigType, Question, QuizResult } from '@/lib/types';
import { createQuizResult } from '@/lib/quiz-utils';
import Link from 'next/link';
import Image from 'next/image';
import ThemeToggle from '@/components/ThemeToggle';

type Step = 'upload' | 'config' | 'quiz' | 'results';

export default function UploadPage() {
  const { data: sessionData, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  const {
    documentText,
    session,
    isAnalyzing,
    isGenerating,
    error,
    setDocumentText,
    setAnalyzing,
    setGenerating,
    setError,
    startQuiz,
    endQuiz,
    resetQuiz,
  } = useQuizStore();

  const [step, setStep] = useState<Step>('upload');
  const [, setQuestions] = useState<Question[]>([]);
  const [result, setResult] = useState<QuizResult | null>(null);

  const handleFileAnalyzed = (text: string) => {
    setDocumentText(text);
    setAnalyzing(false);
    setStep('config');
  };

  const handleFileUpload = () => {
    setAnalyzing(true);
    setError(null);
  };

  const handleStartQuiz = async (config: QuizConfigType) => {
    if (!documentText) {
      setError('No document text available');
      return;
    }

    setGenerating(true);
    setError(null);

    try {
      const response = await fetch('/api/generate-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentText, config }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to generate questions');
      }

      const data = await response.json();
      setQuestions(data.questions);
      startQuiz(data.questions, config);
      setStep('quiz');
    } catch (err: any) {
      setError(err.message || 'Failed to generate questions');
    } finally {
      setGenerating(false);
    }
  };

  const handleQuizComplete = async () => {
    if (!session) return;

    const timeTaken = Math.floor((Date.now() - session.startTime) / 1000);
    const quizResult = createQuizResult(
      session.questions,
      session.userAnswers,
      timeTaken,
      session.timeLimit,
      session.config
    );

    setResult(quizResult);
    
    // Save to database in the background (fire-and-forget)
    fetch('/api/save-quiz', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(quizResult),
    }).catch(error => {
      console.error('Failed to save quiz to database:', error);
    });
    
    endQuiz();
    setStep('results');
  };

  const handleNewQuiz = () => {
    resetQuiz();
    setResult(null);
    setStep('upload');
  };

  return (
    <main className="min-h-screen">


      <header className="sticky top-0 z-40 border-b border-indigo-100 dark:border-slate-800 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-4 py-3 md:px-8">
          <div className="flex items-center justify-between gap-3">
            <Link href="/" className="flex items-center gap-3">
              <div className="relative flex h-10 w-10 items-center justify-center rounded-xl overflow-hidden shadow-sm">
                <Image src="/logo.png" alt="QuizForge Logo" width={40} height={40} className="object-cover" />
              </div>
              <div className="leading-tight">
                <div className="text-sm font-bold text-indigo-950 dark:text-slate-100">QuizForge AI</div>
                <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Upload → Generate → Simulate</div>
              </div>
            </Link>

            <div className="flex items-center gap-2">
              <ThemeToggle />
              <Link
                href="/history"
                className="hidden sm:inline-flex bg-white dark:bg-slate-900 hover:bg-indigo-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold px-4 py-2 rounded-lg transition-colors border border-indigo-100 dark:border-slate-800 shadow-sm"
              >
                History
              </Link>
              <button
                onClick={handleNewQuiz}
                className="inline-flex bg-primary-600 hover:bg-primary-700 text-white font-bold px-4 py-2 rounded-lg transition-colors shadow-sm"
              >
                New Quiz
              </button>
              <button
                onClick={() => signOut({ callbackUrl: '/' })}
                className="hidden sm:inline-flex bg-white dark:bg-slate-900 hover:bg-indigo-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold px-4 py-2 rounded-lg transition-colors border border-indigo-100 dark:border-slate-800 ml-2 shadow-sm"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-8 md:px-8 md:py-12">
        {error && (
          <div className="mb-6 rounded-xl bg-red-50 border border-red-200 p-4 shadow-sm">
            <p className="text-red-600 font-medium">{error}</p>
          </div>
        )}

        <div className="w-full">
          {step === 'upload' && (
            <div className="fade-in">
              <div className="mb-6 text-center md:text-left">
                <h1 className="text-3xl sm:text-4xl font-extrabold text-indigo-950 dark:text-slate-100 tracking-tight">
                  Upload your study material
                </h1>
                <p className="text-slate-600 dark:text-slate-300 font-medium mt-2">
                  We’ll extract text and generate a quiz with explanations and analytics.
                </p>
              </div>

              <FileUpload
                onFileUploaded={handleFileUpload}
                onAnalysisComplete={handleFileAnalyzed}
                isAnalyzing={isAnalyzing}
              />
            </div>
          )}

          {step === 'config' && (
            <div className="fade-in">
              <QuizConfig onStart={handleStartQuiz} isGenerating={isGenerating} />
              {isGenerating && (
                <div className="mt-6">
                  <LoadingSpinner message="Generating questions with AI... This may take a moment." />
                </div>
              )}
            </div>
          )}

          {step === 'quiz' && session && (
            <div className="fade-in">
              <QuizInterface onComplete={handleQuizComplete} />
            </div>
          )}

          {step === 'results' && result && (
            <div className="fade-in">
              <ResultsDashboard result={result} onRetake={handleNewQuiz} />
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

