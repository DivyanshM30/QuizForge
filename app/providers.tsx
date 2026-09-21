'use client';

import { SessionProvider } from 'next-auth/react';
import AttemptRecovery from '@/components/AttemptRecovery';

export function Providers({ children }: { children: React.ReactNode }) {
  return <SessionProvider><AttemptRecovery>{children}</AttemptRecovery></SessionProvider>;
}
