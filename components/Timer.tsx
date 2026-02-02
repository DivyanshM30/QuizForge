'use client';

import { useEffect, useState } from 'react';
import { useQuizStore } from '@/store/quiz-store';
import { formatTime } from '@/lib/quiz-utils';

interface TimerProps {
  onTimeUp?: () => void;
}

export default function Timer({ onTimeUp }: TimerProps) {
  const { session, getRemainingTime, updateTimer, endQuiz } = useQuizStore();
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    if (!session) return;

    const interval = setInterval(() => {
      updateTimer();
      const time = getRemainingTime();
      setRemaining(time);

      if (time <= 0) {
        clearInterval(interval);
        if (onTimeUp) {
          onTimeUp();
        } else {
          endQuiz();
        }
      }
    }, 1000);

    // Initial update
    setRemaining(getRemainingTime());

    return () => clearInterval(interval);
  }, [session, getRemainingTime, updateTimer, endQuiz, onTimeUp]);

  if (!session) return null;

  const isWarning = remaining < 5 * 60; // Less than 5 minutes
  const isCritical = remaining < 60; // Less than 1 minute

  return (
    <div
      className={`flex items-center gap-2 px-4 py-2 rounded-lg font-mono font-bold transition-all ${
        isCritical
          ? 'bg-red-500/20 text-red-400 animate-pulse'
          : isWarning
          ? 'bg-yellow-500/20 text-yellow-400'
          : 'bg-primary-500/20 text-primary-400'
      }`}
    >
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      <span className="text-lg">{formatTime(remaining)}</span>
    </div>
  );
}
