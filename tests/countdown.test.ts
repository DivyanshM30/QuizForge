import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { remainingSeconds, subscribeCountdown } from '@/lib/countdown';

beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(100_000); });
afterEach(() => vi.useRealTimers());

it('does not expire during the last fractional second and fires only once', () => {
  const tick = vi.fn(), expire = vi.fn();
  expect(remainingSeconds(100_500)).toBe(1);
  const stop = subscribeCountdown(100_500, tick, expire);
  vi.advanceTimersByTime(499);
  expect(expire).not.toHaveBeenCalled();
  vi.advanceTimersByTime(1);
  expect(tick).toHaveBeenLastCalledWith(0);
  expect(expire).toHaveBeenCalledOnce();
  vi.advanceTimersByTime(5000);
  expect(expire).toHaveBeenCalledOnce();
  stop();
});

it('catches up after a delayed/background tick using the wall clock', () => {
  const tick = vi.fn(), expire = vi.fn();
  const stop = subscribeCountdown(105_000, tick, expire);
  vi.setSystemTime(110_000);
  vi.advanceTimersByTime(1000);
  expect(tick).toHaveBeenLastCalledWith(0);
  expect(expire).toHaveBeenCalledOnce();
  stop();
});

it('cancels scheduled callbacks when the owning timer unmounts', () => {
  const tick = vi.fn(), expire = vi.fn();
  const stop = subscribeCountdown(105_000, tick, expire);
  stop();
  vi.advanceTimersByTime(6000);
  expect(tick).not.toHaveBeenCalled();
  expect(expire).not.toHaveBeenCalled();
});

it('completes an already-expired timer on subscription without synchronous callbacks', () => {
  const expire = vi.fn();
  const stop = subscribeCountdown(99_000, vi.fn(), expire);
  expect(expire).not.toHaveBeenCalled();
  vi.advanceTimersByTime(0);
  expect(expire).toHaveBeenCalledOnce();
  stop();
});
