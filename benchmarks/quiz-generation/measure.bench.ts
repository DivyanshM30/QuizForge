import { afterAll, beforeEach, expect, it, vi } from 'vitest';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import os from 'node:os';
import net from 'node:net';
import http from 'node:http';
import https from 'node:https';
import JSZip from 'jszip';
import { parseDocument } from '../../lib/document-parser';
import { validateQuizContent } from '../../lib/quiz-submission';
import { config, makeCases } from './cases';
import type { Question } from '../../lib/types';

const sdk = vi.hoisted(() => ({
  responses: [] as string[], calls: 0, prompts: [] as string[], source: '', networkAttempts: 0,
}));
vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: class {
    getGenerativeModel() {
      return { generateContent: async (prompt: string) => {
        sdk.calls += 1;
        sdk.prompts.push(prompt);
        if (!prompt.includes(sdk.source)) throw new Error('Harness error: document missing from prompt');
        const text = sdk.responses.shift();
        if (text === undefined) throw new Error('Harness error: fixed response queue exhausted');
        return { response: { text: () => text } };
      } };
    }
  },
}));

// The dedicated config resolves this to either Git's committed source or the
// working source. A variable avoids adding a fake production module declaration.
const targetModule = '@benchmark/gemini';
const { generateQuestions } = await import(targetModule) as typeof import('../../lib/gemini');
const variant = process.env.QF_BENCHMARK_VARIANT === 'baseline' ? 'baseline' : 'current';
const baselineRef = '32cd140171cc01ceb77ae828a144332d7cbc4a1d';
const cases = makeCases();
const hash = (data: string | Buffer) => createHash('sha256').update(data).digest('hex');
const rows: Array<{
  id: string; scenario: string; expectedOutcome: string; passed: boolean;
  structureValid: boolean; contentPreserved: boolean; rejected: boolean;
  calls: number; expectedCalls: number; documentSha256: string;
  expected: Question[] | null; actual: Question[] | null; error: string | null;
  responses: string[];
}> = [];

beforeEach(() => {
  vi.stubEnv('GEMINI_API_KEY', 'synthetic-key-never-sent');
  vi.stubEnv('GEMINI_MODEL', 'synthetic-model');
  const blocked = () => { sdk.networkAttempts += 1; throw new Error('Harness error: network disabled'); };
  vi.stubGlobal('fetch', vi.fn(blocked));
  vi.spyOn(net.Socket.prototype, 'connect').mockImplementation(blocked);
  vi.spyOn(http, 'request').mockImplementation(blocked);
  vi.spyOn(http, 'get').mockImplementation(blocked);
  vi.spyOn(https, 'request').mockImplementation(blocked);
  vi.spyOn(https, 'get').mockImplementation(blocked);
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'log').mockImplementation(() => {});
  sdk.calls = 0;
  sdk.prompts = [];
});

async function docxFor(source: string): Promise<Buffer> {
  const zip = new JSZip();
  const options = { date: new Date('2020-01-01T00:00:00Z'), createFolders: false };
  const escapeXml = (s: string) => s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
  zip.file('[Content_Types].xml', '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>', options);
  zip.file('word/document.xml', `<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${source.split('\n\n').map(p => `<w:p><w:r><w:t>${escapeXml(p)}</w:t></w:r></w:p>`).join('')}</w:body></w:document>`, options);
  return zip.generateAsync({ type: 'nodebuffer', compression: 'STORE' });
}

