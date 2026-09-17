-- CreateEnum
CREATE TYPE "Role" AS ENUM ('REQUESTER', 'IT_STAFF', 'ADMINISTRATOR');

-- AlterEnum
ALTER TYPE "Priority" ADD VALUE 'URGENT';

-- AlterEnum
ALTER TYPE "TicketStatus" ADD VALUE 'OPEN';
ALTER TYPE "TicketStatus" ADD VALUE 'IN_PROGRESS';
ALTER TYPE "TicketStatus" ADD VALUE 'WAITING_FOR_REQUESTER';
ALTER TYPE "TicketStatus" ADD VALUE 'RESOLVED';
ALTER TYPE "TicketStatus" ADD VALUE 'CLOSED';
ALTER TYPE "TicketStatus" ADD VALUE 'REOPENED';
ALTER TYPE "TicketStatus" ADD VALUE 'CANCELLED';

-- DropForeignKey
ALTER TABLE "tickets" DROP CONSTRAINT IF EXISTS "tickets_requesterId_fkey";

-- CreateTable users
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'REQUESTER',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- Copy existing RequesterUser rows into users preserving ID and data
-- Default seed password is 'Password123!', bcrypt hash with work factor 10:
-- '$2b$10$bZiqZhDyoSKYza/XHZzUVOw4mJttFiyVJsBB36kzPLDvhk1xkHupe'
INSERT INTO "users" ("id", "name", "email", "passwordHash", "role", "isActive", "mustChangePassword", "createdAt", "updatedAt")
SELECT 
    "id", 
    "name", 
    "email", 
    '$2b$10$bZiqZhDyoSKYza/XHZzUVOw4mJttFiyVJsBB36kzPLDvhk1xkHupe', 
    'REQUESTER'::"Role", 
    "isActive", 
    true, 
    "createdAt", 
    NOW()
FROM "requester_users"
ON CONFLICT ("id") DO NOTHING;

-- Synchronize users_id_seq to prevent PK collisions on subsequent inserts
SELECT setval(pg_get_serial_sequence('users', 'id'), COALESCE(MAX("id"), 1)) FROM "users";

-- AlterTable tickets
ALTER TABLE "tickets" ADD COLUMN IF NOT EXISTS "isRequesterResolved" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "itPriority" "Priority" NOT NULL DEFAULT 'MEDIUM',
ADD COLUMN IF NOT EXISTS "ownerId" INTEGER;

-- Initialize itPriority to match requestedPriority for existing tickets
UPDATE "tickets" SET "itPriority" = "requestedPriority" WHERE "itPriority" IS NULL OR "itPriority" = 'MEDIUM';

-- CreateTable public_comments
CREATE TABLE "public_comments" (
    "id" SERIAL NOT NULL,
    "ticketId" INTEGER NOT NULL,
    "authorId" INTEGER NOT NULL,
    "content" VARCHAR(2000) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "public_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable internal_notes
CREATE TABLE "internal_notes" (
    "id" SERIAL NOT NULL,
    "ticketId" INTEGER NOT NULL,
    "authorId" INTEGER NOT NULL,
    "content" VARCHAR(2000) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "internal_notes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "public_comments_ticketId_createdAt_idx" ON "public_comments"("ticketId", "createdAt" ASC);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "internal_notes_ticketId_createdAt_idx" ON "internal_notes"("ticketId", "createdAt" ASC);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "tickets_ownerId_idx" ON "tickets"("ownerId");

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public_comments" ADD CONSTRAINT "public_comments_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public_comments" ADD CONSTRAINT "public_comments_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "internal_notes" ADD CONSTRAINT "internal_notes_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "internal_notes" ADD CONSTRAINT "internal_notes_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
