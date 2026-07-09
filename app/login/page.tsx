'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight, Mail, Lock, AlertCircle } from 'lucide-react';
import AppNav from '@/components/AppNav';
import GoogleSignInButton from '@/components/GoogleSignInButton';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const res = await signIn('credentials', { email, password, redirect: false });
      if (res?.error) {
        setError('Invalid email or password');
      } else {
        router.push('/upload');
        router.refresh();
      }
    } catch {
      setError('An unexpected error occurred');
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
            <h1
              className="font-display text-4xl text-white tracking-tight"
            >
              Welcome back
            </h1>
            <p className="text-white/50 text-sm">
              Sign in to continue your learning streak
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
            <GoogleSignInButton />
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email */}
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

              {/* Password */}
              <div className="space-y-1.5">
                <div className="flex items-baseline justify-between">
                  <label htmlFor="password" className="text-white/60 text-xs font-medium uppercase tracking-widest">
                    Password
                  </label>
                  <Link href="/forgot-password" className="text-white/40 hover:text-white/80 text-xs transition-colors">
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
                  <input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white placeholder:text-white/40 text-sm outline-none focus:border-white/30 transition-all"
                  />
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 bg-white text-black rounded-xl py-3 text-sm font-semibold hover:bg-white/90 transition-colors disabled:opacity-60 cursor-pointer mt-2"
              >
                {isLoading ? 'Signing in…' : (
                  <>Sign in <ArrowRight size={15} /></>
                )}
              </button>
            </form>
          </div>

          {/* Footer link */}
          <p className="text-center text-white/40 text-sm">
            No account yet?{' '}
            <Link href="/register" className="text-white/70 hover:text-white transition-colors">
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
