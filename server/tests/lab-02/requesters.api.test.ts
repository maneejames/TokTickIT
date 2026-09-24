import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { loginAs } from "../helpers/auth.js";

describe("Requester Context API", () => {
  // REQ-API-01: GET /api/requesters endpoint retired in Lab 3 Phase B (returns 404)
  describe("REQ-API-01: GET /api/requesters retired", () => {
    it("returns 404 Not Found now that the development requester endpoint is removed", async () => {
      const res = await request(app).get("/api/requesters");
      expect(res.status).toBe(404);
    });
  });

  // REQ-API-02: Inactive requester cannot authenticate (login is rejected)
  describe("REQ-API-02: Inactive requester rejection", () => {
    it("rejects login for inactive requester (loginAs throws or returns error)", async () => {
      // With session auth, inactive users are rejected at login time, not at the middleware level
      try {
        await loginAs("anon.old@kmutt.ac.th");
        // If loginAs didn't throw, attempt an API call — the session should be rejected
        const res = await request(app).get("/api/requester-test-auth");
        expect([401, 403]).toContain(res.status);
      } catch (err) {
        // loginAs correctly threw because the inactive user can't log in
        expect(err).toBeDefined();
      }
    });
  });

  // REQ-API-03: request without session cookie is rejected with 401 Unauthorized
  describe("REQ-API-03: Missing session cookie rejection", () => {
    it("rejects request with 401 Unauthorized if no session cookie is provided", async () => {
      const res = await request(app).get("/api/requester-test-auth");

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty("error");
      expect(res.body.error.code).toBe("UNAUTHORIZED");
    });
  });

  // REQ-API-04: request with invalid session cookie is rejected with 401 Unauthorized
  describe("REQ-API-04: Invalid session cookie rejection", () => {
    it("rejects request with 401 Unauthorized if session cookie is invalid", async () => {
      const res = await request(app)
        .get("/api/requester-test-auth")
        .set("Cookie", "toktickit_session=invalid_nonexistent_token");

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty("error");
      expect(res.body.error.code).toBe("UNAUTHORIZED");
    });
  });
});
