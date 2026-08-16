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
- [PostgreSQL](https://www.postgresql.org/) (running locally or accessible via network)

---

## 🚀 Setup & Installation

### 1. Clone the Repository
```bash
git clone <repository-url>
cd toktickit
```

### 2. Configure Environment Variables

#### Backend (`server/`)
Copy the example environment file and configure your database credentials and port:
```bash
cd server
cp .env.example .env
```
Inside `server/.env`:
```env
DATABASE_URL="postgresql://<username>:<password>@localhost:5432/<database_name>?schema=public"
PORT=3000
```

#### Frontend (`client/`)
Copy the example environment file to point to the backend API:
```bash
cd ../client
cp .env.example .env
```
Inside `client/.env`:
```env
VITE_API_URL="http://localhost:3000"
```

---

### 3. Install Dependencies

Install packages in both the `server` and `client` directories:

```bash
# Server dependencies
cd ../server
npm install

# Client dependencies
cd ../client
npm install
```

---

### 4. Database Setup (Prisma & PostgreSQL)

Navigate to the `server` directory to apply migrations and seed initial data:

```bash
cd ../server

# 1. Run migrations to create database schema
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

---

## 📡 API Endpoints

### Health Check
- **Endpoint**: `GET /api/health`
- **Description**: Verifies that the TokTickIT backend API service is running.
- **Success Response**: `200 OK`
  ```json
  {
    "status": "ok",
    "service": "TokTickIT API"
  }
  ```

---

## 🧪 Running Tests & Verification

Both frontend and backend include automated tests powered by **Vitest**, **Supertest**, and **React Testing Library**.

### 1. Run Backend Tests (Supertest)
Verify API endpoints including `GET /api/health`:
```bash
cd server
npm test
```

### 2. Run Frontend Tests (React Testing Library)
Verify UI rendering, online state, and offline error handling:
```bash
cd client
npm test
```

### 3. Manual Testing in Browser
1. Start both servers:
   - Backend: `cd server && npm run dev`
   - Frontend: `cd client && npm run dev`
2. Open `http://localhost:5173`.
3. Click the **"Check System"** button.
   - When the backend is running, the alert turns green with **"System Status: Online"** (`TokTickIT API is operational and healthy`).
   - If the backend is stopped, the alert turns red with **"System Status: Offline"** and displays a helpful error message.

---

## 📜 Available Scripts Summary

### Server (`server/`)
- `npm run dev`: Starts the development API server using `tsx watch`.
- `npm run build`: Compiles TypeScript to JavaScript in `dist/`.
- `npm start`: Runs the compiled production server.
- `npm run prisma:migrate`: Runs Prisma migrations against the database.
- `npm run prisma:seed`: Seeds the database with default category records.
- `npm test`: Runs backend test suites with Vitest and Supertest.

### Client (`client/`)
- `npm run dev`: Starts the Vite development server.
- `npm run build`: Type-checks and builds the frontend bundle for production.
- `npm run preview`: Previews the production build locally.
- `npm test`: Runs client test suites with Vitest and React Testing Library.