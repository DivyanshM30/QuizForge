import { Question, QuizResult, TopicPerformance } from './types';

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
  timeLimit: number
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
    questions,
    userAnswers,
  };
}
