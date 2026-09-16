import type { QuizResult, TopicPerformance, Question, Confidence } from './types';

export type HistorySummary = Pick<QuizResult, 'id' | 'createdAt' | 'timestamp' | 'accuracy' | 'score' | 'totalQuestions' | 'timeTaken' | 'config' | 'weakTopics'>;
type AnalyticsRow = Pick<HistorySummary, 'accuracy' | 'score' | 'totalQuestions' | 'timeTaken'> & {
  topicPerformance: TopicPerformance[]; questions: Question[];
  userAnswers: (string | null)[]; confidences: Confidence[] | null;
};

/** Consume newest-first batches without retaining complete quiz histories. */
export function createHistoryAnalytics() {
  let totalQuizzes = 0, accuracySum = 0, topScore = 0, totalQuestions = 0, totalCorrect = 0, timeSum = 0;
  let streak = 0, streakEnded = false, confidentlyWrong = 0, confidenceRated = 0;
  const recent: Pick<AnalyticsRow, 'accuracy' | 'score' | 'totalQuestions'>[] = [];
  const topics = new Map<string, { correct: number; total: number }>();
  const calibration = new Map<string, number>();
  return {
    add(row: AnalyticsRow) {
      totalQuizzes++;
      accuracySum += row.accuracy;
      topScore = Math.max(topScore, row.accuracy);
      totalQuestions += row.totalQuestions;
      totalCorrect += row.score;
      timeSum += row.timeTaken;
      if (!streakEnded && row.accuracy >= 60) streak++;
      else streakEnded = true;
      if (recent.length < 10) recent.push({ accuracy: row.accuracy, score: row.score, totalQuestions: row.totalQuestions });
      for (const tp of row.topicPerformance) {
        const stats = topics.get(tp.topic) ?? { correct: 0, total: 0 };
        stats.correct += tp.correct;
        stats.total += tp.total;
        topics.set(tp.topic, stats);
      }
      row.questions.forEach((question, i) => {
        const confidence = row.confidences?.[i];
        if (!confidence) return;
        confidenceRated++;
        if (confidence === 'sure' && row.userAnswers[i] !== question.correctAnswer) {
          confidentlyWrong++;
          const topic = question.topic || 'General';
          calibration.set(topic, (calibration.get(topic) ?? 0) + 1);
        }
      });
    },
    finish() {
      return {
        totalQuizzes, topScore, totalQuestions, totalCorrect, streak, confidentlyWrong, confidenceRated,
        avgScore: totalQuizzes ? Math.round(accuracySum / totalQuizzes) : 0,
        avgTime: totalQuizzes ? Math.round(timeSum / totalQuizzes) : 0,
        performanceData: [...recent].reverse().map((q, i) => ({ quiz: `#${i + 1}`, accuracy: q.accuracy, score: q.score, total: q.totalQuestions })),
        topicAggregated: [...topics].map(([topic, stats]) => ({
          topic: topic.length > 16 ? topic.slice(0, 16) + '…' : topic,
          fullTopic: topic, ...stats, percentage: stats.total ? Math.round(stats.correct / stats.total * 100) : 0,
        })).sort((a, b) => b.total - a.total).slice(0, 8),
        calibrationTopics: [...calibration].map(([topic, count]) => ({ topic, count })).sort((a, b) => b.count - a.count).slice(0, 5),
      };
    },
  };
}

export type HistoryAnalytics = ReturnType<ReturnType<typeof createHistoryAnalytics>['finish']>;
export interface HistoryPageData { items: HistorySummary[]; nextCursor: string | null; analytics?: HistoryAnalytics }
