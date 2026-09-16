# Lab 3 — TokTickIT GitHub Issues

> **⚠️ Standing rule for every issue below:** The AI coding/specification agent must never run `git commit`, `git push`, or open/merge a PR itself. It only edits files in the working tree and reports what changed. A human reviews the diff, then commits, pushes, and manages the PR/merge for every issue in this document.

---

## Issue #0: Setup lab3-staging Branch & Project Board

### Scope
- Create `lab3-staging` off `main`; enable branch protection on `main` and `lab3-staging`
- Set up GitHub Project (Kanban: Backlog, Specified, Started, PR Review, Fixing, Done)
- Create all issues below and add to Backlog with dependencies linked
- Scaffold empty directories per Section 12 (`docs/lab-03/`, `server/tests/lab-03/`, `client/.../lab-03 tests/`, `e2e/lab-03/`, `artifacts/lab-03/screenshots/`)
- Update README with Lab 3 branch flow

### Depends on
- Lab 2 merged into `main`

### Labels
`setup`, `infra`

### Branch
`chore/lab3-setup`

### Definition of Done
- [ ] `lab3-staging` exists with branch protection
- [ ] Kanban board set up with all issues in Backlog
- [ ] Folder skeleton committed
- [ ] README updated
- [ ] PR merged into `lab3-staging`

---

## Issue #1: AI Specification Agent — Engineering Contract

### Description
Use the AI Specification Agent to draft, refine, and get team approval on all four contract documents that the Coding Agent will later use as its source of truth, extending the Lab 2 contract. This is a single issue covering the full documentation phase (Spec-Driven + Test-Driven planning) before any code is written.

### Scope
- `docs/lab-03/specification.md` — Sprint Goal, Stakeholder Interpretation, Scope (incl. explicit exclusions), Functional Requirements (FR-01...), Business Rules (BR-01... including fixed BR-01–BR-05), authorization matrix, Acceptance Criteria (AC-01... Given-When-Then), Data Changes, API Contract summary, Definition of Done, Assumptions
- `docs/lab-03/api-spec.md` — endpoints for auth, IT Staff Queue/Ticket ops, Comments/Notes, Admin user management; request/response shapes; auth/session mechanism; full HTTP status mapping incl. 401/403 distinction
- `docs/lab-03/ui-spec.md` — Login/Change Password, application shell, IT Staff Queue (desktop table + mobile), IT Staff Ticket Detail, Admin User Management screens; role-based navigation; Zen Green extensions; responsive rules
- `docs/lab-03/tests.md` — planned-test table (unit/API/UI/responsive/security/migration-regression/E2E), AC-to-test traceability matrix, test commands, known limitations
- Team review and approval of every document (AI drafts, humans correct and approve)

### Depends on
- Issue #0

### Labels
`spec`, `documentation`

### Branch
`feature/lab3-spec-doc`

### Definition of Done
- [ ] All 4 documents complete per their respective templates (Section 9)
- [ ] Every AC maps to at least one planned test with a real file path
- [ ] Fixed rules (BR-01–BR-05, Admin safety rules) present and consistent across all 4 files
- [ ] Terminology/data shapes consistent across all 4 documents
- [ ] Team has reviewed and approved (not just AI-generated) — recorded in `reviewer.md`
- [ ] Screenshot/commit evidence these files existed before implementation PRs began
- [ ] PR(s) merged into `lab3-staging`

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
`feature/lab3-spec-review`

### Definition of Done
- [ ] All flagged conflicts/ambiguities resolved
- [ ] Implementation order confirmed and documented
- [ ] Team sign-off recorded in `reviewer.md`
- [ ] PR merged into `lab3-staging`
- [ ] Implementation issues unblocked (moved to `Specified`)

---

## Issue #3: Implement — Data Model, Migration & Seed

### Description
Evolve the Lab 2 schema to a real User model with credentials/roles, migrate Development Requester records into it, and provide idempotent seed data for all three roles.

### Scope
- `User` model (email, password hash, role enum, active flag, must-change-password flag) + relations for Ticket ownership, Public Comments, Internal Notes
- Migration script converting Lab 2 Development Requesters into real Users without losing existing Ticket/Attachment data
- Idempotent seed: ≥4 active + 1 inactive Requester, ≥3 active + 1 inactive IT Staff, ≥1 active Administrator, realistic Tickets across statuses/priorities/ownership, sample Comments/Notes
- No plaintext passwords anywhere; documented local-dev-only seed credentials

### Depends on
- Issue #2

### Labels
`implement`, `backend`, `data`

