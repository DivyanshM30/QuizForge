import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Quiz history',
  description: 'Every quiz attempt, saved. Revisit results and track your progress.',
  robots: { index: false },
};

export default function HistoryLayout({ children }: { children: React.ReactNode }) {
  return children;
}
