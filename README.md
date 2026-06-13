# QuizForge — AI-Powered MCQ Generator

> Upload any study material and QuizForge instantly crafts AI-powered MCQs, tracks your performance, and turns revision into results.

**Live demo** → [quizforge.vercel.app](https://quizforge.vercel.app) &nbsp;|&nbsp; Built by [Divyansh Mishra](https://divyanshm.dev)

---

## ✨ Features

| | Feature | Description |
|---|---|---|
| 📄 | **Universal Upload** | PDF, DOCX, PPT, PPTX — drag-and-drop or browse from the hero |
| 🤖 | **Gemini AI Questions** | Google Gemini 2.5 Flash generates exam-quality MCQs with explanations |
| ⚙️ | **Configurable Quiz** | Choose difficulty (easy / medium / hard / mixed), question count (5–50), and time limit (5–120 min) |
| ⏱️ | **Timed Sessions** | Live countdown with warning states; time-up auto-submits the quiz |
| 📊 | **Instant Analytics** | Topic-wise bar chart, accuracy score, weak areas, and revision suggestions |
| 📚 | **Full History** | Every attempt saved to PostgreSQL — revisit and delete any past result |
| 🔒 | **Auth** | Email/password auth via NextAuth.js + bcryptjs |
| 🎬 | **Cinematic UI** | Full-screen looping video hero, liquid-glass design system, dark cinematic aesthetic |
| ⚡ | **Hero Mini-Upload** | Drop a file right on the landing page — jumps straight to quiz config |

---

## 🖥️ Tech Stack

- **Next.js 14** (App Router) · **TypeScript** · **Tailwind CSS**
- **Google Gemini API** (gemini-2.5-flash) — AI question generation
- **NextAuth.js** — session management
- **Prisma ORM** + **PostgreSQL** (Neon / Supabase) — persistent storage
- **Zustand** — client-side state
- **Recharts** — performance charts
- **React Dropzone** — file upload UX
- **bcryptjs** — password hashing

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- Google Gemini API Key ([get one](https://makersuite.google.com/app/apikey))
- PostgreSQL database (e.g., [Neon](https://neon.tech) or [Supabase](https://supabase.com) — free tiers work)

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
```

> **Tip**: For Vercel deployments, set `NEXTAUTH_URL` to your production URL (e.g. `https://quizforge.vercel.app`).

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

```
quizforge/
├── app/
│   ├── api/
│   │   ├── analyze-document/     # Parses uploaded file → plain text
│   │   ├── auth/[...nextauth]/   # NextAuth API routes
│   │   ├── generate-questions/   # Gemini AI → MCQ generation
│   │   ├── history/              # GET list of past quizzes
│   │   ├── history/[id]/         # GET / DELETE single quiz result
│   │   ├── register/             # User registration
│   │   └── save-quiz/            # Persist quiz result to DB
│   ├── history/
│   │   ├── page.tsx              # History list page
│   │   └── [id]/page.tsx         # Quiz detail page
│   ├── login/page.tsx
│   ├── register/page.tsx
│   ├── upload/page.tsx           # Multi-step: upload → config → quiz → results
│   ├── globals.css               # Design system (liquid-glass, dark-card, etc.)
│   ├── layout.tsx
│   └── page.tsx                  # Landing page (HeroSection + LandingSections)
├── components/
│   ├── HeroSection.tsx           # Full-screen video hero with mini-upload
│   ├── LandingSections.tsx       # Features / How It Works / About / Footer
│   ├── AppNav.tsx                # Shared dark-glass nav bar
│   ├── FileUpload.tsx            # Full upload dropzone (used inside /upload)
│   ├── QuizConfig.tsx            # Difficulty / question count / time config
│   ├── QuizInterface.tsx         # Question card with options & progress
│   ├── FeedbackModal.tsx         # Post-answer explanation modal
│   ├── ResultsDashboard.tsx      # Score, chart, suggestions
│   ├── QuizHistory.tsx           # History row list
│   ├── Timer.tsx                 # Live countdown pill
│   └── LoadingSpinner.tsx
├── lib/
│   ├── auth.ts                   # NextAuth config
│   ├── types.ts                  # Shared TypeScript types
│   ├── gemini.ts                 # Gemini API wrapper
│   ├── document-parser.ts        # PDF / DOCX / PPT text extraction
│   ├── file-validation.ts        # File type + size validation
│   ├── prisma.ts                 # Prisma client singleton
│   └── quiz-utils.ts             # Score calculation, formatTime, etc.
├── store/
│   └── quiz-store.ts             # Zustand store — quiz session state
└── prisma/
    └── schema.prisma
```

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
| `NEXTAUTH_URL` | ✅ | Your Vercel deployment URL |

4. Deploy. Vercel auto-runs `prisma generate` via the `postinstall` script.

---

## 🛠️ Troubleshooting

| Problem | Fix |
|---|---|
| **Database tables missing** | Run `npx prisma db push` |
| **Gemini quota errors** | Check API key quota at [ai.google.dev](https://ai.google.dev); reduce question count |
| **Video not playing** | Browser autoplay policies — the video is muted and `playsInline`, should work everywhere |
| **File parse fails** | Ensure file is ≤ 10 MB and in a supported format (PDF, DOCX, PPT, PPTX) |
| **Auth not working** | Confirm `NEXTAUTH_SECRET` and `NEXTAUTH_URL` are set correctly |

---

## 📜 License

MIT — free to use, modify, and distribute.

---

<p align="center">
  Made with ☕ by <a href="https://divyanshm.dev">Divyansh Mishra</a> &nbsp;·&nbsp;
  <a href="https://linkedin.com/in/divyanshm30">LinkedIn</a> &nbsp;·&nbsp;
  <a href="https://github.com/DivyanshM30">GitHub</a>
</p>
