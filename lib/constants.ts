/**
 * Quiz bounds — single source of truth for the UI (QuizConfig slider/options)
 * and the server validator (generate-questions route). Keep these in sync so
 * the client and server can never silently disagree.
 */
export const QUIZ_LIMITS = {
  MIN_QUESTIONS: 5,
  MAX_QUESTIONS: 50,
  MIN_TIME: 5, // minutes
  MAX_TIME: 120, // minutes
} as const;
