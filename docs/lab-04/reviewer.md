# Lab 4 - Peer Review Record

**Author:** Chaiyaphoom Chenchirotphiphat — 67070503410 — GitHub: [@maneejames](https://github.com/maneejames)

**Peer Reviewer:** YOTSAPOOM LIUPOLVANISH — 67070503493 — GitHub: [@JEWKEW](https://github.com/JEWKEW)

**Project Board:** [TokTickIT Lab 4 Kanban](https://github.com/users/maneejames/projects/6)

---

## 1. Pull Requests I Authored (Lab 4)

| Issue # | Scope / Feature | Branch | PR Link | Reviewer Verdict | Approval Timestamp | Status |
|---|---|---|---|---|---|---|
| #1 | AI Specification Agent — Engineering Contract | `feature/lab4-spec-doc` | *(Pending PR)* | Pending Review | *(Pending)* | In Progress |
| #2 | Review Contract — Ambiguity Resolution | `feature/lab4-spec-review` | *(Pending PR)* | Pending Review | *(Pending)* | In Progress |
| #3 | Implement — Actions Taken Foundation | `feature/lab4-actions-taken-foundation` | *(Pending)* | Pending Review | *(Pending)* | Backlog |
| #4 | Implement — Actions Taken UI | `feature/lab4-actions-taken-ui` | *(Pending)* | Pending Review | *(Pending)* | Backlog |
| #5 | Implement — Ticket Workflow & Resolution Gate | `feature/lab4-ticket-workflow` | *(Pending)* | Pending Review | *(Pending)* | Backlog |
| #6 | Implement — Role Dashboards | `feature/lab4-dashboards` | *(Pending)* | Pending Review | *(Pending)* | Backlog |
| #7 | Final Hardening & Regression | `feature/lab4-final-hardening` | *(Pending)* | Pending Review | *(Pending)* | Backlog |
| #8 | Completion Review — Audit Against Contract | `feature/lab4-completion-review` | *(Pending)* | Pending Review | *(Pending)* | Backlog |
| #9 | Integration, Release & Submission | `release/lab4-staging-to-main` | *(Pending)* | Pending Review | *(Pending)* | Backlog |

---

## 2. Review Comments I Received and My Responses

### Issue #1: Engineering Contract — `feature/lab4-spec-doc`

- **Branch:** `feature/lab4-spec-doc`
- **Author:** @maneejames
- **Reviewer:** *(Pending)*
- **Review Verdict:** Drafted and verified internally; ready for team review.

**Pre-review Verification Note:**
All four contract documents (`specification.md`, `api-spec.md`, `ui-spec.md`, `tests.md`) were audited and aligned. Inconsistencies resolved:
1. `specification.md` section structure aligned to the 11 required sections from Handout §9 (added explicit §6 UI Specification Summary incorporating the status transition matrix and authorization matrix).
2. `ui-spec.md` §6 checklist corrected to clarify that Internal Notes are visible to IT Staff and Administrators per D-3, and strictly forbidden for Requesters.
3. Every functional requirement (FR-01 to FR-19), business rule (BR-01 to BR-18), and acceptance criterion (AC-01 to AC-18) is mapped to planned automated tests with real file paths.
4. No test pass claims are made in any contract document.

**Final verified state:** Engineering contract baseline verified across `specification.md`, `api-spec.md`, `ui-spec.md`, and `tests.md` with complete internal consistency, 4 justified database design decisions, and 100% AC traceability to planned test files.

---

### Issue #2: Review Contract — `feature/lab4-spec-review`

- **Branch:** `feature/lab4-spec-review`
- **Author:** @maneejames
- **Reviewer:** *(Pending)*
- **Review Verdict:** Pending Review (Contract ambiguities, dependencies, and build order resolved internally; proposed, awaiting reviewer).

**Contract Review Resolutions:**
- **F-01 (Decision D-3 Impact & Test Updates)**: Administrator can perform IT Staff operations (proposed, awaiting reviewer). No new `SUP-01` test row added to `tests.md`. When implementing Issue 5, existing Lab 3 test assertions will be updated as follows:
  - `server/tests/lab-03/comments-notes.api.test.ts:181/188` (`POST /api/tickets/:id/notes` & `GET /notes`): change 403 to 201/200 because Administrator can write and read internal notes per D-3.
  - `server/tests/lab-03/comments-notes.api.test.ts:196/202` (`POST /api/tickets/:id/comments` & `GET /comments`): change 403 to 201/200 because Administrator can write and read public comments per D-3.
  - `server/tests/lab-03/staff-ticket-detail.api.test.ts:150` (`PATCH /api/staff/tickets/:id/owner`): change 403 to 200 because Administrator can claim and assign tickets per D-3.
  - `server/tests/lab-03/staff-ticket-detail.api.test.ts:178` (`PATCH /api/staff/tickets/:id/priority`): change 403 to 200 because Administrator can adjust IT priority per D-3.
  - `server/tests/lab-03/staff-ticket-detail.api.test.ts:206` (`PATCH /api/staff/tickets/:id/status`): change 403 to 200 because Administrator can transition ticket status per D-3.
  - `server/tests/lab-03/staff-queue.api.test.ts:125` (`GET /api/staff/tickets`): change 403 to 200 because Administrator can view the staff queue per D-3.
  - `server/tests/lab-03/authorization.api.test.ts:227-287`: unchanged (Administrator remains 403 on Requester-only endpoints per AC-17 / ADM-AUTHZ-02).
- **F-02 (Workflow `expectedVersion` Concurrency)**: Supply `expectedVersion` matching current `ticket.version` (46 locations identified in `server/tests/lab-03/staff-ticket-detail.api.test.ts` and 3 locations in `client/src/api.ts`); because tests invoke PATCH repeatedly on the same ticket (e.g., priority test loops), a static `expectedVersion: 0` cannot be used across all points (proposed, awaiting reviewer).
- **F-03 (`GET /api/tickets` Status Filter)**: Extended in Issue 5 to accept single or comma-separated list of any valid `TicketStatus` enum values for dashboard drilldown (proposed, awaiting reviewer).
- **F-04 (`GET /api/staff/tickets` Requester Resolved Filter)**: Added optional `requesterResolved=true|false` query param in Issue 5 (proposed, awaiting reviewer).
- **F-05 (Idempotency Key & Storage)**: `Idempotency-Key` header stored in `ActionTaken.clientRequestId` with `@@unique([ticketId, clientRequestId])` (proposed, awaiting reviewer).
- **F-06 (Rolling Window Definition)**: Strict 168-hour window (`updatedAt >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)`) in UTC, displayed in `Asia/Bangkok` (UTC+7) in UI (proposed, awaiting reviewer).
- **F-07 (Seed Data Coverage)**: Idempotent seed includes zero-ticket Requester, zero-owned-ticket IT Staff, and tickets with 0/1/multiple Actions Taken (proposed, awaiting reviewer).

**Confirmed Build Order:**
1. Issue #3: Implement — Actions Taken Foundation (Backend model, migration, seed, CRUD/assign/status API)
2. Issue #4: Implement — Actions Taken UI (Frontend Ticket Detail Actions Taken area)
3. Issue #5: Implement — Ticket Workflow & Resolution Gate (8 statuses, optimistic concurrency, resolution gate, filters)
4. Issue #6: Implement — Role Dashboards (Requester and IT Staff/Admin dashboard endpoints and screens)
5. Issue #7: Final Hardening & Regression (A11y, duplicate prevention, form preservation, full regression pass)

**Final verified state:** Contract review complete, all 7 findings resolved (proposed, awaiting reviewer), Lab 3 test update points documented, and build order confirmed in reviewer.md.
