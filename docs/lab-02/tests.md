# Lab 2 Test Plan and Traceability

## 1. Test Strategy

TokTickIT employs a comprehensive multi-tier test pyramid to guarantee quality, security, and traceability:

1. **Unit Tests**:
   - Verify isolated business logic functions such as official Ticket Number formatting (`TICK-YYYYMMDD-XXXX`), sequence counter daily resets, and whitespace trimming.
2. **API Integration Tests (Supertest + Vitest)**:
   - Execute HTTP requests against Express routes connected to the PostgreSQL database.
   - Verify input validation, status codes, response shapes, atomic transactions, active attachment limits, and cross-requester ownership isolation.
3. **Frontend UI Component Tests (Vitest + React Testing Library)**:
   - Test React components in isolation with simulated user interactions.
   - Verify form validation rendering, busy button states, error callouts, empty states, search filtering, and confirmation modals.
4. **Responsive & Visual Inspection**:
   - Automated viewport testing and screenshot generation across Desktop (1280px), Tablet (768px), and Mobile (375px) viewports.
5. **End-to-End (E2E) Acceptance Tests (Playwright)**:
   - Execute complete browser journeys from requester selection to ticket creation, verification in My Tickets, and attachment management in Ticket Detail.

---

## 2. Planned Tests Table

