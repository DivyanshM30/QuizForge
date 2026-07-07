'use client';

import { useEffect, useRef } from 'react';
import { Question } from '@/lib/types';

interface FeedbackModalProps {
  question: Question;
  userAnswer: string | null;
  isOpen: boolean;
  onContinue: () => void;
}

export default function FeedbackModal({ question, userAnswer, isOpen, onContinue }: FeedbackModalProps) {
  const continueRef = useRef<HTMLButtonElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  /* Dialog behaviour: focus the action on open, trap Tab (single focusable
     control), close on Escape, and restore focus to the trigger on close. */
  useEffect(() => {
    if (!isOpen) return;
    previouslyFocused.current = document.activeElement as HTMLElement | null;
    continueRef.current?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onContinue();
      } else if (e.key === 'Tab') {
        e.preventDefault();
        continueRef.current?.focus();
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

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/70 backdrop-blur-md">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="feedback-title"
        className="liquid-glass rounded-3xl p-7 max-w-lg w-full space-y-5 animate-in fade-in zoom-in duration-200"
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
              {isCorrect ? 'Great job — keep it up.' : `Correct answer: ${question.correctAnswer.toUpperCase()}`}
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
