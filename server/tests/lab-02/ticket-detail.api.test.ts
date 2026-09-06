import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import fs from "node:fs";
import path from "node:path";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";

describe("Ticket Detail & Attachment API Tests (Issue #6)", () => {
  let requesterAId: number;
  let requesterBId: number;
  let ticketIdA: number;
  let ticketNumberA: string;
  let activeAttachmentId: number;
  let removedAttachmentId: number;
  let activeStoredFilename: string;

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

    // Create ticket owned by Requester A
    const ticket = await prisma.ticket.create({
      data: {
        ticketNumber: `TICK-TEST-DET-${Date.now()}`,
        requesterId: requesterAId,
        categoryId: category!.id,
        relatedSystemId: system!.id,
        summary: "Ticket Detail & Attachment integration test",
        description: "Detailed description for testing ticket retrieval, downloads, and soft-removal.",
        requestedPriority: "HIGH",
      },
    });
    ticketIdA = ticket.id;
    ticketNumberA = ticket.ticketNumber;

    // Create uploads directory if not exists
    const uploadDir = path.resolve(process.cwd(), "uploads", "attachments");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // Create physical dummy file on disk for active attachment
    activeStoredFilename = `test-active-${Date.now()}.png`;
    fs.writeFileSync(path.join(uploadDir, activeStoredFilename), Buffer.from("PNG fake content"));

    // Add active attachment
    const activeAtt = await prisma.attachment.create({
      data: {
        ticketId: ticketIdA,
        storedFilename: activeStoredFilename,
        originalFilename: "active_spec.png",
        mimeType: "image/png",
        sizeBytes: 16,
        isRemoved: false,
      },
    });
    activeAttachmentId = activeAtt.id;

    // Create physical dummy file for removed attachment
    const removedStoredFilename = `test-removed-${Date.now()}.pdf`;
    fs.writeFileSync(path.join(uploadDir, removedStoredFilename), Buffer.from("PDF fake content"));

    // Add soft-removed attachment
    const removedAtt = await prisma.attachment.create({
      data: {
        ticketId: ticketIdA,
        storedFilename: removedStoredFilename,
        originalFilename: "removed_old_doc.pdf",
        mimeType: "application/pdf",
        sizeBytes: 16,
        isRemoved: true,
        removedAt: new Date(),
        removedReason: "Old obsolete draft",
      },
    });
    removedAttachmentId = removedAtt.id;
  });

  // ---------------------------------------------------------------------------
  // DET-API-01: Successful retrieval of an owned ticket with attachments
  // ---------------------------------------------------------------------------
  describe("DET-API-01: Get single ticket detail", () => {
    it("returns 200 OK with full ticket details, category and relatedSystem objects, and attachments array", async () => {
      const res = await request(app)
        .get(`/api/tickets/${ticketIdA}`)
        .set("X-Requester-Id", String(requesterAId));

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("id", ticketIdA);
      expect(res.body).toHaveProperty("ticketNumber", ticketNumberA);
      expect(res.body).toHaveProperty("summary", "Ticket Detail & Attachment integration test");
      expect(res.body).toHaveProperty("requestedPriority", "HIGH");
      expect(res.body).toHaveProperty("currentStatus", "NEW");
      expect(res.body).toHaveProperty("category");
      expect(res.body.category).toHaveProperty("name");
      expect(res.body).toHaveProperty("relatedSystem");
      expect(res.body.relatedSystem).toHaveProperty("name");
      expect(res.body).toHaveProperty("requester");
      expect(res.body.requester).toHaveProperty("name");
      expect(res.body.requester).toHaveProperty("department");

      expect(res.body).toHaveProperty("attachments");
      expect(Array.isArray(res.body.attachments)).toBe(true);
      expect(res.body.attachments.length).toBe(2);

      // Verify attachment metadata fields
      const active = res.body.attachments.find((a: { id: number }) => a.id === activeAttachmentId);
      expect(active).toBeDefined();
      expect(active.originalFilename).toBe("active_spec.png");
      expect(active.mimeType).toBe("image/png");
      expect(active.isRemoved).toBe(false);

      const removed = res.body.attachments.find((a: { id: number }) => a.id === removedAttachmentId);
      expect(removed).toBeDefined();
      expect(removed.originalFilename).toBe("removed_old_doc.pdf");
      expect(removed.isRemoved).toBe(true);
      expect(removed.removedReason).toBe("Old obsolete draft");
    });
  });

  // ---------------------------------------------------------------------------
  // DET-API-02: Cross-requester access returns 404 (and nonexistent ticket ID returns 404)
  // ---------------------------------------------------------------------------
  describe("DET-API-02: Unauthorized ticket detail access returns 404 Not Found", () => {
    it("returns 404 Not Found when Requester B attempts to fetch Requester A's ticket", async () => {
      const res = await request(app)
        .get(`/api/tickets/${ticketIdA}`)
        .set("X-Requester-Id", String(requesterBId));

      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty("error");
      expect(res.body.error.code).toBe("NOT_FOUND");
    });

    it("returns 404 Not Found when ticket ID does not exist", async () => {
      const res = await request(app)
        .get("/api/tickets/999999")
        .set("X-Requester-Id", String(requesterAId));

      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty("error");
      expect(res.body.error.code).toBe("NOT_FOUND");
    });
  });

  // ---------------------------------------------------------------------------
  // Attachment Metadata: GET /api/tickets/:id/attachments/:attachmentId
  // ---------------------------------------------------------------------------
  describe("Attachment Metadata: GET /api/tickets/:id/attachments/:attachmentId", () => {
    it("returns 200 OK with attachment metadata for owner", async () => {
      const res = await request(app)
        .get(`/api/tickets/${ticketIdA}/attachments/${activeAttachmentId}`)
        .set("X-Requester-Id", String(requesterAId));

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("id", activeAttachmentId);
      expect(res.body).toHaveProperty("originalFilename", "active_spec.png");
      expect(res.body).toHaveProperty("mimeType", "image/png");
    });

    it("returns 404 Not Found for cross-requester access", async () => {
      const res = await request(app)
        .get(`/api/tickets/${ticketIdA}/attachments/${activeAttachmentId}`)
        .set("X-Requester-Id", String(requesterBId));

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe("NOT_FOUND");
    });
  });

  // ---------------------------------------------------------------------------
  // ATT-API-05: Download active attachment (header and query param; cross-requester 404)
  // ---------------------------------------------------------------------------
  describe("ATT-API-05: Download active attachment", () => {
    it("returns 200 OK with binary stream and headers when using X-Requester-Id header", async () => {
      const res = await request(app)
        .get(`/api/tickets/${ticketIdA}/attachments/${activeAttachmentId}/download`)
        .set("X-Requester-Id", String(requesterAId));

      expect(res.status).toBe(200);
      expect(res.headers["content-type"]).toContain("image/png");
      expect(res.headers["content-disposition"]).toContain('filename="active_spec.png"');
      expect(res.body.toString()).toBe("PNG fake content");
    });

    it("returns 200 OK when using ?requesterId= query parameter (for browser link support)", async () => {
      const res = await request(app)
        .get(`/api/tickets/${ticketIdA}/attachments/${activeAttachmentId}/download?requesterId=${requesterAId}`);

      expect(res.status).toBe(200);
      expect(res.headers["content-type"]).toContain("image/png");
      expect(res.headers["content-disposition"]).toContain('filename="active_spec.png"');
      expect(res.body.toString()).toBe("PNG fake content");
    });

    it("returns 404 Not Found when cross-requester attempts download", async () => {
      const res = await request(app)
        .get(`/api/tickets/${ticketIdA}/attachments/${activeAttachmentId}/download`)
        .set("X-Requester-Id", String(requesterBId));

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe("NOT_FOUND");
    });
  });

  // ---------------------------------------------------------------------------
  // ATT-API-06: Soft-remove attachment with reason
  // ---------------------------------------------------------------------------
  describe("ATT-API-06: Soft-remove attachment with reason", () => {
    it("returns 200 OK, marks isRemoved: true, and saves removedReason", async () => {
      const prisma = getPrisma();
      // Create fresh attachment to remove
      const toRemove = await prisma.attachment.create({
        data: {
          ticketId: ticketIdA,
          storedFilename: `to-remove-${Date.now()}.png`,
          originalFilename: "screenshot_to_remove.png",
          mimeType: "image/png",
          sizeBytes: 100,
          isRemoved: false,
        },
      });

      const res = await request(app)
        .patch(`/api/tickets/${ticketIdA}/attachments/${toRemove.id}/remove`)
        .set("X-Requester-Id", String(requesterAId))
        .send({
          removedReason: "Uploaded wrong screenshot by mistake",
        });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("id", toRemove.id);
      expect(res.body.isRemoved).toBe(true);
      expect(res.body.removedReason).toBe("Uploaded wrong screenshot by mistake");
      expect(res.body).toHaveProperty("removedAt");

      // Verify DB record
      const updated = await prisma.attachment.findUnique({ where: { id: toRemove.id } });
      expect(updated?.isRemoved).toBe(true);
      expect(updated?.removedReason).toBe("Uploaded wrong screenshot by mistake");
    });

    it("returns 404 Not Found when cross-requester attempts to remove attachment", async () => {
      const res = await request(app)
        .patch(`/api/tickets/${ticketIdA}/attachments/${activeAttachmentId}/remove`)
        .set("X-Requester-Id", String(requesterBId))
        .send({ removedReason: "Should fail" });

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe("NOT_FOUND");
    });

    it("returns 400 Bad Request when attempting to remove an already removed attachment", async () => {
      const res = await request(app)
        .patch(`/api/tickets/${ticketIdA}/attachments/${removedAttachmentId}/remove`)
        .set("X-Requester-Id", String(requesterAId))
        .send({ removedReason: "Already removed" });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toMatch(/already removed/i);
    });
  });

  // ---------------------------------------------------------------------------
  // ATT-API-07: Block download of soft-removed file with 410 Gone
  // ---------------------------------------------------------------------------
  describe("ATT-API-07: Block download of soft-removed file", () => {
    it("returns 410 Gone (NOT 404) when attempting to download soft-removed attachment", async () => {
      const res = await request(app)
        .get(`/api/tickets/${ticketIdA}/attachments/${removedAttachmentId}/download`)
        .set("X-Requester-Id", String(requesterAId));

      expect(res.status).toBe(410);
      expect(res.body).toHaveProperty("error");
      expect(res.body.error.code).toBe("GONE");
      expect(res.body.error.message).toBe("This attachment has been removed and cannot be downloaded");
    });
  });

  // ---------------------------------------------------------------------------
  // Enforce 5-active-attachment limit on existing ticket (ATT-API-08)
  // ---------------------------------------------------------------------------
  describe("ATT-API-08: Enforce 5-active-attachment limit on existing ticket", () => {
    it("counts only active attachments; soft-removed attachments do not block reaching 5 active", async () => {
      const prisma = getPrisma();
      // Create new ticket
      const cat = await prisma.category.findFirst({ where: { isActive: true } });
      const sys = await prisma.relatedSystem.findFirst({ where: { isActive: true } });
      const testTicket = await prisma.ticket.create({
        data: {
          ticketNumber: `TICK-LIMIT-${Date.now()}`,
          requesterId: requesterAId,
          categoryId: cat!.id,
          relatedSystemId: sys!.id,
          summary: "Ticket for testing 5-active attachment limit",
          description: "Testing active vs soft-removed attachment counts.",
        },
      });

      // Add 2 soft-removed attachments
      for (let i = 0; i < 2; i++) {
        await prisma.attachment.create({
          data: {
            ticketId: testTicket.id,
            storedFilename: `removed-dummy-${Date.now()}-${i}.png`,
            originalFilename: `removed-${i}.png`,
            mimeType: "image/png",
            sizeBytes: 50,
            isRemoved: true,
            removedAt: new Date(),
          },
        });
      }

      // Add 4 active attachments
      for (let i = 0; i < 4; i++) {
        await prisma.attachment.create({
          data: {
            ticketId: testTicket.id,
            storedFilename: `active-dummy-${Date.now()}-${i}.png`,
            originalFilename: `active-${i}.png`,
            mimeType: "image/png",
            sizeBytes: 50,
            isRemoved: false,
          },
        });
      }

      // Now activeCount = 4, totalCount = 6. We should still be able to upload 1 more active attachment (the 5th).
      const validUpload = await request(app)
        .post(`/api/tickets/${testTicket.id}/attachments`)
        .set("X-Requester-Id", String(requesterAId))
        .attach("file", Buffer.from("5th active file"), {
          filename: "fifth_active.png",
          contentType: "image/png",
        });

      expect(validUpload.status).toBe(201);

      // Now activeCount = 5. Attempting a 6th active upload must fail with 400 Bad Request.
      const sixthUpload = await request(app)
        .post(`/api/tickets/${testTicket.id}/attachments`)
        .set("X-Requester-Id", String(requesterAId))
        .attach("file", Buffer.from("6th active file"), {
          filename: "sixth_active.png",
          contentType: "image/png",
        });

      expect(sixthUpload.status).toBe(400);
      expect(sixthUpload.body.error.code).toBe("ATTACHMENT_LIMIT_EXCEEDED");
    });
  });
});
