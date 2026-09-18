import { describe, it, expect, beforeAll } from "vitest";
import { getPrisma } from "../../src/prisma.js";

describe("Lab 3 - Data Model, Migration & Seed Tests", () => {
  const prisma = getPrisma();

  // Test 1: Ticket-owner integrity after migration
  describe("Ticket-owner integrity after migration", () => {
    it("preserves tickets and attachments linked to users, and sets up ownerId and itPriority", async () => {
      // Must have users and tickets in database
      const users = await (prisma as any).user.findMany();
      expect(users.length).toBeGreaterThanOrEqual(1);

      const tickets = await (prisma as any).ticket.findMany({
        include: {
          attachments: true,
        },
      });
      expect(tickets.length).toBeGreaterThanOrEqual(1);

      for (const ticket of tickets) {
        // requesterId must correspond to a valid user with role REQUESTER
        const requester = await (prisma as any).user.findUnique({
          where: { id: ticket.requesterId },
        });
        expect(requester).not.toBeNull();
        expect(requester.role).toBe("REQUESTER");

        // itPriority must be defined and valid
        expect(["LOW", "MEDIUM", "HIGH", "URGENT"]).toContain(ticket.itPriority);

        // ownerId, if set, must correspond to an active IT_STAFF or ADMINISTRATOR
        if (ticket.ownerId !== null) {
          const owner = await (prisma as any).user.findUnique({
            where: { id: ticket.ownerId },
          });
          expect(owner).not.toBeNull();
          expect(["IT_STAFF", "ADMINISTRATOR"]).toContain(owner.role);
          expect(owner.isActive).toBe(true);
        }

        // isRequesterResolved must default to false for every migrated ticket
        expect(ticket.isRequesterResolved).toBe(false);

        // Attachments integrity preserved
        for (const attachment of ticket.attachments) {
          expect(attachment.ticketId).toBe(ticket.id);
          expect(attachment.storedFilename).toBeDefined();
        }
      }
    });

    it("every migrated Ticket has isRequesterResolved === false", async () => {
      const tickets = await (prisma as any).ticket.findMany();
      expect(tickets.length).toBeGreaterThanOrEqual(1);
      for (const ticket of tickets) {
        expect(ticket.isRequesterResolved).toBe(false);
      }
    });
  });

  // Test 2: Correct seed counts
  describe("Correct seed counts", () => {
    it("seeds >=4 active + 1 inactive Requester, >=3 active + 1 inactive IT Staff, and >=1 active Admin", async () => {
      const activeRequesters = await (prisma as any).user.findMany({
        where: { role: "REQUESTER", isActive: true },
      });
      const inactiveRequesters = await (prisma as any).user.findMany({
        where: { role: "REQUESTER", isActive: false },
      });
      const activeStaff = await (prisma as any).user.findMany({
        where: { role: "IT_STAFF", isActive: true },
      });
      const inactiveStaff = await (prisma as any).user.findMany({
        where: { role: "IT_STAFF", isActive: false },
      });
      const activeAdmins = await (prisma as any).user.findMany({
        where: { role: "ADMINISTRATOR", isActive: true },
      });

      expect(activeRequesters.length).toBeGreaterThanOrEqual(4);
      expect(inactiveRequesters.length).toBeGreaterThanOrEqual(1);

      expect(activeStaff.length).toBeGreaterThanOrEqual(3);
      expect(inactiveStaff.length).toBeGreaterThanOrEqual(1);

      expect(activeAdmins.length).toBeGreaterThanOrEqual(1);

      // Verify specific required seed users from spec
      const admin = await (prisma as any).user.findUnique({
        where: { email: "admin@kmutt.ac.th" },
      });
      expect(admin).not.toBeNull();
      expect(admin.role).toBe("ADMINISTRATOR");
      expect(admin.isActive).toBe(true);

      const tempUser = await (prisma as any).user.findUnique({
        where: { email: "temp.req@kmutt.ac.th" },
      });
      expect(tempUser).not.toBeNull();
      expect(tempUser.mustChangePassword).toBe(true);
    });
  });

  // Test 3: Idempotent reseeding
  describe("Idempotent reseeding", () => {
    it("can run seed consecutively without duplicating rows or violating constraints", async () => {
      const countBefore = await (prisma as any).user.count();
      const ticketCountBefore = await (prisma as any).ticket.count();

      // Dynamically run seed logic or invoke seed module
      const { seed } = await import("../../prisma/seed.js");
      await seed();

      const countAfter = await (prisma as any).user.count();
      const ticketCountAfter = await (prisma as any).ticket.count();

      expect(countAfter).toBe(countBefore);
      expect(ticketCountAfter).toBe(ticketCountBefore);
    });
  });

  // Test 4: No plaintext passwords — scoped to seed users only
  describe("No plaintext passwords", () => {
    // Canonical list of seed-user emails from prisma/seed.ts.
    // Tests that create ephemeral users (e.g., auth tests) are excluded.
    const SEED_EMAILS = [
      "admin@kmutt.ac.th",
      "staff.witchai@kmutt.ac.th",
      "staff.kamon@kmutt.ac.th",
      "staff.naree@kmutt.ac.th",
      "staff.inactive@kmutt.ac.th",
      "somchai.jai@kmutt.ac.th",
      "suda.rak@kmutt.ac.th",
      "wichai.mee@kmutt.ac.th",
      "anong.cha@kmutt.ac.th",
      "inactive.req@kmutt.ac.th",
      "temp.req@kmutt.ac.th",
      "john.doe@kmutt.ac.th",
      "jane.smith@kmutt.ac.th",
      "anon.old@kmutt.ac.th",
    ];

    it("all seeded user passwords are valid bcrypt hashes (not plaintext)", async () => {
      const seedUsers = await (prisma as any).user.findMany({
        where: { email: { in: SEED_EMAILS } },
      });
      expect(seedUsers.length).toBe(SEED_EMAILS.length);

      for (const user of seedUsers) {
        // passwordHash must be defined and non-empty
        expect(user.passwordHash).toBeDefined();
        expect(user.passwordHash.length).toBeGreaterThan(0);

        // Must be a valid bcrypt hash: starts with $2a$, $2b$, or $2y$ and is 60 chars
        expect(user.passwordHash).toMatch(/^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/);

        // Must NOT be a common plaintext password stored verbatim
        const COMMON_PLAINTEXT = ["Password123!", "password", "123456", "admin"];
        for (const pt of COMMON_PLAINTEXT) {
          expect(user.passwordHash).not.toBe(pt);
        }
      }
    });
  });
});
