'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { barColorForPct } from '@/lib/quiz-utils';

interface ChartDatum {
  topic: string;
  percentage: number;
  fullTopic: string;
}

/** Lazy-loaded (ssr: false) so recharts stays out of the results route's initial bundle. */
export default function ResultsTopicChart({ chartData }: { chartData: ChartDatum[] }) {
  return (
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
          formatter={(value, _name, props) => [`${value}%`, props.payload.fullTopic]}
        />
        <Bar dataKey="percentage" radius={[6, 6, 0, 0]}>
          {chartData.map((entry, i) => (
            <Cell key={i} fill={barColorForPct(entry.percentage)} fillOpacity={0.85} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
