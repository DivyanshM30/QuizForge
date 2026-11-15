# 02. Concepts

[← 01. Overview](01-OVERVIEW.md) | [Index](README.md) | [Next: 03. Architecture →](03-ARCHITECTURE.md)

**Purpose:** teach the ideas you need to read QuizForge's code, using QuizForge's own code as the examples.
**Prerequisites:** basic JavaScript (functions, objects, `async`/`await`). No prior Next.js, Prisma, or cryptography knowledge is assumed.

Each concept follows the same pattern:

1. **The idea**, explained plainly.
2. **Where QuizForge uses it.**
3. **Example from the code**, a short excerpt.
4. **Common misunderstanding or failure mode.**

Use this chapter as a reference. You do not need to read it top to bottom before [03. Architecture](03-ARCHITECTURE.md).

## Contents

1. [Client and server responsibilities](#1-client-and-server-responsibilities)
2. [File-based routing and route handlers](#2-file-based-routing-and-route-handlers)
3. [Authentication versus authorization](#3-authentication-versus-authorization)
4. [Stateless JWT sessions and revocation](#4-stateless-jwt-sessions-and-revocation)
5. [Password hashing and reset tokens](#5-password-hashing-and-reset-tokens)
6. [Database models, relations, and JSON columns](#6-database-models-relations-and-json-columns)
7. [Upload validation and text extraction](#7-upload-validation-and-text-extraction)
8. [Prompting for structured output](#8-prompting-for-structured-output)
9. [Validating untrusted data](#9-validating-untrusted-data)
10. [Browser state with Zustand](#10-browser-state-with-zustand)
11. [Wall-clock timers and deadlines](#11-wall-clock-timers-and-deadlines)
12. [Signed tokens (HMAC)](#12-signed-tokens-hmac)
13. [Authenticated encryption for exams](#13-authenticated-encryption-for-exams)
14. [Server-side scoring](#14-server-side-scoring)
15. [Idempotency and concurrent writes](#15-idempotency-and-concurrent-writes)
16. [Browser persistence and recovery](#16-browser-persistence-and-recovery)
17. [Spaced repetition](#17-spaced-repetition)
18. [Keyset pagination and streaming aggregation](#18-keyset-pagination-and-streaming-aggregation)
19. [Rate limiting](#19-rate-limiting)
20. [Capability links for sharing](#20-capability-links-for-sharing)
21. [Lazy-loading heavy UI](#21-lazy-loading-heavy-ui)
22. [Concepts that do not apply](#22-concepts-that-do-not-apply)

---

## 1. Client and server responsibilities

**The idea.** In a web app, code runs in two places. The *client* is the user's browser: it renders the UI and reacts to clicks, but anyone can read and modify what runs there. The *server* runs code you control: it can hold secrets, talk to the database, and make decisions the user cannot tamper with. Good design puts every trust decision on the server.

**Where QuizForge uses it.** Every interactive page under `app/` starts with `'use client'` and fetches JSON from `app/api/**`. The exceptions are the root [`app/page.tsx`](../app/page.tsx) and [`app/layout.tsx`](../app/layout.tsx), which are server components that only compose client components and set metadata, and [`app/hero/page.tsx`](../app/hero/page.tsx), which redirects to `/`. Next.js still pre-renders client components to HTML on the server; `'use client'` means "also hydrate and run in the browser", not "never runs on the server". Secrets (`GEMINI_API_KEY`, `NEXTAUTH_SECRET`, `DATABASE_URL`) are read only in server modules under `lib/`. Grading happens in [`app/api/save-quiz/route.ts`](../app/api/save-quiz/route.ts), not in the browser.

**Example.** The browser's save request carries answers and a proof, but no score:

```ts
// store/quiz-store.ts, inside saveQuiz
body: JSON.stringify({
  ...(session.config.mode === 'exam' ? {} : { questions: session.questions }),
  config: session.config,
  userAnswers: session.userAnswers,
  confidences: session.confidences,
  quizProof: session.quizProof,
}),
```

The server computes the score itself with `deriveQuizMetrics`.

**Common misunderstanding.** "The page redirects to `/login`, so the data is protected." Page redirects such as `if (status === 'unauthenticated') router.push('/login')` in [`app/dashboard/page.tsx`](../app/dashboard/page.tsx) are only a convenience. QuizForge has no `middleware.ts`. The real protection is that every private API handler calls `getServerSession` and returns 401 without a user id.

## 2. File-based routing and route handlers

**The idea.** Next.js's App Router maps folders to URLs. `app/history/page.tsx` serves `/history`. A folder named `[id]` is a *dynamic segment*: `app/history/[id]/page.tsx` serves `/history/abc123`. A `route.ts` file defines an API endpoint by exporting functions named after HTTP methods (`GET`, `POST`, `PATCH`, `DELETE`).

**Where QuizForge uses it.** Pages live under `app/<name>/page.tsx`; APIs under `app/api/<name>/route.ts`. Per-route `layout.tsx` files mostly set page `metadata` (title, robots). Route files also export settings:

| Export | Meaning | Example |
|---|---|---|
| `dynamic = 'force-dynamic'` | Never cache or pre-render this handler's response | [`app/api/history/route.ts`](../app/api/history/route.ts) |
| `runtime = 'nodejs'` | Run on the Node.js runtime (needed for `pdf-parse`, `mammoth`, `node:crypto`) | [`app/api/analyze-document/route.ts`](../app/api/analyze-document/route.ts) |
| `maxDuration = 60` / `120` | Upper bound on execution time on hosts that honor it, such as Vercel | [`app/api/generate-questions/route.ts`](../app/api/generate-questions/route.ts) |

**Example.** In Next.js 16, dynamic `params` arrive as a Promise:

```ts
// app/api/history/[id]/route.ts
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  // ...
  const { id } = await params
```

**Common misunderstanding.** Assuming `/upload?step=config` controls which step is shown. It does not. [`app/upload/page.tsx`](../app/upload/page.tsx) derives the step from store state: `result ? 'results' : session ? 'quiz' : documentText ? 'config' : 'upload'`. The query string is only a hint left by callers.

## 3. Authentication versus authorization

**The idea.** *Authentication* answers "who are you?" (sign-in). *Authorization* answers "may you touch this record?" (ownership checks). A signed-in user must still be stopped from reading someone else's data.

**Where QuizForge uses it.** Authentication: [`lib/auth.ts`](../lib/auth.ts) through NextAuth. Authorization: each handler scopes queries by the session's user id.

**Example.** Two ownership patterns appear:

```ts
// Pattern A: filter by owner in the query (app/api/documents/[id]/route.ts)
const { count } = await prisma.document.deleteMany({
  where: { id, userId: session.user.id },
});
if (count === 0) return NextResponse.json({ message: 'Document not found' }, { status: 404 });

// Pattern B: fetch, then compare (app/api/history/[id]/route.ts)
if (!result || result.userId !== userId) {
  return NextResponse.json({ message: "Quiz not found or unauthorized" }, { status: 404 })
}
```

Both return 404 rather than 403, so a caller cannot tell "exists but not yours" from "does not exist".

**Common failure mode.** Using `findUnique({ where: { id } })` and forgetting the owner comparison. Pattern A makes that mistake harder because the owner is part of the query.

## 4. Stateless JWT sessions and revocation

**The idea.** A *JWT session* stores the user's identity inside an encrypted cookie instead of a server-side session table. It is "stateless": the server does not need to look anything up to know who you are. The weakness is revocation. If a password changes, old cookies stay valid until they expire, unless the server checks something extra.

**Where QuizForge uses it.** `session: { strategy: "jwt" }` in [`lib/auth.ts`](../lib/auth.ts). QuizForge adds a *credential stamp*: a SHA-256 hash of the user's id, password hash, and Google subject, stored in the token at sign-in ([`lib/session-credentials.ts`](../lib/session-credentials.ts)).

**Example.** On every session read, the `jwt` callback recomputes the stamp from the database:

```ts
// lib/auth.ts, jwt callback
if (!token.sub || typeof token.credentialStamp !== 'string') throw new Error('Session revoked')
const current = await prisma.user.findUnique({
  where: { id: token.sub },
  select: { id: true, password: true, googleSubject: true },
})
if (!current || !matchesCredentialStamp(token.credentialStamp, current)) throw new Error('Session revoked')
```

Because bcrypt hashes include a random salt, any password change produces a new hash and therefore a new stamp. Every older cookie fails the next check.

**Common misunderstanding.** "JWT sessions never touch the database." Here they do, once per session read. That is the cost of being able to revoke. [08](08-AUTH-SECURITY-AND-RELIABILITY.md#sessions-and-revocation) discusses the trade-off.

## 5. Password hashing and reset tokens

**The idea.** Passwords are stored as slow, salted hashes (bcrypt) so a database leak does not reveal them. Reset links carry a random secret; the database stores only a fast hash (SHA-256) of it, so a leaked table cannot be used to reset accounts.

**Where QuizForge uses it.** [`app/api/register/route.ts`](../app/api/register/route.ts) (`bcrypt.hash(password, 10)`), [`app/api/auth/forgot-password/route.ts`](../app/api/auth/forgot-password/route.ts), [`app/api/auth/reset-password/route.ts`](../app/api/auth/reset-password/route.ts).

**Example.**

```ts
// app/api/auth/forgot-password/route.ts
const token = randomBytes(32).toString('hex');
const tokenHash = createHash('sha256').update(token).digest('hex');
await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });
await prisma.passwordResetToken.create({
  data: { userId: user.id, tokenHash, expiresAt: new Date(Date.now() + 60 * 60 * 1000) },
});
```

**Common failure mode.** Leaking whether an email is registered. The forgot-password route always returns the same message, even on errors (`genericOkResponse`). Registration, however, does reply "User with this email already exists", so account existence can still be learned there. See [08](08-AUTH-SECURITY-AND-RELIABILITY.md#password-and-account-lifecycle).

## 6. Database models, relations, and JSON columns

**The idea.** A relational database stores *rows* in *tables* linked by *foreign keys*. An ORM such as Prisma lets you describe tables as *models* and query them with typed JavaScript. `onDelete: Cascade` deletes child rows with their parent; `onDelete: SetNull` keeps the child and clears the link.

**Where QuizForge uses it.** [`prisma/schema.prisma`](../prisma/schema.prisma). Every model belongs to a `User` with `onDelete: Cascade`, except `QuizResult.document`, which uses `SetNull` so deleting a document keeps its quiz results.

**Example.** Several `QuizResult` fields are JSON stored as plain strings:

```prisma
model QuizResult {
  questions        String   // JSON string array of Question
  userAnswers      String   // JSON string array of user answers
  topicPerformance String   // JSON string of topic performance
  // ...
}
```

[`deserializeQuizResult`](../lib/quiz-utils.ts) turns them back into objects with `JSON.parse`.

**Common failure mode.** Treating JSON strings as queryable. The database cannot filter by topic or answer inside `questions`, which is why Cram Mode and dashboard analytics load rows and aggregate in JavaScript. A malformed string would also make `JSON.parse` throw and the request return 500. Full schema: [06. Data and API](06-DATA-AND-API.md).

## 7. Upload validation and text extraction

**The idea.** A file's name and declared MIME type are claims made by the client. A *file signature* ("magic bytes") is the first few bytes of the content, which reveal the real format. A DOCX file is a ZIP archive; a malicious ZIP can expand to gigabytes (a "zip bomb").

**Where QuizForge uses it.** [`lib/file-validation.ts`](../lib/file-validation.ts) and [`lib/document-parser.ts`](../lib/document-parser.ts).

**Example.** Three independent checks must agree:

```ts
// lib/file-validation.ts
const hasValidExtension = allowedExtensions.some(ext => fileName.endsWith(ext));
const hasValidType = allowedTypes.includes(file.type);
// validateFileSignature: PDF must start with "%PDF-", DOCX with a ZIP header "PK.."
```

Before decompressing a DOCX, `assertSafeDocxArchive` reads the ZIP central directory and rejects archives with more than 5,000 entries, more than 25 MB expanded, a compression ratio above 100, or no `word/document.xml`.

**Common misunderstanding.** "Validation means the text is good." Validation only means the file is the format it claims and within budget. A scanned PDF with no text layer passes and produces little or no text. Details: [07](07-AI-GENERATION.md#1-inputs-and-limits).

## 8. Prompting for structured output

**The idea.** A large language model (LLM) returns text. To use its output as data, you ask for a strict format (here, a JSON array) and describe every field. The model usually complies, but not always, so the output must be validated.

**Where QuizForge uses it.** `generateQuestions`, `generateQuestionsSimple`, and `explainAnswer` in [`lib/gemini.ts`](../lib/gemini.ts).

**Example.** The prompt ends with explicit rules:

```text
IMPORTANT:
- Return ONLY valid JSON array, no markdown formatting
- Ensure all questions are answerable from the provided material
- Do not create questions about information not in the material
- Ensure correctAnswer is one of: "a", "b", "c", or "d"
```

**Common misunderstanding.** "The prompt says *answerable from the material*, so questions are grounded." A prompt is a request, not a guarantee. Nothing in the code checks that a question or its marked answer is supported by the text. See [07](07-AI-GENERATION.md#grounding-correctness-and-answerability).

## 9. Validating untrusted data

**The idea.** Anything from outside your code (model output, request bodies, browser storage) is *untrusted*. Validate shape, types, and sizes before use, and build fresh objects containing only known fields.

**Where QuizForge uses it.** `sanitizeQuestions` in [`lib/gemini.ts`](../lib/gemini.ts) for model output; `parseQuestion`, `validateQuizConfig`, `validateQuizContent`, and `validateQuizSubmission` in [`lib/quiz-submission.ts`](../lib/quiz-submission.ts) for requests; `parseAttemptDraft` in [`lib/attempt-recovery.ts`](../lib/attempt-recovery.ts) for `sessionStorage`.

**Example.** Validators return a *discriminated union* so callers must handle failure:

```ts
// lib/quiz-submission.ts
type ConfigValidationResult =
  | { ok: true; value: QuizConfig }
  | { ok: false; error: string };
```

`parseQuestion` copies only the nine known fields and enforces limits (question 5,000 characters, option 2,000, explanation 10,000, topic 200).

**Common failure mode.** Validating and then using the original object. QuizForge's validators return a new canonical object (`value`), and callers use that. For example, `validateQuizConfig` drops `mode: 'practice'` and keeps only `mode: 'exam'`, so practice and default configs produce the same proof.

## 10. Browser state with Zustand

**The idea.** A *store* is a single object holding shared UI state, with functions ("actions") that update it. Components subscribe and re-render on changes. Zustand stores can also be read and updated outside React with `getState()`, `setState()`, and `subscribe()`.

**Where QuizForge uses it.** [`store/quiz-store.ts`](../store/quiz-store.ts) holds the current document text, the active `QuizSession`, the save status, and the latest result. Non-React modules such as [`lib/attempt-deadline.ts`](../lib/attempt-deadline.ts) use `useQuizStore.getState()` and `useQuizStore.subscribe()`.

**Example.** Actions refuse input when the attempt is not live:

```ts
// store/quiz-store.ts
submitAnswer: (answer: string, confidence: Confidence = null) => {
  const { session } = get();
  if (!session || session.pausedAt !== undefined || get().saveStatus !== 'idle' || get().getRemainingTime() === 0) return false;
```

**Common misunderstanding.** "The store survives a refresh." Zustand state lives in memory. QuizForge persists a draft separately (concept 16).

## 11. Wall-clock timers and deadlines

**The idea.** `setTimeout(fn, 1000)` does not guarantee a call after exactly one second. Browsers throttle timers in background tabs, and a sleeping laptop pauses them entirely. A countdown that subtracts one per tick drifts. A *wall-clock* countdown stores the deadline as a timestamp and recomputes `deadline - Date.now()` on every tick.

**Where QuizForge uses it.** [`lib/countdown.ts`](../lib/countdown.ts) (`attemptDeadline`, `remainingSeconds`, `subscribeCountdown`), [`lib/attempt-deadline.ts`](../lib/attempt-deadline.ts), [`components/Timer.tsx`](../components/Timer.tsx).

**Example.**

```ts
// lib/countdown.ts
export function remainingSeconds(deadline: number, now = Date.now()) {
  return Math.max(0, Math.ceil((deadline - now) / 1000));
}
```

`watchAttemptDeadline` also re-checks on `focus`, `pageshow`, and `visibilitychange`, so a tab woken from sleep submits promptly.

**Common failure mode.** Trusting the client clock for enforcement. The client timer is for user experience. The server enforces time through the proof's `expiresAt` and computes `timeTaken` from its own clock. A client whose clock is wrong sees a wrong countdown but cannot extend the server's limit.

## 12. Signed tokens (HMAC)

**The idea.** An HMAC is a keyed fingerprint. The server computes `HMAC(secret, message)` and gives the message plus fingerprint to the client. Later the client returns both; the server recomputes the fingerprint. If anything changed, it will not match, and the client cannot forge a new one without the secret. This lets the server verify data it handed out without storing it.

**Where QuizForge uses it.** [`lib/quiz-proof.ts`](../lib/quiz-proof.ts). The proof binds the user id, the exact question list (including the answer key), and the config to a random `attemptId`, `issuedAt`, and `expiresAt`.

**Example.**

```ts
// lib/quiz-proof.ts
const payload = Buffer.from(JSON.stringify(claims), 'utf8').toString('base64url');
return `${payload}.${signature(proofMessage(payload, userId, questions, config))}`;
```

Verification uses `timingSafeEqual` so the comparison time does not leak how many characters matched.

**Common misunderstanding.** "Signed means secret." An HMAC proves integrity, not confidentiality. In practice mode the browser can read the answer key; it just cannot change it without failing verification. That is why exam mode adds encryption (concept 13).

## 13. Authenticated encryption for exams

**The idea.** *Authenticated encryption* (here AES-256-GCM) hides data and detects tampering in one step. *Additional authenticated data* (AAD) is a value that is not encrypted but must match on decryption, which binds the ciphertext to a context.

**Where QuizForge uses it.** [`lib/exam-token.ts`](../lib/exam-token.ts). For exam mode, [`issueQuiz`](../lib/quiz-issuance.ts) sends the browser questions without `correctAnswer` or `explanation`, and seals the full quiz plus its proof into an `exam1.` token encrypted with a key derived from `NEXTAUTH_SECRET` (HKDF). The user id is the AAD.

**Example.**

```ts
// lib/exam-token.ts
const cipher = createCipheriv('aes-256-gcm', key(), nonce);
cipher.setAAD(Buffer.from(userId));
```

On save, `openExam(token, session.user.id)` returns `null` if the token was altered or belongs to another user.

**Common failure mode.** Rotating `NEXTAUTH_SECRET` without thinking. It changes the session key, the proof key, and the exam key at once, so all sessions end and every in-flight attempt fails verification.

## 14. Server-side scoring

**The idea.** Never trust a score the client computed. Recompute it from data the server can verify.

**Where QuizForge uses it.** `deriveQuizMetrics` in [`lib/quiz-utils.ts`](../lib/quiz-utils.ts), called by [`app/api/save-quiz/route.ts`](../app/api/save-quiz/route.ts).

**Example.**

```ts
// lib/quiz-utils.ts
export function deriveQuizMetrics(questions: Question[], userAnswers: (string | null)[]) {
  const score = calculateScore(questions, userAnswers);
  const accuracy = calculateAccuracy(score, questions.length);
  const topicPerformance = analyzeTopicPerformance(questions, userAnswers);
  const weakTopics = identifyWeakTopics(topicPerformance);
  // ...
```

Accuracy is rounded to a whole percent; topics under 60% are "weak".

**Common misunderstanding.** "Server scoring is enough." It is only meaningful because the questions and answer key are bound by the proof. Without the proof, a client could submit its own easy questions. [`tests/save-quiz-integrity.test.ts`](../tests/save-quiz-integrity.test.ts) covers both.

## 15. Idempotency and concurrent writes

**The idea.** An operation is *idempotent* if repeating it has the same effect as doing it once. Networks drop responses, so clients retry. A save endpoint must not create duplicates on retry. A *compare-and-set* write updates a row only if it still holds the value you read, which prevents one request from silently overwriting another.

**Where QuizForge uses it.**

- Save: the proof's random `attemptId` becomes the `QuizResult` primary key. A second save finds the existing row and returns it. Two simultaneous inserts collide on the key (Prisma error `P2002`) and the loser returns the winner's row.
- Password change: `updateMany({ where: { id, password: oldHash } })` inside a transaction.
- Password reset: the token is consumed with `deleteMany` inside the transaction; if it was already consumed, the transaction throws and rolls back the password write.

**Example.**

```ts
// app/api/account/password/route.ts
const result = await tx.user.updateMany({
  where: { id: user.id, password: user.password },
  data: { password: hashedPassword },
});
if (result.count !== 1) return false;
```

**Common failure mode.** Check-then-act. Reading "token exists" and later writing the password leaves a gap where another request can act in between. Both password routes re-check inside the write. [`tests/password-recovery-races.test.ts`](../tests/password-recovery-races.test.ts) models these races with a mock database.

## 16. Browser persistence and recovery

**The idea.** `sessionStorage` is a per-tab key-value store that survives refreshes but is cleared when the tab closes. `localStorage` survives across tabs and restarts. Both are under user control, so anything read back is untrusted.

**Where QuizForge uses it.** [`lib/attempt-recovery.ts`](../lib/attempt-recovery.ts) writes the active attempt to `sessionStorage` key `quizforge-attempt-v1` whenever the session, save status, or document id changes. [`hooks/useBannerDismissed.ts`](../hooks/useBannerDismissed.ts) stores a banner flag in `localStorage`.

**Example.** The draft is tied to an account and re-validated on load:

```ts
// lib/attempt-recovery.ts
if (!record(draft) || draft.version !== 1 || draft.ownerId !== ownerId || !record(draft.session)) throw new Error('Invalid draft');
```

For exams, `parseAttemptDraft` strips any stored `correctAnswer` and `explanation`.

**Common misunderstanding.** "Restored answers are trusted." They are not; the server still verifies the proof and grades. A user who edits the draft can change only their own answers, which they could do in the UI anyway.

## 17. Spaced repetition

**The idea.** Reviewing an item just before you would forget it is more efficient than cramming. Systems schedule each item on a ladder of growing intervals: correct answers move it up, wrong answers move it back.

**Where QuizForge uses it.** [`lib/review.ts`](../lib/review.ts): `REVIEW_INTERVALS_DAYS = [1, 3, 7, 21]`, `scheduleNext`, `dueDateForWrong`. Items are created in the save route and graded in [`app/api/review/answer/route.ts`](../app/api/review/answer/route.ts).

**Example.**

```ts
// lib/review.ts
if (correct && currentStage >= topStage) return { graduated: true, ... };
if (correct) { const nextStage = currentStage + 1; return { graduated: false, nextStage, nextDueAt: dueDateForStage(nextStage) }; }
return { graduated: false, nextStage: 0, nextDueAt: dueDateForWrong(confidence) };
```

A wrong answer marked "sure" returns in 12 hours; otherwise in 24.

**Common misunderstanding.** The code comment calls this "SM-2-lite", but there is no per-item ease factor as in the SM-2 algorithm. It is a fixed four-step ladder with reset on failure. Items are identified by a SHA-256 of the normalized question text (`questionHash`), so the same question from different quizzes shares one review item.

## 18. Keyset pagination and streaming aggregation

**The idea.** *Offset* pagination ("skip 40, take 20") shifts when rows are inserted. *Keyset* pagination asks for rows "after this one" using a stable sort key. *Streaming aggregation* processes rows in batches and keeps only running totals, so memory does not grow with history size.

**Where QuizForge uses it.** [`app/api/history/route.ts`](../app/api/history/route.ts) sorts by `(createdAt desc, id desc)` and pages with a cursor. The dashboard view reads batches of 100 and feeds them into `createHistoryAnalytics()` from [`lib/history-analytics.ts`](../lib/history-analytics.ts).

**Example.**

```ts
// app/api/history/route.ts
const before = (row: { createdAt: Date; id: string }) =>
  ({ OR: [{ createdAt: { lt: row.createdAt } }, { createdAt: row.createdAt, id: { lt: row.id } }] });
```

**Common failure mode.** Assuming the dashboard is cheap. It still reads every result for the user on each load, just without holding them all in memory at once.

## 19. Rate limiting

**The idea.** A rate limiter caps how often a key (user id or IP) may call an endpoint in a time window, protecting expensive or sensitive operations.

**Where QuizForge uses it.** `checkRateLimit(key, limit, windowMs)` in [`lib/rate-limit.ts`](../lib/rate-limit.ts), a fixed-window counter in a module-level `Map`. Limits per endpoint are listed in [06](06-DATA-AND-API.md#api-inventory).

**Example.**

```ts
// app/api/generate-questions/route.ts
const rl = checkRateLimit(`generate:${userId}`, 10, 10 * 60 * 1000);
```

**Common misunderstanding.** "Ten per ten minutes, globally." The map lives in one server process. Each serverless instance or restarted process starts empty, so the effective limit is per instance. The file's own comment says so.

## 20. Capability links for sharing

**The idea.** A *capability URL* grants access to whoever holds it, with no login. Its security rests on the token being unguessable and revocable.

**Where QuizForge uses it.** [`app/api/share/route.ts`](../app/api/share/route.ts) creates a `ShareLink` with `randomBytes(9).toString('base64url')` (72 random bits, 12 characters). [`app/api/share/[token]/route.ts`](../app/api/share/%5Btoken%5D/route.ts) serves questions without answers. Revocation sets `revoked: true`.

**Example.**

```ts
// app/api/share/[token]/route.ts
const questions = (JSON.parse(share.questions) as Question[]).map((q) => ({
  id: q.id, question: q.question, options: q.options, topic: q.topic,
}));
```

**Common misunderstanding.** "Stripping answers from GET keeps the quiz secret." The submit endpoint returns the full answer key after any submission, so the key is one request away. That is fine for a study challenge and weak for a competitive leaderboard. See [08](08-AUTH-SECURITY-AND-RELIABILITY.md#shared-content).

## 21. Lazy-loading heavy UI

**The idea.** Large libraries slow the first page load. *Dynamic import* loads a component only when it renders.

**Where QuizForge uses it.** [`app/dashboard/page.tsx`](../app/dashboard/page.tsx) and [`components/ResultsDashboard.tsx`](../components/ResultsDashboard.tsx) load Recharts components with `next/dynamic` and `ssr: false`.

**Example.**

```ts
// app/dashboard/page.tsx
const DashboardCharts = dynamic(() => import('@/components/charts/DashboardCharts'), { ssr: false, /* loading skeleton */ });
```

**Common failure mode.** Importing `recharts` directly in a page component, which pulls it back into the initial bundle.

## 22. Concepts that do not apply

Some documentation templates for other projects cover topics QuizForge does not use. For clarity:

| Topic | Status in QuizForge |
|---|---|
| Desktop event loops, foreground-window detection, process identification, idle detection | Not used. QuizForge is a web app. The closest equivalent is the browser event loop and its timer throttling (concept 11). |
| Background workers, job queues, scheduled jobs | Not used. All work happens inside request handlers. Smart Review items become "due" by comparing `dueAt` with the current time at read; nothing runs on a schedule. |
| Push notifications, OS notifications | Not used. |
| Server-sent events, WebSockets, streaming AI responses | Not used. Gemini calls are request/response. |
| Retrieval-augmented generation with embeddings | Not used. "Ask the AI" picks paragraphs by word overlap (`relevantExcerpt`), not vector search. |
| Database migrations | Not used. The schema is applied with `prisma db push`; there is no `prisma/migrations/` folder. |
| Docker, CI pipelines | Not present in the repository. |

---

[← 01. Overview](01-OVERVIEW.md) | [Index](README.md) | [Next: 03. Architecture →](03-ARCHITECTURE.md)
