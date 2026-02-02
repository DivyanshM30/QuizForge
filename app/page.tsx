'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function Home() {
  const [activeFaq, setActiveFaq] = useState<string | null>(null);

  return (
    <main className="min-h-screen">
      {/* Background grid + accents (veek-style) */}
      <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-grid opacity-40 mask-fade" />
        <div className="absolute -top-40 left-1/2 h-[32rem] w-[32rem] -translate-x-1/2 rounded-full bg-primary-500/12 blur-3xl" />
        <div className="absolute top-40 right-[-10rem] h-[28rem] w-[28rem] rounded-full bg-fuchsia-500/10 blur-3xl" />
        <div className="absolute bottom-[-10rem] left-[-10rem] h-[28rem] w-[28rem] rounded-full bg-cyan-500/10 blur-3xl" />
      </div>

      {/* Top nav (veek-inspired) */}
      <header className="sticky top-0 z-40 border-b border-white/5 bg-black/30 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 py-4 md:px-8">
          <div className="flex items-center justify-between gap-3">
            <Link href="/" className="flex items-center gap-3">
              <div className="grid h-9 w-9 place-items-center rounded-xl bg-white/10 border border-white/10">
                <div className="h-4 w-4 rounded bg-white/80" />
              </div>
              <span className="font-semibold text-gray-100">QuizForge</span>
            </Link>

            <nav className="hidden md:flex items-center gap-8 text-sm text-gray-300">
              <a className="hover:text-white transition-colors" href="#features">Features</a>
              <a className="hover:text-white transition-colors" href="#testimonials">Testimonials</a>
              <a className="hover:text-white transition-colors" href="#faq">FAQ</a>
            </nav>

            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label="Theme toggle (coming soon)"
                className="hidden sm:inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors"
              >
                <svg className="h-5 w-5 text-gray-200" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M12 3v2m0 14v2m9-9h-2M5 12H3m15.364-6.364-1.414 1.414M7.05 16.95l-1.414 1.414m12.728 0-1.414-1.414M7.05 7.05 5.636 5.636"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                  <path
                    d="M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  />
                </svg>
              </button>
              <Link
                href="/upload"
                className="hidden sm:inline-flex h-10 items-center justify-center rounded-xl px-4 text-sm font-semibold text-gray-200 hover:text-white transition-colors"
              >
                Log in
              </Link>
              <Link
                href="/upload"
                className="inline-flex h-10 items-center justify-center rounded-xl bg-white text-black px-4 text-sm font-semibold hover:bg-white/90 transition-colors"
              >
                Get Started <span className="ml-2">→</span>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-8 md:px-8 md:py-12">
        <div className="fade-in">
          {/* Hero */}
          <section className="pt-10 md:pt-16 pb-10 md:pb-14">
            <div className="mx-auto max-w-4xl text-center">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-gray-200">
                <span className="font-semibold">Launching Soon</span>
              </div>

              <h1 className="mt-6 text-4xl sm:text-6xl font-extrabold tracking-tight text-gray-50">
                Elevate your exam prep with{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-gray-100 to-gray-300 drop-shadow-[0_10px_30px_rgba(255,255,255,0.12)]">
                  QuizForge AI
                </span>
              </h1>
              <p className="mt-6 text-lg sm:text-xl text-gray-200/80 max-w-2xl mx-auto leading-relaxed">
                The all-in-one platform that turns your documents into high-quality MCQs, timed quizzes,
                and actionable performance insights—so you can revise what matters most.
              </p>

              <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
                <Link
                  href="/upload"
                  className="inline-flex items-center justify-center rounded-full bg-white text-black px-6 py-3 font-semibold hover:bg-white/90 transition-colors"
                >
                  Get Started <span className="ml-2">→</span>
                </Link>
                <a
                  href="#features"
                  className="inline-flex items-center justify-center rounded-full bg-white/5 border border-white/10 text-white px-6 py-3 font-semibold hover:bg-white/10 transition-colors"
                >
                  Explore Features
                </a>
              </div>

              <div className="mt-4 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-gray-400">
                <span>✓ Works with your notes</span>
                <span>✓ Instant feedback</span>
                <span>✓ Topic analytics</span>
              </div>
            </div>

            {/* Product preview */}
            <div className="mt-12 mx-auto max-w-6xl">
              <div className="rounded-3xl border border-white/10 bg-white/5 p-3 sm:p-6 shadow-2xl">
                <div className="rounded-2xl bg-gradient-to-br from-white/10 to-white/0 border border-white/10 overflow-hidden">
                  <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
                    <div className="flex items-center gap-3">
                      <div className="h-7 w-7 rounded-lg bg-white/10 border border-white/10" />
                      <div className="text-sm font-semibold text-gray-100">Analytics</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="rounded-full bg-primary-500/20 text-primary-200 border border-primary-500/20 px-3 py-1 text-xs">
                        Export
                      </div>
                      <div className="h-8 w-8 rounded-full bg-white/5 border border-white/10" />
                    </div>
                  </div>

                  <div className="grid lg:grid-cols-12 gap-4 p-5 sm:p-6">
                    <div className="lg:col-span-4 rounded-2xl border border-white/10 bg-black/20 p-4">
                      <div className="text-sm font-semibold text-gray-100">Quiz Sessions</div>
                      <div className="mt-3 space-y-2">
                        {['Biology — 80%', 'OS — 62%', 'DBMS — 74%'].map((t) => (
                          <div key={t} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-gray-300">
                            {t}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="lg:col-span-8 rounded-2xl border border-white/10 bg-black/20 p-4">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-semibold text-gray-100">Topic Performance</div>
                        <div className="text-xs text-gray-400">Weekly</div>
                      </div>
                      <div className="mt-4 grid grid-cols-4 gap-3 items-end">
                        {[78, 62, 91, 55].map((v, i) => (
                          <div key={i} className="rounded-xl border border-white/10 bg-white/5 p-3">
                            <div className="h-28 flex items-end">
                              <div
                                className="w-full rounded-lg bg-white/80"
                                style={{ height: `${v}%` }}
                              />
                            </div>
                            <div className="mt-2 text-xs text-gray-300">{v}%</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Features */}
          <section id="features" className="py-14 md:py-20">
            <div className="mx-auto max-w-6xl">
              <div className="text-center">
                <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight text-gray-50">
                  Built for speed. Designed for clarity.
                </h2>
                <p className="mt-3 text-gray-200/70 max-w-2xl mx-auto text-base md:text-lg">
                  Everything you need to generate, simulate, and improve.
                </p>
              </div>

              <div className="mt-10 grid gap-4 md:grid-cols-3">
                {[
                  { t: 'Document → MCQs', d: 'Upload PDF/DOCX and generate structured questions with explanations.' },
                  { t: 'Timed exam mode', d: 'Set time limits, track progress, and auto-finish when time runs out.' },
                  { t: 'Instant feedback', d: 'See correct answers + explanations after each question.' },
                  { t: 'Topic analytics', d: 'Bar charts for topic-wise accuracy and weak-area detection.' },
                  { t: 'History & replay', d: 'Your results persist in localStorage—review anytime.' },
                  { t: 'Export results', d: 'Export quiz attempts as JSON for archiving or sharing.' },
                ].map((x) => (
                  <div
                    key={x.t}
                    className="group rounded-3xl border border-white/10 bg-white/5 p-6 hover:bg-white/10 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-2xl bg-white/5 border border-white/10 grid place-items-center">
                        <div className="h-3 w-3 rounded bg-white/80 group-hover:bg-white transition-colors" />
                      </div>
                      <div className="text-base font-semibold text-gray-50">{x.t}</div>
                    </div>
                    <div className="mt-3 text-sm text-gray-200/70 leading-relaxed">{x.d}</div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Testimonials */}
          <section id="testimonials" className="py-14 md:py-20">
            <div className="mx-auto max-w-6xl">
              <div className="text-center">
                <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight text-gray-50">
                  Learner-approved.
                </h2>
                <p className="mt-3 text-gray-200/70 max-w-2xl mx-auto text-base md:text-lg">
                  Built for fast revision loops and real exam confidence.
                </p>
              </div>
              <div className="mt-10 grid gap-4 md:grid-cols-3">
                {[
                  { q: 'I converted my notes into a 20-minute test and immediately saw my weak topics.', a: 'Student' },
                  { q: 'The explanations are clutch. It feels like an instructor reviewing each mistake.', a: 'Learner' },
                  { q: 'Topic-wise analytics saved me hours. I stopped revising what I already knew.', a: 'Candidate' },
                ].map((x, i) => (
                  <div key={i} className="rounded-3xl border border-white/10 bg-white/5 p-6">
                    <div className="text-gray-50/90 leading-relaxed text-base">“{x.q}”</div>
                    <div className="mt-4 text-sm text-gray-200/70">— {x.a}</div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* FAQ */}
          <section id="faq" className="py-14 md:py-20">
            <div className="mx-auto max-w-4xl">
              <div className="text-center">
                <h2 className="text-3xl md:text-4xl font-bold text-gray-50">FAQ</h2>
                <p className="mt-3 text-gray-400">
                  Quick answers to common questions.
                </p>
              </div>

              <div className="mt-10 space-y-3">
                {[
                  { k: 'What files are supported?', v: 'PDF and DOCX. PPT/PPTX should be converted to PDF for best results. Max size is 10MB.' },
                  { k: 'Where is my quiz history stored?', v: 'In your browser localStorage for zero-cost deployment.' },
                  { k: 'Do I need an API key?', v: 'Yes. Set GEMINI_API_KEY in your environment variables.' },
                  { k: 'Can I export results?', v: 'Yes—results can be exported as JSON from the results screen.' },
                ].map((item) => {
                  const open = activeFaq === item.k;
                  return (
                    <button
                      key={item.k}
                      type="button"
                      onClick={() => setActiveFaq(open ? null : item.k)}
                      className="w-full text-left rounded-3xl border border-white/10 bg-white/5 p-5 hover:bg-white/10 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div className="text-sm font-semibold text-gray-100">{item.k}</div>
                        <div className="text-gray-300">{open ? '−' : '+'}</div>
                      </div>
                      {open && <div className="mt-3 text-sm text-gray-400 leading-relaxed">{item.v}</div>}
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          {/* Footer */}
          <footer className="border-t border-white/10 py-10 text-sm text-gray-500">
            <div className="mx-auto max-w-6xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>© {new Date().getFullYear()} QuizForge AI</div>
              <div className="flex items-center gap-4">
                <Link className="hover:text-gray-200" href="/upload">Get Started</Link>
                <Link className="hover:text-gray-200" href="/history">History</Link>
              </div>
            </div>
          </footer>
        </div>
      </div>
    </main>
  );
}
