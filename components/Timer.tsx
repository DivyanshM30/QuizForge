'use client';

import { useEffect, useState } from 'react';
import { useQuizStore } from '@/store/quiz-store';
import { formatTime } from '@/lib/quiz-utils';
import { Clock } from 'lucide-react';

interface TimerProps {
  onTimeUp?: () => void;
}

export default function Timer({ onTimeUp }: TimerProps) {
  const { session, getRemainingTime, endQuiz } = useQuizStore();
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    if (!session) return;
    setRemaining(getRemainingTime());
    const interval = setInterval(() => {
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
    return () => clearInterval(interval);
  }, [session, getRemainingTime, endQuiz, onTimeUp]);

  if (!session) return null;

  const isCritical = remaining < 60;
  const isWarning = remaining < 5 * 60;

  return (
    <div className={`flex items-center gap-2 px-4 py-2 rounded-xl liquid-glass font-mono text-sm font-semibold tabular-nums transition-colors ${
      isCritical ? 'text-red-400 animate-pulse' : isWarning ? 'text-yellow-400' : 'text-white/70'
    }`}>
      <Clock size={14} />
      {formatTime(remaining)}
    </div>
  );
}
