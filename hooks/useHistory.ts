'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createHistoryAnalytics, type HistoryAnalytics, type HistoryPageData, type HistorySummary } from '@/lib/history-analytics';

export function useHistory({ enabled = true, dashboard = false }: { enabled?: boolean; dashboard?: boolean } = {}) {
  const [history, setHistory] = useState<HistorySummary[]>([]);
  const [analytics, setAnalytics] = useState<HistoryAnalytics>(() => createHistoryAnalytics().finish());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const requestRef = useRef<AbortController | null>(null);
  const fetchPage = useCallback(async (cursor: string | null = null) => {
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    setIsLoading(true);
    try {
      const query = new URLSearchParams();
      if (dashboard) query.set('view', 'dashboard');
      if (cursor) query.set('cursor', cursor);
      const res = await fetch(`/api/history?${query}`, { signal: controller.signal });
      if (!res.ok) throw new Error('Failed to fetch history. Please retry.');
      const data: HistoryPageData = await res.json();
      if (controller.signal.aborted) return;
      setHistory(previous => cursor ? [...previous, ...data.items.filter(item => !previous.some(old => old.id === item.id))] : data.items);
      if (data.analytics) setAnalytics(data.analytics);
      setNextCursor(data.nextCursor);
      setError(null);
    } catch (error) {
      if (!controller.signal.aborted) setError(error instanceof Error ? error.message : 'Could not load history');
    } finally {
      if (requestRef.current === controller) setIsLoading(false);
    }
  }, [dashboard]);
  useEffect(() => {
    if (!enabled) return;
    const timer = setTimeout(() => void fetchPage(), 0);
    return () => { clearTimeout(timer); requestRef.current?.abort(); };
  }, [enabled, fetchPage]);
  return { history, analytics, isLoading, error, nextCursor,
    refetch: () => fetchPage(),
    loadMore: () => nextCursor && !isLoading ? fetchPage(nextCursor) : Promise.resolve(),
  };
}
