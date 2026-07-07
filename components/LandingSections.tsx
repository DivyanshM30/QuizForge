'use client';

import Link from 'next/link';
import { Upload, Cpu, ClipboardList, BarChart2, Clock, Layers, Globe } from 'lucide-react';
import { LinkedInIcon, GitHubIcon } from '@/components/icons';

/* ─── Data ────────────────────────────────────────────────── */
const features = [
  {
    icon: <Upload size={22} />,
    title: 'Document Upload',
    body: 'PDF or DOCX — drop your study material and we extract the content instantly.',
  },
  {
    icon: <Cpu size={22} />,
    title: 'AI-Powered MCQs',
    body: 'Gemini AI reads your document, understands context, and generates accurate multiple-choice questions with explanations.',
  },
  {
    icon: <ClipboardList size={22} />,
    title: 'Configurable Quizzes',
    body: 'Choose difficulty (easy → mixed), number of questions, and a custom time limit before every session.',
  },
  {
    icon: <Clock size={22} />,
    title: 'Timed Sessions',
    body: 'A live countdown timer keeps you honest. Critical-time warnings help you pace through every question.',
  },
  {
    icon: <BarChart2 size={22} />,
    title: 'Instant Analytics',
    body: 'Per-topic performance charts, accuracy scores, and personalised revision suggestions after every quiz.',
  },
  {
    icon: <Layers size={22} />,
    title: 'Full History',
    body: 'Every attempt is saved. Revisit past results, spot patterns, and track how you improve over time.',
  },
];

const steps = [
  {
    num: '01',
    title: 'Upload your material',
    body: 'Drag and drop a PDF or DOCX document. Our parser extracts the raw content.',
  },
  {
    num: '02',
    title: 'Configure the quiz',
    body: 'Set difficulty, pick how many questions you want, and choose a time limit that fits your schedule.',
  },
  {
    num: '03',
    title: 'Take the quiz',
    body: 'Answer AI-crafted MCQs under timed conditions. Instant feedback and explanations after each answer.',
  },
  {
    num: '04',
    title: 'Review & improve',
    body: 'Study your topic-wise performance chart, review weak areas, and re-take until you ace it.',
  },
];

function SectionLabel({ children }: { children: string }) {
  return (
    <span className="inline-block text-white/40 text-xs font-medium uppercase tracking-[0.2em] mb-4">
      {children}
    </span>
  );
}

export default function LandingSections() {
  return (
    <div className="bg-black text-white">

      {/* ── Features ─────────────────────────────────────────── */}
      <section id="features" className="relative px-6 py-28 max-w-6xl mx-auto">
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[300px] rounded-full bg-white/[0.02] blur-3xl" />
        </div>

        <div className="relative text-center mb-16 space-y-3">
          <SectionLabel>Features</SectionLabel>
          <h2
            className="font-display text-4xl md:text-5xl text-white tracking-tight"
          >
            Everything you need to<br className="hidden md:block" /> study smarter
          </h2>
          <p className="text-white/40 max-w-xl mx-auto text-sm leading-relaxed">
            Upload once, quiz endlessly. QuizForge handles the hard part so you can focus on learning.
          </p>
        </div>

        <div className="relative grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map(({ icon, title, body }) => (
            <div key={title} className="liquid-glass-card rounded-2xl p-6 space-y-3 hover:bg-white/[0.03] transition-colors">
              <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/60">
                {icon}
              </div>
              <h3 className="text-white font-semibold text-base">{title}</h3>
              <p className="text-white/45 text-sm leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      {/* ── How It Works ─────────────────────────────────────── */}
      <section id="how-it-works" className="relative px-6 py-28 max-w-5xl mx-auto">
        <div className="text-center mb-16 space-y-3">
          <SectionLabel>How it works</SectionLabel>
          <h2
            className="font-display text-4xl md:text-5xl text-white tracking-tight"
          >
            From upload to insight<br className="hidden md:block" /> in four steps
          </h2>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {steps.map(({ num, title, body }) => (
            <div key={num} className="liquid-glass-card rounded-2xl p-7 flex gap-5 hover:bg-white/[0.03] transition-colors">
              <span
                className="font-display text-5xl font-bold text-white leading-none flex-shrink-0 tabular-nums select-none"
              >
                {num}
              </span>
              <div className="space-y-1.5 pt-1">
                <h3 className="text-white font-semibold">{title}</h3>
                <p className="text-white/45 text-sm leading-relaxed">{body}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <Link
            href="/register"
            className="inline-flex items-center gap-2 bg-white text-black font-semibold px-8 py-3.5 rounded-xl hover:bg-white/90 transition-colors text-sm"
          >
            Get started free →
          </Link>
        </div>
      </section>

      <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      {/* ── About ────────────────────────────────────────────── */}
      <section id="about" className="relative px-6 py-28 max-w-3xl mx-auto text-center space-y-8">
        <div className="space-y-3">
          <SectionLabel>About</SectionLabel>
          <h2
            className="font-display text-4xl md:text-5xl text-white tracking-tight"
          >
            Built by a student,<br className="hidden md:block" /> for students
          </h2>
        </div>

        <p className="text-white/50 text-base leading-relaxed max-w-2xl mx-auto">
          QuizForge started as a personal frustration — spending more time making flashcards than actually studying.
          The idea was simple: paste your notes, get an instant exam. Now it&apos;s a full platform that reads your documents,
          understands the material, and generates exam-quality MCQs with explanations and analytics — so revision
          becomes active, not passive.
        </p>

        <p className="text-white/35 text-sm leading-relaxed">
          Powered by <span className="text-white/60">Google Gemini AI</span> · Built with{' '}
          <span className="text-white/60">Next.js 14</span> ·{' '}
          <span className="text-white/60">TypeScript</span> ·{' '}
          <span className="text-white/60">Tailwind CSS</span>
        </p>

        <div className="flex items-center justify-center gap-3 pt-2">
          <a
            href="https://linkedin.com/in/divyanshm30"
            target="_blank" rel="noopener noreferrer"
            className="liquid-glass rounded-full px-5 py-2.5 flex items-center gap-2 text-white/60 hover:text-white text-sm transition-colors hover:bg-white/5"
          >
            <LinkedInIcon size={15} /> LinkedIn
          </a>
          <a
            href="https://github.com/DivyanshM30"
            target="_blank" rel="noopener noreferrer"
            className="liquid-glass rounded-full px-5 py-2.5 flex items-center gap-2 text-white/60 hover:text-white text-sm transition-colors hover:bg-white/5"
          >
            <GitHubIcon size={15} /> GitHub
          </a>
          <a
            href="https://divyanshm.dev"
            target="_blank" rel="noopener noreferrer"
            className="liquid-glass rounded-full px-5 py-2.5 flex items-center gap-2 text-white/60 hover:text-white text-sm transition-colors hover:bg-white/5"
          >
            <Globe size={15} /> Portfolio
          </a>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────── */}
      <footer className="border-t border-white/[0.06] px-6 py-8">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-white/55 text-xs">
          <span>© {new Date().getFullYear()} QuizForge · All rights reserved</span>
          <div className="flex items-center gap-6">
            <Link href="#features" className="hover:text-white transition-colors">Features</Link>
            <Link href="#how-it-works" className="hover:text-white transition-colors">How it works</Link>
            <Link href="#about" className="hover:text-white transition-colors">About</Link>
            <Link href="/login" className="hover:text-white transition-colors">Sign in</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
