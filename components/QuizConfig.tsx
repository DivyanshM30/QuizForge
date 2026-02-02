'use client';

import { useState } from 'react';
import { QuizConfig } from '@/lib/types';

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
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700">
        <h2 className="text-2xl font-bold text-gray-100 mb-6">Configure Your Quiz</h2>

        {/* Number of Questions */}
        <div className="mb-6">
          <label className="block text-gray-300 font-medium mb-3">
            Number of Questions: <span className="text-primary-400">{numQuestions}</span>
          </label>
          <input
            type="range"
            min="5"
            max="50"
            value={numQuestions}
            onChange={(e) => setNumQuestions(Number(e.target.value))}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-primary-500"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>5</span>
            <span>50</span>
          </div>
        </div>

        {/* Time Limit */}
        <div className="mb-6">
          <label className="block text-gray-300 font-medium mb-3">
            Time Limit: <span className="text-primary-400">{timeLimit} minutes</span>
          </label>
          <select
            value={timeLimit}
            onChange={(e) => setTimeLimit(Number(e.target.value))}
            className="w-full bg-gray-700 border border-gray-600 text-gray-100 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
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
          <label className="block text-gray-300 font-medium mb-3">Difficulty Level</label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {(['easy', 'medium', 'hard', 'mixed'] as const).map((level) => (
              <button
                key={level}
                onClick={() => setDifficulty(level)}
                className={`px-4 py-3 rounded-lg font-medium transition-all ${
                  difficulty === level
                    ? 'bg-primary-600 text-white shadow-lg scale-105'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
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
          className="w-full bg-primary-600 hover:bg-primary-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-semibold py-4 px-6 rounded-lg transition-all transform hover:scale-105 disabled:scale-100"
        >
          {isGenerating ? 'Generating Questions...' : 'Start Quiz'}
        </button>
      </div>
    </div>
  );
}
