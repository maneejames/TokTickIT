import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";

describe("Lab 3 - Administrator User Management API Tests (ADMIN-API-01 to ADMIN-API-07)", () => {
  const prisma = getPrisma();

  let adminToken: string;
  let adminId: number;
  let staffToken: string;
  let requesterToken: string;

  // Track ephemeral users for cleanup
  const createdUserIds: number[] = [];

  beforeAll(async () => {
    // Login as Central Administrator
    const adminLogin = await request(app)
      .post("/api/auth/login")
      .send({ email: "admin@kmutt.ac.th", password: "Password123!" });
    adminToken = extractToken(adminLogin);
    adminId = adminLogin.body.user.id;

    // Login as IT Staff
    const staffLogin = await request(app)
      .post("/api/auth/login")
      .send({ email: "staff.witchai@kmutt.ac.th", password: "Password123!" });
    staffToken = extractToken(staffLogin);

    // Login as Requester
    const reqLogin = await request(app)
      .post("/api/auth/login")
      .send({ email: "somchai.jai@kmutt.ac.th", password: "Password123!" });
    requesterToken = extractToken(reqLogin);
  });

  afterAll(async () => {
    // Delete any ephemeral users created during tests
    for (const id of createdUserIds) {
      try {
        await prisma.user.delete({ where: { id } });
      } catch (_e) {
        // ignore if already deleted
      }
    }
  });

  // =========================================================================
  // ADMIN-API-01: List Users with Search and Role Filter (AC-24)
  // =========================================================================
  describe("ADMIN-API-01: GET /api/admin/users - List Users with Search and Role Filter (AC-24)", () => {
    it("returns 200 OK with full user list ordered by id ASC and without password hashes", async () => {
      const res = await request(app)
        .get("/api/admin/users")
        .set("Cookie", `toktickit_session=${adminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);

      // Verify structure of user items
      const firstUser = res.body[0];
      expect(firstUser).toHaveProperty("id");
      expect(firstUser).toHaveProperty("name");
      expect(firstUser).toHaveProperty("email");
      expect(firstUser).toHaveProperty("role");
      expect(firstUser).toHaveProperty("isActive");
      expect(firstUser).toHaveProperty("mustChangePassword");
      expect(firstUser).toHaveProperty("createdAt");
      expect(firstUser.passwordHash).toBeUndefined();
      expect(firstUser.password).toBeUndefined();

      // Verify ordering by id ASC
      for (let i = 1; i < res.body.length; i++) {
        expect(res.body[i].id).toBeGreaterThan(res.body[i - 1].id);
      }
    });

    it("filters users by search query matching name (case-insensitive)", async () => {
      const res = await request(app)
        .get("/api/admin/users?search=witchai")
        .set("Cookie", `toktickit_session=${adminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
      for (const u of res.body) {
        const matches =
          u.name.toLowerCase().includes("witchai") ||
          u.email.toLowerCase().includes("witchai");
        expect(matches).toBe(true);
      }
    });

    it("filters users by search query matching email (case-insensitive)", async () => {
      const res = await request(app)
        .get("/api/admin/users?search=somchai.jai")
        .set("Cookie", `toktickit_session=${adminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(1);
      expect(res.body[0].email).toBe("somchai.jai@kmutt.ac.th");
    });

    it("filters users by role (REQUESTER)", async () => {
      const res = await request(app)
        .get("/api/admin/users?role=REQUESTER")
        .set("Cookie", `toktickit_session=${adminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
      for (const u of res.body) {
        expect(u.role).toBe("REQUESTER");
      }
    });

    it("filters users by role (IT_STAFF)", async () => {
      const res = await request(app)
        .get("/api/admin/users?role=IT_STAFF")
        .set("Cookie", `toktickit_session=${adminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
      for (const u of res.body) {
        expect(u.role).toBe("IT_STAFF");
      }
    });

    it("filters users by role (ADMINISTRATOR)", async () => {
      const res = await request(app)
        .get("/api/admin/users?role=ADMINISTRATOR")
        .set("Cookie", `toktickit_session=${adminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
      for (const u of res.body) {
        expect(u.role).toBe("ADMINISTRATOR");
      }
    });

    it("combines search and role filters", async () => {
      const res = await request(app)
        .get("/api/admin/users?search=kmutt.ac.th&role=ADMINISTRATOR")
        .set("Cookie", `toktickit_session=${adminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      for (const u of res.body) {
        expect(u.role).toBe("ADMINISTRATOR");
        expect(
          u.name.toLowerCase().includes("kmutt.ac.th") ||
          u.email.toLowerCase().includes("kmutt.ac.th")
        ).toBe(true);
      }
    });

    it("returns empty array when search matches nothing", async () => {
      const res = await request(app)
        .get("/api/admin/users?search=nonexistent_xyz_query_12345")
        .set("Cookie", `toktickit_session=${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });
  });

  // =========================================================================
  // ADMIN-API-02: Create User with Initial Password (AC-25)
  // =========================================================================
  describe("ADMIN-API-02: POST /api/admin/users - Create User with Initial Password (AC-25)", () => {
    it("creates a new user, hashes password, sets mustChangePassword=true, and returns 201 Created", async () => {
      const testEmail = `test.created.${Date.now()}@kmutt.ac.th`;
      const res = await request(app)
        .post("/api/admin/users")
        .set("Cookie", `toktickit_session=${adminToken}`)
        .send({
          name: "New Admin Created User",
          email: testEmail,
          role: "IT_STAFF",
          isActive: true,
          initialPassword: "InitialPassword123!",
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty("id");
      expect(res.body.name).toBe("New Admin Created User");
      expect(res.body.email).toBe(testEmail);
      expect(res.body.role).toBe("IT_STAFF");
      expect(res.body.isActive).toBe(true);
      expect(res.body.mustChangePassword).toBe(true);
      expect(res.body.passwordHash).toBeUndefined();
      expect(res.body.initialPassword).toBeUndefined();

      createdUserIds.push(res.body.id);

      // Verify the user can log in with initial password and is flagged mustChangePassword=true
      const loginRes = await request(app)
        .post("/api/auth/login")
        .send({ email: testEmail, password: "InitialPassword123!" });
      expect(loginRes.status).toBe(200);
      expect(loginRes.body.user.mustChangePassword).toBe(true);
    });

    it("creates an inactive user when isActive=false", async () => {
      const testEmail = `test.inactive.${Date.now()}@kmutt.ac.th`;
      const res = await request(app)
        .post("/api/admin/users")
        .set("Cookie", `toktickit_session=${adminToken}`)
        .send({
          name: "Inactive User Test",
          email: testEmail,
          role: "REQUESTER",
          isActive: false,
          initialPassword: "InitialPassword123!",
        });

      expect(res.status).toBe(201);
      expect(res.body.isActive).toBe(false);
      createdUserIds.push(res.body.id);
    });

    it("rejects user creation with missing required fields with 400 Bad Request", async () => {
      const res = await request(app)
        .post("/api/admin/users")
        .set("Cookie", `toktickit_session=${adminToken}`)
        .send({
          name: "",
          email: "",
          role: "IT_STAFF",
          initialPassword: "",
        });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("error");
    });

    it("rejects user creation with invalid role with 400 Bad Request", async () => {
      const res = await request(app)
        .post("/api/admin/users")
        .set("Cookie", `toktickit_session=${adminToken}`)
        .send({
          name: "Invalid Role User",
          email: `invalid.role.${Date.now()}@kmutt.ac.th`,
          role: "SUPER_ADMIN",
          isActive: true,
          initialPassword: "InitialPassword123!",
        });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("error");
    });

    it("rejects user creation when initial password fails complexity rules with 400 Bad Request", async () => {
      const res = await request(app)
        .post("/api/admin/users")
        .set("Cookie", `toktickit_session=${adminToken}`)
        .send({
          name: "Weak Password User",
          email: `weak.pwd.${Date.now()}@kmutt.ac.th`,
          role: "REQUESTER",
          isActive: true,
          initialPassword: "weak", // < 8 chars, no uppercase, digits, or specials
        });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("error");
    });
  });

  // =========================================================================
  // ADMIN-API-03: Duplicate Email Rejection (AC-26, BR-21)
  // =========================================================================
  describe("ADMIN-API-03: POST /api/admin/users - Duplicate Email Rejection (AC-26, BR-21)", () => {
    it("rejects user creation when email already exists in database with 409 Conflict", async () => {
      const res = await request(app)
        .post("/api/admin/users")
        .set("Cookie", `toktickit_session=${adminToken}`)
        .send({
          name: "Duplicate Email Test",
          email: "somchai.jai@kmutt.ac.th", // Existing user
          role: "REQUESTER",
          isActive: true,
          initialPassword: "InitialPassword123!",
        });

      expect(res.status).toBe(409);
      expect(res.body).toHaveProperty("error");
    });
  });

  // =========================================================================
  // ADMIN-API-04: Edit User Details and Role (AC-27)
  // =========================================================================
  describe("ADMIN-API-04: PATCH /api/admin/users/:id - Edit User Details and Role (AC-27)", () => {
    let editableUserId: number;
    let initialEmail: string;

    beforeAll(async () => {
      initialEmail = `edit.user.${Date.now()}@kmutt.ac.th`;
      const created = await request(app)
        .post("/api/admin/users")
        .set("Cookie", `toktickit_session=${adminToken}`)
        .send({
          name: "Editable User",
          email: initialEmail,
          role: "REQUESTER",
          isActive: true,
          initialPassword: "Password123!",
        });
      editableUserId = created.body.id;
      createdUserIds.push(editableUserId);
    });

    it("updates name, email, role, and active status and returns 200 OK", async () => {
      const updatedEmail = `updated.${Date.now()}@kmutt.ac.th`;
      const res = await request(app)
        .patch(`/api/admin/users/${editableUserId}`)
        .set("Cookie", `toktickit_session=${adminToken}`)
        .send({
          name: "Editable User (Updated)",
          email: updatedEmail,
          role: "IT_STAFF",
          isActive: false,
        });

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(editableUserId);
      expect(res.body.name).toBe("Editable User (Updated)");
      expect(res.body.email).toBe(updatedEmail);
      expect(res.body.role).toBe("IT_STAFF");
      expect(res.body.isActive).toBe(false);
      expect(res.body.passwordHash).toBeUndefined();
    });

    it("rejects email modification if new email conflicts with another user with 409 Conflict", async () => {
      const res = await request(app)
        .patch(`/api/admin/users/${editableUserId}`)
        .set("Cookie", `toktickit_session=${adminToken}`)
        .send({
          email: "admin@kmutt.ac.th", // Conflict
        });

      expect(res.status).toBe(409);
      expect(res.body).toHaveProperty("error");
    });

    it("allows updating without changing email (same email submission)", async () => {
      const currentRes = await request(app)
        .get("/api/admin/users?search=Editable User")
        .set("Cookie", `toktickit_session=${adminToken}`);

      const user = currentRes.body.find((u: any) => u.id === editableUserId);
      expect(user).toBeDefined();

      const res = await request(app)
        .patch(`/api/admin/users/${editableUserId}`)
        .set("Cookie", `toktickit_session=${adminToken}`)
        .send({
          name: "Same Email Test",
          email: user.email,
        });

      expect(res.status).toBe(200);
      expect(res.body.name).toBe("Same Email Test");
    });

    it("rejects editing a non-existent user with 404 Not Found", async () => {
      const res = await request(app)
        .patch("/api/admin/users/999999")
        .set("Cookie", `toktickit_session=${adminToken}`)
        .send({ name: "Ghost User" });

      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty("error");
    });
  });

  // =========================================================================
  // ADMIN-API-05: Self-Deactivation Prevention (AC-28, BR-22)
  // =========================================================================
  describe("ADMIN-API-05: PATCH /api/admin/users/:id - Self-Deactivation Prevention (AC-28, BR-22)", () => {
    it("rejects administrator attempting to deactivate own account with 400 Bad Request", async () => {
      const res = await request(app)
        .patch(`/api/admin/users/${adminId}`)
        .set("Cookie", `toktickit_session=${adminToken}`)
        .send({
          isActive: false,
        });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("error");
      expect(res.body.error.message).toMatch(/cannot deactivate own account/i);
    });

    it("allows administrator to edit own name without deactivating", async () => {
      const res = await request(app)
        .patch(`/api/admin/users/${adminId}`)
        .set("Cookie", `toktickit_session=${adminToken}`)
        .send({
          name: "Central Administrator",
          isActive: true,
        });

      expect(res.status).toBe(200);
      expect(res.body.name).toBe("Central Administrator");
      expect(res.body.isActive).toBe(true);
    });
  });

  // =========================================================================
  // ADMIN-API-06: Last Active Administrator Guard (AC-29, BR-23)
  // =========================================================================
  describe("ADMIN-API-06: PATCH /api/admin/users/:id - Last Active Administrator Guard (AC-29, BR-23)", () => {
    let secondAdminId: number;

    beforeAll(async () => {
      // Create a second administrator for testing
      const res = await request(app)
        .post("/api/admin/users")
        .set("Cookie", `toktickit_session=${adminToken}`)
        .send({
          name: "Second Admin",
          email: `second.admin.${Date.now()}@kmutt.ac.th`,
          role: "ADMINISTRATOR",
          isActive: true,
          initialPassword: "Password123!",
        });
      secondAdminId = res.body.id;
      createdUserIds.push(secondAdminId);
    });

    it("allows deactivating second administrator when more than one active admin exists", async () => {
      const res = await request(app)
        .patch(`/api/admin/users/${secondAdminId}`)
        .set("Cookie", `toktickit_session=${adminToken}`)
        .send({
          isActive: false,
        });

      expect(res.status).toBe(200);
      expect(res.body.isActive).toBe(false);
    });

    it("rejects demoting or deactivating the sole remaining active administrator with 400 Bad Request", async () => {
      // At this point secondAdmin is inactive, so central admin (adminId) is the ONLY active admin.
      // Attempting to demote adminId's role from ADMINISTRATOR to IT_STAFF:
      const resDemote = await request(app)
        .patch(`/api/admin/users/${adminId}`)
        .set("Cookie", `toktickit_session=${adminToken}`)
        .send({
          role: "IT_STAFF",
        });

      expect(resDemote.status).toBe(400);
      expect(resDemote.body).toHaveProperty("error");
      expect(resDemote.body.error.message).toMatch(/last active administrator/i);
    });
  });

  // =========================================================================
  // ADMIN-API-07: Set New Initial Password (AC-30)
  // =========================================================================
  describe("ADMIN-API-07: POST /api/admin/users/:id/reset-password - Set New Initial Password (AC-30)", () => {
    let targetUserId: number;
    let targetEmail: string;

    beforeAll(async () => {
      targetEmail = `reset.pwd.user.${Date.now()}@kmutt.ac.th`;
      const res = await request(app)
        .post("/api/admin/users")
        .set("Cookie", `toktickit_session=${adminToken}`)
        .send({
          name: "Reset Password Target",
          email: targetEmail,
          role: "REQUESTER",
          isActive: true,
          initialPassword: "InitialPassword123!",
        });
      targetUserId = res.body.id;
      createdUserIds.push(targetUserId);

      // Log in and change password to clear mustChangePassword
      const login = await request(app)
        .post("/api/auth/login")
        .send({ email: targetEmail, password: "InitialPassword123!" });
      const targetToken = extractToken(login);

      await request(app)
        .post("/api/auth/change-password")
        .set("Cookie", `toktickit_session=${targetToken}`)
        .send({
          currentPassword: "InitialPassword123!",
          newPassword: "CustomPassword456!",
        });
    });

    it("resets initial password, sets mustChangePassword=true, and returns 200 OK", async () => {
      const res = await request(app)
        .post(`/api/admin/users/${targetUserId}/reset-password`)
        .set("Cookie", `toktickit_session=${adminToken}`)
        .send({
          newInitialPassword: "NewTempPassword789!",
        });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("message");

      // Verify the user can log in with new temp password and has mustChangePassword=true
      const loginRes = await request(app)
        .post("/api/auth/login")
        .send({ email: targetEmail, password: "NewTempPassword789!" });

      expect(loginRes.status).toBe(200);
      expect(loginRes.body.user.mustChangePassword).toBe(true);
    });

    it("rejects password reset if new password fails complexity with 400 Bad Request", async () => {
      const res = await request(app)
        .post(`/api/admin/users/${targetUserId}/reset-password`)
        .set("Cookie", `toktickit_session=${adminToken}`)
        .send({
          newInitialPassword: "simple",
        });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("error");
    });

    it("rejects password reset on non-existent user with 404 Not Found", async () => {
      const res = await request(app)
        .post("/api/admin/users/999999/reset-password")
        .set("Cookie", `toktickit_session=${adminToken}`)
        .send({
          newInitialPassword: "ValidNewPassword123!",
        });

      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty("error");
    });
  });

  // =========================================================================
  // Non-Administrator Rejection (403 Forbidden) and Unauthenticated (401) (AC-31)
  // =========================================================================
  describe("AC-31: Role-Based Access Control on Admin Endpoints", () => {
    it("rejects unauthenticated requests with 401 Unauthorized", async () => {
      const getRes = await request(app).get("/api/admin/users");
      expect(getRes.status).toBe(401);

      const postRes = await request(app).post("/api/admin/users").send({});
      expect(postRes.status).toBe(401);

      const patchRes = await request(app).patch("/api/admin/users/1").send({});
      expect(patchRes.status).toBe(401);

      const resetRes = await request(app).post("/api/admin/users/1/reset-password").send({});
      expect(resetRes.status).toBe(401);
    });

    it("rejects Requester requests with 403 Forbidden on all admin endpoints", async () => {
      const getRes = await request(app)
        .get("/api/admin/users")
        .set("Cookie", `toktickit_session=${requesterToken}`);
      expect(getRes.status).toBe(403);

      const postRes = await request(app)
        .post("/api/admin/users")
        .set("Cookie", `toktickit_session=${requesterToken}`)
        .send({ name: "Hacker", email: "hack@kmutt.ac.th", role: "ADMINISTRATOR", initialPassword: "Password123!" });
      expect(postRes.status).toBe(403);

      const patchRes = await request(app)
        .patch("/api/admin/users/1")
        .set("Cookie", `toktickit_session=${requesterToken}`)
        .send({ name: "Changed" });
      expect(patchRes.status).toBe(403);

      const resetRes = await request(app)
        .post("/api/admin/users/1/reset-password")
        .set("Cookie", `toktickit_session=${requesterToken}`)
        .send({ newInitialPassword: "Password123!" });
      expect(resetRes.status).toBe(403);
    });

    it("rejects IT Staff requests with 403 Forbidden on all admin endpoints", async () => {
      const getRes = await request(app)
        .get("/api/admin/users")
        .set("Cookie", `toktickit_session=${staffToken}`);
      expect(getRes.status).toBe(403);

      const postRes = await request(app)
        .post("/api/admin/users")
        .set("Cookie", `toktickit_session=${staffToken}`)
        .send({ name: "Hacker", email: "hack@kmutt.ac.th", role: "ADMINISTRATOR", initialPassword: "Password123!" });
      expect(postRes.status).toBe(403);

      const patchRes = await request(app)
        .patch("/api/admin/users/1")
        .set("Cookie", `toktickit_session=${staffToken}`)
        .send({ name: "Changed" });
      expect(patchRes.status).toBe(403);

      const resetRes = await request(app)
        .post("/api/admin/users/1/reset-password")
        .set("Cookie", `toktickit_session=${staffToken}`)
        .send({ newInitialPassword: "Password123!" });
      expect(resetRes.status).toBe(403);
    });
  });
});

/**
 * Helper to extract session token from Set-Cookie header
 */
function extractToken(res: request.Response): string {
  const cookies = res.headers["set-cookie"];
  const cookieHeader = Array.isArray(cookies) ? cookies.join("; ") : cookies || "";
  const match = cookieHeader.match(/toktickit_session=([^;]+)/);
  return match ? match[1] : "";
}
