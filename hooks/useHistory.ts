'use client';

import { useCallback, useEffect, useState } from 'react';
import { QuizResult } from '@/lib/types';

interface UseHistoryOptions {
  /** Skip the initial fetch until ready (e.g. until the session is authenticated). Defaults to true. */
  enabled?: boolean;
}

/**
 * Fetches the signed-in user's quiz history from /api/history.
 * Shared by the History page and the Dashboard, which previously duplicated
 * this fetch/loading/error logic.
 */
export function useHistory({ enabled = true }: UseHistoryOptions = {}) {
  const [history, setHistory] = useState<QuizResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/history');
      if (!res.ok) throw new Error('Failed to fetch history');
      setHistory(await res.json());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (enabled) refetch();
  }, [enabled, refetch]);

  return { history, isLoading, error, refetch };
}
