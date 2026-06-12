import type { Metadata } from 'next';
import { Fira_Code, Fira_Sans } from 'next/font/google';
import { Providers } from './providers';
import './globals.css';

const firaCode = Fira_Code({ subsets: ['latin'], variable: '--font-fira-code' });
const firaSans = Fira_Sans({ weight: ['300', '400', '500', '600', '700'], subsets: ['latin'], variable: '--font-fira-sans' });

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
    <html lang="en" suppressHydrationWarning>
      <body className={`${firaCode.variable} ${firaSans.variable} font-sans`}>
        <Providers>
          <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-indigo-950 dark:text-slate-100">
            {children}
          </div>
        </Providers>
      </body>
    </html>
  );
}
