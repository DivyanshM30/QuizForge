export interface Question {
  id: string;
  question: string;
  options: {
    a: string;
    b: string;
    c: string;
    d: string;
  };
  correctAnswer: 'a' | 'b' | 'c' | 'd';
  explanation: string;
  topic: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface QuizConfig {
  numQuestions: number;
  timeLimit: number; // in minutes
  difficulty: 'easy' | 'medium' | 'hard' | 'mixed';
}

export type Confidence = 'sure' | 'unsure' | null;

export interface QuizSession {
  questions: Question[];
  currentQuestionIndex: number;
  userAnswers: (string | null)[];
  confidences: Confidence[];
  startTime: number;
  timeLimit: number; // in seconds
  config: QuizConfig;
}

export interface QuizResult {
  id: string;
  documentId?: string | null;
  createdAt?: string | Date;
  timestamp: number;
  score: number;
  totalQuestions: number;
  accuracy: number;
  timeTaken: number; // in seconds
  timeLimit: number; // in seconds
  topicPerformance: TopicPerformance[];
  weakTopics: string[];
  revisionSuggestions: string[];
  config: QuizConfig;
  questions: Question[];
  userAnswers: (string | null)[];
  confidences?: Confidence[] | null;
}

export interface TopicPerformance {
  topic: string;
  correct: number;
  total: number;
  percentage: number;
}