it.each(cases)('$id', async fixture => {
  const archive = await docxFor(fixture.source);
  const parsed = await parseDocument(new File([new Uint8Array(archive)], `${fixture.documentId}.docx`, {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  }));
  expect(parsed.text.trim()).toBe(fixture.source);
  sdk.source = parsed.text;
  sdk.responses = [...fixture.responses];
  let actual: Question[] | null = null;
  let error: string | null = null;
  try { actual = await generateQuestions(parsed.text, config); }
  catch (caught) { error = caught instanceof Error ? caught.message : String(caught); }
  if (error?.includes('Harness error:')) throw new Error(error);

  const structureValid = actual !== null && actual.length === config.numQuestions &&
    validateQuizContent({ questions: actual, config }).ok;
  const contentPreserved = actual !== null && JSON.stringify(actual) === JSON.stringify(fixture.expected);
  const passed = fixture.expected === null ? actual === null && error !== null : structureValid && contentPreserved;
  rows.push({
    id: fixture.id, scenario: fixture.scenario,
    expectedOutcome: fixture.expected ? 'quiz' : 'reject', passed, structureValid, contentPreserved,
    rejected: actual === null && error !== null, calls: sdk.calls, expectedCalls: fixture.expectedCalls,
    documentSha256: hash(archive), expected: fixture.expected, actual, error, responses: fixture.responses,
  });
  expect(sdk.networkAttempts).toBe(0);
  // Historical failures are measurements; current failures are regression gates.
  if (variant === 'current') {
    expect(passed, `${fixture.id}: ${error ?? 'output differs from fixed oracle'}`).toBe(true);
    expect(sdk.calls).toBe(fixture.expectedCalls);
  }
});

function requestStats(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return {
    total: sorted.reduce((sum, value) => sum + value, 0),
    median: sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2,
    p95: sorted[Math.ceil(sorted.length * 0.95) - 1],
  };
}

afterAll(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  const positive = rows.filter(row => row.expectedOutcome === 'quiz');
  const negative = rows.filter(row => row.expectedOutcome === 'reject');
  const source = variant === 'baseline'
    ? execFileSync('git', ['show', `${baselineRef}:lib/gemini.ts`], { encoding: 'utf8' })
    : readFileSync('lib/gemini.ts', 'utf8');
  const version = (name: string) => JSON.parse(readFileSync(`node_modules/${name}/package.json`, 'utf8')).version;
  const report = {
    variant, baselineRef, head: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
    environment: { node: process.version, platform: process.platform, osRelease: os.release(), arch: process.arch,
      cpu: os.cpus()[0].model, logicalCpus: os.cpus().length, totalMemoryBytes: os.totalmem(),
      versions: Object.fromEntries(['vitest', 'typescript', '@google/generative-ai', 'mammoth', 'jszip'].map(name => [name, version(name)])),
    },
    hashes: {
      geminiSource: hash(source.replaceAll('\r\n', '\n')),
      corpus: hash(readFileSync('benchmarks/quiz-generation/corpus.json')),
      cases: hash(JSON.stringify(cases)),
      lockfile: hash(readFileSync('package-lock.json')),
      protocol: hash(readFileSync('benchmarks/quiz-generation/PROTOCOL.md')),
    },
    summary: {
      cases: rows.length, passed: rows.filter(row => row.passed).length,
      answerableCases: positive.length, correctQuizzes: positive.filter(row => row.passed).length,
      structurallyValidQuizzes: positive.filter(row => row.structureValid).length,
      contentMismatches: positive.filter(row => row.structureValid && !row.contentPreserved).length,
      unexpectedRejections: positive.filter(row => row.rejected).length,
      rejectionCases: negative.length, correctlyRejected: negative.filter(row => row.passed).length,
      unexpectedAcceptances: negative.filter(row => !row.rejected).length,
      answerableRequests: requestStats(positive.map(row => row.calls)),
      rejectionRequests: requestStats(negative.map(row => row.calls)),
      allRequests: requestStats(rows.map(row => row.calls)),
      networkAttempts: sdk.networkAttempts,
    },
    cases: rows,
  };
  const directory = join('docs', 'local', 'quiz-generation-metric');
  mkdirSync(directory, { recursive: true });
  writeFileSync(join(directory, `${variant}.json`), `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify({ variant, ...report.summary }, null, 2));
  expect(rows).toHaveLength(cases.length);
});
