import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Providers } from './providers';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'QuizForge AI',
  description:
    'Turn study documents into Gemini-powered MCQs, take timed quizzes, and get detailed performance analytics.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          <div className="min-h-screen bg-gradient-to-b from-[#080a12] via-[#0f1423] to-[#080a12]">
            {children}
          </div>
        </Providers>
      </body>
    </html>
  );
}
