'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useQuizStore } from '@/store/quiz-store';
import { watchAttemptDeadline } from '@/lib/attempt-deadline';

export default function AttemptDeadline({ ownerId }: { ownerId: string }) {
  const pathname = usePathname();
  const session = useQuizStore(s => s.session);
  const saveStatus = useQuizStore(s => s.saveStatus);
  const result = useQuizStore(s => s.result);
  useEffect(() => watchAttemptDeadline(ownerId, [window, document]), [ownerId]);

  if (pathname === '/upload' || (!session && !result)) return null;
  const message = saveStatus === 'saving' ? 'Saving your quiz answers…'
    : saveStatus === 'failed' ? 'Your quiz save needs attention. Return to retry.'
    : saveStatus === 'saved' ? 'Your quiz result is saved.'
    : session?.pausedAt !== undefined ? 'Practice is paused. The attempt expiry still applies.'
    : 'Your quiz timer is still running. Answers will submit when time runs out.';
  return <div role={saveStatus === 'failed' ? 'alert' : 'status'} className="relative z-50 flex flex-wrap items-center justify-center gap-3 border-b border-white/15 bg-zinc-900 px-4 py-3 text-sm text-white">
    <span>{message}</span>
    <Link href="/upload" className="rounded-lg border border-white/30 px-3 py-1.5 font-semibold hover:bg-white/10">
      {saveStatus === 'saved' ? 'View results' : saveStatus === 'failed' ? 'Retry save' : 'Return to quiz'}
    </Link>
  </div>;
}
