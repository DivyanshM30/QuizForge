import type { QuizSession } from './types';

export function attemptDeadline(session: QuizSession) {
  const questionDeadline = session.startTime + session.timeLimit * 1000;
  return session.pausedAt !== undefined
    ? session.hardDeadline ?? questionDeadline
    : Math.min(questionDeadline, session.hardDeadline ?? Infinity);
}

export function remainingSeconds(deadline: number, now = Date.now()) {
  return Math.max(0, Math.ceil((deadline - now) / 1000));
}

/** Wall-clock countdown: delayed/background ticks never extend the deadline. */
export function subscribeCountdown(deadline: number, onTick: (seconds: number) => void, onExpire: () => void) {
  let active = true;
  let timer: ReturnType<typeof setTimeout>;
  const tick = () => {
    if (!active) return;
    const seconds = remainingSeconds(deadline);
    onTick(seconds);
    if (!active) return;
    if (seconds === 0) {
      active = false;
      onExpire();
    } else schedule();
  };
  const schedule = () => { timer = setTimeout(tick, Math.min(1000, Math.max(0, deadline - Date.now()))); };
  schedule();
  return () => { active = false; clearTimeout(timer); };
}
