# Lab 2 — TokTickIT GitHub Issues

---

## Issue #0: Setup lab2-staging Branch & Project Board

### Scope
- Create `lab2-staging` off `main`; enable branch protection on `main` and `lab2-staging`
- Set up GitHub Project (Kanban: Backlog, Specified, Started, PR Review, Fixing, Done)
- Create all issues below and add to Backlog with dependencies linked
- Scaffold empty directories per Section 12 (`docs/lab-02/`, `server/tests/lab-02/`, `client/.../lab-02 tests/`, `e2e/lab-02/`, `artifacts/lab-02/screenshots/`)
- Update README with Lab 2 branch flow

### Depends on
- Lab 1 merged into `main`

### Labels
`setup`, `infra`

### Branch
`chore/lab2-setup`

### Definition of Done
- [ ] `lab2-staging` exists with branch protection
- [ ] Kanban board set up with all issues in Backlog
- [ ] Folder skeleton committed
- [ ] README updated
- [ ] PR merged into `lab2-staging`

---

## Issue #1: AI Specification Agent — Engineering Contract

### Description
Use the AI Specification Agent to draft, refine, and get team approval on all four contract documents that the Coding Agent will later use as its source of truth. This is a single issue covering the full documentation phase (Spec-Driven + Test-Driven planning) before any code is written.

### Scope
- `docs/lab-02/specification.md` — Sprint Goal, Stakeholder Interpretation, Scope, Functional Requirements (FR-01...), Business Rules (BR-01... including fixed BR-01–BR-03), Acceptance Criteria (AC-01... Given-When-Then), Data Changes, API Contract summary, Definition of Done, Assumptions
- `docs/lab-02/api-spec.md` — endpoints, request/response shapes, query contract for search/filter/sort/pagination, validation, ownership checks, full HTTP status mapping
- `docs/lab-02/ui-spec.md` — Zen Green Theme tokens, typography, component states, button hierarchy, responsive rules, accessibility, screen layouts for all 4 screens
- `docs/lab-02/tests.md` — planned-test table (unit/API/UI/responsive/E2E), AC-to-test traceability matrix, test commands, known limitations
- Team review and approval of every document (AI drafts, humans correct and approve)

### Depends on
- Issue #0

### Labels
`spec`, `documentation`

