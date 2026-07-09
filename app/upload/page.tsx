'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuizStore } from '@/store/quiz-store';
import FileUpload from '@/components/FileUpload';
import QuizConfig from '@/components/QuizConfig';
import QuizInterface from '@/components/QuizInterface';
import ResultsDashboard from '@/components/ResultsDashboard';
import LoadingSpinner from '@/components/LoadingSpinner';
import { QuizConfig as QuizConfigType, Question, QuizResult } from '@/lib/types';
import { createQuizResult } from '@/lib/quiz-utils';
import { Plus, AlertCircle } from 'lucide-react';
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
        active ? 'text-white' : done ? 'text-white/40 line-through' : 'text-white/40'
      }`}
    >
      {STEP_LABELS[step]}
    </span>
  );
}

/* ── Reads ?step=config and notifies parent ── */
function SearchParamsReader({
  onConfigStep,
  onQuizStep,
}: {
  onConfigStep: () => void;
  onQuizStep: () => void;
}) {
  const searchParams = useSearchParams();
  const { documentText, session } = useQuizStore();
  useEffect(() => {
    const step = searchParams.get('step');
    if (step === 'config' && documentText) {
      onConfigStep();
    } else if (step === 'quiz' && session) {
      // Retake flow: a session was already started (e.g. from history).
      onQuizStep();
    }
  }, [searchParams, documentText, session, onConfigStep, onQuizStep]);
  return null;
}

/* ── Escalating status while questions generate (so the user never just stares) ── */
function GeneratingStatus() {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(id);
  }, []);
  const message =
    elapsed < 7
      ? 'Generating questions with AI… this may take a moment.'
      : elapsed < 14
      ? 'Still working — analyzing your material and crafting questions…'
      : 'The AI service is busy right now — retrying for you. Hang tight…';
  return <LoadingSpinner message={message} />;
}

/* ── Turn raw API/model errors into something a user can act on ── */
function friendlyError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('503') || m.includes('high demand') || m.includes('overloaded') || m.includes('unavailable')) {
    return 'The AI service is busy right now. Please try again in a moment.';
  }
  if (m.includes('429') || m.includes('too many') || m.includes('rate limit')) {
    return "You're sending requests too quickly. Please wait a minute and try again.";
  }
  if (m.includes('401') || m.includes('unauthorized')) {
    return 'Your session expired. Please sign in again.';
  }
  return message || 'Failed to generate questions. Please try again.';
}

export default function UploadPage() {
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login');
  }, [status, router]);

  const {
    documentText, documentId, session, isAnalyzing, isGenerating, error,
    setDocumentText, setAnalyzing, setGenerating, setError,
    startQuiz, endQuiz, resetQuiz,
  } = useQuizStore();

  const [step, setStep] = useState<Step>('upload');

  // If the hero already analyzed a file and redirected here, skip straight to config
  const [, setQuestions] = useState<Question[]>([]);
  const [result, setResult] = useState<QuizResult | null>(null);
  // Guards the quiz from being saved twice (e.g. time-up + manual finish racing).
  const hasSavedRef = useRef(false);

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
    // Safety net: server maxDuration is 120s, so abort just past that rather
    // than spin forever if the connection stalls.
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 125_000);
    try {
      const response = await fetch('/api/generate-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentText, config }),
        signal: controller.signal,
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to generate questions');
      }
      const data = await response.json();
      setQuestions(data.questions);
      hasSavedRef.current = false; // fresh quiz — allow exactly one save
      startQuiz(data.questions, config);
      setStep('quiz');
    } catch (err) {
      const name = (err as { name?: string })?.name;
      const message = (err as { message?: string })?.message ?? '';
      setError(
        name === 'AbortError'
          ? 'Generation is taking too long — the AI service may be busy. Please try again in a moment.'
          : friendlyError(message)
      );
    } finally {
      clearTimeout(timeout);
      setGenerating(false);
    }
  };

  const handleQuizComplete = async () => {
    // Run exactly once per quiz — both the time-up path and the manual
    // "finish" path funnel here, and we must not POST a duplicate result.
    if (hasSavedRef.current || !session) return;
    hasSavedRef.current = true;
    const timeTaken = Math.floor((Date.now() - session.startTime) / 1000);
    const quizResult = createQuizResult(
      session.questions, session.userAnswers, timeTaken, session.timeLimit, session.config
    );
    setResult(quizResult);
    fetch('/api/save-quiz', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...quizResult, documentId }),
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
      {/* Reads ?step=config from URL, wrapped in Suspense as required by Next.js */}
      <Suspense fallback={null}>
        <SearchParamsReader
          onConfigStep={() => setStep('config')}
          onQuizStep={() => { hasSavedRef.current = false; setStep('quiz'); }}
        />
      </Suspense>

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

      {/* Error (config step shows its own inline error below, co-located with the spinner) */}
      {error && step !== 'config' && (
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
                className="font-display text-4xl md:text-5xl text-white tracking-tight"
              >
                Upload your material
              </h1>
              <p className="text-white/50 text-sm">
                PDF or DOCX — we&apos;ll extract the content and forge your quiz
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
                className="font-display text-4xl md:text-5xl text-white tracking-tight"
              >
                Configure your quiz
              </h1>
              <p className="text-white/50 text-sm">
                Choose difficulty, question count, and time limit
              </p>
            </div>
            <QuizConfig onStart={handleStartQuiz} isGenerating={isGenerating} />
            {isGenerating ? (
              <div className="mt-8">
                <GeneratingStatus />
              </div>
            ) : error ? (
              <div className="mt-8 mx-auto max-w-3xl">
                <div className="liquid-glass rounded-2xl px-4 py-3 flex items-center gap-2.5 text-red-400 text-sm">
                  <AlertCircle size={16} className="flex-shrink-0" />
                  {error}
                </div>
              </div>
            ) : null}
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
