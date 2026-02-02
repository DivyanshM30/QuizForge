'use client';

import { QuizResult } from '@/lib/types';
import { formatTime } from '@/lib/quiz-utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface ResultsDashboardProps {
  result: QuizResult;
  onRetake: () => void;
}

export default function ResultsDashboard({ result, onRetake }: ResultsDashboardProps) {
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
      <div className="bg-gradient-to-br from-primary-600/20 to-purple-600/20 backdrop-blur-sm rounded-2xl p-8 border border-primary-500/30">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-100 mb-4">Quiz Results</h2>
          <div className="flex items-center justify-center gap-8 flex-wrap">
            <div>
              <div className="text-5xl font-bold text-primary-400">
                {result.score}/{result.totalQuestions}
              </div>
              <div className="text-gray-400 text-sm mt-1">Score</div>
            </div>
            <div>
              <div className="text-5xl font-bold text-primary-400">{result.accuracy}%</div>
              <div className="text-gray-400 text-sm mt-1">Accuracy</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-primary-400">
                {formatTime(result.timeTaken)}
              </div>
              <div className="text-gray-400 text-sm mt-1">Time Taken</div>
            </div>
          </div>
        </div>
      </div>

      {/* Topic Performance Chart */}
      {result.topicPerformance.length > 0 && (
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700">
          <h3 className="text-xl font-bold text-gray-100 mb-6">Topic-wise Performance</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis
                dataKey="topic"
                stroke="#9ca3af"
                angle={-45}
                textAnchor="end"
                height={100}
                fontSize={12}
              />
              <YAxis stroke="#9ca3af" domain={[0, 100]} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1f2937',
                  border: '1px solid #374151',
                  borderRadius: '8px',
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
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700">
            <h3 className="text-xl font-bold text-gray-100 mb-4">Topics to Review</h3>
            <ul className="space-y-2">
              {result.weakTopics.map((topic, index) => (
                <li key={index} className="flex items-center gap-2 text-gray-300">
                  <span className="text-red-400">•</span>
                  <span>{topic}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700">
          <h3 className="text-xl font-bold text-gray-100 mb-4">Revision Suggestions</h3>
          <ul className="space-y-2">
            {result.revisionSuggestions.map((suggestion, index) => (
              <li key={index} className="text-gray-300 text-sm leading-relaxed">
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
          className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
        >
          Export Results (JSON)
        </button>
        <button
          onClick={onRetake}
          className="flex-1 bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
        >
          Retake Quiz
        </button>
      </div>
    </div>
  );
}
