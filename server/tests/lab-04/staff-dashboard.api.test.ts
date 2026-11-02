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

const ALL_STATUSES = [
  "NEW",
  "OPEN",
  "IN_PROGRESS",
  "WAITING_FOR_REQUESTER",
  "RESOLVED",
  "CLOSED",
  "REOPENED",
  "CANCELLED",
] as const;

const NON_TERMINAL_STATUSES = [
  "NEW",
  "OPEN",
  "IN_PROGRESS",
  "WAITING_FOR_REQUESTER",
  "REOPENED",
] as const;

const ALL_PRIORITIES = ["URGENT", "HIGH", "MEDIUM", "LOW"] as const;

describe("Lab 4 - IT Staff Dashboard API & Performance Smoke Tests (SDASH-API-01..06, PERF-01)", () => {
  const prisma = getPrisma();

  let somchaiToken: string;
  let staffWitchaiToken: string;
  let staffWitchaiId: number;
  let staffKamonToken: string;
  let staffKamonId: number;
  let staffNareeZeroToken: string;
  let staffNareeZeroId: number;
  let adminToken: string;
  let tempReqToken: string;

  beforeAll(async () => {
    // 1. Requester (Somchai)
    const reqRes = await request(app)
      .post("/api/auth/login")
      .send({ email: "somchai.jai@kmutt.ac.th", password: "Password123!" });
    somchaiToken = extractToken(reqRes);

    // 2. Staff Witchai (owns tickets & has actions)
    const staff1Res = await request(app)
      .post("/api/auth/login")
      .send({ email: "staff.witchai@kmutt.ac.th", password: "Password123!" });
    staffWitchaiToken = extractToken(staff1Res);
    staffWitchaiId = staff1Res.body.user.id;

    // 3. Staff Kamon (owns different tickets & has actions)
    const staff2Res = await request(app)
      .post("/api/auth/login")
      .send({ email: "staff.kamon@kmutt.ac.th", password: "Password123!" });
    staffKamonToken = extractToken(staff2Res);
    staffKamonId = staff2Res.body.user.id;

    // 4. Staff Naree (0 owned tickets & 0 actions in seed)
    const staff3Res = await request(app)
      .post("/api/auth/login")
      .send({ email: "staff.naree@kmutt.ac.th", password: "Password123!" });
    staffNareeZeroToken = extractToken(staff3Res);
    staffNareeZeroId = staff3Res.body.user.id;

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
  // SDASH-API-01: Staff dashboard metrics and lists structure
  // -------------------------------------------------------------------------
  describe("SDASH-API-01: Staff dashboard returns complete metrics and lists", () => {
    it("returns 200 with all 8 byStatus keys, unassigned, myOwned, all 4 byItPriority keys, requesterResolvedPending, myFollowUps, urgentTickets, recentlyUpdated, and myRecentActions", async () => {
      const res = await request(app)
        .get("/api/dashboard/staff")
        .set("Cookie", `toktickit_session=${staffWitchaiToken}`);

      expect(res.status).toBe(200);
      expect(typeof res.body.generatedAt).toBe("string");

      const { metrics, urgentTickets, recentlyUpdated, myRecentActions } = res.body;
      expect(metrics).toBeDefined();

      // All 8 status keys present with count and drillDown
      for (const st of ALL_STATUSES) {
        expect(metrics.byStatus[st]).toBeDefined();
        expect(typeof metrics.byStatus[st].count).toBe("number");
        expect(metrics.byStatus[st].drillDown).toEqual({ status: st });
      }

      // Unassigned & myOwned
      expect(metrics.unassigned.drillDown).toEqual({
        ownerId: "unassigned",
        status: "NEW,OPEN,IN_PROGRESS,WAITING_FOR_REQUESTER,REOPENED",
      });
      expect(metrics.myOwned.drillDown).toEqual({
        ownerId: staffWitchaiId,
        status: "NEW,OPEN,IN_PROGRESS,WAITING_FOR_REQUESTER,REOPENED",
      });

      // All 4 IT Priority keys present with count and drillDown
      for (const prio of ALL_PRIORITIES) {
        expect(metrics.byItPriority[prio]).toBeDefined();
        expect(typeof metrics.byItPriority[prio].count).toBe("number");
        expect(metrics.byItPriority[prio].drillDown).toEqual({
          priority: prio,
          status: "NEW,OPEN,IN_PROGRESS,WAITING_FOR_REQUESTER,REOPENED",
        });
      }

      // requesterResolvedPending & myFollowUps
      expect(metrics.requesterResolvedPending.drillDown).toEqual({
        status: "OPEN,IN_PROGRESS,WAITING_FOR_REQUESTER,REOPENED",
        requesterResolved: true,
      });
      expect(typeof metrics.myFollowUps.count).toBe("number");

      // urgentTickets: non-terminal URGENT, oldest createdAt first, max 5
      expect(Array.isArray(urgentTickets)).toBe(true);
      expect(urgentTickets.length).toBeLessThanOrEqual(5);
      for (let i = 0; i < urgentTickets.length; i++) {
        expect(urgentTickets[i].itPriority).toBe("URGENT");
        expect(NON_TERMINAL_STATUSES).toContain(urgentTickets[i].status);
        if (i > 0) {
          expect(new Date(urgentTickets[i - 1].createdAt).getTime()).toBeLessThanOrEqual(
            new Date(urgentTickets[i].createdAt).getTime()
          );
        }
      }

      // recentlyUpdated: max 5, newest updatedAt first
      expect(Array.isArray(recentlyUpdated)).toBe(true);
      expect(recentlyUpdated.length).toBeLessThanOrEqual(5);
      for (let i = 1; i < recentlyUpdated.length; i++) {
        expect(new Date(recentlyUpdated[i - 1].updatedAt).getTime()).toBeGreaterThanOrEqual(
          new Date(recentlyUpdated[i].updatedAt).getTime()
        );
      }

      // myRecentActions: max 5, performed by session user
      expect(Array.isArray(myRecentActions)).toBe(true);
      expect(myRecentActions.length).toBeGreaterThan(0);
      expect(myRecentActions.length).toBeLessThanOrEqual(5);
      for (const act of myRecentActions) {
        expect(typeof act.id).toBe("number");
        expect(typeof act.ticketId).toBe("number");
        expect(typeof act.ticketNumber).toBe("string");
        expect(typeof act.descriptionPreview).toBe("string");
        expect(typeof act.followUpRequired).toBe("boolean");
        expect(typeof act.actionDateTime).toBe("string");
      }
    });
  });

  // -------------------------------------------------------------------------
  // SDASH-API-02: myOwned uses session user, not client input (BR-12)
  // -------------------------------------------------------------------------
  describe("SDASH-API-02: myOwned and user-scoped metrics use session user only (BR-12)", () => {
    it("scopes myOwned, myFollowUps, and myRecentActions to authenticated session user and ignores query params", async () => {
      const witchaiRes = await request(app)
        .get(`/api/dashboard/staff?ownerId=${staffKamonId}&userId=${staffKamonId}&performedById=${staffKamonId}`)
        .set("Cookie", `toktickit_session=${staffWitchaiToken}`);
      expect(witchaiRes.status).toBe(200);
      expect(witchaiRes.body.metrics.myOwned.drillDown.ownerId).toBe(staffWitchaiId);

      const kamonRes = await request(app)
        .get(`/api/dashboard/staff?ownerId=${staffWitchaiId}`)
        .set("Cookie", `toktickit_session=${staffKamonToken}`);
      expect(kamonRes.status).toBe(200);
      expect(kamonRes.body.metrics.myOwned.drillDown.ownerId).toBe(staffKamonId);

      const [witchaiDbOwned, kamonDbOwned] = await Promise.all([
        prisma.ticket.count({
          where: {
            ownerId: staffWitchaiId,
            currentStatus: { in: [...NON_TERMINAL_STATUSES] },
          },
        }),
        prisma.ticket.count({
          where: {
            ownerId: staffKamonId,
            currentStatus: { in: [...NON_TERMINAL_STATUSES] },
          },
        }),
      ]);

      expect(witchaiRes.body.metrics.myOwned.count).toBe(witchaiDbOwned);
      expect(kamonRes.body.metrics.myOwned.count).toBe(kamonDbOwned);
    });
  });

  // -------------------------------------------------------------------------
  // SDASH-API-03: Each metric equals a direct DB count (FR-13, AC-08)
  // -------------------------------------------------------------------------
  describe("SDASH-API-03: Every Staff dashboard metric equals direct Prisma count", () => {
    it("matches direct Prisma counts for byStatus, unassigned, myOwned, byItPriority, requesterResolvedPending, and myFollowUps", async () => {
      // Temporarily toggle isRequesterResolved = true on an OPEN ticket so requesterResolvedPending > 0 is also verified
      const openTicket = await prisma.ticket.findFirst({
        where: { currentStatus: "OPEN" },
      });
      expect(openTicket).not.toBeNull();

      await prisma.ticket.update({
        where: { id: openTicket!.id },
        data: { isRequesterResolved: true },
      });

      try {
        const res = await request(app)
          .get("/api/dashboard/staff")
          .set("Cookie", `toktickit_session=${staffWitchaiToken}`);

        expect(res.status).toBe(200);
        const { metrics } = res.body;

        // 1. byStatus (all 8)
        for (const st of ALL_STATUSES) {
          const dbCount = await prisma.ticket.count({ where: { currentStatus: st } });
          expect(metrics.byStatus[st].count).toBe(dbCount);
        }

        // 2. unassigned
        const dbUnassigned = await prisma.ticket.count({
          where: {
            ownerId: null,
            currentStatus: { in: [...NON_TERMINAL_STATUSES] },
          },
        });
        expect(metrics.unassigned.count).toBe(dbUnassigned);

        // 3. myOwned
        const dbMyOwned = await prisma.ticket.count({
          where: {
            ownerId: staffWitchaiId,
            currentStatus: { in: [...NON_TERMINAL_STATUSES] },
          },
        });
        expect(metrics.myOwned.count).toBe(dbMyOwned);

        // 4. byItPriority (all 4 on non-terminal tickets)
        for (const prio of ALL_PRIORITIES) {
          const dbPrio = await prisma.ticket.count({
            where: {
              itPriority: prio,
              currentStatus: { in: [...NON_TERMINAL_STATUSES] },
            },
          });
          expect(metrics.byItPriority[prio].count).toBe(dbPrio);
        }

        // 5. requesterResolvedPending
        const dbReqResolved = await prisma.ticket.count({
          where: {
            isRequesterResolved: true,
            currentStatus: { in: ["OPEN", "IN_PROGRESS", "WAITING_FOR_REQUESTER", "REOPENED"] },
          },
        });
        expect(dbReqResolved).toBeGreaterThanOrEqual(1);
        expect(metrics.requesterResolvedPending.count).toBe(dbReqResolved);

        // 6. myFollowUps
        const dbFollowUps = await (prisma as any).actionTaken.count({
          where: {
            performedById: staffWitchaiId,
            followUpRequired: true,
            ticket: {
              currentStatus: { in: [...NON_TERMINAL_STATUSES] },
            },
          },
        });
        expect(metrics.myFollowUps.count).toBe(dbFollowUps);
      } finally {
        await prisma.ticket.update({
          where: { id: openTicket!.id },
          data: { isRequesterResolved: false },
        });
      }
    });
  });

  // -------------------------------------------------------------------------
  // SDASH-API-04: GET /api/staff/tickets?<drillDown> total equals card count (AC-09)
  // -------------------------------------------------------------------------
  describe("SDASH-API-04: Drill-down consistency with GET /api/staff/tickets (AC-09)", () => {
    it("returns pagination.totalItems equal to metric.count for every drillDown metric and rejects invalid requesterResolved with 400", async () => {
      const openTicket = await prisma.ticket.findFirst({
        where: { currentStatus: "OPEN" },
      });
      await prisma.ticket.update({
        where: { id: openTicket!.id },
        data: { isRequesterResolved: true },
      });

      try {
        const dashRes = await request(app)
          .get("/api/dashboard/staff")
          .set("Cookie", `toktickit_session=${staffWitchaiToken}`);

        expect(dashRes.status).toBe(200);
        const { metrics } = dashRes.body;

        const metricsToVerify: { name: string; count: number; drillDown: Record<string, any> }[] = [
          ...ALL_STATUSES.map((st) => ({
            name: `byStatus.${st}`,
            count: metrics.byStatus[st].count,
            drillDown: metrics.byStatus[st].drillDown,
          })),
          {
            name: "unassigned",
            count: metrics.unassigned.count,
            drillDown: metrics.unassigned.drillDown,
          },
          {
            name: "myOwned",
            count: metrics.myOwned.count,
            drillDown: metrics.myOwned.drillDown,
          },
          ...ALL_PRIORITIES.map((prio) => ({
            name: `byItPriority.${prio}`,
            count: metrics.byItPriority[prio].count,
            drillDown: metrics.byItPriority[prio].drillDown,
          })),
          {
            name: "requesterResolvedPending",
            count: metrics.requesterResolvedPending.count,
            drillDown: metrics.requesterResolvedPending.drillDown,
          },
        ];

        for (const item of metricsToVerify) {
          const params = new URLSearchParams();
          for (const [k, v] of Object.entries(item.drillDown)) {
            params.set(k, String(v));
          }
          const queueRes = await request(app)
            .get(`/api/staff/tickets?${params.toString()}`)
            .set("Cookie", `toktickit_session=${staffWitchaiToken}`);

          expect(queueRes.status).toBe(200);
          expect(queueRes.body.pagination.totalItems).toBe(item.count);
        }

        // Invalid requesterResolved -> 400
        const badRes = await request(app)
          .get("/api/staff/tickets?requesterResolved=notaboolean")
          .set("Cookie", `toktickit_session=${staffWitchaiToken}`);
        expect(badRes.status).toBe(400);
      } finally {
        await prisma.ticket.update({
          where: { id: openTicket!.id },
          data: { isRequesterResolved: false },
        });
      }
    });
  });

  // -------------------------------------------------------------------------
  // SDASH-API-05: Empty system / user with nothing assigned
  // -------------------------------------------------------------------------
  describe("SDASH-API-05: Staff user with zero owned tickets and zero actions", () => {
    it("returns 0 for myOwned and myFollowUps and empty myRecentActions for Naree Network", async () => {
      const dbOwned = await prisma.ticket.count({ where: { ownerId: staffNareeZeroId } });
      expect(dbOwned).toBe(0);

      const res = await request(app)
        .get("/api/dashboard/staff")
        .set("Cookie", `toktickit_session=${staffNareeZeroToken}`);

      expect(res.status).toBe(200);
      expect(res.body.metrics.myOwned.count).toBe(0);
      expect(res.body.metrics.myOwned.drillDown.ownerId).toBe(staffNareeZeroId);
      expect(res.body.metrics.myFollowUps.count).toBe(0);
      expect(res.body.myRecentActions).toEqual([]);
    });
  });

  // -------------------------------------------------------------------------
  // SDASH-API-06: Authorization matrix (Requester / unauthenticated -> 403 / 401; Admin allowed)
  // -------------------------------------------------------------------------
  describe("SDASH-API-06: Authorization enforcement on GET /api/dashboard/staff", () => {
    it("returns 401 for unauthenticated, 403 for Requester and mustChangePassword, and 200 for Administrator", async () => {
      const unauthRes = await request(app).get("/api/dashboard/staff");
      expect(unauthRes.status).toBe(401);

      const reqRes = await request(app)
        .get("/api/dashboard/staff")
        .set("Cookie", `toktickit_session=${somchaiToken}`);
      expect(reqRes.status).toBe(403);

      const tempRes = await request(app)
        .get("/api/dashboard/staff")
        .set("Cookie", `toktickit_session=${tempReqToken}`);
      expect(tempRes.status).toBe(403);

      const adminRes = await request(app)
        .get("/api/dashboard/staff")
        .set("Cookie", `toktickit_session=${adminToken}`);
      expect(adminRes.status).toBe(200);
      expect(adminRes.body.metrics).toBeDefined();
      expect(adminRes.body.metrics.byStatus).toBeDefined();
    });
  });

  // -------------------------------------------------------------------------
  // PERF-01: Performance smoke test (< 500 ms 3-run median for both endpoints)
  // -------------------------------------------------------------------------
  describe("PERF-01: Dashboard endpoints performance smoke test (< 500 ms 3-run median)", () => {
    it("responds in < 500 ms (3-run median) on both /api/dashboard/requester and /api/dashboard/staff", async () => {
      const reqTimes: number[] = [];
      for (let i = 0; i < 3; i++) {
        const start = performance.now();
        const res = await request(app)
          .get("/api/dashboard/requester")
          .set("Cookie", `toktickit_session=${somchaiToken}`);
        const elapsed = Number((performance.now() - start).toFixed(2));
        expect(res.status).toBe(200);
        reqTimes.push(elapsed);
      }

      const staffTimes: number[] = [];
      for (let i = 0; i < 3; i++) {
        const start = performance.now();
        const res = await request(app)
          .get("/api/dashboard/staff")
          .set("Cookie", `toktickit_session=${staffWitchaiToken}`);
        const elapsed = Number((performance.now() - start).toFixed(2));
        expect(res.status).toBe(200);
        staffTimes.push(elapsed);
      }

      const sortedReq = [...reqTimes].sort((a, b) => a - b);
      const reqMedian = sortedReq[1];
      const sortedStaff = [...staffTimes].sort((a, b) => a - b);
      const staffMedian = sortedStaff[1];

      console.log(
        `PERF-01 requester-dashboard runs (ms): [${reqTimes.join(", ")}], median: ${reqMedian} ms`
      );
      console.log(
        `PERF-01 staff-dashboard runs (ms): [${staffTimes.join(", ")}], median: ${staffMedian} ms`
      );

      expect(reqMedian).toBeLessThan(500);
      expect(staffMedian).toBeLessThan(500);
    });
  });
});

