import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { generateQuestions } from '@/lib/gemini';

const sdk = vi.hoisted(() => ({ generateContent: vi.fn() }));
vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: class {
    getGenerativeModel() { return { generateContent: sdk.generateContent }; }
  },
}));

const config = { numQuestions: 5, timeLimit: 5, difficulty: 'mixed' as const };
const questions = Array.from({ length: 5 }, (_, i) => ({
  id: `q${i + 1}`, question: `Which marker opens JSON example ${i + 1}?`,
  options: { a: '```json', b: '<json>', c: '[json]', d: '(json)' },
  correctAnswer: 'a', explanation: 'Use ```json to open and ``` to close.',
  topic: 'Formatting', difficulty: 'easy',
}));
const json = JSON.stringify(questions);
const response = (text: string) => ({ response: { text: () => text } });

beforeEach(() => {
  vi.stubEnv('GEMINI_API_KEY', 'mock-only');
  vi.stubEnv('GEMINI_MODEL', 'mock-model');
  vi.stubGlobal('fetch', vi.fn(() => { throw new Error('Network disabled in regression tests'); }));
  sdk.generateContent.mockReset();
  sdk.generateContent.mockRejectedValue(new Error('Mock queue exhausted'));
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'log').mockImplementation(() => {});
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe('Gemini response parsing', () => {
  it.each([
    ['plain JSON', json],
    ['lowercase fence', `\`\`\`json\n${json}\n\`\`\``],
    ['uppercase fence', `\`\`\`JSON\r\n${json}\r\n\`\`\``],
    ['spaced mixed-case fence', `\n\`\`\` \tJsOn\n${json}\n\`\`\` \n`],
    ['bare fence', `\`\`\`\n${json}\n\`\`\``],
    ['inline fence', `\`\`\`json${json}\`\`\``],
  ])('preserves literal markers with %s using one request', async (_, text) => {
    sdk.generateContent.mockResolvedValueOnce(response(text));
    await expect(generateQuestions('Synthetic notes', config)).resolves.toEqual(questions);
    expect(sdk.generateContent).toHaveBeenCalledTimes(1);
  });

  it.each([json, `\`\`\`JSON\n${json}\n\`\`\``])('uses the same content-preserving parser on retry', async text => {
    sdk.generateContent.mockResolvedValueOnce(response('{')).mockResolvedValueOnce(response(text));
    await expect(generateQuestions('Synthetic notes', config)).resolves.toEqual(questions);
    expect(sdk.generateContent).toHaveBeenCalledTimes(2);
  });

  it.each([
    ['prose before JSON', `Here is your quiz:\n${json}`],
    ['multiple fenced blocks', `\`\`\`json\n${json}\n\`\`\`\n\`\`\`json\n${json}\n\`\`\``],
    ['unclosed fence', `\`\`\`json\n${json}`],
    ['unsupported fence label', `\`\`\`javascript\n${json}\n\`\`\``],
  ])('rejects %s without guessing JSON boundaries', async (_, text) => {
    sdk.generateContent.mockResolvedValue(response(text));
    await expect(generateQuestions('Synthetic notes', config)).rejects.toThrow();
    expect(sdk.generateContent.mock.calls.length).toBeLessThanOrEqual(2);
  });

  it('still rejects missing answer options after removing a fence', async () => {
    const invalid = questions.map(q => ({ ...q, options: { a: 'A' } }));
    sdk.generateContent.mockResolvedValue(response(`\`\`\`JSON\n${JSON.stringify(invalid)}\n\`\`\``));
    await expect(generateQuestions('Synthetic notes', config)).rejects.toThrow('Generated only 0 valid questions');
    expect(sdk.generateContent).toHaveBeenCalledTimes(1);
  });

  it('does not turn transport failures into parsing retries', async () => {
    sdk.generateContent.mockRejectedValue(new Error('429 quota exceeded'));
    await expect(generateQuestions('Synthetic notes', config)).rejects.toThrow('429 quota exceeded');
    expect(sdk.generateContent).toHaveBeenCalledTimes(1);
  });
});