### Branch
`feature/lab3-data-migration`

### Definition of Done
- [ ] Failing migration/seed tests written first, then implementation makes them pass
- [ ] Existing Lab 2 Ticket/Attachment data survives migration (regression test)
- [ ] Seed script safe to re-run
- [ ] Completion Review (Issue #10) passed for this scope
- [ ] PR merged into `lab3-staging`

---

## Issue #4: Implement — Authentication Foundation

### Description
Build login, logout, current-user retrieval, and mandatory first-login password change, replacing the Dev Requester selector as the entry point.

### Scope
- `POST /login`, `POST /logout`, `GET /me` endpoints with password hashing, session/token issuance, expiration, logout invalidation
- Mandatory password-change endpoint and enforced block on normal app access until satisfied
- Login screen + Change Password screen per `ui-spec.md` (validation, busy state, safe failure feedback, inactive-account handling)
- Authenticated application shell showing current user/role + Logout action

### Depends on
- Issue #2, #3 (needs real User model)

### Labels
`implement`, `backend`, `frontend`, `auth`

### Branch
`feature/lab3-auth`

### Definition of Done
- [ ] Failing API/UI tests written first, then implemented
- [ ] AC-01, AC-02 pass; inactive-account and invalid-credential paths tested
- [ ] No secrets exposed to client code or committed to source control
- [ ] Completion Review passed
- [ ] PR merged into `lab3-staging`

---

## Issue #5: Implement — Server-side Authorization Layer

### Description
Enforce the approved authorization matrix (Requester / IT Staff / Administrator) and ownership rules at the backend for every protected endpoint, old and new.

### Scope
- Role-based and ownership-based authorization middleware/guards applied across all Lab 2 and Lab 3 endpoints
- Authenticated-identity-determines-ownership enforcement (server ignores client-supplied `requesterId`)
- Safe, non-leaking error responses distinguishing unauthenticated / forbidden / invalid input / not-found / conflict / server error

### Depends on
- Issue #4

### Labels
`implement`, `backend`, `security`

### Branch
`feature/lab3-authorization`

### Definition of Done
- [ ] Failing authorization tests written first, then implemented
- [ ] AC-03, AC-04 pass; direct API authorization evidence captured
- [ ] No endpoint leaks existence of another user's protected resource
- [ ] Completion Review passed
- [ ] PR merged into `lab3-staging`

---

## Issue #6: Implement — Requester Regression & Public Comments

### Description
Re-point all Lab 2 Requester screens at the authenticated identity, remove the Dev Requester selector, and add Public Comments plus "Problem Appears Resolved" to Ticket Detail.

### Scope
- Remove Development Requester Selection screen and Change Requester action
- Create Ticket / My Tickets / Ticket Detail / Attachments continue working, now scoped to `req.user`
- Public Comment posting (Requester-visible) + "Problem Appears Resolved" action (does not change formal status) per BR-05

### Depends on
- Issue #4, #5

### Labels
`implement`, `backend`, `frontend`

### Branch
`feature/lab3-requester-regression`

### Definition of Done
- [ ] Failing tests written first, then implemented
- [ ] Full Lab 2 regression suite still passes
- [ ] Requester cannot set formal Resolved/Closed status (tested)
- [ ] Completion Review passed
- [ ] PR merged into `lab3-staging`

---

## Issue #7: Implement — IT Staff Ticket Queue

### Description
Build the shared Ticket Queue that IT Staff use to locate and prioritize work.

### Scope
- `GET` queue endpoint with search, filters, sorting, pagination per `api-spec.md`
- Ticket Queue screen: desktop table + smaller-screen representation per `ui-spec.md`
- Loading, empty, no-results, forbidden, and failure states
- Open-Ticket-Detail action

### Depends on
- Issue #5

### Labels
`implement`, `backend`, `frontend`

### Branch
`feature/lab3-staff-queue`

### Definition of Done
- [ ] Failing tests written first, then implemented
- [ ] Non-IT-Staff/Admin access rejected (tested)
- [ ] All Queue ACs pass; responsive behavior verified
- [ ] Completion Review passed
- [ ] PR merged into `lab3-staging`

---

## Issue #8: Implement — IT Staff Ticket Detail Operations

### Description
Extend the Ticket Detail screen with IT Staff operations: ownership, IT Priority, status workflow, Public Comments, and Internal Notes.

### Scope
- Claim / assign / reassign Ticket ownership endpoint
- Update IT Priority and permitted status transitions per the transition matrix
- Create/retrieve Public Comments and Internal Notes (Internal Notes restricted to IT Staff/Admin)
- IT Staff Ticket Detail screen: visually distinct Public Comments vs Internal Notes, existing Attachments preserved

### Depends on
- Issue #5, #7

### Labels
`implement`, `backend`, `frontend`

### Branch
`feature/lab3-staff-ticket-ops`

### Definition of Done
- [ ] Failing tests written first, then implemented
- [ ] Status transition matrix enforced and tested (invalid transitions rejected)
- [ ] Internal Notes never returned to Requester role (tested, ties to AC-04)
- [ ] Completion Review passed
- [ ] PR merged into `lab3-staging`

---

## Issue #9: Implement — Administrator User Management

### Description
Build the minimalist Administrator screen for managing user accounts.

### Scope
- User list endpoint with search by name/email and optional role filter
- Create user (name, email, one role, active state, initial password)
- Edit user (name, email, role, active state), set new initial password
- Duplicate-email rejection, invalid-role rejection, prevent self-deactivation, prevent removing/deactivating the last active Administrator
- Admin User Management screen per `ui-spec.md`

### Depends on
- Issue #5

### Labels
`implement`, `backend`, `frontend`, `admin`

### Branch
`feature/lab3-admin-users`

### Definition of Done
- [ ] Failing tests written first, then implemented
- [ ] All Admin safety rules (duplicate email, self-deactivation, last-admin) covered by tests
- [ ] Non-Administrator access rejected (tested)
- [ ] Completion Review passed
- [ ] PR merged into `lab3-staging`

---

## Issue #10: Completion Review — Audit Against Contract

### Description
Run the AI Coding Agent's "Completion Review" audit against every Acceptance Criterion and planned test across all implemented features (#3–#9), before accepting any of them as done.

### Scope
- Audit the implementation against every acceptance criterion and planned test; report missing evidence, skipped tests, untested failure states, and UI-spec deviations
- Fix everything flagged
- Re-run full test suite (unit, API, UI, authorization, migration/regression, E2E) and confirm all pass with no skips/disables
- Capture responsive/accessibility screenshots (desktop/tablet/mobile) for all major Lab 3 screens

### Depends on
- Issues #3, #4, #5, #6, #7, #8, #9 all merged

### Labels
`review`, `testing`

### Branch
`feature/lab3-completion-review`

### Definition of Done
- [ ] No skipped/disabled/flaky tests remain
- [ ] Every AC has passing, traceable test evidence
- [ ] UI matches `ui-spec.md` (verified via screenshots at 3 viewports)
- [ ] Findings and fixes documented
- [ ] Changes merged into `lab3-staging`

---

## Issue #11: Integration, Release & Submission

### Description
Finalize `lab3-staging`, release to `main`, and assemble the required submission evidence.

### Scope
- Merge all implementation work into `lab3-staging`, resolve integration issues
- Full regression run (unit, API, UI, authorization, migration, E2E, visual checks) on `lab3-staging`
- Open release PR: `lab3-staging` → `main`
- Write `docs/lab-03/ai-use.md` (LLM used, 6–10 key prompts, reflection)
- Collect all required screenshots (auth flow, staff queue, staff ticket detail, admin user management, responsive views)
- Assemble final PDF using "Answer Part 1" – "Answer Part 9" format

### Depends on
- Issue #10

### Labels
`release`, `submission`

### Branch
`release/lab3-staging-to-main`

### Definition of Done
- [ ] All Kanban issues in `Done`
- [ ] Release PR from `lab3-staging` to `main` merged
- [ ] `ai-use.md` complete
- [ ] All required screenshots collected and readable
- [ ] Final PDF assembled with all 9 parts in order
- [ ] Submitted

---

## Full Phase-Level Issue Table

| Issue | Phase | Depends on |
|---|---|---|
| #0 | Setup | Lab 2 done |
| #1 | AI Specification Agent | #0 |
| #2 | Review Contract | #1 |
| #3 | Implement — Data Model, Migration & Seed | #2 |
| #4 | Implement — Authentication Foundation | #2, #3 |
| #5 | Implement — Authorization Layer | #4 |
| #6 | Implement — Requester Regression & Public Comments | #4, #5 |
| #7 | Implement — IT Staff Ticket Queue | #5 |
| #8 | Implement — IT Staff Ticket Detail Operations | #5, #7 |
| #9 | Implement — Administrator User Management | #5 |
| #10 | Completion Review | #3, #4, #5, #6, #7, #8, #9 |
| #11 | Integration, Release & Submission | #10 |
