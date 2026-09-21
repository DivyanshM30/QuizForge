'use client';

import { useState } from 'react';
import type { QuizConfig } from '@/lib/types';
import { QUIZ_LIMITS } from '@/lib/constants';
import { BookOpen, Check, ClipboardCheck, Zap } from 'lucide-react';

interface QuizConfigProps {
  onStart: (config: QuizConfig) => void;
  isGenerating?: boolean;
}

const DIFFICULTIES = ['easy', 'medium', 'hard', 'mixed'] as const;
const TIME_OPTIONS = [5, 10, 15, 20, 30, 45, 60, 90, 120];

export default function QuizConfig({ onStart, isGenerating = false }: QuizConfigProps) {
  const [numQuestions, setNumQuestions] = useState(10);
  const [mode, setMode] = useState<'practice' | 'exam'>('practice');
  const [timeLimit, setTimeLimit] = useState(15);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard' | 'mixed'>('medium');

  const handleStart = () => onStart({ numQuestions, timeLimit, difficulty, mode });

  const sliderPct =
    ((numQuestions - QUIZ_LIMITS.MIN_QUESTIONS) /
      (QUIZ_LIMITS.MAX_QUESTIONS - QUIZ_LIMITS.MIN_QUESTIONS)) *
    100;

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="liquid-glass-card rounded-3xl p-8 space-y-8">
        <div className="space-y-3">
          <span id="quiz-mode-label" className="text-white/60 text-xs font-medium uppercase tracking-widest block">Mode</span>
          <div role="group" aria-labelledby="quiz-mode-label" className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {([
              { value: 'practice', label: 'Practice', description: 'Feedback after each question', icon: BookOpen },
              { value: 'exam', label: 'Exam simulation', description: 'Review answers, then get results', icon: ClipboardCheck },
            ] as const).map(({ value, label, description, icon: Icon }) => (
              <button
                key={value}
                type="button"
                aria-pressed={mode === value}
                onClick={() => setMode(value)}
                disabled={isGenerating}
                className={`rounded-2xl border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black disabled:opacity-50 disabled:cursor-not-allowed ${
                  mode === value
                    ? 'border-white/70 bg-white/10 text-white'
                    : 'border-white/10 bg-white/[0.03] text-white/60 hover:border-white/30 hover:bg-white/[0.06]'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <Icon size={18} aria-hidden="true" className="shrink-0" />
                  <span className="text-sm font-semibold">{label}</span>
                  <span className={`ml-auto flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${mode === value ? 'border-white bg-white text-black' : 'border-white/25'}`} aria-hidden="true">
                    {mode === value && <Check size={13} strokeWidth={3} />}
                  </span>
                </span>
                <span className="mt-2 block text-xs leading-relaxed text-white/60">{description}</span>
              </button>
            ))}
          </div>
          {mode === 'exam' && <p className="text-sm text-white/60">Revisit and change answers until you submit or time runs out. No hints or feedback during the exam. Refreshing restores answers in this tab while the timer keeps running. Submission must reach the server within 30 seconds of the deadline.</p>}
        </div>

        {/* Questions slider */}
        <div className="space-y-3">
          <div className="flex justify-between items-baseline">
            <label htmlFor="num-questions" className="text-white/60 text-xs font-medium uppercase tracking-widest">Questions</label>
            <span className="text-white text-2xl font-semibold tabular-nums">{numQuestions}</span>
          </div>
          <input
            id="num-questions"
            type="range" min={QUIZ_LIMITS.MIN_QUESTIONS} max={QUIZ_LIMITS.MAX_QUESTIONS} value={numQuestions}
            onChange={(e) => setNumQuestions(Number(e.target.value))}
            className="w-full h-1 rounded-full appearance-none cursor-pointer"
            style={{
              background: `linear-gradient(to right, rgba(255,255,255,0.8) ${sliderPct}%, rgba(255,255,255,0.1) ${sliderPct}%)`
            }}
          />
          <div className="flex justify-between text-white/30 text-xs font-medium">
            <span>{QUIZ_LIMITS.MIN_QUESTIONS}</span><span>{QUIZ_LIMITS.MAX_QUESTIONS}</span>
          </div>
        </div>

        {/* Time limit */}
        <div className="space-y-3">
          <label htmlFor="time-limit" className="text-white/60 text-xs font-medium uppercase tracking-widest block">Time Limit</label>
          <select
            id="time-limit"
            value={timeLimit}
            onChange={(e) => setTimeLimit(Number(e.target.value))}
            className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-4 py-3 text-sm
              focus:outline-none focus:border-white/30 transition-colors cursor-pointer appearance-none"
          >
            {TIME_OPTIONS.map((t) => (
              <option key={t} value={t} className="bg-black">{t} minutes</option>
            ))}
          </select>
        </div>

        {/* Difficulty */}
        <div className="space-y-3">
          <span id="difficulty-label" className="text-white/60 text-xs font-medium uppercase tracking-widest block">Difficulty</span>
          <div role="group" aria-labelledby="difficulty-label" className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {DIFFICULTIES.map((level) => (
              <button
                key={level}
                onClick={() => setDifficulty(level)}
                className={`py-2.5 rounded-xl text-sm font-medium capitalize transition-all cursor-pointer ${
                  difficulty === level
                    ? 'bg-white text-black'
                    : 'bg-white/5 text-white/60 border border-white/10 hover:bg-white/10 hover:text-white'
                }`}
              >
                {level}
              </button>
            ))}
          </div>
        </div>

        {/* Start button */}
        <button
          onClick={handleStart}
          disabled={isGenerating}
          className="w-full flex items-center justify-center gap-2 bg-white text-black font-semibold py-4 rounded-xl
            hover:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
        >
          {isGenerating ? (
            <>
              <span className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
              Generating…
            </>
          ) : (
            <><Zap size={16} /> Start Quiz</>
          )}
        </button>
      </div>
    </div>
  );
}
