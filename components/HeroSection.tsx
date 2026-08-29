'use client';

import { useRef, useEffect, useCallback } from 'react';
import { Upload, Sparkles, ArrowRight, LayoutDashboard, X, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { QuizForgeLogo, LinkedInIcon, GitHubIcon } from '@/components/icons';
import { useFileUpload } from '@/hooks/useFileUpload';

/* ─── Types ─────────────────────────────────────────────── */
interface AnimFrameRef {
  id: number | null;
}

/* ─── Video fade helpers ─────────────────────────────────── */
function cancelAnim(ref: AnimFrameRef) {
  if (ref.id !== null) {
    cancelAnimationFrame(ref.id);
    ref.id = null;
  }
}

function fadeTo(
  el: HTMLVideoElement,
  target: number,
  duration: number,
  animRef: AnimFrameRef,
  onComplete?: () => void
) {
  cancelAnim(animRef);
  const start = performance.now();
  const from =
    el.style.opacity === '' ? (target === 1 ? 0 : 1) : parseFloat(el.style.opacity);

  function step(now: number) {
    const progress = Math.min((now - start) / duration, 1);
    el.style.opacity = String(from + (target - from) * progress);
    if (progress < 1) {
      animRef.id = requestAnimationFrame(step);
    } else {
      animRef.id = null;
      onComplete?.();
    }
  }

  animRef.id = requestAnimationFrame(step);
}

/* ─── Portfolio mark (hero-only) ─────────────────────────── */
function PortfolioIcon() {
  return (
    <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}

/* ─── Component ─────────────────────────────────────────── */
export default function HeroSection() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const animRef = useRef<AnimFrameRef>({ id: null });
  const fadingOutRef = useRef(false);

  const { status } = useSession();
  const isLoggedIn = status === 'authenticated';
  const router = useRouter();

  /* Send unauthenticated visitors to login before any upload happens. */
  const requireAuth = useCallback(() => {
    if (!isLoggedIn) {
      router.push('/login');
      return false;
    }
    return true;
  }, [isLoggedIn, router]);

  const {
    fileInputRef,
    selectedFileRef,
    fileName,
    isDragging,
    uploadState,
    isBusy,
    handleGenerate,
    onFileChange,
    onDragOver,
    onDragLeave,
    onDrop,
    clearFile,
    pillLabel,
  } = useFileUpload({ onBeforeUpload: requireAuth });

  /* ── Video fade helpers ── */
  const startFadeIn = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    fadingOutRef.current = false;
    video.style.opacity = '0';
    fadeTo(video, 1, 500, animRef.current);
  }, []);

  const handleTimeUpdate = useCallback(() => {
    const video = videoRef.current;
    if (!video || fadingOutRef.current) return;
    const remaining = video.duration - video.currentTime;
    if (remaining <= 0.55) {
      fadingOutRef.current = true;
      fadeTo(video, 0, 500, animRef.current);
    }
  }, []);

  const handleEnded = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    cancelAnim(animRef.current);
    video.style.opacity = '0';
    setTimeout(() => {
      video.currentTime = 0;
      video.play().then(startFadeIn).catch(() => {});
    }, 100);
  }, [startFadeIn]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    // Respect reduced-motion: don't autoplay or pull the full video down.
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const onCanPlay = () => video.play().then(startFadeIn).catch(() => {});
    video.addEventListener('canplay', onCanPlay);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('ended', handleEnded);
    // If video is already buffered before listeners attached
    if (video.readyState >= 3) {
      video.play().then(startFadeIn).catch(() => {});
    }
    return () => {
      video.removeEventListener('canplay', onCanPlay);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('ended', handleEnded);
      cancelAnim(animRef.current);
    };
  }, [startFadeIn, handleTimeUpdate, handleEnded]);

  return (
    <div className="min-h-screen bg-black overflow-hidden relative flex flex-col">

      {/* ── Background Video ─────────────────────────────── */}
      <div className="absolute inset-0 z-0">
        <video
          ref={videoRef}
          src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260328_115001_bcdaa3b4-03de-47e7-ad63-ae3e392c32d4.mp4"
          muted
          playsInline
          loop={false}
          preload="metadata"
          className="absolute inset-0 w-full h-full object-cover translate-y-[17%]"
          style={{ opacity: 0 }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-black/30 pointer-events-none" />
      </div>

      {/* ── Navigation ──────────────────────────────────── */}
      <nav className="relative z-20 pl-6 pr-6 py-6">
        <div className="liquid-glass rounded-full px-6 py-3 flex items-center justify-between max-w-5xl mx-auto">

          {/* Left: logo + nav links */}
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2 cursor-pointer">
              <QuizForgeLogo />
              <span className="text-white font-semibold text-lg">QuizForge</span>
            </Link>
            <div className="hidden md:flex items-center gap-6">
              {[
                { label: 'Features', href: '#features' },
                { label: 'How It Works', href: '#how-it-works' },
                { label: 'About', href: '#about' },
              ].map(({ label, href }) => (
                <a
                  key={label}
                  href={href}
                  className="text-white/80 hover:text-white transition-colors text-sm font-medium"
                >
                  {label}
                </a>
              ))}
            </div>
          </div>

          {/* Right: auth buttons */}
          <div className="flex items-center gap-4">
            {isLoggedIn ? (
              <Link
                href="/dashboard"
                className="liquid-glass rounded-full px-6 py-2 flex items-center gap-2 text-white text-sm font-medium hover:bg-white/5 transition-colors cursor-pointer"
              >
                <LayoutDashboard size={14} />
                Dashboard
              </Link>
            ) : (
              <>
                <Link
                  href="/register"
                  className="text-white text-sm font-medium hover:text-white/80 transition-colors cursor-pointer"
                >
                  Sign Up
                </Link>
                <Link
                  href="/login"
                  className="liquid-glass rounded-full px-6 py-2 text-white text-sm font-medium hover:bg-white/5 transition-colors cursor-pointer"
                >
                  Login
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ── Hero Content ─────────────────────────────────── */}
      <section className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 py-12 text-center -translate-y-[20%]">

        {/* Heading */}
        <h1 className="font-display text-4xl md:text-6xl lg:text-7xl text-white mb-8 tracking-tight md:whitespace-nowrap">
          Study smarter, not harder
        </h1>

        {/* Upload + subtitle + CTA */}
        <div className="max-w-xl w-full space-y-4">

          {/* File upload bar */}
          <div
            className={`liquid-glass rounded-full pl-5 pr-2 py-2 flex items-center gap-3 transition-all duration-200 cursor-pointer ${
              isDragging ? 'ring-1 ring-white/30 bg-white/5' : 'hover:bg-white/[0.03]'
            } ${uploadState === 'error' ? 'ring-1 ring-red-500/40' : ''}`}
            role="button"
            tabIndex={0}
            aria-label="Upload study material - PDF or DOCX"
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            onClick={() => !isBusy && fileInputRef.current?.click()}
            onKeyDown={(e) => {
              if ((e.key === 'Enter' || e.key === ' ') && !isBusy) {
                e.preventDefault();
                fileInputRef.current?.click();
              }
            }}
          >
            {isBusy ? (
              <Loader2 size={18} className="text-white/50 flex-shrink-0 animate-spin" />
            ) : (
              <Upload size={18} className={`flex-shrink-0 transition-colors ${fileName ? 'text-white/60' : 'text-white/40'}`} />
            )}
            <span
              className={`flex-1 text-base text-left truncate min-w-0 select-none ${
                uploadState === 'error' ? 'text-red-400' :
                (fileName || isBusy) ? 'text-white' : 'text-white/40'
              }`}
            >
              {pillLabel()}
            </span>

            {/* Clear button when file selected and idle */}
            {fileName && !isBusy && (
              <button
                onClick={(e) => { e.stopPropagation(); clearFile(); }}
                className="text-white/30 hover:text-white/60 transition-colors p-1 cursor-pointer flex-shrink-0"
                aria-label="Clear file"
              >
                <X size={14} />
              </button>
            )}

            {/* Generate button - triggers API call */}
            <button
              aria-label="Generate quiz from file"
              disabled={isBusy}
              onClick={(e) => { e.stopPropagation(); handleGenerate(); }}
              className={`rounded-full px-5 py-2.5 text-sm font-semibold transition-all flex-shrink-0 flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${
                selectedFileRef.current && !isBusy && uploadState !== 'error'
                  ? 'bg-white text-black hover:bg-white/90 shadow-[0_0_20px_rgba(255,255,255,0.15)]'
                  : 'bg-white/10 text-white/70 hover:bg-white/15'
              }`}
            >
              {isBusy ? (
                <><Loader2 size={15} className="animate-spin" /> Working…</>
              ) : selectedFileRef.current ? (
                <><Sparkles size={15} /> Generate</>
              ) : (
                <>Browse</>
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx"
              className="hidden"
              aria-label="Upload study material"
              onChange={onFileChange}
            />
          </div>

          {/* Subtitle */}
          <p className="text-white/70 text-sm leading-relaxed px-4">
            Upload your study material - PDF or DOCX - and QuizForge
            instantly crafts AI-powered MCQs, tracks your performance, and turns revision into
            results.
          </p>

          {/* Secondary CTA */}
          <div className="flex justify-center">
            <Link
              href="/upload"
              className="liquid-glass rounded-full px-8 py-3 text-white text-sm font-medium hover:bg-white/5 transition-colors cursor-pointer flex items-center gap-2"
            >
              Start quizzing for free
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Social / Links Footer ────────────────────────── */}
      <div className="relative z-10 flex justify-center gap-4 pb-12">

        {/* LinkedIn */}
        <a
          href="https://linkedin.com/in/divyanshm30"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="LinkedIn"
          className="liquid-glass rounded-full p-4 text-white/80 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
        >
          <LinkedInIcon />
        </a>

        {/* GitHub */}
        <a
          href="https://github.com/DivyanshM30"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="GitHub"
          className="liquid-glass rounded-full p-4 text-white/80 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
        >
          <GitHubIcon />
        </a>

        {/* Portfolio */}
        <a
          href="https://divyanshm.dev"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Portfolio - divyanshm.dev"
          className="liquid-glass rounded-full p-4 text-white/80 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
        >
          <PortfolioIcon />
        </a>
      </div>

    </div>
  );
}
