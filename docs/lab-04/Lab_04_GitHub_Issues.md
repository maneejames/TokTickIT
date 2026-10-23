# Lab 4 — TokTickIT GitHub Issues

> **⚠️ Standing rule for every issue below:** The AI coding/specification agent must never run `git commit`, `git push`, or open/merge a PR itself. It only edits files in the working tree and reports what changed, always citing raw command output / log file content directly — never a composed or remembered summary. A human reviews the diff, then commits, pushes, and manages the PR/merge for every issue in this document.

---

## Issue #0: LAB 4

### Scope
- Create `lab4-staging` off `main` (which now contains the full Lab 1–3 TokTickIT codebase); enable branch protection on `main` and `lab4-staging`
- Set up GitHub Project (Kanban: Backlog, Specified, Started, PR Review, Fixing, Done)
- Create all issues below and add to Backlog with dependencies linked
- Scaffold empty directories per Section 12 (`docs/lab-04/`, `server/tests/lab-04/`, `client/.../lab-04 tests/`, `e2e/lab-04/`, `artifacts/lab-04/screenshots/{staff-dashboard,requester-dashboard,actions-taken}/`)
- Update README with Lab 4 branch flow

### Depends on
- Lab 3 merged into `main`

### Labels
`setup`, `infra`

### Branch
`lab4-staging`

### Definition of Done
- [ ] `lab4-staging` exists with branch protection
- [ ] Kanban board set up with all issues in Backlog
- [ ] Folder skeleton committed
- [ ] README updated
- [ ] PR merged into `lab4-staging`

---

## Issue #1: AI Specification Agent — Engineering Contract

### Description
Use the AI Specification Agent to draft, refine, and get team approval on all four contract documents that the Coding Agent will later use as its source of truth, extending the Lab 3 contract. This is a single issue covering the full documentation phase before any code is written.

### Scope
- `docs/lab-04/specification.md` — Sprint Goal, Stakeholder Interpretation, Scope (incl. explicit exclusions), Functional Requirements (FR-01...) for Actions Taken/workflow/dashboards/hardening, Business Rules (BR-01... including fixed BR-01–BR-02), the complete Ticket status transition matrix, dashboard metric definitions and calculations, Acceptance Criteria (AC-01... Given-When-Then), Data Changes with ≥2 justified database-design decisions, API Contract summary, Definition of Done, Assumptions
- `docs/lab-04/api-spec.md` — Actions Taken CRUD endpoints, Requester/IT Staff dashboard endpoints, conflict/stale-update handling (optimistic concurrency), continuation of all Lab 2/3 endpoints, full HTTP status mapping
- `docs/lab-04/ui-spec.md` — IT Staff Dashboard, Requester Dashboard, Actions Taken area on Ticket Detail (list/create/view/edit modes), Ticket Workflow controls, final regression/hardening checklist, responsive and accessibility rules
- `docs/lab-04/tests.md` — planned-test table (unit/API/UI/UI-style/responsive/authorization/workflow/migration-regression/performance-smoke/E2E), AC-to-test traceability matrix, test commands
- Team review and approval of every document

### Depends on
- Issue #0

### Labels
`spec`, `documentation`

### Branch
`feature/lab4-spec-doc`

### Definition of Done
- [ ] All 4 documents complete per their respective templates (Section 9)
- [ ] Every AC maps to at least one planned test with a real file path
- [ ] Fixed rules (BR-01–BR-02, resolution-gate rule, dashboard ownership scoping) present and consistent across all 4 files
- [ ] At least 2 database-design decisions justified in specification.md
- [ ] Terminology/data shapes consistent across all 4 documents
- [ ] Team has reviewed and approved — recorded in `reviewer.md`
- [ ] Screenshot/commit evidence these files existed before implementation PRs began
- [ ] PR(s) merged into `lab4-staging`

---

## Issue #2: Review Contract — Ambiguity & Conflict Resolution

### Description
Before handing the contract to the Coding Agent, run the "Review Contract" step to surface ambiguities, conflicts, and implementation-order questions across the 4 approved documents, and resolve them.

### Scope
- Review specification.md, tests.md, ui-spec.md, and api-spec.md for ambiguities, conflicts, dependencies, and implementation order
- Team resolves every flagged issue by editing the relevant document(s)
- Lock the implementation order for the Implement issues below

### Depends on
- Issue #1

### Labels
`spec`, `review`

### Branch
`feature/lab4-spec-review`

### Definition of Done
- [ ] All flagged conflicts/ambiguities resolved
- [ ] Implementation order confirmed and documented
- [ ] Team sign-off recorded in `reviewer.md`
- [ ] PR merged into `lab4-staging`
- [ ] Implementation issues unblocked (moved to `Specified`)

