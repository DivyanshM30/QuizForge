/**
 * Real-provider benchmark for the QuizForge generation pipeline.
 *
 * Unlike benchmarks/quiz-generation (mocked SDK, deterministic regression matrix),
 * this script calls the live Gemini API through the *production* generateQuestions
 * function and measures what actually happens:
 *
 *   - first-attempt success vs. success after the built-in retry
 *   - retries per call (counted at the HTTP layer, not inferred)
 *   - raw questions vs. questions the sanitizer kept (rejections) and repaired
 *   - prompt tokens actually billed, from usageMetadata
 *   - wall-clock latency per call
 *
 * It does not modify production code. The SDK is observed by wrapping global fetch.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, 'docs', 'local', 'gemini-live');
fs.mkdirSync(OUT_DIR, { recursive: true });

// ---------------------------------------------------------------- env loading
const envText = fs.readFileSync(path.join(ROOT, '.env'), 'utf8');
const env = Object.fromEntries(
  envText.split(/\r?\n/)
    .filter((l) => /^[A-Z_0-9]+=/.test(l))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1).trim()]; }),
);
process.env.GEMINI_API_KEY = env.GEMINI_API_KEY;
process.env.GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

// ------------------------------------------------------------- fetch instrument
const calls = [];
let active = null;
const originalFetch = globalThis.fetch;

globalThis.fetch = async (input, init) => {
  const url = typeof input === 'string' ? input : input?.url ?? String(input);
  const started = performance.now();
  let bodyText = null;
  try {
    bodyText = typeof init?.body === 'string' ? init.body : null;
  } catch { /* ignore */ }

  const response = await originalFetch(input, init);
  let usage = null;
  let rawText = null;
  try {
    const clone = response.clone();
    const json = await clone.json();
    usage = json?.usageMetadata ?? null;
    rawText = json?.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? null;
  } catch { /* non-JSON */ }

  const record = {
    url: url.replace(/key=[^&]+/, 'key=REDACTED'),
    status: response.status,
    ms: Math.round(performance.now() - started),
    promptChars: bodyText ? bodyText.length : null,
    usage,
    rawText,
  };
  calls.push(record);
  if (active) active.push(record);
  return response;
};

const { generateQuestions } = await import('../../lib/gemini.ts');

// ------------------------------------------------------------------ doc corpus
function collectDocs() {
  const found = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (/node_modules|[\\/]\.next|[\\/]\.git|[\\/]\.perch/.test(full)) continue;
        walk(full);
      } else if (/\.(md|txt)$/.test(entry.name)) {
        const text = fs.readFileSync(full, 'utf8');
        if (text.length >= 1500) found.push({ file: path.relative(ROOT, full), text });
      }
    }
  };
  walk(ROOT);
  // Deduplicate by content hash so copies of the same document are not counted twice.
  const seen = new Set();
  const unique = [];
  for (const doc of found.sort((a, b) => b.text.length - a.text.length)) {
    const h = crypto.createHash('sha256').update(doc.text).digest('hex');
    if (seen.has(h)) continue;
    seen.add(h);
    unique.push({ ...doc, sha256: h });
  }
  return unique;
}

const allDocs = collectDocs();
const DOCS = allDocs.slice(0, 30);
console.log(`corpus: ${allDocs.length} unique docs found, using ${DOCS.length}`);

// ------------------------------------------------------------------- utilities
const CONFIG = (n) => ({ numQuestions: n, difficulty: 'mixed', mode: 'quiz' });

function parseRawQuestions(rawText) {
  if (!rawText) return null;
  const trimmed = rawText.trim();
  const fenced = trimmed.match(/^```[ \t]*(?:json)?\s*([\s\S]*?)\s*```$/i);
  try {
    const parsed = JSON.parse(fenced ? fenced[1] : trimmed);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

const OPTION_KEYS = ['a', 'b', 'c', 'd'];
const isNonEmpty = (v) => typeof v === 'string' && v.trim().length > 0;

/** Same acceptance rules the production sanitizer applies, used only to label
 *  each raw entry as kept / dropped / repaired. */
function classifyRawEntry(entry) {
  if (typeof entry !== 'object' || entry === null) return 'dropped';
  if (!isNonEmpty(entry.question)) return 'dropped';
  const opts = entry.options;
  if (!opts || OPTION_KEYS.some((k) => !isNonEmpty(opts[k]))) return 'dropped';
  const correct = isNonEmpty(entry.correctAnswer) ? entry.correctAnswer.trim().toLowerCase() : '';
  if (!OPTION_KEYS.includes(correct)) return 'dropped';
  const softMissing =
    !isNonEmpty(entry.id) ||
    !isNonEmpty(entry.explanation) ||
    !isNonEmpty(entry.topic) ||
    !['easy', 'medium', 'hard'].includes(isNonEmpty(entry.difficulty) ? entry.difficulty.toLowerCase() : '');
  return softMissing ? 'repaired' : 'clean';
}

const pct = (n, d) => (d === 0 ? null : +((n / d) * 100).toFixed(2));
const quantile = (values, q) => {
  if (!values.length) return null;
  const s = [...values].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.ceil(q * s.length) - 1)];
};

