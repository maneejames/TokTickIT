import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import fs from "node:fs";
import path from "node:path";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";

describe("Attachment API Tests", () => {
  let requesterAId: number;
  let requesterBId: number;
  let ticketIdRequesterA: number;

  beforeAll(async () => {
    const prisma = getPrisma();
    const requesters = await prisma.requesterUser.findMany({
      where: { isActive: true },
      take: 2,
    });
    requesterAId = requesters[0].id;
    requesterBId = requesters[1].id;

    const category = await prisma.category.findFirst({ where: { isActive: true } });
    const system = await prisma.relatedSystem.findFirst({ where: { isActive: true } });

    // Create a ticket owned by Requester A for testing
    const ticketA = await prisma.ticket.create({
      data: {
        ticketNumber: `TICK-TEST-ATT-${Date.now()}`,
        requesterId: requesterAId,
        categoryId: category!.id,
        relatedSystemId: system!.id,
        summary: "Attachment test ticket for Requester A",
        description: "Ticket created specifically to test attachment upload scenarios.",
      },
    });
    ticketIdRequesterA = ticketA.id;
  });

  // ATT-API-01: Upload valid attachment
  describe("ATT-API-01: Valid Attachment Upload", () => {
    it("returns 201 Created, saves file on disk as UUID, and stores metadata in DB", async () => {
      const fileBuffer = Buffer.from("fake png image content");

      const res = await request(app)
        .post(`/api/tickets/${ticketIdRequesterA}/attachments`)
        .set("X-Requester-Id", String(requesterAId))
        .attach("file", fileBuffer, {
          filename: "screenshot.png",
          contentType: "image/png",
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty("id");
      expect(res.body.ticketId).toBe(ticketIdRequesterA);
      expect(res.body.originalFilename).toBe("screenshot.png");
      expect(res.body.mimeType).toBe("image/png");
      expect(res.body.sizeBytes).toBe(fileBuffer.length);
      expect(res.body.isRemoved).toBe(false);

      // Verify file exists on disk under server/uploads/attachments/
      const prisma = getPrisma();
      const dbAttachment = await prisma.attachment.findUnique({
        where: { id: res.body.id },
      });
      expect(dbAttachment).not.toBeNull();
      expect(dbAttachment?.storedFilename).toMatch(/^[0-9a-fA-F-]+\.png$/);

      const filePath = path.resolve(process.cwd(), "uploads", "attachments", dbAttachment!.storedFilename);
      expect(fs.existsSync(filePath)).toBe(true);
    });
  });

  // ATT-API-02: Reject file > 5 MB
  describe("ATT-API-02: Reject Oversized Attachment", () => {
    it("rejects file exceeding 5MB with 413 Payload Too Large", async () => {
      // 5 MB + 10 bytes
      const oversizedBuffer = Buffer.alloc(5 * 1024 * 1024 + 10);

      const res = await request(app)
        .post(`/api/tickets/${ticketIdRequesterA}/attachments`)
        .set("X-Requester-Id", String(requesterAId))
        .attach("file", oversizedBuffer, {
          filename: "large_file.pdf",
          contentType: "application/pdf",
        });

      expect(res.status).toBe(413);
      expect(res.body).toHaveProperty("error");
    });
  });

  // ATT-API-03: Reject invalid MIME type
  describe("ATT-API-03: Reject Unsupported MIME Type", () => {
    it("rejects file with unsupported MIME type (e.g. .exe / application/x-msdownload) with 415 Unsupported Media Type", async () => {
      const fileBuffer = Buffer.from("executable binary payload");

      const res = await request(app)
        .post(`/api/tickets/${ticketIdRequesterA}/attachments`)
        .set("X-Requester-Id", String(requesterAId))
        .attach("file", fileBuffer, {
          filename: "malicious.exe",
          contentType: "application/x-msdownload",
        });

      expect(res.status).toBe(415);
      expect(res.body).toHaveProperty("error");
    });
  });

  // ATT-API-04: Reject 6th active attachment
  describe("ATT-API-04: Reject When 5 Active Attachments Reached", () => {
    it("rejects upload with 400 Bad Request when ticket already has 5 active attachments", async () => {
      const prisma = getPrisma();

      // Ensure ticket has exactly 5 active attachments
      const currentCount = await prisma.attachment.count({
        where: { ticketId: ticketIdRequesterA, isRemoved: false },
      });

      for (let i = currentCount; i < 5; i++) {
        await prisma.attachment.create({
          data: {
            ticketId: ticketIdRequesterA,
            storedFilename: `dummy-${Date.now()}-${i}.png`,
            originalFilename: `dummy-${i}.png`,
            mimeType: "image/png",
            sizeBytes: 100,
            isRemoved: false,
          },
        });
      }

      // Attempt 6th upload
      const fileBuffer = Buffer.from("6th file payload");
      const res = await request(app)
        .post(`/api/tickets/${ticketIdRequesterA}/attachments`)
        .set("X-Requester-Id", String(requesterAId))
        .attach("file", fileBuffer, {
          filename: "sixth_file.png",
          contentType: "image/png",
        });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("error");
      expect(res.body.error.message).toMatch(/maximum.*5.*attachments/i);
    });
  });

  // Ownership check: 404 Not Found for another requester's ticket
  describe("Ownership Validation: 404 Not Found for another requester's ticket", () => {
    it("returns 404 Not Found (not 403) when Requester B attempts to attach to Requester A's ticket", async () => {
      const fileBuffer = Buffer.from("some png content");

      const res = await request(app)
        .post(`/api/tickets/${ticketIdRequesterA}/attachments`)
        .set("X-Requester-Id", String(requesterBId)) // Requester B does not own ticket A
        .attach("file", fileBuffer, {
          filename: "unauthorized.png",
          contentType: "image/png",
        });

      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty("error");
      expect(res.body.error.code).toBe("NOT_FOUND");
    });
  });
});
