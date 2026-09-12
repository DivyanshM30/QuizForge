import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import type { Question, QuizConfig } from './types';

const SAVE_GRACE_MS = 15 * 60 * 1000;
const MAX_DOCUMENT_ID_LENGTH = 200;

export interface QuizProofClaims {
  attemptId: string;
  issuedAt: number;
  expiresAt: number;
  documentId: string | null;
}

function signingSecret(): string {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error('NEXTAUTH_SECRET is required to sign quiz attempts');
  }
  return secret;
}

function proofMessage(
  payload: string,
  userId: string,
  questions: Question[],
  config: QuizConfig
) {
  return JSON.stringify({
    payload,
    userId,
    questions,
    config: {
      numQuestions: questions.length,
      timeLimit: config.timeLimit,
      difficulty: config.difficulty,
      cram: config.cram === true,
    },
  });
}

function signature(message: string): string {
  return createHmac('sha256', signingSecret()).update(message).digest('base64url');
}

export function createQuizProof(
  userId: string,
  questions: Question[],
  config: QuizConfig,
  documentId: string | null,
  now = Date.now()
): string {
  const claims: QuizProofClaims = {
    attemptId: randomBytes(18).toString('base64url'),
    issuedAt: now,
    expiresAt: now + config.timeLimit * 60 * 1000 + SAVE_GRACE_MS,
    documentId,
  };
  const payload = Buffer.from(JSON.stringify(claims), 'utf8').toString('base64url');
  return `${payload}.${signature(proofMessage(payload, userId, questions, config))}`;
}

export function verifyQuizProof(
  proof: string,
  userId: string,
  questions: Question[],
  config: QuizConfig,
  now = Date.now()
): QuizProofClaims | null {
  const [payload, suppliedSignature, extra] = proof.split('.');
  if (
    extra !== undefined ||
    typeof payload !== 'string' ||
    payload.length > 500 ||
    typeof suppliedSignature !== 'string' ||
    !/^[A-Za-z0-9_-]{43}$/.test(suppliedSignature)
  ) {
    return null;
  }

  const expected = Buffer.from(
    signature(proofMessage(payload, userId, questions, config)),
    'utf8'
  );
  const supplied = Buffer.from(suppliedSignature, 'utf8');
  if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) {
    return null;
  }

  try {
    const claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as QuizProofClaims;
    if (
      !claims ||
      !/^[A-Za-z0-9_-]{24}$/.test(claims.attemptId) ||
      !Number.isSafeInteger(claims.issuedAt) ||
      !Number.isSafeInteger(claims.expiresAt) ||
      claims.issuedAt > now ||
      claims.expiresAt !== claims.issuedAt + config.timeLimit * 60 * 1000 + SAVE_GRACE_MS ||
      claims.expiresAt <= now ||
      (claims.documentId !== null &&
        (typeof claims.documentId !== 'string' ||
          claims.documentId.length === 0 ||
          claims.documentId.length > MAX_DOCUMENT_ID_LENGTH))
    ) {
      return null;
    }
    return claims;
  } catch {
    return null;
  }
}
