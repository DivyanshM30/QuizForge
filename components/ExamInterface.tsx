'use client';

import { useState } from 'react';
import { useQuizStore } from '@/store/quiz-store';
import Timer from './Timer';

export default function ExamInterface({ onComplete }: { onComplete: () => void }) {
  const { session, submitAnswer, goToQuestion, getRemainingTime } = useQuizStore();
  const [confirming, setConfirming] = useState(false);
  if (!session) return null;
  const index = session.currentQuestionIndex;
  const question = session.questions[index];
  const answered = session.userAnswers.filter(answer => answer !== null).length;
  const navigate = (target: number) => {
    if (getRemainingTime() === 0) onComplete();
    else goToQuestion(target);
  };
  return <div className="max-w-3xl mx-auto space-y-5">
    <div className="flex justify-between items-center gap-3">
      <h1 className="text-xl font-semibold">Exam simulation</h1>
      <Timer onTimeUp={onComplete} />
    </div>
    <p className="text-sm text-white/60" role="status">{answered} of {session.questions.length} answered. Results appear after submission.</p>
    <nav aria-label="Exam questions" className="flex flex-wrap gap-2">
      {session.questions.map((q, i) => <button key={q.id + i} onClick={() => navigate(i)}
        aria-label={`Question ${i + 1}, ${session.userAnswers[i] === null ? 'unanswered' : 'answered'}`}
        aria-current={i === index ? 'step' : undefined}
        className={`w-10 h-10 rounded-lg border ${i === index ? 'border-white' : 'border-white/20'} ${session.userAnswers[i] !== null ? 'bg-white/20' : 'bg-white/5'}`}>{i + 1}</button>)}
    </nav>
    <div className="liquid-glass-card rounded-3xl p-7 space-y-5">
      <h2 className="text-xl font-semibold">{index + 1}. {question.question}</h2>
      <div role="group" aria-label="Answer options" className="space-y-3">
        {(['a', 'b', 'c', 'd'] as const).map(option => <button key={option}
          aria-pressed={session.userAnswers[index] === option}
          onClick={() => { if (!submitAnswer(option) && getRemainingTime() === 0) onComplete(); }}
          className={`w-full text-left rounded-xl border p-4 ${session.userAnswers[index] === option ? 'border-white bg-white/15' : 'border-white/20 bg-white/5'}`}>
          {option.toUpperCase()}. {question.options[option]}
        </button>)}
      </div>
      <div className="flex justify-between gap-3">
        <button disabled={index === 0} onClick={() => navigate(index - 1)} className="px-4 py-3 rounded-xl bg-white/10 disabled:opacity-30">Previous</button>
        <button disabled={index === session.questions.length - 1} onClick={() => navigate(index + 1)} className="px-4 py-3 rounded-xl bg-white/10 disabled:opacity-30">Next</button>
      </div>
    </div>
    {confirming ? <div role="region" aria-label="Confirm exam submission" className="rounded-xl border border-white/20 p-5 space-y-4">
      <p>{session.questions.length - answered} unanswered. Submit now? Your answers will be final.</p>
      <div className="flex gap-3">
        <button autoFocus onClick={onComplete} className="px-5 py-3 bg-white text-black rounded-xl">Confirm submission</button>
        <button onClick={() => setConfirming(false)} className="px-5 py-3 bg-white/10 rounded-xl">Keep working</button>
      </div>
    </div> : <button onClick={() => { if (getRemainingTime() === 0) onComplete(); else setConfirming(true); }} className="w-full bg-white text-black rounded-xl py-3 font-semibold">Finish exam</button>}
  </div>;
}