| Test ID | Type | Requirement / AC | What It Tests | Expected Result | Automated Test File | Final Status |
|---|---|---|---|---|---|---|
| **REQ-API-01** | API | AC-01 | Fetch active requesters | 200 OK; returns seeded active requesters; inactive excluded | `server/tests/lab-02/requesters.api.test.ts` | Passed |
| **REQ-API-02** | API | AC-04, BR-04 | Request with inactive `X-Requester-Id` | 403 Forbidden with descriptive error envelope | `server/tests/lab-02/requesters.api.test.ts` | Passed |
| **REQ-API-03** | API | BR-04 | Request missing `X-Requester-Id` | 401 Unauthorized with descriptive error envelope | `server/tests/lab-02/requesters.api.test.ts` | Passed |
| **REQ-API-04** | API | AC-04 | Request with nonexistent `X-Requester-Id` | 404 Not Found with descriptive error envelope | `server/tests/lab-02/requesters.api.test.ts` | Passed |
| **REQ-UI-01** | UI | AC-01, AC-02 | Requester Selection dropdown & Continue | Selecting user saves to localStorage and displays name in shell | `client/tests/lab-02/RequesterSelect.test.tsx` | Passed |
| **REQ-UI-02** | UI | AC-03 | Change Requester action | Clicking Change Requester returns to selection screen | `client/tests/lab-02/RequesterSelect.test.tsx` | Passed |
| **REQ-UI-03** | UI | AC-04 | Stale/invalid localStorage ID handling | Clears localStorage and redirects to Requester Selection screen | `client/tests/lab-02/RequesterSelect.test.tsx` | Passed |
| **REF-API-01** | API | FR-04 | Fetch active categories | 200 OK; returns seeded categories with `isActive = true` | `server/tests/lab-02/reference-data.api.test.ts` | Passed |
| **REF-API-02** | API | FR-04 | Fetch active related systems | 200 OK; returns seeded systems with `isActive = true` | `server/tests/lab-02/reference-data.api.test.ts` | Passed |
| **TICK-UNIT-01** | Unit | BR-01, AC-05 | Ticket number generator format | Dedicated TicketSequence table atomic daily counter; generates `TICK-YYYYMMDD-XXXX` via SELECT FOR UPDATE | `server/tests/lab-02/create-ticket.api.test.ts` | Passed |
| **TICK-API-01** | API | AC-05 | Create valid ticket | 201 Created; status=NEW; unique ticket number; saved in DB | `server/tests/lab-02/create-ticket.api.test.ts` | Passed |
| **TICK-API-02** | API | AC-06, AC-07 | Summary/Description validation | 400 Bad Request if summary < 5 chars or description > 2000 chars | `server/tests/lab-02/create-ticket.api.test.ts` | Passed |
| **TICK-API-03** | API | AC-06 | Whitespace trimming before validation | Spaces only (e.g. `" "`) rejected with 400 Bad Request | `server/tests/lab-02/create-ticket.api.test.ts` | Passed |
| **TICK-UI-01** | UI | AC-07 | Form validation errors | Red messages appear below invalid fields; API not called | `client/tests/lab-02/CreateTicket.test.tsx` | Passed |
| **TICK-UI-02** | UI | AC-09 | Submission failure preserves inputs | Error alert shown on 500 error; form values remain in fields | `client/tests/lab-02/CreateTicket.test.tsx` | Passed |
| **TICK-UI-03** | UI | AC-10 | Submit button enters busy state | Button disabled with spinner during request processing | `client/tests/lab-02/CreateTicket.test.tsx` | Passed |
| **TICK-UI-04** | UI | AC-05 | Submission success confirmation | Displays generated ticket number and link to detail | `client/tests/lab-02/CreateTicket.test.tsx` | Passed |
| **LIST-API-01** | API | AC-11 | List tickets for active requester | 200 OK; returns items matching `X-Requester-Id` with active attachments count | `server/tests/lab-02/my-tickets.api.test.ts` | Passed |
| **LIST-API-02** | API | AC-12 | Cross-requester ticket isolation | Requester B does not receive Requester A's tickets | `server/tests/lab-02/my-tickets.api.test.ts` | Passed |
| **LIST-API-03** | API | AC-13 | Pagination parameters | Respects `page` and `pageSize`; returns pagination metadata | `server/tests/lab-02/my-tickets.api.test.ts` | Passed |
| **LIST-API-04** | API | AC-14, AC-16 | Search substring and sort query options | Substring match on BOTH fields — `ILIKE '%search%'` on summary or ticketNumber; sorts ascending/descending | `server/tests/lab-02/my-tickets.api.test.ts` | Passed |
| **LIST-API-05** | API | FR-11 | Filter by categoryId, status, and priority | 200 OK; returns only tickets matching categoryId, status, and requestedPriority params | `server/tests/lab-02/my-tickets.api.test.ts` | Passed |
| **LIST-API-06** | API | FR-12 | Sort by requestedPriority, status, summary | 200 OK; sorts tickets correctly according to sortBy and sortOrder | `server/tests/lab-02/my-tickets.api.test.ts` | Passed |
| **LIST-UI-01** | UI | AC-11, AC-25 | Desktop table vs mobile card view | Renders 8-column table on desktop (including Attachments) and stacked cards on mobile | `client/tests/lab-02/MyTickets.test.tsx` | Passed |
| **LIST-UI-02** | UI | AC-12 | Empty tickets state | Displays "You haven't submitted any tickets yet" when count=0 | `client/tests/lab-02/MyTickets.test.tsx` | Passed |
| **LIST-UI-03** | UI | AC-15 | No results search state | Displays "No matching tickets found" with "Clear Filters" button | `client/tests/lab-02/MyTickets.test.tsx` | Passed |
| **DET-API-01** | API | AC-17 | Get single ticket detail | 200 OK; returns full ticket details and attachments array | `server/tests/lab-02/ticket-detail.api.test.ts` | Passed |
| **DET-API-02** | API | AC-18 | Unauthorized ticket detail access | 404 Not Found if ticket belongs to another requester | `server/tests/lab-02/ticket-detail.api.test.ts` | Passed |
| **DET-UI-01** | UI | AC-17 | Read-only ticket detail display | Fields displayed in non-editable formatted containers | `client/tests/lab-02/RequesterTicketDetail.test.tsx` | Passed |
| **ATT-API-01** | API | AC-19 | Upload valid attachment | 201 Created; saved on disk; metadata stored in DB | `server/tests/lab-02/attachments.api.test.ts` | Passed |
| **ATT-API-02** | API | AC-08 | Reject file > 5 MB | 413 Payload Too Large; file not saved | `server/tests/lab-02/attachments.api.test.ts` | Passed |
| **ATT-API-03** | API | AC-08 | Reject invalid MIME type (e.g. .exe) | 415 Unsupported Media Type; rejected | `server/tests/lab-02/attachments.api.test.ts` | Passed |
| **ATT-API-04** | API | AC-20 | Reject 6th active attachment | 400 Bad Request when 5 active attachments exist | `server/tests/lab-02/attachments.api.test.ts` | Passed |
| **ATT-API-05** | API | AC-21 | Download active attachment | 200 OK; binary stream matching original filename header (via header or `?requesterId=`) | `server/tests/lab-02/attachments.api.test.ts` | Passed |
| **ATT-API-06** | API | AC-23 | Soft-remove attachment with reason | 200 OK; `isRemoved=true`, records `removedReason` | `server/tests/lab-02/attachments.api.test.ts` | Passed |
| **ATT-API-07** | API | AC-24 | Block download of soft-removed file | 410 Gone when requesting removed file | `server/tests/lab-02/attachments.api.test.ts` | Passed |
| **ATT-UI-01** | UI | AC-22, AC-23 | Soft-removal modal and reason | Confirmation modal opens; submitting sends `removedReason` and updates UI | `client/tests/lab-02/RequesterTicketDetail.test.tsx` | Passed |
| **ATT-UI-02** | UI | AC-20 | Dropzone hidden at 5 attachments | Upload input hidden/disabled when 5 active files exist | `client/tests/lab-02/RequesterTicketDetail.test.tsx` | Passed |
| **ATT-UI-03** | UI | AC-08 | Client-side immediate file validation error | Displays inline error below dropzone when file > 5MB or invalid MIME selected | `client/tests/lab-02/RequesterTicketDetail.test.tsx` | Passed |
| **A11Y-UI-01** | UI | AC-26 | Keyboard focus rings visible | Tab navigation shows `--color-secondary-green` focus ring | `client/tests/lab-02/CreateTicket.test.tsx` | Passed |
| **E2E-01** | E2E | AC-01–AC-25 | Complete Requester Ticketing Journey | Selects user -> creates ticket -> finds in list -> manages attachment | `e2e/lab-02/requester-ticket-flow.spec.ts` | Planned |

