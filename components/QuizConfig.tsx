'use client';

import { useState } from 'react';
import type { QuizConfig } from '@/lib/types';
import { Zap } from 'lucide-react';

interface QuizConfigProps {
  onStart: (config: QuizConfig) => void;
  isGenerating?: boolean;
}

const DIFFICULTIES = ['easy', 'medium', 'hard', 'mixed'] as const;
const TIME_OPTIONS = [5, 10, 15, 20, 30, 45, 60, 90, 120];

export default function QuizConfig({ onStart, isGenerating = false }: QuizConfigProps) {
  const [numQuestions, setNumQuestions] = useState(10);
  const [timeLimit, setTimeLimit] = useState(15);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard' | 'mixed'>('medium');

  const handleStart = () => onStart({ numQuestions, timeLimit, difficulty });

  const sliderPct = ((numQuestions - 5) / 45) * 100;

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="liquid-glass-card rounded-3xl p-8 space-y-8">

        {/* Questions slider */}
        <div className="space-y-3">
          <div className="flex justify-between items-baseline">
            <span className="text-white/60 text-xs font-medium uppercase tracking-widest">Questions</span>
            <span className="text-white text-2xl font-semibold tabular-nums">{numQuestions}</span>
          </div>
          <input
            type="range" min="5" max="50" value={numQuestions}
            onChange={(e) => setNumQuestions(Number(e.target.value))}
            className="w-full h-1 rounded-full appearance-none cursor-pointer"
            style={{
              background: `linear-gradient(to right, rgba(255,255,255,0.8) ${sliderPct}%, rgba(255,255,255,0.1) ${sliderPct}%)`
            }}
          />
          <div className="flex justify-between text-white/30 text-xs font-medium">
            <span>5</span><span>50</span>
          </div>
        </div>

        {/* Time limit */}
        <div className="space-y-3">
          <span className="text-white/60 text-xs font-medium uppercase tracking-widest block">Time Limit</span>
          <select
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
          <span className="text-white/60 text-xs font-medium uppercase tracking-widest block">Difficulty</span>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
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
