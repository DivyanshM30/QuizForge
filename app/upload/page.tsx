'use client';

import { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuizStore } from '@/store/quiz-store';
import FileUpload from '@/components/FileUpload';
import QuizConfig from '@/components/QuizConfig';
import QuizInterface from '@/components/QuizInterface';
import ResultsDashboard from '@/components/ResultsDashboard';
import LoadingSpinner from '@/components/LoadingSpinner';
import { QuizConfig as QuizConfigType, Question, QuizResult } from '@/lib/types';
import { createQuizResult } from '@/lib/quiz-utils';
import Link from 'next/link';
import { History, LogOut, Plus, AlertCircle } from 'lucide-react';
import AppNav from '@/components/AppNav';

type Step = 'upload' | 'config' | 'quiz' | 'results';

/* ── Step indicator ── */
const STEP_LABELS: Record<Step, string> = {
  upload:  '01 · Upload',
  config:  '02 · Configure',
  quiz:    '03 · Quiz',
  results: '04 · Results',
};

function StepBadge({ current, step }: { current: Step; step: Step }) {
  const steps: Step[] = ['upload', 'config', 'quiz', 'results'];
  const ci = steps.indexOf(current);
  const si = steps.indexOf(step);
  const done = si < ci;
  const active = si === ci;
  return (
    <span
      className={`text-xs font-medium tracking-widest transition-colors ${
        active ? 'text-white' : done ? 'text-white/40 line-through' : 'text-white/20'
      }`}
    >
      {STEP_LABELS[step]}
    </span>
  );
}

export default function UploadPage() {
  const { data: sessionData, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login');
  }, [status, router]);

  const {
    documentText, session, isAnalyzing, isGenerating, error,
    setDocumentText, setAnalyzing, setGenerating, setError,
    startQuiz, endQuiz, resetQuiz,
  } = useQuizStore();

  const [step, setStep] = useState<Step>('upload');

  // If the hero already analyzed a file and redirected here, skip straight to config
  useEffect(() => {
    if (searchParams.get('step') === 'config' && documentText) {
      setStep('config');
    }
  }, [searchParams, documentText]);

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
    if (!documentText) { setError('No document text available'); return; }
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
      session.questions, session.userAnswers, timeTaken, session.timeLimit, session.config
    );
    setResult(quizResult);
    fetch('/api/save-quiz', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(quizResult),
    }).catch(console.error);
    endQuiz();
    setStep('results');
  };

  const handleNewQuiz = () => {
    resetQuiz();
    setResult(null);
    setStep('upload');
  };

  const navActions = (
    <button
      onClick={handleNewQuiz}
      className="flex items-center gap-1.5 liquid-glass rounded-full px-4 py-1.5 text-white text-sm font-medium hover:bg-white/5 transition-colors cursor-pointer"
    >
      <Plus size={14} />
      New Quiz
    </button>
  );

  return (
    <div className="min-h-screen bg-black flex flex-col text-white">
      {/* Subtle ambient glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full bg-white/[0.025] blur-3xl" />
      </div>

      <AppNav actions={navActions} />

      {/* Step tracker */}
      <div className="relative z-10 flex justify-center gap-8 px-4 pb-2">
        {(['upload', 'config', 'quiz', 'results'] as Step[]).map((s) => (
          <StepBadge key={s} current={step} step={s} />
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="relative z-10 mx-auto max-w-3xl w-full px-4 mt-4">
          <div className="liquid-glass rounded-2xl px-4 py-3 flex items-center gap-2.5 text-red-400 text-sm">
            <AlertCircle size={16} className="flex-shrink-0" />
            {error}
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="relative z-10 flex-1 mx-auto max-w-5xl w-full px-4 py-8 md:px-6 md:py-10">

        {step === 'upload' && (
          <div className="fade-in space-y-6">
            <div className="text-center space-y-2 mb-8">
              <h1
                className="text-4xl md:text-5xl text-white tracking-tight"
                style={{ fontFamily: "'Instrument Serif', serif" }}
              >
                Upload your material
              </h1>
              <p className="text-white/50 text-sm">
                PDF, DOCX, or plain text — we'll extract the content and forge your quiz
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
            <div className="text-center space-y-2 mb-8">
              <h1
                className="text-4xl md:text-5xl text-white tracking-tight"
                style={{ fontFamily: "'Instrument Serif', serif" }}
              >
                Configure your quiz
              </h1>
              <p className="text-white/50 text-sm">
                Choose difficulty, question count, and time limit
              </p>
            </div>
            <QuizConfig onStart={handleStartQuiz} isGenerating={isGenerating} />
            {isGenerating && (
              <div className="mt-8">
                <LoadingSpinner message="Generating questions with AI… this may take a moment." />
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
      </main>
    </div>
  );
}
