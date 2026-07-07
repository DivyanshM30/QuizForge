import type { Metadata } from 'next';
import { Fira_Code, Fira_Sans } from 'next/font/google';
import { Providers } from './providers';
import './globals.css';

const firaCode = Fira_Code({ subsets: ['latin'], variable: '--font-fira-code' });
const firaSans = Fira_Sans({ weight: ['300', '400', '500', '600', '700'], subsets: ['latin'], variable: '--font-fira-sans' });

const SITE_URL = process.env.NEXTAUTH_URL ?? 'http://localhost:3000';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'QuizForge AI',
    template: '%s · QuizForge AI',
  },
  description:
    'Turn study documents into Gemini-powered MCQs, take timed quizzes, and get detailed performance analytics.',
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    siteName: 'QuizForge AI',
    title: 'QuizForge AI — Study smarter, not harder',
    description:
      'Upload your study material and get AI-powered MCQs, timed quizzes, and performance analytics.',
    url: '/',
    images: [{ url: '/icon.png', width: 512, height: 512, alt: 'QuizForge AI' }],
  },
  twitter: {
    card: 'summary',
    title: 'QuizForge AI — Study smarter, not harder',
    description:
      'Upload your study material and get AI-powered MCQs, timed quizzes, and performance analytics.',
    images: ['/icon.png'],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${firaCode.variable} ${firaSans.variable} font-sans bg-black text-slate-100`}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
