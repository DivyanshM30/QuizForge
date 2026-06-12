'use client';

import { QuizResult } from '@/lib/types';
import { formatTime } from '@/lib/quiz-utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useTheme } from 'next-themes';

interface ResultsDashboardProps {
  result: QuizResult;
  onRetake: () => void;
}

export default function ResultsDashboard({ result, onRetake }: ResultsDashboardProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const handleExportJSON = () => {
    const dataStr = JSON.stringify(result, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `quiz-result-${result.id}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const chartData = result.topicPerformance.map((topic) => ({
    topic: topic.topic.length > 15 ? topic.topic.substring(0, 15) + '...' : topic.topic,
    percentage: topic.percentage,
    fullTopic: topic.topic,
  }));

  const getColor = (percentage: number) => {
    if (percentage >= 80) return '#10b981'; // green
    if (percentage >= 60) return '#f59e0b'; // yellow
    return '#ef4444'; // red
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      {/* Score Summary */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 border border-indigo-100 dark:border-slate-800 shadow-sm">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-indigo-950 dark:text-slate-100 mb-4">Quiz Results</h2>
          <div className="flex items-center justify-center gap-8 flex-wrap">
            <div>
              <div className="text-5xl font-extrabold text-primary-600 dark:text-primary-400">
                {result.score}/{result.totalQuestions}
              </div>
              <div className="text-slate-500 dark:text-slate-400 font-bold text-sm mt-1 uppercase tracking-wider">Score</div>
            </div>
            <div>
              <div className="text-5xl font-extrabold text-primary-600 dark:text-primary-400">{result.accuracy}%</div>
              <div className="text-slate-500 dark:text-slate-400 font-bold text-sm mt-1 uppercase tracking-wider">Accuracy</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-primary-600 dark:text-primary-400">
                {formatTime(result.timeTaken)}
              </div>
              <div className="text-slate-500 dark:text-slate-400 font-bold text-sm mt-1 uppercase tracking-wider">Time Taken</div>
            </div>
          </div>
        </div>
      </div>

      {/* Topic Performance Chart */}
      {result.topicPerformance.length > 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-indigo-100 dark:border-slate-800 shadow-sm">
          <h3 className="text-xl font-extrabold text-indigo-950 dark:text-slate-100 mb-6">Topic-wise Performance</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#e2e8f0'} />
              <XAxis
                dataKey="topic"
                stroke={isDark ? '#94a3b8' : '#64748b'}
                angle={-45}
                textAnchor="end"
                height={100}
                fontSize={12}
                fontWeight={600}
              />
              <YAxis stroke={isDark ? '#94a3b8' : '#64748b'} domain={[0, 100]} fontWeight={600} />
              <Tooltip
                contentStyle={{
                  backgroundColor: isDark ? '#0f172a' : '#ffffff',
                  border: isDark ? '1px solid #334155' : '1px solid #e2e8f0',
                  borderRadius: '8px',
                  fontWeight: 600,
                  color: isDark ? '#f1f5f9' : '#1e293b'
                }}
                formatter={(value: number, name: string, props: any) => [
                  `${value}%`,
                  props.payload.fullTopic,
                ]}
              />
              <Bar dataKey="percentage" radius={[8, 8, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getColor(entry.percentage)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Weak Topics & Suggestions */}
      <div className="grid md:grid-cols-2 gap-6">
        {result.weakTopics.length > 0 && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-red-100 dark:border-red-950/20 shadow-sm">
            <h3 className="text-xl font-extrabold text-indigo-950 dark:text-slate-100 mb-4">Topics to Review</h3>
            <ul className="space-y-2">
              {result.weakTopics.map((topic, index) => (
                <li key={index} className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-medium">
                  <span className="text-red-500 font-bold">•</span>
                  <span>{topic}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-indigo-100 dark:border-slate-800 shadow-sm">
          <h3 className="text-xl font-extrabold text-indigo-950 dark:text-slate-100 mb-4">Revision Suggestions</h3>
          <ul className="space-y-2">
            {result.revisionSuggestions.map((suggestion, index) => (
              <li key={index} className="text-slate-600 dark:text-slate-400 font-medium text-sm leading-relaxed">
                {suggestion}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4">
        <button
          onClick={handleExportJSON}
          className="flex-1 bg-white dark:bg-slate-900 border-2 border-indigo-100 dark:border-slate-800 hover:border-primary-300 dark:hover:border-primary-500 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold py-4 px-6 rounded-xl transition-colors shadow-sm"
        >
          Export Results (JSON)
        </button>
        <button
          onClick={onRetake}
          className="flex-1 bg-cta-500 hover:bg-cta-600 text-white font-bold py-4 px-6 rounded-xl transition-colors shadow-sm"
        >
          Retake Quiz
        </button>
      </div>
    </div>
  );
}
