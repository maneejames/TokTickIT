# TokTickIT — Sprint 3 Test Plan and Traceability Matrix

`docs/lab-03/tests.md`

---

## 1. Test Strategy

Sprint 3 implements a rigorous Test-Driven Development (TDD) and Test-Driven Delivery (Test DD) workflow:
1. **API Integration Tests (Supertest + Vitest)**:
   - Verify server-side authorization guards, session cookie validation, role isolation, ticket workflow transitions, ownership rules, comment/note visibility boundaries, and admin safety guards against real PostgreSQL test instances.
2. **Frontend Component & Hook Tests (Vitest + React Testing Library)**:
   - Test login forms, mandatory password barriers, dynamic role-based headers, queue filter bars, staff operational action modals, distinct public/internal note composer rendering, and admin modals.
3. **End-to-End Acceptance Tests (Playwright)**:
   - Exercise cross-role flows: first-login password changes, IT Staff queue claiming and status transitions, requester public comment exchanges, and administrator user creation/editing.
4. **Visual & Responsive Audits**:
   - Capture multi-viewport screenshots across desktop (1280px), tablet (768px), and mobile (375px) in `artifacts/lab-03/screenshots/`.

---

## 2. Planned Tests Table

| Test ID | Type | Target AC / BR | What It Tests | Expected Result | Automated Test File Path | Status |
|---|---|---|---|---|---|---|
| **AUTH-API-01** | API | AC-01 | Valid credential login | 200 OK; sets `toktickit_session` cookie; returns user payload | `server/tests/lab-03/auth.api.test.ts` | Planned |
| **AUTH-API-02** | API | AC-05 | Inactive user login attempt | 401 Unauthorized; generic error message | `server/tests/lab-03/auth.api.test.ts` | Planned |
| **AUTH-API-03** | API | AC-06 | Bad password or unknown email | 401 Unauthorized; generic error message | `server/tests/lab-03/auth.api.test.ts` | Planned |
| **AUTH-API-04** | API | AC-07 | Session logout | 200 OK; JSON message returned; cookie cleared; session invalidated on subsequent calls | `server/tests/lab-03/auth.api.test.ts` | Planned |
| **AUTH-API-05** | API | AC-03 | Password change with valid complexity | 200 OK; `mustChangePassword` flag cleared | `server/tests/lab-03/auth.api.test.ts` | Planned |
| **AUTH-API-06** | API | AC-04 | Password change failing complexity | 400 Bad Request; field error with complexity hints | `server/tests/lab-03/auth.api.test.ts` | Planned |
| **AUTH-API-07** | API | AC-02, BR-02 | Block normal API if `mustChangePassword=true` | 403 Forbidden on `/api/tickets` until password is changed | `server/tests/lab-03/auth.api.test.ts` | Planned |
| **AUTH-UI-01** | UI | AC-01 | Login screen submission and busy state | Spinner activates; inputs disabled; routes upon success | `client/tests/lab-03/Login.test.tsx` | Planned |
| **AUTH-UI-02** | UI | AC-05, AC-06 | Login error display | Inline error banner rendered; password field cleared | `client/tests/lab-03/Login.test.tsx` | Planned |
| **AUTH-UI-03** | UI | AC-02, AC-03 | Mandatory Change Password screen | Form enforces complexity rules; redirects to app on completion | `client/tests/lab-03/ChangePassword.test.tsx` | Planned |
| **AUTH-E2E-01** | E2E | AC-01, AC-07 | End-to-end login, view profile, and logout | Session persists on refresh, terminates cleanly on logout | `e2e/lab-03/authentication.spec.ts` | Planned |
| **AUTH-E2E-02** | E2E | AC-02, AC-03 | First login password change flow | Seed user with temp password forced to update before accessing queue | `e2e/lab-03/authentication.spec.ts` | Planned |
| **AUTHZ-API-01**| API | AC-08 | Unauthenticated access to protected routes | 401 Unauthorized across all protected endpoints | `server/tests/lab-03/authorization.api.test.ts` | Planned |
| **AUTHZ-API-02**| API | AC-09, AC-31 | Role-based permission guards | Requester cannot call staff/admin; Staff cannot call admin | `server/tests/lab-03/authorization.api.test.ts` | Planned |
| **AUTHZ-API-03**| API | AC-10 | Authenticated identity derives ownership | Server ignores client-provided `requesterId` in payload | `server/tests/lab-03/authorization.api.test.ts` | Planned |
| **AUTHZ-API-04**| API | AC-12 | Cross-requester ticket access rejection | Requester accessing another requester's ticket returns 404 | `server/tests/lab-03/authorization.api.test.ts` | Planned |
| **QUEUE-API-01**| API | AC-13 | IT Staff ticket queue retrieval | 200 OK; returns paginated tickets with ownership and priority | `server/tests/lab-03/staff-queue.api.test.ts` | Planned |
| **QUEUE-API-02**| API | AC-13 | Queue search and filtering | Filters by status, priority, and substring search | `server/tests/lab-03/staff-queue.api.test.ts` | Planned |
| **QUEUE-UI-01** | UI | AC-13 | Ticket queue table rendering and sorting | Renders 9 columns with priority and status badges | `client/tests/lab-03/StaffTicketQueue.test.tsx` | Planned |
| **QUEUE-UI-02** | UI | AC-13 | Queue search toolbar and empty/no-result states | Demonstrates loading shimmer, empty, and no-results feedback | `client/tests/lab-03/StaffTicketQueue.test.tsx` | Planned |
| **DETAIL-API-01**| API| AC-14 | IT Staff claims unassigned ticket | 200 OK; `ownerId` set to calling staff member | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | Planned |
| **DETAIL-API-02**| API| AC-15 | IT Staff reassigns ticket to another active staff | 200 OK; reassigning to inactive user returns 400 | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | Planned |
| **DETAIL-API-03**| API| AC-16 | IT Staff modifies IT Priority | 200 OK; `itPriority` updated; `requestedPriority` unchanged | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | Planned |
| **DETAIL-API-04**| API| AC-17, AC-18 | Status transition matrix enforcement | Valid transitions succeed (200); invalid transitions return 400 | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | Planned |
| **DETAIL-UI-01**| UI | AC-14, AC-16 | Claim, reassign, and priority controls | Operational header reflects real-time status and ownership changes | `client/tests/lab-03/StaffTicketDetail.test.tsx` | Planned |
| **COMMS-API-01**| API | AC-19 | Post and retrieve Public Comments | 201 Created; visible to both Requester owner and IT Staff | `server/tests/lab-03/comments-notes.api.test.ts` | Planned |
| **COMMS-API-02**| API | AC-20, AC-21, AC-33 | Post and retrieve Internal Notes | 201 Created for Staff; strictly rejected with 403 for Requester and 403 for Admin (asserted in separate test cases) | `server/tests/lab-03/comments-notes.api.test.ts` | Planned |
| **COMMS-API-03**| API | AC-22 | Empty/whitespace comment/note rejection | 400 Bad Request if trimmed content is empty | `server/tests/lab-03/comments-notes.api.test.ts` | Planned |
| **COMMS-API-04**| API | AC-23 | Requester "Problem Appears Resolved" toggle | 200 OK; `isRequesterResolved` updated; status stays intact | `server/tests/lab-03/comments-notes.api.test.ts` | Planned |
| **ADMIN-API-01**| API | AC-24 | Admin lists users with search/role filter | 200 OK; returns matching user list with roles and active flags | `server/tests/lab-03/users-admin.api.test.ts` | Planned |
| **ADMIN-API-02**| API | AC-25 | Admin creates new user with initial password | 201 Created; password hashed; `mustChangePassword=true` | `server/tests/lab-03/users-admin.api.test.ts` | Planned |
| **ADMIN-API-03**| API | AC-26 | Reject duplicate email creation | 409 Conflict when email already in database | `server/tests/lab-03/users-admin.api.test.ts` | Planned |
| **ADMIN-API-04**| API | AC-27 | Admin edits user details and role | 200 OK; updates persisted | `server/tests/lab-03/users-admin.api.test.ts` | Planned |
| **ADMIN-API-05**| API | AC-28 | Admin self-deactivation prevention | 400 Bad Request when admin deactivates own ID | `server/tests/lab-03/users-admin.api.test.ts` | Planned |
| **ADMIN-API-06**| API | AC-29 | Last active Administrator guard | 400 Bad Request when attempting to deactivate sole admin | `server/tests/lab-03/users-admin.api.test.ts` | Planned |
| **ADMIN-API-07**| API | AC-30 | Admin sets new initial password | 200 OK; updates hash; sets `mustChangePassword=true` | `server/tests/lab-03/users-admin.api.test.ts` | Planned |
| **ADMIN-UI-01** | UI | AC-24, AC-25 | Admin User Management table and Create modal | Table renders user list; modal handles validation and creation | `client/tests/lab-03/UserManagement.test.tsx` | Planned |
| **ADMIN-UI-02** | UI | AC-28, AC-29 | Deactivation safety checks in UI | Self-deactivate and last admin deactivate controls disabled | `client/tests/lab-03/UserManagement.test.tsx` | Planned |
| **ADMIN-E2E-01**| E2E | AC-24–AC-30 | Full user administration lifecycle | Admin creates user -> sets password -> user logs in -> forces change | `e2e/lab-03/user-administration.spec.ts` | Planned |
| **STAFF-E2E-01**| E2E | AC-13–AC-23 | IT Staff ticket workflow journey | Staff opens queue -> claims ticket -> updates status -> adds note | `e2e/lab-03/staff-ticket-flow.spec.ts` | Planned |

