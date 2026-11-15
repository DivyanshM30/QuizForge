# 09. Setup and Configuration

[← 08. Auth, Security, and Reliability](08-AUTH-SECURITY-AND-RELIABILITY.md) | [Index](README.md) | [Next: 10. Testing and Troubleshooting →](10-TESTING-AND-TROUBLESHOOTING.md)

**Purpose:** get QuizForge running locally and understand every configuration value.
**Prerequisites:** basic command-line use. Commands are written for PowerShell on Windows; they work in PowerShell 7 on any OS.

> **What was executed.** While writing these guides, only read-only commands were run (`git status`, `git log`, `tsc --noEmit`, file inspection). The installation, database, and dev-server commands below are **for you to run**; they were not executed as part of this task. No migrations, schema pushes, emails, or AI requests were made.

## Prerequisites

| Tool | Version | Why | Check |
|---|---|---|---|
| Node.js | **20.9 or newer** (Next.js 16 declares `"node": ">=20.9.0"`; Vitest 4 declares `^20 \|\| ^22 \|\| >=24`) | Runtime | `node --version` |
| npm | Bundled with Node | The repository uses `package-lock.json` (lockfile v3), so use npm, not yarn or pnpm | `npm --version` |
| Git | Any recent | Clone and contribute | `git --version` |
| PostgreSQL | Any reachable instance (local, Neon, Supabase, …) | Database | Connection string works in a client |
| Gemini API key | From Google AI Studio | Question generation and Ask the AI | |
| Optional: Google OAuth client | Google Cloud console | "Continue with Google" | |
| Optional: Resend account | | Password-reset email delivery | |

Network access is needed during `npm ci`: packages download, and `postinstall` runs `prisma generate`, which may download Prisma engine binaries.

## Install

```powershell
git clone https://github.com/DivyanshM30/QuizForge.git
Set-Location QuizForge
node --version            # expect v20.9.0 or newer
npm ci                    # installs exactly what package-lock.json pins
```

`npm ci` triggers the `postinstall` script: `patch-package && prisma generate`. Expect a line saying the mammoth patch was applied and a line saying the Prisma Client was generated. `npm install` also works but may update the lockfile.

## Environment file

Next.js loads `.env` from the repository root. [`.gitignore`](../.gitignore) keeps it out of Git.

```powershell
Copy-Item .env.example .env
notepad .env
```

Generate a session secret with Node (already installed):

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### Environment variables

Every variable below is read by the code; names were checked against `process.env.*` usages and [`prisma/schema.prisma`](../prisma/schema.prisma).

| Variable | Required? | Purpose | Read in | Safe example |
|---|---|---|---|---|
| `DATABASE_URL` | **Yes** | PostgreSQL connection for Prisma | [`prisma/schema.prisma`](../prisma/schema.prisma) | `postgresql://quizforge:<password>@localhost:5432/quizforge` |
| `NEXTAUTH_SECRET` | **Yes** | Encrypts session cookies; signs quiz proofs; derives the exam encryption key. Missing in production → startup error. Missing anywhere → quiz issuance and saving throw. | [`lib/auth.ts`](../lib/auth.ts), [`lib/quiz-proof.ts`](../lib/quiz-proof.ts), [`lib/exam-token.ts`](../lib/exam-token.ts) | output of the command above |
| `NEXTAUTH_URL` | **Yes** for correct links | Canonical base URL: NextAuth callbacks, reset-email links, page metadata, `robots.txt`, `sitemap.xml`. Code falls back to `http://localhost:3000`. | [`app/api/auth/forgot-password/route.ts`](../app/api/auth/forgot-password/route.ts), [`app/layout.tsx`](../app/layout.tsx), [`app/robots.ts`](../app/robots.ts), [`app/sitemap.ts`](../app/sitemap.ts) | `http://localhost:3000` |
| `GEMINI_API_KEY` | **Yes** to generate or explain | Gemini SDK key | [`lib/gemini.ts`](../lib/gemini.ts) | `<your-gemini-key>` |
| `GEMINI_MODEL` | No | Preferred model; default `gemini-2.5-flash` | [`lib/gemini.ts`](../lib/gemini.ts) | `gemini-2.5-flash` |
| `GOOGLE_CLIENT_ID` | No (pair) | Enables Google sign-in when both are set | [`lib/auth.ts`](../lib/auth.ts) | `<id>.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | No (pair) | As above | [`lib/auth.ts`](../lib/auth.ts) | `<secret>` |
| `RESEND_API_KEY` | No locally; **yes in production** for password reset | Sends reset email. Unset in development → the email, including the link, is printed to the server terminal. Unset in production → sending throws (the API still answers generically). | [`lib/email.ts`](../lib/email.ts), forgot-password route | `<resend-key>` |
| `EMAIL_FROM` | No | Sender; default `QuizForge <onboarding@resend.dev>` (Resend's testing sender) | [`lib/email.ts`](../lib/email.ts) | `QuizForge <noreply@your-domain.example>` |
| `NODE_ENV` | Set by Next.js | `development` for `next dev`, `production` for `next build`/`next start`. Changes secret checks, email fallback, and error details. | several | do not set manually |

For Google sign-in, register the redirect URI `<NEXTAUTH_URL>/api/auth/callback/google` (as documented in [`.env.example`](../.env.example)).

## Database setup

The repository has no migrations folder. The schema is applied directly:

```powershell
npx prisma db push        # creates or updates tables to match prisma/schema.prisma
npx prisma studio         # optional: browse tables at http://localhost:5555
```

Use a **development database**, never production. `db push` changes the schema in place; if a change would drop data, Prisma asks for confirmation (`--accept-data-loss`). See [11](11-DEPLOYMENT-AND-OPERATIONS.md#database-and-schema-changes).

## Start the development server

```powershell
npm run dev               # next dev --webpack
```

Open `http://localhost:3000`.

