'use client';

import { useEffect, useState } from 'react';
import { signIn, getProviders } from 'next-auth/react';

function GoogleG() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
      <path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47a5.53 5.53 0 0 1-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09A11.99 11.99 0 0 0 12 24z" />
      <path fill="#FBBC05" d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29a11.99 11.99 0 0 0 0 10.76l3.98-3.09z" />
      <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.69 1.29 6.62l3.98 3.09C6.22 6.86 8.87 4.75 12 4.75z" />
    </svg>
  );
}

/**
 * Glass-styled "Continue with Google" button + divider, shared by login/register.
 * Renders nothing unless the Google provider is actually registered on the
 * server (i.e. GOOGLE_CLIENT_ID/SECRET are configured).
 */
export default function GoogleSignInButton({ callbackUrl = '/upload' }: { callbackUrl?: string }) {
  const [googleAvailable, setGoogleAvailable] = useState(false);

  useEffect(() => {
    getProviders()
      .then((providers) => setGoogleAvailable(Boolean(providers?.google)))
      .catch(() => setGoogleAvailable(false));
  }, []);

  if (!googleAvailable) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => signIn('google', { callbackUrl })}
        className="w-full flex items-center justify-center gap-2.5 bg-white/5 border border-white/10 text-white rounded-xl py-3 text-sm font-medium hover:bg-white/10 transition-colors cursor-pointer"
      >
        <GoogleG />
        Continue with Google
      </button>

      <div className="flex items-center gap-3" aria-hidden>
        <span className="flex-1 h-px bg-white/10" />
        <span className="text-white/30 text-xs uppercase tracking-widest">or</span>
        <span className="flex-1 h-px bg-white/10" />
      </div>
    </>
  );
}
