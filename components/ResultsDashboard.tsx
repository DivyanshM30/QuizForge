'use client';

import dynamic from 'next/dynamic';
import { QuizResult } from '@/lib/types';
import { formatTime, accuracyTextClass } from '@/lib/quiz-utils';
import { Download, RotateCcw } from 'lucide-react';

/* Recharts is lazy-loaded so it stays out of the results route's initial bundle. */
const ResultsTopicChart = dynamic(() => import('@/components/charts/ResultsTopicChart'), {
  ssr: false,
  loading: () => <div className="h-[240px] animate-pulse rounded-2xl bg-white/[0.03]" />,
});

interface ResultsDashboardProps {
  result: QuizResult;
  onRetake: () => void;
}

export default function ResultsDashboard({ result, onRetake }: ResultsDashboardProps) {
  const chartData = result.topicPerformance.map((t) => ({
    topic: t.topic.length > 14 ? t.topic.slice(0, 14) + '…' : t.topic,
    percentage: t.percentage,
    fullTopic: t.topic,
  }));

  const handleExportJSON = () => {
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `quiz-result-${result.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  /* Score ring colour */
  const scoreColor = accuracyTextClass(result.accuracy);

  return (
    <div className="w-full max-w-4xl mx-auto space-y-5">

      {/* Score summary */}
      <div className="liquid-glass rounded-3xl p-8">
        <h2 className="text-white/40 text-xs font-medium uppercase tracking-widest text-center mb-6">Results</h2>
        <div className="flex flex-wrap justify-center gap-10">
          <div className="text-center">
            <div className={`text-5xl font-bold tabular-nums ${scoreColor}`}>
              {result.score}<span className="text-white/55 text-3xl">/{result.totalQuestions}</span>
            </div>
            <div className="text-white/40 text-xs uppercase tracking-widest mt-2">Score</div>
          </div>
          <div className="text-center">
            <div className={`text-5xl font-bold tabular-nums ${scoreColor}`}>{result.accuracy}%</div>
            <div className="text-white/40 text-xs uppercase tracking-widest mt-2">Accuracy</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-semibold text-white/70 tabular-nums">{formatTime(result.timeTaken)}</div>
            <div className="text-white/40 text-xs uppercase tracking-widest mt-2">Time taken</div>
          </div>
        </div>
      </div>

      {/* Topic chart */}
      {chartData.length > 0 && (
        <div className="liquid-glass rounded-3xl p-6 space-y-4">
          <h3 className="text-white/40 text-xs font-medium uppercase tracking-widest">Topic Performance</h3>
          <ResultsTopicChart chartData={chartData} />
        </div>
      )}

      {/* Weak topics + suggestions */}
      <div className="grid md:grid-cols-2 gap-5">
        {result.weakTopics.length > 0 && (
          <div className="liquid-glass rounded-3xl p-6 space-y-3">
            <h3 className="text-white/40 text-xs font-medium uppercase tracking-widest">Topics to Review</h3>
            <ul className="space-y-2">
              {result.weakTopics.map((topic, i) => (
                <li key={i} className="flex items-start gap-2 text-white/70 text-sm">
                  <span className="text-red-400 mt-0.5 flex-shrink-0">•</span>
                  {topic}
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="liquid-glass rounded-3xl p-6 space-y-3">
          <h3 className="text-white/40 text-xs font-medium uppercase tracking-widest">Revision Suggestions</h3>
          <ul className="space-y-2">
            {result.revisionSuggestions.map((s, i) => (
              <li key={i} className="text-white/60 text-sm leading-relaxed">{s}</li>
            ))}
          </ul>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={handleExportJSON}
          className="flex-1 flex items-center justify-center gap-2 bg-white/5 border border-white/10 text-white/70 font-medium py-3.5 rounded-xl hover:bg-white/10 hover:text-white transition-all cursor-pointer text-sm"
        >
          <Download size={15} />
          Export JSON
        </button>
        <button
          onClick={onRetake}
          className="flex-1 flex items-center justify-center gap-2 bg-white text-black font-semibold py-3.5 rounded-xl hover:bg-white/90 transition-all cursor-pointer text-sm"
        >
          <RotateCcw size={15} />
          New Quiz
        </button>
      </div>
    </div>
  );
}
