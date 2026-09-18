# TokTickIT — Sprint 3 Engineering Specification

`docs/lab-03/specification.md`

---

## 1. Sprint Goal

Sprint 3 replaces the temporary Development Requester selector with real authentication and server-enforced, role-based authorization. It delivers the first operational IT Staff workflow (Ticket Queue and Ticket Detail with ownership, priority, status, public comments, and internal notes) and a minimalist Administrator User Management screen, while preserving every Lab 2 Requester capability under the authenticated identity. This sprint does not introduce Actions Taken, SLA/escalation logic, notifications, self-registration, or production deployment concerns.

---

## 2. Stakeholder Request (Interpretation)

The temporary Development Requester selector was useful for bootstrapping MVP ticket submission in Lab 2, but the system now requires authentic users and access control. 

The application must support three distinct roles:
1. **Requester**: Authenticate with email/password; file and track owned tickets and attachments; communicate with IT via Public Comments; signal when a problem appears resolved (without changing formal ticket status).
2. **IT Staff**: Access a shared Ticket Queue; claim or reassign tickets; update IT Priority; transition ticket status across an approved lifecycle; post Public Comments; record private Internal Notes.
3. **Administrator**: Manage user accounts via a minimalist screen (create user, assign one role, edit details, activate/deactivate, issue temporary initial password). Administrators do not manage tickets.

Security must be enforced strictly on the backend: hiding or disabling frontend buttons is helpful UX feedback, not an authorization control. Users receiving an initial password must be forced to choose a new password before accessing the application. All interfaces must adhere strictly to the Zen Green design system established in Lab 2.

---

## 3. Scope

### 3.1 Included
- **Authentication & Session**: Secure login with email/password, bcrypt password hashing, HTTP-only secure cookie session token (`toktickit_session`), logout with server-side invalidation, `GET /api/auth/me` current-user retrieval.
- **First-Login Password Change**: Mandatory password change barrier for accounts with initial passwords (`mustChangePassword: true`) blocking all normal API and screen access until resolved.
- **Server-Side Authorization Layer**: Role-based access control (RBAC) and ownership verification middleware for all endpoints. Requester identity is always derived from the authenticated session, ignoring client-supplied IDs.
- **Requester Continuity & Additions**: Full regression compatibility of Lab 2 ticket submission, listing, detail, and attachments under authenticated identity. Removal of Dev Requester selector. Addition of Public Comments and "Problem Appears Resolved" flag on Ticket Detail.
- **IT Staff Ticket Queue**: Paginated shared queue supporting full-text search, status/priority/category filters, sorting, ownership indicators, and responsive desktop table + mobile card views.
- **IT Staff Ticket Detail Operations**: View any ticket, claim/assign/reassign ownership, adjust IT Priority, transition status per transition matrix, author/view Public Comments, author/view Internal Notes.
- **Administrator User Management**: Minimalist user table, name/email search, role filter, modal/form to create users with initial passwords, edit user details/role/activation state, set new initial password, and enforce critical safety rules (prevent self-deactivation and prevent removing the last active administrator).
- **Data Model Migration & Idempotent Seed**: Evolution of PostgreSQL Prisma schema from Lab 2; migration preserving existing tickets/attachments; idempotent seed with ≥4 active requesters, ≥1 inactive requester, ≥3 active IT staff, ≥1 inactive IT staff, and ≥1 active administrator.

### 3.2 Explicitly Excluded
- Email delivery (invitations, password resets, ticket notifications).
- Self-registration / public sign-up.
- Multi-factor authentication (MFA), social login, OAuth, single sign-on (SSO).
- Actions Taken on tickets (deferred to Lab 4).
- Formal SLA calculation, automated escalation, webhooks.
- Multi-role assignment (each user has exactly one role).
- User deletion, bulk operations, CSV import/export, role history audit trail.
- Department/organization hierarchies or profile image uploads.
- Multi-column sorting or simultaneous complex filters on the Administrator user list.

