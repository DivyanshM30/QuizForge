# 11. Deployment and Operations

[← 10. Testing and Troubleshooting](10-TESTING-AND-TROUBLESHOOTING.md) | [Index](README.md) | [Next: 12. Developer and Interview Guide →](12-DEVELOPER-AND-INTERVIEW-GUIDE.md)

**Purpose:** describe how the repository is set up to be built and deployed, what production needs, and what remains undecided.
**Prerequisites:** [09. Setup](09-SETUP-AND-CONFIGURATION.md).

> **Evidence.** The repository contains no `vercel.json`, Dockerfile, CI workflow, or infrastructure code. The deployment approach below comes from the root [`README.md`](../README.md) ("Deployment (Vercel)") and from Vercel-specific route settings in the code. **No deployment was performed or inspected while writing these guides.** The README names a live site; its current state and configuration were not checked.

## Three different things called "QuizForge"

| Artifact | What it is | How to know which code it runs |
|---|---|---|
| Repository source | Files on a branch | `git log -1` |
| Local build | `.next/` produced by `npm run build`, served by `npm start` | Rebuild after every change; `.next/` is not updated automatically and is git-ignored |
| Deployed site | Whatever commit the host last built | The host's deployment page shows the commit; there is no version endpoint in the app |

`package.json` has a fixed `"version": "1.0.0"` and the repository has no Git tags, so neither identifies a release. *Proposal:* expose the commit SHA (for example in a footer or a `/api/version` route) if you need to confirm what is deployed.

## Build and runtime requirements

| Item | Value | Source |
|---|---|---|
| Build command | `npm run build` → `next build --webpack` | [`package.json`](../package.json) |
| Start command (self-hosting) | `npm start` → `next start` | [`package.json`](../package.json) |
| Install hook | `postinstall`: `patch-package && prisma generate` | [`package.json`](../package.json) |
| Node.js | ≥ 20.9 | Next.js 16 engines field |
| Server runtime | Node.js; `analyze-document`, `generate-questions`, and `explain` declare `runtime = 'nodejs'` | route files |
| Execution limits | `maxDuration`: 60 s (`analyze-document`, `explain`), 120 s (`generate-questions`) | route files; honored by hosts such as Vercel, subject to plan limits |
| Webpack config | Node built-ins disabled and `pdf-parse`/`mammoth` ignored in client bundles | [`next.config.js`](../next.config.js) |
| Persistent disk | Not needed. Uploaded files are parsed in memory; only text is stored, in PostgreSQL. | [`app/api/analyze-document/route.ts`](../app/api/analyze-document/route.ts) |
| Background jobs | None | |

## Deploying to Vercel (as described in the README)

1. Import the GitHub repository into Vercel.
2. Set production environment variables (table below).
3. Apply the schema to the production database (next section).
4. Set the custom domain and make `NEXTAUTH_URL` match it exactly.
5. Deploy. Vercel runs `npm install`, which triggers `postinstall`, then `npm run build`.

### Production environment variables

| Variable | Production requirement |
|---|---|
| `DATABASE_URL` | Required. Serverless platforms often need a pooled connection string from the database provider; the code does not configure pooling (decision for the operator). |
| `NEXTAUTH_SECRET` | Required; the server throws without it. Keep it stable: changing it signs everyone out and voids in-flight attempts. |
| `NEXTAUTH_URL` | Required. Used for NextAuth callbacks, reset links, canonical metadata, `robots.txt`, `sitemap.xml`. |
| `GEMINI_API_KEY` | Required for generation and explanations. |
| `GEMINI_MODEL` | Optional. |
| `RESEND_API_KEY`, `EMAIL_FROM` | Required for password reset. `EMAIL_FROM` must be on a domain verified in Resend; the default `onboarding@resend.dev` is for testing. |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Optional. Add `<NEXTAUTH_URL>/api/auth/callback/google` as an authorized redirect URI. |

### Upload size on Vercel

