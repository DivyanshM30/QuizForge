# QuizForge code audit

Date: 2026-09-14. Reviewed baseline: `5991979` on `codex/server-side-quiz-scoring`.

## Scope and evidence

This is a source-based correctness, architecture, UX, performance, and roadmap review. It refreshes the June 22 audit (last status July 7) using its quick-wins/correctness/structure plan and the August 2 feature roadmap. No separate improvement-plan file was found. This is not a production security assessment, dependency advisory scan, or browser accessibility certification.

Inspected upload and quiz transitions, generation and submission contracts, retakes, Cram Mode, review and sharing paths, history loading, feedback, shared upload logic, metadata, styling, and existing test coverage. Findings below are based on code paths; manual reproduction steps are provided but have not been run in a browser during this audit. No live database or AI requests were made intentionally.

The old `audit.md` and `FEATURES_ROADMAP.md` are ignored by Git. Their blanket completion claims should not be treated as current evidence. This report and `IMPROVEMENT_PLAN.md` are in a trackable directory.

## Verification

- Unit/API tests: 9 files, 37 tests passed, exit 0.
- TypeScript: `tsc --noEmit` passed, exit 0.
- ESLint: exit 0, 0 errors and 19 warnings. Warnings cover effect-driven state updates, refs read during render, impure render fallbacks, and an effect dependency in the hero.
- Production build: `next build --webpack` passed, including compilation, TypeScript, page generation, and build traces. It emitted an outdated Browserslist-data warning.
- Tests use the Node environment and mocked dependencies; they do not verify React effects, browser navigation, or real persistence.

## Open findings

### QF-01 — High: URL initialization can override active quiz state

Evidence: `app/upload/page.tsx:45-62`, `:151-153`, `:217-219`; `hooks/useFileUpload.ts:69`; `app/documents/page.tsx:65`.

Hero/dashboard uploads and library generation navigate to `/upload?step=config`. `SearchParamsReader` keeps applying that parameter in an effect whose dependencies include the session and newly created parent callbacks. After generation sets `step` to `quiz`, the effect runs again and sets it back to `config` while document text remains available. The URL is never consumed or updated. The same parameter can override the New Quiz action. For `?step=quiz`, the callback also resets `hasSavedRef`, including on renders during a pending save, weakening the client duplicate-submit guard; server uniqueness still prevents duplicate stored results.

Fix: initialize navigation once per intended transition, synchronize or consume the query parameter, and tie completion state to attempt identity instead of an effect-driven boolean reset.

Verify: start through hero, dashboard upload, document library, direct upload, retake, and Cram Mode. The quiz must remain visible after generation and answer changes. New Quiz must return to upload. Delay the save response and trigger time-up/manual completion together; expect one request per attempt.

### QF-02 — High: save failure loses the retryable attempt

Evidence: `app/upload/page.tsx:168-194`; `store/quiz-store.ts:98-100`; `app/api/save-quiz/route.ts:85-108,151-153`.

Completion creates local results before saving, waits on an unbounded fetch, and clears the session in `finally` even on an offline/500 response. There is no retry control or retained pending submission. A hanging request leaves the quiz interactive while saving. Success also ignores the returned saved result, leaving a temporary client ID and potentially different elapsed time on the immediate results screen. A lost response after a successful insert is ambiguous: retrying currently returns 409, not the original result.

Fix: freeze a submission snapshot, show explicit saving/saved/failed states, retain the attempt on failure, add bounded retry, and reconcile successful/repeated submissions with the canonical saved result. Never turn a replay with altered answers into an update to an existing result.

Verify: force offline, HTTP 500, delayed responses, and a dropped response after successful persistence. Retry must preserve answers, produce exactly one history result, and use the server result in the UI. Navigate away during save and ensure an old completion cannot terminate a newer quiz.

### QF-03 — Medium: issuance and save validation accept different question shapes

Evidence: `lib/gemini.ts:79-120`; `lib/quiz-submission.ts:8-13,81-112`; `app/api/generate-questions/route.ts:93-97`; `app/api/history/[id]/route.ts:66-80`.

Generation sanitizes required text but does not enforce the maximum field lengths used by submission validation. For example, a model question with a 201-character topic can be returned and signed, then rejected only after the user finishes. Retakes of older quizzes also issue a proof without checking the current save contract; older short quizzes can fail the new five-question minimum.

Fix: share a canonical question/config parser across issuance and submission. Validate generated, historical, and Cram question sets before starting an attempt; provide a clear regenerate/unavailable path for incompatible historical records.

Verify: boundary-length fields, fewer-than-five historical questions, and malformed historical data must either normalize consistently or fail before the quiz starts. Every issued attempt must pass save validation when submitted unchanged.

