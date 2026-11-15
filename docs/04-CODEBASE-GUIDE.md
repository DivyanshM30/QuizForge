# 04. Codebase Guide

[← 03. Architecture](03-ARCHITECTURE.md) | [Index](README.md) | [Next: 05. Core Workflows →](05-CORE-WORKFLOWS.md)

**Purpose:** help you find the right file quickly and know what it does, who calls it, and what can break.
**Prerequisites:** [03. Architecture](03-ARCHITECTURE.md) for the layer model.

Coverage is deliberately uneven. Central modules get detailed notes; repetitive UI files are grouped.

## Curated repository tree

Only handwritten, tracked files are shown. Generated output, dependencies, and local notes are listed separately [below](#what-to-ignore).

```text
mcq_generator/
├── app/                              Next.js App Router: pages and API
│   ├── layout.tsx                    Root HTML, fonts, metadata, <Providers>
│   ├── providers.tsx                 SessionProvider + AttemptRecovery
│   ├── page.tsx                      Landing page (HeroSection + LandingSections)
│   ├── globals.css                   Tailwind layers and the glass design classes
│   ├── icon.png, robots.ts, sitemap.ts
│   ├── upload/page.tsx               Main journey: upload → configure → quiz → results
│   ├── dashboard/page.tsx            Stats, charts, Smart Review entry, Cram Mode
│   ├── history/page.tsx              Paginated history list
│   ├── history/[id]/page.tsx         One result: details, retake, share
│   ├── review/page.tsx               Smart Review session
│   ├── documents/page.tsx            Document library
│   ├── settings/page.tsx             Profile, preferences, password, delete account
│   ├── q/[token]/page.tsx            Public shared quiz (no login)
│   ├── login/ register/ forgot-password/ reset-password/
│   ├── hero/page.tsx                 Legacy route: redirects to /
│   ├── */layout.tsx                  Per-route metadata only
│   └── api/                          JSON route handlers (see table below)
├── components/                       Client components
│   ├── QuizInterface.tsx             Practice flow (+ dispatch to ExamInterface)
│   ├── ExamInterface.tsx             Exam flow
│   ├── FeedbackModal.tsx             Explanation + "Ask the AI"
│   ├── QuizConfig.tsx                Mode, count, time, difficulty
│   ├── Timer.tsx                     Countdown display
│   ├── AttemptRecovery.tsx           Restores drafts per account
│   ├── AttemptDeadline.tsx           Banner + deadline watcher mount
│   ├── ResultsDashboard.tsx          Score, chart, weak topics, suggestions
│   ├── FileUpload.tsx                Dropzone used on /upload
│   ├── HeroSection.tsx, LandingSections.tsx, AppNav.tsx
│   ├── QuizHistory.tsx, GoogleSignInButton.tsx, LoadingSpinner.tsx, icons.tsx
│   └── charts/DashboardCharts.tsx, charts/ResultsTopicChart.tsx
├── hooks/
│   ├── useFileUpload.ts              Upload state machine shared by hero and dashboard
│   ├── useHistory.ts                 History pagination + dashboard analytics fetch
│   └── useBannerDismissed.ts         localStorage-backed banner flag
├── lib/                              Domain logic (server, shared, and client modules)
├── store/quiz-store.ts               Zustand attempt store
├── prisma/schema.prisma              Database schema
├── types/next-auth.d.ts              Session/JWT type augmentation
├── tests/                            Vitest suites (19 tracked files)
├── patches/mammoth+1.11.0.patch      Compatibility patch applied on install
├── package.json, package-lock.json   Scripts, dependencies, overrides
├── next.config.js                    Keeps parsers and Node built-ins out of client bundles
├── tsconfig.json, vitest.config.mts, eslint.config.mjs
├── tailwind.config.js, postcss.config.js, .gitattributes
└── .env.example                      Environment variable template
```

## API route handlers

| Path | File | Methods | Notes |
|---|---|---|---|
| `/api/auth/[...nextauth]` | [`route.ts`](../app/api/auth/%5B...nextauth%5D/route.ts) | GET, POST | Mounts `NextAuth(authOptions)`; three lines |
| `/api/register` | [`route.ts`](../app/api/register/route.ts) | POST | Creates a credentials user |
| `/api/auth/forgot-password` | [`route.ts`](../app/api/auth/forgot-password/route.ts) | POST | Issues a reset token and sends email |
| `/api/auth/reset-password` | [`route.ts`](../app/api/auth/reset-password/route.ts) | POST | Consumes a token and sets a password |
| `/api/account` | [`route.ts`](../app/api/account/route.ts) | GET, PATCH, DELETE | Profile, preferences, account deletion |
| `/api/account/password` | [`route.ts`](../app/api/account/password/route.ts) | POST | Change password |
| `/api/analyze-document` | [`route.ts`](../app/api/analyze-document/route.ts) | POST | Upload → text, saves to library |
| `/api/generate-questions` | [`route.ts`](../app/api/generate-questions/route.ts) | POST | Text → issued quiz |
| `/api/save-quiz` | [`route.ts`](../app/api/save-quiz/route.ts) | POST | Verify, grade, persist, enqueue review |
| `/api/history` | [`route.ts`](../app/api/history/route.ts) | GET | List or dashboard analytics |
| `/api/history/[id]` | [`route.ts`](../app/api/history/%5Bid%5D/route.ts) | GET, POST, DELETE | Detail, retake issuance, delete |
| `/api/cram` | [`route.ts`](../app/api/cram/route.ts) | GET | Issue a quiz from past mistakes |
| `/api/review/due` | [`route.ts`](../app/api/review/due/route.ts) | GET | Due review items and counts |
| `/api/review/answer` | [`route.ts`](../app/api/review/answer/route.ts) | POST | Grade and reschedule one item |
| `/api/explain` | [`route.ts`](../app/api/explain/route.ts) | POST | AI follow-up explanation |
| `/api/documents` | [`route.ts`](../app/api/documents/route.ts) | GET | Library list |
| `/api/documents/[id]` | [`route.ts`](../app/api/documents/%5Bid%5D/route.ts) | GET, PATCH, DELETE | Load text, rename, delete |
| `/api/share` | [`route.ts`](../app/api/share/route.ts) | POST | Create or reuse a share link |
| `/api/share/[token]` | [`route.ts`](../app/api/share/%5Btoken%5D/route.ts) | GET, DELETE | Public payload; owner revoke |
| `/api/share/[token]/submit` | [`route.ts`](../app/api/share/%5Btoken%5D/submit/route.ts) | POST | Anonymous grading and leaderboard entry |

Request and response contracts are in [06. Data and API](06-DATA-AND-API.md#api-inventory).

## Core modules in `lib/`

### [`lib/types.ts`](../lib/types.ts)
- **Purpose:** shared TypeScript shapes.
- **Exports:** `Question`, `QuizConfig`, `Confidence`, `AttemptQuestion`, `QuizSession`, `QuizResult`, `TopicPerformance`.
- **Callers:** nearly every module.
- **Notes:** `AttemptQuestion` makes `correctAnswer` and `explanation` optional because exam questions arrive without them. `QuizSession.timeLimit` is in **seconds** while `QuizConfig.timeLimit` is in **minutes**; mixing them up is an easy bug.

### [`lib/constants.ts`](../lib/constants.ts)
- **Exports:** `QUIZ_LIMITS` (`MIN_QUESTIONS: 5`, `MAX_QUESTIONS: 50`, `MIN_TIME: 5`, `MAX_TIME: 120`).
- **Callers:** [`components/QuizConfig.tsx`](../components/QuizConfig.tsx) and [`lib/quiz-submission.ts`](../lib/quiz-submission.ts). Change it here and both sides follow.

### [`lib/quiz-submission.ts`](../lib/quiz-submission.ts) (central)
- **Purpose:** the canonical definition of a valid quiz.
- **Exports:** `validateQuizConfig(input, actualQuestionCount?)`, `parseQuestion(value)`, `validateQuizContent(input)`, `validateQuizSubmission(input)`, type `ValidatedQuizSubmission`.
- **Callers:** `issueQuiz`, `save-quiz`, `history/[id]` POST, `cram`, `sanitizeQuestions` in `gemini.ts`, `parseAttemptDraft`.
- **Behavior:** returns `{ ok, value | error }`. `validateQuizConfig` rejects `mode: 'exam'` combined with `cram: true`, and emits `mode` only when it is `'exam'`. `validateQuizSubmission` requires `userAnswers` and optional `confidences` arrays of exactly the question count, and a `quizProof` string of at most 600 characters.
- **Edge case:** for exams, the save route merges the decrypted content over the request body before calling `validateQuizSubmission`, so `quizProof` there is the inner HMAC proof, not the `exam1.` token.

### [`lib/quiz-issuance.ts`](../lib/quiz-issuance.ts) (central)
- **Export:** `issueQuiz(userId, questions, config, documentId)`.
- **Callers:** `generate-questions`, `history/[id]` POST (retake), `cram`.
- **Behavior:** validates with `validateQuizContent`, records `startedAt = Date.now()`, creates the proof. For exams, rejects payloads over 1,500,000 bytes, strips `correctAnswer` and `explanation`, and replaces `quizProof` with `sealExam(...)`.

### [`lib/quiz-proof.ts`](../lib/quiz-proof.ts) (central)
- **Exports:** `createQuizProof`, `verifyQuizProof`, type `QuizProofClaims`.
- **Behavior:** format `<base64url claims>.<base64url HMAC-SHA256>`. Claims: `attemptId` (18 random bytes), `issuedAt`, `expiresAt`, `documentId`. Grace after the time limit: 15 minutes for practice, 30 seconds for exams (`saveGrace`). `verifyQuizProof(..., { allowExpired: true })` is used by the save route so an expired proof can still fetch an already-saved result.
- **Depends on:** `NEXTAUTH_SECRET`; throws if missing.

### [`lib/exam-token.ts`](../lib/exam-token.ts)
- **Exports:** `sealExam(content, userId)`, `openExam(token, userId)`.
- **Behavior:** `exam1.<nonce>.<tag>.<ciphertext>`, AES-256-GCM, key from HKDF-SHA256 over `NEXTAUTH_SECRET` with info `quizforge-exam-v1`, user id as AAD. `openExam` returns `null` on any format, size (over 2,100,000 characters), or authentication failure.

### [`lib/gemini.ts`](../lib/gemini.ts) (central)
- **Exports:** `generateQuestions(documentText, config)`, `relevantExcerpt(documentText, questionText)`, `explainAnswer(question, userAnswer, userQuery, context?)`.
- **Internal:** `getGenAI`, `getPreferredModel`, `generateWithFallbackModels`, `sanitizeQuestions`, `generateQuestionsSimple`, and, in the uncommitted working tree, `parseQuestionResponse`.
- **Callers:** `generate-questions`, `explain`.
- Full walkthrough: [07. AI Generation](07-AI-GENERATION.md).

### [`lib/document-parser.ts`](../lib/document-parser.ts)
- **Exports:** `DOCUMENT_LIMITS`, `ParsedDocument`, `assertSafeDocxArchive`, `parsePDF`, `parseDOCX`, `parseDocument(file)`.
- **Caller:** `analyze-document`.
- **Edge cases:** dispatch requires MIME type and extension to agree. Error messages are matched by substring in the route to choose 400 vs 500, so changing wording can change status codes.

### [`lib/file-validation.ts`](../lib/file-validation.ts)
- **Exports:** `validateFile(file)` (size, extension, MIME), `validateFileSignature(file)` (magic bytes).
- **Callers:** `analyze-document` (both), `useFileUpload` (only `validateFile`, as early feedback).

### [`lib/auth.ts`](../lib/auth.ts), [`lib/session-credentials.ts`](../lib/session-credentials.ts), [`lib/auth-security.ts`](../lib/auth-security.ts) (central)
- **Exports:** `authOptions`; `credentialStamp`, `matchesCredentialStamp`; `normalizeEmail`, `isValidEmail`, `canUseGoogleIdentity`, `resolveAuthSecret`.
- **Callers:** every protected route imports `authOptions`. Register and forgot-password use the email helpers.
- **Behavior:** see [08](08-AUTH-SECURITY-AND-RELIABILITY.md#authentication-and-sessions). Google is enabled only when both `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set.
- **Type augmentation:** [`types/next-auth.d.ts`](../types/next-auth.d.ts) adds `session.user.id` and the internal `credentialStamp` field.

### [`lib/quiz-utils.ts`](../lib/quiz-utils.ts)
- **Exports:** `calculateScore`, `calculateAccuracy`, `analyzeTopicPerformance`, `identifyWeakTopics` (threshold 60), `generateRevisionSuggestions`, `deriveQuizMetrics`, `shuffleQuestions`, `getErrorMessage`, `barColorForPct`, `accuracyTextClass`, `deserializeQuizResult`, `formatTime`, `formatTimeFromMinutes`, `createQuizResult`.
- **Notes:** `createQuizResult` and `formatTimeFromMinutes` are not referenced by any application or test file at this snapshot. The server builds results with `deriveQuizMetrics` instead. *Inference:* `createQuizResult` predates server-side scoring. `shuffleQuestions` uses Fisher-Yates with `Math.random` and remaps `correctAnswer` to follow its option.

### [`lib/review.ts`](../lib/review.ts)
- **Exports:** `REVIEW_INTERVALS_DAYS`, `REVIEW_QUEUE_CAP` (500), `questionHash`, `dueDateForStage`, `dueDateForWrong`, `scheduleNext`, type `Confidence`, `ScheduleResult`.
- **Callers:** `save-quiz` (enqueue), `review/answer` (schedule), `cram` (dedupe by hash).

### [`lib/history-analytics.ts`](../lib/history-analytics.ts)
- **Exports:** `createHistoryAnalytics()` with `add(row)` and `finish()`, types `HistorySummary`, `HistoryAnalytics`, `HistoryPageData`.
- **Behavior:** rows must arrive newest first. Streak counts consecutive newest results with accuracy ≥ 60. Keeps the latest 10 for the trend chart, the top 8 topics by volume, and the top 5 "confidently wrong" topics.

### [`lib/rate-limit.ts`](../lib/rate-limit.ts), [`lib/email.ts`](../lib/email.ts), [`lib/prisma.ts`](../lib/prisma.ts)
- `checkRateLimit(key, limit, windowMs)` returns `{ success, remaining }`.
- `sendEmail({ to, subject, html })` and `passwordResetEmailHtml(resetUrl)`. Without `RESEND_API_KEY`: logs in development, throws in production.
- `prisma`: singleton client.

### Browser-side modules in `lib/`
- [`lib/countdown.ts`](../lib/countdown.ts): `attemptDeadline(session)`, `remainingSeconds(deadline, now?)`, `subscribeCountdown(deadline, onTick, onExpire)`.
- [`lib/attempt-deadline.ts`](../lib/attempt-deadline.ts): `watchAttemptDeadline(ownerId, wakeTargets)`. Subscribes to the store and re-arms one countdown when the proof or deadline changes. Calls `saveQuiz()` only when `saveStatus === 'idle'`.
- [`lib/attempt-recovery.ts`](../lib/attempt-recovery.ts): `ATTEMPT_STORAGE_KEY`, `parseAttemptDraft(raw, ownerId)`, `connectAttemptRecovery(ownerId, storage)`. A restored `saving` status becomes `failed`, which requires an explicit retry rather than an automatic one.

## The store: [`store/quiz-store.ts`](../store/quiz-store.ts) (central)

| Field / action | Meaning |
|---|---|
| `ownerId` | User id the in-memory attempt belongs to; set by recovery |
| `documentText`, `documentId` | Current source; `setDocumentText` also clears any session and result |
| `session: QuizSession \| null` | The live attempt |
| `saveStatus` | `'idle' \| 'saving' \| 'failed' \| 'saved'` |
| `result` | Saved result returned by the server |
| `startQuiz(questions, config, quizProof, documentId?, startedAt?)` | Starts the attempt; `hardDeadline = startedAt + limit + (exam ? 0 : 14 min)` |
| `submitAnswer`, `nextQuestion`, `goToQuestion` (exam only) | Mutate answers and position while live |
| `pauseQuiz`, `resumeQuiz` (practice only) | Resume shifts `startTime` forward by the pause length; the hard deadline does not move |
| `saveQuiz(retry?)` | Posts to `/api/save-quiz` with a 30-second abort; sets `failed` with a message on error |
| `getRemainingTime()` | Seconds left: the smaller of the question timer and the hard deadline |
| `resetQuiz()` | Clears everything except `ownerId` and `recoveryError` |

**Note:** the 14-minute client hard deadline is one minute inside the server's 15-minute practice grace, which leaves time for the save request to arrive. *Inference* from the two constants; the code does not state it.

## Pages and components

| Area | Files | Main calls | Watch out for |
|---|---|---|---|
| Upload journey | [`app/upload/page.tsx`](../app/upload/page.tsx), [`FileUpload`](../components/FileUpload.tsx), [`QuizConfig`](../components/QuizConfig.tsx), [`QuizInterface`](../components/QuizInterface.tsx), [`ExamInterface`](../components/ExamInterface.tsx), [`FeedbackModal`](../components/FeedbackModal.tsx), [`Timer`](../components/Timer.tsx), [`ResultsDashboard`](../components/ResultsDashboard.tsx) | `/api/analyze-document`, `/api/generate-questions`, `/api/account`, `/api/explain`, `/api/save-quiz` | Generation aborts after 125 s client-side. `QuizInterface` keys `QuizQuestion` by proof and index to reset local state per question. |
| Landing | [`app/page.tsx`](../app/page.tsx), [`HeroSection`](../components/HeroSection.tsx), [`LandingSections`](../components/LandingSections.tsx) | `useFileUpload` with `requireAuth` | The hero video is loaded from an external CloudFront URL hard-coded in `HeroSection`. |
| Dashboard | [`app/dashboard/page.tsx`](../app/dashboard/page.tsx), [`charts/DashboardCharts`](../components/charts/DashboardCharts.tsx) | `/api/history?view=dashboard`, `/api/review/due`, `/api/cram`, `/api/account` PATCH | Largest page (about 590 lines). |
| History | [`app/history/page.tsx`](../app/history/page.tsx), [`QuizHistory`](../components/QuizHistory.tsx), [`app/history/[id]/page.tsx`](../app/history/%5Bid%5D/page.tsx) | `/api/history`, `/api/history/[id]`, `/api/share` | Detail page redirects to `/history` on any fetch error. |
| Review | [`app/review/page.tsx`](../app/review/page.tsx) | `/api/review/due`, `/api/review/answer`, `/api/account` | |
| Documents | [`app/documents/page.tsx`](../app/documents/page.tsx) | `/api/documents`, `/api/documents/[id]` | "New quiz" loads full text into the store. |
| Settings | [`app/settings/page.tsx`](../app/settings/page.tsx) | `/api/account`, `/api/account/password`, `signOut` | Signs out after a password change or deletion. |
| Auth pages | [`login`](../app/login/page.tsx), [`register`](../app/register/page.tsx), [`forgot-password`](../app/forgot-password/page.tsx), [`reset-password`](../app/reset-password/page.tsx), [`GoogleSignInButton`](../components/GoogleSignInButton.tsx) | `signIn`, `/api/register`, `/api/auth/*`, `getProviders` | Google button renders only if the provider is configured. |
| Public share | [`app/q/[token]/page.tsx`](../app/q/%5Btoken%5D/page.tsx) | `/api/share/[token]`, `/api/share/[token]/submit` | Works without a session. |
| Shell | [`AppNav`](../components/AppNav.tsx), [`AttemptRecovery`](../components/AttemptRecovery.tsx), [`AttemptDeadline`](../components/AttemptDeadline.tsx), [`LoadingSpinner`](../components/LoadingSpinner.tsx), [`icons`](../components/icons.tsx) | `signOut`, recovery and deadline wiring | Many nav links call `resetQuiz()` before navigating. |

## Hooks

- [`hooks/useFileUpload.ts`](../hooks/useFileUpload.ts): validation, drag-and-drop, the `/api/analyze-document` request, and the jump to `/upload?step=config`. Accepts `onBeforeUpload` (return `false` to abort) and `onComplete`. One request at a time (`requestRef`).
- [`hooks/useHistory.ts`](../hooks/useHistory.ts): fetches pages, de-duplicates by id on "load more", and stores dashboard analytics when present.
- [`hooks/useBannerDismissed.ts`](../hooks/useBannerDismissed.ts): `useSyncExternalStore` over `localStorage` and a custom event; falls back to an in-memory flag if storage throws.

## Tests

Nineteen tracked suites in [`tests/`](../tests/). Each is described in [10. Testing](10-TESTING-AND-TROUBLESHOOTING.md#test-inventory).

## Configuration files

| File | What it controls | Edit when |
|---|---|---|
| [`package.json`](../package.json) | Scripts (`dev`, `build`, `start`, `lint`, `typecheck`, `test`, `postinstall`), dependencies, security `overrides` | Adding a dependency or script |
| [`next.config.js`](../next.config.js) | Client-side webpack fallbacks for Node built-ins; ignores `pdf-parse` and `mammoth` in client bundles | A server-only package leaks into the browser bundle |
| [`tsconfig.json`](../tsconfig.json) | Strict TypeScript, `@/*` path alias to the repository root | Adding path aliases |
| [`vitest.config.mts`](../vitest.config.mts) | `@` alias, Node environment, `restoreMocks` | Adding a test environment |
| [`eslint.config.mjs`](../eslint.config.mjs) | Next core-web-vitals and TypeScript rules; some React 19 rules downgraded to warnings | Changing lint policy |
| [`tailwind.config.js`](../tailwind.config.js), [`postcss.config.js`](../postcss.config.js), [`app/globals.css`](../app/globals.css) | Styling | UI theming |
| [`prisma/schema.prisma`](../prisma/schema.prisma) | Database models | Changing data shape (then `prisma db push` and `prisma generate`) |
| [`patches/mammoth+1.11.0.patch`](../patches/mammoth+1.11.0.patch) | Changes mammoth's XML parser call to match the `@xmldom/xmldom` 0.9 API pinned in `overrides` | Upgrading mammoth or xmldom |
| [`.env.example`](../.env.example) | Variable names and comments | Adding a new environment variable |
| [`.gitattributes`](../.gitattributes) | `* text=auto eol=lf` | Rarely |

## What to ignore

| Path | What it is | Canonical? |
|---|---|---|
| `node_modules/`, `.next/` | Dependencies and build output | Generated |
| `next-env.d.ts`, `tsconfig.tsbuildinfo` | Generated by Next.js and TypeScript; git-ignored | Generated |
| `app/**/.fuse_hidden*` | Leftover filesystem artifacts with old page contents; git-ignored | **No.** Never edit these; the `page.tsx` beside them is canonical |
| `docs/local/audit-2026-09-23/build-copy/` | A local snapshot copy of the source taken for an audit; git-ignored | **No.** It is older than the working tree (for example, its `lib/auth.ts` differs). Edit only the root folders |
| `docs/local/`, `docs/CODE_AUDIT.md`, `docs/IMPROVEMENT_PLAN.md`, `audit.md`, `FEATURES_ROADMAP.md`, `QuizForge_Interview_Dossier.md`, `redesign_prompt.md`, `quizforge_redesign_prompt.md` | Local notes and prompts; git-ignored | Supporting notes only |
| `.claude/` | Local tool settings; git-ignored | Not application code |
| `.env` | Your local secrets; git-ignored | Never commit |

### Uncommitted work in the working tree (at the time of writing)

`git status` showed these changes that are **not** committed. They are named here without links because they may never be committed:

- `lib/gemini.ts` (modified): a shared response parser, `parseQuestionResponse`.
- `tests/gemini-response.test.ts` (new): tests for that parser.
- `tests/session-revocation.test.ts` (modified): additional route-level revocation tests.
- `benchmarks/quiz-generation/` and `scripts/benchmark-quiz-generation.mjs` (new): a mocked benchmark. See [07](07-AI-GENERATION.md#local-benchmark-uncommitted).

---

[← 03. Architecture](03-ARCHITECTURE.md) | [Index](README.md) | [Next: 05. Core Workflows →](05-CORE-WORKFLOWS.md)
