import corpus from './corpus.json';
import type { Question, QuizConfig } from '../../lib/types';

export const config: QuizConfig = { numQuestions: 5, timeLimit: 5, difficulty: 'mixed' };

export interface BenchmarkCase {
  id: string;
  documentId: string;
  source: string;
  scenario: string;
  expected: Question[] | null;
  responses: string[];
  expectedCalls: number;
}

// Original, synthetic notes and hand-authored answers; no model or user data.
// Three documents exercise the same 18 conditions. These are 54 regression
// cases, not 54 independent samples of real model behavior.
export function makeCases(): BenchmarkCase[] {
  return corpus.flatMap(document => {
    const questions: Question[] = document.facts.map(([question, a, b, c, d, explanation], i) => {
      // Rotate answers so the oracle checks all four answer keys.
      const options = [a, b, c, d];
      const rotation = i % 4;
      const rotated = options.map((_, j) => options[(j - rotation + 4) % 4]);
      return {
        id: `q${i + 1}`, question,
        options: { a: rotated[0], b: rotated[1], c: rotated[2], d: rotated[3] },
        correctAnswer: (['a', 'b', 'c', 'd'] as const)[rotation],
        explanation, topic: document.id, difficulty: 'easy',
      };
    });
    const source = `${document.title}\n\n${document.facts.map(f => `${f[0]} ${f[1]}. ${f[5]}`).join('\n\n')}`;
    const json = JSON.stringify(questions);
    const softFields = questions.map(q => ({
      question: ` ${q.question} `,
      options: q.options,
      correctAnswer: ` ${q.correctAnswer.toUpperCase()} `,
    }));
    const softExpected = questions.map(q => ({
      ...q, explanation: 'No explanation provided.', topic: 'General', difficulty: 'medium' as const,
    }));
    const positive = (scenario: string, first: string, expected = questions, calls = 1): BenchmarkCase => ({
      id: `${document.id}/${scenario}`, documentId: document.id, source, scenario,
      expected, responses: [first, json], expectedCalls: calls,
    });
    const negative = (scenario: string, response: string, calls: number): BenchmarkCase => ({
      id: `${document.id}/${scenario}`, documentId: document.id, source, scenario,
      expected: null, responses: [response, response], expectedCalls: calls,
    });
    return [
      positive('plain-json', json),
      positive('json-fence', `\n\`\`\`json\n${json}\n\`\`\`\n`),
      positive('bare-fence-crlf', `\`\`\`\r\n${json}\r\n\`\`\``),
      positive('soft-field-repair', JSON.stringify(softFields), softExpected),
      positive('extra-question', JSON.stringify([...questions, { ...questions[0], id: 'q6' }])),
      positive('discard-invalid-extra', JSON.stringify([null, { question: 'Unusable' }, ...questions])),
      positive('uppercase-json-fence', `\`\`\`JSON\n${json}\n\`\`\``),
      positive('spaced-json-fence', `\`\`\` json\n${json}\n\`\`\``),
      positive('syntax-error-then-valid', '[{"question":', questions, 2),
      { ...positive('wrong-root-then-fenced', '{}', questions, 2), responses: ['{}', `\`\`\`\n${json}\n\`\`\``] },
      negative('missing-answer', JSON.stringify(questions.map(q => ({ ...q, correctAnswer: null }))), 1),
      negative('missing-option', JSON.stringify(questions.map(q => ({ ...q, options: { a: 'A', b: 'B', c: 'C' } }))), 1),
      negative('truncated-json', '[{"question":', 2),
      negative('wrong-root', JSON.stringify({ questions }), 2),
      negative('oversized-topic', JSON.stringify(questions.map(q => ({ ...q, topic: 'T'.repeat(201) }))), 1),
      negative('empty-array', '[]', 1),
      negative('prose-wrapped-json', `Here are your questions:\n${json}`, 2),
      negative('non-string-question', JSON.stringify(questions.map(q => ({ ...q, question: 42 }))), 1),
    ];
  });
}
