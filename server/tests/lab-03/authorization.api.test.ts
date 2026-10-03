import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";

describe("Lab 3 - Authorization Layer Tests", () => {
  const prisma = getPrisma();

  // Test user session tokens
  let requesterToken: string;
  let requester2Token: string;
  let itStaffToken: string;
  let adminToken: string;

  // Test user IDs
  let requesterId: number;
  let requester2Id: number;
  let itStaffId: number;
  let adminId: number;

  // Test ticket IDs
  let requesterTicketId: number;
  let requester2TicketId: number;

  beforeAll(async () => {
    // Login as requester (Somchai)
    const req1 = await request(app)
      .post("/api/auth/login")
      .send({ email: "somchai.jai@kmutt.ac.th", password: "Password123!" });
    requesterToken = extractToken(req1);
    requesterId = req1.body.user.id;

    // Login as second requester (Suda)
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

    // Create test tickets for ownership tests
    const ticket1 = await request(app)
      .post("/api/tickets")
      .set("Cookie", `toktickit_session=${requesterToken}`)
      .send({
        categoryId: 1,
        relatedSystemId: 1,
        summary: "Requester 1 test ticket",
        description: "Test ticket for authorization tests",
        requestedPriority: "MEDIUM",
      });
    requesterTicketId = ticket1.body.id;

    const ticket2 = await request(app)
      .post("/api/tickets")
      .set("Cookie", `toktickit_session=${requester2Token}`)
      .send({
        categoryId: 1,
        relatedSystemId: 1,
        summary: "Requester 2 test ticket",
        description: "Test ticket for authorization tests",
        requestedPriority: "MEDIUM",
      });
    requester2TicketId = ticket2.body.id;
  });

  afterAll(async () => {
    // Clean up test tickets
    await prisma.ticket.deleteMany({
      where: {
        id: { in: [requesterTicketId, requester2TicketId] },
      },
    });
  });

  // =========================================================================
  // Unauthenticated Access Tests (401)
  // =========================================================================

  describe("Unauthenticated Access (401)", () => {
    it("AUTH-01: POST /api/tickets returns 401 when unauthenticated", async () => {
      const res = await request(app)
        .post("/api/tickets")
        .send({
          categoryId: 1,
          relatedSystemId: 1,
          summary: "Unauthorized ticket",
          description: "Should fail without authentication",
        });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe("UNAUTHORIZED");
    });

    it("AUTH-02: GET /api/tickets returns 401 when unauthenticated", async () => {
      const res = await request(app).get("/api/tickets");

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe("UNAUTHORIZED");
    });

    it("AUTH-03: GET /api/tickets/:id returns 401 when unauthenticated", async () => {
      const res = await request(app).get(`/api/tickets/${requesterTicketId}`);

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe("UNAUTHORIZED");
    });

    it("AUTH-04: POST /api/tickets/:id/attachments returns 401 when unauthenticated", async () => {
      const res = await request(app)
        .post(`/api/tickets/${requesterTicketId}/attachments`)
        .attach("file", Buffer.from("test"), "test.jpg");

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe("UNAUTHORIZED");
    });

    it("AUTH-05: GET /api/tickets/:id/attachments/:attachmentId/download returns 401 when unauthenticated", async () => {
      const res = await request(app).get(`/api/tickets/${requesterTicketId}/attachments/1/download`);

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe("UNAUTHORIZED");
    });

    it("AUTH-06: PATCH /api/tickets/:id/attachments/:attachmentId/remove returns 401 when unauthenticated", async () => {
      const res = await request(app).patch(`/api/tickets/${requesterTicketId}/attachments/1/remove`);

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe("UNAUTHORIZED");
    });

    it("AUTH-07: POST /api/auth/logout returns 401 when unauthenticated", async () => {
      const res = await request(app).post("/api/auth/logout");

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe("UNAUTHORIZED");
    });

    it("AUTH-08: GET /api/auth/me returns 401 when unauthenticated", async () => {
      const res = await request(app).get("/api/auth/me");

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe("UNAUTHORIZED");
    });

    it("AUTH-09: POST /api/auth/change-password returns 401 when unauthenticated", async () => {
      const res = await request(app)
        .post("/api/auth/change-password")
        .send({
          currentPassword: "old",
          newPassword: "NewPassword123!",
          confirmPassword: "NewPassword123!",
        });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe("UNAUTHORIZED");
    });
  });

  // =========================================================================
  // Wrong Role Tests (403)
  // =========================================================================

  describe("Wrong Role Access (403)", () => {


    describe("IT Staff attempting Requester-only operations", () => {
      it("AUTH-20: IT Staff cannot POST /api/tickets (create ticket)", async () => {
        const res = await request(app)
          .post("/api/tickets")
          .set("Cookie", `toktickit_session=${itStaffToken}`)
          .send({
            categoryId: 1,
            relatedSystemId: 1,
            summary: "Staff ticket attempt",
            description: "Should fail for IT Staff",
          });

        expect(res.status).toBe(403);
        expect(res.body.error.code).toBe("FORBIDDEN");
      });

      it("AUTH-21: IT Staff cannot access GET /api/tickets (my tickets list)", async () => {
        const res = await request(app)
          .get("/api/tickets")
          .set("Cookie", `toktickit_session=${itStaffToken}`);

        expect(res.status).toBe(403);
        expect(res.body.error.code).toBe("FORBIDDEN");
      });

      it("AUTH-22: IT Staff cannot POST /api/tickets/:id/attachments", async () => {
        const res = await request(app)
          .post(`/api/tickets/${requesterTicketId}/attachments`)
          .set("Cookie", `toktickit_session=${itStaffToken}`)
          .attach("file", Buffer.from("test"), "test.jpg");

        expect(res.status).toBe(403);
        expect(res.body.error.code).toBe("FORBIDDEN");
      });

      it("AUTH-23: IT Staff cannot PATCH /api/tickets/:id/attachments/:attachmentId/remove", async () => {
        const res = await request(app)
          .patch(`/api/tickets/${requesterTicketId}/attachments/1/remove`)
          .set("Cookie", `toktickit_session=${itStaffToken}`);

        expect(res.status).toBe(403);
        expect(res.body.error.code).toBe("FORBIDDEN");
      });

    });


    describe("Administrator attempting Requester operations", () => {
      it("AUTH-29: Administrator cannot POST /api/tickets", async () => {
        const res = await request(app)
          .post("/api/tickets")
          .set("Cookie", `toktickit_session=${adminToken}`)
          .send({
            categoryId: 1,
            relatedSystemId: 1,
            summary: "Admin ticket attempt",
            description: "Should fail for Administrator",
          });

        expect(res.status).toBe(403);
        expect(res.body.error.code).toBe("FORBIDDEN");
      });

      it("AUTH-30: Administrator cannot access GET /api/tickets", async () => {
        const res = await request(app)
          .get("/api/tickets")
          .set("Cookie", `toktickit_session=${adminToken}`);

        expect(res.status).toBe(403);
        expect(res.body.error.code).toBe("FORBIDDEN");
      });

      it("AUTH-31: Administrator cannot access GET /api/tickets/:id", async () => {
        const res = await request(app)
          .get(`/api/tickets/${requesterTicketId}`)
          .set("Cookie", `toktickit_session=${adminToken}`);

        expect(res.status).toBe(403);
        expect(res.body.error.code).toBe("FORBIDDEN");
      });

      it("AUTH-32: Administrator cannot POST /api/tickets/:id/attachments", async () => {
        const res = await request(app)
          .post(`/api/tickets/${requesterTicketId}/attachments`)
          .set("Cookie", `toktickit_session=${adminToken}`)
          .attach("file", Buffer.from("test"), "test.jpg");

        expect(res.status).toBe(403);
        expect(res.body.error.code).toBe("FORBIDDEN");
      });

      it("AUTH-33: Administrator cannot access GET /api/tickets/:id/attachments/:attachmentId/download", async () => {
        const res = await request(app)
          .get(`/api/tickets/${requesterTicketId}/attachments/1/download`)
          .set("Cookie", `toktickit_session=${adminToken}`);

        expect(res.status).toBe(403);
        expect(res.body.error.code).toBe("FORBIDDEN");
      });

      it("AUTH-34: Administrator cannot PATCH /api/tickets/:id/attachments/:attachmentId/remove", async () => {
        const res = await request(app)
          .patch(`/api/tickets/${requesterTicketId}/attachments/1/remove`)
          .set("Cookie", `toktickit_session=${adminToken}`);

        expect(res.status).toBe(403);
        expect(res.body.error.code).toBe("FORBIDDEN");
      });





    });

  });

  // =========================================================================
  // Ownership Tests (404 for wrong owner to prevent enumeration)
  // =========================================================================

  describe("Ownership Enforcement (404 for non-owned resources)", () => {
    it("AUTH-44: Requester cannot access another requester's ticket detail", async () => {
      const res = await request(app)
        .get(`/api/tickets/${requester2TicketId}`)
        .set("Cookie", `toktickit_session=${requesterToken}`);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe("NOT_FOUND");
      expect(res.body.error.message).toBe("Ticket not found");
    });

    it("AUTH-45: Requester cannot upload attachment to another requester's ticket", async () => {
      const res = await request(app)
        .post(`/api/tickets/${requester2TicketId}/attachments`)
        .set("Cookie", `toktickit_session=${requesterToken}`)
        .attach("file", Buffer.from("test"), "test.jpg");

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe("NOT_FOUND");
      expect(res.body.error.message).toBe("Ticket not found");
    });

    it("AUTH-46: Requester cannot download attachment from another requester's ticket", async () => {
      const res = await request(app)
        .get(`/api/tickets/${requester2TicketId}/attachments/1/download`)
        .set("Cookie", `toktickit_session=${requesterToken}`);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe("NOT_FOUND");
      expect(res.body.error.message).toBe("Attachment not found");
    });

    it("AUTH-47: Requester cannot remove attachment from another requester's ticket", async () => {
      const res = await request(app)
        .patch(`/api/tickets/${requester2TicketId}/attachments/1/remove`)
        .set("Cookie", `toktickit_session=${requesterToken}`);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe("NOT_FOUND");
      expect(res.body.error.message).toBe("Attachment not found");
    });




    it("AUTH-51: GET /api/tickets only returns tickets owned by authenticated requester", async () => {
      const res = await request(app)
        .get("/api/tickets")
        .set("Cookie", `toktickit_session=${requesterToken}`);

      expect(res.status).toBe(200);
      expect(res.body.items).toBeDefined();
      
      // Verify all returned tickets belong to the authenticated requester
      const allOwnedByRequester = res.body.items.every(
        (ticket: any) => ticket.requester?.id === requesterId || ticket.requesterId === requesterId
      );
      expect(allOwnedByRequester).toBe(true);

      // Verify requester2's ticket is NOT in the list
      const hasRequester2Ticket = res.body.items.some(
        (ticket: any) => ticket.id === requester2TicketId
      );
      expect(hasRequester2Ticket).toBe(false);
    });
  });

  // =========================================================================
  // Session-Derived Identity Tests
  // =========================================================================

  describe("Session-Derived Identity (ignores client-supplied IDs)", () => {
    it("AUTH-52: POST /api/tickets creates ticket with session user, ignoring any supplied requesterId", async () => {
      const res = await request(app)
        .post("/api/tickets")
        .set("Cookie", `toktickit_session=${requesterToken}`)
        .send({
          categoryId: 1,
          relatedSystemId: 1,
          summary: "Test session-derived identity",
          description: "Should use session user, not supplied ID",
          requestedPriority: "LOW",
          requesterId: 99999, // Attempting to spoof another requester
        });

      expect(res.status).toBe(201);
      expect(res.body.requesterId).toBe(requesterId);
      expect(res.body.requesterId).not.toBe(99999);

      // Clean up
      await prisma.ticket.delete({ where: { id: res.body.id } });
    });

    it("AUTH-53: Requester with valid session but supplying another requesterId in query cannot access other's tickets", async () => {
      const res = await request(app)
        .get("/api/tickets")
        .query({ requesterId: requester2Id })
        .set("Cookie", `toktickit_session=${requesterToken}`);

      expect(res.status).toBe(200);
      
      // Verify response only contains requester1's tickets, not requester2's
      const hasRequester2Ticket = res.body.items.some(
        (ticket: any) => ticket.id === requester2TicketId
      );
      expect(hasRequester2Ticket).toBe(false);
    });
  });

  // =========================================================================
  // Positive Authorization Tests (verify correct access)
  // =========================================================================

  describe("Positive Authorization (correct role and ownership)", () => {
    it("AUTH-54: Requester can access own ticket detail", async () => {
      const res = await request(app)
        .get(`/api/tickets/${requesterTicketId}`)
        .set("Cookie", `toktickit_session=${requesterToken}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(requesterTicketId);
    });

    it("AUTH-55: IT Staff can access any ticket detail", async () => {
      const res = await request(app)
        .get(`/api/tickets/${requesterTicketId}`)
        .set("Cookie", `toktickit_session=${itStaffToken}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(requesterTicketId);
    });


  });
});

/**
 * Helper function to extract session token from login response
 */
function extractToken(res: request.Response): string {
  const cookies = res.headers["set-cookie"];
  const cookieHeader = Array.isArray(cookies) ? cookies.join("; ") : cookies || "";
  const match = cookieHeader.match(/toktickit_session=([^;]+)/);
  return match ? match[1] : "";
}
