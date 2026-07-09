'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight, Lock, AlertCircle, CheckCircle2 } from 'lucide-react';
import AppNav from '@/components/AppNav';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Something went wrong');
      setDone(true);
      setTimeout(() => router.push('/login'), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="liquid-glass rounded-3xl p-8 text-center space-y-3">
        <p className="text-white/80 text-sm">This reset link is missing its token.</p>
        <Link href="/forgot-password" className="text-white/70 hover:text-white text-sm underline underline-offset-4 transition-colors">
          Request a new link
        </Link>
      </div>
    );
  }

  return (
    <>
      {error && (
        <div className="liquid-glass rounded-2xl px-4 py-3 flex items-center gap-2.5 text-red-400 text-sm">
          <AlertCircle size={16} className="flex-shrink-0" />
          {error}
        </div>
      )}

      <div className="liquid-glass rounded-3xl p-8 space-y-5">
        {done ? (
          <div className="flex flex-col items-center text-center gap-3 py-2">
            <span className="w-12 h-12 rounded-2xl bg-green-500/20 flex items-center justify-center">
              <CheckCircle2 size={22} className="text-green-400" />
            </span>
            <p className="text-white/80 text-sm">Password updated. Redirecting you to sign in…</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="password" className="text-white/60 text-xs font-medium uppercase tracking-widest">
                New password
              </label>
              <div className="relative">
                <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
                <input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white placeholder:text-white/40 text-sm outline-none focus:border-white/30 focus:bg-white/10 transition-all"
                />
              </div>
              <p className="text-white/40 text-xs">At least 8 characters</p>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="confirm" className="text-white/60 text-xs font-medium uppercase tracking-widest">
                Confirm password
              </label>
              <div className="relative">
                <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
                <input
                  id="confirm"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white placeholder:text-white/40 text-sm outline-none focus:border-white/30 focus:bg-white/10 transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 bg-white text-black rounded-xl py-3 text-sm font-semibold hover:bg-white/90 transition-colors disabled:opacity-60 cursor-pointer mt-2"
            >
              {isLoading ? 'Updating…' : (
                <>Update password <ArrowRight size={15} /></>
              )}
            </button>
          </form>
        )}
      </div>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-black flex flex-col">
      {/* Subtle radial glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-white/[0.03] blur-3xl" />
      </div>

      <AppNav />

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm space-y-6">
          <div className="text-center space-y-1">
            <h1 className="font-display text-4xl text-white tracking-tight">
              Reset password
            </h1>
            <p className="text-white/50 text-sm">Choose a new password for your account</p>
          </div>

          <Suspense fallback={null}>
            <ResetPasswordForm />
          </Suspense>

          <p className="text-center text-white/40 text-sm">
            Remembered it?{' '}
            <Link href="/login" className="text-white/70 hover:text-white transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
