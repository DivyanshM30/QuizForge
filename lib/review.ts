import { createHash } from 'crypto';
import type { Question } from './types';

/**
 * Smart Review — SM-2-lite scheduling for quiz questions.
 *
 * Interval ladder (days). A correct answer climbs one rung; a wrong answer
 * falls back to the start. Answering correctly at the top rung "graduates"
 * (retires) the item — the question is considered learned.
 */
export const REVIEW_INTERVALS_DAYS = [1, 3, 7, 21] as const;

/** Max review items kept per user (bounds DB growth). */
export const REVIEW_QUEUE_CAP = 500;

/** Stable identity for a question across quizzes/retakes (options get shuffled). */
export function questionHash(q: Question): string {
  const normalized = q.question.trim().toLowerCase().replace(/\s+/g, ' ');
  return createHash('sha256').update(normalized).digest('hex');
}

export function dueDateForStage(stage: number, from: Date = new Date()): Date {
  const idx = Math.max(0, Math.min(stage, REVIEW_INTERVALS_DAYS.length - 1));
  return new Date(from.getTime() + REVIEW_INTERVALS_DAYS[idx] * 24 * 60 * 60 * 1000);
}

export type Confidence = 'sure' | 'unsure' | null;

export interface ScheduleResult {
  graduated: boolean;
  nextStage: number;
  nextDueAt: Date;
}

/** Confidently-wrong is the most dangerous kind of wrong — resurface it sooner. */
export function dueDateForWrong(confidence: Confidence, from: Date = new Date()): Date {
  const hours = confidence === 'sure' ? 12 : 24;
  return new Date(from.getTime() + hours * 60 * 60 * 1000);
}

/**
 * Compute the next state after a review answer.
 * - correct at the top stage → graduated (delete the item)
 * - correct below the top → climb one stage
 * - wrong → back to stage 0; confidently-wrong returns in 12h, otherwise 24h
 */
export function scheduleNext(
  currentStage: number,
  correct: boolean,
  confidence: Confidence = null
): ScheduleResult {
  const topStage = REVIEW_INTERVALS_DAYS.length - 1;

  if (correct && currentStage >= topStage) {
    return { graduated: true, nextStage: currentStage, nextDueAt: new Date() };
  }
  if (correct) {
    const nextStage = currentStage + 1;
    return { graduated: false, nextStage, nextDueAt: dueDateForStage(nextStage) };
  }
  return { graduated: false, nextStage: 0, nextDueAt: dueDateForWrong(confidence) };
}
