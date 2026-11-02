# TokTickIT — Sprint 4 Engineering Specification

`docs/lab-04/specification.md`

---

## 1. Sprint Goal

Sprint 4 completes the TokTickIT service-desk workflow by adding Actions Taken records under each Ticket, finalizing and backend-enforcing the full Ticket status/resolution lifecycle, delivering role-appropriate dashboards for Requesters and IT Staff, and hardening the complete application built across Labs 1–3 for final demonstration.

## 2. Stakeholder Request (Interpretation)

The product now receives tickets and lets IT Staff talk to Requesters, but there's still no durable record of the actual work performed. IT Staff need to log discrete units of work — Actions Taken — against a ticket, each capturing what was done, the result, whether follow-up is needed, and where to find supporting evidence (attachments). The Ticket Owner still coordinates the ticket overall, but any IT Staff member may log an action on it. Requesters keep their existing "problem appears resolved" signal, but that remains advisory — only IT Staff formally resolve a ticket. On top of this, both Requesters and IT Staff need a quick-glance dashboard summarizing what needs attention, without replacing their existing detailed list screens. Finally, the whole application — everything built in Labs 1 through 3 — needs a final pass to remove rough edges and confirm nothing has regressed.

## 3. Scope

### 3.1 Included
- Actions Taken: create, assign, and transition (complete/cancel) by IT Staff/Administrator; content is append-only (never edited or deleted) once created; read-only visibility for Requesters on owned tickets
- Administrator performs IT Staff ticket operations in Lab 4 (see decision D-3)
- Full Ticket status-transition matrix, backend-enforced regardless of client
- Backend-enforced resolution gate (Requester's "problem appears resolved" never auto-resolves)
- Optimistic concurrency / stale-update detection on Ticket workflow changes
- Requester dashboard and IT Staff dashboard (Administrator reuses IT Staff dashboard)
- Database migration preserving all Lab 1–3 data, with backfill behavior for legacy tickets
- Final hardening: regression, accessibility, duplicate-submission prevention, UI cleanup

### 3.2 Explicitly Excluded
- Automatic SLA clocks, escalation engines, on-call scheduling, breach notifications
- Email, SMS, LINE, push, or other external notification services
- Inventory/spare-parts management, purchasing, or service cost accounting
- Time-sheet billing, payroll, or labor-cost calculation
- Multi-level approval workflows and electronic signatures
- Advanced BI tools, custom report builders, export warehouses
- Multi-tenant organizations and production-scale cloud operations
- Any feature not explicitly approved in this contract

## 4. Functional Requirements

**Actions Taken**
- FR-01: IT Staff and Administrator shall be able to create an Actions Taken record on any ticket they can access.
- FR-02: IT Staff and Administrator shall be able to reassign an Actions Taken record's assignee, and transition its status to Completed or Cancelled, on an accessible ticket. The record's content (description, result, follow-up fields) is never editable after creation (BR-06).
- FR-03: A Requester shall be able to view all Actions Taken records on their own owned tickets, read-only.
- FR-04: The system shall record the creating user as "Performed by" automatically from the authenticated session, never from client input.
- FR-05: The system shall require a Follow-up Note whenever Follow-Up Required is set to true, and reject the record otherwise.
- FR-06: A single Ticket may have zero, one, or many Actions Taken records, independent of its current Ticket Owner.
- FR-17: Each Actions Taken record may be assigned to an active IT Staff member or Administrator (assignee); inactive users cannot be assigned.
- FR-18: Each Actions Taken record has a status (Planned, Completed, Cancelled); IT Staff/Administrator can complete or cancel a Planned record.
- FR-19: Administrators shall be able to perform every IT Staff ticket operation (queue, ticket detail, owner/priority/status changes, public comments, internal notes, Actions Taken, staff dashboard). This supersedes the Lab 3 strict-separation rule.

**Ticket Workflow**
- FR-07: The system shall enforce the full 8-status transition matrix (New, Open, In Progress, Waiting for Requester, Resolved, Closed, Reopened, Cancelled) at the API layer regardless of UI state.
- FR-08: The system shall reject any status change to Resolved or Closed that is not performed by IT Staff or Administrator.
- FR-09: A Requester's "problem appears resolved" indicator shall never, by itself, change the Ticket's formal status.
- FR-10: The system shall detect and safely reject a workflow update made against stale Ticket data (optimistic concurrency).

**Dashboards**
- FR-11: The system shall provide a Requester dashboard scoped exclusively to the authenticated Requester's own tickets.
- FR-12: The system shall provide an IT Staff dashboard showing unassigned tickets, tickets owned by the current user, tickets by status/IT Priority, and recently updated tickets.
- FR-13: Every dashboard metric shall be calculated by the backend from authoritative data, with a defined, documented query.
- FR-14: Every dashboard card with a non-zero count shall provide a drill-down link to the correctly filtered detail view.

**Hardening**
- FR-15: All Lab 1–3 functionality (authentication, Requester ticket flows, IT Staff queue/detail, comments, notes, attachments, Administrator user management) shall continue to function identically after the Lab 4 migration.
- FR-16: The system shall prevent duplicate record creation from repeated clicks or network retries on create/update actions.

## 5. Business Rules

| BR ID | Rule |
|---|---|
| BR-01 | An Actions Taken record belongs to exactly one Ticket. |
| BR-02 | The Ticket Owner coordinates the Ticket as a whole, but an Actions Taken record may be authored by any IT Staff member with access to the ticket, not only the Owner. |
| BR-03 | Requesters may never create or modify an Actions Taken record, under any condition. |
| BR-04 | "Performed by" on an Actions Taken record is set from the authenticated session at creation time and is immutable afterward. |
| BR-05 | Follow-up Note is required if and only if Follow-Up Required is true; an empty or whitespace-only Follow-up Note is rejected when required. |
| BR-06 | Actions Taken content (description, result, followUpRequired, followUpNote, attachmentNotes) is **fully append-only**: immutable once created, with no edit/update endpoint. `performedBy`, `ticketId`, and `createdAt` are likewise immutable. Only `assigneeId` (via reassignment) and `status` (via Complete/Cancel) can change after creation, each through its own endpoint, not a content edit. Every such change increments `version`; a stale request is rejected with 409. A content correction is made by adding a new record, never by editing the old one. |
| BR-07 | A Ticket's formal status may only be changed by IT Staff or Administrator, following the approved transition matrix. |
| BR-08 | An attempted status transition not present in the approved matrix is rejected with a safe 400 error, regardless of caller. |
| BR-09 | A Requester's "problem appears resolved" flag is advisory metadata only; it never triggers an automatic status change. |
| BR-10 | A workflow-changing request (status, priority, ownership) that targets stale data (based on a version check) is rejected with a safe 409 conflict response, not silently overwritten. |
| BR-11 | The Requester dashboard returns only tickets and counts owned by the authenticated Requester; no cross-Requester data leakage. |
| BR-12 | The IT Staff dashboard "owned by current user" metric reflects `ownerId` equal to the authenticated session user, never a client-supplied id. |
| BR-13 | Every dashboard metric has one documented backend query; the frontend never recomputes an authoritative count independently. |
| BR-14 | Migrating to Lab 4 must not delete or corrupt any Lab 1–3 data; legacy tickets without Actions Taken display an empty, not broken, Actions Taken section. |
| BR-15 | An assignee must be an active IT Staff or Administrator user at the time of assignment; assigning an inactive, non-existent, or Requester user is rejected with 400. An assignee who is later deactivated keeps the historical record. |
| BR-16 | Action status transitions: Planned → Completed and Planned → Cancelled only. Completed and Cancelled are terminal. Completing sets `completedAt` (server time). Status changes are rejected with 400 if not in this list. |
| BR-17 | Administrator may perform every IT Staff ticket operation. Requester-only operations (create ticket, My Tickets, attachment upload/remove, problem-appears-resolved toggle) remain Requester-only. |
| BR-18 | Creating or editing an Actions Taken on a Closed or Cancelled ticket is rejected with 400 (INVALID_STATE). |

## 6. UI Specification Summary

Full visual, responsive, and interaction detail lives in `ui-spec.md`. Summary:
- **Navigation & Shell**: Role-appropriate dashboards (`/dashboard`) added for Requester, IT Staff, and Administrator as default landings. Active page indicated by underline and `aria-current="page"`.
- **IT Staff Dashboard**: 5 primary metric cards (New, Open, In Progress, Waiting for Requester, My Owned), 3 attention cards (Unassigned, Urgent, Requester Resolved pending verification), recent/urgent ticket lists, and quick actions. Every non-zero metric card links directly to the pre-filtered Queue.
- **Requester Dashboard**: 4 metric cards (Active Tickets, Waiting for You with non-color "Needs your attention" cue, Resolved, Closed), recently updated/resolved lists, and drill-down links to pre-filtered My Tickets.
- **Actions Taken on Ticket Detail**: Integrated tab/section alongside Comments, Notes, and Attachments. Supports list/table view, an inline create panel with character counters, dynamic follow-up validation, and staff-only Reassign and Complete/Cancel controls. Content is strictly append-only (no edit or delete controls). Requesters view all Actions Taken read-only with no create/edit controls rendered.
- **Ticket Workflow Controls**: Status action bar shows only valid transitions per §6.1; all workflow mutations require `expectedVersion` and provide safe conflict (409) feedback.
- **Theme & Accessibility**: Preserves Zen Green design tokens, keyboard focus ring (`0 0 0 3px rgba(11,122,70,0.25)`), accessible card names ("label: value. action"), touch targets ≥ 40px, and zero horizontal page scrolling at 375px.

### 6.1 Ticket Status Transition Matrix

(Continuation of the matrix approved in Lab 3 §7; unchanged unless the team identifies a gap during Sprint 4 review.)

| From → To | Permitted roles | Notes |
|---|---|---|
| New → Open | IT Staff | Typically on first claim |
| Open → In Progress | IT Staff | Work has started |
| In Progress → Waiting for Requester | IT Staff | Awaiting Requester input |
| Waiting for Requester → In Progress | IT Staff | Requester responded |
| In Progress / Waiting for Requester → Resolved | IT Staff | Formal resolution; backend-enforced regardless of client |
| Resolved → Closed | IT Staff | Final close |
| Resolved → Reopened | IT Staff | Issue recurred |
| Closed → Reopened | IT Staff | Issue recurred after close |
| New / Open / In Progress → Cancelled | IT Staff | No longer needed |

Any transition not listed is rejected (BR-08). A Requester never changes formal status (BR-07, BR-09).

> **Decision D-3 (adopted):** per Lab 4 §4.3, the Administrator performs IT Staff behavior. Wherever a row above says IT Staff, Administrator is also permitted (BR-17). This is simply the Lab 4 rule, evaluated on its own terms.

### 6.2 Authorization Matrix (Actions Taken)

| Capability | Requester | IT Staff | Administrator |
|---|:---:|:---:|:---:|
| View Actions Taken on owned/accessible ticket | ✅ (own ticket, read-only) | ✅ (any accessible ticket) | ✅ |
| Create Actions Taken | ❌ (403) | ✅ | ✅ |
| Edit Actions Taken content | ❌ | ❌ (no endpoint — append-only, BR-06) | ❌ (no endpoint — append-only, BR-06) |
| Assign / complete / cancel an action | ❌ (403) | ✅ (per BR-15, BR-16) | ✅ (per BR-15, BR-16) |
| View Ticket status | ✅ (own ticket) | ✅ | ✅ |
| Change Ticket status | ❌ | ✅ (per transition matrix) | ✅ (per transition matrix, BR-17) |
| View dashboards | ✅ (own scope) | ✅ (own scope) | ✅ (reuses IT Staff dashboard) |

## 7. Data Changes

- **ActionTaken**: id, ticketId (FK → Ticket), performedById (FK → User, server-set, immutable), assigneeId (nullable FK → User), status (enum `PLANNED | COMPLETED | CANCELLED`, default `PLANNED`), actionDateTime, completedAt (nullable), description, result, followUpRequired (boolean), followUpNote (nullable, required when followUpRequired = true), attachmentNotes (nullable text), version (integer, default 0), clientRequestId (string, supports idempotent create), createdAt, updatedAt. Unique constraint on (`ticketId`, `clientRequestId`).
- **Ticket**: add a `version` integer for optimistic concurrency on workflow-changing updates.
- Existing User, Ticket, Attachment, PublicComment, InternalNote models remain unchanged in shape.
- Indexes: new indexes on `ActionTaken.ticketId` (list queries) and `ActionTaken.assigneeId` / `performedById` (dashboard "my actions"); existing `Ticket.ownerId` and `Ticket.currentStatus` indexes from Lab 3 support dashboard queries.

### 7.1 Justified Database-Design Decisions
1. **Optimistic concurrency via a `version` column rather than row-level locking.** The application is low-concurrency (a single service desk team), and a version check gives clear, testable conflict responses without the operational complexity of DB-level locking.
2. **`ActionTaken.performedById` is immutable after creation (BR-04).** This preserves an accurate audit trail; if a correction is needed, a new Actions Taken record is added rather than editing authorship.
3. **Action status as a small Postgres enum rather than a reference table.** The three states and their two transitions are fixed by this contract, so an enum keeps queries simple and invalid values impossible at the database level; a reference table would add joins with no benefit.
4. **Content fields append-only, with assignment and status as separate narrow endpoints rather than one generic PATCH.** This keeps the "no content edit" rule (BR-06) enforceable at the API surface itself — there is no endpoint capable of changing `description`/`result` — while still allowing the operational changes (assign, complete, cancel) the rubric requires.

### 7.2 Migration and Backfill
1. Create the `ActionTaken` table and the `version` column on `Ticket` (default 0 for all existing rows).
2. No backfill is needed for `ActionTaken` — legacy tickets start with zero records, which the UI renders as an empty state, not an error.
3. Verify via regression test that every Lab 1–3 ticket, attachment, comment, and note is unchanged in count and content after migration.
4. Document and test a recovery approach (e.g., restore from a pre-migration database dump) as required by the handout.
5. Idempotent seed data: extends seed to cover tickets across all statuses, priorities, and ownership states, with tickets having zero, one, and multiple Actions Taken, plus zero and non-zero dashboard scenarios for each role (including a Requester with 0 tickets and an IT Staff with 0 owned tickets to verify empty dashboard states).

## 8. API Contract

Full detail lives in `api-spec.md`. Summary of endpoint groups:

- `POST /api/tickets/:id/actions` (create), `PATCH /api/tickets/:id/actions/:actionId/assign` (reassign), `PATCH /api/tickets/:id/actions/:actionId/status` (complete/cancel) — IT Staff/Admin only, content append-only
- `GET /api/tickets/:id/actions` — list (Requester: own ticket only, read-only; IT Staff/Admin: any accessible ticket)
- `GET /api/dashboard/requester` — Requester dashboard metrics
- `GET /api/dashboard/staff` — IT Staff dashboard metrics (Administrator reuses)
- Existing `PATCH /api/staff/tickets/:id/status`, `PATCH /api/staff/tickets/:id/owner`, and `PATCH /api/staff/tickets/:id/priority` extended to require `expectedVersion` and return `409 Conflict` on stale-version updates
- Existing `GET /api/staff/tickets` extended with optional `requesterResolved=true|false` filter for dashboard drill-down; `GET /api/tickets` extended to accept comma-separated `status` values

## 9. Acceptance Criteria

| ID | Criterion |
|---|---|
| AC-01 | Given a permitted IT Staff user and valid data, when an Actions Taken is created, then it is saved under the correct Ticket with the authenticated creator as "Performed by". |
| AC-02 | Given an authenticated Requester, when dashboard data is retrieved, then only metrics and recent Tickets owned by that Requester are returned. |
| AC-03 | Given a Requester, when they attempt to create an Actions Taken via direct API call, then the request is rejected with 403 Forbidden. |
| AC-04 | Given Follow-Up Required is true, when the Actions Taken is submitted without a Follow-up Note, then the request is rejected with 400 Bad Request. |
| AC-05 | Given a Ticket in status New, when a direct API call attempts to set status to Resolved, then the transition is rejected as invalid. |
| AC-06 | Given two IT Staff users working on the same Ticket, when the second save targets stale data, then the server rejects it with 409 Conflict rather than silently overwriting the first change. |
| AC-07 | Given a Requester marks "problem appears resolved," when the flag is set, then the Ticket's formal status remains unchanged. |
| AC-08 | Given an IT Staff user, when they open their dashboard, then unassigned tickets, their own owned tickets, and status/priority breakdowns are shown, each matching a direct database query. |
| AC-09 | Given a dashboard card with a non-zero count, when the user activates it, then they land on the correctly filtered detail view. |
| AC-10 | Given a legacy Lab 3 ticket with no Actions Taken, when its detail page is opened, then the Actions Taken section renders an empty state, not an error. |
| AC-11 | Given the full Lab 1–3 regression suite, when it is run after the Lab 4 migration, then every previously passing test still passes. |
| AC-12 | Given a Requester viewing their own ticket, when the ticket has Actions Taken, then all records are visible read-only with no create/edit controls rendered. |
| AC-13 | Given a Requester, when they request another Requester's ticket Actions Taken via direct API call, then the response is 404 Not Found (no existence leak). |
| AC-14 | Given a user double-clicks the create control or the client retries after a network error, when the request is processed, then exactly one Actions Taken record is created. |
| AC-15 | Given an inactive user, a Requester, or a non-existent user as assignee, when an Actions Taken is created or assigned, then the request is rejected with 400 and nothing is saved. |
| AC-16 | Given a Planned action, when IT Staff completes or cancels it, then its status changes (and `completedAt` is set when completed); given a Completed or Cancelled action, when any further status change is attempted, then it is rejected with 400. |
| AC-17 | Given an Administrator, when they use the staff queue, ticket detail, status/owner/priority changes, comments, notes, and Actions Taken, then the operations succeed as for IT Staff; given the same Administrator calls a Requester-only endpoint, then it is rejected with 403. |
| AC-18 | Given a ticket whose status is Closed or Cancelled, when an Actions Taken is created or edited, then the request is rejected with 400 INVALID_STATE. |

## 10. Definition of Done

- [ ] All FR/BR/AC in this document map to at least one passing, automated test with a real file path in `tests.md`
- [ ] Every Actions Taken and workflow write endpoint enforces its role/ownership rule server-side (tested, not just hidden in UI)
- [ ] Full Lab 1–3 regression suite passes unmodified in behavior
- [ ] Migration verified against pre-Lab-4 data with no data loss; recovery approach documented and tested
- [ ] Every dashboard metric cross-checked against a direct database query, not just UI display
- [ ] Optimistic concurrency conflict path tested end-to-end
- [ ] Any Lab 3 test updated because of decision D-3 (Administrator now allowed where it was 403) is listed with its reason in `reviewer.md`; no other Lab 1–3 test is modified
- [ ] UI matches `ui-spec.md` at desktop, tablet, and mobile widths
- [ ] `reviewer.md` shows human review/approval for every merged PR
- [ ] `ai-use.md` completed with 6–10 key prompts and a reflection

## 11. Assumptions and Decisions

- **D-1 (adopted)**: the grading rubric for the Actions Taken UI lists assign, status transition, complete, cancel, and inactive-assignee rejection, although the handout field list does not. We include `assigneeId` and a Planned/Completed/Cancelled status (BR-15, BR-16). This is an interpretation to confirm with the TA/instructor; if they say it is not wanted, the fields can be hidden without a schema rollback.
- **D-2 (adopted)**: Actions Taken content is fully append-only — no edit endpoint for description/result/follow-up fields, ever. Only assignment and status (Complete/Cancel) can change, through dedicated endpoints, and only those two things. The handout's "view/edit mode" is satisfied by assign/complete/cancel plus the create form, not by content editing.
- **D-3 (adopted)**: Administrator performs IT Staff behavior (BR-17, FR-19), as the Lab 4 rule in its own right.
- Optimistic concurrency uses a `version` counter on `Ticket` rather than `updatedAt` comparison, for simpler, unambiguous conflict detection.
- "Recently updated" and "recently resolved" dashboard lists use a strict rolling 7-day window (last 168 hours: `updatedAt >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)`) evaluated in UTC in backend queries, max 5 items, sorted by `updatedAt DESC`. Timestamps are formatted in `Asia/Bangkok` (UTC+7) in UI presentation.
- The Administrator dashboard reuses the IT Staff dashboard endpoint, with an optional concise user-account-count card, per §4.6 of the handout.

