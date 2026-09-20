'use client';

import { useEffect, useRef, useState } from 'react';
import { useQuizStore } from '@/store/quiz-store';
import { formatTime } from '@/lib/quiz-utils';
import { Clock } from 'lucide-react';
import { remainingSeconds, subscribeCountdown } from '@/lib/countdown';

interface TimerProps {
  onTimeUp?: () => void;
}

export default function Timer({ onTimeUp }: TimerProps) {
  const { session, endQuiz } = useQuizStore();
  if (!session) return null;
  return <Countdown key={session.quizProof} deadline={session.startTime + session.timeLimit * 1000} onTimeUp={onTimeUp ?? endQuiz} />;
}

function Countdown({ deadline, onTimeUp }: { deadline: number; onTimeUp: () => void }) {
  const [remaining, setRemaining] = useState(() => remainingSeconds(deadline));
  const callbackRef = useRef(onTimeUp);
  useEffect(() => { callbackRef.current = onTimeUp; }, [onTimeUp]);
  useEffect(() => subscribeCountdown(deadline, setRemaining, () => callbackRef.current()), [deadline]);

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
