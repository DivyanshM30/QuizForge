'use client';

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, AreaChart, Area,
} from 'recharts';
import { TrendingUp, BarChart3 } from 'lucide-react';
import { barColorForPct } from '@/lib/quiz-utils';

interface PerformancePoint {
  quiz: string;
  accuracy: number;
  score: number;
  total: number;
}

interface TopicDatum {
  topic: string;
  fullTopic: string;
  percentage: number;
  correct: number;
  total: number;
}

interface DashboardChartsProps {
  performanceData: PerformancePoint[];
  topicAggregated: TopicDatum[];
}

/**
 * Recharts is heavy; this whole block is lazy-loaded (ssr: false) by the
 * dashboard so the library stays out of the initial bundle and only ships
 * once the user actually has charts to render.
 */
export default function DashboardCharts({ performanceData, topicAggregated }: DashboardChartsProps) {
  return (
    <div className="grid md:grid-cols-2 gap-4 animate-fade-in" style={{ animationDelay: '200ms' }}>

      {/* Accuracy over time */}
      <div className="liquid-glass rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <TrendingUp size={14} className="text-white/40" />
          <span className="text-white/40 text-xs font-medium uppercase tracking-widest">
            Accuracy Over Time
          </span>
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={performanceData} margin={{ top: 4, right: 4, bottom: 4, left: -20 }}>
            <defs>
              <linearGradient id="accGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#818cf8" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#818cf8" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="2 4" stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis
              dataKey="quiz"
              stroke="rgba(255,255,255,0.15)"
              tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }}
            />
            <YAxis
              stroke="rgba(255,255,255,0.15)"
              tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }}
              domain={[0, 100]}
              width={35}
            />
            <Tooltip
              contentStyle={{
                background: 'rgba(0,0,0,0.85)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '12px',
                color: 'white',
                fontSize: 12,
              }}
              formatter={(value: number) => [`${value}%`, 'Accuracy']}
            />
            <Area
              type="monotone"
              dataKey="accuracy"
              stroke="#818cf8"
              strokeWidth={2}
              fill="url(#accGradient)"
              dot={{ r: 3, fill: '#818cf8', stroke: '#818cf8' }}
              activeDot={{ r: 5, fill: '#a5b4fc' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Topic mastery */}
      {topicAggregated.length > 0 && (
        <div className="liquid-glass rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <BarChart3 size={14} className="text-white/40" />
            <span className="text-white/40 text-xs font-medium uppercase tracking-widest">
              Topic Mastery
            </span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={topicAggregated} margin={{ top: 4, right: 4, bottom: 50, left: -20 }}>
              <CartesianGrid strokeDasharray="2 4" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis
                dataKey="topic"
                stroke="rgba(255,255,255,0.15)"
                tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }}
                angle={-35}
                textAnchor="end"
                height={60}
              />
              <YAxis
                stroke="rgba(255,255,255,0.15)"
                tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }}
                domain={[0, 100]}
                width={35}
              />
              <Tooltip
                cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                contentStyle={{
                  background: 'rgba(0,0,0,0.85)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '12px',
                  color: 'white',
                  fontSize: 12,
                }}
                formatter={(value: number, _: any, props: any) => [
                  `${value}%  (${props.payload.correct}/${props.payload.total})`,
                  props.payload.fullTopic,
                ]}
              />
              <Bar dataKey="percentage" radius={[6, 6, 0, 0]}>
                {topicAggregated.map((entry, i) => (
                  <Cell key={i} fill={barColorForPct(entry.percentage)} fillOpacity={0.8} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
