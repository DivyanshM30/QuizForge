'use client';

import { useEffect, useRef, useState } from 'react';
import { Question } from '@/lib/types';
import { useQuizStore } from '@/store/quiz-store';
import { Sparkles, Loader2 } from 'lucide-react';

interface FeedbackModalProps {
  question: Question;
  userAnswer: string | null;
  isOpen: boolean;
  onContinue: () => void;
}

export default function FeedbackModal({ question, userAnswer, isOpen, onContinue }: FeedbackModalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const continueRef = useRef<HTMLButtonElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  /* ── Ask-why: AI follow-up grounded in the source document ── */
  const { documentId } = useQuizStore();
  const [query, setQuery] = useState('');
  const [aiAnswer, setAiAnswer] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [asking, setAsking] = useState(false);

  /* Reset the ask state whenever a new question's feedback opens. */
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setAiAnswer(null);
      setAiError(null);
      setAsking(false);
    }
  }, [isOpen, question.id]);

  /* Dialog behaviour: focus the action on open, trap Tab within the dialog,
     close on Escape, restore focus to the trigger on close. */
  useEffect(() => {
    if (!isOpen) return;
    previouslyFocused.current = document.activeElement as HTMLElement | null;
    continueRef.current?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onContinue();
      } else if (e.key === 'Tab') {
        const focusables = containerRef.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled])'
        );
        if (!focusables || focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      previouslyFocused.current?.focus();
    };
  }, [isOpen, onContinue]);

  if (!isOpen) return null;

  const isCorrect = userAnswer === question.correctAnswer;
  const correctOption = question.options[question.correctAnswer];

  const handleAsk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || asking) return;
    setAsking(true);
    setAiError(null);
    try {
      const res = await fetch('/api/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, userAnswer, query: query.trim(), documentId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to get an explanation');
      setAiAnswer(data.explanation);
      setQuery('');
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'Failed to get an explanation');
    } finally {
      setAsking(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/70 backdrop-blur-md">
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="feedback-title"
        className="liquid-glass rounded-3xl p-7 max-w-lg w-full space-y-5 animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto"
      >

        {/* Result header */}
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${
            isCorrect ? 'bg-green-500/20' : 'bg-red-500/20'
          }`}>
            {isCorrect ? (
              <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
          </div>
          <div>
            <h3 id="feedback-title" className={`text-xl font-semibold ${isCorrect ? 'text-green-400' : 'text-red-400'}`}>
              {isCorrect ? 'Correct!' : 'Incorrect'}
            </h3>
            <p className="text-white/40 text-sm">
              {isCorrect ? 'Great job - keep it up.' : `Correct answer: ${question.correctAnswer.toUpperCase()}`}
            </p>
          </div>
        </div>

        {/* Correct answer */}
        <div className="space-y-1.5">
          <p className="text-white/50 text-xs font-medium uppercase tracking-widest">Correct Answer</p>
          <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white/80 text-sm leading-relaxed">
            {correctOption}
          </div>
        </div>

        {/* Explanation */}
        {question.explanation && (
          <div className="space-y-1.5">
            <p className="text-white/50 text-xs font-medium uppercase tracking-widest">Explanation</p>
            <p className="text-white/60 text-sm leading-relaxed">{question.explanation}</p>
          </div>
        )}

        {/* ── Ask-why: AI follow-up ── */}
        <div className="space-y-2.5 border-t border-white/10 pt-4">
          <p className="text-white/50 text-xs font-medium uppercase tracking-widest flex items-center gap-1.5">
            <Sparkles size={12} className="text-white/40" />
            Still unsure? Ask the AI
          </p>

          {aiAnswer && (
            <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white/70 text-sm leading-relaxed">
              {aiAnswer}
            </div>
          )}
          {aiError && <p className="text-red-400 text-xs">{aiError}</p>}

          <form onSubmit={handleAsk} className="flex items-center gap-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              maxLength={500}
              placeholder={aiAnswer ? 'Ask something else…' : 'e.g. why is option B wrong?'}
              aria-label="Ask the AI a follow-up question"
              className="flex-1 min-w-0 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder:text-white/40 text-sm outline-none focus:border-white/30 focus:bg-white/10 transition-all"
            />
            <button
              type="submit"
              disabled={asking || query.trim().length < 3}
              aria-label="Send question"
              className="flex items-center gap-1.5 bg-white/10 border border-white/20 text-white font-medium px-4 py-2.5 rounded-xl hover:bg-white/15 disabled:opacity-40 disabled:cursor-not-allowed transition-all text-sm cursor-pointer flex-shrink-0"
            >
              {asking ? <Loader2 size={14} className="animate-spin" /> : 'Ask'}
            </button>
          </form>
        </div>

        <button
          ref={continueRef}
          onClick={onContinue}
          className="w-full bg-white text-black font-semibold py-3.5 rounded-xl
            hover:bg-white/90 transition-colors cursor-pointer"
        >
          Continue →
        </button>
      </div>
    </div>
  );
}
