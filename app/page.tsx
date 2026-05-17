'use client';

import { useState } from 'react';
import Link from 'next/link';

const STEPS = [
  {
    num: 1,
    title: 'Configure Your Quiz',
    desc: 'Choose the number of questions, time limit, and difficulty level to tailor the quiz to your needs.',
    img: '/carousel1.png',
  },
  {
    num: 2,
    title: 'Upload Study Material',
    desc: 'Drag & drop your PDF or DOCX. We extract the text instantly — no manual copy-paste required.',
    img: '/carousel2.png',
  },
  {
    num: 3,
    title: 'Take the Quiz',
    desc: 'Answer AI-generated MCQs in a timed, exam-like environment with progress tracking.',
    img: '/carousel3.png',
  },
  {
    num: 4,
    title: 'Get Instant Feedback',
    desc: 'After each answer, see the correct option plus a detailed concept explanation from your material.',
    img: '/carousel4.png',
  },
  {
    num: 5,
    title: 'Review Your Results',
    desc: 'See your score, accuracy, and topic-wise bar charts to understand exactly where you stand.',
    img: '/carousel5.png',
  },
  {
    num: 6,
    title: 'Revision Insights',
    desc: 'Get weak-topic highlights and actionable revision suggestions to focus your study time.',
    img: '/carousel6.png',
  },
];

const FEATURES = [
  { t: 'Document → MCQs', d: 'Upload PDF/DOCX and generate structured questions with explanations.', icon: '📄' },
  { t: 'Timed Exam Mode', d: 'Set time limits, track progress, and auto-finish when time runs out.', icon: '⏱️' },
  { t: 'Instant Feedback', d: 'See correct answers + explanations after each question.', icon: '⚡' },
  { t: 'Topic Analytics', d: 'Bar charts for topic-wise accuracy and weak-area detection.', icon: '📊' },
  { t: 'History & Replay', d: 'Your results persist in localStorage — review anytime.', icon: '🕓' },
  { t: 'Export Results', d: 'Export quiz attempts as JSON for archiving or sharing.', icon: '⬇️' },
];

const TESTIMONIALS = [
  { q: 'I converted my notes into a 20-minute test and immediately saw my weak topics.', a: 'Riya S.', role: 'Engineering Student' },
  { q: 'The explanations are clutch. It feels like an instructor reviewing each mistake.', a: 'Arjun M.', role: 'UPSC Aspirant' },
  { q: 'Topic-wise analytics saved me hours. I stopped revising what I already knew.', a: 'Priya K.', role: 'Medical Student' },
];

const FAQS = [
  { k: 'What files are supported?', v: 'PDF and DOCX. PPT/PPTX should be converted to PDF for best results. Max size is 10 MB.' },
  { k: 'Where is my quiz history stored?', v: 'In your browser\'s localStorage for zero-cost, privacy-first storage.' },
  { k: 'Do I need an API key?', v: 'The hosted version works out of the box. For self-hosting, set GEMINI_API_KEY in your environment variables.' },
  { k: 'Can I export results?', v: 'Yes — results can be exported as JSON from the results screen.' },
];

