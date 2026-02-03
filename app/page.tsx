'use client';

import { useState } from 'react';
import Link from 'next/link';
import ImageCarousel from '@/components/ImageCarousel';

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

              <h1 className="mt-6 text-4xl sm:text-6xl font-extrabold tracking-tight text-gray-50 animate-fade-in-up">
                <span className="block mb-2 text-primary-400 text-lg font-semibold animate-pulse">Ace Your Exams with AI</span>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-400 via-fuchsia-400 to-cyan-400 drop-shadow-[0_10px_30px_rgba(255,255,255,0.18)]">
                  QuizForge AI
                </span>
              </h1>
              <p className="mt-6 text-lg sm:text-xl text-gray-200/90 max-w-2xl mx-auto leading-relaxed animate-fade-in">
                Instantly turn your notes into beautiful, challenging quizzes. Get real-time feedback, analytics, and a smarter way to revise—powered by AI.
              </p>

              {/* Hero Carousel */}
              <div className="mt-10 flex justify-center animate-fade-in">
                <ImageCarousel
                  images={[
                    { src: '/carousel1.png', alt: 'QuizForge Hero 1' },
                    { src: '/carousel2.png', alt: 'QuizForge Hero 2' },
                    { src: '/carousel3.png', alt: 'QuizForge Hero 3' },
                    { src: '/carousel4.png', alt: 'QuizForge Hero 4' },
                    { src: '/carousel5.png', alt: 'QuizForge Hero 5' },
                    { src: '/carousel6.png', alt: 'QuizForge Hero 6' },
                  ]}
                  autoSlideInterval={2000}
                />
              </div>

              <div className="mt-10 flex flex-col sm:flex-row gap-3 justify-center animate-fade-in-up">
                <Link
                  href="/upload"
                  className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-primary-500 via-fuchsia-500 to-cyan-500 text-white px-8 py-4 font-bold text-lg shadow-lg hover:scale-105 hover:from-primary-600 hover:to-cyan-600 transition-all duration-200"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4" /></svg>
                  Get Started
                </Link>
                <a
                  href="#features"
                  className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/10 text-white px-8 py-4 font-bold text-lg hover:bg-white/20 transition-all duration-200"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M15 19l-7-7 7-7" /></svg>
                  Explore Features
                </a>
              </div>

              <div className="mt-6 flex flex-wrap justify-center gap-x-6 gap-y-2 text-base text-gray-300 animate-fade-in">
                <span className="flex items-center gap-2"><svg className="w-4 h-4 text-primary-400" fill="currentColor" viewBox="0 0 20 20"><path d="M16.707 5.293a1 1 0 00-1.414 0L9 11.586 6.707 9.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l7-7a1 1 0 000-1.414z" /></svg>Works with your notes</span>
                <span className="flex items-center gap-2"><svg className="w-4 h-4 text-primary-400" fill="currentColor" viewBox="0 0 20 20"><path d="M16.707 5.293a1 1 0 00-1.414 0L9 11.586 6.707 9.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l7-7a1 1 0 000-1.414z" /></svg>Instant feedback</span>
                <span className="flex items-center gap-2"><svg className="w-4 h-4 text-primary-400" fill="currentColor" viewBox="0 0 20 20"><path d="M16.707 5.293a1 1 0 00-1.414 0L9 11.586 6.707 9.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l7-7a1 1 0 000-1.414z" /></svg>Topic analytics</span>
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
                  { t: 'Document → MCQs', d: 'Upload PDF/DOCX and generate structured questions with explanations.', icon: '📄' },
                  { t: 'Timed exam mode', d: 'Set time limits, track progress, and auto-finish when time runs out.', icon: '⏰' },
                  { t: 'Instant feedback', d: 'See correct answers + explanations after each question.', icon: '⚡' },
                  { t: 'Topic analytics', d: 'Bar charts for topic-wise accuracy and weak-area detection.', icon: '📊' },
                  { t: 'History & replay', d: 'Your results persist in localStorage—review anytime.', icon: '🕓' },
                  { t: 'Export results', d: 'Export quiz attempts as JSON for archiving or sharing.', icon: '⬇️' },
                ].map((x, i) => (
                  <div
                    key={x.t}
                    className="group rounded-3xl border border-white/10 bg-white/5 p-6 hover:bg-white/10 transition-colors animate-fade-in"
                    style={{ animationDelay: `${i * 0.08 + 0.1}s` }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-primary-500/30 to-cyan-500/20 border border-white/10 grid place-items-center text-2xl">
                        <span>{x.icon}</span>
                      </div>
                      <div className="text-base font-semibold text-gray-50">{x.t}</div>
                    </div>
                    <div className="mt-3 text-sm text-gray-200/80 leading-relaxed">{x.d}</div>
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
                  { q: 'I converted my notes into a 20-minute test and immediately saw my weak topics.', a: 'Student', avatar: 'https://randomuser.me/api/portraits/men/32.jpg' },
                  { q: 'The explanations are clutch. It feels like an instructor reviewing each mistake.', a: 'Learner', avatar: 'https://randomuser.me/api/portraits/women/44.jpg' },
                  { q: 'Topic-wise analytics saved me hours. I stopped revising what I already knew.', a: 'Candidate', avatar: 'https://randomuser.me/api/portraits/men/65.jpg' },
                ].map((x, i) => (
                  <div key={i} className="rounded-3xl border border-white/10 bg-white/5 p-6 animate-fade-in" style={{ animationDelay: `${i * 0.12 + 0.1}s` }}>
                    <div className="flex items-center gap-3 mb-3">
                      <img src={x.avatar} alt={x.a} className="w-10 h-10 rounded-full border border-white/20 shadow" loading="lazy" />
                      <div className="text-sm text-gray-200/80">{x.a}</div>
                    </div>
                    <div className="text-gray-50/90 leading-relaxed text-base">“{x.q}”</div>
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
                ].map((item, i) => {
                  const open = activeFaq === item.k;
                  return (
                    <button
                      key={item.k}
                      type="button"
                      onClick={() => setActiveFaq(open ? null : item.k)}
                      className={`w-full text-left rounded-3xl border border-white/10 bg-white/5 p-5 hover:bg-white/10 transition-colors focus:outline-none transition-all duration-300 ${open ? 'shadow-lg scale-[1.02] bg-white/10' : ''} animate-fade-in`}
                      style={{ animationDelay: `${i * 0.08 + 0.1}s` }}
                      aria-expanded={open}
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div className="text-sm font-semibold text-gray-100">{item.k}</div>
                        <div className="text-gray-300 transition-transform duration-300" style={{ transform: open ? 'rotate(90deg)' : 'rotate(0deg)' }}>{open ? '−' : '+'}</div>
                      </div>
                      <div
                        className={`overflow-hidden transition-all duration-300 ${open ? 'max-h-40 opacity-100 mt-3' : 'max-h-0 opacity-0'}`}
                        style={{ maxHeight: open ? 200 : 0 }}
                      >
                        {open && <div className="text-sm text-gray-400 leading-relaxed">{item.v}</div>}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          {/* Footer */}
          <footer className="border-t border-white/10 py-10 text-sm text-gray-500">
            <div className="mx-auto max-w-6xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                © {new Date().getFullYear()} QuizForge AI
                <span className="block mt-1 text-xs text-gray-400">Made with ❤️ by Divyansh Mishra</span>
              </div>
              <div className="flex items-center gap-4">
                <Link className="hover:text-gray-200" href="/upload">Get Started</Link>
                <Link className="hover:text-gray-200" href="/history">History</Link>
                {/* Social Links */}
                <a href="https://github.com/DivyanshM30" target="_blank" rel="noopener noreferrer" className="hover:text-gray-200" aria-label="GitHub">
                  <svg className="w-5 h-5 inline ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.477 2 2 6.484 2 12.021c0 4.428 2.865 8.184 6.839 9.504.5.092.682-.217.682-.482 0-.237-.009-.868-.014-1.703-2.782.605-3.369-1.342-3.369-1.342-.454-1.154-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.004.07 1.532 1.032 1.532 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.987 1.029-2.686-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.025A9.564 9.564 0 0 1 12 6.844c.85.004 1.705.115 2.504.337 1.909-1.295 2.748-1.025 2.748-1.025.546 1.378.202 2.397.1 2.65.64.699 1.028 1.593 1.028 2.686 0 3.847-2.338 4.695-4.566 4.944.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.749 0 .267.18.577.688.48C19.138 20.2 22 16.447 22 12.021 22 6.484 17.523 2 12 2z"/></svg>
                </a>
                <a href="https://linkedin.com/in/DivyanshM30" target="_blank" rel="noopener noreferrer" className="hover:text-gray-200" aria-label="LinkedIn">
                  <svg className="w-5 h-5 inline ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.761 0 5-2.239 5-5v-14c0-2.761-2.239-5-5-5zm-11 19h-3v-10h3v10zm-1.5-11.268c-.966 0-1.75-.784-1.75-1.75s.784-1.75 1.75-1.75 1.75.784 1.75 1.75-.784 1.75-1.75 1.75zm13.5 11.268h-3v-5.604c0-1.337-.025-3.063-1.868-3.063-1.868 0-2.154 1.459-2.154 2.967v5.7h-3v-10h2.881v1.367h.041c.401-.761 1.381-1.563 2.841-1.563 3.039 0 3.6 2.001 3.6 4.599v5.597z"/></svg>
                </a>
                <a href="https://twitter.com/yourusername" target="_blank" rel="noopener noreferrer" className="hover:text-gray-200" aria-label="Twitter">
                  <svg className="w-5 h-5 inline ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M24 4.557a9.93 9.93 0 0 1-2.828.775 4.932 4.932 0 0 0 2.165-2.724c-.951.564-2.005.974-3.127 1.195a4.92 4.92 0 0 0-8.384 4.482C7.691 8.095 4.066 6.13 1.64 3.161c-.542.929-.856 2.01-.857 3.17 0 2.188 1.115 4.117 2.823 5.254a4.904 4.904 0 0 1-2.229-.616c-.054 2.281 1.581 4.415 3.949 4.89a4.936 4.936 0 0 1-2.224.084c.627 1.956 2.444 3.377 4.6 3.417A9.867 9.867 0 0 1 0 21.543a13.94 13.94 0 0 0 7.548 2.209c9.057 0 14.009-7.496 14.009-13.986 0-.213-.005-.425-.014-.636A9.936 9.936 0 0 0 24 4.557z"/></svg>
                </a>
              </div>
            </div>
          </footer>
        </div>
      </div>
    </main>
  );
}
