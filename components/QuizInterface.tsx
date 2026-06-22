'use client';

import { useState, useEffect } from 'react';
import { useQuizStore } from '@/store/quiz-store';
import Timer from './Timer';
import FeedbackModal from './FeedbackModal';

interface QuizInterfaceProps {
  onComplete: () => void;
}

export default function QuizInterface({ onComplete }: QuizInterfaceProps) {
  const { session, getCurrentQuestion, submitAnswer, nextQuestion } = useQuizStore();

  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [hasAnswered, setHasAnswered] = useState(false);

  const currentQuestion = getCurrentQuestion();
  const currentIndex = session?.currentQuestionIndex || 0;
  const totalQuestions = session?.questions.length || 0;
  const userAnswer = session?.userAnswers[currentIndex] || null;

  useEffect(() => {
    if (session) {
      setSelectedAnswer(userAnswer);
      setHasAnswered(userAnswer !== null);
    }
  }, [session, currentIndex, userAnswer]);

  if (!session || !currentQuestion) return null;

  const handleAnswerSelect = (answer: string) => { if (!hasAnswered) setSelectedAnswer(answer); };

  const handleSubmit = () => {
    if (!selectedAnswer || hasAnswered) return;
    submitAnswer(selectedAnswer);
    setHasAnswered(true);
    setShowFeedback(true);
  };

  const handleContinue = () => {
    setShowFeedback(false);
    setSelectedAnswer(null);
    setHasAnswered(false);
    if (currentIndex < totalQuestions - 1) nextQuestion();
    else onComplete();
  };

  // Single completion path: let the parent's handleQuizComplete own saving and
  // ending the quiz (it reads the session, so we must not null it here first).
  const handleTimeUp = () => { onComplete(); };

  const progress = ((currentIndex + 1) / totalQuestions) * 100;

  /* Option state → styling */
  const optionClass = (option: 'a' | 'b' | 'c' | 'd') => {
    const isSelected = selectedAnswer === option;
    const isCorrect = currentQuestion.correctAnswer === option;
    const isUserAnswer = userAnswer === option;
    const base = 'w-full text-left p-4 rounded-2xl border transition-all duration-200 cursor-pointer flex items-center gap-3 ';

    if (hasAnswered) {
      if (isCorrect) return base + 'border-green-500/60 bg-green-500/10 text-green-300';
      if (isUserAnswer && !isCorrect) return base + 'border-red-500/60 bg-red-500/10 text-red-300';
      return base + 'border-white/5 bg-white/[0.02] text-white/30';
    }
    if (isSelected) return base + 'border-white/50 bg-white/10 text-white';
    return base + 'border-white/10 bg-white/[0.03] text-white/70 hover:border-white/25 hover:bg-white/[0.07] hover:text-white';
  };

  return (
    <div className="w-full max-w-3xl mx-auto space-y-5">

      {/* Header: progress + timer */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1">
          <span className="text-white/50 text-sm font-medium tabular-nums whitespace-nowrap">
            {currentIndex + 1} <span className="text-white/25">/ {totalQuestions}</span>
          </span>
          <div className="flex-1 h-px bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-white/70 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
        <Timer onTimeUp={handleTimeUp} />
      </div>

      {/* Question card */}
      <div className="liquid-glass-card rounded-3xl p-7 space-y-6">
        <div className="space-y-2">
          <p className="text-white/40 text-xs font-medium uppercase tracking-widest">
            {currentQuestion.topic} · {currentQuestion.difficulty}
          </p>
          <h2 className="text-xl font-semibold text-white leading-relaxed">
            {currentQuestion.question}
          </h2>
        </div>

        {/* Options */}
        <div className="space-y-2.5">
          {(['a', 'b', 'c', 'd'] as const).map((option) => (
            <button
              key={option}
              onClick={() => handleAnswerSelect(option)}
              disabled={hasAnswered}
              className={optionClass(option)}
            >
              <span className="w-7 h-7 rounded-lg border border-current/30 flex items-center justify-center text-xs font-bold flex-shrink-0 uppercase">
                {option}
              </span>
              <span className="text-sm leading-relaxed">{currentQuestion.options[option]}</span>
              {hasAnswered && currentQuestion.correctAnswer === option && (
                <span className="ml-auto text-green-400 text-lg leading-none">✓</span>
              )}
              {hasAnswered && userAnswer === option && userAnswer !== currentQuestion.correctAnswer && (
                <span className="ml-auto text-red-400 text-lg leading-none">✗</span>
              )}
            </button>
          ))}
        </div>

        {/* Action button */}
        {!hasAnswered ? (
          <button
            onClick={handleSubmit}
            disabled={!selectedAnswer}
            className="w-full bg-white text-black font-semibold py-3.5 rounded-xl
              hover:bg-white/90 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
          >
            Submit Answer
          </button>
        ) : currentIndex < totalQuestions - 1 ? (
          <button
            onClick={handleContinue}
            className="w-full bg-white/10 border border-white/20 text-white font-semibold py-3.5 rounded-xl
              hover:bg-white/15 transition-all cursor-pointer"
          >
            Next Question →
          </button>
        ) : null}
      </div>

      <FeedbackModal
        question={currentQuestion}
        userAnswer={userAnswer}
        isOpen={showFeedback}
        onContinue={handleContinue}
      />
    </div>
  );
}
