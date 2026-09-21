import { useQuizStore } from '@/store/quiz-store';
import { attemptDeadline, subscribeCountdown } from './countdown';

/** Own deadline completion for the authenticated app, independently of its route. */
export function watchAttemptDeadline(ownerId: string, wakeTargets: EventTarget[] = []) {
  let stopTimer = () => {};
  let proof: string | undefined;
  let deadline: number | undefined;
  const check = () => {
    const state = useQuizStore.getState();
    if (state.ownerId === ownerId && state.session && state.saveStatus === 'idle' &&
        attemptDeadline(state.session) <= Date.now()) void state.saveQuiz();
  };
  const sync = () => {
    const state = useQuizStore.getState();
    const session = state.ownerId === ownerId && state.saveStatus === 'idle' ? state.session : null;
    const nextDeadline = session ? attemptDeadline(session) : undefined;
    if (session?.quizProof === proof && nextDeadline === deadline) return;
    stopTimer();
    proof = session?.quizProof;
    deadline = nextDeadline;
    stopTimer = nextDeadline === undefined ? () => {} : subscribeCountdown(nextDeadline, () => {}, check);
  };
  const unsubscribe = useQuizStore.subscribe(sync);
  sync();
  // Catch up promptly after browser timer throttling or page restoration.
  const events = ['focus', 'pageshow', 'visibilitychange'];
  for (const target of wakeTargets) for (const event of events) target.addEventListener(event, check);
  return () => {
    unsubscribe();
    stopTimer();
    for (const target of wakeTargets) for (const event of events) target.removeEventListener(event, check);
  };
}
