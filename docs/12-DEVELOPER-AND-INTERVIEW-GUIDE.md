# 12. Developer and Interview Guide

[← 11. Deployment and Operations](11-DEPLOYMENT-AND-OPERATIONS.md) | [Index](README.md)

**Purpose:** make safe changes without a walkthrough, and explain the project clearly in an interview.
**Prerequisites:** [03](03-ARCHITECTURE.md), [04](04-CODEBASE-GUIDE.md), and the flow you are touching in [05](05-CORE-WORKFLOWS.md).

---

## Part 1: Contributing

### Making a change

1. **Find the flow.** Locate it in [05](05-CORE-WORKFLOWS.md) and note every file it lists.
2. **Read the tests first.** The suites in [`tests/`](../tests/) describe the guarantees you must keep ([test inventory](10-TESTING-AND-TROUBLESHOOTING.md#test-inventory)).
3. **Check for existing helpers** before writing new ones: validation lives in [`lib/quiz-submission.ts`](../lib/quiz-submission.ts), scoring and formatting in [`lib/quiz-utils.ts`](../lib/quiz-utils.ts), limits in [`lib/constants.ts`](../lib/constants.ts), upload state in [`hooks/useFileUpload.ts`](../hooks/useFileUpload.ts).
4. **Change the smallest layer that owns the behavior** (see the table below).
5. **Add or update a test** next to the closest existing suite.
6. **Run the checks** below and walk the relevant [manual journey](10-TESTING-AND-TROUBLESHOOTING.md#manual-verification-journeys).
7. **Update these docs** if a contract, limit, or flow changed.

### Where to change common features

| Change | Primary file | Also check |
|---|---|---|
| Question count or time bounds | [`lib/constants.ts`](../lib/constants.ts) | `TIME_OPTIONS` in [`components/QuizConfig.tsx`](../components/QuizConfig.tsx); cram `timeLimit` in [`app/api/cram/route.ts`](../app/api/cram/route.ts) |
| Generation prompt | `generateQuestions` / `generateQuestionsSimple` in [`lib/gemini.ts`](../lib/gemini.ts) | [07](07-AI-GENERATION.md); keep the JSON shape matching `Question` |
| Default or fallback model | `getPreferredModel` / `generateWithFallbackModels` | `.env.example`, [09](09-SETUP-AND-CONFIGURATION.md) |
| What counts as a valid question | `parseQuestion` in [`lib/quiz-submission.ts`](../lib/quiz-submission.ts) | It is shared by generation, issuance, save, retake, cram, and recovery. Tightening it can make old results un-retakable (422). |
| Weak-topic threshold | `identifyWeakTopics` default (60) in [`lib/quiz-utils.ts`](../lib/quiz-utils.ts) | `WEAK_TOPIC_THRESHOLD` in cram, streak threshold in [`lib/history-analytics.ts`](../lib/history-analytics.ts) |
| Review intervals | `REVIEW_INTERVALS_DAYS` in [`lib/review.ts`](../lib/review.ts) | Review page copy; `nextInDays` in the answer route |
| Save grace or exam window | `SAVE_GRACE_MS` / `saveGrace` in [`lib/quiz-proof.ts`](../lib/quiz-proof.ts) | The 14-minute client hard deadline in `startQuiz` must stay below the server grace |
| Upload limits | [`lib/file-validation.ts`](../lib/file-validation.ts), `DOCUMENT_LIMITS` | `maxSize` in [`components/FileUpload.tsx`](../components/FileUpload.tsx); error substrings in `analyze-document`; host body limits ([11](11-DEPLOYMENT-AND-OPERATIONS.md#upload-size-on-vercel)) |
| Dashboard statistics | [`lib/history-analytics.ts`](../lib/history-analytics.ts) | [`app/dashboard/page.tsx`](../app/dashboard/page.tsx), `HistoryAnalytics` type |
| New user preference | `User` in [`prisma/schema.prisma`](../prisma/schema.prisma) | `GET/PATCH` in [`app/api/account/route.ts`](../app/api/account/route.ts), [`app/settings/page.tsx`](../app/settings/page.tsx), `db push` |
| Reset email content | `passwordResetEmailHtml` in [`lib/email.ts`](../lib/email.ts) | |

### Adding or modifying an API handler

Follow the pattern every private handler uses:

```ts
// app/api/example/[id]/route.ts  (illustrative template, not an existing file)
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { checkRateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const rl = checkRateLimit(`example:${session.user.id}`, 10, 10 * 60 * 1000);
    if (!rl.success) return NextResponse.json({ message: 'Too many requests' }, { status: 429 });

    const { id } = await params;
    const body = await req.json();
    if (typeof body.title !== 'string' || body.title.trim().length === 0 || body.title.length > 120) {
      return NextResponse.json({ message: 'Invalid title' }, { status: 400 });
    }

    // Owner is part of the query, so another user's id simply matches nothing.
    const { count } = await prisma.document.updateMany({
      where: { id, userId: session.user.id },
      data: { title: body.title.trim() },
    });
    if (count === 0) return NextResponse.json({ message: 'Not found' }, { status: 404 });
    return NextResponse.json({ message: 'Updated' });
  } catch (error) {
    console.error('Example error:', error);
    return NextResponse.json({ message: 'Failed to update' }, { status: 500 });
  }
}
```

Checklist: session check first; rate limit if expensive or abusable; validate every field's type and size; scope by owner; return 404 for "not yours"; never trust client-computed values; add the route to [06](06-DATA-AND-API.md#api-inventory). If the handler issues a quiz, go through `issueQuiz` so validation, the proof, and exam sealing stay consistent.

### Changing a question-generation rule

1. Edit the prompt or `sanitizeQuestions` in [`lib/gemini.ts`](../lib/gemini.ts).
2. If the rule is about validity (for example, "options must be distinct"), prefer adding it to `parseQuestion` so it applies everywhere, and understand that saved results failing the new rule can no longer be retaken or crammed.
3. Test with a mocked SDK (the untracked `tests/gemini-response.test.ts` shows the pattern: `vi.mock('@google/generative-ai', ...)`). Never call the real API from tests.
4. If you commit the local benchmark, re-run `node scripts/benchmark-quiz-generation.mjs` to see request counts and pass/fail against the fixed oracle.

### Changing a UI flow

- Attempt state belongs in [`store/quiz-store.ts`](../store/quiz-store.ts). If you add a field to `QuizSession`, also update `parseAttemptDraft` in [`lib/attempt-recovery.ts`](../lib/attempt-recovery.ts), or restored drafts will be rejected or lose the field.
- Respect the guards: actions should no-op when paused, saving, or out of time.
- New entry points into a quiz should call `startQuiz` with the server's `startedAt`, then navigate to `/upload`.
- Long requests should use an `AbortController` and ignore late results, like `useHistory` and `useFileUpload`.

### Checks to run after changes

```powershell
npm run typecheck
npm test
npm run lint
git diff --check
git status --short           # confirm only intended files changed
```

For schema changes: `npx prisma db push` against a **development** database, then `npx prisma generate` if types look stale. For documentation changes, a quick link check from the repository root (reads files only):

```powershell
node -e "const fs=require('fs'),p=require('path');for(const f of fs.readdirSync('docs').filter(x=>x.endsWith('.md'))){const s=fs.readFileSync(p.join('docs',f),'utf8');for(const m of s.matchAll(/\]\(([^)#\s]+)(#[^)]*)?\)/g)){const t=m[1];if(/^https?:/.test(t))continue;const r=p.join('docs',decodeURIComponent(t));if(!fs.existsSync(r))console.log(f,'->',t)}}"
```

No output means every relative file link resolves.

### Common implementation pitfalls

| Pitfall | Why it bites |
|---|---|
| Minutes vs seconds | `QuizConfig.timeLimit` is minutes; `QuizSession.timeLimit` and `QuizResult.timeLimit` are seconds |
| Adding a field to the proof message | `proofMessage` defines what is signed. Changing it invalidates every in-flight attempt at deploy time. |
| Expecting `mode: 'practice'` in saved configs | `validateQuizConfig` drops it; only `'exam'` is kept |
| Changing error wording in the document parser | `analyze-document` picks 400 vs 500 by matching message substrings |
| Changing `questionHash` normalization | Existing review items will no longer de-duplicate against new misses |
| Forgetting exam mode | Exam questions have no `correctAnswer` in the browser; components must not assume it. `QuizQuestion` returns `null` without it. |
| Trusting the code comment about confidence | [`components/QuizInterface.tsx`](../components/QuizInterface.tsx) says confidence capture is "opt-in", but the schema default is `confidenceEnabled = true`, matching the README's "on by default". The comment is stale. |
| Editing the wrong copy | `app/**/.fuse_hidden*` and `docs/local/audit-2026-09-23/build-copy/` are stale copies; edit only the root folders |
| Using `npm install` when debugging version issues | It can drift from the lockfile; use `npm ci` |
| Querying JSON columns in SQL | They are strings; aggregate in JavaScript or change the schema |

---

## Part 2: Interview preparation

Everything below is grounded in the code. Do not add numbers about users, traffic, performance, or outcomes; the repository contains none. The only measured figures are from the local, mocked benchmark in [07](07-AI-GENERATION.md#local-benchmark-uncommitted), and they should be presented exactly as that: synthetic, mocked, and uncommitted.

### 30-second version

"QuizForge is a Next.js and TypeScript app that turns a PDF or DOCX into a timed multiple-choice quiz using Google Gemini. The interesting part is integrity and reliability: the server signs every quiz it issues with an HMAC so the browser can't swap questions or answers, encrypts the answer key for exam mode, grades on the server, and saves idempotently using the attempt id from the signed proof. On top of that it has spaced-repetition review, a cram mode built from past mistakes, and share links with server-side grading."

### Two-minute version

1. **Problem:** turning study material into practice tests is slow. QuizForge automates it and tracks weak topics.
2. **Stack:** Next.js 16 App Router for both pages and API routes, React 19, Zustand for the in-browser attempt, Prisma with PostgreSQL, NextAuth with credentials and Google, Gemini via the official SDK.
3. **Generation:** uploads are validated by extension, MIME, and magic bytes, with zip-bomb checks for DOCX. Up to 50,000 characters go into a prompt asking for a JSON array. The output is treated as untrusted: invalid entries are dropped, soft fields defaulted, and the request fails rather than returning fewer questions than asked. There are retries at three levels.
4. **Integrity:** instead of storing in-progress attempts, the server issues a signed proof binding user, questions, answer key, config, and an expiry. Exams additionally encrypt the content with AES-GCM using the user id as associated data. On save, the server verifies, recomputes the score, and uses the proof's attempt id as the primary key, so retries and races return the same result.
5. **Reliability in the browser:** wall-clock timers, a deadline watcher that submits from any page, and a per-tab, per-account recovery draft in `sessionStorage`.
6. **Sessions:** JWT sessions carry a hash of the user's credential state, checked on every request, so password changes revoke old sessions immediately.
7. **Testing:** 19 Vitest suites with mocked Prisma and providers, focused on the integrity, recovery, timing, and auth race conditions.

### Architecture walkthrough (whiteboard order)

1. Draw browser, Next.js server, PostgreSQL, Gemini, Resend, Google ([01 diagram](01-OVERVIEW.md#high-level-system-diagram)).
2. Follow one quiz: upload → `analyze-document` → `generate-questions` → `issueQuiz` → browser store → `save-quiz`.
3. Mark trust boundaries: uploads, model output, request bodies, browser storage ([03](03-ARCHITECTURE.md#trust-boundaries)).
4. Explain state ownership: the server holds nothing for an attempt until save; the browser carries a signed or sealed token ([03](03-ARCHITECTURE.md#state-ownership-and-persistence)).
5. Close with trade-offs ([03](03-ARCHITECTURE.md#observable-trade-offs)).

### Questions and answers

**Architecture**

1. **Why one Next.js app instead of a separate backend?**
   Observed: pages and API routes share types (`lib/types.ts`) and validators (`lib/quiz-submission.ts`), so the client and server cannot disagree on what a valid quiz is. The trade-off is that scaling the API independently of the UI is not possible, and long AI calls run inside request handlers with host time limits. The original motivation is not documented.

2. **Why isn't there an `Attempt` table?**
   The server signs the issued quiz and lets the browser carry it. That avoids a write per started quiz and any cleanup of abandoned attempts. Costs: attempts cannot move between devices, and a deleted result could be re-saved by replaying its unexpired proof, because nothing records that the attempt id was used. A tombstone table would close that.

3. **Where does attempt state live and why is the step not in the URL?**
   In the Zustand store. The upload page derives the step from store contents, so a stale `?step=quiz` link cannot show a quiz that does not exist, and an active attempt cannot be hidden by a URL change. `tests/upload-page.test.tsx` covers this.

**AI output validation**

4. **How do you handle a model that returns bad JSON?**
   Strip an enclosing Markdown fence, `JSON.parse`, then `sanitizeQuestions` drops entries missing required fields and defaults soft ones. A parse error triggers one retry with a simpler prompt; any failure triggers up to three route-level attempts. If fewer valid questions than requested remain, the request fails. Be ready to say what is not checked: whether the marked answer is right, and whether the question is grounded in the text.

5. **What was the fence-parsing bug, and how did you measure the fix?**
   Answer only with what the code and local report show: the committed retry path removed every fence marker globally, which could empty an option that legitimately contained one; the uncommitted parser removes only an enclosing fence. A mocked benchmark of 54 synthetic cases reports 30/30 answerable cases correct versus 18/30 before, and 36 versus 42 mocked requests. Stress that it is synthetic and mocked, and that the change is not yet committed.

6. **How do you stop prompt injection?**
   It is not prevented. Document text goes into the prompt verbatim. Output validation bounds the shape, and the impact is limited to the uploader's own quiz. A real mitigation would need content checks such as verifying cited quotes.

**Data modeling**

7. **Why store questions and answers as JSON strings?**
   A result is a snapshot of exactly what was graded and is always read whole. The cost is no SQL over topics or answers, so cram and analytics aggregate in JavaScript, and corrupt JSON would break a request.

8. **How do saves avoid duplicates?**
   `QuizResult.id` is the proof's random `attemptId`. A retry finds the existing row; a concurrent insert hits `P2002` and returns the winner. A deleted source document (`P2003`) is handled by retrying with `documentId = null`.

9. **What happens to results when a document is deleted?**
   `onDelete: SetNull` keeps them. Everything else cascades from `User`.

**Authentication**

10. **How do you revoke JWT sessions?**
    The token stores a SHA-256 of user id, bcrypt hash, and Google subject. The `jwt` callback recomputes it from the database on every session read and rejects mismatches. Any password write changes the salted hash. Cost: a database read per request and fail-closed behavior during outages.

11. **How is Google sign-in prevented from taking over an existing account?**
    `canUseGoogleIdentity` allows linking only to a new user, the same Google subject, or an account with neither a password nor a subject, and requires `email_verified`.

12. **How do password reset races work?**
    The token is looked up by hash, then consumed with a conditional `deleteMany` inside the same transaction that writes the password. If another request consumed it, the transaction throws and rolls back. Password change uses a compare-and-set `updateMany` on the old hash. Both are tested with a mock database.

**Failure handling**

13. **What if the network fails during save?**
    The store freezes answers, aborts after 30 seconds, shows a retry, and persists the state as `failed` in `sessionStorage` so a refresh does not lose it. Retrying is safe because saves are idempotent.

14. **How does the timer survive a background tab or sleep?**
    Deadlines are timestamps; every tick recomputes from `Date.now()`, and focus, page show, and visibility events trigger an immediate check. The server enforces its own expiry independently.

15. **What happens if the user closes the tab during an exam?**
    The attempt is lost from the browser (`sessionStorage` is per tab). Nothing submits. The server never saw it, so nothing is stored.

**Testing**

16. **What do your tests cover and not cover?**
    Integrity of saving, proofs and exam sealing, recovery, deadlines, session revocation, password races, upload validation, DOCX safety, and some UI rendering, all with mocks. Not covered: real database constraints, real Gemini output, PDF parsing, most CRUD routes, pages, and end-to-end flows ([10](10-TESTING-AND-TROUBLESHOOTING.md#coverage-gaps)).

17. **How do you test race conditions without a database?**
    By controlling promise resolution in mocks. [`tests/password-recovery-races.test.ts`](../tests/password-recovery-races.test.ts) uses a small `deferred()` helper to pause one mocked step (such as hashing) while another request runs, and its mock `updateMany`/`deleteMany` implement the same conditional `where` clauses as the real queries. That proves the handler logic; it does not prove PostgreSQL's isolation behavior.

**Trade-offs and improvements**

18. **What would you change first?**
    Defensible options, each with a cost: remove answers from the review-due payload; move rate limiting to a shared store; adopt Prisma migrations; record used attempt ids; add structured logging. See [08](08-AUTH-SECURITY-AND-RELIABILITY.md#proposed-improvements). Present these as proposals, not completed work.

19. **How would it scale?**
    Observable pressure points: a database read per authenticated request, dashboard analytics scanning all results, AI calls bounded by `maxDuration`, per-instance rate limits. No load testing has been done, so do not quote capacity numbers.

### Things not to claim

- User counts, traffic, latency, cost savings, or uptime.
- That questions are guaranteed correct or grounded.
- That security controls were audited or penetration-tested.
- That the uncommitted parser and benchmark are part of the shipped code, unless they have since been committed and deployed.
- Personal history or incidents that the repository does not record.

---

[← 11. Deployment and Operations](11-DEPLOYMENT-AND-OPERATIONS.md) | [Index](README.md)
