import { GoogleGenerativeAI } from '@google/generative-ai';
import { Question, QuizConfig } from './types';
import { getErrorMessage } from './quiz-utils';

function getGenAI() {
  const API_KEY = process.env.GEMINI_API_KEY;
  if (!API_KEY) {
    throw new Error('GEMINI_API_KEY is not set in environment variables');
  }
  return new GoogleGenerativeAI(API_KEY);
}

function getPreferredModel(): string {
  // User can override via env, otherwise default to Gemini 2.5 Flash
  return (process.env.GEMINI_MODEL || 'gemini-2.5-flash').trim();
}

function isModelNotFoundError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  // The SDK tends to include "404 Not Found" and "is not found for API version"
  return (
    msg.includes('404') ||
    msg.toLowerCase().includes('not found') ||
    msg.toLowerCase().includes('listmodels')
  );
}

async function generateWithModel(modelName: string, prompt: string) {
  const genAI = getGenAI();
  const model = genAI.getGenerativeModel({ model: modelName });
  const result = await model.generateContent(prompt);
  return result.response.text();
}

async function generateWithFallbackModels(prompt: string): Promise<string> {
  const preferred = getPreferredModel();
  const fallbacks = [
    preferred,
    // Common alternates; some accounts expose “-latest” aliases.
    'gemini-2.5-flash',
    'gemini-2.5-flash-latest',
    // Older but widely available fallbacks:
    'gemini-1.5-flash',
    'gemini-1.5-flash-latest',
    'gemini-1.5-pro',
    'gemini-1.5-pro-latest',
  ];

  let lastErr: unknown;
  for (const modelName of Array.from(new Set(fallbacks))) {
    try {
      return await generateWithModel(modelName, prompt);
    } catch (err) {
      lastErr = err;
      // If this isn't a model availability problem, don't keep trying.
      if (!isModelNotFoundError(err)) throw err;
    }
  }

  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}

const OPTION_KEYS = ['a', 'b', 'c', 'd'] as const;
const DIFFICULTIES = ['easy', 'medium', 'hard'] as const;

function isNonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0;
}

/**
 * Validate and repair a raw, untrusted model response into well-formed
 * Questions. Entries missing the fields the quiz UI depends on (question text,
 * four options, a valid correct answer) are dropped; soft fields (id,
 * explanation, topic, difficulty) are repaired with sensible defaults. This
 * keeps a malformed model response from crashing the request or the UI.
 */
function sanitizeQuestions(raw: unknown): Question[] {
  if (!Array.isArray(raw)) {
    throw new Error('Model did not return a JSON array of questions');
  }

  const cleaned: Question[] = [];
  raw.forEach((item, index) => {
    if (typeof item !== 'object' || item === null) return;
    const q = item as Record<string, unknown>;

    if (!isNonEmptyString(q.question)) return;

    const options = q.options as Record<string, unknown> | undefined;
    if (!options || OPTION_KEYS.some((k) => !isNonEmptyString(options[k]))) return;

    const correct = isNonEmptyString(q.correctAnswer) ? q.correctAnswer.trim().toLowerCase() : '';
    if (!OPTION_KEYS.includes(correct as (typeof OPTION_KEYS)[number])) return;

    const rawDifficulty = isNonEmptyString(q.difficulty) ? q.difficulty.toLowerCase() : '';
    const difficulty = (DIFFICULTIES as readonly string[]).includes(rawDifficulty)
      ? (rawDifficulty as Question['difficulty'])
      : 'medium';

    cleaned.push({
      id: isNonEmptyString(q.id) ? q.id : `q${index + 1}`,
      question: q.question.trim(),
      options: {
        a: (options.a as string).trim(),
        b: (options.b as string).trim(),
        c: (options.c as string).trim(),
        d: (options.d as string).trim(),
      },
      correctAnswer: correct as Question['correctAnswer'],
      explanation: isNonEmptyString(q.explanation) ? q.explanation.trim() : 'No explanation provided.',
      topic: isNonEmptyString(q.topic) ? q.topic.trim() : 'General',
      difficulty,
    });
  });

  return cleaned;
}

export async function generateQuestions(
  documentText: string,
  config: QuizConfig
): Promise<Question[]> {
  const prompt = `You are an expert educator creating multiple-choice questions (MCQs) from the following study material.

STUDY MATERIAL:
${documentText.substring(0, 50000)} ${documentText.length > 50000 ? '... (truncated)' : ''}

REQUIREMENTS:
- Generate exactly ${config.numQuestions} high-quality MCQs
- Difficulty level: ${config.difficulty === 'mixed' ? 'Mix of easy, medium, and hard questions' : config.difficulty}
- Each question must have exactly 4 options (a, b, c, d)
- Questions should cover different topics from the material
- Each question must have a clear correct answer
- Provide a brief explanation for each answer
- Identify the main topic for each question

OUTPUT FORMAT (JSON array):
[
  {
    "id": "q1",
    "question": "Question text here?",
    "options": {
      "a": "Option A",
      "b": "Option B",
      "c": "Option C",
      "d": "Option D"
    },
    "correctAnswer": "a",
    "explanation": "Brief explanation of why this is correct",
    "topic": "Main topic name",
    "difficulty": "easy"
  }
]

IMPORTANT:
- Return ONLY valid JSON array, no markdown formatting
- Ensure all questions are answerable from the provided material
- Do not create questions about information not in the material
- Make options plausible and avoid obvious wrong answers
- Ensure correctAnswer is one of: "a", "b", "c", or "d"
- Each difficulty should be one of: "easy", "medium", or "hard"`;

  try {
    const text = await generateWithFallbackModels(prompt);

    // Clean the response - remove markdown code blocks if present
    let cleanedText = text.trim();
    if (cleanedText.startsWith('```json')) {
      cleanedText = cleanedText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleanedText.startsWith('```')) {
      cleanedText = cleanedText.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    // Validate/repair the untrusted model output before trusting it
    const validatedQuestions = sanitizeQuestions(JSON.parse(cleanedText));

    // Ensure we have at least the requested number of usable questions
    if (validatedQuestions.length < config.numQuestions) {
      throw new Error(`Generated only ${validatedQuestions.length} valid questions, expected ${config.numQuestions}`);
    }

    return validatedQuestions.slice(0, config.numQuestions);
  } catch (error) {
    console.error('Error generating questions:', error);

    // Retry once with a simpler prompt
    const message = getErrorMessage(error);
    if (message.includes('JSON') || message.includes('parse')) {
      console.log('Retrying with simplified prompt...');
      return generateQuestionsSimple(documentText, config);
    }

    throw new Error(`Failed to generate questions: ${message}`);
  }
}

async function generateQuestionsSimple(
  documentText: string,
  config: QuizConfig
): Promise<Question[]> {
  const prompt = `Create ${config.numQuestions} multiple-choice questions from this text. Return JSON array only:
${documentText.substring(0, 30000)}

Format: [{"id":"q1","question":"...","options":{"a":"...","b":"...","c":"...","d":"..."},"correctAnswer":"a","explanation":"...","topic":"...","difficulty":"easy"}]`;

  const text = (await generateWithFallbackModels(prompt))
    .trim()
    .replace(/```json\n?/g, '')
    .replace(/```\n?/g, '');

  const questions = sanitizeQuestions(JSON.parse(text));
  if (questions.length === 0) {
    throw new Error('The AI returned no usable questions. Please try again.');
  }
  return questions.slice(0, config.numQuestions);
}