QuizForge accepts uploads up to 10 MB, but the file travels in the request body to a function. Vercel documents a request body limit for Functions ([Vercel Functions limits](https://vercel.com/docs/functions/limitations), [FUNCTION_PAYLOAD_TOO_LARGE](https://vercel.com/docs/errors/FUNCTION_PAYLOAD_TOO_LARGE)) that is lower than 10 MB (4.5 MB at the time of writing). If that applies to the deployment, files between that limit and 10 MB would fail with HTTP 413 before QuizForge's own validation runs, and the user would see a generic upload error. *Not verified against the live deployment.* Options if this matters: lower the in-app limit to match, or upload directly to object storage and parse from there (a design change).

## Database and schema changes

- There is no `prisma/migrations/` folder. Schema changes are applied with `npx prisma db push` against the target database, run from a developer machine with `DATABASE_URL` pointing at it.
- `db push` makes the database match the schema without recording history. Destructive changes (dropping a column, changing a type) can lose data; Prisma asks for `--accept-data-loss`.
- There is no automated schema step in the build. Deploying code that expects a new column before pushing the schema causes Prisma runtime errors.
- **Recommended order** for a change that adds fields: push the additive schema change first, then deploy code. For removals: deploy code that no longer uses the field, then push. *This is operational guidance, not something the repository automates.*
- *Proposal:* adopt `prisma migrate` for reviewed, repeatable changes. Trade-off: one more step for each schema edit, and an initial baseline migration of the existing schema.

Backups, retention, and point-in-time recovery depend on the database provider and are not configured in this repository.

## Authentication and base URL

- `NEXTAUTH_URL` must be the exact public origin, including `https://`.
- Google OAuth requires the callback URI above to be registered for each origin you use (production, preview, localhost).
- Preview deployments get different URLs; with a fixed `NEXTAUTH_URL`, sign-in and reset links on previews point at production. How to handle previews is undecided in the repository.

## Logs and diagnostics

| Source | What it records |
|---|---|
| `console.error` in route handlers | Prefixed messages such as `Save quiz error:`, `Error generating questions:`, `Review enqueue failed:`, `Document save failed:`, `Forgot-password error:` with the error object |
| `console.log` | Generation retries (`Attempt N failed, retrying...`, `Retrying with simplified prompt...`); in development without Resend, the full reset email |
| Next.js | Request and build output |

On Vercel these appear in the project's function logs. There is no structured logging, request id, metrics, tracing, alerting, or health-check endpoint. `GET /api/auth/session` is a cheap liveness probe for the app but not for the database (it only touches the database when a session cookie is present).

## Operational constraints

| Constraint | Evidence |
|---|---|
| Rate limits are per instance and reset on cold start | [`lib/rate-limit.ts`](../lib/rate-limit.ts) comment and code |
| Generation can take up to the 120 s `maxDuration`; the browser gives up at 125 s | Route and upload page |
| Gemini quotas and model availability are account-specific | [`lib/gemini.ts`](../lib/gemini.ts) fallback logic exists because names can be unavailable |
| Each authenticated request performs a user lookup for revocation | [`lib/auth.ts`](../lib/auth.ts) `jwt` callback |
| Dashboard reads all of a user's results on each load | [`app/api/history/route.ts`](../app/api/history/route.ts) |
| Stored text per document up to 2,000,000 characters; 20 documents per user | Parser and upload route |
| The landing page streams a video from an external CloudFront URL | [`components/HeroSection.tsx`](../components/HeroSection.tsx) |
| Fonts come from `next/font/google`, which downloads them at build time | [`app/layout.tsx`](../app/layout.tsx) |
| `robots.txt` disallows `/api/`, `/dashboard`, `/history` | [`app/robots.ts`](../app/robots.ts) |

## Updates, rollback, and removal

- **Update:** push to the branch Vercel deploys from (or redeploy). Push schema changes separately as described above.
- **Rollback:** redeploying an older build restores old code but not the old schema; `db push` has no down-migrations.
- **Removal:** delete the Vercel project and the database. Users can delete their own accounts from `/settings`, which cascades their rows.

## Decisions not yet made in the repository

- Which database plan, pooling, and backup policy production uses.
- Whether previews have their own database and `NEXTAUTH_URL`.
- CI: no workflow runs `npm test`, `typecheck`, or `lint` automatically.
- Monitoring and alerting.
- Upload size alignment with the host's body limit.

---

[← 10. Testing and Troubleshooting](10-TESTING-AND-TROUBLESHOOTING.md) | [Index](README.md) | [Next: 12. Developer and Interview Guide →](12-DEVELOPER-AND-INTERVIEW-GUIDE.md)
