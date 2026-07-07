import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sign in',
  description: 'Sign in to QuizForge AI to continue your learning streak.',
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