### QF-04 — Medium: dashboard mistakes history failure for an empty account

Evidence: `hooks/useHistory.ts:21-31`; `app/dashboard/page.tsx:64,151,613`.

The hook exposes an error, but the dashboard reads only history and loading. An initial history failure ends loading with an empty array, displaying zero analytics and the no-history state rather than a recoverable error.

Fix: render a distinct load-error state and retry action; retain previously loaded data when refreshing fails.

Verify: return 500 for `/api/history`; show an error and retry rather than claiming there are no quizzes. Restore the endpoint and retry without reloading the page.

### QF-05 — Medium: history grows without a response bound

Evidence: `app/api/history/route.ts:22-29`; `lib/quiz-utils.ts:156-167`; `app/dashboard/page.tsx:151-220`.

History fetches every result and deserializes all questions, explanations, answers, and analysis. Dashboard requests the same full payload and computes lifetime aggregates in the browser. Cost grows with every completed quiz, despite lazy-loaded charts.

Fix: introduce paginated history summaries, keep full question payloads on the detail endpoint, and provide lifetime aggregates separately so pagination does not silently change analytics.

Verify: use a large fixture history; assert a bounded list payload, correct pagination, and unchanged lifetime totals/calibration statistics.

### QF-06 — Medium: old explanation responses can appear on a new question

Evidence: `components/FeedbackModal.tsx:27-35,77-98`; `components/QuizInterface.tsx:53-60`.

The modal resets state when another question opens but does not cancel or identify its in-flight explanation request. Continuing while Ask AI is pending and opening the next feedback can allow the previous response to overwrite the new question's explanation state.

Fix: abort requests on close/question change and check request identity before applying success, error, or loading updates.

Verify: delay question A's explanation, continue to B, open B's feedback, then release A's response. A's content must never appear under B.

### QF-07 — Medium: shared-upload extraction is incomplete

Evidence: `hooks/useFileUpload.ts:41-75`; `components/FileUpload.tsx:20-53`; refs returned at `hooks/useFileUpload.ts:147` and read during render in hero/dashboard.

The shared hook serves hero/dashboard, but the direct-upload component still has independent validation/request/error handling. The old A6 “fixed” claim is incorrect. UI also reads `selectedFileRef.current` during render, which the current React lint rules flag.

Fix: share upload/request state across both presentations, expose reactive selected-file state for rendering, and keep DOM refs for imperative picker access only. Preserve the different select-then-generate versus immediate-upload interactions.

Verify: test valid PDF/DOCX, invalid type, oversized file, API error, retry, and clear across all three entry points.

## Old audit reconciliation

| Area | Current evidence |
| --- | --- |
| Shared utilities, auth typing, one timer | Helpers and session user typing exist; QuizInterface delegates countdown to Timer. Completion still needs QF-01/QF-02. |
| Server scoring | Implemented in `5991979`, covered by proof/submission/API tests. Not a claim of proctored exam integrity: answers still reach the practice-quiz client. |
| Upload duplication | Partially fixed; QF-07 remains. |
| Charts and analytics | Charts use dynamic imports and analytics use memoization. QF-05 remains. |
| Theme/focus/dialog | Dark-only styling, focus-visible rules, reduced-motion rules, and dialog semantics/trap exist. Browser keyboard/contrast checks remain unverified. |
| Hero video | Metadata preload and a reduced-motion playback guard exist. The old claim that a poster was added is false: no poster attribute exists. |
| Metadata | Route layouts, root social metadata, robots and sitemap exist. Root canonical is `/`; upload is included in sitemap despite requiring sign-in. Review public/private indexing intent before further SEO work. |
| Housekeeping | `prisma/dev.db` is not currently tracked. Historical data removal was not verified. Old report/roadmap are ignored; preserve new audit and plan in Git. |
| Test coverage | Backend checks pass; no component/browser transition suite is configured. Add regression coverage for the highest-priority failures, not just lint cleanup. |

## Roadmap reconciliation

P0/P1 implementation surfaces exist, but “shipped” does not establish end-to-end reliability. Sharing is anonymous leaderboard submission; the roadmap's account-to-save-results promise is not implemented in the inspected share submit path (it creates a share entry, not a personal quiz result).

P2 remains unimplemented in the inspected paths: no exam-mode configuration, flashcard shape/export, multi-document generation, persisted session resume, or adaptive selection. Questions still use exactly four options. Exam mode is not safely estimated as just hiding the feedback modal: answer exposure, timing, completion, and saving require explicit acceptance criteria.

**Recommended next task:** repair quiz navigation and completion lifecycle (QF-01/QF-02), then issuance validation (QF-03), before starting P2 expansion. See `IMPROVEMENT_PLAN.md`.
