import { config } from "dotenv";
import { resolve } from "path";

// Load .env file before any tests run
const result = config({ path: resolve(__dirname, "../.env") });

if (result.error) {
  throw result.error;
}

// Dotenv parsed the values - manually assign them to process.env
// This ensures they're available before PrismaClient initializes
if (result.parsed) {
  for (const [key, value] of Object.entries(result.parsed)) {
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

// Verify DATABASE_URL was loaded
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL not found in environment after loading .env file");
}
