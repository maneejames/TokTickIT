import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";

describe("Lab 3 - IT Staff Ticket Queue API Integration Tests (QUEUE-API-01, QUEUE-API-02)", () => {
  const prisma = getPrisma();

  let requesterToken: string;
  let itStaffToken: string;
  let adminToken: string;

  let requesterId: number;
  let itStaffId: number;
  let adminId: number;

  const createdTicketIds: number[] = [];

  beforeAll(async () => {
    // 1. Authenticate users
    const reqRes = await request(app)
      .post("/api/auth/login")
      .send({ email: "somchai.jai@kmutt.ac.th", password: "Password123!" });
    requesterToken = extractToken(reqRes);
    requesterId = reqRes.body.user.id;

    const staffRes = await request(app)
      .post("/api/auth/login")
      .send({ email: "staff.witchai@kmutt.ac.th", password: "Password123!" });
    itStaffToken = extractToken(staffRes);
    itStaffId = staffRes.body.user.id;

    const adminRes = await request(app)
      .post("/api/auth/login")
      .send({ email: "admin@kmutt.ac.th", password: "Password123!" });
    adminToken = extractToken(adminRes);
    adminId = adminRes.body.user.id;

    // 2. Create specific test tickets to test filters, sorting, owner, and isRequesterResolved
    // Ticket A: Network (cat 4 or 1), HIGH priority, NEW status, unassigned, isRequesterResolved: false
    const tA = await prisma.ticket.create({
      data: {
        ticketNumber: "TICK-TEST-QUEUE-001",
        requesterId,
        categoryId: 1,
        relatedSystemId: 1,
        summary: "Alpha Queue Ticket Network VPN issue",
        description: "Testing queue retrieval and filtering for alpha",
        requestedPriority: "HIGH",
        itPriority: "HIGH",
        currentStatus: "NEW",
        ownerId: null,
        isRequesterResolved: false,
      },
    });
    createdTicketIds.push(tA.id);

    // Ticket B: Hardware (cat 2), LOW priority, OPEN status, assigned to staff, isRequesterResolved: true
    const tB = await prisma.ticket.create({
      data: {
        ticketNumber: "TICK-TEST-QUEUE-002",
        requesterId,
        categoryId: 2,
        relatedSystemId: 2,
        summary: "Beta Queue Ticket Monitor display flickering",
        description: "Testing queue retrieval and filtering for beta",
        requestedPriority: "LOW",
        itPriority: "LOW",
        currentStatus: "OPEN",
        ownerId: itStaffId,
        isRequesterResolved: true,
      },
    });
    createdTicketIds.push(tB.id);

    // Ticket C: Software (cat 3), URGENT priority, IN_PROGRESS status, assigned to admin, isRequesterResolved: false
    const tC = await prisma.ticket.create({
      data: {
        ticketNumber: "TICK-TEST-QUEUE-003",
        requesterId,
        categoryId: 3,
        relatedSystemId: 3,
        summary: "Gamma Queue Ticket Email system down completely",
        description: "Testing queue retrieval and filtering for gamma",
        requestedPriority: "MEDIUM",
        itPriority: "URGENT",
        currentStatus: "IN_PROGRESS",
        ownerId: adminId,
        isRequesterResolved: false,
      },
    });
    createdTicketIds.push(tC.id);
  });

  afterAll(async () => {
    if (createdTicketIds.length > 0) {
      await prisma.publicComment.deleteMany({ where: { ticketId: { in: createdTicketIds } } });
      await prisma.internalNote.deleteMany({ where: { ticketId: { in: createdTicketIds } } });
      await prisma.attachment.deleteMany({ where: { ticketId: { in: createdTicketIds } } });
      await prisma.ticket.deleteMany({ where: { id: { in: createdTicketIds } } });
    }
  });

  // -------------------------------------------------------------------------
  // Access Control & Role Boundaries
  // -------------------------------------------------------------------------
  describe("Role & Authentication Access Control (§6 Authorization Matrix)", () => {
    it("returns 401 Unauthorized when unauthenticated", async () => {
      const res = await request(app).get("/api/staff/tickets");
      expect(res.status).toBe(401);
      expect(res.body.error?.code).toBe("UNAUTHORIZED");
    });

    it("returns 403 Forbidden when accessed by a Requester", async () => {
      const res = await request(app)
        .get("/api/staff/tickets")
        .set("Cookie", `toktickit_session=${requesterToken}`);
      expect(res.status).toBe(403);
      expect(res.body.error?.code).toBe("FORBIDDEN");
    });

    it("returns 403 Forbidden when accessed by an Administrator", async () => {
      const res = await request(app)
        .get("/api/staff/tickets")
        .set("Cookie", `toktickit_session=${adminToken}`);
      expect(res.status).toBe(403);
      expect(res.body.error?.code).toBe("FORBIDDEN");
    });

    it("returns 200 OK when accessed by IT Staff", async () => {
      const res = await request(app)
        .get("/api/staff/tickets")
        .set("Cookie", `toktickit_session=${itStaffToken}`);
      expect(res.status).toBe(200);
    });
  });

  // -------------------------------------------------------------------------
  // QUEUE-API-01: Basic Retrieval, Response Shape, Default Ordering, Pagination
  // -------------------------------------------------------------------------
  describe("QUEUE-API-01: Basic Retrieval & Pagination Shape", () => {
    it("returns paginated tickets with category, owner, requester, isRequesterResolved, and priority fields", async () => {
      const res = await request(app)
        .get("/api/staff/tickets")
        .set("Cookie", `toktickit_session=${itStaffToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("items");
      expect(res.body).toHaveProperty("pagination");
      expect(Array.isArray(res.body.items)).toBe(true);

      const pagination = res.body.pagination;
      expect(pagination).toMatchObject({
        page: 1,
        pageSize: 10,
      });
      expect(typeof pagination.totalItems).toBe("number");
      expect(typeof pagination.totalPages).toBe("number");

      // Verify item shape
      const foundBeta = res.body.items.find((item: any) => item.ticketNumber === "TICK-TEST-QUEUE-002");
      expect(foundBeta).toBeDefined();
      expect(foundBeta).toMatchObject({
        ticketNumber: "TICK-TEST-QUEUE-002",
        summary: "Beta Queue Ticket Monitor display flickering",
        requestedPriority: "LOW",
        itPriority: "LOW",
        status: "OPEN",
        isRequesterResolved: true,
      });
      expect(foundBeta.category).toHaveProperty("id", 2);
      expect(foundBeta.category).toHaveProperty("name");
      expect(foundBeta.requester).toHaveProperty("id", requesterId);
      expect(foundBeta.requester).toHaveProperty("name");
      expect(foundBeta.owner).toMatchObject({
        id: itStaffId,
      });

      // Verify unassigned owner returns null
      const foundAlpha = res.body.items.find((item: any) => item.ticketNumber === "TICK-TEST-QUEUE-001");
      expect(foundAlpha).toBeDefined();
      expect(foundAlpha.owner).toBeNull();
      expect(foundAlpha.isRequesterResolved).toBe(false);
    });

    it("defaults to ordering by createdAt descending", async () => {
      const res = await request(app)
        .get("/api/staff/tickets")
        .set("Cookie", `toktickit_session=${itStaffToken}`);

      expect(res.status).toBe(200);
      const items = res.body.items;
      for (let i = 0; i < items.length - 1; i++) {
        const dateA = new Date(items[i].createdAt).getTime();
        const dateB = new Date(items[i + 1].createdAt).getTime();
        expect(dateA).toBeGreaterThanOrEqual(dateB);
      }
    });

    it("handles pagination boundaries (page 1 vs beyond last page)", async () => {
      const resBeyond = await request(app)
        .get("/api/staff/tickets?page=9999&pageSize=10")
        .set("Cookie", `toktickit_session=${itStaffToken}`);

      expect(resBeyond.status).toBe(200);
      expect(resBeyond.body.items).toEqual([]);
      expect(resBeyond.body.pagination.page).toBe(9999);
    });
  });

  // -------------------------------------------------------------------------
  // QUEUE-API-02: Search & Filtering
  // -------------------------------------------------------------------------
  describe("QUEUE-API-02: Search and Filtering", () => {
    it("filters by status (single value: NEW)", async () => {
      const res = await request(app)
        .get("/api/staff/tickets?status=NEW")
        .set("Cookie", `toktickit_session=${itStaffToken}`);

      expect(res.status).toBe(200);
      expect(res.body.items.length).toBeGreaterThanOrEqual(1);
      res.body.items.forEach((item: any) => {
        expect(item.status).toBe("NEW");
      });
      const numbers = res.body.items.map((i: any) => i.ticketNumber);
      expect(numbers).toContain("TICK-TEST-QUEUE-001");
      expect(numbers).not.toContain("TICK-TEST-QUEUE-002");
    });

    it("filters by status (multiple comma-separated values: NEW,OPEN)", async () => {
      const res = await request(app)
        .get("/api/staff/tickets?status=NEW,OPEN")
        .set("Cookie", `toktickit_session=${itStaffToken}`);

      expect(res.status).toBe(200);
      res.body.items.forEach((item: any) => {
        expect(["NEW", "OPEN"]).toContain(item.status);
      });
      const numbers = res.body.items.map((i: any) => i.ticketNumber);
      expect(numbers).toContain("TICK-TEST-QUEUE-001");
      expect(numbers).toContain("TICK-TEST-QUEUE-002");
      expect(numbers).not.toContain("TICK-TEST-QUEUE-003");
    });

    it("filters by IT Priority (priority=URGENT)", async () => {
      const res = await request(app)
        .get("/api/staff/tickets?priority=URGENT")
        .set("Cookie", `toktickit_session=${itStaffToken}`);

      expect(res.status).toBe(200);
      res.body.items.forEach((item: any) => {
        expect(item.itPriority).toBe("URGENT");
      });
      const numbers = res.body.items.map((i: any) => i.ticketNumber);
      expect(numbers).toContain("TICK-TEST-QUEUE-003");
      expect(numbers).not.toContain("TICK-TEST-QUEUE-001");
    });

    it("filters by categoryId", async () => {
      const res = await request(app)
        .get("/api/staff/tickets?categoryId=2")
        .set("Cookie", `toktickit_session=${itStaffToken}`);

      expect(res.status).toBe(200);
      res.body.items.forEach((item: any) => {
        expect(item.category.id).toBe(2);
      });
      const numbers = res.body.items.map((i: any) => i.ticketNumber);
      expect(numbers).toContain("TICK-TEST-QUEUE-002");
      expect(numbers).not.toContain("TICK-TEST-QUEUE-001");
    });

    it("filters by ownerId (specific user ID)", async () => {
      const res = await request(app)
        .get(`/api/staff/tickets?ownerId=${itStaffId}`)
        .set("Cookie", `toktickit_session=${itStaffToken}`);

      expect(res.status).toBe(200);
      res.body.items.forEach((item: any) => {
        expect(item.owner?.id).toBe(itStaffId);
      });
      const numbers = res.body.items.map((i: any) => i.ticketNumber);
      expect(numbers).toContain("TICK-TEST-QUEUE-002");
      expect(numbers).not.toContain("TICK-TEST-QUEUE-001");
    });

    it("filters by ownerId='unassigned'", async () => {
      const res = await request(app)
        .get("/api/staff/tickets?ownerId=unassigned")
        .set("Cookie", `toktickit_session=${itStaffToken}`);

      expect(res.status).toBe(200);
      res.body.items.forEach((item: any) => {
        expect(item.owner).toBeNull();
      });
      const numbers = res.body.items.map((i: any) => i.ticketNumber);
      expect(numbers).toContain("TICK-TEST-QUEUE-001");
      expect(numbers).not.toContain("TICK-TEST-QUEUE-002");
    });

    it("searches by ticket number substring", async () => {
      const res = await request(app)
        .get("/api/staff/tickets?search=QUEUE-001")
        .set("Cookie", `toktickit_session=${itStaffToken}`);

      expect(res.status).toBe(200);
      const numbers = res.body.items.map((i: any) => i.ticketNumber);
      expect(numbers).toContain("TICK-TEST-QUEUE-001");
      expect(numbers).not.toContain("TICK-TEST-QUEUE-002");
    });

    it("searches by summary substring (case-insensitive)", async () => {
      const res = await request(app)
        .get("/api/staff/tickets?search=flickering")
        .set("Cookie", `toktickit_session=${itStaffToken}`);

      expect(res.status).toBe(200);
      const numbers = res.body.items.map((i: any) => i.ticketNumber);
      expect(numbers).toContain("TICK-TEST-QUEUE-002");
      expect(numbers).not.toContain("TICK-TEST-QUEUE-001");
    });

    it("searches by requester name", async () => {
      const res = await request(app)
        .get("/api/staff/tickets?search=Somchai")
        .set("Cookie", `toktickit_session=${itStaffToken}`);

      expect(res.status).toBe(200);
      expect(res.body.items.length).toBeGreaterThanOrEqual(3);
    });

    it("combines multiple filters (status, priority, search, category)", async () => {
      const res = await request(app)
        .get("/api/staff/tickets?status=OPEN&priority=LOW&categoryId=2&search=Monitor")
        .set("Cookie", `toktickit_session=${itStaffToken}`);

      expect(res.status).toBe(200);
      expect(res.body.items).toHaveLength(1);
      expect(res.body.items[0].ticketNumber).toBe("TICK-TEST-QUEUE-002");
    });
  });

  // -------------------------------------------------------------------------
  // Sorting & Invalid Parameter Validation
  // -------------------------------------------------------------------------
  describe("Sorting & Invalid Query Parameter Handling", () => {
    it("supports sorting by updatedAt asc and desc", async () => {
      const resAsc = await request(app)
        .get("/api/staff/tickets?sortBy=updatedAt&sortOrder=asc")
        .set("Cookie", `toktickit_session=${itStaffToken}`);
      expect(resAsc.status).toBe(200);

      const resDesc = await request(app)
        .get("/api/staff/tickets?sortBy=updatedAt&sortOrder=desc")
        .set("Cookie", `toktickit_session=${itStaffToken}`);
      expect(resDesc.status).toBe(200);
    });

    it("supports sorting by ticketNumber asc", async () => {
      const res = await request(app)
        .get("/api/staff/tickets?sortBy=ticketNumber&sortOrder=asc")
        .set("Cookie", `toktickit_session=${itStaffToken}`);
      expect(res.status).toBe(200);
    });

    it("supports sorting by itPriority asc and desc", async () => {
      const res = await request(app)
        .get("/api/staff/tickets?sortBy=itPriority&sortOrder=desc")
        .set("Cookie", `toktickit_session=${itStaffToken}`);
      expect(res.status).toBe(200);
    });

    it("rejects invalid status parameter with 400 Bad Request", async () => {
      const res = await request(app)
        .get("/api/staff/tickets?status=INVALID_STATUS")
        .set("Cookie", `toktickit_session=${itStaffToken}`);

      expect(res.status).toBe(400);
      expect(res.body.error?.code).toBe("VALIDATION_ERROR");
      expect(res.body.error?.details).toEqual(
        expect.arrayContaining([expect.objectContaining({ field: "status" })])
      );
    });

    it("rejects invalid priority parameter with 400 Bad Request", async () => {
      const res = await request(app)
        .get("/api/staff/tickets?priority=SUPER_HIGH")
        .set("Cookie", `toktickit_session=${itStaffToken}`);

      expect(res.status).toBe(400);
      expect(res.body.error?.code).toBe("VALIDATION_ERROR");
      expect(res.body.error?.details).toEqual(
        expect.arrayContaining([expect.objectContaining({ field: "priority" })])
      );
    });

    it("rejects invalid sortBy parameter with 400 Bad Request", async () => {
      const res = await request(app)
        .get("/api/staff/tickets?sortBy=nonExistentField")
        .set("Cookie", `toktickit_session=${itStaffToken}`);

      expect(res.status).toBe(400);
      expect(res.body.error?.code).toBe("VALIDATION_ERROR");
      expect(res.body.error?.details).toEqual(
        expect.arrayContaining([expect.objectContaining({ field: "sortBy" })])
      );
    });

    it("rejects invalid sortOrder with 400 Bad Request", async () => {
      const res = await request(app)
        .get("/api/staff/tickets?sortOrder=sideways")
        .set("Cookie", `toktickit_session=${itStaffToken}`);

      expect(res.status).toBe(400);
      expect(res.body.error?.code).toBe("VALIDATION_ERROR");
    });

    it("rejects page < 1 with 400 Bad Request", async () => {
      const res = await request(app)
        .get("/api/staff/tickets?page=0")
        .set("Cookie", `toktickit_session=${itStaffToken}`);

      expect(res.status).toBe(400);
      expect(res.body.error?.code).toBe("VALIDATION_ERROR");
      expect(res.body.error?.details).toEqual(
        expect.arrayContaining([expect.objectContaining({ field: "page" })])
      );
    });

    it("rejects invalid pageSize with 400 Bad Request", async () => {
      const res = await request(app)
        .get("/api/staff/tickets?pageSize=100")
        .set("Cookie", `toktickit_session=${itStaffToken}`);

      expect(res.status).toBe(400);
      expect(res.body.error?.code).toBe("VALIDATION_ERROR");
      expect(res.body.error?.details).toEqual(
        expect.arrayContaining([expect.objectContaining({ field: "pageSize" })])
      );
    });
  });
});

function extractToken(res: request.Response): string {
  const cookies = res.headers["set-cookie"];
  const cookieHeader = Array.isArray(cookies) ? cookies.join("; ") : cookies || "";
  const match = cookieHeader.match(/toktickit_session=([^;]+)/);
  return match ? match[1] : "";
}