---

## 4. Functional Requirements

### 4.1 Authentication & Password Management
- **FR-01 (Credential Login)**: The system shall authenticate users using a valid email address and password via `POST /api/auth/login`.
- **FR-02 (Session Issuance & Invalidation)**: The system shall issue a signed HTTP-only cookie session upon successful login and invalidate it immediately upon `POST /api/auth/logout`.
- **FR-03 (Current User Context)**: The system shall expose `GET /api/auth/me` returning the authenticated user's ID, name, email, role, and `mustChangePassword` flag.
- **FR-04 (Mandatory Password Change)**: The system shall force any authenticated user with `mustChangePassword: true` to update their password via `POST /api/auth/change-password` before granting access to standard application endpoints.
- **FR-05 (Inactive Account Handling)**: The system shall reject authentication attempts for inactive accounts (`isActive: false`) with a safe message (`401 Unauthorized: Invalid email or password`).

### 4.2 Server-Side Authorization
- **FR-06 (Role-Based Access Control)**: The system shall enforce role checks on every protected endpoint, returning `401 Unauthorized` for unauthenticated requests and `403 Forbidden` for authenticated requests lacking required role permissions.
- **FR-07 (Session-Derived Ownership)**: The system shall derive ticket and comment ownership strictly from the authenticated session context, discarding any client-provided `requesterId` or `userId`.
- **FR-08 (Safe Error Responses)**: The system shall return standard error envelopes without leaking resource existence or sensitive system details across permission boundaries.

### 4.3 Requester Operations (Regression & Additions)
- **FR-09 (Requester Continuity)**: Authenticated Requesters shall retain all Lab 2 capabilities: create tickets, view owned tickets (search, filter, sort, paginate), inspect ticket detail, download owned attachments, and soft-remove attachments.
- **FR-10 (Requester Public Comments)**: An authenticated Requester shall be able to post Public Comments on their own tickets and view all Public Comments authored on their tickets.
- **FR-11 (Problem Appears Resolved Flag)**: An authenticated Requester shall be able to toggle/indicate "Problem Appears Resolved" on their owned tickets without altering the formal ticket status.

### 4.4 IT Staff Queue & Operations
- **FR-12 (IT Ticket Queue)**: IT Staff shall be able to query the shared ticket queue with search (summary, ticket number), filters (status, IT priority, category), sorting, and pagination.
- **FR-13 (Universal Ticket View)**: IT Staff shall be able to view the full details and attachments of any ticket in the system.
- **FR-14 (Ownership Claim and Reassignment)**: IT Staff shall be able to claim unassigned tickets or reassign tickets to any active IT Staff or Administrator account.
- **FR-15 (IT Priority Management)**: IT Staff shall be able to update the IT Priority (`LOW`, `MEDIUM`, `HIGH`, `URGENT`) of any ticket.
- **FR-16 (Status Lifecycle Transitions)**: IT Staff shall be able to update ticket status strictly adhering to the approved Ticket Status Transition Matrix.
- **FR-17 (Staff Public Comments & Internal Notes)**: IT Staff shall be able to post Public Comments (visible to Requesters) and private Internal Notes (strictly forbidden to Requesters and Administrators) on any ticket.
- **FR-18 (Internal Note Secrecy)**: The system shall strictly prevent Requesters and Administrators from reading or creating Internal Notes under any condition (returning `403 Forbidden`).

