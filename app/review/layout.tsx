import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Daily Review',
  description: 'Spaced-repetition review of the questions you missed.',
  robots: { index: false },
};

export default function ReviewLayout({ children }: { children: React.ReactNode }) {
  return children;
}
