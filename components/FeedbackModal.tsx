'use client';

import { Question } from '@/lib/types';

interface FeedbackModalProps {
  question: Question;
  userAnswer: string | null;
  isOpen: boolean;
  onContinue: () => void;
}

export default function FeedbackModal({
  question,
  userAnswer,
  isOpen,
  onContinue,
}: FeedbackModalProps) {
  if (!isOpen) return null;

  const isCorrect = userAnswer === question.correctAnswer;
  const correctOption = question.options[question.correctAnswer];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-gray-900 rounded-2xl p-6 max-w-2xl w-full border border-gray-700 shadow-2xl animate-in fade-in zoom-in duration-200">
        <div className="flex items-center gap-4 mb-4">
          {isCorrect ? (
            <>
              <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-green-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <div>
                <h3 className="text-2xl font-bold text-green-400">Correct!</h3>
                <p className="text-gray-400">Great job!</p>
              </div>
            </>
          ) : (
            <>
              <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-red-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </div>
              <div>
                <h3 className="text-2xl font-bold text-red-400">Incorrect</h3>
                <p className="text-gray-400">The correct answer is: {question.correctAnswer.toUpperCase()}</p>
              </div>
            </>
          )}
        </div>

        <div className="mb-4">
          <p className="text-gray-300 font-medium mb-2">Correct Answer:</p>
          <div className="bg-primary-500/10 border border-primary-500/30 rounded-lg p-3">
            <p className="text-primary-300">{correctOption}</p>
          </div>
        </div>

        {question.explanation && (
          <div className="mb-6">
            <p className="text-gray-300 font-medium mb-2">Explanation:</p>
            <p className="text-gray-400 leading-relaxed">{question.explanation}</p>
          </div>
        )}

        <button
          onClick={onContinue}
          className="w-full bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
