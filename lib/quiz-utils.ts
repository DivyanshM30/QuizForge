import { Question, QuizResult, TopicPerformance, QuizConfig } from './types';
import type { QuizResult as QuizResultRow } from '@prisma/client';

export function calculateScore(
  questions: Question[],
  userAnswers: (string | null)[]
): number {
  let correct = 0;
  questions.forEach((question, index) => {
    if (userAnswers[index] === question.correctAnswer) {
      correct++;
    }
  });
  return correct;
}

export function calculateAccuracy(score: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((score / total) * 100);
}

export function analyzeTopicPerformance(
  questions: Question[],
  userAnswers: (string | null)[]
): TopicPerformance[] {
  const topicMap = new Map<string, { correct: number; total: number }>();

  questions.forEach((question, index) => {
    const topic = question.topic || 'General';
    if (!topicMap.has(topic)) {
      topicMap.set(topic, { correct: 0, total: 0 });
    }

    const stats = topicMap.get(topic)!;
    stats.total++;
    if (userAnswers[index] === question.correctAnswer) {
      stats.correct++;
    }
  });

  return Array.from(topicMap.entries()).map(([topic, stats]) => ({
    topic,
    correct: stats.correct,
    total: stats.total,
    percentage: Math.round((stats.correct / stats.total) * 100),
  }));
}

export function identifyWeakTopics(
  topicPerformance: TopicPerformance[],
  threshold: number = 60
): string[] {
  return topicPerformance
    .filter(topic => topic.percentage < threshold)
    .map(topic => topic.topic);
}

export function generateRevisionSuggestions(
  weakTopics: string[],
  topicPerformance: TopicPerformance[]
): string[] {
  const suggestions: string[] = [];

  if (weakTopics.length === 0) {
    suggestions.push('Excellent performance! Continue reviewing all topics to maintain your knowledge.');
    return suggestions;
  }

  weakTopics.forEach(topic => {
    const performance = topicPerformance.find(t => t.topic === topic);
    if (performance) {
      suggestions.push(
        `Focus on ${topic}: You scored ${performance.percentage}% (${performance.correct}/${performance.total}). Review the related concepts and practice more questions.`
      );
    }
  });

  if (weakTopics.length > 1) {
    suggestions.push(
      `You have ${weakTopics.length} topics that need attention. Consider creating a study plan to systematically review each topic.`
    );
  }

  return suggestions;
}

/**
 * Shuffle questions for a retake: question order AND option positions are
 * randomized, with correctAnswer remapped to follow its option.
 */
export function shuffleQuestions(questions: Question[]): Question[] {
  const keys: Array<'a' | 'b' | 'c' | 'd'> = ['a', 'b', 'c', 'd'];

  const shuffled = [...questions];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled.map((q) => {
    const order = [...keys];
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    // order[i] = which ORIGINAL option now sits at position keys[i]
    const options = { a: '', b: '', c: '', d: '' };
    let correctAnswer: 'a' | 'b' | 'c' | 'd' = 'a';
    keys.forEach((pos, i) => {
      options[pos] = q.options[order[i]];
      if (order[i] === q.correctAnswer) correctAnswer = pos;
    });
    return { ...q, options, correctAnswer };
  });
}

/** Narrow an unknown (e.g. a catch variable) to a human-readable message. */
export function getErrorMessage(err: unknown, fallback = 'Something went wrong'): string {
  return err instanceof Error ? err.message : typeof err === 'string' ? err : fallback;
}

/** Bar fill colour (hex) for a percentage — for recharts <Cell fill>. */
export function barColorForPct(pct: number): string {
  return pct >= 80 ? '#4ade80' : pct >= 60 ? '#facc15' : '#f87171';
}

/** Tailwind text-colour class for an accuracy/score percentage. */
export function accuracyTextClass(pct: number): string {
  return pct >= 80 ? 'text-green-400' : pct >= 60 ? 'text-yellow-400' : 'text-red-400';
}

/**
 * Rehydrate a stored QuizResult row: the JSON-string columns are parsed back
 * into objects for the frontend. Shared by both history API routes.
 */
export function deserializeQuizResult(row: QuizResultRow) {
  return {
    ...row,
    config: JSON.parse(row.config),
    topicPerformance: JSON.parse(row.topicPerformance),
    weakTopics: JSON.parse(row.weakTopics),
    revisionSuggestions: JSON.parse(row.revisionSuggestions),
    questions: JSON.parse(row.questions),
    userAnswers: JSON.parse(row.userAnswers),
  };
}

export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function formatTimeFromMinutes(minutes: number): string {
  return formatTime(minutes * 60);
}

export function createQuizResult(
  questions: Question[],
  userAnswers: (string | null)[],
  timeTaken: number,
  timeLimit: number,
  config: QuizConfig
): QuizResult {
  const score = calculateScore(questions, userAnswers);
  const accuracy = calculateAccuracy(score, questions.length);
  const topicPerformance = analyzeTopicPerformance(questions, userAnswers);
  const weakTopics = identifyWeakTopics(topicPerformance);
  const revisionSuggestions = generateRevisionSuggestions(weakTopics, topicPerformance);

  return {
    id: `quiz-${Date.now()}`,
    timestamp: Date.now(),
    score,
    totalQuestions: questions.length,
    accuracy,
    timeTaken,
    timeLimit,
    topicPerformance,
    weakTopics,
    revisionSuggestions,
    config,
    questions,
    userAnswers,
  };
}
