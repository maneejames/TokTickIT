import { Prisma, PrismaClient } from "@prisma/client";

/**
 * Generates official Ticket Number formatted as TICK-YYYYMMDD-XXXX.
 * Handled via a dedicated TicketSequence table with date (unique) and lastNumber,
 * locked and incremented atomically via SELECT ... FOR UPDATE inside a transaction.
 * Resets daily (starts at 0001 each day).
 */
export async function generateTicketNumber(
  prismaClient: PrismaClient | Prisma.TransactionClient,
  overrideDate?: string
): Promise<string> {
  const now = new Date();
  const dateStr =
    overrideDate ||
    `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;

  // 1. Ensure the date record exists
  await prismaClient.$executeRaw`
    INSERT INTO "ticket_sequences" ("date", "lastNumber", "updatedAt")
    VALUES (${dateStr}, 0, NOW())
    ON CONFLICT ("date") DO NOTHING
  `;

  // 2. Lock row via SELECT ... FOR UPDATE to prevent race conditions & collisions
  const rows = await prismaClient.$queryRaw<{ id: number; date: string; lastNumber: number }[]>`
    SELECT "id", "date", "lastNumber"
    FROM "ticket_sequences"
    WHERE "date" = ${dateStr}
    FOR UPDATE
  `;

  const lastNumber = rows[0]?.lastNumber ?? 0;
  const nextNumber = lastNumber + 1;

  // 3. Increment counter
  await prismaClient.$executeRaw`
    UPDATE "ticket_sequences"
    SET "lastNumber" = ${nextNumber}, "updatedAt" = NOW()
    WHERE "date" = ${dateStr}
  `;

  const paddedSequence = String(nextNumber).padStart(4, "0");
  return `TICK-${dateStr}-${paddedSequence}`;
}