### 4.5 Administrator User Management
- **FR-19 (User Listing & Search)**: Administrators shall be able to list all user accounts with substring search by name or email, and optional filtering by role.
- **FR-20 (User Account Creation)**: Administrators shall be able to create a new user account specifying name, email, exactly one role (`REQUESTER`, `IT_STAFF`, or `ADMINISTRATOR`), activation state, and an initial password.
- **FR-21 (User Account Editing)**: Administrators shall be able to edit a user's name, email, role, and active status.
- **FR-22 (Initial Password Reset)**: Administrators shall be able to assign a new temporary initial password to any user, automatically setting `mustChangePassword: true`.
- **FR-23 (Duplicate Email Prevention)**: The system shall reject user creation or email modification if the email address is already registered to another account (`409 Conflict`).
- **FR-24 (Self-Deactivation Guard)**: The system shall reject any attempt by an Administrator to deactivate their own account (`400 Bad Request`).
- **FR-25 (Last Administrator Protection)**: The system shall reject any deactivation or role reassignment that would result in zero active Administrators (`400 Bad Request`).

---

## 5. Business Rules

| BR ID | Rule Statement |
|---|---|
| **BR-01** | Only an active user (`isActive: true`) with valid credentials may authenticate. |
| **BR-02** | A user with `mustChangePassword: true` cannot enter normal application screens or call operational endpoints until a new valid password meeting complexity rules is saved. |
| **BR-03** | Authenticated session identity, not any client-supplied `requesterId`, determines ownership and authorization for all Requester operations. |
| **BR-04** | Public Comments are visible to Requester (owner) and IT Staff. Internal Notes are visible ONLY to IT Staff; access by Requesters and Administrators is strictly rejected (`403 Forbidden`). |
| **BR-05** | A Requester may indicate that a problem appears resolved (`isRequesterResolved: true`), but cannot formally change the Ticket status to `Resolved` or `Closed`. Only IT Staff may update formal ticket status. |
| **BR-06** | Authentication failures (incorrect password or unknown email) must return an identical generic error (`401 Unauthorized: Invalid email or password`) to prevent account enumeration. |
| **BR-07** | Passwords must never be stored in plaintext. Passwords must be hashed using `bcrypt` (work factor ≥ 10). |
| **BR-08** | New passwords (chosen on first-login change or set as initial passwords) must meet complexity rules: min 8 characters, at least one uppercase letter, at least one lowercase letter, at least one digit, and at least one special character (`[!@#$%^&*(),.?":{}|<>]`). |
| **BR-09** | Logging out must immediately destroy the session on the server and clear the session cookie on the client. |
| **BR-10** | If an active user account is deactivated by an Administrator or flagged for password reset, any existing session tokens for that user become invalid on their next request via database re-validation. |
| **BR-11** | Session validation middleware must check `isActive` and `mustChangePassword` status against the database on every authenticated request to guarantee immediate role, status, or activation revocation. |
| **BR-12** | A Ticket may have at most one primary Ticket Owner (`ownerId`), who must be an active IT Staff or Administrator. Tickets may initially be unassigned (`ownerId: null`). |
| **BR-13** | Requested Priority is selected by the Requester at creation and is immutable thereafter. |
| **BR-14** | IT Priority defaults to Requested Priority upon ticket creation. It can subsequently be updated only by IT Staff or Administrator. |
| **BR-15** | Ticket status changes must strictly obey the approved Ticket Status Transition Matrix. Invalid transitions are rejected (`400 Bad Request`). |
| **BR-16** | Only IT Staff or Administrator may transition a Ticket to `Resolved`, `Closed`, `Reopened`, or `Cancelled`. |
| **BR-17** | Public Comments and Internal Notes are append-only. Editing, modification, and deletion are strictly excluded. |
| **BR-18** | Comment and Note content must be trimmed of leading/trailing whitespace. Content must be 1 to 2,000 characters; empty or whitespace-only submissions are rejected (`400 Bad Request`). |
| **BR-19** | Every Public Comment and Internal Note records its author (`authorId`) and timestamp (`createdAt`) generated by the backend server; client timestamps are ignored. |
| **BR-20** | Each user has exactly one assigned role: `REQUESTER`, `IT_STAFF`, or `ADMINISTRATOR`. Multiple roles per user are prohibited. |
| **BR-21** | User email addresses must be unique across the entire database. Duplicate email submissions are rejected with `409 Conflict`. |
| **BR-22** | An Administrator is strictly forbidden from deactivating their own account (`400 Bad Request`). |
| **BR-23** | The system must always have at least one active Administrator. Deactivating or reassigning the role of the sole remaining active Administrator is blocked (`400 Bad Request`). |
| **BR-24** | User deletion is not supported. Account removal is performed exclusively via deactivation (`isActive: false`). |
| **BR-25** | All Lab 2 ticket number sequencing (`TICK-YYYYMMDD-XXXX`), attachment constraints (max 5 active, max 5 MB, JPEG/PNG/WEBP/PDF), and soft-removal rules (`410 Gone` on download) continue unchanged under the authenticated data model. |
| **BR-26** | A successful password change (first-login or self-service) must invalidate the pre-change session and issue a new session token; the old token must be rejected on any subsequent request. |

