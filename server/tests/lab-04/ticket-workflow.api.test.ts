import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";

function extractToken(res: request.Response): string {
  const cookies = res.headers["set-cookie"];
  const cookieHeader = Array.isArray(cookies) ? cookies.join("; ") : cookies || "";
  const match = cookieHeader.match(/toktickit_session=([^;]+)/);
  return match ? match[1] : "";
}

describe("Lab 4 - Ticket Workflow & Resolution Gate API Tests (WF-API-01..07, ADM-AUTHZ-02)", () => {
  const prisma = getPrisma();

  let requesterToken: string;
  let requesterId: number;
  let staffWitchaiToken: string;
  let staffWitchaiId: number;
  let staffKamonToken: string;
  let staffKamonId: number;
  let adminToken: string;
  let adminId: number;
  let inactiveStaffId: number;

  const createdTicketIds: number[] = [];

  async function createTestTicket(
    status:
      | "NEW"
      | "OPEN"
      | "IN_PROGRESS"
      | "WAITING_FOR_REQUESTER"
      | "RESOLVED"
      | "CLOSED"
      | "REOPENED"
      | "CANCELLED" = "NEW",
    options: {
      ownerId?: number | null;
      version?: number;
      isRequesterResolved?: boolean;
      requestedPriority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
      itPriority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
    } = {}
  ) {
    const ticketNumber = `TICK-WF-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
    const ticket = await prisma.ticket.create({
      data: {
        ticketNumber,
        requesterId,
        categoryId: 1,
        relatedSystemId: 1,
        summary: `Workflow Test Ticket (${status})`,
        description: "Test ticket description for workflow",
        requestedPriority: options.requestedPriority ?? "MEDIUM",
        itPriority: options.itPriority ?? "MEDIUM",
        currentStatus: status,
        ownerId: options.ownerId !== undefined ? options.ownerId : staffWitchaiId,
        version: options.version ?? 0,
        isRequesterResolved: options.isRequesterResolved ?? false,
      },
    });
    createdTicketIds.push(ticket.id);
    return ticket;
  }

  beforeAll(async () => {
    // 1. Authenticate Requester (Somchai)
    const reqRes = await request(app)
      .post("/api/auth/login")
      .send({ email: "somchai.jai@kmutt.ac.th", password: "Password123!" });
    requesterToken = extractToken(reqRes);
    requesterId = reqRes.body.user.id;

    // 2. Authenticate Staff Witchai
    const staff1Res = await request(app)
      .post("/api/auth/login")
      .send({ email: "staff.witchai@kmutt.ac.th", password: "Password123!" });
    staffWitchaiToken = extractToken(staff1Res);
    staffWitchaiId = staff1Res.body.user.id;

    // 3. Authenticate Staff Kamon
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

    // 5. Look up or create inactive staff user
    const inactiveStaff = await prisma.user.findFirst({
      where: { email: "staff.inactive@kmutt.ac.th" },
    });
    if (inactiveStaff) {
      inactiveStaffId = inactiveStaff.id;
    } else {
      const created = await prisma.user.create({
        data: {
          email: "staff.inactive.workflow@kmutt.ac.th",
          name: "Inactive Staff Workflow",
          passwordHash: "dummyHash",
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
      await (prisma as any).actionTaken?.deleteMany({
        where: { ticketId: { in: createdTicketIds } },
      });
      await prisma.publicComment.deleteMany({
        where: { ticketId: { in: createdTicketIds } },
      });
      await prisma.internalNote.deleteMany({
        where: { ticketId: { in: createdTicketIds } },
      });
      await prisma.attachment.deleteMany({
        where: { ticketId: { in: createdTicketIds } },
      });
      await prisma.ticket.deleteMany({
        where: { id: { in: createdTicketIds } },
      });
    }
  });

  // -------------------------------------------------------------------------
  // ADM-AUTHZ-02: Administrator on Requester-only endpoints -> 403
  // -------------------------------------------------------------------------
  describe("ADM-AUTHZ-02: Administrator forbidden on Requester-only endpoints", () => {
    it("rejects Administrator creating ticket with 403", async () => {
      const res = await request(app)
        .post("/api/tickets")
        .set("Cookie", `toktickit_session=${adminToken}`)
        .send({
          categoryId: 1,
          relatedSystemId: 1,
          summary: "Admin cannot create ticket",
          description: "Admin ticket creation attempt",
          requestedPriority: "LOW",
        });
      expect(res.status).toBe(403);
      expect(res.body.error?.code).toBe("FORBIDDEN");
    });

    it("rejects Administrator accessing My Tickets list with 403", async () => {
      const res = await request(app)
        .get("/api/tickets")
        .set("Cookie", `toktickit_session=${adminToken}`);
      expect(res.status).toBe(403);
      expect(res.body.error?.code).toBe("FORBIDDEN");
    });

    it("rejects Administrator toggling resolve-indicator with 403", async () => {
      const t = await createTestTicket("IN_PROGRESS");
      const res = await request(app)
        .patch(`/api/tickets/${t.id}/resolve-indicator`)
        .set("Cookie", `toktickit_session=${adminToken}`)
        .send({ isRequesterResolved: true });
      expect(res.status).toBe(403);
      expect(res.body.error?.code).toBe("FORBIDDEN");
    });

    it("rejects Administrator uploading ticket attachment with 403", async () => {
      const t = await createTestTicket("OPEN");
      const res = await request(app)
        .post(`/api/tickets/${t.id}/attachments`)
        .set("Cookie", `toktickit_session=${adminToken}`)
        .attach("file", Buffer.from("test file content"), "test.txt");
      expect(res.status).toBe(403);
      expect(res.body.error?.code).toBe("FORBIDDEN");
    });
  });

  // -------------------------------------------------------------------------
  // WF-API-01: Every valid transition in the matrix (all 8 statuses) -> 200, version +1
  // -------------------------------------------------------------------------
  describe("WF-API-01: Every valid transition in the matrix -> 200; version +1", () => {
    const validTransitions: Array<{
      from: "NEW" | "OPEN" | "IN_PROGRESS" | "WAITING_FOR_REQUESTER" | "RESOLVED" | "CLOSED";
      to: "OPEN" | "IN_PROGRESS" | "WAITING_FOR_REQUESTER" | "RESOLVED" | "CLOSED" | "REOPENED" | "CANCELLED";
    }> = [
      { from: "NEW", to: "OPEN" },
      { from: "NEW", to: "CANCELLED" },
      { from: "OPEN", to: "IN_PROGRESS" },
      { from: "OPEN", to: "CANCELLED" },
      { from: "IN_PROGRESS", to: "WAITING_FOR_REQUESTER" },
      { from: "IN_PROGRESS", to: "RESOLVED" },
      { from: "IN_PROGRESS", to: "CANCELLED" },
      { from: "WAITING_FOR_REQUESTER", to: "IN_PROGRESS" },
      { from: "WAITING_FOR_REQUESTER", to: "RESOLVED" },
      { from: "WAITING_FOR_REQUESTER", to: "CANCELLED" },
      { from: "RESOLVED", to: "CLOSED" },
      { from: "RESOLVED", to: "REOPENED" },
      { from: "CLOSED", to: "REOPENED" },
    ];

    for (const { from, to } of validTransitions) {
      it(`permits valid transition ${from} -> ${to} and increments version`, async () => {
        const initialVersion = 2;
        const ticket = await createTestTicket(from, { version: initialVersion });

        const res = await request(app)
          .patch(`/api/staff/tickets/${ticket.id}/status`)
          .set("Cookie", `toktickit_session=${staffWitchaiToken}`)
          .send({ status: to, expectedVersion: initialVersion });

        expect(res.status).toBe(200);
        expect(res.body.status).toBe(to);
        expect(res.body.currentStatus).toBe(to);
        expect(res.body.version).toBe(initialVersion + 1);

        const refreshed = await prisma.ticket.findUnique({
          where: { id: ticket.id },
        });
        expect(refreshed?.currentStatus).toBe(to);
        expect(refreshed?.version).toBe(initialVersion + 1);
      });
    }

    it("allows Administrator to transition ticket status per Decision D-3 / BR-17", async () => {
      const ticket = await createTestTicket("NEW", { version: 0 });

      const res = await request(app)
        .patch(`/api/staff/tickets/${ticket.id}/status`)
        .set("Cookie", `toktickit_session=${adminToken}`)
        .send({ status: "OPEN", expectedVersion: 0 });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe("OPEN");
      expect(res.body.version).toBe(1);
    });
  });

  // -------------------------------------------------------------------------
  // WF-API-02: Every invalid transition -> 400; status unchanged
  // -------------------------------------------------------------------------
  describe("WF-API-02: Every invalid transition -> 400; status unchanged", () => {
    it("rejects invalid transition NEW -> RESOLVED", async () => {
      const ticket = await createTestTicket("NEW", { version: 0 });

      const res = await request(app)
        .patch(`/api/staff/tickets/${ticket.id}/status`)
        .set("Cookie", `toktickit_session=${staffWitchaiToken}`)
        .send({ status: "RESOLVED", expectedVersion: 0 });

      expect(res.status).toBe(400);
      expect(res.body.error?.code).toBe("INVALID_STATUS_TRANSITION");

      const refreshed = await prisma.ticket.findUnique({ where: { id: ticket.id } });
      expect(refreshed?.currentStatus).toBe("NEW");
      expect(refreshed?.version).toBe(0);
    });

    it("rejects invalid transition CLOSED -> OPEN", async () => {
      const ticket = await createTestTicket("CLOSED", { version: 1 });

      const res = await request(app)
        .patch(`/api/staff/tickets/${ticket.id}/status`)
        .set("Cookie", `toktickit_session=${staffWitchaiToken}`)
        .send({ status: "OPEN", expectedVersion: 1 });

      expect(res.status).toBe(400);
      expect(res.body.error?.code).toBe("INVALID_STATUS_TRANSITION");

      const refreshed = await prisma.ticket.findUnique({ where: { id: ticket.id } });
      expect(refreshed?.currentStatus).toBe("CLOSED");
      expect(refreshed?.version).toBe(1);
    });

    it("rejects any transition from CANCELLED (terminal status)", async () => {
      const ticket = await createTestTicket("CANCELLED", { version: 3 });

      for (const target of ["NEW", "OPEN", "IN_PROGRESS", "RESOLVED", "REOPENED"] as const) {
        const res = await request(app)
          .patch(`/api/staff/tickets/${ticket.id}/status`)
          .set("Cookie", `toktickit_session=${staffWitchaiToken}`)
          .send({ status: target, expectedVersion: 3 });

        expect(res.status).toBe(400);
        expect(res.body.error?.code).toBe("INVALID_STATUS_TRANSITION");
      }

      const refreshed = await prisma.ticket.findUnique({ where: { id: ticket.id } });
      expect(refreshed?.currentStatus).toBe("CANCELLED");
      expect(refreshed?.version).toBe(3);
    });

    it("rejects transitions from REOPENED not in matrix (e.g. to NEW, OPEN, CLOSED)", async () => {
      const ticket = await createTestTicket("REOPENED", { version: 4 });

      for (const target of ["NEW", "OPEN", "CLOSED"] as const) {
        const res = await request(app)
          .patch(`/api/staff/tickets/${ticket.id}/status`)
          .set("Cookie", `toktickit_session=${staffWitchaiToken}`)
          .send({ status: target, expectedVersion: 4 });

        expect(res.status).toBe(400);
        expect(res.body.error?.code).toBe("INVALID_STATUS_TRANSITION");
      }

      const refreshed = await prisma.ticket.findUnique({ where: { id: ticket.id } });
      expect(refreshed?.currentStatus).toBe("REOPENED");
      expect(refreshed?.version).toBe(4);
    });
  });

  // -------------------------------------------------------------------------
  // WF-API-03: Requester tries to set Resolved/Closed by direct API -> 403
  // -------------------------------------------------------------------------
  describe("WF-API-03: Requester direct API status change -> 403 Forbidden", () => {
    it("returns 403 when Requester attempts to PATCH ticket status directly", async () => {
      const ticket = await createTestTicket("IN_PROGRESS", { version: 0 });

      const res = await request(app)
        .patch(`/api/staff/tickets/${ticket.id}/status`)
        .set("Cookie", `toktickit_session=${requesterToken}`)
        .send({ status: "RESOLVED", expectedVersion: 0 });

      expect(res.status).toBe(403);
      expect(res.body.error?.code).toBe("FORBIDDEN");

      const refreshed = await prisma.ticket.findUnique({ where: { id: ticket.id } });
      expect(refreshed?.currentStatus).toBe("IN_PROGRESS");
      expect(refreshed?.version).toBe(0);
    });
  });

  // -------------------------------------------------------------------------
  // WF-API-04: Requester toggles "problem appears resolved" -> 200; status and version unchanged
  // -------------------------------------------------------------------------
  describe("WF-API-04: Requester toggles problem appears resolved -> 200; status and version unchanged", () => {
    it("allows Requester to toggle resolve-indicator without altering ticket status or version", async () => {
      const ticket = await createTestTicket("IN_PROGRESS", { version: 2, isRequesterResolved: false });

      const res = await request(app)
        .patch(`/api/tickets/${ticket.id}/resolve-indicator`)
        .set("Cookie", `toktickit_session=${requesterToken}`)
        .send({ isRequesterResolved: true });

      expect(res.status).toBe(200);
      expect(res.body.isRequesterResolved).toBe(true);

      const refreshed = await prisma.ticket.findUnique({ where: { id: ticket.id } });
      expect(refreshed?.isRequesterResolved).toBe(true);
      expect(refreshed?.currentStatus).toBe("IN_PROGRESS");
      expect(refreshed?.version).toBe(2);
    });
  });

  // -------------------------------------------------------------------------
  // WF-API-05: Stale expectedVersion conflict -> 409 with current state; first change preserved
  // -------------------------------------------------------------------------
  describe("WF-API-05: Optimistic concurrency / 409 conflict handling", () => {
    it("returns 409 with current ticket state on stale status update", async () => {
      const ticket = await createTestTicket("OPEN", { version: 0, itPriority: "HIGH" });

      // First writer transitions OPEN -> IN_PROGRESS with expectedVersion 0
      const firstRes = await request(app)
        .patch(`/api/staff/tickets/${ticket.id}/status`)
        .set("Cookie", `toktickit_session=${staffWitchaiToken}`)
        .send({ status: "IN_PROGRESS", expectedVersion: 0 });
      expect(firstRes.status).toBe(200);
      expect(firstRes.body.version).toBe(1);

      // Second writer attempts transition with stale expectedVersion 0
      const secondRes = await request(app)
        .patch(`/api/staff/tickets/${ticket.id}/status`)
        .set("Cookie", `toktickit_session=${staffKamonToken}`)
        .send({ status: "CANCELLED", expectedVersion: 0 });

      expect(secondRes.status).toBe(409);
      expect(secondRes.body.error?.code).toBe("CONFLICT");
      expect(secondRes.body.error?.message).toContain("changed by someone else");
      expect(secondRes.body.current).toBeDefined();
      expect(secondRes.body.current.status).toBe("IN_PROGRESS");
      expect(secondRes.body.current.version).toBe(1);

      // Verify first writer's status is preserved
      const refreshed = await prisma.ticket.findUnique({ where: { id: ticket.id } });
      expect(refreshed?.currentStatus).toBe("IN_PROGRESS");
      expect(refreshed?.version).toBe(1);
    });

    it("returns 409 on stale owner update and preserves current owner", async () => {
      const ticket = await createTestTicket("OPEN", { version: 0, ownerId: staffWitchaiId });

      // First writer changes owner to Kamon with expectedVersion 0
      const firstRes = await request(app)
        .patch(`/api/staff/tickets/${ticket.id}/owner`)
        .set("Cookie", `toktickit_session=${staffWitchaiToken}`)
        .send({ ownerId: staffKamonId, expectedVersion: 0 });
      expect(firstRes.status).toBe(200);
      expect(firstRes.body.version).toBe(1);

      // Second writer attempts to claim with stale expectedVersion 0
      const secondRes = await request(app)
        .patch(`/api/staff/tickets/${ticket.id}/owner`)
        .set("Cookie", `toktickit_session=${adminToken}`)
        .send({ ownerId: adminId, expectedVersion: 0 });

      expect(secondRes.status).toBe(409);
      expect(secondRes.body.error?.code).toBe("CONFLICT");
      expect(secondRes.body.current?.version).toBe(1);
      expect(secondRes.body.current?.ownerId).toBe(staffKamonId);
    });

    it("returns 409 on stale priority update and preserves current priority", async () => {
      const ticket = await createTestTicket("OPEN", { version: 0, itPriority: "MEDIUM" });

      // First writer updates IT priority to URGENT with expectedVersion 0
      const firstRes = await request(app)
        .patch(`/api/staff/tickets/${ticket.id}/priority`)
        .set("Cookie", `toktickit_session=${staffWitchaiToken}`)
        .send({ itPriority: "URGENT", expectedVersion: 0 });
      expect(firstRes.status).toBe(200);
      expect(firstRes.body.version).toBe(1);

      // Second writer attempts update with stale expectedVersion 0
      const secondRes = await request(app)
        .patch(`/api/staff/tickets/${ticket.id}/priority`)
        .set("Cookie", `toktickit_session=${staffKamonToken}`)
        .send({ itPriority: "LOW", expectedVersion: 0 });

      expect(secondRes.status).toBe(409);
      expect(secondRes.body.error?.code).toBe("CONFLICT");
      expect(secondRes.body.current?.itPriority).toBe("URGENT");
      expect(secondRes.body.current?.version).toBe(1);
    });

    it("handles simultaneous Promise.all status PATCHes with same expectedVersion: [200, 409]", async () => {
      const ticket = await createTestTicket("OPEN", { version: 0 });

      const [resA, resB] = await Promise.all([
        request(app)
          .patch(`/api/staff/tickets/${ticket.id}/status`)
          .set("Cookie", `toktickit_session=${staffWitchaiToken}`)
          .send({ status: "IN_PROGRESS", expectedVersion: 0 }),
        request(app)
          .patch(`/api/staff/tickets/${ticket.id}/status`)
          .set("Cookie", `toktickit_session=${staffKamonToken}`)
          .send({ status: "CANCELLED", expectedVersion: 0 }),
      ]);

      const statuses = [resA.status, resB.status].sort((a, b) => a - b);
      expect(statuses).toEqual([200, 409]);

      const conflictRes = resA.status === 409 ? resA : resB;
      expect(conflictRes.body.error?.code).toBe("CONFLICT");
      expect(conflictRes.body.current?.version).toBe(1);
    });

    it("handles simultaneous Promise.all owner PATCHes with same expectedVersion: [200, 409]", async () => {
      const ticket = await createTestTicket("OPEN", { version: 0, ownerId: null });

      const [resA, resB] = await Promise.all([
        request(app)
          .patch(`/api/staff/tickets/${ticket.id}/owner`)
          .set("Cookie", `toktickit_session=${staffWitchaiToken}`)
          .send({ ownerId: staffWitchaiId, expectedVersion: 0 }),
        request(app)
          .patch(`/api/staff/tickets/${ticket.id}/owner`)
          .set("Cookie", `toktickit_session=${staffKamonToken}`)
          .send({ ownerId: staffKamonId, expectedVersion: 0 }),
      ]);

      const statuses = [resA.status, resB.status].sort((a, b) => a - b);
      expect(statuses).toEqual([200, 409]);

      const conflictRes = resA.status === 409 ? resA : resB;
      expect(conflictRes.body.error?.code).toBe("CONFLICT");
      expect(conflictRes.body.current?.version).toBe(1);
    });

    it("handles simultaneous Promise.all priority PATCHes with same expectedVersion: [200, 409]", async () => {
      const ticket = await createTestTicket("OPEN", { version: 0, itPriority: "MEDIUM" });

      const [resA, resB] = await Promise.all([
        request(app)
          .patch(`/api/staff/tickets/${ticket.id}/priority`)
          .set("Cookie", `toktickit_session=${staffWitchaiToken}`)
          .send({ itPriority: "URGENT", expectedVersion: 0 }),
        request(app)
          .patch(`/api/staff/tickets/${ticket.id}/priority`)
          .set("Cookie", `toktickit_session=${staffKamonToken}`)
          .send({ itPriority: "LOW", expectedVersion: 0 }),
      ]);

      const statuses = [resA.status, resB.status].sort((a, b) => a - b);
      expect(statuses).toEqual([200, 409]);

      const conflictRes = resA.status === 409 ? resA : resB;
      expect(conflictRes.body.error?.code).toBe("CONFLICT");
      expect(conflictRes.body.current?.version).toBe(1);
    });
  });

  // -------------------------------------------------------------------------
  // WF-API-06: Missing expectedVersion -> 400
  // -------------------------------------------------------------------------
  describe("WF-API-06: Missing expectedVersion -> 400 Validation Error", () => {
    it("rejects PATCH status without expectedVersion with 400", async () => {
      const ticket = await createTestTicket("OPEN", { version: 0 });

      const res = await request(app)
        .patch(`/api/staff/tickets/${ticket.id}/status`)
        .set("Cookie", `toktickit_session=${staffWitchaiToken}`)
        .send({ status: "IN_PROGRESS" });

      expect(res.status).toBe(400);
      expect(res.body.error?.code).toBe("VALIDATION_ERROR");
      expect(res.body.error?.message).toContain("expectedVersion");
    });

    it("rejects PATCH owner without expectedVersion with 400", async () => {
      const ticket = await createTestTicket("OPEN", { version: 0 });

      const res = await request(app)
        .patch(`/api/staff/tickets/${ticket.id}/owner`)
        .set("Cookie", `toktickit_session=${staffWitchaiToken}`)
        .send({ ownerId: staffKamonId });

      expect(res.status).toBe(400);
      expect(res.body.error?.code).toBe("VALIDATION_ERROR");
      expect(res.body.error?.message).toContain("expectedVersion");
    });

    it("rejects PATCH priority without expectedVersion with 400", async () => {
      const ticket = await createTestTicket("OPEN", { version: 0 });

      const res = await request(app)
        .patch(`/api/staff/tickets/${ticket.id}/priority`)
        .set("Cookie", `toktickit_session=${staffWitchaiToken}`)
        .send({ itPriority: "HIGH" });

      expect(res.status).toBe(400);
      expect(res.body.error?.code).toBe("VALIDATION_ERROR");
      expect(res.body.error?.message).toContain("expectedVersion");
    });
  });

  // -------------------------------------------------------------------------
  // WF-API-07: Owner must be active staff/admin; requestedPriority never changes
  // -------------------------------------------------------------------------
  describe("WF-API-07: Owner validation and requestedPriority immutability", () => {
    it("rejects assigning ticket to inactive staff member with 400", async () => {
      const ticket = await createTestTicket("OPEN", { version: 0 });

      const res = await request(app)
        .patch(`/api/staff/tickets/${ticket.id}/owner`)
        .set("Cookie", `toktickit_session=${staffWitchaiToken}`)
        .send({ ownerId: inactiveStaffId, expectedVersion: 0 });

      expect(res.status).toBe(400);
      expect(res.body.error?.code).toBe("INACTIVE_OWNER");
    });

    it("rejects assigning ticket to a Requester user with 400", async () => {
      const ticket = await createTestTicket("OPEN", { version: 0 });

      const res = await request(app)
        .patch(`/api/staff/tickets/${ticket.id}/owner`)
        .set("Cookie", `toktickit_session=${staffWitchaiToken}`)
        .send({ ownerId: requesterId, expectedVersion: 0 });

      expect(res.status).toBe(400);
      expect(res.body.error?.code).toBe("INVALID_ROLE");
    });

    it("permits assigning ticket to an active Administrator per Decision D-3", async () => {
      const ticket = await createTestTicket("OPEN", { version: 0 });

      const res = await request(app)
        .patch(`/api/staff/tickets/${ticket.id}/owner`)
        .set("Cookie", `toktickit_session=${staffWitchaiToken}`)
        .send({ ownerId: adminId, expectedVersion: 0 });

      expect(res.status).toBe(200);
      expect(res.body.ownerId).toBe(adminId);
      expect(res.body.version).toBe(1);
    });

    it("ensures requestedPriority remains unchanged when IT priority is updated", async () => {
      const ticket = await createTestTicket("OPEN", {
        version: 0,
        requestedPriority: "LOW",
        itPriority: "LOW",
      });

      const res = await request(app)
        .patch(`/api/staff/tickets/${ticket.id}/priority`)
        .set("Cookie", `toktickit_session=${staffWitchaiToken}`)
        .send({ itPriority: "URGENT", expectedVersion: 0 });

      expect(res.status).toBe(200);
      expect(res.body.itPriority).toBe("URGENT");
      expect(res.body.requestedPriority).toBe("LOW");
      expect(res.body.version).toBe(1);

      const refreshed = await prisma.ticket.findUnique({ where: { id: ticket.id } });
      expect(refreshed?.itPriority).toBe("URGENT");
      expect(refreshed?.requestedPriority).toBe("LOW");
    });
  });
});

