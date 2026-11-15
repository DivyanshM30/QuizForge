# 10. Testing and Troubleshooting

[← 09. Setup and Configuration](09-SETUP-AND-CONFIGURATION.md) | [Index](README.md) | [Next: 11. Deployment and Operations →](11-DEPLOYMENT-AND-OPERATIONS.md)

**Purpose:** know what the automated checks prove, how to run them, how to verify the main journeys by hand, and how to diagnose problems.
**Prerequisites:** a working install from [09](09-SETUP-AND-CONFIGURATION.md).

## Checks available

| Check | Command | Needs |
|---|---|---|
| Unit and integration tests | `npm test` (runs `vitest run`) | Installed dependencies only |
| One suite | `npx vitest run tests/save-quiz-integrity.test.ts` | Same |
| Tests matching a name | `npx vitest run -t "expired"` | Same |
| Watch mode while editing | `npx vitest` | Same |
| Type checking | `npm run typecheck` (runs `tsc --noEmit`) | Same |
| Linting | `npm run lint` (runs `eslint .`) | Same |
| Production build | `npm run build` (runs `next build --webpack`) | Probably `NEXTAUTH_SECRET` (see note) |
| Whitespace in your diff | `git diff --check` | Git |

Note on `npm run build`: during a build `NODE_ENV` is `production`, and [`lib/auth.ts`](../lib/auth.ts) throws at import when `NEXTAUTH_SECRET` is missing. If Next.js imports the auth module while collecting route data, the build fails without the secret. *Inference from code; not executed.* Set the variable before building.

### Test prerequisites and mocks

- **No database, network, or API keys.** Suites replace `@/lib/prisma` with in-memory objects, mock `next-auth/next`'s `getServerSession`, and mock `@google/generative-ai` where needed. [`tests/session-revocation.test.ts`](../tests/session-revocation.test.ts) uses its own test secret.
- **Environment:** Node (`environment: 'node'` in [`vitest.config.mts`](../vitest.config.mts)). React component tests render to HTML strings with `renderToStaticMarkup`; there is no DOM or browser.
- **Native binaries:** Vitest 4 uses platform-specific bundler binaries installed by npm. Run tests on the same operating system that ran `npm ci`; copying `node_modules` between Windows and Linux breaks this.

## Test inventory

Nineteen tracked suites:

| Suite | What it verifies |
|---|---|
| [`attempt-deadline.test.ts`](../tests/attempt-deadline.test.ts) | Auto-submit fires once with no quiz page mounted; re-arms on pause/resume; enforces the hard deadline while paused; catches up on focus; ignores other accounts; cleans up listeners |
| [`attempt-recovery.test.ts`](../tests/attempt-recovery.test.ts) | Restoring answers, confidences, and position; pause survives refresh without extending limits; exams never pause and lose any stored key; interrupted saves restore as failed for explicit retry; account switches clear drafts; malformed drafts discarded; storage failures handled; stale subscriptions cannot write another account's draft |
| [`auth-security.test.ts`](../tests/auth-security.test.ts) | Email normalization; Google linking rules; production secret requirement |
| [`countdown.test.ts`](../tests/countdown.test.ts) | No early expiry in the last fraction of a second; catch-up after delayed ticks; cancellation; already-expired timers |
| [`document-parser.test.ts`](../tests/document-parser.test.ts) | Real DOCX extraction with the patched mammoth; zip-bomb and non-DOCX rejection via the central directory |
| [`email-security.test.ts`](../tests/email-security.test.ts) | Production never logs reset emails |
| [`exam-token.test.ts`](../tests/exam-token.test.ts) | Exams issue only public question fields; the sealed key is bound to the user; invalid mode combinations rejected |
| [`file-validation.test.ts`](../tests/file-validation.test.ts) | Extension, MIME, and signature must agree |
| [`google-auth-callback.test.ts`](../tests/google-auth-callback.test.ts) | Google email does not merge into a credentials account; linked accounts use the subject; unverified profiles rejected |
| [`history-authorization.test.ts`](../tests/history-authorization.test.ts) | History fails closed without a user id; queries scoped to the user; bounded pages and owned cursors; dashboard aggregates all batches |
| [`password-recovery-races.test.ts`](../tests/password-recovery-races.test.ts) | Change and reset under concurrency with a mock database: single consumer per link, expiry during hashing, no overwrite of a newer password, failure reporting |
| [`quiz-interface.test.tsx`](../tests/quiz-interface.test.tsx) | Exam UI shows no correctness; revisiting; remount state; pause hides questions; no pause in exams |
| [`quiz-issuance.test.ts`](../tests/quiz-issuance.test.ts) | Issued quizzes round-trip through submission and proof validation; oversized fields and short legacy quizzes rejected before signing |
| [`quiz-lifecycle.test.ts`](../tests/quiz-lifecycle.test.ts) | Store deadlines, late input rejection, freezing on save, single request on double completion, retry, stale responses, timeout, non-JSON errors |
| [`quiz-proof.test.ts`](../tests/quiz-proof.test.ts) | Proof accepts the issued set; rejects reordering, key substitution, content changes, another user, expiry |
| [`quiz-submission.test.ts`](../tests/quiz-submission.test.ts) | Config validation accepts supported integers |
| [`save-quiz-integrity.test.ts`](../tests/save-quiz-integrity.test.ts) | The save route end to end with mocks: exam grading from the sealed key, auth, recomputed metrics, mismatched arrays, changed keys, other users' proofs, invalid confidences, document binding and deletion races, lost responses, concurrent inserts, expiry rules |
| [`session-revocation.test.ts`](../tests/session-revocation.test.ts) | Credential-bound sessions: revocation after password writes and deletion, stale authorization snapshots, legacy tokens, malformed markers, database failure, Google-only accounts |
| [`upload-page.test.tsx`](../tests/upload-page.test.tsx) | Upload page step derivation for each entry point; saving and retry states |

