import { describe, expect, it } from 'vitest';
import { validateQuizConfig } from '@/lib/quiz-submission';

describe('quiz configuration validation', () => {
  it('accepts a supported integer configuration', () => {
    expect(
      validateQuizConfig({ numQuestions: 10, timeLimit: 15, difficulty: 'medium' })
    ).toEqual({
      ok: true,
      value: { numQuestions: 10, timeLimit: 15, difficulty: 'medium' },
    });
  });

  it.each([
    { numQuestions: '10', timeLimit: 15, difficulty: 'medium' },
    { numQuestions: 10, timeLimit: 15.5, difficulty: 'medium' },
    { numQuestions: 10, timeLimit: 15, difficulty: 'unsupported' },
  ])('rejects configuration that cannot be completed and saved consistently', (config) => {
    expect(validateQuizConfig(config)).toEqual({
      ok: false,
      error: 'Quiz configuration is invalid',
    });
  });
});