---

## Issue #3: Implement — Actions Taken Foundation

### Description
Build the backend foundation for Actions Taken: data model, migration/backfill, idempotent seed, and the CRUD/authorization API.

### Scope
- `ActionTaken` model (date/time, Action Description, Result, Performed by — server-derived from session, Follow-Up Required flag, Follow-up Note required-when-flagged, Attachment Notes) with FK to `Ticket` and to the performing `User`
- Migration preserving all Lab 1–3 data; documented backfill behavior for legacy Tickets with zero Actions Taken
- Idempotent seed: realistic Tickets across all statuses/priorities/ownership states, with Tickets having zero/one/multiple Actions Taken
- `POST`/`PATCH` Actions Taken endpoints restricted to IT Staff/Administrator per §4.3, with backend-enforced authorization (not just hidden UI)

### Depends on
- Issue #2

### Labels
`implement`, `backend`, `data`

### Branch
`feature/lab4-actions-taken-foundation`

### Definition of Done
- [ ] Failing migration/seed/API tests written first, then implementation makes them pass
- [ ] Existing Lab 1–3 data verified intact after migration (regression test)
- [ ] Requester role rejected (403) on create/update endpoints
- [ ] Follow-up Note required-when-flagged validated server-side
- [ ] Completion Review (Issue #8) passed for this scope
- [ ] PR merged into `lab4-staging`

---

## Issue #4: Implement — Actions Taken UI

### Description
Add the Actions Taken area to the existing Ticket Detail screen for IT Staff/Administrator, and read-only visibility for Requesters.

### Scope
- Actions Taken list/table on Ticket Detail with create mode and view/edit mode
- Form fields: Action date/time (auto), Description, Result, Performed by (auto, read-only), Follow-Up Required toggle, Follow-up Note (conditionally required), Attachment Notes
- Requester Ticket Detail shows all Actions Taken items read-only
- Responsive layout, loading/empty/validation/safe-failure states per ui-spec.md

### Depends on
- Issue #3

### Labels
`implement`, `frontend`

### Branch
`feature/lab4-actions-taken-ui`

### Definition of Done
- [ ] Failing UI tests written first, then implemented
- [ ] Follow-up Note field becomes required only when Follow-Up Required is toggled on (tested)
- [ ] Requester view is strictly read-only (no create/edit controls rendered or reachable)
- [ ] Multiple Actions Taken on one Ticket render correctly, stable order
- [ ] Completion Review passed
- [ ] PR merged into `lab4-staging`

---

## Issue #5: Implement — Ticket Workflow & Resolution Gate

### Description
Finalize and enforce the complete Ticket status-transition matrix and the backend-enforced resolution gate, building on the partial transition work from Lab 3.

### Scope
- Refined, documented transition matrix across all 8 statuses with authorized roles
- Backend enforcement of the resolution rule even when a client bypasses the normal screen (e.g. direct API call)
- Confirm the Requester's "problem appears resolved" indicator remains advisory only — never itself changes Ticket status (continuation of Lab 3 BR-05)
- Concurrency/stale-update handling (optimistic concurrency or equivalent) so one user's workflow change isn't silently overwritten by another
- UI: status controls show only permitted transitions; successful changes refresh the Ticket summary status

### Depends on
- Issue #3

### Labels
`implement`, `backend`, `frontend`

### Branch
`feature/lab4-ticket-workflow`

### Definition of Done
- [ ] Failing tests written first for every valid and invalid transition, then implemented
- [ ] Direct API bypass of the resolution gate is rejected (tested)
- [ ] Concurrent/stale update scenario produces a safe, defined conflict response (tested)
- [ ] Completion Review passed
- [ ] PR merged into `lab4-staging`

---

## Issue #6: Implement — Role Dashboards

### Description
Build the Requester and IT Staff dashboard APIs and screens per the approved metric definitions.

### Scope
- `GET` Requester dashboard endpoint: total open Tickets, Tickets waiting for Requester, recently updated Tickets, recently resolved Tickets — scoped strictly to the authenticated Requester
- `GET` IT Staff dashboard endpoint: unassigned Tickets, Tickets owned by current user, Tickets by status/IT Priority, recently updated Tickets
- Administrator dashboard reuses IT Staff dashboard, optionally with concise user-account counts
- Dashboard screens with metric cards, drill-down links to the correct filtered Queue/My Tickets view, loading/empty/forbidden/safe-failure states
- Every metric backed by a documented backend query (no client-side recomputation of authoritative counts)

### Depends on
- Issue #3, #5

### Labels
`implement`, `backend`, `frontend`

### Branch
`feature/lab4-dashboards`

### Definition of Done
- [ ] Failing tests written first for each dashboard metric calculation and empty-state case, then implemented
- [ ] Requester dashboard proven to leak no other Requester's data (tested)
- [ ] Each dashboard card's drill-down verified to open the correct filtered view
- [ ] Completion Review passed
- [ ] PR merged into `lab4-staging`

---

## Issue #7: Final Hardening & Regression

### Description
Polish and harden the complete application across all four labs: visual consistency, accessibility, duplicate-action prevention, safe failure behavior, and full regression coverage.

### Scope
- Full regression pass across Lab 1–3 features: authentication, My Tickets, Ticket Detail, Attachments, Public Comments, Internal Notes, IT Staff Queue/Detail, Admin User Management
- Duplicate-submission prevention for repeated clicks / network retry on create/update actions
- Form data preserved after recoverable failures
- Removal of console errors, broken links, placeholder text, and unfinished controls left from earlier labs
- README setup/seed/migration/test/demo instructions brought current
- Accessibility pass: visible focus, keyboard operation, semantic labels, non-color status cues, no clipped/overlapping/inaccessible content, no horizontal scrolling

### Depends on
- Issue #4, #5, #6

### Labels
`implement`, `hardening`, `regression`

### Branch
`feature/lab4-final-hardening`

### Definition of Done
- [ ] Full regression suite (Labs 1–4) green with raw output evidence
- [ ] Accessibility checklist completed and documented
- [ ] No console errors/broken links/placeholder text remain (verified, not assumed)
- [ ] README current and verified by following it from a clean clone
- [ ] Completion Review passed
- [ ] PR merged into `lab4-staging`

---

## Issue #8: Completion Review — Audit Against Contract

### Description
Run the AI Coding Agent's "Completion Review" audit against every Acceptance Criterion and planned test across all implemented features (#3–#7), before accepting any of them as done.

### Scope
- Audit the implementation against every acceptance criterion and planned test; report missing evidence, skipped tests, untested failure states, and UI-spec deviations
- Fix everything flagged
- Re-run full test suite (unit, API, UI, authorization, workflow, migration/regression, E2E) and confirm all pass with no skips/disables, quoting raw output/log files directly
- Capture responsive/accessibility screenshots (desktop/tablet/mobile) for all major Lab 4 screens
- Verify every dashboard metric against a direct database query (not just the UI's own claim)

### Depends on
- Issues #3, #4, #5, #6, #7 all merged

### Labels
`review`, `testing`

### Branch
`feature/lab4-completion-review`

### Definition of Done
- [ ] No skipped/disabled/flaky tests remain
- [ ] Every AC has passing, traceable test evidence
- [ ] UI matches `ui-spec.md` (verified via screenshots at 3 viewports)
- [ ] Every dashboard metric cross-checked against a raw DB query
- [ ] Findings and fixes documented
- [ ] Changes merged into `lab4-staging`

---

## Issue #9: Integration, Release & Submission

### Description
Finalize `lab4-staging`, release to `main`, and assemble the required submission evidence.

### Scope
- Merge all implementation work into `lab4-staging`, resolve integration issues
- Full regression run (unit, API, UI, authorization, workflow, migration, E2E, visual checks) on `lab4-staging`
- Open release PR: `lab4-staging` → `main`
- Write `docs/lab-04/ai-use.md` (LLM used, 6–10 key prompts, reflection)
- Collect all required screenshots (staff dashboard, requester dashboard, actions taken, responsive views)
- Assemble final PDF using "Answer Part 1" – "Answer Part 9" format

### Depends on
- Issue #8

### Labels
`release`, `submission`

### Branch
`release/lab4-staging-to-main`

### Definition of Done
- [ ] All Kanban issues in `Done`
- [ ] Release PR from `lab4-staging` to `main` merged
- [ ] `ai-use.md` complete
- [ ] All required screenshots collected and readable
- [ ] Final PDF assembled with all 9 parts in order, test output drawn from `main`
- [ ] Submitted

---

## Full Phase-Level Issue Table

| Issue | Phase | Depends on |
|---|---|---|
| #0 | Setup | Lab 3 done |
| #1 | AI Specification Agent | #0 |
| #2 | Review Contract | #1 |
| #3 | Implement — Actions Taken Foundation | #2 |
| #4 | Implement — Actions Taken UI | #3 |
| #5 | Implement — Ticket Workflow & Resolution Gate | #3 |
| #6 | Implement — Role Dashboards | #3, #5 |
| #7 | Final Hardening & Regression | #4, #5, #6 |
| #8 | Completion Review | #3, #4, #5, #6, #7 |
| #9 | Integration, Release & Submission | #8 |
