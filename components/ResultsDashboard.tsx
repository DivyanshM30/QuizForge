'use client';

import { QuizResult } from '@/lib/types';
import { formatTime } from '@/lib/quiz-utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Download, RotateCcw } from 'lucide-react';

interface ResultsDashboardProps {
  result: QuizResult;
  onRetake: () => void;
}

const getBarColor = (pct: number) => pct >= 80 ? '#4ade80' : pct >= 60 ? '#facc15' : '#f87171';

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
  const scoreColor = result.accuracy >= 80 ? 'text-green-400' : result.accuracy >= 60 ? 'text-yellow-400' : 'text-red-400';

  return (
    <div className="w-full max-w-4xl mx-auto space-y-5">

      {/* Score summary */}
      <div className="liquid-glass rounded-3xl p-8">
        <p className="text-white/40 text-xs font-medium uppercase tracking-widest text-center mb-6">Results</p>
        <div className="flex flex-wrap justify-center gap-10">
          <div className="text-center">
            <div className={`text-5xl font-bold tabular-nums ${scoreColor}`}>
              {result.score}<span className="text-white/20 text-3xl">/{result.totalQuestions}</span>
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
          <p className="text-white/40 text-xs font-medium uppercase tracking-widest">Topic Performance</p>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={chartData} margin={{ top: 4, right: 4, bottom: 60, left: 0 }}>
              <CartesianGrid strokeDasharray="2 4" stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis
                dataKey="topic" stroke="rgba(255,255,255,0.2)" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }}
                angle={-40} textAnchor="end" height={70}
              />
              <YAxis stroke="rgba(255,255,255,0.2)" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} domain={[0, 100]} width={30} />
              <Tooltip
                cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                contentStyle={{ background: 'rgba(0,0,0,0.85)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: 'white', fontSize: 12 }}
                formatter={(value: number, _: any, props: any) => [`${value}%`, props.payload.fullTopic]}
              />
              <Bar dataKey="percentage" radius={[6, 6, 0, 0]}>
                {chartData.map((entry, i) => (
                  <Cell key={i} fill={getBarColor(entry.percentage)} fillOpacity={0.85} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Weak topics + suggestions */}
      <div className="grid md:grid-cols-2 gap-5">
        {result.weakTopics.length > 0 && (
          <div className="liquid-glass rounded-3xl p-6 space-y-3">
            <p className="text-white/40 text-xs font-medium uppercase tracking-widest">Topics to Review</p>
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
          <p className="text-white/40 text-xs font-medium uppercase tracking-widest">Revision Suggestions</p>
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
