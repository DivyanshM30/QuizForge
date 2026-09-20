import { createQuizProof } from './quiz-proof';
import { validateQuizContent } from './quiz-submission';
import { sealExam } from './exam-token';

/** Canonicalize before signing so every issued attempt satisfies the save contract. */
export function issueQuiz(userId: string, questions: unknown, config: unknown, documentId: string | null) {
  const parsed = validateQuizContent({ questions, config });
  if (!parsed.ok) return parsed;
  const startedAt = Date.now();
  const quizProof = createQuizProof(userId, parsed.value.questions, parsed.value.config, documentId, startedAt);
  if (parsed.value.config.mode === 'exam') {
    if (Buffer.byteLength(JSON.stringify(parsed.value), 'utf8') > 1_500_000) {
      return { ok: false as const, error: 'This exam is too large. Generate fewer questions.' };
    }
    return { ok: true as const, value: {
      questions: parsed.value.questions.map(q => ({ id: q.id, question: q.question, options: q.options, topic: q.topic, difficulty: q.difficulty })),
      config: parsed.value.config,
      documentId,
      startedAt,
      quizProof: sealExam({ ...parsed.value, quizProof }, userId),
    } };
  }
  return {
    ok: true as const,
    value: {
      ...parsed.value,
      documentId,
      quizProof,
    },
  };
}
