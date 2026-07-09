'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { LogOut, History, Zap, LayoutDashboard, FileText, Settings } from 'lucide-react';
import { QuizForgeLogo } from '@/components/icons';

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
          <QuizForgeLogo size={22} className="text-white flex-shrink-0" />
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
              {pathname !== '/documents' && (
                <Link
                  href="/documents"
                  className="hidden md:flex items-center gap-1.5 text-white/70 hover:text-white text-sm font-medium transition-colors px-3 py-1.5 rounded-full hover:bg-white/5"
                >
                  <FileText size={15} />
                  Documents
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
              {pathname !== '/settings' && (
                <Link
                  href="/settings"
                  aria-label="Settings"
                  className="flex items-center text-white/50 hover:text-white/80 text-sm transition-colors px-2 py-1.5 rounded-full hover:bg-white/5"
                >
                  <Settings size={15} />
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
