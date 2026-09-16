# TokTickIT - IT Service Desk

TokTickIT is a modern IT Service Desk web application featuring a React + TypeScript frontend powered by Vite and Bootstrap, alongside a Node.js + Express + TypeScript backend connected to a PostgreSQL database using Prisma ORM.

---

## 📁 Project Structure

```text
toktickit/
├── client/          # Frontend application (React, TypeScript, Vite, Bootstrap)
│   ├── src/         # React source code & components
│   ├── tests/       # Vitest + React Testing Library suites
│   ├── .env.example # Frontend environment variable template
│   └── package.json
├── server/          # Backend API (Express, TypeScript, Prisma)
│   ├── prisma/      # Prisma schema and seed script
│   ├── src/         # Express API routes & database connection
│   ├── tests/       # Supertest + Vitest test suites
│   ├── .env.example # Backend environment variable template
│   └── package.json
├── docs/            # Lab documentation and reports
└── README.md
```

---

## 🛠️ Prerequisites

Make sure you have the following installed on your system:
- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- [npm](https://www.npmjs.com/) (bundled with Node.js)
- [Docker & Docker Compose](https://www.docker.com/) (or a locally installed PostgreSQL instance)

---

## 🚀 Setup & Installation

### 1. Clone the Repository
```bash
git clone <repository-url>
cd toktickit
```

### 2. Start PostgreSQL via Docker Compose
Start the PostgreSQL container in the background:
```bash
docker compose up -d
```
> This starts a PostgreSQL 16 Alpine container (`toktickit-postgres`) on port `5432` with username `toktickit` and password `toktickit`.

### 3. Configure Environment Variables

#### Backend (`server/`)
Copy the example environment file:
```bash
cd server
cp .env.example .env  # On Windows PowerShell: Copy-Item .env.example .env
```
Inside `server/.env`:
```env
DATABASE_URL="postgresql://toktickit:toktickit@localhost:5432/toktickit?schema=public"
PORT=3000
```

#### Frontend (`client/`)
Copy the example environment file to point to the backend API:
```bash
cd ../client
cp .env.example .env  # On Windows PowerShell: Copy-Item .env.example .env
```
Inside `client/.env`:
```env
VITE_API_URL="http://localhost:3000"
```

---

### 4. Install Dependencies

Install packages in both `server` and `client`:

```bash
# Server dependencies
cd ../server
npm install

# Client dependencies
cd ../client
npm install
```

---

### 5. Database Setup (Prisma Migration & Seeding)

Navigate to the `server` directory to apply migrations and seed initial categories:

```bash
cd ../server

# 1. Run migrations to create Category table
npm run prisma:migrate

# 2. Seed default categories (Account and Access, Hardware, Software, Network)
npm run prisma:seed
```

---

## 💻 Running the Application

For local development, run the server and client concurrently in separate terminals:

### Start Backend API Server
```bash
cd server
npm run dev
```
> The API will be running at [http://localhost:3000](http://localhost:3000).

### Start Frontend Vite Dev Server
```bash
cd client
npm run dev
```
> The web interface will be available at [http://localhost:5173](http://localhost:5173).

---

## 📡 API Endpoints

### 1. Health Check
- **Endpoint**: `GET /api/health`
- **Description**: Verifies that the TokTickIT backend API service is running.
- **Success Response**: `200 OK`
  ```json
  {
    "status": "ok",
    "service": "TokTickIT API"
  }
  ```

### 2. Category List
- **Endpoint**: `GET /api/categories`
- **Description**: Returns all seeded IT categories sorted in ID order.
- **Success Response**: `200 OK`
  ```json
  [
    { "id": 1, "name": "Account and Access" },
    { "id": 2, "name": "Hardware" },
    { "id": 3, "name": "Software" },
    { "id": 4, "name": "Network" }
  ]
  ```

---

## 🧪 Testing & Verification Guide

### 1. Lab 1: Category & Health Baseline (`docs/lab-01/`)

#### A. Database & Seed Verification
Ensure the PostgreSQL container is running and migrations have been applied:
```bash
# Start Docker container
docker compose up -d

# Run migrations
cd server
npm run prisma:migrate
```

Verify seed idempotency by running the seed script twice:
```bash
cd server
npm run prisma:seed
npm run prisma:seed
```

#### B. Lab 1 Test Suite Matrix (`docs/lab-01/tests.md`)
| # | Layer / Tool | Test Description | Test File Location |
|---|---|---|---|
| 1 | Backend (Supertest) | `GET /api/health` returns `200` with `status: "ok"` | `server/tests/lab-01/health.test.ts` |
| 2 | Backend (Supertest) | `GET /api/categories` returns 4 seeded categories in ID order | `server/tests/lab-01/categories.test.ts` |
| 3 | Frontend (Vitest + RTL) | Heading "TokTickIT" renders | `client/tests/lab-01/App.test.tsx` |
| 4 | Frontend (Vitest + RTL) | Success state shows "Online" + category list | `client/tests/lab-01/App.test.tsx` |
| 5 | Frontend (Vitest + RTL) | Error state shows "Offline" + error message | `client/tests/lab-01/App.test.tsx` |

**Run Lab 1 Tests:**
```bash
# Backend tests
cd server && npm test -- tests/lab-01

# Frontend tests
cd client && npm test -- tests/lab-01
```

---

### 2. Lab 2: Requester-Facing IT Ticketing MVP (`docs/lab-02/`)

Lab 2 delivered the complete Requester-facing IT Ticketing MVP under the **Zen Green Theme**:

#### A. Key Capabilities
1. **Development Requester Selector ("Test Login")**:
   - Seeded active and inactive requesters with local storage persistence and shell header indication.
   - Strict rejection of inactive requesters (`403 Forbidden`).
2. **Create Ticket Workflow**:
   - Classification dropdowns (Category, Related System), Requested Priority (`LOW`, `MEDIUM`, `HIGH`).
   - Atomic sequential Ticket Number generation (`TICK-YYYYMMDD-XXXX`) via dedicated `TicketSequence` table.
   - Initial status set to `New`.
   - File attachment dropzone (max 5 active files, max 5 MB per file, allowed: JPG, PNG, WEBP, PDF).
3. **My Tickets (Requester Ticket List)**:
   - Strict requester ownership data isolation (Requester A cannot see Requester B's tickets).
   - Search across summary and ticket number, filtering by category and status.
   - Sorting and pagination controls.
   - Responsive layout: desktop 8-column table (≥992px) and mobile stacked cards (<768px).
4. **Ticket Detail & Attachment Lifecycle**:
   - Read-only formatted ticket detail view.
   - Secure active attachment download via header or `?requesterId=`.
   - Soft-removal modal recording `removedReason`, preventing download (`410 Gone`) while preserving metadata.

#### B. Lab 2 Test Suite Matrix (`docs/lab-02/tests.md`)
| Test Suite Group | Test Layer | Coverage / Scope | Test File Location |
|---|---|---|---|
| Requesters API | Backend (Supertest) | Active/inactive requesters, header auth validation | `server/tests/lab-02/requesters.api.test.ts` |
| Reference Data API | Backend (Supertest) | Categories and related systems listing | `server/tests/lab-02/reference-data.api.test.ts` |
| Create Ticket API | Backend (Supertest) | Form validation, atomic `TICK-YYYYMMDD-XXXX` sequence | `server/tests/lab-02/create-ticket.api.test.ts` |
| My Tickets API | Backend (Supertest) | Search, filtering, sorting, pagination, ownership isolation | `server/tests/lab-02/my-tickets.api.test.ts` |
| Ticket Detail API | Backend (Supertest) | Detail retrieval, 404 unauthorized isolation | `server/tests/lab-02/ticket-detail.api.test.ts` |
| Attachments API | Backend (Supertest) | Upload, 5 MB/type limits, download, soft-remove (410) | `server/tests/lab-02/attachments.api.test.ts` |
| Requester Select UI | Frontend (RTL) | Dropdown selection, local storage, change requester | `client/tests/lab-02/RequesterSelect.test.tsx` |
| Create Ticket UI | Frontend (RTL) | Inline field validation, busy states, failure resilience | `client/tests/lab-02/CreateTicket.test.tsx` |
| My Tickets UI | Frontend (RTL) | Responsive table/cards, search toolbar, empty states | `client/tests/lab-02/MyTickets.test.tsx` |
| Ticket Detail UI | Frontend (RTL) | Read-only details, attachment removal modal | `client/tests/lab-02/RequesterTicketDetail.test.tsx` |
| Requester Journey | E2E (Playwright) | Full flow: select -> create -> list -> detail -> attachment | `e2e/lab-02/requester-ticket-flow.spec.ts` |

**Run Lab 2 Tests:**
```bash
# Backend tests
cd server && npm test -- tests/lab-02

# Frontend tests
cd client && npm test -- tests/lab-02

# Playwright E2E
npx playwright test e2e/lab-02
```

---

### 3. Lab 3: Users, Roles, IT Staff Ticketing, and Admin Screens (`docs/lab-03/`)

Lab 3 replaces the development requester selector with authentic credentials, server-side RBAC, IT Staff workflows, and administrator management:

#### A. Key Capabilities
1. **Authentication & Session**: Email/password login, bcrypt hashing, HTTP-only secure cookie session (`toktickit_session`), and current user info (`GET /api/auth/me`).
2. **Mandatory Password Change**: Users with initial passwords must change them on first login before accessing normal app routes.
3. **Server-Side Authorization**: Backend guards for Requester, IT Staff, and Administrator. Client `requesterId` strictly ignored.
4. **Requester Regression & Additions**: Full Lab 2 continuity plus Public Comments and "Problem Appears Resolved" toggle.
5. **IT Staff Ticket Queue**: Search, filtering by status/priority/category, sorting, pagination, desktop table + mobile cards.
6. **IT Staff Ticket Operations**: Claim/reassign ownership, IT Priority management, status transition matrix enforcement, Public Comments, and private Internal Notes.
7. **Administrator User Management**: Minimalist screen to list/search/filter users, create user with initial password, edit account/role, reset initial password, and safety checks (no self-deactivation, no removing last active admin).

#### B. Lab 3 Test Suite Matrix (`docs/lab-03/tests.md`)
| Test Suite Group | Test Layer | Coverage / Scope | Test File Location |
|---|---|---|---|
| Authentication API | Backend (Supertest) | Login, logout, session cookie, password change, inactive check | `server/tests/lab-03/auth.api.test.ts` |
| Authorization API | Backend (Supertest) | RBAC guards, ownership derivation, 401 vs. 403 vs. 404 | `server/tests/lab-03/authorization.api.test.ts` |
| Staff Queue API | Backend (Supertest) | Queue query, search, filtering, pagination, sorting | `server/tests/lab-03/staff-queue.api.test.ts` |
| Staff Detail API | Backend (Supertest) | Claim, reassign, IT priority, status transition matrix | `server/tests/lab-03/staff-ticket-detail.api.test.ts` |
| Comments & Notes API | Backend (Supertest) | Public comments (requester+staff), Internal notes (staff only) | `server/tests/lab-03/comments-notes.api.test.ts` |
| Admin Users API | Backend (Supertest) | User list, create, edit, reset password, admin safety rules | `server/tests/lab-03/users-admin.api.test.ts` |
| Auth & Password UI | Frontend (RTL) | Login form, validation, mandatory ChangePassword barrier | `client/tests/lab-03/Login.test.tsx`<br>`client/tests/lab-03/ChangePassword.test.tsx` |
| Staff Queue UI | Frontend (RTL) | Desktop queue table, mobile cards, search toolbar, badges | `client/tests/lab-03/StaffTicketQueue.test.tsx` |
| Staff Detail UI | Frontend (RTL) | Claim/reassign controls, IT priority, comments vs. notes | `client/tests/lab-03/StaffTicketDetail.test.tsx` |
| Admin Users UI | Frontend (RTL) | User table, Create/Edit modals, safety checks | `client/tests/lab-03/UserManagement.test.tsx` |
| Acceptance Journeys | E2E (Playwright) | Auth flow, first-login password change, staff ticket flow, admin | `e2e/lab-03/authentication.spec.ts`<br>`e2e/lab-03/staff-ticket-flow.spec.ts`<br>`e2e/lab-03/user-administration.spec.ts` |

**Run Lab 3 Tests:**
```bash
# Backend tests
cd server && npm test -- tests/lab-03

# Frontend tests
cd client && npm test -- tests/lab-03

# Playwright E2E
npx playwright test e2e/lab-03
```

---

## 📜 Available Scripts Summary

### Server (`server/`)
- `npm run dev`: Starts the development API server using `tsx watch`.
- `npm run build`: Compiles TypeScript to JavaScript in `dist/`.
- `npm start`: Runs the compiled production server.
- `npm run prisma:migrate`: Runs Prisma migrations against the database.
- `npm run prisma:seed`: Seeds the database with default records.
- `npx prisma studio` (or `npm run prisma:studio`): Launches the visual database management GUI.
- `npm test`: Runs backend test suites with Vitest and Supertest.

### Client (`client/`)
- `npm run dev`: Starts the Vite development server.
- `npm run build`: Type-checks and builds the frontend bundle for production.
- `npm run preview`: Previews the production build locally.
- `npm test`: Runs client test suites with Vitest and React Testing Library.

---

## 🌿 Lab 3 Branching & Staging Workflow

TokTickIT follows a strict staged integration workflow for Lab 3 to ensure production stability, peer review integrity, and verifiable trace evidence before changes reach `main`:

```text
main
  └── lab3-staging
        ├── feature/lab3-spec-doc
        ├── feature/lab3-data-model-migration-seed
        ├── feature/lab3-auth-foundation
        ├── feature/lab3-server-authorization
        ├── feature/lab3-requester-regression-comments
        ├── feature/lab3-staff-queue
        ├── feature/lab3-staff-ticket-detail
        ├── feature/lab3-admin-user-management
        └── chore/lab3-completion-review
```

### Workflow Rules:
1. **Never commit directly to `main` or `lab3-staging`**: All development work occurs in dedicated feature branches branched off `lab3-staging`.
2. **Feature Branch → `lab3-staging`**:
   - Each feature branch addresses a specific GitHub Issue (e.g., `feature/lab3-spec-doc` for Issue #1).
   - Once implementation, automated tests, and lint checks pass, a Pull Request is opened against `lab3-staging`.
   - Peer review, human approval, and test verification are documented in `docs/lab-03/reviewer.md`.
3. **Completion Review & Audit on `lab3-staging`**:
   - Full regression runs (backend unit/API, frontend RTL, Playwright E2E) and contract audits are performed on `lab3-staging`.
   - Screenshots across viewports are captured into `artifacts/lab-03/screenshots/`.
4. **Release PR (`lab3-staging` → `main`)**:
   - Once all criteria of the Engineering Contract and Definition of Done are satisfied, a final release PR merges `lab3-staging` into `main`.

