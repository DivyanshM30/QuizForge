import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Take this quiz',
  description: 'A friend shared a QuizForge quiz with you - take it, no account needed.',
  robots: { index: false },
};

export default function PublicQuizLayout({ children }: { children: React.ReactNode }) {
  return children;
}