---

## 6. Authorization Matrix

| Operation / Endpoint Group | Unauthenticated | Requester | IT Staff | Administrator |
|---|:---:|:---:|:---:|:---:|
| `POST /api/auth/login` | ✅ | ✅ | ✅ | ✅ |
| `POST /api/auth/logout` | ❌ (401) | ✅ | ✅ | ✅ |
| `GET /api/auth/me` | ❌ (401) | ✅ | ✅ | ✅ |
| `POST /api/auth/change-password` | ❌ (401) | ✅ | ✅ | ✅ |
| `POST /api/tickets` (Create Ticket) | ❌ (401) | ✅ | ❌ (403) | ❌ (403) |
| `GET /api/tickets` (My Tickets) | ❌ (401) | ✅ (Owned only) | ❌ (403) | ❌ (403) |
| `GET /api/tickets/:id` (Ticket Detail) | ❌ (401) | ✅ (Owned only) | ✅ (Any ticket) | ❌ (403) |
| `POST /api/tickets/:id/attachments` | ❌ (401) | ✅ (Owned only) | ❌ (403) | ❌ (403) |
| `GET /api/tickets/:id/attachments/:id/download` | ❌ (401) | ✅ (Owned only) | ✅ (Any ticket) | ❌ (403) |
| `DELETE /api/tickets/:id/attachments/:id` | ❌ (401) | ✅ (Owned only) | ❌ (403) | ❌ (403) |
| `POST /api/tickets/:id/comments` (Public Comment) | ❌ (401) | ✅ (Owned only) | ✅ (Any ticket) | ❌ (403) |
| `GET /api/tickets/:id/comments` | ❌ (401) | ✅ (Owned only) | ✅ (Any ticket) | ❌ (403) |
| `PATCH /api/tickets/:id/resolve-indicator` | ❌ (401) | ✅ (Owned only) | ❌ (403) | ❌ (403) |
| `GET /api/staff/tickets` (Staff Queue) | ❌ (401) | ❌ (403) | ✅ | ❌ (403) |
| `PATCH /api/staff/tickets/:id/owner` | ❌ (401) | ❌ (403) | ✅ | ❌ (403) |
| `PATCH /api/staff/tickets/:id/priority` | ❌ (401) | ❌ (403) | ✅ | ❌ (403) |
| `PATCH /api/staff/tickets/:id/status` | ❌ (401) | ❌ (403) | ✅ | ❌ (403) |
| `POST /api/tickets/:id/notes` (Internal Note) | ❌ (401) | ❌ (403) | ✅ | ❌ (403) |
| `GET /api/tickets/:id/notes` | ❌ (401) | ❌ (403) | ✅ | ❌ (403) |
| `GET /api/admin/users` (List/Search Users) | ❌ (401) | ❌ (403) | ❌ (403) | ✅ |
| `POST /api/admin/users` (Create User) | ❌ (401) | ❌ (403) | ❌ (403) | ✅ |
| `PATCH /api/admin/users/:id` (Edit User) | ❌ (401) | ❌ (403) | ❌ (403) | ✅ |
| `POST /api/admin/users/:id/reset-password` | ❌ (401) | ❌ (403) | ❌ (403) | ✅ |

