import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";

describe("Lab 3 - Public Comments & Internal Notes API Integration Tests", () => {
  const prisma = getPrisma();

  let requesterToken: string;
  let requester2Token: string;
  let itStaffToken: string;
  let adminToken: string;

  let requesterId: number;
  let requester2Id: number;
  let itStaffId: number;
  let adminId: number;

  let testTicketId: number;

  beforeAll(async () => {
    // Login as requester 1 (Somchai)
    const req1 = await request(app)
      .post("/api/auth/login")
      .send({ email: "somchai.jai@kmutt.ac.th", password: "Password123!" });
    requesterToken = extractToken(req1);
    requesterId = req1.body.user.id;

    // Login as requester 2 (Suda)
    const req2 = await request(app)
      .post("/api/auth/login")
      .send({ email: "suda.rak@kmutt.ac.th", password: "Password123!" });
    requester2Token = extractToken(req2);
    requester2Id = req2.body.user.id;

    // Login as IT Staff (Witchai)
    const staff = await request(app)
      .post("/api/auth/login")
      .send({ email: "staff.witchai@kmutt.ac.th", password: "Password123!" });
    itStaffToken = extractToken(staff);
    itStaffId = staff.body.user.id;

    // Login as Administrator
    const admin = await request(app)
      .post("/api/auth/login")
      .send({ email: "admin@kmutt.ac.th", password: "Password123!" });
    adminToken = extractToken(admin);
    adminId = admin.body.user.id;

    // Create a test ticket owned by requester 1
    const ticketRes = await request(app)
      .post("/api/tickets")
      .set("Cookie", `toktickit_session=${requesterToken}`)
      .send({
        categoryId: 1,
        relatedSystemId: 1,
        summary: "Comments and notes test ticket",
        description: "Testing public comments and internal notes flow",
        requestedPriority: "MEDIUM",
      });
    testTicketId = ticketRes.body.id;
  });

  afterAll(async () => {
    if (testTicketId) {
      await prisma.publicComment.deleteMany({ where: { ticketId: testTicketId } });
      await prisma.internalNote.deleteMany({ where: { ticketId: testTicketId } });
      await prisma.ticket.deleteMany({ where: { id: testTicketId } });
    }
  });

  // COMMS-API-01: Post and retrieve Public Comments
  describe("COMMS-API-01: Public Comments", () => {
    it("owner Requester can post a public comment (201 Created)", async () => {
      const res = await request(app)
        .post(`/api/tickets/${testTicketId}/comments`)
        .set("Cookie", `toktickit_session=${requesterToken}`)
        .send({ content: "Requester update: Issue still happening after restart." });

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({
        ticketId: testTicketId,
        authorId: requesterId,
        authorRole: "REQUESTER",
        content: "Requester update: Issue still happening after restart.",
      });
      expect(res.body.authorName).toBeDefined();
      expect(res.body.createdAt).toBeDefined();
    });

    it("IT Staff can post a public comment on any ticket (201 Created)", async () => {
      const res = await request(app)
        .post(`/api/tickets/${testTicketId}/comments`)
        .set("Cookie", `toktickit_session=${itStaffToken}`)
        .send({ content: "IT Staff response: We are checking the switch port." });

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({
        ticketId: testTicketId,
        authorId: itStaffId,
        authorRole: "IT_STAFF",
        content: "IT Staff response: We are checking the switch port.",
      });
    });

    it("Requester and IT Staff can retrieve public comments (200 OK, chronological)", async () => {
      const res = await request(app)
        .get(`/api/tickets/${testTicketId}/comments`)
        .set("Cookie", `toktickit_session=${requesterToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(2);
      expect(res.body[0].content).toContain("Requester update");
      expect(res.body[1].content).toContain("IT Staff response");

      // Staff retrieval
      const staffRes = await request(app)
        .get(`/api/tickets/${testTicketId}/comments`)
        .set("Cookie", `toktickit_session=${itStaffToken}`);
      expect(staffRes.status).toBe(200);
      expect(staffRes.body.length).toBe(res.body.length);
    });

    it("non-owner Requester cannot read or post public comments (404 Not Found)", async () => {
      const postRes = await request(app)
        .post(`/api/tickets/${testTicketId}/comments`)
        .set("Cookie", `toktickit_session=${requester2Token}`)
        .send({ content: "Intruder comment" });
      expect(postRes.status).toBe(404);

      const getRes = await request(app)
        .get(`/api/tickets/${testTicketId}/comments`)
        .set("Cookie", `toktickit_session=${requester2Token}`);
      expect(getRes.status).toBe(404);
    });
  });

  // COMMS-API-02: Post and retrieve Internal Notes + Admin boundary (AC-33)
  describe("COMMS-API-02: Internal Notes & Admin Boundary (AC-20, AC-21, AC-33)", () => {
    it("IT Staff can post and retrieve internal notes (201 Created & 200 OK)", async () => {
      const postRes = await request(app)
        .post(`/api/tickets/${testTicketId}/notes`)
        .set("Cookie", `toktickit_session=${itStaffToken}`)
        .send({ content: "Internal IT note: Checked VLAN configuration." });

      expect(postRes.status).toBe(201);
      expect(postRes.body).toMatchObject({
        ticketId: testTicketId,
        authorId: itStaffId,
        content: "Internal IT note: Checked VLAN configuration.",
      });

      const getRes = await request(app)
        .get(`/api/tickets/${testTicketId}/notes`)
        .set("Cookie", `toktickit_session=${itStaffToken}`);

      expect(getRes.status).toBe(200);
      expect(Array.isArray(getRes.body)).toBe(true);
      expect(getRes.body.some((n: any) => n.content.includes("VLAN configuration"))).toBe(true);
    });

    it("Requester is strictly forbidden from posting or reading internal notes (403 Forbidden)", async () => {
      const postRes = await request(app)
        .post(`/api/tickets/${testTicketId}/notes`)
        .set("Cookie", `toktickit_session=${requesterToken}`)
        .send({ content: "Requester snooping" });
      expect(postRes.status).toBe(403);
      expect(postRes.body.error.code).toBe("FORBIDDEN");

      const getRes = await request(app)
        .get(`/api/tickets/${testTicketId}/notes`)
        .set("Cookie", `toktickit_session=${requesterToken}`);
      expect(getRes.status).toBe(403);
      expect(getRes.body.error.code).toBe("FORBIDDEN");
    });

    it("Administrator is strictly forbidden from posting or reading internal notes (403 Forbidden, AC-33)", async () => {
      const postRes = await request(app)
        .post(`/api/tickets/${testTicketId}/notes`)
        .set("Cookie", `toktickit_session=${adminToken}`)
        .send({ content: "Admin posting note" });
      expect(postRes.status).toBe(403);
      expect(postRes.body.error.code).toBe("FORBIDDEN");

      const getRes = await request(app)
        .get(`/api/tickets/${testTicketId}/notes`)
        .set("Cookie", `toktickit_session=${adminToken}`);
      expect(getRes.status).toBe(403);
      expect(getRes.body.error.code).toBe("FORBIDDEN");
    });

    it("Administrator is strictly forbidden from posting or reading public comments (403 Forbidden, AC-33)", async () => {
      const postRes = await request(app)
        .post(`/api/tickets/${testTicketId}/comments`)
        .set("Cookie", `toktickit_session=${adminToken}`)
        .send({ content: "Admin posting comment" });
      expect(postRes.status).toBe(403);

      const getRes = await request(app)
        .get(`/api/tickets/${testTicketId}/comments`)
        .set("Cookie", `toktickit_session=${adminToken}`);
      expect(getRes.status).toBe(403);
    });
  });

  // COMMS-API-03: Empty/whitespace comment/note rejection
  describe("COMMS-API-03: Content Validation (AC-22)", () => {
    it("rejects empty or whitespace-only public comment (400 Bad Request)", async () => {
      const emptyRes = await request(app)
        .post(`/api/tickets/${testTicketId}/comments`)
        .set("Cookie", `toktickit_session=${requesterToken}`)
        .send({ content: "   " });
      expect(emptyRes.status).toBe(400);
      expect(emptyRes.body.error.code).toBe("VALIDATION_ERROR");

      const missingRes = await request(app)
        .post(`/api/tickets/${testTicketId}/comments`)
        .set("Cookie", `toktickit_session=${requesterToken}`)
        .send({});
      expect(missingRes.status).toBe(400);
    });

    it("rejects public comment exceeding 2000 characters (400 Bad Request)", async () => {
      const longRes = await request(app)
        .post(`/api/tickets/${testTicketId}/comments`)
        .set("Cookie", `toktickit_session=${requesterToken}`)
        .send({ content: "a".repeat(2001) });
      expect(longRes.status).toBe(400);
      expect(longRes.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("rejects empty or whitespace-only internal note (400 Bad Request)", async () => {
      const emptyRes = await request(app)
        .post(`/api/tickets/${testTicketId}/notes`)
        .set("Cookie", `toktickit_session=${itStaffToken}`)
        .send({ content: "   \n\t " });
      expect(emptyRes.status).toBe(400);
      expect(emptyRes.body.error.code).toBe("VALIDATION_ERROR");
    });
  });

  // COMMS-API-04: Requester "Problem Appears Resolved" toggle
  describe("COMMS-API-04: Problem Appears Resolved Indicator (AC-23, BR-05)", () => {
    it("owner Requester can toggle isRequesterResolved to true without modifying formal status (200 OK)", async () => {
      const initialTicket = await prisma.ticket.findUnique({ where: { id: testTicketId } });
      const initialStatus = initialTicket!.currentStatus;

      const res = await request(app)
        .patch(`/api/tickets/${testTicketId}/resolve-indicator`)
        .set("Cookie", `toktickit_session=${requesterToken}`)
        .send({ isRequesterResolved: true });

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        id: testTicketId,
        isRequesterResolved: true,
        currentStatus: initialStatus,
      });

      // Verify in database
      const updatedTicket = await prisma.ticket.findUnique({ where: { id: testTicketId } });
      expect(updatedTicket!.isRequesterResolved).toBe(true);
      expect(updatedTicket!.currentStatus).toBe(initialStatus);
    });

    it("owner Requester can toggle isRequesterResolved back to false (200 OK)", async () => {
      const res = await request(app)
        .patch(`/api/tickets/${testTicketId}/resolve-indicator`)
        .set("Cookie", `toktickit_session=${requesterToken}`)
        .send({ isRequesterResolved: false });

      expect(res.status).toBe(200);
      expect(res.body.isRequesterResolved).toBe(false);

      const updatedTicket = await prisma.ticket.findUnique({ where: { id: testTicketId } });
      expect(updatedTicket!.isRequesterResolved).toBe(false);
    });

    it("rejects non-boolean isRequesterResolved value (400 Bad Request)", async () => {
      const res = await request(app)
        .patch(`/api/tickets/${testTicketId}/resolve-indicator`)
        .set("Cookie", `toktickit_session=${requesterToken}`)
        .send({ isRequesterResolved: "yes" });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("IT Staff and Administrator cannot update resolve-indicator (403 Forbidden)", async () => {
      const staffRes = await request(app)
        .patch(`/api/tickets/${testTicketId}/resolve-indicator`)
        .set("Cookie", `toktickit_session=${itStaffToken}`)
        .send({ isRequesterResolved: true });
      expect(staffRes.status).toBe(403);

      const adminRes = await request(app)
        .patch(`/api/tickets/${testTicketId}/resolve-indicator`)
        .set("Cookie", `toktickit_session=${adminToken}`)
        .send({ isRequesterResolved: true });
      expect(adminRes.status).toBe(403);
    });

    it("non-owner Requester receives 404 Not Found", async () => {
      const res = await request(app)
        .patch(`/api/tickets/${testTicketId}/resolve-indicator`)
        .set("Cookie", `toktickit_session=${requester2Token}`)
        .send({ isRequesterResolved: true });
      expect(res.status).toBe(404);
    });
  });
});

function extractToken(res: request.Response): string {
  const cookies = res.headers["set-cookie"];
  const cookieHeader = Array.isArray(cookies) ? cookies.join("; ") : cookies || "";
  const match = cookieHeader.match(/toktickit_session=([^;]+)/);
  return match ? match[1] : "";
}
