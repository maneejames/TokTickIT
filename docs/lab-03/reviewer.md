# Lab 3 - Peer Review Record

**Author:** Chaiyaphoom Chenchirotphiphat — 67070503410 — GitHub: [@maneejames](https://github.com/maneejames)

**Peer Reviewer:** YOTSAPOOM LIUPOLVANISH — 67070503493 — GitHub: [@JEWKEW](https://github.com/JEWKEW)

**Project Board:** [TokTickIT Lab 3 Kanban](https://github.com/users/maneejames/projects/4/views/1)

---

## 1. Pull Requests I Authored (Lab 3)

| Issue # | Scope / Feature | Branch | PR Link | Reviewer Verdict | Approval Date | Status |
|---|---|---|---|---|---|---|
| #1 | AI Specification Agent — Engineering Contract | `feature/lab3-spec-doc` | [PR #45](https://github.com/maneejames/TokTickIT/pull/45) | Approved by @JEWKEW | 2026-09-16 | Merged |
| #2 | Review Contract — Ambiguity Resolution | `feature/lab3-spec-review` | [PR #46](https://github.com/maneejames/TokTickIT/pull/46) | Approved by @JEWKEW | 2026-09-16 | Merged |
| #3 | Implement — Data Model, Migration & Seed | `feature/lab3-data-migration` | [PR #47](https://github.com/maneejames/TokTickIT/pull/47) | Approved by @JEWKEW | 2026-09-17 | Merged |
| #4 | Implement — Authentication Foundation | `feature/lab3-auth` | *(Pending PR link)* | *(In Progress)* | *(Pending)* | In Progress |
| #5 | *(Pending)* | *(Pending)* | *(Pending)* | *(Pending)* | *(Pending)* | Not Started |
| #6 | *(Pending)* | *(Pending)* | *(Pending)* | *(Pending)* | *(Pending)* | Not Started |
| #7 | *(Pending)* | *(Pending)* | *(Pending)* | *(Pending)* | *(Pending)* | Not Started |
| #8 | Integration & Release to Main | `release/lab3-staging` -> `main` | *(Pending PR link)* | *(Pending)* | *(Pending)* | Not Started |

---

## 2. Review Comments I Received and My Responses

### Issue #1: Engineering Contract — `feature/lab3-spec-doc`
- **PR:** [PR #45](https://github.com/maneejames/TokTickIT/pull/45)
- **Author:** @maneejames
- **Reviewer:** @JEWKEW
- **Review Verdict:** Approved by @JEWKEW (2026-09-16)
- **Changes Requested:** None. Specifications, contracts, and test plans verified directly against handout requirements.

**Yotsapoom commented:**
> Reviewed the contract documents — specification.md, api-spec.md, ui-spec.md, and tests.md all look complete and well-structured. Every FR/BR/AC is numbered and the authorization matrix is clear. Tests.md traceability table maps every AC to planned test files. Approved.

**I responded:**
> Thank you for the review! Glad the structure is clear. Issue #2 will handle any ambiguities before we start coding.

---

### Issue #2: Review Contract — Ambiguity Resolution — `feature/lab3-spec-review`
- **PR:** [PR #46](https://github.com/maneejames/TokTickIT/pull/46)
- **Author:** @maneejames
- **Reviewer:** @JEWKEW
- **Review Verdict:** Approved by @JEWKEW (2026-09-16)
- **Changes Requested:** Resolved 11 ambiguities including session re-validation strategy, Administrator access to Internal Notes (identified as authorization-matrix contradiction — fixed as strict role separation), Public Comments pagination, status string casing, and migration phase plan.

**Review summary:**
> Contract ambiguity review verified. Three-round clarification resolved authorization-matrix conflict (Administrator now excluded from all ticket endpoints including Public Comments and Internal Notes per new AC-33). Session re-validation (BR-10/BR-11) documented as database check on every request. Migration split into Phase A (Issue #3) and Phase B (Issue #6) to preserve Lab 2 regression. All cross-document conflicts resolved with verbatim quotes verified. Approved to proceed with implementation.

---

### Issue #3: Data Model, Migration & Seed — `feature/lab3-data-migration`
- **PR:** [PR #47](https://github.com/maneejames/TokTickIT/pull/47)
- **Author:** @maneejames
- **Reviewer:** @JEWKEW
- **Review Verdict:** Approved by @JEWKEW (2026-09-17)
- **Changes Requested:** Confirm `RequesterUser` drop status, provide real idempotent seed double-run output, and add explicit `isRequesterResolved` default-false assertion. Agent proposed deferring `requester_users` table drop to Issue #6 (Phase B) since Lab 2 routes still reference it — approved this deviation as correct judgment call.

**Review summary:**
> Data model migration verified. User table created with Role/TicketStatus/Priority enums. Ticket foreign keys repointed to users.id. PublicComment and InternalNote tables created. Idempotent seed verified via double-run without constraint violations. "No plaintext passwords" test verifies bcrypt hash format for all seed users. RequesterUser table correctly preserved for Lab 2 regression (Phase B drop deferred to Issue #6). Final test count: 76 server + 38 client = 114 total (5 new migration tests). Approved.

---

### Issue #4: Authentication Foundation — `feature/lab3-auth`
- **PR:** *(Pending PR link)*
- **Author:** @maneejames
- **Reviewer:** @JEWKEW
- **Review Verdict:** *(In Progress)*
- **Changes Requested:**
  - Round 1: Confirmed BR-06 generic error for wrong-password/unknown-email/inactive-account by inspecting actual response bodies. Identified session-fixation gap: password change did not rotate session token. Required new rule BR-26 added to specification.md and api-spec.md with TDD verification (old cookie returns 401, new cookie issued).
  - Round 2 (Incident): Agent's test-count summary table showed inconsistent per-file counts vs. Issue #3 baseline (my-tickets.api.test.ts missing, other counts altered). Root cause: 5 orphaned ephemeral test users (IDs 227, 188, 189, 190, 191) in database from crashed prior run caused "no plaintext passwords" test to fail, but agent's explanation was incorrect and second summary was fabricated from memory not actual output. Required: (1) orphaned user cleanup, (2) crash-safe afterAll cleanup in auth.api.test.ts, (3) redesign flawed test to check bcrypt format/non-plaintext scoped to seed emails only (not hardcoded Password123! for all users), (4) raw terminal output only as evidence.
  - Round 3 (DATABASE_URL Fix): Full state audit requested before continuing. All 86 server tests crashing with Prisma DATABASE_URL validation error. Docker container running correctly. Root cause: `server/.env` had quoted DATABASE_URL (`DATABASE_URL="postgresql://..."`). Dotenv preserved quotes as part of value, Prisma rejected it. Fixed by removing quotes, creating `tests/setup.ts` to explicitly load .env, updating `vitest.config.ts`, installing dotenv dev dependency. Verified complete test output with manual per-file count. Corrected test count discrepancy from prior report (Login: 4→5, MyTickets: 9→8) via fresh execution instead of cached output. Database query confirmed zero orphaned users. Session storage confirmed as intentional in-memory Map<> design per spec, not missing Prisma model.

**Review summary:**
> Authentication foundation implemented with login/logout/me/change-password endpoints. BR-06 generic error verified. BR-10/BR-11 session re-validation on every request verified (deactivated user sessions immediately invalid). BR-26 session rotation on password change verified. Mandatory password change barrier (mustChangePassword flag) blocks normal endpoints with 403 until satisfied. All 86 server + 38 client tests passing with verified counts. Database clean (zero orphaned users). Ready to continue with remaining Lab 3 features.

---

## 3. Pull Requests I Reviewed for My Partner (@JEWKEW)

*(To be filled in as partner's PRs are created)*

---

## 4. My Review Comments and Partner's Responses

*(To be filled in as partner's PRs are reviewed)*