// ------------------------------------------------------- phase 1: 30 documents
async function runDocumentPhase() {
  const rows = [];
  for (let i = 0; i < DOCS.length; i += 1) {
    const doc = DOCS[i];
    active = [];
    const started = performance.now();
    let questions = null;
    let error = null;
    try {
      questions = await generateQuestions(doc.text, CONFIG(5));
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    }
    const elapsed = Math.round(performance.now() - started);
    const attemptCalls = active;
    active = null;

    const firstCall = attemptCalls[0] ?? null;
    const rawFirst = firstCall ? parseRawQuestions(firstCall.rawText) : null;
    const finalCall = attemptCalls[attemptCalls.length - 1] ?? null;
    const rawFinal = finalCall ? parseRawQuestions(finalCall.rawText) : null;
    const rawUsed = rawFinal ?? rawFirst;

    const classified = rawUsed ? rawUsed.map(classifyRawEntry) : [];
    const dropped = classified.filter((c) => c === 'dropped').length;
    const repaired = classified.filter((c) => c === 'repaired').length;
    const clean = classified.filter((c) => c === 'clean').length;

    const row = {
      index: i + 1,
      file: doc.file,
      docChars: doc.text.length,
      docSha256: doc.sha256,
      requests: attemptCalls.length,
      firstAttemptParsed: rawFirst !== null,
      firstAttemptValidCount: rawFirst ? rawFirst.length : 0,
      succeeded: questions !== null,
      error,
      latencyMs: elapsed,
      promptTokens: attemptCalls.reduce((a, c) => a + (c.usage?.promptTokenCount ?? 0), 0),
      outputTokens: attemptCalls.reduce((a, c) => a + (c.usage?.candidatesTokenCount ?? 0), 0),
      thoughtTokens: attemptCalls.reduce((a, c) => a + (c.usage?.thoughtsTokenCount ?? 0), 0),
      promptCharsSent: attemptCalls[0]?.promptChars ?? null,
      returnedQuestions: questions ? questions.length : 0,
      rawEntries: rawUsed ? rawUsed.length : 0,
      rawDropped: dropped,
      rawRepaired: repaired,
      rawClean: clean,
      questions: questions ?? null,
      rawTextUsed: rawUsed,
    };
    rows.push(row);
    console.log(
      `[${String(i + 1).padStart(2)}/${DOCS.length}] ${path.basename(doc.file).padEnd(34)} ` +
      `req=${attemptCalls.length} ok=${questions ? 'Y' : 'N'} ` +
      `raw=${rawUsed ? rawUsed.length : 0} kept=${questions ? questions.length : 0} ` +
      `drop=${dropped} rep=${repaired} ${elapsed}ms`,
    );
    fs.writeFileSync(path.join(OUT_DIR, 'documents.json'), JSON.stringify(rows, null, 2));
  }
  return rows;
}

