import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";

describe("Lab 3 - IT Staff Ticket Detail Operations API Tests (DETAIL-API-01, DETAIL-API-02, DETAIL-API-03, DETAIL-API-04)", () => {
  const prisma = getPrisma();

  let requesterToken: string;
  let staffWitchaiToken: string;
  let staffKamonToken: string;
  let adminToken: string;

  let requesterId: number;
  let staffWitchaiId: number;
  let staffKamonId: number;
  let adminId: number;
  let inactiveStaffId: number;

  const createdTicketIds: number[] = [];

  // Helper to create a ticket in a specific status
  async function createTicketWithStatus(
    status:
      | "NEW"
      | "OPEN"
      | "IN_PROGRESS"
      | "WAITING_FOR_REQUESTER"
      | "RESOLVED"
      | "CLOSED"
      | "REOPENED"
      | "CANCELLED",
    options: {
      ownerId?: number | null;
      requestedPriority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
      itPriority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
    } = {}
  ) {
    const ticketNumber = `TICK-DETAIL-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const ticket = await prisma.ticket.create({
      data: {
        ticketNumber,
        requesterId,
        categoryId: 1,
        relatedSystemId: 1,
        summary: `Test Ticket for status ${status}`,
        description: `Description for ticket in ${status}`,
        requestedPriority: options.requestedPriority ?? "MEDIUM",
        itPriority: options.itPriority ?? options.requestedPriority ?? "MEDIUM",
        currentStatus: status,
        ownerId: options.ownerId !== undefined ? options.ownerId : null,
        isRequesterResolved: false,
      },
    });
    createdTicketIds.push(ticket.id);
    return ticket;
  }

  beforeAll(async () => {
    // 1. Authenticate Requester
    const reqRes = await request(app)
      .post("/api/auth/login")
      .send({ email: "somchai.jai@kmutt.ac.th", password: "Password123!" });
    requesterToken = extractToken(reqRes);
    requesterId = reqRes.body.user.id;

    // 2. Authenticate Staff 1 (Witchai)
    const staff1Res = await request(app)
      .post("/api/auth/login")
      .send({ email: "staff.witchai@kmutt.ac.th", password: "Password123!" });
    staffWitchaiToken = extractToken(staff1Res);
    staffWitchaiId = staff1Res.body.user.id;

    // 3. Authenticate Staff 2 (Kamon)
    const staff2Res = await request(app)
      .post("/api/auth/login")
      .send({ email: "staff.kamon@kmutt.ac.th", password: "Password123!" });
    staffKamonToken = extractToken(staff2Res);
    staffKamonId = staff2Res.body.user.id;

    // 4. Authenticate Admin
    const adminRes = await request(app)
      .post("/api/auth/login")
      .send({ email: "admin@kmutt.ac.th", password: "Password123!" });
    adminToken = extractToken(adminRes);
    adminId = adminRes.body.user.id;

    // 5. Look up inactive staff user
    const inactiveStaff = await prisma.user.findFirst({
      where: { email: "staff.inactive@kmutt.ac.th" },
    });
    if (inactiveStaff) {
      inactiveStaffId = inactiveStaff.id;
    } else {
      const created = await prisma.user.create({
        data: {
          email: "staff.inactive.detail@kmutt.ac.th",
          name: "Inactive Staff Detail",
          passwordHash: "hash",
          role: "IT_STAFF",
          isActive: false,
          mustChangePassword: false,
        },
      });
      inactiveStaffId = created.id;
    }
  });

  afterAll(async () => {
    if (createdTicketIds.length > 0) {
      await prisma.publicComment.deleteMany({ where: { ticketId: { in: createdTicketIds } } });
      await prisma.internalNote.deleteMany({ where: { ticketId: { in: createdTicketIds } } });
      await prisma.attachment.deleteMany({ where: { ticketId: { in: createdTicketIds } } });
      await prisma.ticket.deleteMany({ where: { id: { in: createdTicketIds } } });
    }
  });

  // =========================================================================
  // 1. Role Checks & Authentication Guards (401 / 403)
  // =========================================================================
  describe("Role Checks & Authentication Guards (§6 Authorization Matrix)", () => {
    let testTicketId: number;

    beforeAll(async () => {
      const t = await createTicketWithStatus("NEW");
      testTicketId = t.id;
    });

    describe("PATCH /api/staff/tickets/:id/owner", () => {
      it("rejects unauthenticated request with 401 Unauthorized", async () => {
        const res = await request(app)
          .patch(`/api/staff/tickets/${testTicketId}/owner`)
          .send({ ownerId: staffWitchaiId });
        expect(res.status).toBe(401);
        expect(res.body.error?.code).toBe("UNAUTHORIZED");
      });

      it("rejects Requester with 403 Forbidden", async () => {
        const res = await request(app)
          .patch(`/api/staff/tickets/${testTicketId}/owner`)
          .set("Cookie", `toktickit_session=${requesterToken}`)
          .send({ ownerId: staffWitchaiId });
        expect(res.status).toBe(403);
        expect(res.body.error?.code).toBe("FORBIDDEN");
      });

      it("rejects Administrator with 403 Forbidden", async () => {
        const res = await request(app)
          .patch(`/api/staff/tickets/${testTicketId}/owner`)
          .set("Cookie", `toktickit_session=${adminToken}`)
          .send({ ownerId: staffWitchaiId });
        expect(res.status).toBe(403);
        expect(res.body.error?.code).toBe("FORBIDDEN");
      });
    });

    describe("PATCH /api/staff/tickets/:id/priority", () => {
      it("rejects unauthenticated request with 401 Unauthorized", async () => {
        const res = await request(app)
          .patch(`/api/staff/tickets/${testTicketId}/priority`)
          .send({ itPriority: "HIGH" });
        expect(res.status).toBe(401);
        expect(res.body.error?.code).toBe("UNAUTHORIZED");
      });

      it("rejects Requester with 403 Forbidden", async () => {
        const res = await request(app)
          .patch(`/api/staff/tickets/${testTicketId}/priority`)
          .set("Cookie", `toktickit_session=${requesterToken}`)
          .send({ itPriority: "HIGH" });
        expect(res.status).toBe(403);
        expect(res.body.error?.code).toBe("FORBIDDEN");
      });

      it("rejects Administrator with 403 Forbidden", async () => {
        const res = await request(app)
          .patch(`/api/staff/tickets/${testTicketId}/priority`)
          .set("Cookie", `toktickit_session=${adminToken}`)
          .send({ itPriority: "HIGH" });
        expect(res.status).toBe(403);
        expect(res.body.error?.code).toBe("FORBIDDEN");
      });
    });

    describe("PATCH /api/staff/tickets/:id/status", () => {
      it("rejects unauthenticated request with 401 Unauthorized", async () => {
        const res = await request(app)
          .patch(`/api/staff/tickets/${testTicketId}/status`)
          .send({ status: "OPEN" });
        expect(res.status).toBe(401);
        expect(res.body.error?.code).toBe("UNAUTHORIZED");
      });

      it("rejects Requester with 403 Forbidden", async () => {
        const res = await request(app)
          .patch(`/api/staff/tickets/${testTicketId}/status`)
          .set("Cookie", `toktickit_session=${requesterToken}`)
          .send({ status: "OPEN" });
        expect(res.status).toBe(403);
        expect(res.body.error?.code).toBe("FORBIDDEN");
      });

      it("rejects Administrator with 403 Forbidden", async () => {
        const res = await request(app)
          .patch(`/api/staff/tickets/${testTicketId}/status`)
          .set("Cookie", `toktickit_session=${adminToken}`)
          .send({ status: "OPEN" });
        expect(res.status).toBe(403);
        expect(res.body.error?.code).toBe("FORBIDDEN");
      });
    });
  });

  // =========================================================================
  // 2. DETAIL-API-01: Claiming an Unassigned Ticket
  // =========================================================================
  describe("DETAIL-API-01: IT Staff Claims Unassigned Ticket (AC-14)", () => {
    it("successfully claims an unassigned ticket when ownerId is omitted (defaults to caller)", async () => {
      const ticket = await createTicketWithStatus("NEW", { ownerId: null });

      const res = await request(app)
        .patch(`/api/staff/tickets/${ticket.id}/owner`)
        .set("Cookie", `toktickit_session=${staffWitchaiToken}`)
        .send({});

      expect(res.status).toBe(200);
      expect(res.body.ownerId).toBe(staffWitchaiId);
      expect(res.body.owner?.id).toBe(staffWitchaiId);

      const dbTicket = await prisma.ticket.findUnique({ where: { id: ticket.id } });
      expect(dbTicket?.ownerId).toBe(staffWitchaiId);
    });

    it("successfully claims an unassigned ticket when ownerId explicitly matches caller", async () => {
      const ticket = await createTicketWithStatus("NEW", { ownerId: null });

      const res = await request(app)
        .patch(`/api/staff/tickets/${ticket.id}/owner`)
        .set("Cookie", `toktickit_session=${staffWitchaiToken}`)
        .send({ ownerId: staffWitchaiId });

      expect(res.status).toBe(200);
      expect(res.body.ownerId).toBe(staffWitchaiId);
      expect(res.body.owner?.id).toBe(staffWitchaiId);

      const dbTicket = await prisma.ticket.findUnique({ where: { id: ticket.id } });
      expect(dbTicket?.ownerId).toBe(staffWitchaiId);
    });
  });

  // =========================================================================
  // 3. DETAIL-API-02: Reassigning Ticket Ownership
  // =========================================================================
  describe("DETAIL-API-02: IT Staff Reassigns Ticket Ownership (AC-15, BR-12)", () => {
    it("successfully reassigns an already-owned ticket to another active IT Staff member", async () => {
      const ticket = await createTicketWithStatus("OPEN", { ownerId: staffWitchaiId });

      const res = await request(app)
        .patch(`/api/staff/tickets/${ticket.id}/owner`)
        .set("Cookie", `toktickit_session=${staffWitchaiToken}`)
        .send({ ownerId: staffKamonId });

      expect(res.status).toBe(200);
      expect(res.body.ownerId).toBe(staffKamonId);
      expect(res.body.owner?.id).toBe(staffKamonId);

      const dbTicket = await prisma.ticket.findUnique({ where: { id: ticket.id } });
      expect(dbTicket?.ownerId).toBe(staffKamonId);
    });

    it("successfully reassigns an already-owned ticket to an active Administrator per BR-12", async () => {
      const ticket = await createTicketWithStatus("OPEN", { ownerId: staffWitchaiId });

      const res = await request(app)
        .patch(`/api/staff/tickets/${ticket.id}/owner`)
        .set("Cookie", `toktickit_session=${staffWitchaiToken}`)
        .send({ ownerId: adminId });

      expect(res.status).toBe(200);
      expect(res.body.ownerId).toBe(adminId);
      expect(res.body.owner?.id).toBe(adminId);

      const dbTicket = await prisma.ticket.findUnique({ where: { id: ticket.id } });
      expect(dbTicket?.ownerId).toBe(adminId);
    });

    it("rejects reassigning to an inactive IT Staff member with 400 Bad Request", async () => {
      const ticket = await createTicketWithStatus("OPEN", { ownerId: staffWitchaiId });

      const res = await request(app)
        .patch(`/api/staff/tickets/${ticket.id}/owner`)
        .set("Cookie", `toktickit_session=${staffWitchaiToken}`)
        .send({ ownerId: inactiveStaffId });

      expect(res.status).toBe(400);
      expect(res.body.error?.code).toBeDefined();

      const dbTicket = await prisma.ticket.findUnique({ where: { id: ticket.id } });
      expect(dbTicket?.ownerId).toBe(staffWitchaiId);
    });

    it("rejects reassigning to a user with role REQUESTER with 400 Bad Request", async () => {
      const ticket = await createTicketWithStatus("OPEN", { ownerId: staffWitchaiId });

      const res = await request(app)
        .patch(`/api/staff/tickets/${ticket.id}/owner`)
        .set("Cookie", `toktickit_session=${staffWitchaiToken}`)
        .send({ ownerId: requesterId });

      expect(res.status).toBe(400);
      expect(res.body.error?.code).toBeDefined();

      const dbTicket = await prisma.ticket.findUnique({ where: { id: ticket.id } });
      expect(dbTicket?.ownerId).toBe(staffWitchaiId);
    });

    it("rejects reassigning to a non-existent user with 400 Bad Request", async () => {
      const ticket = await createTicketWithStatus("OPEN", { ownerId: staffWitchaiId });

      const res = await request(app)
        .patch(`/api/staff/tickets/${ticket.id}/owner`)
        .set("Cookie", `toktickit_session=${staffWitchaiToken}`)
        .send({ ownerId: 999999 });

      expect(res.status).toBe(400);
      expect(res.body.error?.code).toBeDefined();
    });

    it("returns 404 Not Found when attempting to reassign a non-existent ticket", async () => {
      const res = await request(app)
        .patch("/api/staff/tickets/999999/owner")
        .set("Cookie", `toktickit_session=${staffWitchaiToken}`)
        .send({ ownerId: staffKamonId });

      expect(res.status).toBe(404);
      expect(res.body.error?.code).toBe("NOT_FOUND");
    });
  });

  // =========================================================================
  // 4. DETAIL-API-03: IT Priority Change (BR-13, BR-14, AC-16)
  // =========================================================================
  describe("DETAIL-API-03: IT Staff Modifies IT Priority (AC-16, BR-13, BR-14)", () => {
    it("updates IT Priority while leaving Requested Priority unchanged", async () => {
      const ticket = await createTicketWithStatus("OPEN", {
        requestedPriority: "LOW",
        itPriority: "LOW",
      });

      const res = await request(app)
        .patch(`/api/staff/tickets/${ticket.id}/priority`)
        .set("Cookie", `toktickit_session=${staffWitchaiToken}`)
        .send({ itPriority: "URGENT" });

      expect(res.status).toBe(200);
      expect(res.body.itPriority).toBe("URGENT");
      expect(res.body.requestedPriority).toBe("LOW");

      const dbTicket = await prisma.ticket.findUnique({ where: { id: ticket.id } });
      expect(dbTicket?.itPriority).toBe("URGENT");
      expect(dbTicket?.requestedPriority).toBe("LOW");
    });

    it("supports all valid Priority enum values (LOW, MEDIUM, HIGH, URGENT)", async () => {
      const ticket = await createTicketWithStatus("OPEN", {
        requestedPriority: "MEDIUM",
        itPriority: "LOW",
      });

      for (const p of ["LOW", "MEDIUM", "HIGH", "URGENT"] as const) {
        const res = await request(app)
          .patch(`/api/staff/tickets/${ticket.id}/priority`)
          .set("Cookie", `toktickit_session=${staffWitchaiToken}`)
          .send({ itPriority: p });

        expect(res.status).toBe(200);
        expect(res.body.itPriority).toBe(p);
      }
    });

    it("rejects invalid priority value with 400 Bad Request", async () => {
      const ticket = await createTicketWithStatus("OPEN", {
        requestedPriority: "MEDIUM",
        itPriority: "MEDIUM",
      });

      const res = await request(app)
        .patch(`/api/staff/tickets/${ticket.id}/priority`)
        .set("Cookie", `toktickit_session=${staffWitchaiToken}`)
        .send({ itPriority: "CRITICAL" });

      expect(res.status).toBe(400);
      expect(res.body.error?.code).toBeDefined();

      const dbTicket = await prisma.ticket.findUnique({ where: { id: ticket.id } });
      expect(dbTicket?.itPriority).toBe("MEDIUM");
    });

    it("returns 404 Not Found when updating priority of non-existent ticket", async () => {
      const res = await request(app)
        .patch("/api/staff/tickets/999999/priority")
        .set("Cookie", `toktickit_session=${staffWitchaiToken}`)
        .send({ itPriority: "HIGH" });

      expect(res.status).toBe(404);
      expect(res.body.error?.code).toBe("NOT_FOUND");
    });
  });

  // =========================================================================
  // 5. DETAIL-API-04: Full Status Transition Matrix (§7, AC-17, AC-18)
  // =========================================================================
  describe("DETAIL-API-04: Full Status Transition Matrix Enforcement (§7, AC-17, AC-18)", () => {
    // Current -> Valid Targets
    // NEW -> OPEN, CANCELLED
    // OPEN -> IN_PROGRESS, CANCELLED
    // IN_PROGRESS -> WAITING_FOR_REQUESTER, RESOLVED, CANCELLED
    // WAITING_FOR_REQUESTER -> IN_PROGRESS, RESOLVED, CANCELLED
    // RESOLVED -> CLOSED, REOPENED
    // CLOSED -> REOPENED
    // CANCELLED -> Terminal (no valid next status)
    // REOPENED -> No transitions in matrix

    describe("Transitions from NEW", () => {
      it("permits NEW -> OPEN", async () => {
        const t = await createTicketWithStatus("NEW");
        const res = await request(app)
          .patch(`/api/staff/tickets/${t.id}/status`)
          .set("Cookie", `toktickit_session=${staffWitchaiToken}`)
          .send({ status: "OPEN" });
        expect(res.status).toBe(200);
        expect(res.body.status).toBe("OPEN");
      });

      it("permits NEW -> CANCELLED", async () => {
        const t = await createTicketWithStatus("NEW");
        const res = await request(app)
          .patch(`/api/staff/tickets/${t.id}/status`)
          .set("Cookie", `toktickit_session=${staffWitchaiToken}`)
          .send({ status: "CANCELLED" });
        expect(res.status).toBe(200);
        expect(res.body.status).toBe("CANCELLED");
      });

      it("rejects invalid transitions from NEW (e.g. CLOSED, IN_PROGRESS, RESOLVED)", async () => {
        for (const target of ["CLOSED", "IN_PROGRESS", "WAITING_FOR_REQUESTER", "RESOLVED", "REOPENED", "NEW"] as const) {
          const t = await createTicketWithStatus("NEW");
          const res = await request(app)
            .patch(`/api/staff/tickets/${t.id}/status`)
            .set("Cookie", `toktickit_session=${staffWitchaiToken}`)
            .send({ status: target });
          expect(res.status).toBe(400);
          expect(res.body.error?.code).toBeDefined();
        }
      });
    });

    describe("Transitions from OPEN", () => {
      it("permits OPEN -> IN_PROGRESS", async () => {
        const t = await createTicketWithStatus("OPEN");
        const res = await request(app)
          .patch(`/api/staff/tickets/${t.id}/status`)
          .set("Cookie", `toktickit_session=${staffWitchaiToken}`)
          .send({ status: "IN_PROGRESS" });
        expect(res.status).toBe(200);
        expect(res.body.status).toBe("IN_PROGRESS");
      });

      it("permits OPEN -> CANCELLED", async () => {
        const t = await createTicketWithStatus("OPEN");
        const res = await request(app)
          .patch(`/api/staff/tickets/${t.id}/status`)
          .set("Cookie", `toktickit_session=${staffWitchaiToken}`)
          .send({ status: "CANCELLED" });
        expect(res.status).toBe(200);
        expect(res.body.status).toBe("CANCELLED");
      });

      it("rejects invalid transitions from OPEN (e.g. NEW, RESOLVED, CLOSED, WAITING_FOR_REQUESTER, REOPENED)", async () => {
        for (const target of ["NEW", "RESOLVED", "CLOSED", "WAITING_FOR_REQUESTER", "REOPENED", "OPEN"] as const) {
          const t = await createTicketWithStatus("OPEN");
          const res = await request(app)
            .patch(`/api/staff/tickets/${t.id}/status`)
            .set("Cookie", `toktickit_session=${staffWitchaiToken}`)
            .send({ status: target });
          expect(res.status).toBe(400);
          expect(res.body.error?.code).toBeDefined();
        }
      });
    });

    describe("Transitions from IN_PROGRESS", () => {
      it("permits IN_PROGRESS -> WAITING_FOR_REQUESTER", async () => {
        const t = await createTicketWithStatus("IN_PROGRESS");
        const res = await request(app)
          .patch(`/api/staff/tickets/${t.id}/status`)
          .set("Cookie", `toktickit_session=${staffWitchaiToken}`)
          .send({ status: "WAITING_FOR_REQUESTER" });
        expect(res.status).toBe(200);
        expect(res.body.status).toBe("WAITING_FOR_REQUESTER");
      });

      it("permits IN_PROGRESS -> RESOLVED", async () => {
        const t = await createTicketWithStatus("IN_PROGRESS");
        const res = await request(app)
          .patch(`/api/staff/tickets/${t.id}/status`)
          .set("Cookie", `toktickit_session=${staffWitchaiToken}`)
          .send({ status: "RESOLVED" });
        expect(res.status).toBe(200);
        expect(res.body.status).toBe("RESOLVED");
      });

      it("permits IN_PROGRESS -> CANCELLED", async () => {
        const t = await createTicketWithStatus("IN_PROGRESS");
        const res = await request(app)
          .patch(`/api/staff/tickets/${t.id}/status`)
          .set("Cookie", `toktickit_session=${staffWitchaiToken}`)
          .send({ status: "CANCELLED" });
        expect(res.status).toBe(200);
        expect(res.body.status).toBe("CANCELLED");
      });

      it("rejects invalid transitions from IN_PROGRESS (e.g. NEW, OPEN, CLOSED, REOPENED)", async () => {
        for (const target of ["NEW", "OPEN", "CLOSED", "REOPENED", "IN_PROGRESS"] as const) {
          const t = await createTicketWithStatus("IN_PROGRESS");
          const res = await request(app)
            .patch(`/api/staff/tickets/${t.id}/status`)
            .set("Cookie", `toktickit_session=${staffWitchaiToken}`)
            .send({ status: target });
          expect(res.status).toBe(400);
          expect(res.body.error?.code).toBeDefined();
        }
      });
    });

    describe("Transitions from WAITING_FOR_REQUESTER", () => {
      it("permits WAITING_FOR_REQUESTER -> IN_PROGRESS", async () => {
        const t = await createTicketWithStatus("WAITING_FOR_REQUESTER");
        const res = await request(app)
          .patch(`/api/staff/tickets/${t.id}/status`)
          .set("Cookie", `toktickit_session=${staffWitchaiToken}`)
          .send({ status: "IN_PROGRESS" });
        expect(res.status).toBe(200);
        expect(res.body.status).toBe("IN_PROGRESS");
      });

      it("permits WAITING_FOR_REQUESTER -> RESOLVED", async () => {
        const t = await createTicketWithStatus("WAITING_FOR_REQUESTER");
        const res = await request(app)
          .patch(`/api/staff/tickets/${t.id}/status`)
          .set("Cookie", `toktickit_session=${staffWitchaiToken}`)
          .send({ status: "RESOLVED" });
        expect(res.status).toBe(200);
        expect(res.body.status).toBe("RESOLVED");
      });

      it("permits WAITING_FOR_REQUESTER -> CANCELLED", async () => {
        const t = await createTicketWithStatus("WAITING_FOR_REQUESTER");
        const res = await request(app)
          .patch(`/api/staff/tickets/${t.id}/status`)
          .set("Cookie", `toktickit_session=${staffWitchaiToken}`)
          .send({ status: "CANCELLED" });
        expect(res.status).toBe(200);
        expect(res.body.status).toBe("CANCELLED");
      });

      it("rejects invalid transitions from WAITING_FOR_REQUESTER (e.g. NEW, OPEN, CLOSED, REOPENED)", async () => {
        for (const target of ["NEW", "OPEN", "CLOSED", "REOPENED", "WAITING_FOR_REQUESTER"] as const) {
          const t = await createTicketWithStatus("WAITING_FOR_REQUESTER");
          const res = await request(app)
            .patch(`/api/staff/tickets/${t.id}/status`)
            .set("Cookie", `toktickit_session=${staffWitchaiToken}`)
            .send({ status: target });
          expect(res.status).toBe(400);
          expect(res.body.error?.code).toBeDefined();
        }
      });
    });

    describe("Transitions from RESOLVED", () => {
      it("permits RESOLVED -> CLOSED", async () => {
        const t = await createTicketWithStatus("RESOLVED");
        const res = await request(app)
          .patch(`/api/staff/tickets/${t.id}/status`)
          .set("Cookie", `toktickit_session=${staffWitchaiToken}`)
          .send({ status: "CLOSED" });
        expect(res.status).toBe(200);
        expect(res.body.status).toBe("CLOSED");
      });

      it("permits RESOLVED -> REOPENED", async () => {
        const t = await createTicketWithStatus("RESOLVED");
        const res = await request(app)
          .patch(`/api/staff/tickets/${t.id}/status`)
          .set("Cookie", `toktickit_session=${staffWitchaiToken}`)
          .send({ status: "REOPENED" });
        expect(res.status).toBe(200);
        expect(res.body.status).toBe("REOPENED");
      });

      it("rejects invalid transitions from RESOLVED (e.g. NEW, OPEN, IN_PROGRESS, WAITING_FOR_REQUESTER, CANCELLED)", async () => {
        for (const target of ["NEW", "OPEN", "IN_PROGRESS", "WAITING_FOR_REQUESTER", "CANCELLED", "RESOLVED"] as const) {
          const t = await createTicketWithStatus("RESOLVED");
          const res = await request(app)
            .patch(`/api/staff/tickets/${t.id}/status`)
            .set("Cookie", `toktickit_session=${staffWitchaiToken}`)
            .send({ status: target });
          expect(res.status).toBe(400);
          expect(res.body.error?.code).toBeDefined();
        }
      });
    });

    describe("Transitions from CLOSED", () => {
      it("permits CLOSED -> REOPENED", async () => {
        const t = await createTicketWithStatus("CLOSED");
        const res = await request(app)
          .patch(`/api/staff/tickets/${t.id}/status`)
          .set("Cookie", `toktickit_session=${staffWitchaiToken}`)
          .send({ status: "REOPENED" });
        expect(res.status).toBe(200);
        expect(res.body.status).toBe("REOPENED");
      });

      it("rejects invalid transitions from CLOSED (e.g. NEW, OPEN, IN_PROGRESS, WAITING_FOR_REQUESTER, RESOLVED, CANCELLED)", async () => {
        for (const target of ["NEW", "OPEN", "IN_PROGRESS", "WAITING_FOR_REQUESTER", "RESOLVED", "CANCELLED", "CLOSED"] as const) {
          const t = await createTicketWithStatus("CLOSED");
          const res = await request(app)
            .patch(`/api/staff/tickets/${t.id}/status`)
            .set("Cookie", `toktickit_session=${staffWitchaiToken}`)
            .send({ status: target });
          expect(res.status).toBe(400);
          expect(res.body.error?.code).toBeDefined();
        }
      });
    });

    describe("Transitions from CANCELLED (Terminal state)", () => {
      it("rejects transitions from CANCELLED to any status", async () => {
        for (const target of ["NEW", "OPEN", "IN_PROGRESS", "WAITING_FOR_REQUESTER", "RESOLVED", "CLOSED", "REOPENED", "CANCELLED"] as const) {
          const t = await createTicketWithStatus("CANCELLED");
          const res = await request(app)
            .patch(`/api/staff/tickets/${t.id}/status`)
            .set("Cookie", `toktickit_session=${staffWitchaiToken}`)
            .send({ status: target });
          expect(res.status).toBe(400);
          expect(res.body.error?.code).toBeDefined();
        }
      });
    });

    describe("Transitions from REOPENED", () => {
      it("rejects transitions from REOPENED to statuses not in the matrix", async () => {
        for (const target of ["NEW", "OPEN", "CLOSED", "REOPENED"] as const) {
          const t = await createTicketWithStatus("REOPENED");
          const res = await request(app)
            .patch(`/api/staff/tickets/${t.id}/status`)
            .set("Cookie", `toktickit_session=${staffWitchaiToken}`)
            .send({ status: target });
          expect(res.status).toBe(400);
          expect(res.body.error?.code).toBeDefined();
        }
      });
    });

    describe("Invalid input and edge cases", () => {
      it("rejects invalid status enum with 400 Bad Request", async () => {
        const t = await createTicketWithStatus("OPEN");
        const res = await request(app)
          .patch(`/api/staff/tickets/${t.id}/status`)
          .set("Cookie", `toktickit_session=${staffWitchaiToken}`)
          .send({ status: "NON_EXISTENT_STATUS" });
        expect(res.status).toBe(400);
        expect(res.body.error?.code).toBeDefined();
      });

      it("returns 404 Not Found when updating status of non-existent ticket", async () => {
        const res = await request(app)
          .patch("/api/staff/tickets/999999/status")
          .set("Cookie", `toktickit_session=${staffWitchaiToken}`)
          .send({ status: "OPEN" });
        expect(res.status).toBe(404);
        expect(res.body.error?.code).toBe("NOT_FOUND");
      });
    });
  });
});

function extractToken(res: request.Response): string {
  const cookies = res.headers["set-cookie"];
  const cookieHeader = Array.isArray(cookies) ? cookies.join("; ") : cookies || "";
  const match = cookieHeader.match(/toktickit_session=([^;]+)/);
  return match ? match[1] : "";
}
