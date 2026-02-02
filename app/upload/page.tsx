'use client';

import { useState } from 'react';
import { useQuizStore } from '@/store/quiz-store';
import FileUpload from '@/components/FileUpload';
import QuizConfig from '@/components/QuizConfig';
import QuizInterface from '@/components/QuizInterface';
import ResultsDashboard from '@/components/ResultsDashboard';
import LoadingSpinner from '@/components/LoadingSpinner';
import { QuizConfig as QuizConfigType, Question, QuizResult } from '@/lib/types';
import { createQuizResult } from '@/lib/quiz-utils';
import { saveQuizToHistory } from '@/components/QuizHistory';
import Link from 'next/link';

type Step = 'upload' | 'config' | 'quiz' | 'results';

export default function UploadPage() {
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

  const handleQuizComplete = () => {
    if (!session) return;

    const timeTaken = Math.floor((Date.now() - session.startTime) / 1000);
    const quizResult = createQuizResult(
      session.questions,
      session.userAnswers,
      timeTaken,
      session.timeLimit
    );

    setResult(quizResult);
    saveQuizToHistory(quizResult);
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
      <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-32 -left-24 h-96 w-96 rounded-full bg-primary-500/15 blur-3xl" />
        <div className="absolute top-40 -right-24 h-[32rem] w-[32rem] rounded-full bg-fuchsia-500/10 blur-3xl" />
        <div className="absolute bottom-[-8rem] left-1/3 h-[28rem] w-[28rem] rounded-full bg-cyan-500/10 blur-3xl" />
      </div>

      <header className="sticky top-0 z-40 border-b border-white/5 bg-slate-950/40 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 py-3 md:px-8">
          <div className="flex items-center justify-between gap-3">
            <Link href="/" className="flex items-center gap-3">
              <div className="relative grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-primary-500/30 to-fuchsia-500/20 border border-white/10">
                <div className="h-4 w-4 rounded bg-primary-400/70 rotate-12" />
              </div>
              <div className="leading-tight">
                <div className="text-sm font-semibold text-gray-100">QuizForge AI</div>
                <div className="text-xs text-gray-400">Upload → Generate → Simulate</div>
              </div>
            </Link>

            <div className="flex items-center gap-2">
              <Link
                href="/history"
                className="hidden sm:inline-flex bg-white/5 hover:bg-white/10 text-gray-100 font-semibold px-4 py-2 rounded-lg transition-colors border border-white/10"
              >
                History
              </Link>
              <button
                onClick={handleNewQuiz}
                className="inline-flex bg-primary-600 hover:bg-primary-700 text-white font-semibold px-4 py-2 rounded-lg transition-colors"
              >
                New Quiz
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-8 md:px-8 md:py-12">
        {error && (
          <div className="mb-6 rounded-xl bg-red-500/10 border border-red-500/30 p-4">
            <p className="text-red-300">{error}</p>
          </div>
        )}

        <div className="w-full">
          {step === 'upload' && (
            <div className="fade-in">
              <div className="mb-6">
                <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-50 tracking-tight">
                  Upload your study material
                </h1>
                <p className="text-gray-300 mt-2">
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

