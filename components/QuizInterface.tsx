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
          <div className="text-gray-300 font-medium">
            Question {currentIndex + 1} of {totalQuestions}
          </div>
          <div className="w-32 h-2 bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary-500 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
        <Timer onTimeUp={handleTimeUp} />
      </div>

      {/* Question Card */}
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-8 border border-gray-700 mb-6">
        <div className="mb-6">
          <div className="text-sm text-primary-400 font-medium mb-2">
            Topic: {currentQuestion.topic} • Difficulty: {currentQuestion.difficulty}
          </div>
          <h2 className="text-2xl font-bold text-gray-100 leading-relaxed">
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
              'w-full text-left p-4 rounded-lg border-2 transition-all font-medium ';
            if (showResult) {
              if (isCorrect) {
                buttonClass += 'bg-green-500/20 border-green-500 text-green-300';
              } else if (isUserAnswer && !isCorrect) {
                buttonClass += 'bg-red-500/20 border-red-500 text-red-300';
              } else {
                buttonClass += 'bg-gray-700/50 border-gray-600 text-gray-400';
              }
            } else {
              buttonClass += isSelected
                ? 'bg-primary-500/20 border-primary-500 text-primary-300 hover:bg-primary-500/30'
                : 'bg-gray-700/50 border-gray-600 text-gray-300 hover:border-primary-500/50 hover:bg-gray-700';
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
                    <span className="ml-auto text-green-400">✓</span>
                  )}
                  {showResult && isUserAnswer && !isCorrect && (
                    <span className="ml-auto text-red-400">✗</span>
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
            className="mt-6 w-full bg-primary-600 hover:bg-primary-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-semibold py-4 px-6 rounded-lg transition-all"
          >
            Submit Answer
          </button>
        )}

        {hasAnswered && currentIndex < totalQuestions - 1 && (
          <button
            onClick={handleContinue}
            className="mt-6 w-full bg-primary-600 hover:bg-primary-700 text-white font-semibold py-4 px-6 rounded-lg transition-all"
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
