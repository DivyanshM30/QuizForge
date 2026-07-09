'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Mail, AlertCircle, CheckCircle2, ChevronLeft } from 'lucide-react';
import AppNav from '@/components/AppNav';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Something went wrong');
      }
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex flex-col">
      {/* Subtle radial glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-white/[0.03] blur-3xl" />
      </div>

      <AppNav />

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm space-y-6">

          {/* Heading */}
          <div className="text-center space-y-1">
            <h1 className="font-display text-4xl text-white tracking-tight">
              Forgot password
            </h1>
            <p className="text-white/50 text-sm">
              We&apos;ll email you a link to reset it
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="liquid-glass rounded-2xl px-4 py-3 flex items-center gap-2.5 text-red-400 text-sm">
              <AlertCircle size={16} className="flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Card */}
          <div className="liquid-glass rounded-3xl p-8 space-y-5">
            {sent ? (
              <div className="flex flex-col items-center text-center gap-3 py-2">
                <span className="w-12 h-12 rounded-2xl bg-green-500/20 flex items-center justify-center">
                  <CheckCircle2 size={22} className="text-green-400" />
                </span>
                <p className="text-white/80 text-sm leading-relaxed">
                  If an account exists for <span className="text-white">{email}</span>,
                  a reset link is on its way. Check your inbox (and spam folder).
                </p>
                <p className="text-white/40 text-xs">The link is valid for 1 hour.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="email" className="text-white/60 text-xs font-medium uppercase tracking-widest">
                    Email
                  </label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
                    <input
                      id="email"
                      type="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white placeholder:text-white/40 text-sm outline-none focus:border-white/30 focus:bg-white/10 transition-all"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-2 bg-white text-black rounded-xl py-3 text-sm font-semibold hover:bg-white/90 transition-colors disabled:opacity-60 cursor-pointer mt-2"
                >
                  {isLoading ? 'Sending…' : (
                    <>Send reset link <ArrowRight size={15} /></>
                  )}
                </button>
              </form>
            )}
          </div>

          {/* Footer link */}
          <p className="text-center text-white/40 text-sm">
            <Link href="/login" className="inline-flex items-center gap-1 text-white/70 hover:text-white transition-colors">
              <ChevronLeft size={14} /> Back to sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
