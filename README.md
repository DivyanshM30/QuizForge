# QuizForge - AI-Powered MCQ Generator

> Upload any study material and QuizForge instantly crafts AI-powered MCQs, tracks your performance, and turns revision into results.

**Live demo** → [QuizForge](https://quizforge.divyanshm.dev) &nbsp;|&nbsp; Built by [Divyansh Mishra](https://divyanshm.dev)

---

## 📚 Documentation

Detailed, code-verified guides live in [`docs/`](docs/README.md). Start with the [documentation index](docs/README.md), which offers reading paths for setup, architecture, contributing, troubleshooting, and interview preparation.

| Guide | Covers |
|---|---|
| [01 Overview](docs/01-OVERVIEW.md) | Problem, users, features, stack, guided tour |
| [02 Concepts](docs/02-CONCEPTS.md) | The ideas behind the code, taught with QuizForge examples |
| [03 Architecture](docs/03-ARCHITECTURE.md) | Layers, state ownership, trust boundaries, trade-offs |
| [04 Codebase Guide](docs/04-CODEBASE-GUIDE.md) | Where everything is and what it does |
| [05 Core Workflows](docs/05-CORE-WORKFLOWS.md) | Features traced end to end |
| [06 Data and API](docs/06-DATA-AND-API.md) | Schema, ownership rules, endpoint reference |
| [07 AI Generation](docs/07-AI-GENERATION.md) | Document-to-quiz pipeline and its limits |
| [08 Auth, Security, and Reliability](docs/08-AUTH-SECURITY-AND-RELIABILITY.md) | Sessions, integrity, recovery, known limitations |
| [09 Setup and Configuration](docs/09-SETUP-AND-CONFIGURATION.md) | Local setup and environment variables |
| [10 Testing and Troubleshooting](docs/10-TESTING-AND-TROUBLESHOOTING.md) | Tests, manual checks, fixes |
| [11 Deployment and Operations](docs/11-DEPLOYMENT-AND-OPERATIONS.md) | Production build, Vercel, schema rollout |
| [12 Developer and Interview Guide](docs/12-DEVELOPER-AND-INTERVIEW-GUIDE.md) | Making changes and explaining the project |

---

## ✨ Features

| | Feature | Description |
|---|---|---|
| 📄 | **Document Upload** | PDF and DOCX - drag-and-drop or browse from the hero |
| 🤖 | **Gemini AI Questions** | Google Gemini 2.5 Flash generates exam-quality MCQs with explanations |
| ⚙️ | **Configurable Quiz** | Choose difficulty (easy / medium / hard / mixed), question count (5–50), and time limit (5–120 min) |
| ⏱️ | **Timed Sessions** | Live countdown with warning states; time-up auto-submits the quiz |
| 🎓 | **Practice / Exam Modes** | Practice gives feedback after each question; Exam simulation withholds answers until the end and keeps the answer key server-side |
| ⏸️ | **Pause & Refresh Recovery** | Pause practice attempts; submitted answers survive a refresh inside the attempt window |
| 🛡️ | **Server-Graded Integrity** | Scores are computed server-side from a signed attempt token - the browser never decides correctness |
| 📊 | **Instant Analytics** | Topic-wise bar chart, accuracy score, weak areas, and revision suggestions |
| 📚 | **Full History** | Every attempt saved to PostgreSQL - revisit and delete any past result |
| 🔒 | **Auth** | Email/password auth via NextAuth.js + bcryptjs |
| 🎬 | **Cinematic UI** | Full-screen looping video hero, liquid-glass design system, dark cinematic aesthetic |
| ⚡ | **Hero Mini-Upload** | Drop a file right on the landing page - jumps straight to quiz config |
| 🧠 | **Smart Review** | Missed questions return on a spaced-repetition schedule (1 → 3 → 7 → 21 days) until mastered - on by default, manageable in Settings |
| 🎯 | **Confidence Calibration** | Rate answers Sure/Unsure; the dashboard surfaces "dangerous gaps" - questions you were confidently wrong about - and they resurface sooner in review |
| 📁 | **Document Library** | Uploads are saved (20 most recent) - generate new quizzes without re-uploading |
| 🔁 | **Retake Quiz** | Re-attempt any past quiz with shuffled questions and options |
| 🔑 | **Google Sign-In & Password Reset** | OAuth via Google plus a full email-based password recovery flow |
| ⚙️ | **Account Settings** | Profile, password change, study preferences, and account deletion |
| 🔦 | **Cram Mode** | One-click quiz built from your missed questions and topics under 60% accuracy |
| 💬 | **Ask the AI** | Follow-up explanations in the feedback modal, grounded in your own uploaded document |
| 🔗 | **Shareable Quizzes** | Public challenge links with a server-graded leaderboard - no account needed to play |

---

## 🖥️ Tech Stack

- **Next.js 16** (App Router) · **TypeScript** · **Tailwind CSS**
- **Google Gemini API** (gemini-2.5-flash) - AI question generation
- **NextAuth.js** - session management
- **Prisma ORM** + **PostgreSQL** (Neon / Supabase) - persistent storage
- **Zustand** - client-side state
- **Recharts** - performance charts
- **React Dropzone** - file upload UX
- **pdf-parse** + **mammoth** - PDF and DOCX text extraction
- **bcryptjs** - password hashing
- **Vitest** - unit and integration tests (141 tests across 21 files)

---

## 🚀 Getting Started

### Prerequisites

- Node.js 20.9+ (required by Next.js 16)
- Google Gemini API Key ([get one](https://makersuite.google.com/app/apikey))
- PostgreSQL database (e.g., [Neon](https://neon.tech) or [Supabase](https://supabase.com) - free tiers work)

### 1. Clone & Install

```bash
git clone https://github.com/DivyanshM30/QuizForge
cd QuizForge
npm install
```

### 2. Environment Variables

Create a `.env` file at the project root:

```env
DATABASE_URL="postgresql://username:password@host/database"

GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.5-flash

NEXTAUTH_SECRET=your_super_secret_key_here
NEXTAUTH_URL=http://localhost:3000

# Optional on localhost; required to deliver password-reset email to an inbox
RESEND_API_KEY=your_resend_api_key
EMAIL_FROM="QuizForge <onboarding@resend.dev>"
```

> **Tip**: Keep `NEXTAUTH_URL=http://localhost:3000` for local development. In production, set it to the canonical site URL: `https://quizforge.divyanshm.dev`.

When `RESEND_API_KEY` is unset during local development, password-reset links are printed to the Next.js server terminal instead of being emailed. For production, verify a sending domain in Resend and set `EMAIL_FROM` to an address on that domain; `onboarding@resend.dev` is intended only for testing.

### 3. Push Database Schema

```bash
npx prisma db push
```

### 4. Run Dev Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## 📖 Usage Flow

```
Landing page  →  Drop PDF in hero pill  →  Configure quiz  →  Take quiz  →  Results & analytics
                        ↕
               Or: Sign up → /upload for full flow
```

1. **Drop a file** on the hero pill (or click **Browse**) → file selected, name shown
2. Click **Generate ✨** → file is uploaded & analyzed, you're redirected to config
3. **Configure**: difficulty · question count · time limit → Start Quiz
4. **Quiz**: lettered options, instant feedback modal, live timer
5. **Results**: score, accuracy %, topic bar chart, weak areas, revision suggestions
6. **History**: all past attempts at `/history`, with per-quiz detail pages

---

## 🗂️ Project Structure

Abridged. The full, current map is in [docs/04-CODEBASE-GUIDE.md](docs/04-CODEBASE-GUIDE.md).

```
quizforge/
├── app/
│   ├── api/                        # 20 route handlers
│   │   ├── account/                # Profile read/update, account deletion
│   │   ├── account/password/       # Password change (revokes other sessions)
│   │   ├── analyze-document/       # Upload -> validate -> parse -> persist
│   │   ├── auth/[...nextauth]/     # NextAuth handler
│   │   ├── auth/forgot-password/   # Reset request (IP rate-limited)
│   │   ├── auth/reset-password/    # Reset completion
│   │   ├── cram/                   # Quiz from missed + weak-topic questions
│   │   ├── documents/              # Document library list
│   │   ├── documents/[id]/         # Single document
│   │   ├── explain/                # Grounded follow-up explanation
│   │   ├── generate-questions/     # Gemini -> MCQs, issues a signed attempt
│   │   ├── history/                # Attempt list
│   │   ├── history/[id]/           # Single attempt (GET / DELETE)
│   │   ├── register/               # Sign-up
│   │   ├── review/answer/          # Grade + reschedule one review item
│   │   ├── review/due/             # Due review queue
│   │   ├── save-quiz/              # Verify proof, grade server-side, persist
│   │   ├── share/                  # Create a challenge link
│   │   ├── share/[token]/          # Public payload (answers stripped) / revoke
│   │   └── share/[token]/submit/   # Anonymous submit -> leaderboard
│   ├── dashboard/page.tsx          # Analytics, calibration, dangerous gaps
│   ├── documents/page.tsx          # Document library
│   ├── forgot-password/page.tsx
│   ├── hero/page.tsx               # Standalone hero preview
│   ├── history/page.tsx            # Attempt list
│   ├── history/[id]/page.tsx       # Attempt detail
│   ├── login/page.tsx
│   ├── q/[token]/page.tsx          # Public challenge player
│   ├── register/page.tsx
│   ├── reset-password/page.tsx
│   ├── review/page.tsx             # Spaced-repetition session
│   ├── settings/page.tsx           # Profile, password, preferences, deletion
│   ├── upload/page.tsx             # Upload -> config -> quiz -> results
│   ├── globals.css                 # Design system (liquid-glass, dark-card)
│   ├── layout.tsx
│   └── page.tsx                    # Landing page
├── components/                     # 16 components
│   ├── charts/                     # DashboardCharts, ResultsTopicChart
│   ├── AppNav.tsx                  # Shared nav bar
│   ├── AttemptDeadline.tsx         # Deadline display
│   ├── AttemptRecovery.tsx         # Refresh-recovery handling
│   ├── ExamInterface.tsx           # Exam mode (no per-question feedback)
│   ├── FeedbackModal.tsx           # Explanation + "Ask the AI"
│   ├── FileUpload.tsx              # Full upload dropzone
│   ├── GoogleSignInButton.tsx
│   ├── HeroSection.tsx             # Video hero + mini-upload
│   ├── icons.tsx
│   ├── LandingSections.tsx
│   ├── LoadingSpinner.tsx
│   ├── QuizConfig.tsx              # Mode, difficulty, count, time limit
│   ├── QuizHistory.tsx
│   ├── QuizInterface.tsx           # Practice-mode question card
│   ├── ResultsDashboard.tsx
│   └── Timer.tsx
├── hooks/                          # useBannerDismissed, useFileUpload, useHistory
├── lib/                            # 21 modules
│   ├── attempt-deadline.ts         # Wall-clock deadline math
│   ├── attempt-recovery.ts         # Refresh recovery
│   ├── auth.ts                     # NextAuth config + callbacks
│   ├── auth-security.ts            # Email normalisation, Google identity guard
│   ├── constants.ts                # QUIZ_LIMITS shared by UI and server
│   ├── countdown.ts                # Timer subscription
│   ├── document-parser.ts          # PDF/DOCX extraction + zip-bomb guard
│   ├── email.ts                    # Resend password-reset delivery
│   ├── exam-token.ts               # AES-256-GCM seal for exam answer keys
│   ├── file-validation.ts          # Extension, MIME, magic-byte checks
│   ├── gemini.ts                   # Prompting, model fallback, sanitisation
│   ├── history-analytics.ts        # Cross-attempt analytics
│   ├── prisma.ts                   # Prisma client singleton
│   ├── quiz-issuance.ts            # Canonicalise -> sign -> seal
│   ├── quiz-proof.ts               # HMAC-signed attempt token
│   ├── quiz-submission.ts          # Config and submission validation
│   ├── quiz-utils.ts               # Scoring, topic analysis, shuffle
│   ├── rate-limit.ts               # Fixed-window limiter
│   ├── review.ts                   # 1/3/7/21-day scheduler
│   ├── session-credentials.ts      # Credential stamp (session revocation)
│   └── types.ts
├── store/
│   └── quiz-store.ts               # Zustand quiz session state
├── tests/                          # 21 Vitest files, 141 tests
├── benchmarks/
│   ├── quiz-generation/            # 54 fixed cases + PROTOCOL.md
│   └── gemini-live/                # Live validity + parse-latency harness
├── scripts/
│   └── benchmark-quiz-generation.mjs
├── patches/                        # patch-package (mammoth)
└── prisma/
    └── schema.prisma               # 7 models
```

---

## 🧪 Testing

```bash
npm test           # Vitest - 141 tests across 21 files
npm run typecheck  # tsc --noEmit
npm run lint       # ESLint
```

Coverage is **79.5% of lines in `lib/`** (the business logic) and 28.7% across the whole
codebase - most route handlers and page components are not yet covered directly.

| Suite | What it guards |
|---|---|
| `session-revocation` | Old cookies rejected after password reset and change |
| `save-quiz-integrity` | Proof verification, idempotent save, tampering rejected |
| `attempt-recovery`, `attempt-deadline` | Refresh recovery and wall-clock timers |
| `exam-token`, `quiz-proof` | AES-GCM sealing and HMAC proof verification |
| `gemini-response` | Model output sanitisation (drop vs repair) |
| `rate-limit`, `auth-security`, `file-validation` | Limiter, Google identity guard, upload validation |

The generation pipeline also has a pre-registered benchmark:

```bash
node scripts/benchmark-quiz-generation.mjs
```

It runs 54 fixed cases against both the baseline and the current parser, and refuses to compare
if the corpus, cases, lockfile or protocol hashes differ. Reports are written to
`docs/local/quiz-generation-metric/`.

---

## 🌍 Deployment (Vercel)

1. Push to GitHub
2. Import the repo at [vercel.com/new](https://vercel.com/new)
3. Add environment variables:

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `GEMINI_API_KEY` | ✅ | From Google AI Studio |
| `GEMINI_MODEL` | ❌ | Defaults to `gemini-2.5-flash` |
| `NEXTAUTH_SECRET` | ✅ | Any long random string |
| `NEXTAUTH_URL` | ✅ | Canonical production URL: `https://quizforge.divyanshm.dev` |
| `RESEND_API_KEY` | ✅ | Required for password-reset email delivery |
| `EMAIL_FROM` | ✅ | Resend-verified production sender (for example, `QuizForge <noreply@quizforge.divyanshm.dev>`) |

4. Apply schema changes to the production database with `npx prisma db push` using the production `DATABASE_URL`.
5. Configure `quizforge.divyanshm.dev` as the production custom domain for the Vercel project.
6. Deploy. Vercel auto-runs the dependency compatibility patches and `prisma generate` via the `postinstall` script.

---

## 🛠️ Troubleshooting

| Problem | Fix |
|---|---|
| **Database tables missing** | Run `npx prisma db push` |
| **Gemini quota errors** | Check API key quota at [ai.google.dev](https://ai.google.dev); reduce question count |
| **Video not playing** | Browser autoplay policies - the video is muted and `playsInline`, should work everywhere |
| **File parse fails** | Ensure file is ≤ 10 MB and in a supported format (PDF, DOCX) |
| **Auth not working** | Confirm `NEXTAUTH_SECRET` and `NEXTAUTH_URL` are set correctly |

---

## 📜 License

No license has been declared for this repository, so all rights are reserved by default. To let
others reuse it, add a `LICENSE` file and a matching `"license"` field in `package.json`.

---

<p align="center">
  Made with ☕ by <a href="https://divyanshm.dev">Divyansh Mishra</a> &nbsp;·&nbsp;
  <a href="https://linkedin.com/in/divyanshm30">LinkedIn</a> &nbsp;·&nbsp;
  <a href="https://github.com/DivyanshM30">GitHub</a>
</p>