---

## 7. Ticket Status Transition Matrix

The required ticket statuses are defined in the database and API using `SCREAMING_SNAKE_CASE` (`NEW`, `OPEN`, `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `RESOLVED`, `CLOSED`, `REOPENED`, `CANCELLED`) and rendered in the UI using Title Case (`New`, `Open`, `In Progress`, `Waiting for Requester`, `Resolved`, `Closed`, `Reopened`, `Cancelled`).

| Current Status | Permitted Next Status | Allowed Roles | Business Meaning & Rules |
|---|---|:---:|---|
| **NEW** (`New`) | `OPEN` (`Open`) | IT Staff | IT Staff claims or begins review of the new ticket. |
| **NEW** (`New`) | `CANCELLED` (`Cancelled`) | IT Staff | Ticket was submitted in error or deemed invalid prior to triage. |
| **OPEN** (`Open`) | `IN_PROGRESS` (`In Progress`) | IT Staff | Active work or troubleshooting is underway. |
| **OPEN** (`Open`) | `CANCELLED` (`Cancelled`) | IT Staff | Ticket cancelled after review. |
| **IN_PROGRESS** (`In Progress`) | `WAITING_FOR_REQUESTER` (`Waiting for Requester`) | IT Staff | Staff has requested additional information or testing from Requester. |
| **IN_PROGRESS** (`In Progress`) | `RESOLVED` (`Resolved`) | IT Staff | Technical remedy implemented and verified by IT Staff. |
| **IN_PROGRESS** (`In Progress`) | `CANCELLED` (`Cancelled`) | IT Staff | Issue abandoned or superseded. |
| **WAITING_FOR_REQUESTER** (`Waiting for Requester`) | `IN_PROGRESS` (`In Progress`) | IT Staff | Requester provided requested feedback or comments. |
| **WAITING_FOR_REQUESTER** (`Waiting for Requester`) | `RESOLVED` (`Resolved`) | IT Staff | Requester indicated problem resolved or issue verified. |
| **WAITING_FOR_REQUESTER** (`Waiting for Requester`) | `CANCELLED` (`Cancelled`) | IT Staff | No response or ticket withdrawn. |
| **RESOLVED** (`Resolved`) | `CLOSED` (`Closed`) | IT Staff | Formal ticket closure following confirmation period. |
| **RESOLVED** (`Resolved`) | `REOPENED` (`Reopened`) | IT Staff | Requester indicates the issue persists or recurred. |
| **CLOSED** (`Closed`) | `REOPENED` (`Reopened`) | IT Staff | Closed ticket re-activated due to recurrence. |
| **CANCELLED** (`Cancelled`) | *(Terminal)* | — | No further transitions permitted. |

*Note*: Any transition attempt not explicitly defined in the table above is rejected with `400 Bad Request`. Requesters and Administrators cannot execute status transitions.

---

## 8. Data Changes & Migration

### 8.1 Schema Adjustments (`server/prisma/schema.prisma`)
1. **New Enums**:
   - `Role`: `REQUESTER`, `IT_STAFF`, `ADMINISTRATOR`
   - `TicketStatus`: `NEW`, `OPEN`, `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `RESOLVED`, `CLOSED`, `REOPENED`, `CANCELLED`
   - `Priority`: `LOW`, `MEDIUM`, `HIGH`, `URGENT`
2. **Model `User`**:
   - `id`: Int (Autoincrement, Primary Key)
   - `name`: String
   - `email`: String (Unique)
   - `passwordHash`: String
   - `role`: Role (Default: `REQUESTER`)
   - `isActive`: Boolean (Default: `true`)
   - `mustChangePassword`: Boolean (Default: `false`)
   - `createdAt`: DateTime (Default: `now()`)
   - `updatedAt`: DateTime (Updated: `now()`)
3. **Model `Ticket` updates**:
   - `ownerId`: Int? (Foreign Key → `User.id`, nullable)
   - `itPriority`: Priority (Defaults to copy of `requestedPriority`)
   - `isRequesterResolved`: Boolean (Default: `false`)
   - `requesterId`: Int (Repointed Foreign Key → `User.id`)
4. **New Model `PublicComment`**:
   - `id`: Int (Autoincrement, Primary Key)
   - `ticketId`: Int (Foreign Key → `Ticket.id`, Cascade delete)
   - `authorId`: Int (Foreign Key → `User.id`)
   - `content`: String (Text, 1–2000 chars)
   - `createdAt`: DateTime (Default: `now()`)
5. **New Model `InternalNote`**:
   - `id`: Int (Autoincrement, Primary Key)
   - `ticketId`: Int (Foreign Key → `Ticket.id`, Cascade delete)
   - `authorId`: Int (Foreign Key → `User.id`)
   - `content`: String (Text, 1–2000 chars)
   - `createdAt`: DateTime (Default: `now()`)
6. **Retired Model**:
   - `RequesterUser` (Lab 2 temporary model) is deleted in Phase B, once Issue #6 repoints Lab 2 routes off it.

### 8.2 Migration Plan
The migration executes in two explicit phases without data loss:
- **Phase A (Issue #3 — this issue)**: Create the `User` table (with enums `Role`, `TicketStatus`, and `Priority`) and tables `PublicComment`, `InternalNote`. Copy existing `RequesterUser` records into `User` with matching `id`, name, email, `role = 'REQUESTER'`, `isActive = true`, `mustChangePassword = true`, and initial bcrypt `passwordHash`. Repoint `Ticket.requesterId` foreign key to `User.id`, add nullable `Ticket.ownerId` pointing to `User.id`, add `Ticket.isRequesterResolved` (default `false`), and initialize `Ticket.itPriority` to match `Ticket.requestedPriority`. The `requester_users` table remains in place temporarily to keep Lab 2 routes and regression tests passing.
- **Phase B (Issue #6)**: Drop the `requester_users` table once Lab 2 routes and tests no longer reference `RequesterUser`.

### 8.3 Idempotent Seed Data (`server/prisma/seed.ts`)
All seeded accounts are created with standard local development password: `Password123!`.

*Assumption on `isRequesterResolved`*: Seed tickets are seeded with `isRequesterResolved: false` universally for now because no feature in the current implementation state can set it `true` yet; a seed ticket with `isRequesterResolved: true` should be added when Issue #6 (Public Comments & "problem appears resolved") lands, so Issue #7's queue badge has something realistic to display.

- **Administrators**:
  - `admin@kmutt.ac.th` (Active, name: "Central Administrator", `mustChangePassword: false`)
- **IT Staff**:
  - `staff.witchai@kmutt.ac.th` (Active, name: "Witchai Tech", `mustChangePassword: false`)
  - `staff.kamon@kmutt.ac.th` (Active, name: "Kamon Support", `mustChangePassword: false`)
  - `staff.naree@kmutt.ac.th` (Active, name: "Naree Network", `mustChangePassword: false`)
  - `staff.inactive@kmutt.ac.th` (Inactive, name: "Former Staff", `mustChangePassword: false`)
- **Requesters**:
  - `somchai.jai@kmutt.ac.th` (Active, name: "Somchai Jaidee", `mustChangePassword: false`)
  - `suda.rak@kmutt.ac.th` (Active, name: "Suda Rakdee", `mustChangePassword: false`)
  - `wichai.mee@kmutt.ac.th` (Active, name: "Wichai Meesook", `mustChangePassword: false`)
  - `anong.cha@kmutt.ac.th` (Active, name: "Anong Chalong", `mustChangePassword: false`)
  - `inactive.req@kmutt.ac.th` (Inactive, name: "Inactive Requester", `mustChangePassword: false`)
  - `temp.req@kmutt.ac.th` (Active, name: "Temporary Requester", `mustChangePassword: true`)
- **Tickets**: Realistic ticket distributions across statuses (`NEW`, `OPEN`, `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `RESOLVED`, `CLOSED`), priorities, and owners (assigned vs. unassigned), with initial Public Comments and Internal Notes.

---

## 9. Acceptance Criteria

| ID | Given | When | Then |
|---|---|---|---|
| **AC-01** | An active user with valid email and password | User submits credentials to `POST /api/auth/login` | Backend sets session cookie, returns 200 OK with user profile (id, name, email, role, mustChangePassword: false). |
| **AC-02** | A user flagged with `mustChangePassword: true` | User logs in successfully | App shell blocks normal navigation and redirects to `/change-password`. Any request to protected ticket/admin endpoints returns 403 Forbidden until new password is saved. |
| **AC-03** | An active user on `/change-password` | Submits a new password satisfying complexity requirements | Backend updates password hash, sets `mustChangePassword: false`, returns 200 OK, and unlocks normal application access. |
| **AC-04** | An invalid password change attempt (e.g. <8 chars or missing special char) | User submits new password | Request is rejected with 400 Bad Request and descriptive validation errors. |
| **AC-05** | An inactive account (`isActive: false`) | User submits valid credentials | Request returns 401 Unauthorized with generic "Invalid email or password" message. |
| **AC-06** | Invalid credentials (wrong password or unregistered email) | User attempts login | Request returns 401 Unauthorized with generic "Invalid email or password" message. |
| **AC-07** | An authenticated user | User clicks Logout (`POST /api/auth/logout`) | Server invalidates session, clears cookie, and subsequent requests with that session return 401 Unauthorized. |
| **AC-08** | An unauthenticated request to any protected endpoint | Request is sent without session cookie | Backend returns 401 Unauthorized. |
| **AC-09** | A Requester user | User attempts to call IT Staff Queue (`/api/staff/tickets`) or Admin endpoints (`/api/admin/users`) | Backend returns 403 Forbidden. |
| **AC-10** | An authenticated Requester creating a ticket with another `requesterId` in payload | Ticket creation is processed | Backend derives owner strictly from authenticated session; client-provided ID is ignored. |
| **AC-11** | An authenticated Requester viewing "My Tickets" | Requester accesses `/api/tickets` | Only tickets owned by that authenticated Requester are returned. |
| **AC-12** | An authenticated Requester requesting another user's ticket detail | Requester requests `/api/tickets/:id` | Backend returns 404 Not Found to prevent ticket enumeration. |
| **AC-13** | An IT Staff user | IT Staff accesses `/api/staff/tickets` with search/filter/sort/pagination query params | Backend returns 200 OK with matching tickets across all requesters, including owner, status, IT priority, and pagination metadata. |
| **AC-14** | An IT Staff user | IT Staff claims an unassigned ticket via `PATCH /api/staff/tickets/:id/owner` | Ticket `ownerId` is updated to current user's ID and reflected across the queue. |
| **AC-15** | An IT Staff user | IT Staff reassigns a ticket to another active IT Staff or Administrator | Ticket `ownerId` updates successfully; assigning to an inactive user or Requester returns 400 Bad Request. |
| **AC-16** | An IT Staff user | IT Staff updates IT Priority via `PATCH /api/staff/tickets/:id/priority` | `itPriority` updates to new value; original `requestedPriority` remains unchanged. |
| **AC-17** | An IT Staff user | IT Staff attempts an invalid status transition (e.g. `NEW` → `CLOSED`) | Request returns 400 Bad Request with error stating invalid transition. |
| **AC-18** | An IT Staff user | IT Staff executes a valid status transition (e.g. `NEW` → `OPEN`) | Ticket status updates in database and reflects on Ticket Detail and Queue. |
| **AC-19** | A Requester or IT Staff user | User posts a valid Public Comment via `POST /api/tickets/:id/comments` | Comment is saved, author name and timestamp are populated from session, and comment is visible to Requester and IT Staff. |
| **AC-20** | An IT Staff user | IT Staff posts an Internal Note via `POST /api/tickets/:id/notes` | Note is saved, author name and timestamp are recorded, and note is visible only to IT Staff. |
| **AC-21** | A Requester user | Requester attempts to fetch or post Internal Notes (`/api/tickets/:id/notes`) | Request returns 403 Forbidden; no note content is returned. |
| **AC-22** | A user posting empty or whitespace-only Public Comment or Internal Note | Form submission occurs | Backend returns 400 Bad Request validation error; UI displays inline error message. |
| **AC-23** | A Requester viewing their own ticket | Requester toggles "Problem Appears Resolved" via `PATCH /api/tickets/:id/resolve-indicator` | `isRequesterResolved` updates to true/false; formal `status` remains unchanged. |
| **AC-24** | An Administrator user | Admin calls `GET /api/admin/users` with optional search or role filter | Returns 200 OK with user list (name, email, role, isActive, mustChangePassword, createdAt). |
| **AC-25** | An Administrator user | Admin creates a user via `POST /api/admin/users` with valid data | New user record created, initial password hashed, `mustChangePassword` set to true, returns 201 Created. |
| **AC-26** | An Administrator user creating or editing a user with an already existing email | Admin submits duplicate email | Backend returns 409 Conflict with clear field error. |
| **AC-27** | An Administrator user | Admin updates an existing user's name, email, role, or active status via `PATCH /api/admin/users/:id` | Changes persist in database; returns 200 OK with updated user. |
| **AC-28** | An Administrator user | Admin attempts to deactivate their own account | Backend rejects request with 400 Bad Request ("Administrator cannot deactivate own account"). |
| **AC-29** | An Administrator user | Admin attempts to deactivate or demote the sole remaining active Administrator | Backend rejects request with 400 Bad Request ("Cannot deactivate or remove last active Administrator"). |
| **AC-30** | An Administrator user | Admin resets a user's initial password via `POST /api/admin/users/:id/reset-password` | Password hash is updated, `mustChangePassword` is set to true, returns 200 OK. Next login forces password change. |
| **AC-31** | A non-Administrator (Requester or IT Staff) | User attempts to access any `/api/admin/users` endpoint | Backend returns 403 Forbidden. |
| **AC-32** | Seed verification | `npm run prisma:seed` executed twice consecutively | Script succeeds idempotently without duplicate row errors or constraint violations. |
| **AC-33** | An Administrator user | Administrator attempts to fetch or post Internal Notes (`/api/tickets/:id/notes`) or Public Comments (`/api/tickets/:id/comments`) | Request returns 403 Forbidden; ticket operations remain strictly prohibited for Administrators. |

---

## 10. Definition of Done (DoD)

- [ ] **Contract Alignment**: Every FR (FR-01–FR-25), BR (BR-01–BR-25), and AC (AC-01–AC-33) is fully implemented.
- [ ] **Test Traceability**: 100% of Acceptance Criteria map to concrete, automated tests in `docs/lab-03/tests.md`.
- [ ] **No Regression**: All Lab 2 tests pass under the authenticated user model without the Dev Requester selector.
- [ ] **Security Integrity**: Passwords never stored/logged in plaintext. Role and ownership authorization enforced server-side.
- [ ] **Zen Green Design**: UI conforms to `docs/lab-03/ui-spec.md` with responsive layouts verified on desktop (1280px), tablet (768px), and mobile (375px).
- [ ] **Documentation**: `specification.md`, `api-spec.md`, `ui-spec.md`, and `tests.md` reviewed and approved before code merges into `lab3-staging`.
- [ ] **Evidence**: All required screenshots captured in `artifacts/lab-03/screenshots/`.
