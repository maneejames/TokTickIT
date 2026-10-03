import { getPrisma } from "../src/prisma.js";

async function showTables() {
  const prisma = getPrisma();
  const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;
  `;
  console.log("=== Current Public Tables ===");
  for (const t of tables) {
    console.log(`- ${t.tablename}`);
  }
  await prisma.$disconnect();
}

showTables();