---

## 3. Acceptance-Criterion Traceability Matrix

| Acceptance Criterion | Description | Mapped Test IDs |
|---|---|---|
| **AC-01** | Only active requesters displayed in dropdown | `REQ-API-01`, `REQ-UI-01`, `E2E-01` |
| **AC-02** | Shell displays selected requester name & dept | `REQ-UI-01`, `E2E-01` |
| **AC-03** | "Change Requester" action resets context | `REQ-UI-02`, `E2E-01` |
| **AC-04** | Stored invalid requester redirected to selector | `REQ-API-02`, `REQ-API-03`, `REQ-API-04`, `REQ-UI-01`, `REQ-UI-03` |
| **AC-05** | Valid ticket creation with status New and official # | `TICK-UNIT-01`, `TICK-API-01`, `TICK-UI-04`, `E2E-01` |
| **AC-06** | Summary/Description whitespace trimming | `TICK-API-02`, `TICK-API-03` |
| **AC-07** | Field-level error messages on missing/short inputs | `TICK-API-02`, `TICK-UI-01` |
| **AC-08** | Immediate rejection of files > 5 MB or invalid MIME | `ATT-API-02`, `ATT-API-03`, `ATT-UI-03` |
| **AC-09** | Form values preserved upon API failure | `TICK-UI-02` |
| **AC-10** | Submit button busy state prevents double submission | `TICK-UI-03` |
| **AC-11** | My Tickets displays owned tickets with metadata | `LIST-API-01`, `LIST-UI-01`, `E2E-01` |
| **AC-12** | Strict cross-requester isolation (Requester A vs B) | `LIST-API-02`, `LIST-UI-02`, `E2E-01` |
| **AC-13** | Pagination controls and page size limits | `LIST-API-03` |
| **AC-14** | Search by summary and ticket number substring | `LIST-API-04` |
| **AC-15** | No matching results state with Clear Filters | `LIST-UI-03` |
| **AC-16** | Sorting tickets by creation date, priority, status, summary | `LIST-API-04`, `LIST-API-06` |
| **AC-17** | Read-only Ticket Detail display for owner | `DET-API-01`, `DET-UI-01`, `E2E-01` |
| **AC-18** | Rejection of unauthorized ticket detail access (404 Not Found) | `DET-API-02` |
| **AC-19** | Upload valid attachment to ticket | `ATT-API-01`, `E2E-01` |
| **AC-20** | Enforce 5 active attachments limit per ticket | `ATT-API-04`, `ATT-UI-02` |
| **AC-21** | Download active attachment file | `ATT-API-05`, `E2E-01` |
| **AC-22** | Confirmation modal for attachment removal | `ATT-UI-01` |
| **AC-23** | Soft-removal with reason preserves metadata | `ATT-API-06`, `ATT-UI-01`, `E2E-01` |
| **AC-24** | Soft-removed attachment download blocked (410 Gone) | `ATT-API-07` |
| **AC-25** | Responsive card view on mobile (<768px) | `LIST-UI-01`, `E2E-01` |
| **AC-26** | Visible keyboard focus rings for accessibility | `A11Y-UI-01` |

