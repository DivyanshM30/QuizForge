import { QUIZ_LIMITS } from './constants';
import type { Confidence, Question, QuizConfig } from './types';

const ANSWER_KEYS = ['a', 'b', 'c', 'd'] as const;
const DIFFICULTIES = ['easy', 'medium', 'hard'] as const;
const CONFIG_DIFFICULTIES = [...DIFFICULTIES, 'mixed'] as const;

const MAX_ID_LENGTH = 200;
const MAX_QUESTION_LENGTH = 5_000;
const MAX_OPTION_LENGTH = 2_000;
const MAX_EXPLANATION_LENGTH = 10_000;
const MAX_TOPIC_LENGTH = 200;

type ValidationResult =
  | { ok: true; value: ValidatedQuizSubmission }
  | { ok: false; error: string };

type ConfigValidationResult =
  | { ok: true; value: QuizConfig }
  | { ok: false; error: string };

export interface ValidatedQuizSubmission {
  questions: Question[];
  userAnswers: (Question['correctAnswer'] | null)[];
  confidences: Confidence[] | null;
  config: QuizConfig;
  quizProof: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isBoundedString(value: unknown, maxLength: number, allowEmpty = false): value is string {
  return (
    typeof value === 'string' &&
    value.length <= maxLength &&
    (allowEmpty || value.trim().length > 0)
  );
}

function isAnswerKey(value: unknown): value is Question['correctAnswer'] {
  return typeof value === 'string' && ANSWER_KEYS.includes(value as Question['correctAnswer']);
}

export function validateQuizConfig(
  input: unknown,
  actualQuestionCount?: number
): ConfigValidationResult {
  if (!isRecord(input)) {
    return { ok: false, error: 'Quiz configuration is invalid' };
  }

  const numQuestions = actualQuestionCount ?? input.numQuestions;
  const difficulty = input.difficulty;
  if (
    !Number.isInteger(numQuestions) ||
    (numQuestions as number) < QUIZ_LIMITS.MIN_QUESTIONS ||
    (numQuestions as number) > QUIZ_LIMITS.MAX_QUESTIONS ||
    !Number.isInteger(input.timeLimit) ||
    (input.timeLimit as number) < QUIZ_LIMITS.MIN_TIME ||
    (input.timeLimit as number) > QUIZ_LIMITS.MAX_TIME ||
    typeof difficulty !== 'string' ||
    !CONFIG_DIFFICULTIES.includes(difficulty as QuizConfig['difficulty']) ||
    (input.cram !== undefined && typeof input.cram !== 'boolean') ||
    (input.mode !== undefined && input.mode !== 'practice' && input.mode !== 'exam') ||
    (input.mode === 'exam' && input.cram === true)
  ) {
    return { ok: false, error: 'Quiz configuration is invalid' };
  }

  return {
    ok: true,
    value: {
      numQuestions: numQuestions as number,
      timeLimit: input.timeLimit as number,
      difficulty: difficulty as QuizConfig['difficulty'],
      ...(input.cram === true ? { cram: true } : {}),
      ...(input.mode === 'exam' ? { mode: 'exam' as const } : {}),
    },
  };
}

export function parseQuestion(value: unknown): Question | null {
  if (!isRecord(value) || !isRecord(value.options)) return null;

  if (
    !isBoundedString(value.id, MAX_ID_LENGTH) ||
    !isBoundedString(value.question, MAX_QUESTION_LENGTH) ||
    !isBoundedString(value.options.a, MAX_OPTION_LENGTH) ||
    !isBoundedString(value.options.b, MAX_OPTION_LENGTH) ||
    !isBoundedString(value.options.c, MAX_OPTION_LENGTH) ||
    !isBoundedString(value.options.d, MAX_OPTION_LENGTH) ||
    !isAnswerKey(value.correctAnswer) ||
    !isBoundedString(value.explanation, MAX_EXPLANATION_LENGTH, true) ||
    !isBoundedString(value.topic, MAX_TOPIC_LENGTH, true) ||
    typeof value.difficulty !== 'string' ||
    !DIFFICULTIES.includes(value.difficulty as Question['difficulty'])
  ) {
    return null;
  }

  return {
    id: value.id,
    question: value.question,
    options: {
      a: value.options.a,
      b: value.options.b,
      c: value.options.c,
      d: value.options.d,
    },
    correctAnswer: value.correctAnswer,
    explanation: value.explanation,
    topic: value.topic,
    difficulty: value.difficulty as Question['difficulty'],
  };
}

export function validateQuizContent(input: unknown):
  | { ok: true; value: { questions: Question[]; config: QuizConfig } }
  | { ok: false; error: string } {
  if (!isRecord(input)) {
    return { ok: false, error: 'Invalid quiz submission' };
  }

  if (
    !Array.isArray(input.questions) ||
    input.questions.length < QUIZ_LIMITS.MIN_QUESTIONS ||
    input.questions.length > QUIZ_LIMITS.MAX_QUESTIONS
  ) {
    return {
      ok: false,
      error: `Quiz must contain between ${QUIZ_LIMITS.MIN_QUESTIONS} and ${QUIZ_LIMITS.MAX_QUESTIONS} questions`,
    };
  }

  const questions = input.questions.map(parseQuestion);
  if (questions.some((question) => question === null)) {
    return { ok: false, error: 'Quiz contains an invalid question' };
  }

  const parsedConfig = validateQuizConfig(input.config, questions.length);
  if (!parsedConfig.ok) return parsedConfig;
  return { ok: true, value: { questions: questions as Question[], config: parsedConfig.value } };
}

export function validateQuizSubmission(input: unknown): ValidationResult {
  const content = validateQuizContent(input);
  if (!content.ok) return content;
  if (!isRecord(input)) return { ok: false, error: 'Invalid quiz submission' };
  const { questions, config } = content.value;

  if (
    !Array.isArray(input.userAnswers) ||
    input.userAnswers.length !== questions.length ||
    input.userAnswers.some((answer) => answer !== null && !isAnswerKey(answer))
  ) {
    return { ok: false, error: 'Quiz answers do not match the submitted questions' };
  }

  let confidences: Confidence[] | null = null;
  if (input.confidences !== undefined && input.confidences !== null) {
    if (
      !Array.isArray(input.confidences) ||
      input.confidences.length !== questions.length ||
      input.confidences.some(
        (confidence) => confidence !== null && confidence !== 'sure' && confidence !== 'unsure'
      )
    ) {
      return { ok: false, error: 'Quiz confidence values are invalid' };
    }
    confidences = input.confidences as Confidence[];
  }

  if (!isBoundedString(input.quizProof, 600)) {
    return { ok: false, error: 'Quiz verification proof is missing or invalid' };
  }

  return {
    ok: true,
    value: {
      questions: questions as Question[],
      userAnswers: input.userAnswers as (Question['correctAnswer'] | null)[],
      confidences,
      config,
      quizProof: input.quizProof,
    },
  };
}
