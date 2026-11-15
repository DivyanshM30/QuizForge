import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { checkRateLimit } from '@/lib/rate-limit';

/**
 * The limiter is a fixed-window counter keyed by an arbitrary string. These
 * tests pin the contract the API routes depend on: the first `limit` calls in a
 * window succeed, the next one is rejected, the window resets on time, and
 * separate keys do not interfere.
 */
describe('checkRateLimit', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('allows exactly the configured number of requests in a window', () => {
    const key = `allow-${Math.random()}`;
    const limit = 10;
    const windowMs = 10 * 60 * 1000;

    for (let i = 0; i < limit; i += 1) {
      const result = checkRateLimit(key, limit, windowMs);
      expect(result.success).toBe(true);
      expect(result.remaining).toBe(limit - i - 1);
    }

    const blocked = checkRateLimit(key, limit, windowMs);
    expect(blocked.success).toBe(false);
    expect(blocked.remaining).toBe(0);
  });

  it('keeps rejecting once the limit is reached, without extending the window', () => {
    const key = `blocked-${Math.random()}`;
    const limit = 3;
    const windowMs = 60_000;

    for (let i = 0; i < limit; i += 1) checkRateLimit(key, limit, windowMs);

    expect(checkRateLimit(key, limit, windowMs).success).toBe(false);
    expect(checkRateLimit(key, limit, windowMs).success).toBe(false);

    // Still inside the original window: a rejection must not reset the counter.
    vi.advanceTimersByTime(windowMs - 1);
    expect(checkRateLimit(key, limit, windowMs).success).toBe(false);
  });

  it('resets the counter once the window elapses', () => {
    const key = `reset-${Math.random()}`;
    const limit = 2;
    const windowMs = 15 * 60 * 1000;

    expect(checkRateLimit(key, limit, windowMs).success).toBe(true);
    expect(checkRateLimit(key, limit, windowMs).success).toBe(true);
    expect(checkRateLimit(key, limit, windowMs).success).toBe(false);

    vi.advanceTimersByTime(windowMs + 1);

    const afterReset = checkRateLimit(key, limit, windowMs);
    expect(afterReset.success).toBe(true);
    expect(afterReset.remaining).toBe(limit - 1);
  });

  it('isolates keys from each other', () => {
    const limit = 1;
    const windowMs = 60_000;

    expect(checkRateLimit('user-a', limit, windowMs).success).toBe(true);
    expect(checkRateLimit('user-a', limit, windowMs).success).toBe(false);
    expect(checkRateLimit('user-b', limit, windowMs).success).toBe(true);
  });

  it('enforces the production generation limit of 10 per 10 minutes', () => {
    // Mirrors app/api/generate-questions/route.ts: checkRateLimit(`generate:${userId}`, 10, 10 * 60 * 1000)
    const key = `generate:${Math.random()}`;
    const limit = 10;
    const windowMs = 10 * 60 * 1000;

    let allowed = 0;
    for (let i = 0; i < 25; i += 1) {
      if (checkRateLimit(key, limit, windowMs).success) allowed += 1;
    }

    expect(allowed).toBe(10);
    expect(limit / (windowMs / 60_000)).toBe(1); // 1 request per minute sustained
  });
});
