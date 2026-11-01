import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";

function extractToken(res: request.Response): string {
  const cookies = res.headers["set-cookie"];
  const cookieHeader = Array.isArray(cookies) ? cookies.join("; ") : cookies || "";
  const match = cookieHeader.match(/toktickit_session=([^;]+)/);
  return match ? match[1] : "";
}

const NON_TERMINAL_STATUSES = [
  "NEW",
  "OPEN",
  "IN_PROGRESS",
  "WAITING_FOR_REQUESTER",
  "REOPENED",
] as const;

describe("Lab 4 - Requester Dashboard API Tests (RDASH-API-01..06)", () => {
  const prisma = getPrisma();

  let somchaiToken: string;
  let somchaiId: number;
  let sudaToken: string;
  let sudaId: number;
  let wichaiZeroToken: string;
  let wichaiZeroId: number;
  let staffWitchaiToken: string;
  let adminToken: string;
  let tempReqToken: string;

  beforeAll(async () => {
    // 1. Somchai (Requester with multiple tickets across statuses)
    const somchaiRes = await request(app)
      .post("/api/auth/login")
      .send({ email: "somchai.jai@kmutt.ac.th", password: "Password123!" });
    somchaiToken = extractToken(somchaiRes);
    somchaiId = somchaiRes.body.user.id;

    // 2. Suda (Second Requester with her own tickets)
    const sudaRes = await request(app)
      .post("/api/auth/login")
      .send({ email: "suda.rak@kmutt.ac.th", password: "Password123!" });
    sudaToken = extractToken(sudaRes);
    sudaId = sudaRes.body.user.id;

    // 3. Wichai Meesook (Requester with zero tickets in seed)
    const wichaiRes = await request(app)
      .post("/api/auth/login")
      .send({ email: "wichai.mee@kmutt.ac.th", password: "Password123!" });
    wichaiZeroToken = extractToken(wichaiRes);
    wichaiZeroId = wichaiRes.body.user.id;

    // 4. IT Staff
    const staffRes = await request(app)
      .post("/api/auth/login")
      .send({ email: "staff.witchai@kmutt.ac.th", password: "Password123!" });
    staffWitchaiToken = extractToken(staffRes);

    // 5. Administrator
    const adminRes = await request(app)
      .post("/api/auth/login")
      .send({ email: "admin@kmutt.ac.th", password: "Password123!" });
    adminToken = extractToken(adminRes);

    // 6. Temporary Requester (mustChangePassword = true)
    const tempRes = await request(app)
      .post("/api/auth/login")
      .send({ email: "temp.req@kmutt.ac.th", password: "Password123!" });
    tempReqToken = extractToken(tempRes);
  });

  // -------------------------------------------------------------------------
  // RDASH-API-01: Requester dashboard returns only own metrics and lists
  // -------------------------------------------------------------------------
  describe("RDASH-API-01: Requester dashboard returns own metrics and recent lists", () => {
    it("returns 200 with generatedAt, 4 metrics + drillDowns, recentlyUpdated, and recentlyResolved for Somchai", async () => {
      const res = await request(app)
        .get("/api/dashboard/requester")
        .set("Cookie", `toktickit_session=${somchaiToken}`);

      expect(res.status).toBe(200);
      expect(typeof res.body.generatedAt).toBe("string");
      expect(new Date(res.body.generatedAt).toString()).not.toBe("Invalid Date");

      const { metrics, recentlyUpdated, recentlyResolved } = res.body;
      expect(metrics).toBeDefined();

      // Verify exact drillDown shapes per api-spec.md §4.1
      expect(metrics.activeTickets.drillDown).toEqual({
        status: "NEW,OPEN,IN_PROGRESS,WAITING_FOR_REQUESTER,REOPENED",
      });
      expect(metrics.waitingForRequester.drillDown).toEqual({
        status: "WAITING_FOR_REQUESTER",
      });
      expect(metrics.resolved.drillDown).toEqual({
        status: "RESOLVED",
      });
      expect(metrics.closed.drillDown).toEqual({
        status: "CLOSED",
      });

      expect(typeof metrics.activeTickets.count).toBe("number");
      expect(metrics.activeTickets.count).toBeGreaterThan(0);
      expect(metrics.waitingForRequester.count).toBeGreaterThanOrEqual(1);
      expect(metrics.resolved.count).toBeGreaterThanOrEqual(1);
      expect(metrics.closed.count).toBeGreaterThanOrEqual(1);

      // Lists are arrays of at most 5 items, ordered newest updatedAt first
      expect(Array.isArray(recentlyUpdated)).toBe(true);
      expect(recentlyUpdated.length).toBeLessThanOrEqual(5);
      for (let i = 1; i < recentlyUpdated.length; i++) {
        expect(new Date(recentlyUpdated[i - 1].updatedAt).getTime()).toBeGreaterThanOrEqual(
          new Date(recentlyUpdated[i].updatedAt).getTime()
        );
      }

      expect(Array.isArray(recentlyResolved)).toBe(true);
      expect(recentlyResolved.length).toBeLessThanOrEqual(5);
      for (const item of recentlyResolved) {
        expect(item.status).toBe("RESOLVED");
      }
    });
  });

  // -------------------------------------------------------------------------
  // RDASH-API-02: Another Requester's tickets never appear; client requesterId ignored
  // -------------------------------------------------------------------------
  describe("RDASH-API-02: Strict ownership isolation and client requesterId ignored (BR-11)", () => {
    it("never leaks another Requester's tickets and ignores client-supplied requesterId/userId", async () => {
      const sudaTickets = await prisma.ticket.findMany({
        where: { requesterId: sudaId },
        select: { id: true, ticketNumber: true },
      });
      const sudaTicketIds = new Set(sudaTickets.map((t) => t.id));
      expect(sudaTicketIds.size).toBeGreaterThan(0);

      // Somchai requests dashboard while passing Suda's ID in query and header
      const res = await request(app)
        .get(`/api/dashboard/requester?requesterId=${sudaId}&userId=${sudaId}`)
        .set("Cookie", `toktickit_session=${somchaiToken}`)
        .set("X-Requester-Id", String(sudaId));

      expect(res.status).toBe(200);

      const expectedSomchaiActive = await prisma.ticket.count({
        where: {
          requesterId: somchaiId,
          currentStatus: { in: [...NON_TERMINAL_STATUSES] },
        },
      });
      expect(res.body.metrics.activeTickets.count).toBe(expectedSomchaiActive);

      for (const item of res.body.recentlyUpdated) {
        expect(sudaTicketIds.has(item.id)).toBe(false);
      }
      for (const item of res.body.recentlyResolved) {
        expect(sudaTicketIds.has(item.id)).toBe(false);
      }
    });
  });

  // -------------------------------------------------------------------------
  // RDASH-API-03: Each metric equals a direct DB count (prisma.ticket.count)
  // -------------------------------------------------------------------------
  describe("RDASH-API-03: Every Requester dashboard metric equals direct Prisma count (FR-13)", () => {
    it("matches direct prisma.ticket.count for activeTickets, waitingForRequester, resolved, and closed", async () => {
      const res = await request(app)
        .get("/api/dashboard/requester")
        .set("Cookie", `toktickit_session=${somchaiToken}`);

      expect(res.status).toBe(200);

      const [dbActive, dbWaiting, dbResolved, dbClosed] = await Promise.all([
        prisma.ticket.count({
          where: {
            requesterId: somchaiId,
            currentStatus: { in: [...NON_TERMINAL_STATUSES] },
          },
        }),
        prisma.ticket.count({
          where: {
            requesterId: somchaiId,
            currentStatus: "WAITING_FOR_REQUESTER",
          },
        }),
        prisma.ticket.count({
          where: {
            requesterId: somchaiId,
            currentStatus: "RESOLVED",
          },
        }),
        prisma.ticket.count({
          where: {
            requesterId: somchaiId,
            currentStatus: "CLOSED",
          },
        }),
      ]);

      expect(res.body.metrics.activeTickets.count).toBe(dbActive);
      expect(res.body.metrics.waitingForRequester.count).toBe(dbWaiting);
      expect(res.body.metrics.resolved.count).toBe(dbResolved);
      expect(res.body.metrics.closed.count).toBe(dbClosed);
    });
  });

  // -------------------------------------------------------------------------
  // RDASH-API-04: GET /api/tickets?<drillDown> total equals card count (incl. comma-separated status)
  // -------------------------------------------------------------------------
  describe("RDASH-API-04: Drill-down consistency with GET /api/tickets (AC-09)", () => {
    it("returns matching pagination.totalItems on GET /api/tickets for every metric drillDown and rejects invalid status with 400", async () => {
      const dashRes = await request(app)
        .get("/api/dashboard/requester")
        .set("Cookie", `toktickit_session=${somchaiToken}`);

      expect(dashRes.status).toBe(200);
      const { metrics } = dashRes.body;

      for (const key of ["activeTickets", "waitingForRequester", "resolved", "closed"] as const) {
        const metric = metrics[key];
        const query = new URLSearchParams(metric.drillDown).toString();
        const listRes = await request(app)
          .get(`/api/tickets?${query}`)
          .set("Cookie", `toktickit_session=${somchaiToken}`);

        expect(listRes.status).toBe(200);
        expect(listRes.body.pagination.totalItems).toBe(metric.count);
      }

      // Invalid status value in comma-separated list -> 400
      const invalidRes = await request(app)
        .get("/api/tickets?status=OPEN,INVALID_STATUS")
        .set("Cookie", `toktickit_session=${somchaiToken}`);
      expect(invalidRes.status).toBe(400);
    });
  });

  // -------------------------------------------------------------------------
  // RDASH-API-05: Requester with zero tickets
  // -------------------------------------------------------------------------
  describe("RDASH-API-05: Requester with zero tickets receives 0 counts and empty lists", () => {
    it("returns 200 with all counts 0 and empty recentlyUpdated/recentlyResolved arrays", async () => {
      const dbCount = await prisma.ticket.count({ where: { requesterId: wichaiZeroId } });
      expect(dbCount).toBe(0);

      const res = await request(app)
        .get("/api/dashboard/requester")
        .set("Cookie", `toktickit_session=${wichaiZeroToken}`);

      expect(res.status).toBe(200);
      expect(res.body.metrics.activeTickets.count).toBe(0);
      expect(res.body.metrics.waitingForRequester.count).toBe(0);
      expect(res.body.metrics.resolved.count).toBe(0);
      expect(res.body.metrics.closed.count).toBe(0);
      expect(res.body.recentlyUpdated).toEqual([]);
      expect(res.body.recentlyResolved).toEqual([]);
    });
  });

  // -------------------------------------------------------------------------
  // RDASH-API-06: Authorization matrix (IT Staff / Admin / unauthenticated / mustChangePassword)
  // -------------------------------------------------------------------------
  describe("RDASH-API-06: Authorization enforcement on GET /api/dashboard/requester", () => {
    it("returns 401 for unauthenticated and 403 for IT Staff, Administrator, and mustChangePassword user", async () => {
      const unauthRes = await request(app).get("/api/dashboard/requester");
      expect(unauthRes.status).toBe(401);

      const staffRes = await request(app)
        .get("/api/dashboard/requester")
        .set("Cookie", `toktickit_session=${staffWitchaiToken}`);
      expect(staffRes.status).toBe(403);

      const adminRes = await request(app)
        .get("/api/dashboard/requester")
        .set("Cookie", `toktickit_session=${adminToken}`);
      expect(adminRes.status).toBe(403);

      const tempRes = await request(app)
        .get("/api/dashboard/requester")
        .set("Cookie", `toktickit_session=${tempReqToken}`);
      expect(tempRes.status).toBe(403);
    });
  });
});

