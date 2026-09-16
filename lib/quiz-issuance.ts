import { createQuizProof } from './quiz-proof';
import { validateQuizContent } from './quiz-submission';

/** Canonicalize before signing so every issued attempt satisfies the save contract. */
export function issueQuiz(userId: string, questions: unknown, config: unknown, documentId: string | null) {
  const parsed = validateQuizContent({ questions, config });
  if (!parsed.ok) return parsed;
  return {
    ok: true as const,
    value: {
      ...parsed.value,
      documentId,
      quizProof: createQuizProof(userId, parsed.value.questions, parsed.value.config, documentId),
    },
  };
}
