# 08. Auth, Security, and Reliability

[← 07. AI Generation](07-AI-GENERATION.md) | [Index](README.md) | [Next: 09. Setup and Configuration →](09-SETUP-AND-CONFIGURATION.md)

**Purpose:** explain the protections QuizForge implements, how far the evidence for each goes, and where the gaps are.
**Prerequisites:** [02, concepts 3, 4, 5, 12, 13, 15](02-CONCEPTS.md#3-authentication-versus-authorization); [06. Data and API](06-DATA-AND-API.md#ownership-and-access-rules).

> **Scope.** This is a description of current mechanisms, not a security audit or certification. "Tested" means a Vitest suite in [`tests/`](../tests/) exercises the behavior with mocks. Nothing here was penetration-tested or checked against a deployed instance.

## Authentication and sessions

### Sign-in methods

| Method | Mechanism | Code |
|---|---|---|
| Email and password | NextAuth `CredentialsProvider`. `authorize` normalizes the email, finds the user case-insensitively, rejects users without a password, and compares with `bcrypt.compare`. | [`lib/auth.ts`](../lib/auth.ts) |
| Google | NextAuth `GoogleProvider`, enabled only when `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are both set. The `signIn` callback creates or updates the database user. | [`lib/auth.ts`](../lib/auth.ts) `signIn` |

**Google account linking rules** (`canUseGoogleIdentity` in [`lib/auth-security.ts`](../lib/auth-security.ts)). A Google sign-in is accepted only if Google reports `email_verified === true` and a `sub`, and one of these holds:

1. No user with that Google subject or email exists → a new user is created.
2. The existing user already has this exact `googleSubject`.
3. The existing user has neither a password nor a Google subject.

So a verified Google email is **never** silently attached to an existing password account. Also, if the user found by subject now has a different email than Google reports, sign-in is refused. Tested in [`tests/google-auth-callback.test.ts`](../tests/google-auth-callback.test.ts) and [`tests/auth-security.test.ts`](../tests/auth-security.test.ts).

### Sessions and revocation

- Strategy: `jwt`. NextAuth encrypts the token into a cookie using `NEXTAUTH_SECRET`. No adapter or session table is used.
- At sign-in, the `jwt` callback stores `sub` and `credentialStamp` = `sha256(JSON.stringify(['quizforge-session-v1', id, passwordHash, googleSubject]))` ([`lib/session-credentials.ts`](../lib/session-credentials.ts)).
- On **every** session read, the callback requires both fields, loads the user, and compares stamps with `timingSafeEqual`. Missing user, changed password hash, changed Google subject, or a database error → it throws, and NextAuth v4 returns no session (the code comment notes it also clears the cookie).
- Tokens from before the stamp existed are rejected, not upgraded.
- The public `session` callback copies only `token.sub` to `session.user.id`; the stamp is never exposed.
- Session lifetime: NextAuth's default; `authOptions` does not set `maxAge`.

Tested in [`tests/session-revocation.test.ts`](../tests/session-revocation.test.ts) (committed version): legitimate sessions survive profile edits; password writes, user deletion, and a Google-only account adding a password all revoke older cookies; a credentials check that started before a password recovery cannot produce a valid session; legacy and malformed tokens are rejected; database failure fails closed. The uncommitted working-tree version of that file adds route-level reset/change tests and renewal-race tests.

**Trade-off.** Revocation is immediate, at the cost of one database read per `getServerSession` call, and sessions fail closed during a database outage.

### Production secret check

`resolveAuthSecret` throws at module load if `NODE_ENV === 'production'` and `NEXTAUTH_SECRET` is missing. [`lib/quiz-proof.ts`](../lib/quiz-proof.ts) and [`lib/exam-token.ts`](../lib/exam-token.ts) also throw without it, in every environment.

## Authorization and ownership checks

| Resource | Check | Response when not owned |
|---|---|---|
| Documents | `where: { id, userId }` on find, update, delete | 404 |
| Quiz results | Fetch by id, compare `userId` | 404 |
| History cursor | `findFirst({ id: cursor, userId })` | 400 |
| Review items | `findFirst({ id: itemId, userId })` | 404 |
| Share create | `findFirst({ id: resultId, userId })` | 404 |
| Share revoke | `updateMany({ token, ownerId })` | 404 |
| Generation from a document | `findFirst({ id: documentId, userId })` | 404 |
| Save with a document | Proof's `documentId` re-checked against the user; if not found, saved with `null` | silently unlinked |
| Explain grounding | `findFirst({ id: documentId, userId })` | no grounding, still 200 |
| Account | Always `session.user.id`; no id in the URL | not applicable |

Missing session → 401 on every private handler. [`tests/history-authorization.test.ts`](../tests/history-authorization.test.ts) checks that history fails closed without a user id and scopes reads to the user.

## Password and account lifecycle

| Operation | Protections | Gaps |
|---|---|---|
| Register | Per-IP rate limit; email normalization and format; password ≥ 8 characters; bcrypt cost 10 | Replies "User with this email already exists", which reveals registration status. No email verification. No password strength rules beyond length. |
| Sign in | Generic "Invalid email or password" in the UI | NextAuth's credentials endpoint has no rate limit in this code |
| Change password | Session; per-user limit 5/15 min; current password required; compare-and-set write in a transaction; deletes reset tokens; client signs out | |
| Forgot password | Per-IP limit 3/15 min; identical response for unknown emails and for errors; one active token per user; 32 random bytes; only the SHA-256 stored; 1-hour expiry | In development without `RESEND_API_KEY`, the reset link (a live credential) is printed to the server console. Production refuses to log it ([`tests/email-security.test.ts`](../tests/email-security.test.ts)). |
| Reset password | Per-IP limit 5/15 min; token looked up by hash; expiry checked before and inside the transaction; consumed atomically; all of the user's tokens deleted | |
| Delete account | Session; typed `DELETE` confirmation; cascade delete | No re-authentication with the password. Data already sent to Gemini or Resend is not recalled. |

Race handling for change and reset is tested with a mock database in [`tests/password-recovery-races.test.ts`](../tests/password-recovery-races.test.ts): two consumers of one link, expiry during hashing, a change racing a reset, and transaction failure.

## Input and upload validation

| Input | Validation |
|---|---|
| Uploaded files | Size, extension, MIME, magic bytes; DOCX zip-bomb checks before decompression; PDF page cap; extracted-text cap ([07](07-AI-GENERATION.md#1-inputs-and-limits)) |
| Quiz config | Integers in range, known difficulty, `cram` boolean, `mode` practice/exam, not exam with cram |
| Quiz submissions | Questions re-parsed with field length limits; answers and confidences arrays sized to the quiz and restricted to allowed values; proof ≤ 600 characters |
| Model output | `sanitizeQuestions` then `parseQuestion` |
| Recovery drafts | `parseAttemptDraft`: ≤ 4,000,000 characters, owner, version, and every field |
| Names, titles, queries | Length checks (name 80, document title 120, share name 40, query 3 to 500) |
| Share submissions | Answer array length must match; non-`a`–`d` values treated as unanswered |

Uncovered: `/api/explain` accepts a client-supplied question object whose text fields have no length limits. Request body size limits are whatever the hosting platform imposes; the code sets none.

React escapes text by default, and no component in this snapshot uses `dangerouslySetInnerHTML` (source search). The reset email template interpolates `resetUrl` into HTML; that URL is built from `NEXTAUTH_URL` and a hex token, not user input.

## Secret handling

| Secret | Used for | Notes |
|---|---|---|
| `NEXTAUTH_SECRET` | Session cookie encryption, quiz proof HMAC, exam token key (HKDF) | Rotating it signs everyone out and invalidates every in-flight attempt |
| `DATABASE_URL` | Prisma | |
| `GEMINI_API_KEY` | Gemini SDK | Read on each call |
| `GOOGLE_CLIENT_SECRET` | OAuth | |
| `RESEND_API_KEY` | Email | |

All are read only in server modules. [`.gitignore`](../.gitignore) excludes `.env` and `.env*.local`. In development, `generate-questions` adds the error stack to its 500 response (`details`); production omits it. Other handlers log errors with `console.error`, which may include provider or database messages in server logs.

## Private-data isolation in the browser

- The recovery draft is keyed to `ownerId`. A draft for another user is discarded.
- On sign-out or account switch, [`AttemptRecovery`](../components/AttemptRecovery.tsx) resets the store and blocks rendering ("Restoring your session…") until the new owner is set.
- `saveQuiz` ignores a response that arrives after the attempt was replaced.
- Document text and results are never written to browser storage.

Tested in [`tests/attempt-recovery.test.ts`](../tests/attempt-recovery.test.ts) and [`tests/attempt-deadline.test.ts`](../tests/attempt-deadline.test.ts).

## Quiz integrity

| Threat | Mechanism | Evidence |
|---|---|---|
| Submit a forged score | Server recomputes everything | Tested: "recomputes all derived metrics instead of trusting forged client values" |
| Swap in easier questions or a different answer key | HMAC proof over user id, questions, and config | Tested in [`tests/quiz-proof.test.ts`](../tests/quiz-proof.test.ts) and the save suite |
| Replay another user's proof | User id is part of the HMAC message and the exam AAD | Tested |
| Read exam answers in the browser | Exam answer key and explanations sealed with AES-256-GCM | Tested in [`tests/exam-token.test.ts`](../tests/exam-token.test.ts) |
| Submit long after the time limit | `expiresAt` in the proof; exams allow 30 s, practice 15 min | Tested |
| Change answers after submission | Store freezes the session while saving or failed | Tested in [`tests/quiz-lifecycle.test.ts`](../tests/quiz-lifecycle.test.ts) |

Not covered: in **practice** mode the answer key is in the browser by design. A user can also submit answers on time with the help of outside resources; QuizForge is a study tool, not proctoring software.

## Shared content

- Tokens: 9 random bytes, base64url (72 bits). Unguessable for practical purposes, but anyone holding a link can play it.
- `GET` strips `correctAnswer` and `explanation`.
- `submit` returns the full answer key and explanations to any submitter. Combined with a rate limit of 10 per IP per 10 minutes and free-text names, a player can submit once to learn the answers and again for a perfect leaderboard score. The leaderboard is therefore informal.
- Names are not filtered; React renders them as text.
- Revocation hides the quiz (404) and keeps entries.
- Questions are a snapshot; the owner's later deletion of the source result does not revoke the link.

## Trust boundaries: uploads and AI output

- **Uploads** are parsed by `pdf-parse` and `mammoth` inside the request. These libraries process attacker-controlled bytes. The size, page, archive, and text budgets reduce resource abuse but do not make the parsers safe against unknown vulnerabilities. The `overrides` in [`package.json`](../package.json) pin patched transitive versions.
- **AI output** is treated as untrusted JSON and validated before use ([07](07-AI-GENERATION.md#6-parsing-and-normalization)). Content correctness is not validated.
- **Document text in prompts** can contain injected instructions; impact is limited to the uploader's own quiz or explanation.

## Duplicate requests, stale state, and concurrency

| Scenario | Handling | Evidence |
|---|---|---|
| Save response lost; client retries | Same `attemptId` → returns the stored result | Tested |
| Two saves at once | Primary-key conflict (`P2002`) → loser returns the winner | Tested |
| Document deleted during save | `P2003` → retry without document | Tested |
| Save after expiry | Returns an existing save; refuses to create | Tested |
| Double completion (button + deadline) | `saveStatus` gate; one request | Tested |
| Stale response after a new attempt | Ignored by identity check | Tested |
| Two password writers | Compare-and-set and atomic token consume | Tested (mock DB) |
| Rename/delete document concurrently | `updateMany`/`deleteMany` scoped by owner; last write wins | Source inspection |
| Review answer submitted twice quickly | Each request reads the current stage; two increments can occur | Source inspection; not guarded |
| Review enqueue near the 500 cap | Count then upserts, not atomic; can slightly exceed the cap under concurrency | Source inspection |
| Library trimming | Insert then delete beyond 20; concurrent uploads can briefly exceed 20 | Source inspection |

## Reliability behaviors

- **Timers** use the wall clock and catch up on focus or page show ([02, concept 11](02-CONCEPTS.md#11-wall-clock-timers-and-deadlines)).
- **Sleep or closed laptop:** the attempt is evaluated against the wall clock on wake. If the server expiry has passed, a never-saved attempt cannot be saved.
- **Client clock skew:** the client deadline is computed from the server's `startedAt` and the client's `Date.now()`. A skewed client clock shows a shifted countdown; the server still enforces its own expiry.
- **Network failures while saving:** 30-second abort; answers kept; explicit retry.
- **Storage blocked:** recovery disabled with a visible message; the attempt continues in memory.
- **Best-effort side effects:** library save, library trimming, and review enqueueing log and continue on failure.
- **Malformed stored JSON:** `JSON.parse` in history, review, and share routes is not wrapped per row (cram is the exception and skips bad rows). A corrupt row would make that request return 500.

## Known limitations

Found by source inspection while writing these guides. None was fixed as part of this documentation task.

1. **Smart Review exposes answers early.** `GET /api/review/due` returns each item's full question JSON, including `correctAnswer` and `explanation`, before the user answers. Grading is still server-side.
2. **Share leaderboard can be gamed** as described in [Shared content](#shared-content).
3. **Rate limits are per process** and keyed on the first `x-forwarded-for` value for public routes. Whether that header can be spoofed depends on the hosting proxy (unverified).
4. **Deleted results can be re-saved.** *Inference from reading* [`app/api/save-quiz/route.ts`](../app/api/save-quiz/route.ts): if a user deletes a result and re-posts the same unexpired proof, `findUnique` finds nothing and a new row with the same id is created. Not covered by a test.
5. **Explain accepts arbitrary question objects** with unbounded field lengths, allowing larger Gemini prompts than the UI would send (bounded by the per-user limit).
6. **Registration reveals whether an email is registered.**
7. **No email verification** for credentials accounts and no re-authentication before account deletion.
8. **No security headers** (such as Content-Security-Policy) are configured in [`next.config.js`](../next.config.js).
9. **No middleware**: page routes rely on client-side redirects; APIs enforce access.
10. **Expired reset tokens are not purged** until the next reset request or account deletion.
11. **README drift**: the root README's project tree and feature descriptions predate parts of the code. The Node version was corrected in this update; remaining differences are listed in [09](09-SETUP-AND-CONFIGURATION.md#readme-corrections).

## Proposed improvements

Not implemented. Each has a cost.

| Proposal | Benefit | Trade-off |
|---|---|---|
| Strip `correctAnswer`/`explanation` from `/api/review/due` (the answer route already returns them) | Closes limitation 1 | Small UI change on `/review` |
| Shared rate-limit store (for example Redis) and a trusted client-IP source | Consistent limits across instances | New infrastructure and cost |
| Record consumed attempt ids (or keep deleted results as tombstones) | Closes limitation 4 | Extra table or soft-delete logic |
| Validate `/api/explain` against a stored quiz or cap field lengths | Bounds prompt size | Needs the result id in the request |
| Generic registration response with email verification | Closes 6 and 7 | Requires an email flow for sign-up |
| Security headers in `next.config.js` | Defense in depth | CSP needs tuning for the external hero video and fonts |
| Prisma migrations instead of `db push` | Reviewed, repeatable schema changes | More process for each schema edit |

---

[← 07. AI Generation](07-AI-GENERATION.md) | [Index](README.md) | [Next: 09. Setup and Configuration →](09-SETUP-AND-CONFIGURATION.md)
