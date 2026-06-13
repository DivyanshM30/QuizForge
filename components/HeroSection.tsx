'use client';

import { useRef, useEffect, useCallback, useState } from 'react';
import { Upload, Sparkles, ArrowRight, LayoutDashboard, X, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useQuizStore } from '@/store/quiz-store';
import { validateFile } from '@/lib/file-validation';

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

/* ─── QuizForge Logo ────────────────────────────────────── */
function QuizForgeLogo() {
  return (
    <svg width={24} height={24} viewBox="0 0 24 24" fill="none" className="text-white">
      <rect x="3" y="3" width="18" height="18" rx="4" stroke="currentColor" strokeWidth={1.8} />
      <path d="M8 9h8M8 12h5" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" />
      <circle cx="17" cy="17" r="3.5" fill="currentColor" />
      <path d="M15.8 17l.8.9 1.6-1.8" stroke="black" strokeWidth={1.2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ─── Social SVGs ────────────────────────────────────────── */
function LinkedInIcon() {
  return (
    <svg width={20} height={20} viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg width={20} height={20} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
  );
}

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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const selectedFileRef = useRef<File | null>(null);  // stores the file before Generate is clicked
  const [fileName, setFileName] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadState, setUploadState] = useState<'idle' | 'uploading' | 'analyzing' | 'error'>('idle');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const { data: session, status } = useSession();
  const isLoggedIn = status === 'authenticated';
  const router = useRouter();
  const { setDocumentText } = useQuizStore();

  /* ── File processing ── */
  const processFile = useCallback(async (file: File) => {
    // Validate
    const validation = validateFile(file);
    if (!validation.valid) {
      setUploadError(validation.error || 'Invalid file');
      setUploadState('error');
      return;
    }

    // If not logged in, store intent and redirect to login
    if (!isLoggedIn) {
      router.push('/login');
      return;
    }

    setFileName(file.name);
    setUploadError(null);
    setUploadState('uploading');

    try {
      const formData = new FormData();
      formData.append('file', file);
      setUploadState('analyzing');
      const res = await fetch('/api/analyze-document', { method: 'POST', body: formData });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to analyze document');
      }
      const data = await res.json();
      setDocumentText(data.text);
      // Jump straight to the config step on the upload page
      router.push('/upload?step=config');
    } catch (err: any) {
      setUploadError(err.message || 'Upload failed');
      setUploadState('error');
    }
  }, [isLoggedIn, router, setDocumentText]);

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

  /* ── File selection (no API call yet) ── */
  const selectFile = (file: File) => {
    const validation = validateFile(file);
    if (!validation.valid) {
      setUploadError(validation.error || 'Invalid file');
      setUploadState('error');
      selectedFileRef.current = null;
      return;
    }
    selectedFileRef.current = file;
    setFileName(file.name);
    setUploadState('idle');
    setUploadError(null);
  };

  /* ── Generate: triggered only by the Generate button ── */
  const handleGenerate = () => {
    if (isBusy) return;
    if (uploadState === 'error') { setUploadState('idle'); setFileName(null); selectedFileRef.current = null; return; }
    if (selectedFileRef.current) {
      processFile(selectedFileRef.current);
    } else {
      // No file selected yet — open the picker
      fileInputRef.current?.click();
    }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) selectFile(file);
    e.target.value = '';
  };

  const onDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const onDragLeave = () => setIsDragging(false);
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) selectFile(file);
  };

  const isBusy = uploadState === 'uploading' || uploadState === 'analyzing';

  const pillLabel = () => {
    if (uploadState === 'uploading') return 'Uploading…';
    if (uploadState === 'analyzing') return 'Reading document…';
    if (uploadState === 'error') return uploadError ?? 'Upload failed — click Generate to retry';
    return fileName ?? 'Drop your PDF, DOCX, or click to browse…';
  };

  return (
    <div className="min-h-screen bg-black overflow-hidden relative flex flex-col">

      {/* ── Background Video ─────────────────────────────── */}
      <div className="absolute inset-0 z-0">
        <video
          ref={videoRef}
          src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260328_115001_bcdaa3b4-03de-47e7-ad63-ae3e392c32d4.mp4"
          autoPlay
          muted
          playsInline
          loop={false}
          preload="auto"
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
        <h1
          className="text-5xl md:text-6xl lg:text-7xl text-white mb-8 tracking-tight whitespace-nowrap"
          style={{ fontFamily: "'Instrument Serif', serif" }}
        >
          Study smarter, not harder
        </h1>

        {/* Upload + subtitle + CTA */}
        <div className="max-w-xl w-full space-y-4">

          {/* File upload bar */}
          <div
            className={`liquid-glass rounded-full pl-5 pr-2 py-2 flex items-center gap-3 transition-all duration-200 cursor-pointer ${
              isDragging ? 'ring-1 ring-white/30 bg-white/5' : 'hover:bg-white/[0.03]'
            } ${uploadState === 'error' ? 'ring-1 ring-red-500/40' : ''}`}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            onClick={() => !isBusy && fileInputRef.current?.click()}
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
                onClick={(e) => { e.stopPropagation(); setFileName(null); setUploadState('idle'); selectedFileRef.current = null; }}
                className="text-white/30 hover:text-white/60 transition-colors p-1 cursor-pointer flex-shrink-0"
                aria-label="Clear file"
              >
                <X size={14} />
              </button>
            )}

            {/* Generate button — triggers API call */}
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
              accept=".pdf,.doc,.docx,.ppt,.pptx,.txt"
              className="hidden"
              aria-label="Upload study material"
              onChange={onFileChange}
            />
          </div>

          {/* Subtitle */}
          <p className="text-white/70 text-sm leading-relaxed px-4">
            Upload any study material — PDFs, lecture slides, DOCX, or plain text — and QuizForge
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
          aria-label="Portfolio — divyanshm.dev"
          className="liquid-glass rounded-full p-4 text-white/80 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
        >
          <PortfolioIcon />
        </a>
      </div>

    </div>
  );
}
