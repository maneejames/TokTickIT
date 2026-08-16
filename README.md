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

### 1. Feature 3: Database & Seed Verification

To verify the database preparation and seed implementation (Feature 3):

#### A. Verify Migration & Table Creation
Ensure the PostgreSQL container is running and migrations have been applied:
```bash
# Start Docker container
docker compose up -d

# Run migrations
cd server
npm run prisma:migrate
```

#### B. Verify Seed & Idempotency
Run the seed command twice in succession to confirm that it inserts all 4 categories without errors or duplicate row violations:
```bash
cd server
npm run prisma:seed
npm run prisma:seed
```
Expected output:
```text
> toktickit-server@1.0.0 prisma:seed
> tsx prisma/seed.ts

Successfully seeded 4 categories.
```

#### C. Inspect Database Records directly
You can verify the records using either **Prisma Studio** or **Docker CLI**:

**Option 1: Using PowerShell / Docker CLI**
```powershell
docker exec -i toktickit-postgres psql -U toktickit -d toktickit -c 'SELECT id, name, "createdAt" FROM "Category" ORDER BY id ASC;'
```
*(Or pipe via standard input:)*
```powershell
"SELECT id, name, ""createdAt"" FROM ""Category"" ORDER BY id ASC;" | docker exec -i toktickit-postgres psql -U toktickit -d toktickit
```

**Option 2: Using Prisma Studio (GUI)**
```bash
cd server
npx prisma studio
```
> Opens a web interface at `http://localhost:5555` to view and inspect all database tables and rows visually.

Expected terminal output for Option 1:
```text
 id |        name        |        createdAt        
----+--------------------+-------------------------
  1 | Account and Access | 2026-08-16 08:44:39.853
  2 | Hardware           | 2026-08-16 08:44:39.866
  3 | Software           | 2026-08-16 08:44:39.872
  4 | Network            | 2026-08-16 08:44:39.878
(4 rows)
```

---

### 2. Lab 1 Test Suite Matrix (`docs/lab-01/tests.md`)

The test suites cover 5 specific scenarios across backend and frontend:

| # | Layer / Tool | Test Description | Test File Location |
|---|--------------|------------------|-------------------|
| 1 | Backend (Supertest) | `GET /api/health` returns `200` with `status: "ok"` | `server/tests/lab-01/health.test.ts` |
| 2 | Backend (Supertest) | `GET /api/categories` returns 4 seeded categories in ID order | `server/tests/lab-01/categories.test.ts` |
| 3 | Frontend (Vitest + RTL) | Heading "TokTickIT" renders | `client/tests/lab-01/App.test.tsx` |
| 4 | Frontend (Vitest + RTL) | Success state shows "Online" + category list | `client/tests/lab-01/App.test.tsx` |
| 5 | Frontend (Vitest + RTL) | Error state shows "Offline" + error message | `client/tests/lab-01/App.test.tsx` |

#### Running Backend Tests (Supertest)
```bash
cd server
npm test
```

#### Running Frontend Tests (Vitest + RTL)
```bash
cd client
npm test
```

#### Manual Testing in Browser
1. Ensure the database is running: `docker compose up -d`
2. Start both services:
   - Backend: `cd server && npm run dev`
   - Frontend: `cd client && npm run dev`
3. Open `http://localhost:5173`.
4. Click **"Check System"**:
   - **Online Scenario**: Status banner turns green (**"System Status: Online"**) and lists the 4 categories (**Account and Access**, **Hardware**, **Software**, **Network**).
   - **Offline Scenario**: Stop the backend terminal (`Ctrl + C`) and click **"Check System"** again. The alert turns red (**"System Status: Offline"**) displaying a connection error message.

---

## 📜 Available Scripts Summary

### Server (`server/`)
- `npm run dev`: Starts the development API server using `tsx watch`.
- `npm run build`: Compiles TypeScript to JavaScript in `dist/`.
- `npm start`: Runs the compiled production server.
- `npm run prisma:migrate`: Runs Prisma migrations against the database.
- `npm run prisma:seed`: Seeds the database with default category records.
- `npx prisma studio` (or `npm run prisma:studio`): Launches the visual database management GUI.
- `npm test`: Runs backend test suites with Vitest and Supertest.

### Client (`client/`)
- `npm run dev`: Starts the Vite development server.
- `npm run build`: Type-checks and builds the frontend bundle for production.
- `npm run preview`: Previews the production build locally.
- `npm test`: Runs client test suites with Vitest and React Testing Library.
