import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Documents',
  description: 'Your uploaded study documents — generate new quizzes without re-uploading.',
  robots: { index: false },
};

export default function DocumentsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
