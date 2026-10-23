# TokTickIT — Sprint 4 Test Plan

`docs/lab-04/tests.md`

Planned **before** implementation. The **Final** column stays `Planned` until a test is verified from raw terminal/log output; only then is it changed to `Pass`. Test counts are never recorded from memory — only from raw output.

---

## 1. Commands

| Suite | Command (from folder) |
|---|---|
| Server (API, authorization, migration, regression) | `cd server && npx vitest run --reporter=verbose --no-color` |
| Client (UI components) | `cd client && npx vitest run --reporter=verbose --no-color` |
| E2E | `cd e2e && npx playwright test lab-04` |
| Type check | `npx tsc --noEmit` in `server/`, `client/`, `e2e/` |

## 2. Planned Tests

| Test ID | Type | Req / AC | What It Tests | Expected Result | Automated Test File | Final |
|---|---|---|---|---|---|---|
| ACT-API-01 | API | AC-01, FR-01, FR-04 | IT Staff creates a valid Action Taken | 201; saved under the correct ticket; `performedBy` = session user | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| ACT-API-02 | API | AC-01, BR-04 | Client-supplied `performedById` ignored | Stored author is the session user | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| ACT-API-03 | API | AC-04, BR-05 | `followUpRequired=true` without note (missing / whitespace) | 400 with field error on `followUpNote` | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| ACT-API-04 | API | BR-05 | `followUpRequired=false` with no note | 201 | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| ACT-API-05 | API | FR-01 | Field validation (empty/oversized description, result, attachmentNotes; future date) | 400 per field rule | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| ACT-API-06 | API | AC-14, FR-16 | Same `Idempotency-Key` sent twice | One record; second call returns the original (200) | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| ACT-API-07 | API | FR-16 | Missing `Idempotency-Key` | 400 | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| ACT-API-08 | API | FR-06, BR-01, BR-02 | Two different IT Staff add actions to a ticket owned by a third | Both saved; list shows both authors; ordering stable | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| ACT-API-09 | API | BR-06, AC-06 | Reassign and Complete/Cancel each with a stale `expectedVersion` | 409 and nothing written | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| ACT-API-10 | API | BR-04, BR-06 | No endpoint accepts `description`, `result`, `followUpRequired`, `followUpNote`, or `attachmentNotes` after creation (reassign/status endpoints reject these fields or ignore them); `performedBy`/`ticketId`/`createdAt` unchanged | Content provably immutable | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| ACT-API-11 | API | AC-10, BR-14 | List on a legacy ticket with no actions | 200 with `items: []` | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| ACT-API-12 | API | AC-12, FR-03 | Requester lists actions on own ticket | 200, full list | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| ACT-API-13 | API | AC-15, BR-15 | Assignee inactive / non-existent / Requester | 400; nothing saved | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| ACT-API-14 | API | AC-16, BR-16 | Complete and cancel a Planned action; invalid status changes (Completed→Planned, Cancelled→Completed) | 200 with `completedAt` set / 400 | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| ACT-API-15 | API | AC-18, BR-18 | Create and edit on a Closed and a Cancelled ticket | 400 INVALID_STATE | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| ACT-API-16 | API | BR-06 | No DELETE route anywhere; reassign/status on a Completed/Cancelled record is rejected | 404/405; 400 INVALID_STATE | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| ACT-AUTHZ-01 | Authorization | AC-03, BR-03 | Requester POST and PATCH actions | 403 on both | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| ACT-AUTHZ-02 | Authorization | AC-13 | Requester lists actions on another Requester's ticket | 404 (no existence leak) | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| ACT-AUTHZ-03 | Authorization | Lab 3 BR-03 | Unauthenticated and `mustChangePassword` users on all action endpoints | 401 / 403 | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| ACT-AUTHZ-04 | Authorization | Matrix §6.2, AC-17 | Administrator create/update/assign/complete/view actions | Allowed | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| ADM-AUTHZ-01 | Authorization | AC-17, FR-19, BR-17 | Administrator uses staff queue/detail, owner/priority/status, comments, notes | 200 | `server/tests/lab-04/ticket-workflow.api.test.ts` | Planned |
| ADM-AUTHZ-02 | Authorization | AC-17, BR-17 | Administrator on Requester-only endpoints (create ticket, My Tickets, attachment upload/remove, resolve-indicator, requester dashboard) | 403 | `server/tests/lab-04/ticket-workflow.api.test.ts` | Planned |
| WF-API-01 | Workflow | FR-07, BR-08 | Every valid transition in the matrix (all 8 statuses) | 200; `version` +1 | `server/tests/lab-04/ticket-workflow.api.test.ts` | Planned |
| WF-API-02 | Workflow | AC-05, BR-08 | Every invalid transition (e.g. New→Resolved, Closed→Open, from Cancelled) | 400; status unchanged | `server/tests/lab-04/ticket-workflow.api.test.ts` | Planned |
| WF-API-03 | Workflow | FR-08, BR-07 | Requester tries to set Resolved/Closed by direct API | 403 | `server/tests/lab-04/ticket-workflow.api.test.ts` | Planned |
| WF-API-04 | Workflow | AC-07, BR-09 | Requester toggles "problem appears resolved" | 200; `status` and `version` unchanged | `server/tests/lab-04/ticket-workflow.api.test.ts` | Planned |
| WF-API-05 | Workflow | AC-06, BR-10 | Two writers, second uses stale `expectedVersion` (status, owner, priority) | Second gets 409 with `current` state; first change preserved | `server/tests/lab-04/ticket-workflow.api.test.ts` | Planned |
| WF-API-06 | Workflow | FR-10 | Missing `expectedVersion` | 400 | `server/tests/lab-04/ticket-workflow.api.test.ts` | Planned |
| WF-API-07 | Workflow | Lab 3 BR-12/13/14 | Owner must be active staff/admin; `requestedPriority` never changes | 400 / unchanged | `server/tests/lab-04/ticket-workflow.api.test.ts` | Planned |
| RDASH-API-01 | API | AC-02, FR-11 | Requester dashboard returns only own metrics and lists | Matches seeded counts for that Requester | `server/tests/lab-04/requester-dashboard.api.test.ts` | Planned |
| RDASH-API-02 | Authorization | BR-11 | Another Requester's tickets never appear; client `requesterId` ignored | No cross-user data | `server/tests/lab-04/requester-dashboard.api.test.ts` | Planned |
| RDASH-API-03 | API | FR-13 | Each metric equals a direct DB count (`prisma.ticket.count`) | Equal for every metric | `server/tests/lab-04/requester-dashboard.api.test.ts` | Planned |
| RDASH-API-04 | API | AC-09 | `GET /api/tickets?<drillDown>` total equals card count (incl. comma-separated `status`) | Equal | `server/tests/lab-04/requester-dashboard.api.test.ts` | Planned |
| RDASH-API-05 | API | FR-13 | Requester with zero tickets | All counts 0, empty lists, 200 | `server/tests/lab-04/requester-dashboard.api.test.ts` | Planned |
| RDASH-API-06 | Authorization | Matrix | IT Staff / Admin / unauthenticated | 403 / 403 / 401 | `server/tests/lab-04/requester-dashboard.api.test.ts` | Planned |
| SDASH-API-01 | API | AC-08, FR-12 | Staff dashboard metrics (byStatus incl. all 8 keys, unassigned, myOwned, byItPriority, requesterResolvedPending, myFollowUps) | Match seed | `server/tests/lab-04/staff-dashboard.api.test.ts` | Planned |
| SDASH-API-02 | API | BR-12 | `myOwned` uses session user, not client input | Correct per user | `server/tests/lab-04/staff-dashboard.api.test.ts` | Planned |
| SDASH-API-03 | API | FR-13, AC-08 | Each metric equals a direct DB count | Equal for every metric | `server/tests/lab-04/staff-dashboard.api.test.ts` | Planned |
| SDASH-API-04 | API | AC-09 | `GET /api/staff/tickets?<drillDown>` total equals card count (incl. `requesterResolved` filter) | Equal | `server/tests/lab-04/staff-dashboard.api.test.ts` | Planned |
| SDASH-API-05 | API | FR-13 | Empty system / user with nothing assigned | Zeros and empty lists | `server/tests/lab-04/staff-dashboard.api.test.ts` | Planned |
| SDASH-API-06 | Authorization | Matrix | Requester / unauthenticated | 403 / 401; Admin allowed | `server/tests/lab-04/staff-dashboard.api.test.ts` | Planned |
| PERF-01 | Performance-smoke | FR-13 | Both dashboard endpoints on seed data | Respond < 500 ms (smoke threshold, 3-run median) | `server/tests/lab-04/staff-dashboard.api.test.ts` | Planned |
| MIG-01 | Migration | AC-11, BR-14 | Row counts and contents of Users, Tickets, Attachments, Comments, Notes identical before/after Lab 4 migration | Identical | `server/tests/lab-04/migration.test.ts` | Planned |
| MIG-02 | Migration | BR-14 | Existing tickets get `version = 0`; zero actions | As specified | `server/tests/lab-04/migration.test.ts` | Planned |
| MIG-03 | Migration | §8.2 | Seed is idempotent (run twice) with tickets having 0, 1, many actions and zero/non-zero dashboards | No duplicates/errors | `server/tests/lab-04/migration.test.ts` | Planned |
| MIG-04 | Migration | §8.2 | Documented recovery procedure (restore from dump) verified once | Data restored | `docs/lab-04/specification.md` §8.2 + manual evidence | Planned |
| REG-01 | Regression | AC-11, FR-15 | Entire Lab 1–3 server suite. Any assertion that Administrator gets 403 on a now-IT-Staff-accessible endpoint is updated to match the Lab 4 rule (D-3); nothing else changes | All pass | `server/tests/lab-01/`, `lab-02/`, `lab-03/` | Planned |
| REG-02 | Regression | AC-11, FR-15 | Entire Lab 1–3 client suite | All pass | `client/tests/lab-01/`, `lab-02/`, `lab-03/` | Planned |
| REG-03 | Regression | FR-15 | Lab 3 E2E (authentication, staff flow, user administration) | All pass | `e2e/lab-03/` | Planned |
| ACT-UI-01 | UI | FR-01, FR-03 | List renders columns, multiple actions in stable order; empty state | As ui-spec §4.1 | `client/tests/lab-04/ActionsTaken.test.tsx` | Planned |
| ACT-UI-02 | UI | AC-04, BR-05 | Follow-up note appears and becomes required when toggle = Yes; inline error; focus to first invalid field | As ui-spec §4.2 | `client/tests/lab-04/ActionsTaken.test.tsx` | Planned |
| ACT-UI-03 | UI | FR-16, AC-14 | Save disables while submitting; double click sends one request; retry reuses key | One request | `client/tests/lab-04/ActionsTaken.test.tsx` | Planned |
| ACT-UI-04 | UI | FR-16 | Failure keeps entered text and shows banner | Text preserved | `client/tests/lab-04/ActionsTaken.test.tsx` | Planned |
| ACT-UI-05 | UI | AC-12, BR-03 | Requester view has no Add/Edit controls rendered | Absent from DOM | `client/tests/lab-04/ActionsTaken.test.tsx` | Planned |
| ACT-UI-06 | UI | BR-06 | No Edit control anywhere (content always read-only); 409 on Reassign/Complete/Cancel shows conflict message; Completed/Cancelled rows show no Reassign/Complete/Cancel controls; no Delete control anywhere | As ui-spec §4.3 | `client/tests/lab-04/ActionsTaken.test.tsx` | Planned |
| ACT-UI-07 | UI | AC-15, AC-16 | Assignee select lists only active staff/admin; Complete/Cancel buttons on Planned rows with cancel confirmation; status badge has text | As ui-spec §4.3–4.4 | `client/tests/lab-04/ActionsTaken.test.tsx` | Planned |
| WF-UI-01 | UI | FR-07, §5 | Buttons shown only for permitted transitions for each of the 8 statuses | Correct sets | `client/tests/lab-04/TicketWorkflow.test.tsx` | Planned |
| WF-UI-02 | UI | §5 | Success refreshes summary badge/owner/priority and announces via `aria-live` | Refreshed | `client/tests/lab-04/TicketWorkflow.test.tsx` | Planned |
| WF-UI-03 | UI | AC-05, AC-06 | 400 and 409 responses show the specified messages; bar re-renders from server state | As ui-spec §5 | `client/tests/lab-04/TicketWorkflow.test.tsx` | Planned |
| WF-UI-04 | UI | AC-07 | Staff see "Requester says resolved — please verify" without status change | Shown | `client/tests/lab-04/TicketWorkflow.test.tsx` | Planned |
| SDASH-UI-01 | UI | FR-12, FR-14 | Cards, lists, and drill-down links render from API data; link params match `drillDown` | As ui-spec §2 | `client/tests/lab-04/StaffDashboard.test.tsx` | Planned |
| SDASH-UI-02 | UI | §2 states | Loading, empty (0), forbidden, failure + Retry | Each state renders | `client/tests/lab-04/StaffDashboard.test.tsx` | Planned |
| SDASH-UI-03 | UI | §2 | Refresh button busy state; admin extra card | As spec | `client/tests/lab-04/StaffDashboard.test.tsx` | Planned |
| RDASH-UI-01 | UI | FR-11, FR-14 | Cards, recent lists, drill-down, "Needs your attention" text cue | As ui-spec §3 | `client/tests/lab-04/RequesterDashboard.test.tsx` | Planned |
| RDASH-UI-02 | UI | §3 states | Loading, empty, forbidden, failure + Retry | Each state renders | `client/tests/lab-04/RequesterDashboard.test.tsx` | Planned |
| NAV-UI-01 | UI | §1 | Role-specific nav links and `aria-current` on active page | Correct per role | `client/tests/lab-04/StaffDashboard.test.tsx` | Planned |
| STYLE-01 | UI style | Zen Green | Tokens, badges, read-only vs editable field styling, Internal Notes amber on new screens | Matches checklist | `artifacts/lab-04/visual-checklist.md` (reviewed against screenshots) | Planned |
| RESP-01 | Responsive | ui-spec §7 | Dashboards and Actions Taken at 1280 / 768 / 375 px: no horizontal page scroll, no clipping/overlap | Pass | `e2e/lab-04/dashboards.spec.ts` | Planned |
| A11Y-01 | Accessibility | ui-spec §7 | Keyboard-only pass: focus order, visible focus, card/row activation, labels, `aria-live` | Pass | `e2e/lab-04/dashboards.spec.ts` | Planned |
| A11Y-02 | Accessibility | ui-spec §7 | Automated axe scan on Dashboards, Ticket Detail with Actions Taken | 0 serious/critical violations | `e2e/lab-04/dashboards.spec.ts` | Planned |
| E2E-01 | E2E | AC-01, AC-04, AC-10 | Staff logs in → opens ticket → adds action (with follow-up) → sees it in list; Requester sees it read-only | Pass | `e2e/lab-04/actions-taken-flow.spec.ts` | Planned |
| E2E-02 | E2E | AC-05, AC-06, AC-07 | Requester marks resolved (status unchanged) → Staff verifies and Resolves → Closes; conflict path with two sessions | Pass | `e2e/lab-04/ticket-resolution.spec.ts` | Planned |
| E2E-03 | E2E | AC-02, AC-08, AC-09 | Dashboards show correct counts; clicking a card lands on the filtered list with equal total | Pass | `e2e/lab-04/dashboards.spec.ts` | Planned |
| TYPE-01 | Static | Hardening | `tsc --noEmit` clean in server, client, e2e | 0 errors | (command in §1) | Planned |

