'use client';

import { useEffect, useState } from 'react';
import { useQuizStore } from '@/store/quiz-store';
import { formatTime } from '@/lib/quiz-utils';
import { Clock } from 'lucide-react';
import { attemptDeadline, remainingSeconds, subscribeCountdown } from '@/lib/countdown';

export default function Timer() {
  const { session } = useQuizStore();
  if (!session) return null;
  const deadline = attemptDeadline(session);
  return <Countdown key={`${session.quizProof}:${deadline}`} deadline={deadline} />;
}

function Countdown({ deadline }: { deadline: number }) {
  const [remaining, setRemaining] = useState(() => remainingSeconds(deadline));
  useEffect(() => subscribeCountdown(deadline, setRemaining, () => {}), [deadline]);

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