export default function Home() {
  const [activeFaq, setActiveFaq] = useState<string | null>(null);
  const [activeStep, setActiveStep] = useState(0);

  return (
    <main className="min-h-screen">
      {/* Background effects */}
      <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-grid opacity-30 mask-fade" />
        <div className="absolute -top-40 left-1/2 h-[36rem] w-[36rem] -translate-x-1/2 rounded-full bg-primary-500/10 blur-[120px]" />
        <div className="absolute top-[40%] right-[-12rem] h-[30rem] w-[30rem] rounded-full bg-fuchsia-500/8 blur-[100px]" />
        <div className="absolute bottom-[-12rem] left-[-8rem] h-[28rem] w-[28rem] rounded-full bg-cyan-500/8 blur-[100px]" />
      </div>

      {/* ─── HEADER ─── */}
      <header className="sticky top-0 z-40 border-b border-white/5 bg-black/40 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-4 py-3.5 md:px-8">
          <div className="flex items-center justify-between gap-3">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="relative grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-primary-500/30 to-fuchsia-500/20 border border-white/10 group-hover:border-white/20 transition-colors">
                <svg className="w-4 h-4 text-primary-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <span className="font-semibold text-gray-100 tracking-tight">QuizForge</span>
            </Link>

            <nav className="hidden md:flex items-center gap-8 text-sm text-gray-400">
              <a className="hover:text-white transition-colors duration-200" href="#how-it-works">How It Works</a>
              <a className="hover:text-white transition-colors duration-200" href="#features">Features</a>
              <a className="hover:text-white transition-colors duration-200" href="#testimonials">Testimonials</a>
              <a className="hover:text-white transition-colors duration-200" href="#faq">FAQ</a>
            </nav>

            <div className="flex items-center gap-2">
              <Link
                href="/history"
                className="hidden sm:inline-flex h-9 items-center justify-center rounded-lg px-3.5 text-sm text-gray-300 hover:text-white hover:bg-white/5 transition-all duration-200"
              >
                History
              </Link>
              <Link
                href="/upload"
                className="inline-flex h-9 items-center justify-center rounded-lg bg-white text-black px-4 text-sm font-semibold hover:bg-white/90 transition-colors shadow-lg shadow-white/5"
              >
                Get Started <span className="ml-1.5">→</span>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 md:px-8">
        {/* ─── HERO ─── */}
        <section className="pt-16 md:pt-24 pb-12 md:pb-20">
          <div className="mx-auto max-w-4xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-sm text-gray-300 mb-6 animate-fade-in">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Powered by Gemini AI</span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-7xl font-extrabold tracking-tight text-gray-50 leading-[1.1] animate-fade-in-up">
              Turn your notes into{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-400 via-fuchsia-400 to-cyan-400">
                exam-ready quizzes
              </span>
            </h1>

            <p className="mt-6 text-lg sm:text-xl text-gray-300/90 max-w-2xl mx-auto leading-relaxed animate-fade-in" style={{ animationDelay: '0.15s' }}>
              Upload any study document and get AI-generated MCQs with instant feedback,
              topic analytics, and smart revision suggestions — in seconds.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center animate-fade-in-up" style={{ animationDelay: '0.25s' }}>
              <Link
                href="/upload"
                className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-primary-500 via-fuchsia-500 to-cyan-500 text-white px-8 py-3.5 font-bold text-base shadow-lg shadow-primary-500/20 hover:shadow-primary-500/40 hover:scale-[1.03] transition-all duration-300"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                Start a Quiz — Free
              </Link>
              <a
                href="#how-it-works"
                className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white px-8 py-3.5 font-semibold text-base hover:bg-white/10 transition-all duration-200"
              >
                See How It Works
              </a>
            </div>

            <div className="mt-8 flex flex-wrap justify-center gap-x-8 gap-y-2 text-sm text-gray-400 animate-fade-in" style={{ animationDelay: '0.35s' }}>
              {['Works with PDF & DOCX', 'Instant AI feedback', 'Topic-wise analytics'].map((t) => (
                <span key={t} className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-emerald-400" fill="currentColor" viewBox="0 0 20 20"><path d="M16.707 5.293a1 1 0 00-1.414 0L9 11.586 6.707 9.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l7-7a1 1 0 000-1.414z" /></svg>
                  {t}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* ─── HOW IT WORKS ─── */}
        <section id="how-it-works" className="py-16 md:py-24">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-sm text-gray-300 mb-4">
              <span>Step-by-step</span>
            </div>
            <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight text-gray-50">
              How QuizForge Works
            </h2>
            <p className="mt-3 text-gray-400 max-w-xl mx-auto">
              From document to detailed performance analytics in six simple steps.
            </p>
          </div>

          {/* Steps selector */}
          <div className="flex flex-wrap justify-center gap-2 mb-8">
            {STEPS.map((step, i) => (
              <button
                key={step.num}
                onClick={() => setActiveStep(i)}
                className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-300 ${
                  activeStep === i
                    ? 'bg-gradient-to-r from-primary-500/20 to-fuchsia-500/20 text-white border border-primary-500/30 shadow-lg shadow-primary-500/10'
                    : 'bg-white/5 text-gray-400 border border-white/5 hover:bg-white/10 hover:text-gray-200'
                }`}
              >
                <span className={`grid h-6 w-6 place-items-center rounded-lg text-xs font-bold ${
                  activeStep === i
                    ? 'bg-primary-500 text-white'
                    : 'bg-white/10 text-gray-400'
                }`}>
                  {step.num}
                </span>
                <span className="hidden sm:inline">{step.title}</span>
              </button>
            ))}
          </div>

          {/* Active step display */}
          <div className="mx-auto max-w-5xl">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-2 sm:p-3 shadow-2xl shadow-black/20">
              <div className="relative overflow-hidden rounded-xl border border-white/5">
                {STEPS.map((step, i) => (
                  <div
                    key={step.num}
                    className={`transition-all duration-500 ${
                      activeStep === i
                        ? 'opacity-100 relative'
                        : 'opacity-0 absolute inset-0 pointer-events-none'
                    }`}
                  >
                    <img
                      src={step.img}
                      alt={step.title}
                      className="w-full h-auto object-contain bg-slate-950/80"
                      style={{ maxHeight: '480px' }}
                      loading={i === 0 ? 'eager' : 'lazy'}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Step info card */}
            <div className="mt-6 flex items-start gap-4 rounded-2xl border border-white/10 bg-white/5 p-5 sm:p-6 animate-fade-in" key={activeStep}>
              <div className="flex-shrink-0 grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-primary-500 to-fuchsia-500 text-white font-bold text-lg shadow-lg">
                {STEPS[activeStep].num}
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-50">{STEPS[activeStep].title}</h3>
                <p className="mt-1 text-gray-400 leading-relaxed">{STEPS[activeStep].desc}</p>
              </div>
            </div>
          </div>
        </section>

        {/* ─── FEATURES ─── */}
        <section id="features" className="py-16 md:py-24">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight text-gray-50">
              Built for speed. Designed for clarity.
            </h2>
            <p className="mt-3 text-gray-400 max-w-2xl mx-auto text-base md:text-lg">
              Everything you need to generate, simulate, and improve.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((x, i) => (
              <div
                key={x.t}
                className="group rounded-2xl border border-white/[0.06] bg-white/[0.03] p-6 hover:bg-white/[0.07] hover:border-white/10 transition-all duration-300 animate-fade-in"
                style={{ animationDelay: `${i * 0.07 + 0.1}s` }}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary-500/20 to-cyan-500/10 border border-white/5 grid place-items-center text-2xl">
                    {x.icon}
                  </div>
                  <h3 className="text-base font-semibold text-gray-100">{x.t}</h3>
                </div>
                <p className="text-sm text-gray-400 leading-relaxed">{x.d}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ─── TESTIMONIALS ─── */}
        <section id="testimonials" className="py-16 md:py-24">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight text-gray-50">
              Learner-approved
            </h2>
            <p className="mt-3 text-gray-400 max-w-2xl mx-auto">
              Built for fast revision loops and real exam confidence.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {TESTIMONIALS.map((x, i) => (
              <div
                key={i}
                className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-6 hover:border-white/10 transition-all duration-300 animate-fade-in"
                style={{ animationDelay: `${i * 0.1 + 0.1}s` }}
              >
                <div className="flex items-center gap-1 mb-4 text-yellow-400">
                  {[...Array(5)].map((_, j) => (
                    <svg key={j} className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                  ))}
                </div>
                <p className="text-gray-200/90 leading-relaxed text-[15px] mb-4">&ldquo;{x.q}&rdquo;</p>
                <div className="flex items-center gap-3 pt-3 border-t border-white/5">
                  <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary-500/30 to-fuchsia-500/20 grid place-items-center text-xs font-bold text-white">
                    {x.a.charAt(0)}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-200">{x.a}</div>
                    <div className="text-xs text-gray-500">{x.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ─── FAQ ─── */}
        <section id="faq" className="py-16 md:py-24">
          <div className="mx-auto max-w-3xl">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-50">
                Frequently Asked Questions
              </h2>
              <p className="mt-3 text-gray-400">Quick answers to common questions.</p>
            </div>

            <div className="space-y-2">
              {FAQS.map((item, i) => {
                const open = activeFaq === item.k;
                return (
                  <button
                    key={item.k}
                    type="button"
                    onClick={() => setActiveFaq(open ? null : item.k)}
                    className={`w-full text-left rounded-xl border p-4 sm:p-5 transition-all duration-300 focus:outline-none ${
                      open
                        ? 'bg-white/[0.06] border-white/10'
                        : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.05] hover:border-white/10'
                    } animate-fade-in`}
                    style={{ animationDelay: `${i * 0.06 + 0.1}s` }}
                    aria-expanded={open}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-sm font-medium text-gray-100">{item.k}</span>
                      <svg
                        className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
                        fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                    <div
                      className={`overflow-hidden transition-all duration-300 ${open ? 'max-h-40 opacity-100 mt-3' : 'max-h-0 opacity-0'}`}
                    >
                      {open && <p className="text-sm text-gray-400 leading-relaxed">{item.v}</p>}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* ─── CTA BANNER ─── */}
        <section className="py-12 md:py-16">
          <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-primary-500/10 via-fuchsia-500/5 to-cyan-500/10 p-8 sm:p-12 text-center">
            <h2 className="text-2xl sm:text-4xl font-extrabold text-gray-50 mb-3">
              Ready to ace your next exam?
            </h2>
            <p className="text-gray-300 max-w-lg mx-auto mb-6">
              Upload your notes, generate a quiz, and start improving — all in under a minute.
            </p>
            <Link
              href="/upload"
              className="inline-flex items-center justify-center rounded-xl bg-white text-black px-8 py-3.5 font-bold text-base hover:bg-white/90 transition-colors shadow-xl"
            >
              Get Started for Free <span className="ml-2">→</span>
            </Link>
          </div>
        </section>

        {/* ─── FOOTER ─── */}
        <footer className="border-t border-white/5 py-8 text-sm text-gray-500">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <span className="text-gray-300 font-medium">QuizForge AI</span>
              <span className="mx-2 text-gray-600">·</span>
              © {new Date().getFullYear()}
              <span className="block mt-1 text-xs text-gray-500">Made with ❤️ by Divyansh Mishra</span>
            </div>
            <div className="flex items-center gap-5">
              <Link className="hover:text-gray-300 transition-colors" href="/upload">Get Started</Link>
              <Link className="hover:text-gray-300 transition-colors" href="/history">History</Link>
              <a href="https://github.com/DivyanshM30" target="_blank" rel="noopener noreferrer" className="hover:text-gray-300 transition-colors" aria-label="GitHub">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.477 2 2 6.484 2 12.021c0 4.428 2.865 8.184 6.839 9.504.5.092.682-.217.682-.482 0-.237-.009-.868-.014-1.703-2.782.605-3.369-1.342-3.369-1.342-.454-1.154-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.004.07 1.532 1.032 1.532 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.987 1.029-2.686-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.025A9.564 9.564 0 0 1 12 6.844c.85.004 1.705.115 2.504.337 1.909-1.295 2.748-1.025 2.748-1.025.546 1.378.202 2.397.1 2.65.64.699 1.028 1.593 1.028 2.686 0 3.847-2.338 4.695-4.566 4.944.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.749 0 .267.18.577.688.48C19.138 20.2 22 16.447 22 12.021 22 6.484 17.523 2 12 2z"/></svg>
              </a>
              <a href="https://linkedin.com/in/DivyanshM30" target="_blank" rel="noopener noreferrer" className="hover:text-gray-300 transition-colors" aria-label="LinkedIn">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.761 0 5-2.239 5-5v-14c0-2.761-2.239-5-5-5zm-11 19h-3v-10h3v10zm-1.5-11.268c-.966 0-1.75-.784-1.75-1.75s.784-1.75 1.75-1.75 1.75.784 1.75 1.75-.784 1.75-1.75 1.75zm13.5 11.268h-3v-5.604c0-1.337-.025-3.063-1.868-3.063-1.868 0-2.154 1.459-2.154 2.967v5.7h-3v-10h2.881v1.367h.041c.401-.761 1.381-1.563 2.841-1.563 3.039 0 3.6 2.001 3.6 4.599v5.597z"/></svg>
              </a>
            </div>
          </div>
        </footer>
      </div>
    </main>
  );
}