---

## 4. Responsive and Visual Checklist

| Item | Desktop (≥992px) | Tablet (768–991px) | Mobile (<768px) | Verified |
|---|---|---|---|---|
| **App Shell & Header** | Horizontal navigation bar, requester pill visible | Horizontal bar, condensed pill | Responsive header, zero horizontal scroll | [ ] |
| **Requester Selector** | Centered 480px card | Centered 480px card | Full-width container with 16px margins | [ ] |
| **Create Ticket Form** | 2-column grid for meta/category, spacious fields | 2-column or stacked fields | 1-column vertically stacked fields | [ ] |
| **My Tickets List** | Full 8-column table (including Attachments count) with hover effects | Condensed table with scroll | Responsive stacked cards with badges | [ ] |
| **Ticket Detail View** | 2-column grid for metadata, spacious description | 2-column grid, responsive cards | Stacked single-column layout | [ ] |
| **Attachment Section** | Table/card layout with download/remove buttons | Responsive card rows | Touch-friendly buttons (min 44px height) | [ ] |
| **Color & Badge Audit** | Zen Green tokens applied; no pure black text | Zen Green tokens verified | Badges readable, high contrast | [ ] |
| **Visual Defects** | No clipped labels, no overlapping errors | No overflow on inputs | Zero horizontal page scrolling | [ ] |

---

## 5. Test Commands

### Run Backend API & Unit Tests
```bash
cd server
npm test
```

### Run Frontend Component Tests
```bash
cd client
npm test
```

### Run Full Test Suite Across All Workspaces
```bash
# In project root
npm run test --prefix server
npm run test --prefix client
```

### Run E2E Tests (Playwright)
```bash
npx playwright test
```

---

## 6. Final Results

*(Updated upon completion of implementation issues #3 through #7)*

| Test Category | Total Tests | Passed | Failed | Skipped | Pass Rate |
|---|---|---|---|---|---|
| Backend API & Unit Tests (`server`) | 71 | 71 | 0 | 0 | 100% |
| Frontend Component Tests (`client`) | 28 | 28 | 0 | 0 | 100% |
| E2E Acceptance Tests (`e2e`) | 1 | - | - | 0 | Deferred to #8 |
| **Total Automated Tests** | **99** | **99** | **0** | **0** | **100%** |

*(Cumulative test counts across all implementation phases: Lab 1 server: 2, Issue #3: 6, Issue #4: 19, Issue #5: 31, Issue #6: 13 = 71 server tests; Lab 1 client: 3, Issue #3: 3, Issue #4: 7, Issue #5: 8, Issue #6: 7 = 28 client tests. All 99 unit, integration, and component tests are passing with 0 skipped or disabled tests).*

---

## 7. Known Limitations & Deferred Tests

1. **Authentication Tests**: Full JWT/session login, password hashing, and user registration are deferred to Lab 3.
2. **IT Staff Queue & Status Workflow**: Triage, assigning tickets, IT priority overrides, and changing status beyond `New` (e.g. resolving, closing) are explicitly out of scope for Lab 2.
3. **Internal Notes & Comments**: Collaboration threads and comment notifications are deferred to future labs.
