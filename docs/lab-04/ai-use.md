# Lab 4 — AI Use and Reflection

This document details the artificial intelligence tools, models, and key prompts utilized throughout the TokTickIT Lab 4 engineering sprint.

## 1. LLMs and Agents Used

Across the Lab 4 sprint, we adopted a structured spec-driven development workflow utilizing Google Antigravity IDE and Google Cloud Platform:

1. **Specification & Contract Review Agent**:
   - **Model**: Antigravity Assistant powered by Gemini 3.8 Flash (Medium Thinking)
   - **Role**: Used for translating stakeholder requirements into formal engineering specifications, verifying contractual consistency across documents, refining data models, defining API schemas, and structuring the acceptance test matrix.
2. **AI Coding & Implementation Agent**:
   - **Model**: Antigravity Assistant powered by Gemini 3.8 Flash
   - **Role**: Used for test-driven development (TDD), generating failing Vitest API and React Testing Library component tests, implementing full-stack features across Express/Prisma and React/TypeScript, conducting completion audits, and resolving contract deviations.

---

## 2. Selected Key Prompts

The following table highlights key prompts used during the sprint, focusing on key decision points, kickoff phases, bug fixes, contract audits, and verification incidents:

| Prompt Name | Purpose | Outcome |
|---|---|---|
| **AI Specification Agent (Issue #1)** | Check the contract against the handout (docs/lab-04/Lab_4_sheet.md), verify cross-file consistency, fix inconsistencies directly in the documents, and prepare reviewer/ai-use records. | Audited all 4 contract documents against handout §4.1 and §9; verified 11 required specification sections exist; confirmed 4 justified DB design decisions; aligned Internal Notes visibility in ui-spec.md with D-3; verified 100% traceability for 19 FRs, 18 BRs, and 18 ACs to planned test paths without claiming premature test passes. |
| **Review Contract (Issue #2)** | Audit specification.md, api-spec.md, ui-spec.md, and tests.md for ambiguities, conflicts, and dependencies; present findings for human approval; lock build order. | Raised 7 review findings (F-01 to F-07); resolved Decision D-3 test update strategy across 6 Lab 3 test points in reviewer.md without adding SUP-01; locked rolling 168-hour UTC window; confirmed comma-separated status and requesterResolved query parameters; locked implementation build order (Issues #3 to #7) in reviewer.md. |
| **Actions Taken Foundation (Issue #3)** | Implement Actions Taken backend foundation following TDD: failing tests first, Prisma schema and migration preserving data, idempotent seed, and REST endpoints with optimistic concurrency and auth. | Created `actions-taken.api.test.ts` (20 tests) and `migration.test.ts` (3 tests); verified failing run (2 passed, 21 failed); added `ActionStatus` enum, `ActionTaken` model, and `Ticket.version`; generated migration `20261029190100_lab4_actions_taken`; confirmed data preservation before/after (15 users, 28 tickets, 28 attachments, 1 comment, 1 note) and verified MIG-04 dump restore into scratch DB; added idempotent seed; implemented 4 REST endpoints with optimistic concurrency (`expectedVersion`), `Idempotency-Key` replay, and role authorization; achieved 100% passing across all 251 server tests with 0 type errors. |

**Final verified state:** Issue #3 prompt recorded with TDD failing-then-passing evidence, data preservation verification, full 251 server tests passing, and 0 legacy test modifications.

---

## 3. Reflection

*(To be expanded as sprint progresses)*
During Issue #1, the AI Specification Agent was used to audit the draft engineering contracts (`specification.md`, `api-spec.md`, `ui-spec.md`, `tests.md`) against the Lab 4 handout requirements. This proactive cross-file audit caught and resolved key inconsistencies prior to code implementation: ensuring the 11 required specification sections from Handout §9 are explicitly structured, aligning Administrator access to Internal Notes under Decision D-3, and ensuring every single Acceptance Criterion traces directly to a planned automated test file with real paths.

During Issue #2, the Contract Review audit surfaced 7 key questions covering D-3 test impacts, optimistic concurrency (`expectedVersion`), query parameter filters for dashboard drilldowns, idempotency storage, timezone boundaries, and seed data coverage. Addressing these in contract documents before coding ensured that implementation order was locked (Issues #3 through #7) in reviewer.md and that all test updates are tracked transparently.

During Issue #3, the AI Coding Agent drove the backend foundation implementation using strict Test-Driven Development (TDD). First, automated test suites for Actions Taken API endpoints (ACT-API-01..16, ACT-AUTHZ-01..04) and schema migration/integrity (MIG-01..03) were written and verified failing before any implementation began. We then evolved the Prisma schema, executed the migration, confirmed 100% data preservation against the pre-migration database dump via container recovery testing (MIG-04), and enhanced the database seed with idempotent actions across diverse statuses and ownership states. One subtle issue detected during regression testing was an assumption in Lab 2's `my-tickets.api.test.ts` priority sorting assertion which only mapped `LOW`, `MEDIUM`, `HIGH` for `requestedPriority`; aligning seed tickets so that `URGENT` is exercised in `itPriority` while keeping `requestedPriority` within requester boundaries ensured that all 251 server tests passed without altering a single line of legacy test code.
