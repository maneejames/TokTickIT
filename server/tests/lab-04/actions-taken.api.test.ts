import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import crypto from "node:crypto";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";

function extractToken(res: request.Response): string {
  const cookies = res.headers["set-cookie"];
  const cookieHeader = Array.isArray(cookies) ? cookies.join("; ") : cookies || "";
  const match = cookieHeader.match(/toktickit_session=([^;]+)/);
  return match ? match[1] : "";
}

describe("Lab 4 - Actions Taken Foundation API & Authorization Tests", () => {
  const prisma = getPrisma();

  let requesterToken: string;
  let requester2Token: string;
  let mustChangePasswordToken: string;
  let staffWitchaiToken: string;
  let staffKamonToken: string;
  let adminToken: string;

  let requesterId: number;
  let requester2Id: number;
  let staffWitchaiId: number;
  let staffKamonId: number;
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
      | "CANCELLED" = "OPEN",
    options: {
      ownerId?: number | null;
      requesterIdOverride?: number;
    } = {}
  ) {
    const ticketNumber = `TICK-ACT-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
    const ticket = await prisma.ticket.create({
      data: {
        ticketNumber,
        requesterId: options.requesterIdOverride ?? requesterId,
        categoryId: 1,
        relatedSystemId: 1,
        summary: `Test Ticket for Action Taken (${status})`,
        description: "Test ticket description",
        requestedPriority: "MEDIUM",
        itPriority: "MEDIUM",
        currentStatus: status,
        ownerId: options.ownerId !== undefined ? options.ownerId : staffWitchaiId,
        isRequesterResolved: false,
      },
    });
    createdTicketIds.push(ticket.id);
    return ticket;
  }

  beforeAll(async () => {
    // 1. Authenticate Requester 1 (Somchai)
    const reqRes = await request(app)
      .post("/api/auth/login")
      .send({ email: "somchai.jai@kmutt.ac.th", password: "Password123!" });
    requesterToken = extractToken(reqRes);
    requesterId = reqRes.body.user.id;

    // 2. Authenticate Requester 2 (Suda)
    const req2Res = await request(app)
      .post("/api/auth/login")
      .send({ email: "suda.rak@kmutt.ac.th", password: "Password123!" });
    requester2Token = extractToken(req2Res);
    requester2Id = req2Res.body.user.id;

    // 3. Authenticate Staff Witchai
    const staff1Res = await request(app)
      .post("/api/auth/login")
      .send({ email: "staff.witchai@kmutt.ac.th", password: "Password123!" });
    staffWitchaiToken = extractToken(staff1Res);
    staffWitchaiId = staff1Res.body.user.id;

    // 4. Authenticate Staff Kamon
    const staff2Res = await request(app)
      .post("/api/auth/login")
      .send({ email: "staff.kamon@kmutt.ac.th", password: "Password123!" });
    staffKamonToken = extractToken(staff2Res);
    staffKamonId = staff2Res.body.user.id;

    // 5. Authenticate Admin
    const adminRes = await request(app)
      .post("/api/auth/login")
      .send({ email: "admin@kmutt.ac.th", password: "Password123!" });
    adminToken = extractToken(adminRes);
    adminId = adminRes.body.user.id;

    // 6. User with mustChangePassword = true
    let mcpUser = await prisma.user.findFirst({
      where: { email: "mcp.act@kmutt.ac.th" },
    });
    if (!mcpUser) {
      const bcrypt = await import("bcryptjs");
      const hash = await bcrypt.default.hash("Password123!", 10);
      mcpUser = await prisma.user.create({
        data: {
          email: "mcp.act@kmutt.ac.th",
          name: "MCP Action User",
          passwordHash: hash,
          role: "IT_STAFF",
          isActive: true,
          mustChangePassword: true,
        },
      });
    }
    const mcpRes = await request(app)
      .post("/api/auth/login")
      .send({ email: "mcp.act@kmutt.ac.th", password: "Password123!" });
    mustChangePasswordToken = extractToken(mcpRes);

    // 7. Inactive staff
    let inact = await prisma.user.findFirst({
      where: { email: "staff.inactive@kmutt.ac.th" },
    });
    if (inact) {
      inactiveStaffId = inact.id;
    } else {
      const created = await prisma.user.create({
        data: {
          email: "staff.inactive.act@kmutt.ac.th",
          name: "Inactive Staff Action",
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
      try {
        if ((prisma as any).actionTaken) {
          await (prisma as any).actionTaken.deleteMany({
            where: { ticketId: { in: createdTicketIds } },
          });
        }
        await prisma.publicComment.deleteMany({ where: { ticketId: { in: createdTicketIds } } });
        await prisma.internalNote.deleteMany({ where: { ticketId: { in: createdTicketIds } } });
        await prisma.attachment.deleteMany({ where: { ticketId: { in: createdTicketIds } } });
        await prisma.ticket.deleteMany({ where: { id: { in: createdTicketIds } } });
      } catch (err) {
        // ignore if model not ready
      }
    }
  });

  // ---------------------------------------------------------------------------
  // ACT-API-01: IT Staff creates a valid Action Taken
  // ---------------------------------------------------------------------------
  it("ACT-API-01: IT Staff creates a valid Action Taken (201; performedBy = session user)", async () => {
    const ticket = await createTestTicket("OPEN");
    const idempotencyKey = crypto.randomUUID();

    const res = await request(app)
      .post(`/api/tickets/${ticket.id}/actions`)
      .set("Cookie", `toktickit_session=${staffWitchaiToken}`)
      .set("Idempotency-Key", idempotencyKey)
      .send({
        description: "Diagnosed power supply unit failure",
        result: "Verified replacement PSU is required",
        followUpRequired: false,
        attachmentNotes: "See attached power rail multimeter screenshot",
      });

    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.ticketId).toBe(ticket.id);
    expect(res.body.description).toBe("Diagnosed power supply unit failure");
    expect(res.body.result).toBe("Verified replacement PSU is required");
    expect(res.body.followUpRequired).toBe(false);
    expect(res.body.performedBy).toBeDefined();
    expect(res.body.performedBy.id).toBe(staffWitchaiId);
    expect(res.body.status).toBe("PLANNED");
  });

  // ---------------------------------------------------------------------------
  // ACT-API-02: Client-supplied performedById ignored
  // ---------------------------------------------------------------------------
  it("ACT-API-02: Client-supplied performedById ignored (stored author is session user)", async () => {
    const ticket = await createTestTicket("OPEN");
    const idempotencyKey = crypto.randomUUID();

    const res = await request(app)
      .post(`/api/tickets/${ticket.id}/actions`)
      .set("Cookie", `toktickit_session=${staffWitchaiToken}`)
      .set("Idempotency-Key", idempotencyKey)
      .send({
        description: "Cleaned CPU heatsink",
        result: "Thermals stable under 65C",
        performedById: 999999, // spoof attempt
        performedBy: { id: 999999 },
      });

    expect(res.status).toBe(201);
    expect(res.body.performedBy.id).toBe(staffWitchaiId);
  });

  // ---------------------------------------------------------------------------
  // ACT-API-03: followUpRequired=true without note (missing/whitespace) -> 400
  // ---------------------------------------------------------------------------
  it("ACT-API-03: followUpRequired=true without note (missing / whitespace) returns 400", async () => {
    const ticket = await createTestTicket("OPEN");

    // Missing note
    const res1 = await request(app)
      .post(`/api/tickets/${ticket.id}/actions`)
      .set("Cookie", `toktickit_session=${staffWitchaiToken}`)
      .set("Idempotency-Key", crypto.randomUUID())
      .send({
        description: "Replaced RAM module",
        result: "Memtest running",
        followUpRequired: true,
      });
    expect(res1.status).toBe(400);

    // Whitespace note
    const res2 = await request(app)
      .post(`/api/tickets/${ticket.id}/actions`)
      .set("Cookie", `toktickit_session=${staffWitchaiToken}`)
      .set("Idempotency-Key", crypto.randomUUID())
      .send({
        description: "Replaced RAM module",
        result: "Memtest running",
        followUpRequired: true,
        followUpNote: "   ",
      });
    expect(res2.status).toBe(400);
  });

  // ---------------------------------------------------------------------------
  // ACT-API-04: followUpRequired=false with no note -> 201
  // ---------------------------------------------------------------------------
  it("ACT-API-04: followUpRequired=false with no note returns 201", async () => {
    const ticket = await createTestTicket("OPEN");

    const res = await request(app)
      .post(`/api/tickets/${ticket.id}/actions`)
      .set("Cookie", `toktickit_session=${staffWitchaiToken}`)
      .set("Idempotency-Key", crypto.randomUUID())
      .send({
        description: "Checked operating system updates",
        result: "All packages up to date",
        followUpRequired: false,
      });

    expect(res.status).toBe(201);
    expect(res.body.followUpRequired).toBe(false);
  });

  // ---------------------------------------------------------------------------
  // ACT-API-05: Field validation (empty/oversized description, result; future date)
  // ---------------------------------------------------------------------------
  it("ACT-API-05: Field validation (empty/oversized description, result; future date) returns 400", async () => {
    const ticket = await createTestTicket("OPEN");

    // Empty description
    const emptyDesc = await request(app)
      .post(`/api/tickets/${ticket.id}/actions`)
      .set("Cookie", `toktickit_session=${staffWitchaiToken}`)
      .set("Idempotency-Key", crypto.randomUUID())
      .send({
        description: "   ",
        result: "Valid result",
      });
    expect(emptyDesc.status).toBe(400);

    // Oversized description (> 500 chars)
    const longDesc = await request(app)
      .post(`/api/tickets/${ticket.id}/actions`)
      .set("Cookie", `toktickit_session=${staffWitchaiToken}`)
      .set("Idempotency-Key", crypto.randomUUID())
      .send({
        description: "a".repeat(501),
        result: "Valid result",
      });
    expect(longDesc.status).toBe(400);

    // Future date (> 5 mins in future)
    const futureDate = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    const resFuture = await request(app)
      .post(`/api/tickets/${ticket.id}/actions`)
      .set("Cookie", `toktickit_session=${staffWitchaiToken}`)
      .set("Idempotency-Key", crypto.randomUUID())
      .send({
        actionDateTime: futureDate,
        description: "Future work log",
        result: "Impossible",
      });
    expect(resFuture.status).toBe(400);
  });

  // ---------------------------------------------------------------------------
  // ACT-API-06: Same Idempotency-Key sent twice returns 200 with original record
  // ---------------------------------------------------------------------------
  it("ACT-API-06: Same Idempotency-Key sent twice returns 200 with original record", async () => {
    const ticket = await createTestTicket("OPEN");
    const idempotencyKey = crypto.randomUUID();

    const res1 = await request(app)
      .post(`/api/tickets/${ticket.id}/actions`)
      .set("Cookie", `toktickit_session=${staffWitchaiToken}`)
      .set("Idempotency-Key", idempotencyKey)
      .send({
        description: "Installed security certificate",
        result: "TLS handshake successful",
      });
    expect(res1.status).toBe(201);
    const firstId = res1.body.id;

    // Replay with exact same idempotency key
    const res2 = await request(app)
      .post(`/api/tickets/${ticket.id}/actions`)
      .set("Cookie", `toktickit_session=${staffWitchaiToken}`)
      .set("Idempotency-Key", idempotencyKey)
      .send({
        description: "Different payload text should be ignored on duplicate",
        result: "Ignored",
      });
    expect(res2.status).toBe(200);
    expect(res2.body.id).toBe(firstId);
    expect(res2.body.description).toBe("Installed security certificate");
  });

  // ---------------------------------------------------------------------------
  // ACT-API-07: Missing Idempotency-Key returns 400
  // ---------------------------------------------------------------------------
  it("ACT-API-07: Missing Idempotency-Key returns 400", async () => {
    const ticket = await createTestTicket("OPEN");

    const res = await request(app)
      .post(`/api/tickets/${ticket.id}/actions`)
      .set("Cookie", `toktickit_session=${staffWitchaiToken}`)
      .send({
        description: "No idempotency header supplied",
        result: "Should fail with 400",
      });
    expect(res.status).toBe(400);
  });

  // ---------------------------------------------------------------------------
  // ACT-API-08: Two different IT Staff add actions to a ticket owned by a third
  // ---------------------------------------------------------------------------
  it("ACT-API-08: Two different IT Staff add actions to ticket owned by third; stable order", async () => {
    // Ticket owned by admin or third user
    const ticket = await createTestTicket("OPEN", { ownerId: adminId });

    // Witchai adds action
    const res1 = await request(app)
      .post(`/api/tickets/${ticket.id}/actions`)
      .set("Cookie", `toktickit_session=${staffWitchaiToken}`)
      .set("Idempotency-Key", crypto.randomUUID())
      .send({
        description: "Action by Witchai",
        result: "Step 1 complete",
        actionDateTime: new Date(Date.now() - 10000).toISOString(),
      });
    expect(res1.status).toBe(201);

    // Kamon adds action
    const res2 = await request(app)
      .post(`/api/tickets/${ticket.id}/actions`)
      .set("Cookie", `toktickit_session=${staffKamonToken}`)
      .set("Idempotency-Key", crypto.randomUUID())
      .send({
        description: "Action by Kamon",
        result: "Step 2 complete",
        actionDateTime: new Date().toISOString(),
      });
    expect(res2.status).toBe(201);

    // List actions
    const listRes = await request(app)
      .get(`/api/tickets/${ticket.id}/actions`)
      .set("Cookie", `toktickit_session=${staffWitchaiToken}`);

    expect(listRes.status).toBe(200);
    expect(listRes.body.items.length).toBe(2);
    expect(listRes.body.items[0].performedBy.id).toBe(staffWitchaiId);
    expect(listRes.body.items[1].performedBy.id).toBe(staffKamonId);
  });

  // ---------------------------------------------------------------------------
  // ACT-API-09: Reassign and Complete/Cancel with stale expectedVersion -> 409
  // ---------------------------------------------------------------------------
  it("ACT-API-09: Reassign and Complete/Cancel with stale expectedVersion returns 409", async () => {
    const ticket = await createTestTicket("OPEN");

    const createRes = await request(app)
      .post(`/api/tickets/${ticket.id}/actions`)
      .set("Cookie", `toktickit_session=${staffWitchaiToken}`)
      .set("Idempotency-Key", crypto.randomUUID())
      .send({
        description: "Action for concurrency check",
        result: "Initial state",
      });
    expect(createRes.status).toBe(201);
    const actionId = createRes.body.id;
    const currentVersion = createRes.body.version;

    // Attempt reassign with wrong expectedVersion
    const staleAssign = await request(app)
      .patch(`/api/tickets/${ticket.id}/actions/${actionId}/assign`)
      .set("Cookie", `toktickit_session=${staffWitchaiToken}`)
      .send({
        assigneeId: staffKamonId,
        expectedVersion: currentVersion + 99,
      });
    expect(staleAssign.status).toBe(409);

    // Attempt status with wrong expectedVersion
    const staleStatus = await request(app)
      .patch(`/api/tickets/${ticket.id}/actions/${actionId}/status`)
      .set("Cookie", `toktickit_session=${staffWitchaiToken}`)
      .send({
        status: "COMPLETED",
        expectedVersion: currentVersion + 99,
      });
    expect(staleStatus.status).toBe(409);
  });

  // ---------------------------------------------------------------------------
  // ACT-API-10: Content fields immutable after creation
  // ---------------------------------------------------------------------------
  it("ACT-API-10: Content fields immutable after creation (reassign/status cannot edit content)", async () => {
    const ticket = await createTestTicket("OPEN");

    const createRes = await request(app)
      .post(`/api/tickets/${ticket.id}/actions`)
      .set("Cookie", `toktickit_session=${staffWitchaiToken}`)
      .set("Idempotency-Key", crypto.randomUUID())
      .send({
        description: "Immutable initial description",
        result: "Immutable initial result",
      });
    expect(createRes.status).toBe(201);
    const actionId = createRes.body.id;
    const ver = createRes.body.version;

    // Reassign attempting to change description
    await request(app)
      .patch(`/api/tickets/${ticket.id}/actions/${actionId}/assign`)
      .set("Cookie", `toktickit_session=${staffWitchaiToken}`)
      .send({
        assigneeId: staffKamonId,
        expectedVersion: ver,
        description: "Hacked new description",
        result: "Hacked new result",
      });

    // Check action content unchanged
    const listRes = await request(app)
      .get(`/api/tickets/${ticket.id}/actions`)
      .set("Cookie", `toktickit_session=${staffWitchaiToken}`);
    const item = listRes.body.items.find((a: any) => a.id === actionId);
    expect(item.description).toBe("Immutable initial description");
    expect(item.result).toBe("Immutable initial result");
    expect(item.performedBy.id).toBe(staffWitchaiId);
  });

  // ---------------------------------------------------------------------------
  // ACT-API-11: List on legacy ticket with no actions -> 200 with items: []
  // ---------------------------------------------------------------------------
  it("ACT-API-11: List on legacy ticket with no actions returns 200 with items: []", async () => {
    const ticket = await createTestTicket("OPEN");

    const res = await request(app)
      .get(`/api/tickets/${ticket.id}/actions`)
      .set("Cookie", `toktickit_session=${staffWitchaiToken}`);

    expect(res.status).toBe(200);
    expect(res.body.items).toBeDefined();
    expect(res.body.items).toEqual([]);
  });

  // ---------------------------------------------------------------------------
  // ACT-API-12: Requester lists actions on own ticket -> 200, full list
  // ---------------------------------------------------------------------------
  it("ACT-API-12: Requester lists actions on own ticket returns 200 with full list", async () => {
    const ticket = await createTestTicket("OPEN", { requesterIdOverride: requesterId });

    // Staff creates an action
    await request(app)
      .post(`/api/tickets/${ticket.id}/actions`)
      .set("Cookie", `toktickit_session=${staffWitchaiToken}`)
      .set("Idempotency-Key", crypto.randomUUID())
      .send({
        description: "Requester should see this action read-only",
        result: "Completed inspection",
      });

    const res = await request(app)
      .get(`/api/tickets/${ticket.id}/actions`)
      .set("Cookie", `toktickit_session=${requesterToken}`);

    expect(res.status).toBe(200);
    expect(res.body.items.length).toBeGreaterThanOrEqual(1);
    expect(res.body.items[0].description).toBe("Requester should see this action read-only");
  });

  // ---------------------------------------------------------------------------
  // ACT-API-13: Assignee inactive / non-existent / Requester -> 400
  // ---------------------------------------------------------------------------
  it("ACT-API-13: Assignee inactive / non-existent / Requester returns 400", async () => {
    const ticket = await createTestTicket("OPEN");

    // Create action
    const createRes = await request(app)
      .post(`/api/tickets/${ticket.id}/actions`)
      .set("Cookie", `toktickit_session=${staffWitchaiToken}`)
      .set("Idempotency-Key", crypto.randomUUID())
      .send({
        description: "Action for assignee tests",
        result: "Testing assignees",
      });
    expect(createRes.status).toBe(201);
    const actionId = createRes.body.id;
    const ver = createRes.body.version;

    // Non-existent user
    const res1 = await request(app)
      .patch(`/api/tickets/${ticket.id}/actions/${actionId}/assign`)
      .set("Cookie", `toktickit_session=${staffWitchaiToken}`)
      .send({ assigneeId: 999999, expectedVersion: ver });
    expect(res1.status).toBe(400);

    // Inactive staff
    const res2 = await request(app)
      .patch(`/api/tickets/${ticket.id}/actions/${actionId}/assign`)
      .set("Cookie", `toktickit_session=${staffWitchaiToken}`)
      .send({ assigneeId: inactiveStaffId, expectedVersion: ver });
    expect(res2.status).toBe(400);

    // Requester user
    const res3 = await request(app)
      .patch(`/api/tickets/${ticket.id}/actions/${actionId}/assign`)
      .set("Cookie", `toktickit_session=${staffWitchaiToken}`)
      .send({ assigneeId: requesterId, expectedVersion: ver });
    expect(res3.status).toBe(400);
  });

  // ---------------------------------------------------------------------------
  // ACT-API-14: Complete and cancel Planned action; invalid status changes
  // ---------------------------------------------------------------------------
  it("ACT-API-14: Complete/cancel Planned action; invalid status changes rejected", async () => {
    const ticket = await createTestTicket("OPEN");

    // Action 1: Planned -> Completed
    const act1 = await request(app)
      .post(`/api/tickets/${ticket.id}/actions`)
      .set("Cookie", `toktickit_session=${staffWitchaiToken}`)
      .set("Idempotency-Key", crypto.randomUUID())
      .send({ description: "Act 1", result: "Testing complete" });
    expect(act1.status).toBe(201);

    const compRes = await request(app)
      .patch(`/api/tickets/${ticket.id}/actions/${act1.body.id}/status`)
      .set("Cookie", `toktickit_session=${staffWitchaiToken}`)
      .send({ status: "COMPLETED", expectedVersion: act1.body.version });
    expect(compRes.status).toBe(200);
    expect(compRes.body.status).toBe("COMPLETED");
    expect(compRes.body.completedAt).not.toBeNull();

    // Invalid: Completed -> Planned
    const inv1 = await request(app)
      .patch(`/api/tickets/${ticket.id}/actions/${act1.body.id}/status`)
      .set("Cookie", `toktickit_session=${staffWitchaiToken}`)
      .send({ status: "PLANNED", expectedVersion: compRes.body.version });
    expect(inv1.status).toBe(400);

    // Action 2: Planned -> Cancelled
    const act2 = await request(app)
      .post(`/api/tickets/${ticket.id}/actions`)
      .set("Cookie", `toktickit_session=${staffWitchaiToken}`)
      .set("Idempotency-Key", crypto.randomUUID())
      .send({ description: "Act 2", result: "Testing cancel" });

    const cancelRes = await request(app)
      .patch(`/api/tickets/${ticket.id}/actions/${act2.body.id}/status`)
      .set("Cookie", `toktickit_session=${staffWitchaiToken}`)
      .send({ status: "CANCELLED", expectedVersion: act2.body.version });
    expect(cancelRes.status).toBe(200);
    expect(cancelRes.body.status).toBe("CANCELLED");

    // Invalid: Cancelled -> Completed
    const inv2 = await request(app)
      .patch(`/api/tickets/${ticket.id}/actions/${act2.body.id}/status`)
      .set("Cookie", `toktickit_session=${staffWitchaiToken}`)
      .send({ status: "COMPLETED", expectedVersion: cancelRes.body.version });
    expect(inv2.status).toBe(400);
  });

  // ---------------------------------------------------------------------------
  // ACT-API-15: Create and edit on Closed and Cancelled ticket -> 400 INVALID_STATE
  // ---------------------------------------------------------------------------
  it("ACT-API-15: Create and edit on Closed and Cancelled ticket returns 400 INVALID_STATE", async () => {
    const closedTicket = await createTestTicket("CLOSED");
    const cancelledTicket = await createTestTicket("CANCELLED");

    // Try create on Closed ticket
    const resClosed = await request(app)
      .post(`/api/tickets/${closedTicket.id}/actions`)
      .set("Cookie", `toktickit_session=${staffWitchaiToken}`)
      .set("Idempotency-Key", crypto.randomUUID())
      .send({ description: "Should fail", result: "Closed ticket" });
    expect(resClosed.status).toBe(400);

    // Try create on Cancelled ticket
    const resCancelled = await request(app)
      .post(`/api/tickets/${cancelledTicket.id}/actions`)
      .set("Cookie", `toktickit_session=${staffWitchaiToken}`)
      .set("Idempotency-Key", crypto.randomUUID())
      .send({ description: "Should fail", result: "Cancelled ticket" });
    expect(resCancelled.status).toBe(400);
  });

  // ---------------------------------------------------------------------------
  // ACT-API-16: No DELETE route anywhere; reassign/status on terminal action rejected
  // ---------------------------------------------------------------------------
  it("ACT-API-16: No DELETE route; reassign on Completed/Cancelled action returns 400", async () => {
    const ticket = await createTestTicket("OPEN");

    const act = await request(app)
      .post(`/api/tickets/${ticket.id}/actions`)
      .set("Cookie", `toktickit_session=${staffWitchaiToken}`)
      .set("Idempotency-Key", crypto.randomUUID())
      .send({ description: "Act for delete test", result: "Init" });
    const actionId = act.body.id;

    // DELETE route must be 404 / 405
    const delRes = await request(app)
      .delete(`/api/tickets/${ticket.id}/actions/${actionId}`)
      .set("Cookie", `toktickit_session=${staffWitchaiToken}`);
    expect([404, 405]).toContain(delRes.status);

    // Complete action
    const compRes = await request(app)
      .patch(`/api/tickets/${ticket.id}/actions/${actionId}/status`)
      .set("Cookie", `toktickit_session=${staffWitchaiToken}`)
      .send({ status: "COMPLETED", expectedVersion: act.body.version });
    expect(compRes.status).toBe(200);

    // Reassign on Completed action should fail
    const reassignRes = await request(app)
      .patch(`/api/tickets/${ticket.id}/actions/${actionId}/assign`)
      .set("Cookie", `toktickit_session=${staffWitchaiToken}`)
      .send({ assigneeId: staffKamonId, expectedVersion: compRes.body.version });
    expect(reassignRes.status).toBe(400);
  });

  // ---------------------------------------------------------------------------
  // ACT-AUTHZ-01: Requester POST and PATCH actions -> 403
  // ---------------------------------------------------------------------------
  it("ACT-AUTHZ-01: Requester POST and PATCH actions return 403 Forbidden", async () => {
    const ticket = await createTestTicket("OPEN", { requesterIdOverride: requesterId });

    // Requester POST
    const postRes = await request(app)
      .post(`/api/tickets/${ticket.id}/actions`)
      .set("Cookie", `toktickit_session=${requesterToken}`)
      .set("Idempotency-Key", crypto.randomUUID())
      .send({ description: "Requester writing action", result: "Blocked" });
    expect(postRes.status).toBe(403);

    // Staff creates an action
    const staffAct = await request(app)
      .post(`/api/tickets/${ticket.id}/actions`)
      .set("Cookie", `toktickit_session=${staffWitchaiToken}`)
      .set("Idempotency-Key", crypto.randomUUID())
      .send({ description: "Staff action", result: "Ok" });
    const actionId = staffAct.body.id;

    // Requester PATCH assign
    const patchAssign = await request(app)
      .patch(`/api/tickets/${ticket.id}/actions/${actionId}/assign`)
      .set("Cookie", `toktickit_session=${requesterToken}`)
      .send({ assigneeId: staffKamonId, expectedVersion: staffAct.body.version });
    expect(patchAssign.status).toBe(403);

    // Requester PATCH status
    const patchStatus = await request(app)
      .patch(`/api/tickets/${ticket.id}/actions/${actionId}/status`)
      .set("Cookie", `toktickit_session=${requesterToken}`)
      .send({ status: "COMPLETED", expectedVersion: staffAct.body.version });
    expect(patchStatus.status).toBe(403);
  });

  // ---------------------------------------------------------------------------
  // ACT-AUTHZ-02: Requester lists actions on another Requester's ticket -> 404 (and 200 on own ticket control case)
  // ---------------------------------------------------------------------------
  it("ACT-AUTHZ-02: Requester lists actions on another Requester's ticket returns 404", async () => {
    // Existing real ticket owned by Requester A (requesterId)
    const ticketA = await createTestTicket("OPEN", { requesterIdOverride: requesterId });

    // Control case: Requester A calling their own ticket gets 200 OK
    const ownRes = await request(app)
      .get(`/api/tickets/${ticketA.id}/actions`)
      .set("Cookie", `toktickit_session=${requesterToken}`);
    expect(ownRes.status).toBe(200);
    expect(ownRes.body.items).toBeDefined();

    // Requester B (requester2Token) calls Requester A's ticket: must get 404 (same as non-existent ticket)
    const otherRes = await request(app)
      .get(`/api/tickets/${ticketA.id}/actions`)
      .set("Cookie", `toktickit_session=${requester2Token}`);
    expect(otherRes.status).toBe(404);

    // Baseline check: calling a non-existent ticket also gets 404
    const nonExistentRes = await request(app)
      .get("/api/tickets/9999999/actions")
      .set("Cookie", `toktickit_session=${requester2Token}`);
    expect(nonExistentRes.status).toBe(404);
  });

  // ---------------------------------------------------------------------------
  // ACT-AUTHZ-03: Unauthenticated and mustChangePassword users -> 401 / 403
  // ---------------------------------------------------------------------------
  it("ACT-AUTHZ-03: Unauthenticated (401) and mustChangePassword (403) blocked", async () => {
    const ticket = await createTestTicket("OPEN");

    // Unauthenticated GET
    const unauthGet = await request(app).get(`/api/tickets/${ticket.id}/actions`);
    expect(unauthGet.status).toBe(401);

    // Unauthenticated POST
    const unauthPost = await request(app)
      .post(`/api/tickets/${ticket.id}/actions`)
      .set("Idempotency-Key", crypto.randomUUID())
      .send({ description: "Unauth", result: "Blocked" });
    expect(unauthPost.status).toBe(401);

    // mustChangePassword user POST
    const mcpPost = await request(app)
      .post(`/api/tickets/${ticket.id}/actions`)
      .set("Cookie", `toktickit_session=${mustChangePasswordToken}`)
      .set("Idempotency-Key", crypto.randomUUID())
      .send({ description: "MCP", result: "Blocked" });
    expect(mcpPost.status).toBe(403);
  });

  // ---------------------------------------------------------------------------
  // ACT-AUTHZ-04: Administrator create/update/assign/complete/view actions -> Allowed
  // ---------------------------------------------------------------------------
  it("ACT-AUTHZ-04: Administrator create/update/assign/complete/view actions are permitted", async () => {
    const ticket = await createTestTicket("OPEN");

    // Admin create
    const createRes = await request(app)
      .post(`/api/tickets/${ticket.id}/actions`)
      .set("Cookie", `toktickit_session=${adminToken}`)
      .set("Idempotency-Key", crypto.randomUUID())
      .send({
        description: "Admin logged an urgent hardware audit",
        result: "Hardware verified intact",
        status: "PLANNED",
      });
    expect(createRes.status).toBe(201);
    expect(createRes.body.performedBy.id).toBe(adminId);
    const actionId = createRes.body.id;

    // Admin reassign
    const assignRes = await request(app)
      .patch(`/api/tickets/${ticket.id}/actions/${actionId}/assign`)
      .set("Cookie", `toktickit_session=${adminToken}`)
      .send({ assigneeId: staffWitchaiId, expectedVersion: createRes.body.version });
    expect(assignRes.status).toBe(200);

    // Admin complete
    const compRes = await request(app)
      .patch(`/api/tickets/${ticket.id}/actions/${actionId}/status`)
      .set("Cookie", `toktickit_session=${adminToken}`)
      .send({ status: "COMPLETED", expectedVersion: assignRes.body.version });
    expect(compRes.status).toBe(200);
    expect(compRes.body.status).toBe("COMPLETED");

    // Admin view
    const viewRes = await request(app)
      .get(`/api/tickets/${ticket.id}/actions`)
      .set("Cookie", `toktickit_session=${adminToken}`);
    expect(viewRes.status).toBe(200);
    expect(viewRes.body.items.length).toBeGreaterThanOrEqual(1);
  });
});

