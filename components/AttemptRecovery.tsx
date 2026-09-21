'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useQuizStore } from '@/store/quiz-store';
import { connectAttemptRecovery } from '@/lib/attempt-recovery';

export default function AttemptRecovery({ children }: { children: React.ReactNode }) {
  const { data, status } = useSession();
  const ownerId = useQuizStore(s => s.ownerId);
  const userId = data?.user?.id ?? null;
  useEffect(() => {
    if (status === 'loading') return;
    try { return connectAttemptRecovery(userId, window.sessionStorage); }
    catch {
      if (useQuizStore.getState().ownerId !== userId || userId === null) useQuizStore.getState().resetQuiz();
      useQuizStore.setState({ ownerId: userId, recoveryError: 'Refresh recovery is unavailable. Keep this page open until your result is saved.' });
    }
  }, [status, userId]);
  // Do not expose a prior account's in-memory attempt while auth changes.
  if ((status === 'loading' && ownerId !== null) || (status !== 'loading' && ownerId !== userId)) {
    return <p role="status" className="p-8 text-center">Restoring your session…</p>;
  }
  return children;
}