Untracked at the time of writing: `tests/gemini-response.test.ts` (Gemini fence parsing for the uncommitted parser), plus local modifications to `tests/session-revocation.test.ts` that add route-level reset and change tests. See [07](07-AI-GENERATION.md#local-benchmark-uncommitted) for the benchmark, which is run separately with `node scripts/benchmark-quiz-generation.mjs`.

## Coverage gaps

No automated tests exist for:

- **Real integrations:** PostgreSQL queries and constraints, Gemini responses, Resend delivery, Google OAuth.
- **Committed Gemini parsing and prompts** (the committed tree has no Gemini test; the untracked one covers the uncommitted parser).
- **PDF parsing** (only DOCX is tested).
- **Routes:** `analyze-document`, `generate-questions`, `cram`, `review/*`, `explain`, `documents/*`, `share/*`, `account` (except password), `register`, and `history/[id]` POST/DELETE.
- **Pages:** dashboard, history, review, documents, settings, login, register, and the public share page.
- **Rate limiter** behavior.
- **End-to-end browser flows**, accessibility, and visual layout.
- **Performance**, such as dashboard analytics with large histories.

## What was verified for these guides

| Check | Result |
|---|---|
| `tsc --noEmit --incremental false` on the working tree (including uncommitted files), Node 22.23.2, Linux shell on the same folder | **Passed** (exit 0). `--incremental false` avoided writing `tsconfig.tsbuildinfo`. |
| `npm test` | **Not run.** `node_modules` was installed on Windows and contains only the Windows build of a native Vitest dependency, and installing packages was out of scope. |
| `npm run lint` | **Not completed.** ESLint exceeded a 170-second limit in the shell used; no result. |
| `npm run build`, `npm run dev` | **Not run** (would need secrets and would write `.next/`). |
| Links, anchors, symbols, and environment-variable names in these docs | Checked by script against the repository (see [12](12-DEVELOPER-AND-INTERVIEW-GUIDE.md#checks-to-run-after-changes) for how to repeat it). |
| Installed `next` version | `node_modules/next` is 16.3.2 while the lockfile pins 16.3.6. Run `npm ci` to realign. |

## Manual verification journeys

Exact steps with expected results. Open DevTools (F12) → **Network** (filter **Fetch/XHR**) and **Console** first.

### Locally reproducible: needs only the database

| # | Steps | Expected |
|---|---|---|
| M1 | Visit `/register`, create `learner@example.com` / `example-pass-1` | `POST /api/register` → 201; redirected to `/login` |
| M2 | Sign in | `GET /api/auth/session` → user with `id`; redirected to `/upload` |
| M3 | Visit `/history` while signed out (private window) | Redirect to `/login`; `GET /api/history` (if it fires) → 401 |
| M4 | On `/upload`, drop `notes.txt` renamed to `notes.pdf` | `POST /api/analyze-document` → 400 "The file contents do not match…" |
| M5 | Drop a small text-based PDF | 200 with `text`; configure step appears; `/documents` lists it |
| M6 | `/documents` → rename, then delete | `PATCH` → 200, `DELETE` → 200 |
| M7 | `/settings` → turn off Smart Review | `PATCH /api/account` → 200; dashboard review panel changes |
| M8 | `/forgot-password` with your email, `RESEND_API_KEY` unset, dev server | 200 with `delivery: "development-console"`; reset link printed in the **server terminal**; open it, set a new password; old tab's next API call → 401 |

### Needs a Gemini key (uses quota)

| # | Steps | Expected |
|---|---|---|
| G1 | Configure 5 questions, practice, 5 minutes, Start | `POST /api/generate-questions` → 200; first question shows |
| G2 | Answer, open "Ask the AI", ask "Why is this correct?" | `POST /api/explain` → 200 `{ explanation, grounded: true }` |
| G3 | Refresh mid-quiz | Same question index and answers restored; DevTools → Application → Session Storage shows `quizforge-attempt-v1` |
| G4 | Pause practice, wait, resume | Question timer resumes where it stopped; "Attempt expires in" kept counting |
| G5 | Finish | `POST /api/save-quiz` → 201; results with topic chart |
| G6 | DevTools → Network → right-click the save request → Copy as fetch; replay it in Console | 200 with the same `result.id` (idempotent) |
| G7 | Start an exam; inspect the generate response | No `correctAnswer` in questions; `quizProof` starts with `exam1.` |
| G8 | Exam: open `/dashboard` mid-exam and wait for time to run out | Banner on dashboard; save fires automatically at the deadline |
| G9 | Go offline (Network → Offline) and finish | "needs attention" state; go online, **Retry save** → 201 |
| G10 | History → a result → Retake | `POST /api/history/<id>` → 200; questions shuffled |
| G11 | After several quizzes with misses: Dashboard → Cram | `GET /api/cram?count=10` → 200, or 400 with guidance |
| G12 | `/review` (after a wrong answer is due; or temporarily inspect `dueAt` in Prisma Studio) | Answer → `POST /api/review/answer` → 200 with `nextInDays` |
| G13 | History detail → Share → open link in a private window → play | `GET /api/share/<token>` has no `correctAnswer`; submit → 200 with score and leaderboard |
| G14 | Owner revokes the link; reload the private window | 404 message |

### Needs other credentials or infrastructure

| Check | Needs |
|---|---|
| Google sign-in, linking rules | Google OAuth client with the localhost redirect URI |
| Reset email arrives in an inbox | Resend key and verified sender |
| Production behavior: secret check, email throw, `maxDuration`, upload size limits | A deployed build ([11](11-DEPLOYMENT-AND-OPERATIONS.md)) |

## Troubleshooting

| Symptom | Likely cause | Diagnostic check | Remedy |
|---|---|---|---|
| Every private API returns 401 right after sign-in | `jwt` callback throws: database unreachable, or user row changed | Server terminal shows Prisma errors; `GET /api/auth/session` returns `{}` | Fix `DATABASE_URL`; sign in again |
| Signed out after changing password in another tab | Intended: the stamp changed | | Sign in with the new password |
| Upload: "Invalid file type" for a real DOCX | Browser reported an empty or unusual MIME type | Network → request payload shows the file's type | Re-save from Word or Google Docs as `.docx` |
| Upload: "File contents do not match" | Renamed file | Open the file in its app | Export as real PDF/DOCX |
| Upload 400 "too much extracted text" or page limit | Over 2,000,000 characters or 500 pages | | Split the document |
| Quiz has few or odd questions from a PDF | Scanned PDF, little text | `wordCount` in the analyze response | Use a text-based PDF |
| Generation 500 "GEMINI_API_KEY is not set" | Key missing | `.env` | Add the key; restart dev server |
| Generation 500 mentioning 429/quota | Gemini quota | Google AI Studio usage page | Wait or raise quota; request fewer questions |
| "Generated only N valid questions" | Model output failed validation repeatedly | Server log `Error generating questions:` | Retry; reduce question count; try another `GEMINI_MODEL` |
| "Generation is taking too long" after ~2 min | Client 125 s abort | Server log may still show work | Retry later; fewer questions |
| 429 "Too many requests" | In-memory rate limit | Count recent calls | Wait the window, or restart the dev server (resets counters) |
| Save fails: "Quiz verification failed" | Proof does not match: secret changed, or questions/config altered | Was `NEXTAUTH_SECRET` changed since the quiz started? | Start a new quiz |
| Save fails: "attempt expired" | Past `expiresAt` (practice +15 min, exam +30 s) | Compare time since start | Start a new quiz |
| "This tab could not restore a saved attempt" | Draft invalid or from older code | Application → Session Storage | Start a new quiz; the draft was cleared |
| "Refresh recovery is unavailable" | `sessionStorage` blocked or full | Private mode or storage settings | Keep the tab open until saved |
| Smart Review empty | Disabled, or nothing due yet (first due 12 to 24 h after a miss) | `GET /api/review/due` → `enabled`, `totalCount` | Enable in Settings; wait |
| Cram 400 | Fewer than 5 candidates or no history | Response message | Take more quizzes |
| Reset email never arrives (production) | `RESEND_API_KEY` unset or sender unverified | Server log `Forgot-password error:` | Configure Resend and `EMAIL_FROM` |
| Reset link points to the wrong host | `NEXTAUTH_URL` wrong | Link in email | Fix `NEXTAUTH_URL` |
| Google button missing | Provider not configured | `GET /api/auth/providers` lacks `google` | Set both Google variables |
| Google sign-in refused for an existing email | Linking rule: account has a password | Server-side `signIn` returns false | Sign in with the password |
| `Cannot find module '@prisma/client'` or outdated types | Client not generated after schema change | | `npx prisma generate` |
| Tests fail to start with a native binding error | `node_modules` from another OS | Error names a platform package | Delete `node_modules`, run `npm ci` on this OS |
| Unexpected framework behavior | Installed versions differ from lockfile | `npm ls next` | `npm ci` |

---

[← 09. Setup and Configuration](09-SETUP-AND-CONFIGURATION.md) | [Index](README.md) | [Next: 11. Deployment and Operations →](11-DEPLOYMENT-AND-OPERATIONS.md)
