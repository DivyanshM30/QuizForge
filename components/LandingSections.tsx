'use client';

import Link from 'next/link';
import { Upload, Cpu, ClipboardList, BarChart2, Clock, Layers, Globe } from 'lucide-react';

/* ─── Inline brand icons (not in this lucide-react version) ── */
function LinkedInIcon() {
  return (
    <svg width={15} height={15} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6zM2 9h4v12H2z" />
      <circle cx="4" cy="4" r="2" />
    </svg>
  );
}
function GitHubIcon() {
  return (
    <svg width={15} height={15} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
    </svg>
  );
}

/* ─── Data ────────────────────────────────────────────────── */
const features = [
  {
    icon: <Upload size={22} />,
    title: 'Universal Upload',
    body: 'PDF, DOCX, PPTX or plain text — drop any study material and we extract the content instantly.',
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
    body: 'Drag and drop a PDF, slide deck, or any text document. Our parser extracts the raw content.',
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
            className="text-4xl md:text-5xl text-white tracking-tight"
            style={{ fontFamily: "'Instrument Serif', serif" }}
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
            className="text-4xl md:text-5xl text-white tracking-tight"
            style={{ fontFamily: "'Instrument Serif', serif" }}
          >
            From upload to insight<br className="hidden md:block" /> in four steps
          </h2>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {steps.map(({ num, title, body }) => (
            <div key={num} className="liquid-glass-card rounded-2xl p-7 flex gap-5 hover:bg-white/[0.03] transition-colors">
              <span
                className="text-5xl font-bold text-white/8 leading-none flex-shrink-0 tabular-nums select-none"
                style={{ fontFamily: "'Instrument Serif', serif" }}
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
            className="text-4xl md:text-5xl text-white tracking-tight"
            style={{ fontFamily: "'Instrument Serif', serif" }}
          >
            Built by a student,<br className="hidden md:block" /> for students
          </h2>
        </div>

        <p className="text-white/50 text-base leading-relaxed max-w-2xl mx-auto">
          QuizForge started as a personal frustration — spending more time making flashcards than actually studying.
          The idea was simple: paste your notes, get an instant exam. Now it's a full platform that reads your documents,
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
            <LinkedInIcon /> LinkedIn
          </a>
          <a
            href="https://github.com/DivyanshM30"
            target="_blank" rel="noopener noreferrer"
            className="liquid-glass rounded-full px-5 py-2.5 flex items-center gap-2 text-white/60 hover:text-white text-sm transition-colors hover:bg-white/5"
          >
            <GitHubIcon /> GitHub
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
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-white/25 text-xs">
          <span>© {new Date().getFullYear()} QuizForge · All rights reserved</span>
          <div className="flex items-center gap-6">
            <Link href="#features" className="hover:text-white/50 transition-colors">Features</Link>
            <Link href="#how-it-works" className="hover:text-white/50 transition-colors">How it works</Link>
            <Link href="#about" className="hover:text-white/50 transition-colors">About</Link>
            <Link href="/login" className="hover:text-white/50 transition-colors">Sign in</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
