import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";

describe("Requester Context API", () => {
  // REQ-API-01: GET /api/requesters returns only active requesters
  describe("REQ-API-01: GET /api/requesters", () => {
    it("returns 200 OK and only active requesters (inactive excluded)", async () => {
      const res = await request(app).get("/api/requesters");
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(4);

      // Verify all returned requesters are active
      for (const requester of res.body) {
        expect(requester).toHaveProperty("id");
        expect(requester).toHaveProperty("name");
        expect(requester).toHaveProperty("email");
        expect(requester).toHaveProperty("department");
        expect(requester.isActive).toBe(true);
      }

      // Verify inactive requester is excluded
      const emails = res.body.map((r: { email: string }) => r.email);
      expect(emails).not.toContain("anon.old@kmutt.ac.th");
    });
  });

  // REQ-API-02: request with inactive X-Requester-Id is rejected with 403 Forbidden
  describe("REQ-API-02: Inactive requester rejection", () => {
    it("rejects request with 403 Forbidden if requester exists but is inactive", async () => {
      const { getPrisma } = await import("../../src/prisma.js");
      const inactiveUser = await getPrisma().requesterUser.findUnique({
        where: { email: "anon.old@kmutt.ac.th" },
      });

      expect(inactiveUser).not.toBeNull();
      expect(inactiveUser?.isActive).toBe(false);

      const res = await request(app)
        .get("/api/requester-test-auth")
        .set("X-Requester-Id", String(inactiveUser?.id));

      expect(res.status).toBe(403);
      expect(res.body).toHaveProperty("error");
      expect(res.body.error.code).toBe("FORBIDDEN");
    });
  });

  // REQ-API-03: request without X-Requester-Id header is rejected with 401 Unauthorized
  describe("REQ-API-03: Missing requester header rejection", () => {
    it("rejects request with 401 Unauthorized if X-Requester-Id header is missing", async () => {
      const res = await request(app).get("/api/requester-test-auth");

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty("error");
      expect(res.body.error.code).toBe("UNAUTHORIZED");
    });
  });

  // REQ-API-04: request with nonexistent X-Requester-Id is rejected with 404 Not Found
  describe("REQ-API-04: Nonexistent requester ID rejection", () => {
    it("rejects request with 404 Not Found if requester ID does not exist", async () => {
      const nonexistentId = 999999;
      const res = await request(app)
        .get("/api/requester-test-auth")
        .set("X-Requester-Id", String(nonexistentId));

      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty("error");
      expect(res.body.error.code).toBe("NOT_FOUND");
    });
  });
});
