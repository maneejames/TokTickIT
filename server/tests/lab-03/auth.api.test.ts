import { describe, it, expect, afterAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";

describe("Lab 3 - Auth API Integration Tests", () => {
  const prisma = getPrisma();

  // Track all ephemeral user IDs created during tests so they are
  // always cleaned up — even if a test assertion fails mid-run.
  const ephemeralUserIds: number[] = [];

  afterAll(async () => {
    for (const id of ephemeralUserIds) {
      try {
        await (prisma as any).user.delete({ where: { id } });
      } catch (_e) {
        // Already deleted or never committed — safe to ignore
      }
    }
  });

  // AUTH-API-01: Valid credential login
  it("AUTH-API-01: valid credential login returns 200 OK, sets toktickit_session cookie, and returns user profile without passwordHash", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({
        email: "somchai.jai@kmutt.ac.th",
        password: "Password123!",
      });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("user");
    expect(res.body.user).toMatchObject({
      email: "somchai.jai@kmutt.ac.th",
      role: "REQUESTER",
      mustChangePassword: false,
    });
    expect(res.body.user.passwordHash).toBeUndefined();
    expect(res.body.user.password).toBeUndefined();

    // Check Set-Cookie
    const cookies = res.headers["set-cookie"];
    expect(cookies).toBeDefined();
    const cookieHeader = Array.isArray(cookies) ? cookies.join("; ") : cookies;
    expect(cookieHeader).toContain("toktickit_session=");
    expect(cookieHeader.toLowerCase()).toContain("httponly");
  });

  // AUTH-API-02: Inactive user login attempt
  it("AUTH-API-02: inactive user login returns 401 Unauthorized with generic error message", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({
        email: "inactive.req@kmutt.ac.th",
        password: "Password123!",
      });

    expect(res.status).toBe(401);
    expect(res.body).toEqual({
      error: {
        code: "INVALID_CREDENTIALS",
        message: "Invalid email or password",
      },
    });
  });

  // AUTH-API-03: Invalid password or unknown email
  it("AUTH-API-03: invalid password returns 401 Unauthorized with generic message identical to unknown email", async () => {
    const wrongPassRes = await request(app)
      .post("/api/auth/login")
      .send({
        email: "somchai.jai@kmutt.ac.th",
        password: "WrongPassword999!",
      });

    expect(wrongPassRes.status).toBe(401);
    expect(wrongPassRes.body).toEqual({
      error: {
        code: "INVALID_CREDENTIALS",
        message: "Invalid email or password",
      },
    });

    const unknownEmailRes = await request(app)
      .post("/api/auth/login")
      .send({
        email: "doesnotexist@kmutt.ac.th",
        password: "Password123!",
      });

    expect(unknownEmailRes.status).toBe(401);
    expect(unknownEmailRes.body).toEqual({
      error: {
        code: "INVALID_CREDENTIALS",
        message: "Invalid email or password",
      },
    });
  });

  // GET /api/auth/me for valid session
  it("GET /api/auth/me returns 200 OK with authenticated user profile for a valid session", async () => {
    const loginRes = await request(app)
      .post("/api/auth/login")
      .send({
        email: "somchai.jai@kmutt.ac.th",
        password: "Password123!",
      });

    const cookie = loginRes.headers["set-cookie"] || [];

    const meRes = await request(app)
      .get("/api/auth/me")
      .set("Cookie", cookie);

    expect(meRes.status).toBe(200);
    expect(meRes.body.user).toMatchObject({
      email: "somchai.jai@kmutt.ac.th",
      name: "Somchai Jaidee",
      role: "REQUESTER",
      mustChangePassword: false,
    });
    expect(meRes.body.user.passwordHash).toBeUndefined();
  });

  // GET /api/auth/me for expired/invalid session
  it("GET /api/auth/me returns 401 Unauthorized for expired or invalid session", async () => {
    const noSessionRes = await request(app).get("/api/auth/me");
    expect(noSessionRes.status).toBe(401);

    const invalidSessionRes = await request(app)
      .get("/api/auth/me")
      .set("Cookie", "toktickit_session=invalid-or-forged-token");
    expect(invalidSessionRes.status).toBe(401);
  });

  // AUTH-API-04: Session logout invalidates session so subsequent requests fail
  it("AUTH-API-04: session logout clears cookie and invalidates session server-side so subsequent requests return 401", async () => {
    const loginRes = await request(app)
      .post("/api/auth/login")
      .send({
        email: "somchai.jai@kmutt.ac.th",
        password: "Password123!",
      });

    const cookie = loginRes.headers["set-cookie"] || [];

    const logoutRes = await request(app)
      .post("/api/auth/logout")
      .set("Cookie", cookie);

    expect(logoutRes.status).toBe(200);
    expect(logoutRes.body).toEqual({
      message: "Successfully logged out",
    });

    // Verify subsequent call with that same cookie fails
    const subsequentRes = await request(app)
      .get("/api/auth/me")
      .set("Cookie", cookie);

    expect(subsequentRes.status).toBe(401);
  });

  // BR-10 / BR-11: Session re-validation against database on every request
  it("BR-10/BR-11: deactivating a user invalidates existing sessions immediately on next request", async () => {
    // Create a temporary active user to test dynamic deactivation
    const bcrypt = await import("bcryptjs");
    const validHash = await bcrypt.default.hash("Password123!", 10);
    const tempUser = await (prisma as any).user.create({
      data: {
        name: "Deactivation Test User",
        email: `deact.test.${Date.now()}@kmutt.ac.th`,
        passwordHash: validHash,
        role: "REQUESTER",
        isActive: true,
        mustChangePassword: false,
      },
    });
    ephemeralUserIds.push(tempUser.id);

    const validLoginRes = await request(app)
      .post("/api/auth/login")
      .send({
        email: tempUser.email,
        password: "Password123!",
      });

    expect(validLoginRes.status).toBe(200);
    const cookie = validLoginRes.headers["set-cookie"] || [];

    // Verify session works
    const meBefore = await request(app)
      .get("/api/auth/me")
      .set("Cookie", cookie);
    expect(meBefore.status).toBe(200);

    // Deactivate user in DB directly (as if by admin)
    await (prisma as any).user.update({
      where: { id: tempUser.id },
      data: { isActive: false },
    });

    // Next request must fail with 401 per BR-10/BR-11
    const meAfter = await request(app)
      .get("/api/auth/me")
      .set("Cookie", cookie);
    expect(meAfter.status).toBe(401);
  });

  // AUTH-API-07: Mandatory password change blocks access to other endpoints until satisfied
  it("AUTH-API-07: user with mustChangePassword=true is blocked (403 Forbidden) on normal endpoints, but permitted on /api/auth/change-password", async () => {
    // temp.req@kmutt.ac.th has mustChangePassword: true in seed
    const loginRes = await request(app)
      .post("/api/auth/login")
      .send({
        email: "temp.req@kmutt.ac.th",
        password: "Password123!",
      });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body.user.mustChangePassword).toBe(true);
    const cookie = loginRes.headers["set-cookie"] || [];

    // Normal operational endpoint like POST /api/tickets should be blocked with 403
    const blockedRes = await request(app)
      .post("/api/tickets")
      .set("Cookie", cookie)
      .send({
        categoryId: 1,
        relatedSystemId: 1,
        requestedPriority: "MEDIUM",
        summary: "Should be blocked due to mandatory password change",
        description: "This request should not succeed until password changed.",
      });

    expect(blockedRes.status).toBe(403);
  });

  // AUTH-API-06: Password change failing complexity
  it("AUTH-API-06: password change failing complexity returns 400 Bad Request with details", async () => {
    const loginRes = await request(app)
      .post("/api/auth/login")
      .send({
        email: "temp.req@kmutt.ac.th",
        password: "Password123!",
      });

    const cookie = loginRes.headers["set-cookie"] || [];

    const res = await request(app)
      .post("/api/auth/change-password")
      .set("Cookie", cookie)
      .send({
        currentPassword: "Password123!",
        newPassword: "short",
        confirmPassword: "short",
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toHaveProperty("code", "VALIDATION_ERROR");
    expect(res.body.error).toHaveProperty("details");
  });

  // AUTH-API-05: Password change with valid complexity
  it("AUTH-API-05: password change satisfying complexity updates password and clears mustChangePassword", async () => {
    // Create a temporary user with mustChangePassword: true
    const bcrypt = await import("bcryptjs");
    const hash = await bcrypt.default.hash("Password123!", 10);
    const user = await (prisma as any).user.create({
      data: {
        name: "Pwd Change User",
        email: `pwdchange.${Date.now()}@kmutt.ac.th`,
        passwordHash: hash,
        role: "REQUESTER",
        isActive: true,
        mustChangePassword: true,
      },
    });
    ephemeralUserIds.push(user.id);

    const loginRes = await request(app)
      .post("/api/auth/login")
      .send({
        email: user.email,
        password: "Password123!",
      });

    const cookie = loginRes.headers["set-cookie"] || [];

    const changeRes = await request(app)
      .post("/api/auth/change-password")
      .set("Cookie", cookie)
      .send({
        currentPassword: "Password123!",
        newPassword: "NewSecurePassword456!",
        confirmPassword: "NewSecurePassword456!",
      });

    expect(changeRes.status).toBe(200);
    expect(changeRes.body).toEqual({
      message: "Password changed successfully",
    });

    // BR-26: Pre-change session cookie must be invalidated and return 401 on subsequent requests
    const oldCookieReplayRes = await request(app)
      .get("/api/auth/me")
      .set("Cookie", cookie);
    expect(oldCookieReplayRes.status).toBe(401);

    // BR-26: Change-password must issue rotated session cookie
    const newCookies = changeRes.headers["set-cookie"];
    expect(newCookies).toBeDefined();
    const newCookieHeader = Array.isArray(newCookies) ? newCookies.join("; ") : newCookies;
    expect(newCookieHeader).toContain("toktickit_session=");

    // Verify in DB that mustChangePassword is false
    const updated = await (prisma as any).user.findUnique({
      where: { id: user.id },
    });
    expect(updated.mustChangePassword).toBe(false);

    // Verify login with new password works
    const newLoginRes = await request(app)
      .post("/api/auth/login")
      .send({
        email: user.email,
        password: "NewSecurePassword456!",
      });
    expect(newLoginRes.status).toBe(200);
  });
});
