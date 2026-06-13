'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { LogOut, History, Zap, LayoutDashboard } from 'lucide-react';

function QuizForgeLogo() {
  return (
    <svg width={22} height={22} viewBox="0 0 24 24" fill="none" className="text-white flex-shrink-0">
      <rect x="3" y="3" width="18" height="18" rx="4" stroke="currentColor" strokeWidth={1.8} />
      <path d="M8 9h8M8 12h5" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" />
      <circle cx="17" cy="17" r="3.5" fill="currentColor" />
      <path d="M15.8 17l.8.9 1.6-1.8" stroke="black" strokeWidth={1.2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

interface AppNavProps {
  /** Optional extra actions injected to the right side */
  actions?: React.ReactNode;
}

export default function AppNav({ actions }: AppNavProps) {
  const { data: session } = useSession();
  const pathname = usePathname();

  return (
    <nav className="sticky top-0 z-40 px-4 py-4 md:px-6">
      <div className="liquid-glass rounded-full px-5 py-3 flex items-center justify-between max-w-6xl mx-auto">
        {/* Left: logo */}
        <Link href="/" className="flex items-center gap-2.5 cursor-pointer group">
          <QuizForgeLogo />
          <span className="text-white font-semibold text-base leading-none">QuizForge</span>
        </Link>

        {/* Right: nav actions */}
        <div className="flex items-center gap-2">
          {actions}

          {session && (
            <>
              {pathname !== '/dashboard' && (
                <Link
                  href="/dashboard"
                  className="hidden sm:flex items-center gap-1.5 text-white/70 hover:text-white text-sm font-medium transition-colors px-3 py-1.5 rounded-full hover:bg-white/5"
                >
                  <LayoutDashboard size={15} />
                  Dashboard
                </Link>
              )}
              {pathname !== '/history' && (
                <Link
                  href="/history"
                  className="hidden sm:flex items-center gap-1.5 text-white/70 hover:text-white text-sm font-medium transition-colors px-3 py-1.5 rounded-full hover:bg-white/5"
                >
                  <History size={15} />
                  History
                </Link>
              )}
              {pathname !== '/upload' && (
                <Link
                  href="/upload"
                  className="flex items-center gap-1.5 liquid-glass rounded-full px-4 py-1.5 text-white text-sm font-medium hover:bg-white/5 transition-colors"
                >
                  <Zap size={14} />
                  New Quiz
                </Link>
              )}
              <button
                onClick={() => signOut({ callbackUrl: '/' })}
                className="flex items-center gap-1.5 text-white/50 hover:text-white/80 text-sm transition-colors px-2 py-1.5 rounded-full hover:bg-white/5 cursor-pointer"
                aria-label="Sign out"
              >
                <LogOut size={15} />
                <span className="hidden sm:inline">Sign out</span>
              </button>
            </>
          )}

          {!session && (
            <>
              <Link
                href="/login"
                className="text-white/70 hover:text-white text-sm font-medium transition-colors px-3 py-1.5"
              >
                Log in
              </Link>
              <Link
                href="/register"
                className="liquid-glass rounded-full px-5 py-1.5 text-white text-sm font-medium hover:bg-white/5 transition-colors"
              >
                Sign up
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
