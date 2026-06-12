'use client';

import { useState } from 'react';
import type { QuizConfig } from '@/lib/types';

interface QuizConfigProps {
  onStart: (config: QuizConfig) => void;
  isGenerating?: boolean;
}

export default function QuizConfig({ onStart, isGenerating = false }: QuizConfigProps) {
  const [numQuestions, setNumQuestions] = useState(10);
  const [timeLimit, setTimeLimit] = useState(15);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard' | 'mixed'>('medium');

  const handleStart = () => {
    onStart({
      numQuestions,
      timeLimit,
      difficulty,
    });
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-indigo-100 dark:border-slate-800 shadow-sm">
        <h2 className="text-2xl font-extrabold text-indigo-950 dark:text-slate-100 mb-6">Configure Your Quiz</h2>

        {/* Number of Questions */}
        <div className="mb-6">
          <label className="block text-slate-700 dark:text-slate-300 font-bold mb-3">
            Number of Questions: <span className="text-primary-600 dark:text-primary-400">{numQuestions}</span>
          </label>
          <input
            type="range"
            min="5"
            max="50"
            value={numQuestions}
            onChange={(e) => setNumQuestions(Number(e.target.value))}
            className="w-full h-2 bg-indigo-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-primary-600 dark:accent-primary-400"
          />
          <div className="flex justify-between text-xs font-medium text-slate-500 dark:text-slate-400 mt-1">
            <span>5</span>
            <span>50</span>
          </div>
        </div>

        {/* Time Limit */}
        <div className="mb-6">
          <label className="block text-slate-700 dark:text-slate-300 font-bold mb-3">
            Time Limit: <span className="text-primary-600 dark:text-primary-400">{timeLimit} minutes</span>
          </label>
          <select
            value={timeLimit}
            onChange={(e) => setTimeLimit(Number(e.target.value))}
            className="w-full bg-slate-50 dark:bg-slate-800 border border-indigo-100 dark:border-slate-700 text-indigo-950 dark:text-slate-100 font-medium rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            <option value={5}>5 minutes</option>
            <option value={10}>10 minutes</option>
            <option value={15}>15 minutes</option>
            <option value={20}>20 minutes</option>
            <option value={30}>30 minutes</option>
            <option value={45}>45 minutes</option>
            <option value={60}>60 minutes</option>
            <option value={90}>90 minutes</option>
            <option value={120}>120 minutes</option>
          </select>
        </div>

        {/* Difficulty Level */}
        <div className="mb-6">
          <label className="block text-slate-700 dark:text-slate-300 font-bold mb-3">Difficulty Level</label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {(['easy', 'medium', 'hard', 'mixed'] as const).map((level) => (
              <button
                key={level}
                onClick={() => setDifficulty(level)}
                className={`px-4 py-3 rounded-lg font-bold transition-all ${
                  difficulty === level
                    ? 'bg-primary-600 text-white shadow-md scale-[1.02]'
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-indigo-100 dark:border-slate-700 hover:bg-indigo-50 dark:hover:bg-slate-700 hover:text-primary-600 dark:hover:text-primary-400'
                }`}
              >
                {level.charAt(0).toUpperCase() + level.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Start Button */}
        <button
          onClick={handleStart}
          disabled={isGenerating}
          className="w-full bg-cta-500 hover:bg-cta-600 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white font-bold py-4 px-6 rounded-lg transition-all transform hover:scale-[1.02] disabled:scale-100 shadow-sm"
        >
          {isGenerating ? 'Generating Questions...' : 'Start Quiz'}
        </button>
      </div>
    </div>
  );
}
