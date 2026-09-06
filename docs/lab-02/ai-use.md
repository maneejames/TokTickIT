# Lab 2 — AI Use and Reflection

This document details the artificial intelligence tools, models, and key prompts utilized throughout the TokTickIT Lab 2 engineering sprint.

## 1. LLMs and Agents Used

Across the Lab 2 sprint, we adopted a structured spec-driven development workflow utilizing Google Antigravity IDE and Google Cloud Platform:

1. **Specification & Contract Review Agent**:
   - **Model**: Gemini 3.5 Flash (Thinking Level: High)
   - **Role**: Used for translating stakeholder requirements into formal engineering specifications, identifying contractual ambiguities, establishing data models, defining API schemas, and structuring the acceptance test matrix.
2. **AI Coding & Implementation Agent**:
   - **Model**: Antigravity Coding Assistant powered by Gemini 3.5 Flash / Gemini 3.8 Flash (Low/Medium Thinking)
   - **Role**: Used for test-driven development (TDD), generating failing Supertest API and Vitest/React Testing Library component tests, implementing full-stack features across Express/Prisma and React/TypeScript, conducting completion audits, and resolving contract deviations.

---

## 2. Selected Key Prompts

The following table highlights 8 critical prompts used during the sprint, focusing on key decision points, kickoff phases, bug fixes, and contract audits:

| Prompt Name | Purpose | Outcome |
|---|---|---|
| **Review Contract (Issue #2)** | Audit `specification.md`, `tests.md`, `ui-spec.md`, and `api-spec.md` for ambiguities, conflicts, and dependency gaps prior to writing implementation code. | Successfully identified multiple contractual gaps before code was written: resolved ticket number format to daily atomic counter (`TICK-YYYYMMDD-XXXX`), confirmed 3-tier priority enum (`LOW`, `MEDIUM`, `HIGH`), established two-step sequential ticket/attachment creation, and defined soft-delete HTTP 410 behavior. |
| **Implement Requester Context (Issue #3)** | Kick off development of the temporary Development Requester identity selection screen, Prisma schema additions, active requester API, and localStorage context persistence. | Generated the `RequesterUser` Prisma model, idempotent seed data, `GET /api/requesters`, `requesterAuth` middleware, and React `RequesterContext`. Discovered and resolved the missing `department` field requirement to satisfy AC-02. |
| **Department Field Addition (Issue #3 Bugfix / Contract Fix)** | Ensure the `RequesterUser` schema and endpoints provide the user's `department` attribute to fulfill the application shell header context requirement. | Updated `schema.prisma`, migrations, and seed script to include `department` across all seeded requesters, and updated frontend shell header to render `👤 [Name] ([Department])`. |
| **Implement Create Ticket (Issue #4 Kickoff)** | Implement failing API and UI tests first, followed by the ticket creation endpoint, whitespace trimming, input validation, daily sequence counter, and Zen Green form UI. | Built `create-ticket.api.test.ts` and `CreateTicket.test.tsx` (19 passing server + 7 client tests). Enforced whitespace trimming on Summary/Description and implemented the `TicketSequence` atomic locking mechanism. |
| **Postgres Enum-Casting & Schema Fix (Issue #5)** | Address PostgreSQL native enum casting and filter query inconsistencies when filtering tickets by priority and status in Express/Prisma. | Explicitly typed and validated priority/status query parameters against Prisma enum definitions before passing to Prisma query filters, preventing raw database casting errors during filtered ticket searches. |
| **Implement My Tickets & Data Isolation (Issue #5 Kickoff)** | Implement paginated ticket listing, multi-parameter search/filters, sorting, responsive desktop table / mobile card views, and strict cross-requester isolation. | Delivered `my-tickets.api.test.ts` (31 tests) and `MyTickets.test.tsx` (8 tests). Implemented substring search (`ILIKE '%search%'`), pagination metadata, empty states, and verified that Requester B cannot see Requester A's tickets. |
| **Implement Ticket Detail & Soft-Removal (Issue #6 Kickoff)** | Implement read-only ticket details, 5-attachment maximum limit enforcement, secure download via ownership check, and soft-removal with reason. | Implemented `ticket-detail.api.test.ts` (13 tests) and `RequesterTicketDetail.test.tsx` (7 tests). Enforced HTTP 404 on unauthorized access, HTTP 413 on files > 5MB, HTTP 415 on invalid MIME, and HTTP 410 on soft-removed downloads. |
| **Completion Review Audit (Issue #7)** | Conduct a comprehensive audit against every Acceptance Criterion (AC-01 through AC-26) and planned test across all implemented features (#3–#6) to detect missing evidence, skipped tests, or UI spec deviations. | Audited all 99 automated tests (71 server + 28 client). Identified and corrected placeholder test counts in `docs/lab-02/tests.md`, verified 100% pass rate with zero skipped tests, and aligned all DoD requirements for release readiness. |

---

## 3. My Reflection

Using the Antigravity AI coding agent with Gemini models enabled a disciplined spec-driven development workflow throughout Lab 2. Having the AI first review and stress-test the engineering contracts (`specification.md`, `api-spec.md`, `ui-spec.md`, and `tests.md`) before writing any code was invaluable; it surfaced critical edge cases such as the atomic daily ticket sequence generator, attachment soft-removal HTTP 410 semantics, and missing data fields like the requester department early on. Adhering to strict issue-by-issue prompt boundaries and requiring failing automated tests first prevented feature drift and kept the codebase focused. Most importantly, running the Issue #7 Completion Review audit held the implementation accountable to verifiable test evidence (all 99 tests passing) rather than passively trusting an agent's claim of completion.
