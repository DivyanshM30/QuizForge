# QuizForge Documentation

QuizForge turns a PDF or DOCX study document into AI-generated multiple-choice quizzes. It runs timed practice or exam attempts, grades them on the server, and keeps a history with analytics, spaced-repetition review, Cram Mode, and shareable challenge links.

This folder is a guided course through the codebase. It is written for a developer who knows basic programming and some JavaScript but has never opened this repository. It is also written for the project owner: to explain any part of the system in a code review or an interview without guessing.

> **Snapshot.** These guides describe the code on branch `codex/server-side-quiz-scoring` at commit `32cd140`, plus one uncommitted change to `lib/gemini.ts` that existed in the working tree when they were written (see [07. AI Generation](07-AI-GENERATION.md#committed-vs-working-tree-parser)). Source code is the authority. Where a claim could not be checked, the guide says so.

## Guides

| # | Guide | What it answers |
|---|---|---|
| 01 | [Overview](01-OVERVIEW.md) | What problem QuizForge solves, who uses it, what is implemented, the stack, and a guided tour |
| 02 | [Concepts](02-CONCEPTS.md) | The ideas you need to read the code, each taught with a real QuizForge example and a common mistake |
| 03 | [Architecture](03-ARCHITECTURE.md) | Layers, module boundaries, state ownership, trust boundaries, lifecycle, and trade-offs |
| 04 | [Codebase Guide](04-CODEBASE-GUIDE.md) | A curated tree and a file-by-file guide: purpose, exports, callers, and edge cases |
| 05 | [Core Workflows](05-CORE-WORKFLOWS.md) | Every major feature traced from a click to the database and back, including failure paths |
| 06 | [Data and API](06-DATA-AND-API.md) | The database schema, browser-local data, ownership rules, and a full API reference |
| 07 | [AI Generation](07-AI-GENERATION.md) | The document-to-quiz pipeline: limits, prompts, parsing, validation, retries, and the local benchmark |
| 08 | [Auth, Security, and Reliability](08-AUTH-SECURITY-AND-RELIABILITY.md) | Sessions, ownership checks, password lifecycle, quiz integrity, recovery, and known limitations |
| 09 | [Setup and Configuration](09-SETUP-AND-CONFIGURATION.md) | Prerequisites, PowerShell setup, environment variables, database setup, and first-run checks |
| 10 | [Testing and Troubleshooting](10-TESTING-AND-TROUBLESHOOTING.md) | What the tests cover, commands, manual journeys, and a symptom-to-remedy table |
| 11 | [Deployment and Operations](11-DEPLOYMENT-AND-OPERATIONS.md) | Production build, Vercel configuration, schema rollout, logs, and open operational decisions |
| 12 | [Developer and Interview Guide](12-DEVELOPER-AND-INTERVIEW-GUIDE.md) | How to make a change safely, common pitfalls, project pitches, and interview questions with answers |

## Reading paths

| Goal | Path |
|---|---|
| **First-time setup** | [01](01-OVERVIEW.md) (requirements) → [09](09-SETUP-AND-CONFIGURATION.md) → [10](10-TESTING-AND-TROUBLESHOOTING.md#manual-verification-journeys) |
| **Understand the architecture** | [01](01-OVERVIEW.md) → [03](03-ARCHITECTURE.md) → [05](05-CORE-WORKFLOWS.md) → [06](06-DATA-AND-API.md), with [02](02-CONCEPTS.md) as a reference |
| **Contribute a change** | [04](04-CODEBASE-GUIDE.md) → [05](05-CORE-WORKFLOWS.md) (the flow you touch) → [12](12-DEVELOPER-AND-INTERVIEW-GUIDE.md#making-a-change) → [10](10-TESTING-AND-TROUBLESHOOTING.md) |
| **Troubleshoot** | [10](10-TESTING-AND-TROUBLESHOOTING.md#troubleshooting) → [09](09-SETUP-AND-CONFIGURATION.md) → [08](08-AUTH-SECURITY-AND-RELIABILITY.md) |
| **Work on AI generation** | [07](07-AI-GENERATION.md) → [05](05-CORE-WORKFLOWS.md#3-generate-a-quiz) → [10](10-TESTING-AND-TROUBLESHOOTING.md) |
| **Deploy** | [09](09-SETUP-AND-CONFIGURATION.md) → [11](11-DEPLOYMENT-AND-OPERATIONS.md) → [08](08-AUTH-SECURITY-AND-RELIABILITY.md) |
| **Interview preparation** | [01](01-OVERVIEW.md) → [03](03-ARCHITECTURE.md) → [07](07-AI-GENERATION.md) → [08](08-AUTH-SECURITY-AND-RELIABILITY.md) → [12](12-DEVELOPER-AND-INTERVIEW-GUIDE.md#part-2-interview-preparation) |

If you only have twenty minutes: read [01](01-OVERVIEW.md), then open [`app/api/save-quiz/route.ts`](../app/api/save-quiz/route.ts). That single handler shows authentication, proof verification, server-side grading, idempotent persistence, and best-effort side effects.

## Conventions

- **Links** use paths relative to this folder, for example [`lib/quiz-proof.ts`](../lib/quiz-proof.ts). Folders with brackets, such as `app/api/history/[id]`, are percent-encoded in links (`%5Bid%5D`) so they work on GitHub.
- **Symbols** appear in backticks, for example `createQuizProof`. Line numbers are given only where they were checked against the snapshot.
- **Evidence labels.** *Source inspection* means read in code. *Verified* means a command was run while writing these guides. *Unverified* means it depends on live services, credentials, or deployed infrastructure that were not exercised. *Inference* marks an interpretation of intent that the repository does not state. *Proposal* marks an improvement that is not implemented.
- **Sample data** such as `learner@example.com`, `Cell Biology Notes.pdf`, or a score of `7/10` is fictional.
- **Diagrams** use Mermaid, which GitHub renders.

## Relationship to other repository documents

- The root [`README.md`](../README.md) is the short product introduction and quick start. It links here for detail. Some of its older statements disagree with the code; [09. Setup](09-SETUP-AND-CONFIGURATION.md#readme-corrections) lists each difference and which one is correct.
- Some working copies contain `docs/CODE_AUDIT.md`, `docs/IMPROVEMENT_PLAN.md`, `docs/local/`, `audit.md`, `FEATURES_ROADMAP.md`, and similar notes. [`.gitignore`](../.gitignore) excludes them, so they are private working notes. These guides do not depend on them and do not repeat their contents as fact.

---

[Start: 01. Overview →](01-OVERVIEW.md)
