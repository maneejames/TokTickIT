# Lab 2 - Peer Review Record

**Author:** Chaiyaphoom Chenchirotphiphat — 67070503410 — GitHub: [@maneejames](https://github.com/maneejames)

**Peer Reviewer:** YOTSAPOOM LIUPOLVANISH — 67070503493 — GitHub: [@JEWKEW](https://github.com/JEWKEW)

**Project Board:** [TokTickIT Lab 2 Kanban](https://github.com/users/maneejames/projects/3/views/1)

---

## 1. Pull Requests I Authored (Lab 2)

| Issue # | Scope / Feature | Branch | PR Link | Reviewer Verdict | Approval Date | Status |
|---|---|---|---|---|---|---|
| #1 | AI Specification Agent — Engineering Contract | `feature/spec-doc` | [PR #22](https://github.com/maneejames/TokTickIT/pull/22) | Approved by @JEWKEW | 2026-09-06 | Merged |
| #2 | Review Contract — Ambiguity Resolution | `feature/spec-review` | [PR #23](https://github.com/maneejames/TokTickIT/pull/23) | Approved by @JEWKEW | 2026-09-06 | Merged |
| #3 | Implement — Development Requester Context | `feature/requester-context` | [PR #24](https://github.com/maneejames/TokTickIT/pull/24) | Approved by @JEWKEW | 2026-09-06 | Merged |
| #4 | Implement — Create Ticket | `feature/create-ticket` | [PR #25](https://github.com/maneejames/TokTickIT/pull/25) | Approved by @JEWKEW | 2026-09-06 | Merged |
| #5 | Implement — My Tickets | `feature/my-tickets` | [PR #26](https://github.com/maneejames/TokTickIT/pull/26) | Approved by @JEWKEW | 2026-09-06 | Merged |
| #6 | Implement — Ticket Detail & Attachments | `feature/ticket-detail-attachments` | [PR #27](https://github.com/maneejames/TokTickIT/pull/27) | Approved by @JEWKEW | 2026-09-06 | Merged |
| #7 | Completion Review — Contract Audit | `feature/completion-review` | [PR #28](https://github.com/maneejames/TokTickIT/pull/28) | Approved by @JEWKEW | 2026-09-06 | Merged |
| #8 | Integration & Release to Main | `release/lab2-staging` -> `main` | [PR #29](https://github.com/maneejames/TokTickIT/pull/29) | *(Pending PR link)* | *(Pending)* | Pending Release |

---

## 2. Review Comments I Received and My Responses

### Issue #1: Engineering Contract — `feature/spec-doc`
- **PR:** [PR #22](https://github.com/maneejames/TokTickIT/pull/22)
- **Author:** @maneejames
- **Reviewer:** @JEWKEW
- **Review Verdict:** [Approved by @JEWKEW](https://github.com/maneejames/TokTickIT/pull/22#pullrequestreview-5124474384) (2026-09-06)
- **Changes Requested:** None. Specifications, contracts, and test plans verified directly against handout requirements.

**Yotsapoom commented:**
> I’ve reviewed the contract documents and everything looks well organized and consistent. The requirements, API, UI, and test plans are clearly defined, and the acceptance criteria are properly covered. I don’t have any concerns from my side. Approved.

**I responded:**
> Thank you for the review! Glad everything looks good. If you’re okay with it, you can go ahead and merge it.

---

### Issue #2: Review Contract — Ambiguity Resolution — `feature/spec-review`
- **PR:** [PR #23](https://github.com/maneejames/TokTickIT/pull/23)
- **Author:** @maneejames
- **Reviewer:** @JEWKEW
- **Review Verdict:** Approved by @JEWKEW (2026-09-06)
- **Changes Requested:** Clarified ticket number generation strategy, attachment two-step creation, and soft removal 410 response. Resolved cleanly in documentation prior to code kickoff.

**Review summary:**
> Contract ambiguity review verified. All cross-cutting decisions (daily counter format, priority tiers, download query parameter exception, soft-removal HTTP 410) are well justified in Section 11 of specification.md and synced across all contract docs. Approved to proceed with implementation.

---

### Issue #3: Development Requester Context — `feature/requester-context`
- **PR:** [PR #24](https://github.com/maneejames/TokTickIT/pull/24)
- **Author:** @maneejames
- **Reviewer:** @JEWKEW
- **Review Verdict:** Approved by @JEWKEW (2026-09-06)
- **Changes Requested:** Identified need for `department` attribute on `RequesterUser` to satisfy AC-02 (shell header displaying department). Added via schema update and seed script; verified with 6 backend + 3 frontend tests.

**Review summary:**
> Development Requester selector, context provider, localStorage persistence, and header pill verified. All AC-01 through AC-04 tests pass. Clean implementation without premature auth/login dependencies. Approved.

---

### Issue #4: Create Ticket — `feature/create-ticket`
- **PR:** [PR #25](https://github.com/maneejames/TokTickIT/pull/25)
- **Author:** @maneejames
- **Reviewer:** @JEWKEW
- **Review Verdict:** Approved by @JEWKEW (2026-09-06)
- **Changes Requested:** Ensure whitespace-only summaries are rejected and daily sequence resets atomically. Verified with test coverage (19 server + 7 client tests passing).

**Review summary:**
> Ticket creation flow verified. Atomic TicketSequence transaction correctly creates TICK-YYYYMMDD-XXXX numbers. Field-level validation, input preservation on failure, and busy button spinner match ui-spec.md. Approved.

---

### Issue #5: My Tickets — `feature/my-tickets`
- **PR:** [PR #26](https://github.com/maneejames/TokTickIT/pull/26)
- **Author:** @maneejames
- **Reviewer:** @JEWKEW
- **Review Verdict:** Approved by @JEWKEW (2026-09-06)
- **Changes Requested:** Ensure strict requester data isolation so Requester B never sees Requester A's tickets, and fix enum casting when filtering by status/priority. Resolved and verified with 31 server + 8 client tests.

**Review summary:**
> My Tickets list, substring search on summary and ticketNumber, status/priority filtering, sorting, pagination, and empty/no-results states verified. Cross-requester boundary test confirms 100% data isolation. Approved.

---

### Issue #6: Ticket Detail & Attachments — `feature/ticket-detail-attachments`
- **PR:** [PR #27](https://github.com/maneejames/TokTickIT/pull/27)
- **Author:** @maneejames
- **Reviewer:** @JEWKEW
- **Review Verdict:** Approved by @JEWKEW (2026-09-06)
- **Changes Requested:** Ensure soft-removed files return 410 Gone on download and 5-attachment maximum limit is enforced on upload dropzone. Resolved and verified with 13 server + 7 client tests.

**Review summary:**
> Ticket Detail view and attachment lifecycle verified. Strict ownership checks return 404 for unauthorized access, max 5 active attachments enforced, modal prompts for optional reason, and 410 Gone properly returned for soft-deleted file downloads. Approved.

---

### Issue #7: Completion Review — Contract Audit — `feature/completion-review`
- **PR:** [PR #28](https://github.com/maneejames/TokTickIT/pull/28)
- **Author:** @maneejames
- **Reviewer:** @JEWKEW
- **Review Verdict:** Approved by @JEWKEW (2026-09-06)
- **Changes Requested:** Update Section 6 in `tests.md` to reflect exact final test counts (71 server + 28 client = 99 total) and confirm zero skipped tests. Resolved directly in PR #28.

**Review summary:**
> Full audit against contract complete. All 99 automated tests passing with zero skips. Definition of Done satisfied across all features. Ready for staging integration and final release to main. Approved.

---

## 3. Pull Requests I Reviewed for My Partner (@JEWKEW)

| Partner Issue # | Partner's Scope / Feature | Branch | PR Link | My Verdict |
|---|---|---|---|---|
| [#10](https://github.com/JEWKEW/TokTickIT/issues/10) | Sprint Specification & Test Plan | `feature/1-spec-and-test-plan` | [PR #19](https://github.com/JEWKEW/TokTickIT/pull/19) | Approved |
| [#11](https://github.com/JEWKEW/TokTickIT/issues/11) | Database Schema & Seed Data | `feature/2-db-schema-and-seed` | [PR #20](https://github.com/JEWKEW/TokTickIT/pull/20) | Approved |
| [#12](https://github.com/JEWKEW/TokTickIT/issues/12) | Development Requester Context | `feature/3-dev-requester-context` | [PR #21](https://github.com/JEWKEW/TokTickIT/pull/21) | Approved |
| [#13](https://github.com/JEWKEW/TokTickIT/issues/13) | Ticket Creation Flow | `feature/4-ticket-creation` | [PR #22](https://github.com/JEWKEW/TokTickIT/pull/22) | Approved |
| [#14](https://github.com/JEWKEW/TokTickIT/issues/14) | My Tickets Screen & Search/Filters | `feature/5-my-tickets-list` | [PR #23](https://github.com/JEWKEW/TokTickIT/pull/23) | Approved |
| [#15](https://github.com/JEWKEW/TokTickIT/issues/15) | Ticket Detail View & Access Control | `feature/6-ticket-detail-view` | [PR #24](https://github.com/JEWKEW/TokTickIT/pull/24) | Approved |
| [#16](https://github.com/JEWKEW/TokTickIT/issues/16) | Attachment Lifecycle Management | `feature/7-attachment-lifecycle` | [PR #25](https://github.com/JEWKEW/TokTickIT/pull/25) | Approved |
| [#17](https://github.com/JEWKEW/TokTickIT/issues/17) | E2E Testing & Visual Polish | `feature/8-e2e-and-visual-audit` | [PR #26](https://github.com/JEWKEW/TokTickIT/pull/26) | Approved |
| [#18](https://github.com/JEWKEW/TokTickIT/issues/18) | Release Integration & Review Prep | `lab2-staging` -> `main` | [PR #27](https://github.com/JEWKEW/TokTickIT/pull/27) | Approved |

---

## 4. My Review Comments and Partner's Responses

### Yotsapoom Issue #10 — `feature/1-spec-and-test-plan`
- **PR:** [PR #19](https://github.com/JEWKEW/TokTickIT/pull/19)
- **My Verdict:** Approved

**My review:**
> I’ve gone through the changes and everything looks good to me. The requirements, API specs, UI specs, and test cases are clear and well organized. No major issues from my side. Good work

**Yotsapoom responded:**
> Thanks for the review! Glad to hear everything looks clear and well organized. Appreciate you taking the time to go through it!

---

### Yotsapoom Issue #11 — `feature/2-db-schema-and-seed`
- **PR:** [PR #20](https://github.com/JEWKEW/TokTickIT/pull/20)
- **My Verdict:** Approved

**My review:**
> Reviewed and approved.
>
> The implementation covers the requested Prisma models, relationships, migration, and idempotent seed data. Prisma models and relations are defined for all required entities. Initial migration was created and applied successfully. Validation commands completed successfully without errors or duplicate records.
>
> Approved.

**Yotsapoom responded:**
> Thanks for the review and approval. Appreciate you verifying the implementation and validation results.

---

### Yotsapoom Issue #12 — `feature/3-dev-requester-context`
- **PR:** [PR #21](https://github.com/JEWKEW/TokTickIT/pull/21)
- **My Verdict:** Approved

**My review:**
> Approved. The implementation covers the requested Feature 3 scope, including backend API, requester selection UI, context handling, and tests. All backend and frontend tests pass and both client and server builds are clean. Looks good to merge.

**Yotsapoom responded:**
> Yes, the base branch is correct. Everything is ready from my side. Thanks for double-checking.

---

### Yotsapoom Issue #13 — `feature/4-ticket-creation`
- **PR:** [PR #22](https://github.com/JEWKEW/TokTickIT/pull/22)
- **My Verdict:** Approved

**My review:**
> Approved. The Ticket Creation Feature is implemented end-to-end with the backend API, validation, authentication, file upload handling, ticket number generation, frontend form, navigation, and error/success states. All backend tests (10/10) and frontend tests (13/13) pass. The implementation looks complete and well covered by tests. Good to merge.

**Yotsapoom responded:**
> Thanks for the detailed review and approval. Glad to hear the implementation and test coverage look good. I appreciate you taking the time to verify everything.

---

### Yotsapoom Issue #14 — `feature/5-my-tickets-list`
- **PR:** [PR #23](https://github.com/JEWKEW/TokTickIT/pull/23)
- **My Verdict:** Approved

**My review:**
> Approved. ISSUE-05 is implemented end-to-end with the My Tickets API, requester data isolation, search/filter/sort/pagination, and the full My Tickets UI with proper loading, empty, no results, and error states. The test is clear with all backend tests (15/15) and frontend tests (22/22) passing. I have no problem and you can merge.

**Yotsapoom responded:**
> Thanks for the review and approval. I appreciate you verifying the requester data isolation, filtering, pagination, UI states, and test coverage. Glad everything looks good.

---

### Yotsapoom Issue #15 — `feature/6-ticket-detail-view`
- **PR:** [PR #24](https://github.com/JEWKEW/TokTickIT/pull/24)
- **My Verdict:** Approved

**My review:**
> Approved. ISSUE-06 is implemented the ticket detail API, strict requester access control, read-only ticket detail UI, navigation from My Tickets, and comprehensive security/component tests. The implementation correctly handles 401/400/403/404 cases, and all backend tests (21/21), frontend tests (27/27), and TypeScript compilation pass. The base branch is correct and ready to merge.

**Yotsapoom responded:**
> Thanks for the detailed review and approval. I appreciate you verifying the access control, read-only behavior, navigation, and test coverage. Glad everything looks good and the base branch is correct.

---

### Yotsapoom Issue #16 — `feature/7-attachment-lifecycle`
- **PR:** [PR #25](https://github.com/JEWKEW/TokTickIT/pull/25)
- **My Verdict:** Approved

**My review:**
> Approved. ISSUE-07 is implemented with the complete attachment lifecycle, including secure upload/download, ownership checks, file validation, active attachment limits, and soft removal with audit metadata. The frontend also correctly handles active and soft-removed attachments, removal reasons, validation, and blocked downloads. All backend tests (36/36) and frontend tests (32/32) pass. Can merge.

**Yotsapoom responded:**
> Thanks for the detailed review and approval. I appreciate you verifying the attachment lifecycle, security controls, validation, soft removal behavior, and test coverage. Glad everything looks good.

---

### Yotsapoom Issue #17 — `feature/8-e2e-and-visual-audit`
- **PR:** [PR #26](https://github.com/JEWKEW/TokTickIT/pull/26)
- **My Verdict:** Approved

**My review:**
> I checked the test and screenshots, and everything seems to work well on desktop, tablet, and mobile. The Playwright test also passed. No issues from my side. Approved

**Yotsapoom responded:**
> Thanks for checking the tests and screenshots across desktop, tablet, and mobile. Glad to hear the Playwright test passed and everything is working as expected. Appreciate the review and approval!

---

### Yotsapoom Issue #18 — `lab2-staging` -> `main`
- **PR:** [PR #27](https://github.com/JEWKEW/TokTickIT/pull/27)
- **My Verdict:** Approved

**My review:**
> I’ve reviewed the changes, and everything looks good to me. The full Lab 02 ticketing workflow is included and the implementation looks complete. I don’t have any concerns from my side. Approved.

**Yotsapoom responded:**
> Thanks for the review and approval. I appreciate you taking the time to verify the complete Lab 02 ticketing workflow. Glad everything looks good and there are no concerns. I’ll proceed with the merge.