### Branch
`feature/spec-doc` (can be one branch/PR or split per file if preferred — team's choice, no sub-issues required)

### Definition of Done
- [ ] All 4 documents complete per their respective templates (Appendix A, B, C, Section 6)
- [ ] Every AC maps to at least one planned test with a real file path
- [ ] Fixed rules (BR-01–BR-03, attachment constraints) present and consistent across all 4 files
- [ ] Terminology/data shapes consistent across all 4 documents
- [ ] Team has reviewed and approved (not just AI-generated) — recorded in `reviewer.md`
- [ ] Screenshot/commit evidence these files existed before implementation PRs began
- [ ] PR(s) merged into `lab2-staging`

---

## Issue #2: Review Contract — Ambiguity & Conflict Resolution

### Description
Before handing the contract to the Coding Agent, run the "Review Contract" step to surface ambiguities, conflicts, and implementation-order questions across the 4 approved documents, and resolve them.

### Scope
- Prompt: *"Read specification.md, tests.md, ui-spec.md, and api-spec.md. List ambiguities, conflicts, dependencies, and proposed implementation order. Do not write code yet."*
- Team resolves every flagged issue by editing the relevant document(s)
- Lock the implementation order for Phase 3 (Implement) issues

### Depends on
- Issue #1

### Labels
`spec`, `review`

### Branch
`feature/spec-review`

### Definition of Done
- [ ] All flagged conflicts/ambiguities resolved
- [ ] Implementation order confirmed and documented
- [ ] Team sign-off recorded in `reviewer.md`
- [ ] PR merged into `lab2-staging`
- [ ] Phase 3 issues unblocked (moved to `Specified`)

---

## Issue #3: Implement — Development Requester Context

### Description
Build the temporary Development Requester selection mechanism ("test login") and the seed data it relies on.

### Scope
- `RequesterUser` model + idempotent seed (≥4 active, ≥1 inactive)
- Active-Requester API endpoint
- Development Requester Selection screen (loading/empty/error states, Zen Green styling, keyboard accessible)
- Selected-Requester context + Change Requester action
- Explicitly no passwords, sessions, roles, or Lab 3 auth features

### Depends on
- Issue #2

### Labels
`implement`, `backend`, `frontend`

### Branch
`feature/requester-context`

### Definition of Done
- [ ] Failing tests written first, then implementation makes them pass
- [ ] Inactive Requester never appears in selector
- [ ] Matches related AC/BR and `ui-spec.md`
- [ ] Completion Review (Issue #6) passed for this scope
- [ ] PR merged into `lab2-staging`

---

## Issue #4: Implement — Create Ticket

### Description
Build the Create Ticket screen and backend, including validation, attachment upload, and success/failure states.

### Scope
- `POST /api/tickets` with validation, unique Ticket Number generation
- Attachment upload during/after creation (type/size/count limits)
- Create Ticket form per `ui-spec.md` (required-field markers, read-only fields, busy state, success state)
- Loading, validation, submitting, success, API-failure states with form values preserved on failure

### Depends on
- Issue #2, #3 (needs Requester context)

### Labels
`implement`, `backend`, `frontend`

### Branch
`feature/create-ticket`

### Definition of Done
- [ ] Failing API/UI tests written first, then implemented
- [ ] All Create Ticket ACs pass
- [ ] Does not touch My Tickets or Ticket Detail
- [ ] Completion Review passed
- [ ] PR merged into `lab2-staging`

---

## Issue #5: Implement — My Tickets

### Description
Build the Requester-owned, paginated ticket list with search, filter, and sort.

### Scope
- `GET /api/tickets` with search/filter/sort/pagination per `api-spec.md`
- My Tickets screen: table (desktop) / card (mobile) per `ui-spec.md`
- Loading, empty, no-results, failure states
- Ownership enforcement (Requester A never sees Requester B's tickets)

### Depends on
- Issue #2, #3

### Labels
`implement`, `backend`, `frontend`

### Branch
`feature/my-tickets`

### Definition of Done
- [ ] Failing tests written first, then implemented
- [ ] Cross-requester isolation verified by test
- [ ] All My Tickets ACs pass
- [ ] Completion Review passed
- [ ] PR merged into `lab2-staging`

---

## Issue #6: Implement — Requester Ticket Detail & Attachments

### Description
Build the read-only Ticket Detail screen and the attachment lifecycle (add, download, soft-remove).

### Scope
- `GET /api/tickets/:id` with backend ownership enforcement
- Attachment endpoints: metadata, download (active only), soft-remove
- Ticket Detail screen (read-only fields, attachment section) per `ui-spec.md`
- No comments, internal notes, Actions Taken, or status changes

### Depends on
- Issue #2, #4 (attachments introduced in Create Ticket)

### Labels
`implement`, `backend`, `frontend`

### Branch
`feature/ticket-detail-attachments`

### Definition of Done
- [ ] Failing tests written first, then implemented
- [ ] Unauthorized cross-requester access returns a safe rejection (tested)
- [ ] Removed attachments show as metadata but are not downloadable
- [ ] Completion Review passed
- [ ] PR merged into `lab2-staging`

---

## Issue #7: Completion Review — Audit Against Contract

### Description
Run the AI Coding Agent's "Completion Review" audit against every Acceptance Criterion and planned test across all implemented features (#3–#6), before accepting any of them as done.

### Scope
- Prompt: *"Audit the implementation against every acceptance criterion and planned test. Report missing evidence, skipped tests, untested failure states, and UI-spec deviations. Do not claim completion until corrected."*
- Fix everything flagged
- Re-run full test suite (unit, API, UI, E2E) and confirm all pass with no skips/disables

### Depends on
- Issues #3, #4, #5, #6 all merged

### Labels
`review`, `testing`

### Branch
`feature/completion-review` (or handled as fixes on top of existing PRs)

### Definition of Done
- [ ] No skipped/disabled/flaky tests remain
- [ ] Every AC has passing, traceable test evidence
- [ ] UI matches `ui-spec.md` (verified via Playwright screenshots at 3 viewports)
- [ ] Findings and fixes documented
- [ ] Changes merged into `lab2-staging`

---

## Issue #8: Integration, Release & Submission

### Description
Finalize `lab2-staging`, release to `main`, and assemble the required submission evidence.

### Scope
- Merge all Phase 3 work into `lab2-staging`, resolve integration issues
- Full regression run (unit, API, UI, E2E, Playwright visual checks) on `lab2-staging`
- Open release PR: `lab2-staging` → `main`
- Write `docs/lab-02/ai-use.md` (LLM used, 6–10 key prompts, reflection)
- Collect all required screenshots (Create Ticket states, My Tickets cross-requester, Ticket Detail/attachments, responsive views)
- Assemble final PDF using "Answer Part 1" – "Answer Part 9" format

### Depends on
- Issue #7

### Labels
`release`, `submission`

### Branch
`release/lab2-staging-to-main` (or direct PR from `lab2-staging`)

### Definition of Done
- [ ] All Kanban issues in `Done`
- [ ] Release PR from `lab2-staging` to `main` merged
- [ ] `ai-use.md` complete
- [ ] All required screenshots collected and readable
- [ ] Final PDF assembled with all 9 parts in order
- [ ] Submitted

---

## Full Phase-Level Issue Table

| Issue | Phase | Depends on |
|---|---|---|
| #0 | Setup | Lab 1 done |
| #1 | AI Specification Agent | #0 |
| #2 | Review Contract | #1 |
| #3 | Implement — Requester Context | #2 |
| #4 | Implement — Create Ticket | #2, #3 |
| #5 | Implement — My Tickets | #2, #3 |
| #6 | Implement — Ticket Detail & Attachments | #2, #4 |
| #7 | Completion Review | #3, #4, #5, #6 |
| #8 | Integration, Release & Submission | #7 |