## 3. Acceptance Criteria Traceability

| AC | Covered by |
|---|---|
| AC-01 | ACT-API-01, ACT-API-02, E2E-01 |
| AC-02 | RDASH-API-01, RDASH-API-02, E2E-03 |
| AC-03 | ACT-AUTHZ-01 |
| AC-04 | ACT-API-03, ACT-UI-02, E2E-01 |
| AC-05 | WF-API-02, WF-UI-03, E2E-02 |
| AC-06 | WF-API-05, ACT-API-09, WF-UI-03, E2E-02 |
| AC-07 | WF-API-04, WF-UI-04, E2E-02 |
| AC-08 | SDASH-API-01, SDASH-API-03, E2E-03 |
| AC-09 | RDASH-API-04, SDASH-API-04, SDASH-UI-01, E2E-03 |
| AC-10 | ACT-API-11, MIG-02, E2E-01 |
| AC-11 | REG-01, REG-02, REG-03, MIG-01 |
| AC-12 | ACT-API-12, ACT-UI-05 |
| AC-13 | ACT-AUTHZ-02 |
| AC-14 | ACT-API-06, ACT-UI-03 |
| AC-15 | ACT-API-13, ACT-UI-07 |
| AC-16 | ACT-API-14, ACT-UI-07 |
| AC-17 | ADM-AUTHZ-01, ADM-AUTHZ-02, ACT-AUTHZ-04 |
| AC-18 | ACT-API-15 |

**Coverage rule:** every AC row above must have at least one test whose Final status is `Pass` (verified from raw output) before Issue #8 (Completion Review) can close.

## 4. Decisions already reflected in this plan
- **D-1** (assignee + action status): ACT-API-13, ACT-API-14, ACT-UI-07.
- **D-2** (editable while Planned, never deleted): ACT-API-09, ACT-API-10, ACT-API-16, ACT-UI-06.
- **D-3** (Administrator performs IT Staff behavior): ADM-AUTHZ-01, ADM-AUTHZ-02; any Lab 3 test updated as a result is noted in `reviewer.md`, not tracked as a separate test row.
If the instructor/TA rejects D-1, remove ACT-API-13/14, ACT-UI-07 and AC-15/AC-16 together with the fields; the rest is unaffected.

## 5. Accepted / known items
- React `act(...)` warnings in earlier Lab 3 component tests are non-blocking noise carried over; they must not appear in new Lab 4 tests.
