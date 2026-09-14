# QuizForge improvement plan

Updated: 2026-09-14. Baseline: `5991979`. Evidence: [code audit](CODE_AUDIT.md).

This updates the old audit's quick-wins/correctness/structure sequence using the current implementation. Status below describes work still to do; it is not a feature-completion claim.

## 1. Next task: reliable quiz navigation and completion

Priority: highest. Covers QF-01 and QF-02. Implement as one coherent change because navigation and save state currently interact.

- Consume or synchronize entry-point URL state; do not reapply configuration during an active quiz.
- Identify the active attempt explicitly and freeze its answers on completion.
- Show saving, saved, and failed states; disable further completion/input while saving.
- Preserve the pending submission and expose retry after failure.
- Handle a lost success response without inserting a duplicate or changing the first saved result.
- Display the canonical server result after success.
- Prevent delayed completion of an old attempt from clearing a newer session.

Acceptance checks:

1. Hero upload, dashboard upload, document library, direct upload, retake, and Cram each reach and stay on the quiz screen.
2. Answers/feedback advance normally; New Quiz returns to upload.
3. Manual finish and time expiry produce one save request per attempt.
4. Offline/500 failure preserves answers and offers retry.
5. A dropped response after insertion still resolves to one history row.
6. Immediate result metrics/identity agree with the persisted result.
7. Add component or browser regressions for these transitions; keep existing backend tests passing.

## 2. Align issuance and submission validation

Priority: high. QF-03.

Use one canonical validation contract for generated quizzes, retakes, Cram, and saves. Reject/normalize incompatible content before a user spends time answering. Cover field-length boundaries and legacy short quizzes. Keep signing bound to the canonical issued content.

## 3. Recoverable data and AI flows

Priority: medium. QF-04 and QF-06.

Add dashboard history error/retry states and cancellation/request identity for Ask AI. Verify failures using delayed/mocked responses, not only success paths.

## 4. UI architecture and warning cleanup

Priority: medium. QF-07 and old A1/A6/C2.

Share upload request logic while retaining the two intended presentations. Use state for render-visible file selection. Address lint warnings through state/effect ownership changes rather than disabling rules. Check keyboard focus and mobile layouts after the refactor.

## 5. Bound history loading

Priority: medium. QF-05.

Paginate list summaries, retain full detail reads, and calculate lifetime analytics independently of the current page. Verify using a large history fixture. Do not paginate the existing dashboard payload without preserving aggregate semantics.

## 6. Product expansion after reliability gates

Retain these items from the existing feature roadmap, subject to explicit scope at implementation time:

| Order | Feature | Required design decision |
| --- | --- | --- |
| 1 | Exam simulation | Feedback suppression, answer availability, timer enforcement, result release, and signed configuration. |
| 2 | Pause/resume | Relationship between persisted attempts, proof expiry, and exam-mode timing; refresh recovery differs from pausing the timer. |
| 3 | Flashcards + Anki export | Card schema, export format, and review integration. |
| 4 | Adaptive difficulty | Explainable topic weighting and minimum evidence thresholds. |
| 5 | Multi-document quizzes | Source ownership and provenance across multiple documents. |
| 6 | More question types | Shared type/grading contracts across normal, review, and public quiz flows. |

Separately clarify whether public quiz attempts should be importable into personal history, as the older roadmap promises. Do not mark that behavior shipped based only on leaderboard support.

## Verification and handoff policy

After each implemented feature: explain changed behavior, provide manual verification steps, run the relevant automated checks, and give commit/push commands for the user to execute. Never commit or push automatically.

Standard local commands:

```powershell
npm test
npm run typecheck
npm run lint
npm run build
```

The audit environment used the local Node entry points because npm was not available in its shell. Configure test auth/database/AI services before any live-flow testing. No production database mutation is required for this plan.
