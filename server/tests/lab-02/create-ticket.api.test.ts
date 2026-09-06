import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { generateTicketNumber } from "../../src/services/ticketNumber.js";

describe("Create Ticket Tests", () => {
  let activeRequesterId: number;
  let validCategoryId: number;
  let validRelatedSystemId: number;

  beforeAll(async () => {
    const prisma = getPrisma();
    const requester = await prisma.requesterUser.findFirst({
      where: { isActive: true },
    });
    activeRequesterId = requester!.id;

    const category = await prisma.category.findFirst({
      where: { isActive: true },
    });
    validCategoryId = category!.id;

    const system = await prisma.relatedSystem.findFirst({
      where: { isActive: true },
    });
    validRelatedSystemId = system!.id;
  });

  // TICK-UNIT-01: ticket number generator produces TICK-YYYYMMDD-XXXX, resets daily, no collisions under concurrent calls
  describe("TICK-UNIT-01: Ticket Number Generator Unit Test", () => {
    beforeEach(async () => {
      const prisma = getPrisma();
      await prisma.ticketSequence.deleteMany({
        where: {
          date: { in: ["20261231", "20270101", "20270102", "20270515"] },
        },
      });
    });

    it("generates correct TICK-YYYYMMDD-XXXX format and increments sequence", async () => {
      const prisma = getPrisma();
      const testDate = "20261231";

      const num1 = await prisma.$transaction(async (tx) => {
        return generateTicketNumber(tx, testDate);
      });
      const num2 = await prisma.$transaction(async (tx) => {
        return generateTicketNumber(tx, testDate);
      });

      expect(num1).toBe("TICK-20261231-0001");
      expect(num2).toBe("TICK-20261231-0002");
    });

    it("resets sequence daily when date changes", async () => {
      const prisma = getPrisma();
      const dateA = "20270101";
      const dateB = "20270102";

      const numA = await prisma.$transaction(async (tx) => {
        return generateTicketNumber(tx, dateA);
      });
      const numB = await prisma.$transaction(async (tx) => {
        return generateTicketNumber(tx, dateB);
      });

      expect(numA).toBe("TICK-20270101-0001");
      expect(numB).toBe("TICK-20270102-0001");
    });

    it("handles concurrent calls without collision using SELECT FOR UPDATE", async () => {
      const prisma = getPrisma();
      const testDate = "20270515";

      // Execute 5 concurrent generator transactions
      const results = await Promise.all([
        prisma.$transaction((tx) => generateTicketNumber(tx, testDate)),
        prisma.$transaction((tx) => generateTicketNumber(tx, testDate)),
        prisma.$transaction((tx) => generateTicketNumber(tx, testDate)),
        prisma.$transaction((tx) => generateTicketNumber(tx, testDate)),
        prisma.$transaction((tx) => generateTicketNumber(tx, testDate)),
      ]);

      const uniqueResults = new Set(results);
      expect(uniqueResults.size).toBe(5);

      const expected = [
        "TICK-20270515-0001",
        "TICK-20270515-0002",
        "TICK-20270515-0003",
        "TICK-20270515-0004",
        "TICK-20270515-0005",
      ];
      expect(results.sort()).toEqual(expected);
    });
  });

  // TICK-API-01: valid ticket creation returns 201, correct ticketNumber format, currentStatus NEW
  describe("TICK-API-01: Valid Ticket Creation", () => {
    it("creates ticket, returns 201, status NEW, attachments empty array, and ignores client-supplied requesterId", async () => {
      const payload = {
        categoryId: validCategoryId,
        relatedSystemId: validRelatedSystemId,
        summary: "Laptop battery drains in less than 30 minutes",
        description: "After the recent operating system update, the laptop shuts down unexpectedly when unplugged.",
        requestedPriority: "HIGH",
        requesterId: 999999, // Should be ignored in favor of X-Requester-Id
      };

      const res = await request(app)
        .post("/api/tickets")
        .set("X-Requester-Id", String(activeRequesterId))
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty("id");
      expect(res.body).toHaveProperty("ticketNumber");
      expect(res.body.ticketNumber).toMatch(/^TICK-\d{8}-\d{4}$/);
      expect(res.body.currentStatus).toBe("NEW");
      expect(res.body.requesterId).toBe(activeRequesterId);
      expect(res.body.summary).toBe(payload.summary);
      expect(res.body.description).toBe(payload.description);
      expect(res.body.requestedPriority).toBe("HIGH");
      expect(res.body.attachments).toEqual([]);
      expect(res.body).toHaveProperty("category");
      expect(res.body).toHaveProperty("relatedSystem");

      // Verify in DB
      const prisma = getPrisma();
      const saved = await prisma.ticket.findUnique({
        where: { id: res.body.id },
      });
      expect(saved).not.toBeNull();
      expect(saved?.ticketNumber).toBe(res.body.ticketNumber);
      expect(saved?.currentStatus).toBe("NEW");
    });

    it("defaults requestedPriority to MEDIUM when omitted", async () => {
      const payload = {
        categoryId: validCategoryId,
        relatedSystemId: validRelatedSystemId,
        summary: "Wi-Fi connection drops intermittently",
        description: "Every 15 minutes the connection disconnects while attending online lecture.",
      };

      const res = await request(app)
        .post("/api/tickets")
        .set("X-Requester-Id", String(activeRequesterId))
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body.requestedPriority).toBe("MEDIUM");
    });
  });

  // TICK-API-02: invalid submission (summary too short/long, description too short/long, missing required field) returns 400 with field errors
  describe("TICK-API-02: Input Validation Failures", () => {
    it("returns 400 Bad Request with field errors when required fields are missing", async () => {
      const res = await request(app)
        .post("/api/tickets")
        .set("X-Requester-Id", String(activeRequesterId))
        .send({});

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("error");
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
      expect(Array.isArray(res.body.error.details)).toBe(true);

      const fields = res.body.error.details.map((d: { field: string }) => d.field);
      expect(fields).toContain("summary");
      expect(fields).toContain("description");
      expect(fields).toContain("categoryId");
      expect(fields).toContain("relatedSystemId");
    });

    it("returns 400 Bad Request if summary is shorter than 5 chars", async () => {
      const res = await request(app)
        .post("/api/tickets")
        .set("X-Requester-Id", String(activeRequesterId))
        .send({
          categoryId: validCategoryId,
          relatedSystemId: validRelatedSystemId,
          summary: "Help", // 4 chars
          description: "This is a sufficiently long problem description for testing.",
        });

      expect(res.status).toBe(400);
      const summaryErr = res.body.error.details.find((d: { field: string }) => d.field === "summary");
      expect(summaryErr).toBeDefined();
    });

    it("returns 400 Bad Request if summary is longer than 100 chars", async () => {
      const res = await request(app)
        .post("/api/tickets")
        .set("X-Requester-Id", String(activeRequesterId))
        .send({
          categoryId: validCategoryId,
          relatedSystemId: validRelatedSystemId,
          summary: "a".repeat(101),
          description: "This is a sufficiently long problem description for testing.",
        });

      expect(res.status).toBe(400);
      const summaryErr = res.body.error.details.find((d: { field: string }) => d.field === "summary");
      expect(summaryErr).toBeDefined();
    });

    it("returns 400 Bad Request if description is shorter than 10 chars", async () => {
      const res = await request(app)
        .post("/api/tickets")
        .set("X-Requester-Id", String(activeRequesterId))
        .send({
          categoryId: validCategoryId,
          relatedSystemId: validRelatedSystemId,
          summary: "Valid summary",
          description: "Too short", // 9 chars
        });

      expect(res.status).toBe(400);
      const descErr = res.body.error.details.find((d: { field: string }) => d.field === "description");
      expect(descErr).toBeDefined();
    });

    it("returns 400 Bad Request if description is longer than 2000 chars", async () => {
      const res = await request(app)
        .post("/api/tickets")
        .set("X-Requester-Id", String(activeRequesterId))
        .send({
          categoryId: validCategoryId,
          relatedSystemId: validRelatedSystemId,
          summary: "Valid summary",
          description: "a".repeat(2001),
        });

      expect(res.status).toBe(400);
      const descErr = res.body.error.details.find((d: { field: string }) => d.field === "description");
      expect(descErr).toBeDefined();
    });

    it("returns 400 Bad Request if categoryId or relatedSystemId does not exist", async () => {
      const res = await request(app)
        .post("/api/tickets")
        .set("X-Requester-Id", String(activeRequesterId))
        .send({
          categoryId: 99999,
          relatedSystemId: 99999,
          summary: "Valid summary",
          description: "This is a sufficiently long description.",
        });

      expect(res.status).toBe(400);
      const fields = res.body.error.details.map((d: { field: string }) => d.field);
      expect(fields).toContain("categoryId");
      expect(fields).toContain("relatedSystemId");
    });
  });

  // TICK-API-03: Whitespace trimming before validation
  describe("TICK-API-03: Whitespace Trimming Validation", () => {
    it("rejects summary with spaces only (e.g. '   ') with 400 Bad Request", async () => {
      const res = await request(app)
        .post("/api/tickets")
        .set("X-Requester-Id", String(activeRequesterId))
        .send({
          categoryId: validCategoryId,
          relatedSystemId: validRelatedSystemId,
          summary: "      ",
          description: "This is a sufficiently long description for testing.",
        });

      expect(res.status).toBe(400);
      const summaryErr = res.body.error.details.find((d: { field: string }) => d.field === "summary");
      expect(summaryErr).toBeDefined();
    });

    it("rejects description with spaces only with 400 Bad Request", async () => {
      const res = await request(app)
        .post("/api/tickets")
        .set("X-Requester-Id", String(activeRequesterId))
        .send({
          categoryId: validCategoryId,
          relatedSystemId: validRelatedSystemId,
          summary: "Valid summary here",
          description: "          ",
        });

      expect(res.status).toBe(400);
      const descErr = res.body.error.details.find((d: { field: string }) => d.field === "description");
      expect(descErr).toBeDefined();
    });

    it("trims leading/trailing whitespace before storing in database", async () => {
      const res = await request(app)
        .post("/api/tickets")
        .set("X-Requester-Id", String(activeRequesterId))
        .send({
          categoryId: validCategoryId,
          relatedSystemId: validRelatedSystemId,
          summary: "   Valid trimmed summary   ",
          description: "   Valid trimmed description with sufficient length   ",
        });

      expect(res.status).toBe(201);
      expect(res.body.summary).toBe("Valid trimmed summary");
      expect(res.body.description).toBe("Valid trimmed description with sufficient length");
    });
  });
});
