'use client';

import { useState, useEffect } from 'react';
import { useQuizStore } from '@/store/quiz-store';
import Timer from './Timer';
import FeedbackModal from './FeedbackModal';
import { Question } from '@/lib/types';

interface QuizInterfaceProps {
  onComplete: () => void;
}

export default function QuizInterface({ onComplete }: QuizInterfaceProps) {
  const {
    session,
    getCurrentQuestion,
    submitAnswer,
    nextQuestion,
    getRemainingTime,
    updateTimer,
    endQuiz,
  } = useQuizStore();

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

  useEffect(() => {
    if (!session) return;

    const interval = setInterval(() => {
      updateTimer();
      const remaining = getRemainingTime();
      if (remaining <= 0) {
        clearInterval(interval);
        handleTimeUp();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [session, updateTimer, getRemainingTime]);

  if (!session || !currentQuestion) {
    return null;
  }

  const handleAnswerSelect = (answer: string) => {
    if (hasAnswered) return;
    setSelectedAnswer(answer);
  };

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

    if (currentIndex < totalQuestions - 1) {
      nextQuestion();
    } else {
      // Quiz completed
      onComplete();
    }
  };

  const handleTimeUp = () => {
    endQuiz();
    onComplete();
  };

  const progress = ((currentIndex + 1) / totalQuestions) * 100;

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Header with Timer and Progress */}
      <div className="mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="text-slate-600 dark:text-slate-300 font-bold">
            Question {currentIndex + 1} of {totalQuestions}
          </div>
          <div className="w-32 h-2 bg-indigo-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary-600 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
        <Timer onTimeUp={handleTimeUp} />
      </div>

      {/* Question Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 border border-indigo-100 dark:border-slate-800 shadow-sm mb-6">
        <div className="mb-6">
          <div className="text-sm text-primary-600 dark:text-primary-400 font-bold mb-2">
            Topic: {currentQuestion.topic} • Difficulty: {currentQuestion.difficulty}
          </div>
          <h2 className="text-2xl font-extrabold text-indigo-950 dark:text-slate-100 leading-relaxed">
            {currentQuestion.question}
          </h2>
        </div>

        {/* Options */}
        <div className="space-y-3">
          {(['a', 'b', 'c', 'd'] as const).map((option) => {
            const optionText = currentQuestion.options[option];
            const isSelected = selectedAnswer === option;
            const isCorrect = currentQuestion.correctAnswer === option;
            const isUserAnswer = userAnswer === option;
            const showResult = hasAnswered;

            let buttonClass =
              'w-full text-left p-4 rounded-xl border-2 transition-all font-bold ';
            if (showResult) {
              if (isCorrect) {
                buttonClass += 'bg-green-50 dark:bg-green-950/20 border-green-500 text-green-700 dark:text-green-300';
              } else if (isUserAnswer && !isCorrect) {
                buttonClass += 'bg-red-50 dark:bg-red-950/20 border-red-500 text-red-700 dark:text-red-300';
              } else {
                buttonClass += 'bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-600';
              }
            } else {
              buttonClass += isSelected
                ? 'bg-primary-50 dark:bg-primary-950/30 border-primary-500 text-primary-700 dark:text-primary-300 shadow-sm scale-[1.01]'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-primary-300 dark:hover:border-primary-550 hover:bg-slate-50 dark:hover:bg-slate-800/50';
            }

            return (
              <button
                key={option}
                onClick={() => handleAnswerSelect(option)}
                disabled={hasAnswered}
                className={buttonClass}
              >
                <div className="flex items-center gap-3">
                  <span className="font-bold text-lg">{option.toUpperCase()}.</span>
                  <span>{optionText}</span>
                  {showResult && isCorrect && (
                    <span className="ml-auto text-green-600 font-bold text-xl">✓</span>
                  )}
                  {showResult && isUserAnswer && !isCorrect && (
                    <span className="ml-auto text-red-600 font-bold text-xl">✗</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Submit Button */}
        {!hasAnswered && (
          <button
            onClick={handleSubmit}
            disabled={!selectedAnswer}
            className="mt-6 w-full bg-cta-500 hover:bg-cta-600 disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-400 dark:disabled:text-slate-600 disabled:cursor-not-allowed text-white font-bold py-4 px-6 rounded-xl transition-all shadow-sm"
          >
            Submit Answer
          </button>
        )}

        {hasAnswered && currentIndex < totalQuestions - 1 && (
          <button
            onClick={handleContinue}
            className="mt-6 w-full bg-primary-600 hover:bg-primary-700 text-white font-bold py-4 px-6 rounded-xl transition-all shadow-sm"
          >
            Next Question
          </button>
        )}
      </div>

      {/* Feedback Modal */}
      <FeedbackModal
        question={currentQuestion}
        userAnswer={userAnswer}
        isOpen={showFeedback}
        onContinue={handleContinue}
      />
    </div>
  );
}