---

## 3. Acceptance Criterion Traceability Matrix

Every Acceptance Criterion defined in `docs/lab-03/specification.md` maps to one or more automated test files:

| Acceptance Criterion | Description | Primary Automated Test IDs | Concrete Test File Path |
|---|---|---|---|
| **AC-01** | Valid credential login establishes session | `AUTH-API-01`, `AUTH-UI-01`, `AUTH-E2E-01` | `server/tests/lab-03/auth.api.test.ts`<br>`client/tests/lab-03/Login.test.tsx`<br>`e2e/lab-03/authentication.spec.ts` |
| **AC-02** | First-login password change blocks normal access | `AUTH-API-07`, `AUTH-UI-03`, `AUTH-E2E-02` | `server/tests/lab-03/auth.api.test.ts`<br>`client/tests/lab-03/ChangePassword.test.tsx`<br>`e2e/lab-03/authentication.spec.ts` |
| **AC-03** | Valid new password unlocks normal app | `AUTH-API-05`, `AUTH-UI-03`, `AUTH-E2E-02` | `server/tests/lab-03/auth.api.test.ts`<br>`client/tests/lab-03/ChangePassword.test.tsx`<br>`e2e/lab-03/authentication.spec.ts` |
| **AC-04** | Password change rejects non-complex passwords | `AUTH-API-06`, `AUTH-UI-03` | `server/tests/lab-03/auth.api.test.ts`<br>`client/tests/lab-03/ChangePassword.test.tsx` |
| **AC-05** | Inactive user login returns safe 401 | `AUTH-API-02`, `AUTH-UI-02` | `server/tests/lab-03/auth.api.test.ts`<br>`client/tests/lab-03/Login.test.tsx` |
| **AC-06** | Invalid credentials return safe 401 | `AUTH-API-03`, `AUTH-UI-02` | `server/tests/lab-03/auth.api.test.ts`<br>`client/tests/lab-03/Login.test.tsx` |
| **AC-07** | Logout invalidates session and clears cookie | `AUTH-API-04`, `AUTH-E2E-01` | `server/tests/lab-03/auth.api.test.ts`<br>`e2e/lab-03/authentication.spec.ts` |
| **AC-08** | Unauthenticated requests return 401 | `AUTHZ-API-01` | `server/tests/lab-03/authorization.api.test.ts` |
| **AC-09** | Role permission enforcement returns 403 | `AUTHZ-API-02` | `server/tests/lab-03/authorization.api.test.ts` |
| **AC-10** | Server ignores client-supplied `requesterId` | `AUTHZ-API-03` | `server/tests/lab-03/authorization.api.test.ts` |
| **AC-11** | Requester My Tickets returns only owned tickets | `AUTHZ-API-02`, `AUTHZ-API-03` | `server/tests/lab-03/authorization.api.test.ts` |
| **AC-12** | Cross-requester ticket detail access returns 404 | `AUTHZ-API-04` | `server/tests/lab-03/authorization.api.test.ts` |
| **AC-13** | IT Staff queue search, filter, sort, pagination | `QUEUE-API-01`, `QUEUE-API-02`, `QUEUE-UI-01`, `QUEUE-UI-02`, `STAFF-E2E-01` | `server/tests/lab-03/staff-queue.api.test.ts`<br>`client/tests/lab-03/StaffTicketQueue.test.tsx`<br>`e2e/lab-03/staff-ticket-flow.spec.ts` |
| **AC-14** | IT Staff claims unassigned ticket | `DETAIL-API-01`, `DETAIL-UI-01`, `STAFF-E2E-01` | `server/tests/lab-03/staff-ticket-detail.api.test.ts`<br>`client/tests/lab-03/StaffTicketDetail.test.tsx`<br>`e2e/lab-03/staff-ticket-flow.spec.ts` |
| **AC-15** | IT Staff reassigns ticket ownership | `DETAIL-API-02`, `DETAIL-UI-01` | `server/tests/lab-03/staff-ticket-detail.api.test.ts`<br>`client/tests/lab-03/StaffTicketDetail.test.tsx` |
| **AC-16** | IT Staff updates IT Priority | `DETAIL-API-03`, `DETAIL-UI-01` | `server/tests/lab-03/staff-ticket-detail.api.test.ts`<br>`client/tests/lab-03/StaffTicketDetail.test.tsx` |
| **AC-17** | Invalid status transition rejected with 400 | `DETAIL-API-04` | `server/tests/lab-03/staff-ticket-detail.api.test.ts` |
| **AC-18** | Permitted status transitions update lifecycle | `DETAIL-API-04`, `DETAIL-UI-01`, `STAFF-E2E-01` | `server/tests/lab-03/staff-ticket-detail.api.test.ts`<br>`client/tests/lab-03/StaffTicketDetail.test.tsx`<br>`e2e/lab-03/staff-ticket-flow.spec.ts` |
| **AC-19** | Public comments authored and retrieved | `COMMS-API-01`, `STAFF-E2E-01` | `server/tests/lab-03/comments-notes.api.test.ts`<br>`e2e/lab-03/staff-ticket-flow.spec.ts` |
| **AC-20** | Internal notes authored and retrieved by Staff | `COMMS-API-02`, `STAFF-E2E-01` | `server/tests/lab-03/comments-notes.api.test.ts`<br>`e2e/lab-03/staff-ticket-flow.spec.ts` |
| **AC-21** | Requester forbidden from accessing internal notes | `COMMS-API-02` | `server/tests/lab-03/comments-notes.api.test.ts` |
| **AC-22** | Empty or whitespace comment/note rejected | `COMMS-API-03` | `server/tests/lab-03/comments-notes.api.test.ts` |
| **AC-23** | Requester indicates problem appears resolved | `COMMS-API-04` | `server/tests/lab-03/comments-notes.api.test.ts` |
| **AC-24** | Admin lists users with search and role filter | `ADMIN-API-01`, `ADMIN-UI-01`, `ADMIN-E2E-01` | `server/tests/lab-03/users-admin.api.test.ts`<br>`client/tests/lab-03/UserManagement.test.tsx`<br>`e2e/lab-03/user-administration.spec.ts` |
| **AC-25** | Admin creates user with initial password | `ADMIN-API-02`, `ADMIN-UI-01`, `ADMIN-E2E-01` | `server/tests/lab-03/users-admin.api.test.ts`<br>`client/tests/lab-03/UserManagement.test.tsx`<br>`e2e/lab-03/user-administration.spec.ts` |
| **AC-26** | Duplicate email rejected with 409 Conflict | `ADMIN-API-03`, `ADMIN-UI-01` | `server/tests/lab-03/users-admin.api.test.ts`<br>`client/tests/lab-03/UserManagement.test.tsx` |
| **AC-27** | Admin edits user details and role | `ADMIN-API-04`, `ADMIN-UI-01`, `ADMIN-E2E-01` | `server/tests/lab-03/users-admin.api.test.ts`<br>`client/tests/lab-03/UserManagement.test.tsx`<br>`e2e/lab-03/user-administration.spec.ts` |
| **AC-28** | Admin self-deactivation rejected | `ADMIN-API-05`, `ADMIN-UI-02` | `server/tests/lab-03/users-admin.api.test.ts`<br>`client/tests/lab-03/UserManagement.test.tsx` |
| **AC-29** | Last active administrator removal rejected | `ADMIN-API-06`, `ADMIN-UI-02` | `server/tests/lab-03/users-admin.api.test.ts`<br>`client/tests/lab-03/UserManagement.test.tsx` |
| **AC-30** | Admin resets user initial password | `ADMIN-API-07`, `ADMIN-E2E-01` | `server/tests/lab-03/users-admin.api.test.ts`<br>`e2e/lab-03/user-administration.spec.ts` |
| **AC-31** | Non-Admin forbidden from calling admin endpoints | `AUTHZ-API-02` | `server/tests/lab-03/authorization.api.test.ts` |
| **AC-32** | Seed execution is idempotent | Script test | `server/prisma/seed.ts` |
| **AC-33** | Administrator forbidden from internal notes & comments | `COMMS-API-02`, `AUTHZ-API-02` | `server/tests/lab-03/comments-notes.api.test.ts`<br>`server/tests/lab-03/authorization.api.test.ts` |

---

## 4. Execution Commands

### Run Backend API Integration Tests
```bash
cd server
npm test -- tests/lab-03
```

### Run Frontend Component Tests
```bash
cd client
npm test -- tests/lab-03
```

### Run Playwright End-to-End Tests
```bash
npx playwright test e2e/lab-03
```
