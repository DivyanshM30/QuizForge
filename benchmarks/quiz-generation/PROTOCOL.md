# Quiz generation benchmark protocol, version 1

Defined before executing the benchmark or changing production code.

## Chosen property

Primary metric: number of mocked Gemini `generateContent` requests across the
fixed set of 30 answerable cases. Report the raw before/after counts and relative
reduction, with median and nearest-rank p95 requests per case. Acceptance gates:
all 30 answerable cases must return correct structured content, and all 24
unusable-output cases must reject. Never count a rejection as a produced quiz.

This measures a reliability and resource-use property of a core pipeline step.
Adding features says nothing about whether study material becomes a usable quiz
or whether avoidable formatting problems consume additional provider requests.

## Fixed set and scope

`corpus.json` contains three original, synthetic, anonymous study documents:
data structures, networking, and databases. Each has five hand-authored MCQs.
The questions deliberately include literal Markdown fence markers, since study
material may contain code examples. Answers rotate across a/b/c/d.

`cases.ts` applies the same 18 deterministic scenarios to each document:

| Expected usable quiz (10 per document) | Expected rejection (8 per document) |
| --- | --- |
| Plain JSON | Missing answer |
| Standard JSON fence | Missing option |
| Bare fence with CRLF | Truncated JSON on both attempts |
| Repairable soft fields | Wrong root on both attempts |
| Extra question | Oversized topic |
| Invalid extra entries before valid questions | Empty array |
| Uppercase JSON fence label | Prose before JSON |
| Space before JSON fence label | Non-string question |
| Truncated first response, valid second response | |
| Wrong root first response, bare-fenced second response | |

Every case creates a deterministic DOCX in memory (fixed ZIP timestamps), runs
the real `parseDocument`, then runs the real `generateQuestions`. Only the Gemini
SDK is replaced. The mocked SDK supplies a fixed two-response queue, verifies
the extracted notes are present in the prompt, and fails if the queue is exceeded.
Canonical/fence cases have a valid second response available, allowing the old
parser to demonstrate its unnecessary retry under identical conditions.

Boundaries excluded: HTTP route/auth/database, PDF extraction, UI, route-level
retries, provider model fallback availability, real model quality/grounding and
network latency. Fifty-four cases are a designed regression matrix, not an
estimate of real-world occurrence frequencies or 54 independent user samples.

## Success/failure oracle (fixed before measurement)

For an answerable case, success requires exactly five questions, deep equality
to the hand-authored expected questions after explicitly permitted soft-field
defaults, four non-empty options, a valid correct-answer key, and acceptance by
the production quiz-content validator. This catches content deletion even when
the resulting JSON still has valid field types. No guessing of missing answers,
repair of broken JSON, extraction from arbitrary prose, or hallucination scoring.

For an unusable case, success requires rejection with no returned questions.
Unexpected rejection, wrong content, invalid structure, unexpected acceptance,
or excess mock requests is a failure. Report these separately. The current
implementation must also use the declared per-case request budget.

## Baseline and environment

Baseline: `32cd140171cc01ceb77ae828a144332d7cbc4a1d:lib/gemini.ts`, the actual
committed implementation at task start. The baseline is loaded directly from
Git in memory. Both versions use the same current parser, validation helpers,
runtime, installed dependencies, corpus, and mock response histories. This
isolates the response parsing change; it is not a comparison of whole historic
deployments. Older sanitizer changes exist in history, but do not isolate this
change as closely.

One run per case, per version, in a serial test worker. No timing result is
claimed: immediate mocks would not represent Gemini latency, and DOCX parser
timing is not the selected metric. Median and p95 apply to request counts.
Record runtime/OS/CPU/dependency versions, source and fixture SHA-256 hashes,
raw response histories, expected and actual output, errors, and request counts.
The runner clears provider credentials, supplies a fake key only inside the
mocked test, and blocks unmocked network entry points. It never loads .env files.

## Reproduction

From the repository root with dependencies installed from `package-lock.json`:

```powershell
node scripts/benchmark-quiz-generation.mjs
node node_modules/vitest/vitest.mjs run tests/gemini-response.test.ts tests/document-parser.test.ts tests/quiz-issuance.test.ts
node node_modules/typescript/bin/tsc --noEmit
```

Raw reports are local and ignored under `docs/local/quiz-generation-metric/`.
The benchmark runner exits unsuccessfully if any current acceptance gate fails.
For a fresh checkout, run `npm ci` first (package downloads require network;
the benchmark itself makes no provider requests).