| URL | What you should see |
|---|---|
| `http://localhost:3000/` | Landing page with the video hero and the file pill |
| `/register`, `/login` | Auth forms; a Google button only if both Google variables are set |
| `/upload` | Redirects to `/login` when signed out; otherwise the upload step |
| `/dashboard`, `/history`, `/documents`, `/review`, `/settings` | Signed-in pages |
| `/q/<token>` | Public shared quiz (needs a real token) |

## Confirm a successful setup

Run these in order. Each step needs only what the previous ones proved.

1. **Install sanity (no services):** `npm run typecheck` should exit 0, and `npm test` should pass without a database or API keys, because every suite mocks Prisma and the providers. (Typecheck was verified while writing these guides; the Vitest run was not. See [10](10-TESTING-AND-TROUBLESHOOTING.md#what-was-verified-for-these-guides).)
2. **App boots (no database needed yet):** `npm run dev`, open `/`. In DevTools → Network, `GET /api/auth/session` returns `200` with `{}`.
3. **Database works:** register at `/register` with a fictional account such as `learner@example.com`. In Network, `POST /api/register` returns `201`. Sign in; `GET /api/auth/session` now returns your user with an `id`.
4. **Upload works:** on `/upload`, drop a small text-based PDF. `POST /api/analyze-document` returns `200` with `text` and a `documentId`.
5. **Gemini works (uses your quota):** choose 5 questions and Start. `POST /api/generate-questions` returns `200` within about a minute, with `questions` and `quizProof`.
6. **Saving works:** finish the quiz. `POST /api/save-quiz` returns `201` and the results appear. `/history` lists the attempt.

More journeys: [10](10-TESTING-AND-TROUBLESHOOTING.md#manual-verification-journeys).

## Common setup failures

| Symptom | Likely cause | Remedy |
|---|---|---|
| `npm ci` fails on engine or syntax errors | Node older than 20.9 | Install a current Node LTS |
| `postinstall` fails at `patch-package` | mammoth version differs from the patch name | Use `npm ci` so the lockfile's mammoth 1.11.0 is installed |
| `postinstall` fails at `prisma generate` | No network to download engines | Retry with network; check proxy settings |
| `Environment variable not found: DATABASE_URL` | `.env` missing or in the wrong folder | Put `.env` in the repository root |
| `npx prisma db push` cannot connect | Wrong host, password, or SSL settings | Test the URL in a Postgres client; hosted providers often need `?sslmode=require` |
| Generation fails with "NEXTAUTH_SECRET is required to sign quiz attempts" | Secret unset | Set `NEXTAUTH_SECRET` and restart `npm run dev` |
| Google button missing | One or both Google variables empty | Set both and restart |
| Port 3000 busy | Another process | `npm run dev -- -p 3001` and set `NEXTAUTH_URL=http://localhost:3001` |

The full troubleshooting table is in [10](10-TESTING-AND-TROUBLESHOOTING.md#troubleshooting).

## README corrections

The root [`README.md`](../README.md) predates parts of the current code. Where they disagree, these guides follow the code. Status reflects this documentation update:

| README said | Code shows | Status |
|---|---|---|
| Node.js 18+ | Next.js 16 requires Node 20.9+ | Corrected in README |
| Project structure lists 7 API folders and no hooks/tests | 20 route files, `hooks/`, `tests/`, `types/`, `patches/`; see [04](04-CODEBASE-GUIDE.md) | README tree marked "abridged" with a link to 04 |
| Auth via email/password | Also Google OAuth, password reset, and credential-bound session revocation | Left as is; covered in [08](08-AUTH-SECURITY-AND-RELIABILITY.md) |
| `npm install` | Works; `npm ci` reproduces the lockfile exactly | Left as is |
| Environment section omits Google variables | `.env.example` includes `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` | Left as is; full table above |
| No test commands | `npm test`, `npm run typecheck`, `npm run lint` exist in [`package.json`](../package.json) | Left as is; see [10](10-TESTING-AND-TROUBLESHOOTING.md) |

This documentation update changed the README in three places only: a Documentation section linking here, the Node.js version, and the "abridged" note on the project tree. Other README content was left for the owner to revise.

---

[← 08. Auth, Security, and Reliability](08-AUTH-SECURITY-AND-RELIABILITY.md) | [Index](README.md) | [Next: 10. Testing and Troubleshooting →](10-TESTING-AND-TROUBLESHOOTING.md)
