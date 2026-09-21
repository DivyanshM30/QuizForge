import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from 'node:crypto';
import type { Question, QuizConfig } from './types';

interface ExamContent { questions: Question[]; config: QuizConfig; quizProof: string }
const PREFIX = 'exam1';
function key() {
  if (!process.env.NEXTAUTH_SECRET) throw new Error('NEXTAUTH_SECRET is required');
  return Buffer.from(hkdfSync('sha256', process.env.NEXTAUTH_SECRET, '', 'quizforge-exam-v1', 32));
}

/** Keep the answer key confidential while authenticating the entire issued attempt. */
export function sealExam(content: ExamContent, userId: string): string {
  const nonce = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key(), nonce);
  cipher.setAAD(Buffer.from(userId));
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(content), 'utf8'), cipher.final()]);
  return [PREFIX, nonce.toString('base64url'), cipher.getAuthTag().toString('base64url'), encrypted.toString('base64url')].join('.');
}

export function openExam(token: string, userId: string): ExamContent | null {
  // Issuance bounds the plaintext to 1.5 MB, leaving room for base64 and metadata.
  if (token.length > 2_100_000) return null;
  const [version, nonce, tag, encrypted, extra] = token.split('.');
  if (version !== PREFIX || extra !== undefined || !nonce || !tag || !encrypted ||
      !/^[A-Za-z0-9_-]{16}$/.test(nonce) || !/^[A-Za-z0-9_-]{22}$/.test(tag) ||
      !/^[A-Za-z0-9_-]+$/.test(encrypted)) return null;
  try {
    const decipher = createDecipheriv('aes-256-gcm', key(), Buffer.from(nonce, 'base64url'));
    decipher.setAAD(Buffer.from(userId));
    decipher.setAuthTag(Buffer.from(tag, 'base64url'));
    return JSON.parse(Buffer.concat([decipher.update(Buffer.from(encrypted, 'base64url')), decipher.final()]).toString('utf8'));
  } catch { return null; }
}