// ------------------------------------------------- phase 2: latency by size
async function runLatencyPhase() {
  const sizes = [10, 25, 50];
  const docs = DOCS.slice(0, 3);
  const rows = [];
  for (const n of sizes) {
    for (const doc of docs) {
      active = [];
      const started = performance.now();
      let ok = false;
      let error = null;
      let count = 0;
      try {
        const q = await generateQuestions(doc.text, CONFIG(n));
        ok = true;
        count = q.length;
      } catch (e) {
        error = e instanceof Error ? e.message : String(e);
      }
      const elapsed = Math.round(performance.now() - started);
      const attemptCalls = active;
      active = null;
      rows.push({
        numQuestions: n,
        file: doc.file,
        docChars: doc.text.length,
        requests: attemptCalls.length,
        ok,
        count,
        error,
        latencyMs: elapsed,
        promptTokens: attemptCalls.reduce((a, c) => a + (c.usage?.promptTokenCount ?? 0), 0),
        outputTokens: attemptCalls.reduce((a, c) => a + (c.usage?.candidatesTokenCount ?? 0), 0),
        thoughtTokens: attemptCalls.reduce((a, c) => a + (c.usage?.thoughtsTokenCount ?? 0), 0),
      });
      console.log(`[latency n=${String(n).padStart(2)}] ${path.basename(doc.file).padEnd(30)} ${elapsed}ms ok=${ok} req=${attemptCalls.length}`);
      fs.writeFileSync(path.join(OUT_DIR, 'latency.json'), JSON.stringify(rows, null, 2));
    }
  }
  return rows;
}

const documents = await runDocumentPhase();
const latency = await runLatencyPhase();

// ------------------------------------------------------------------- summary
const succeeded = documents.filter((d) => d.succeeded);
const firstPass = documents.filter((d) => d.firstAttemptParsed && d.firstAttemptValidCount >= 5 && d.succeeded && d.requests === 1);
const recovered = documents.filter((d) => d.succeeded && d.requests > 1);
const failed = documents.filter((d) => !d.succeeded);

const totalRaw = documents.reduce((a, d) => a + d.rawEntries, 0);
const totalDropped = documents.reduce((a, d) => a + d.rawDropped, 0);
const totalRepaired = documents.reduce((a, d) => a + d.rawRepaired, 0);
const totalReturned = documents.reduce((a, d) => a + d.returnedQuestions, 0);

const latencyBySize = {};
for (const n of [10, 25, 50]) {
  const vals = latency.filter((r) => r.numQuestions === n && r.ok).map((r) => r.latencyMs);
  latencyBySize[n] = {
    samples: vals.length,
    p50: quantile(vals, 0.5),
    p95: quantile(vals, 0.95),
    min: vals.length ? Math.min(...vals) : null,
    max: vals.length ? Math.max(...vals) : null,
  };
}

const summary = {
  generatedAt: new Date().toISOString(),
  model: process.env.GEMINI_MODEL,
  documents: {
    used: documents.length,
    succeeded: succeeded.length,
    failed: failed.length,
    firstPassValid: firstPass.length,
    firstPassValidPct: pct(firstPass.length, documents.length),
    validAfterRetries: succeeded.length,
    validAfterRetriesPct: pct(succeeded.length, documents.length),
    recoveredByRetry: recovered.length,
    totalRequests: documents.reduce((a, d) => a + d.requests, 0),
    avgRetriesPerCall: +(documents.reduce((a, d) => a + Math.max(0, d.requests - 1), 0) / documents.length).toFixed(3),
    avgRequestsPerCall: +(documents.reduce((a, d) => a + d.requests, 0) / documents.length).toFixed(3),
  },
  schema: {
    rawEntries: totalRaw,
    returned: totalReturned,
    dropped: totalDropped,
    repaired: totalRepaired,
    droppedPct: pct(totalDropped, totalRaw),
    repairedPct: pct(totalRepaired, totalRaw),
    rejectedOrRepairedPct: pct(totalDropped + totalRepaired, totalRaw),
  },
  latency: latencyBySize,
  tokens: {
    avgPromptTokensPerRequest: +(
      documents.reduce((a, d) => a + d.promptTokens, 0) /
      Math.max(1, documents.reduce((a, d) => a + d.requests, 0))
    ).toFixed(1),
    avgOutputTokensPerDoc: +(documents.reduce((a, d) => a + d.outputTokens, 0) / documents.length).toFixed(1),
    avgThoughtTokensPerDoc: +(documents.reduce((a, d) => a + d.thoughtTokens, 0) / documents.length).toFixed(1),
  },
  failures: failed.map((d) => ({ file: d.file, error: d.error })),
};

fs.writeFileSync(path.join(OUT_DIR, 'summary.json'), JSON.stringify(summary, null, 2));
fs.writeFileSync(path.join(OUT_DIR, 'raw-calls.json'), JSON.stringify(calls.map(({ rawText, ...r }) => r), null, 2));
console.log('\n=== SUMMARY ===');
console.log(JSON.stringify(summary, null, 2));
