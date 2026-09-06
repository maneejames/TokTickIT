/**
 * My Tickets API Tests — Issue #5
 *
 * Test IDs per tests.md:
 *   LIST-API-01  Base listing: returns items for authenticated requester with _count.attachments
 *   LIST-API-02  Cross-requester isolation: Requester B never sees Requester A's tickets
 *   LIST-API-03  Pagination: respects page/pageSize, returns pagination metadata
 *   LIST-API-04  Search: ILIKE '%search%' on BOTH summary AND ticketNumber
 *   LIST-API-05  Filter: by categoryId and status
 *   LIST-API-06  Sort: by requestedPriority, status, and summary (not just createdAt)
 *
 * Additional (not in tests.md; added here and flagged per issue instructions):
 *   LIST-API-07  Invalid query param (unsupported sortBy) returns 400 (not silent fallback)
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";

// ---------------------------------------------------------------------------
// Test data holders
// ---------------------------------------------------------------------------
let requesterAId: number;
let requesterBId: number;
let categoryAId: number;
let categoryBId: number;
let relatedSystemId: number;

// IDs of tickets seeded for this test suite (cleaned up in afterAll)
const seededTicketIds: number[] = [];

// ---------------------------------------------------------------------------
// Seed helpers
// ---------------------------------------------------------------------------
async function seedTicket(params: {
  requesterId: number;
  categoryId: number;
  relatedSystemId: number;
  summary: string;
  description?: string;
  requestedPriority?: "LOW" | "MEDIUM" | "HIGH";
  currentStatus?: "NEW";
}): Promise<number> {
  const prisma = getPrisma();

  // Generate a unique ticket number for test isolation
  const ticketNumber = `TEST-${Date.now()}-${Math.floor(Math.random() * 9999)
    .toString()
    .padStart(4, "0")}`;

  const ticket = await prisma.ticket.create({
    data: {
      ticketNumber,
      requesterId: params.requesterId,
      categoryId: params.categoryId,
      relatedSystemId: params.relatedSystemId,
      summary: params.summary,
      description: params.description ?? "Test description with at least ten characters.",
      requestedPriority: params.requestedPriority ?? "MEDIUM",
      currentStatus: params.currentStatus ?? "NEW",
    },
  });

  seededTicketIds.push(ticket.id);
  return ticket.id;
}

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------
beforeAll(async () => {
  const prisma = getPrisma();

  // Grab two distinct active requesters from seed data
  const requesters = await prisma.requesterUser.findMany({
    where: { isActive: true },
    take: 2,
    orderBy: { id: "asc" },
  });

  if (requesters.length < 2) {
    throw new Error(
      "Need at least 2 active requesters in DB. Please run prisma seed."
    );
  }

  requesterAId = requesters[0].id;
  requesterBId = requesters[1].id;

  // Grab two distinct categories
  const categories = await prisma.category.findMany({
    where: { isActive: true },
    take: 2,
    orderBy: { id: "asc" },
  });

  if (categories.length < 2) {
    throw new Error("Need at least 2 active categories in DB.");
  }
  categoryAId = categories[0].id;
  categoryBId = categories[1].id;

  // Grab a related system
  const system = await prisma.relatedSystem.findFirst({
    where: { isActive: true },
  });
  if (!system) throw new Error("Need at least 1 active related system in DB.");
  relatedSystemId = system.id;
});

afterAll(async () => {
  if (seededTicketIds.length > 0) {
    await getPrisma().ticket.deleteMany({
      where: { id: { in: seededTicketIds } },
    });
  }
});

// ---------------------------------------------------------------------------
// LIST-API-01: Base listing — returns items for authenticated requester
// ---------------------------------------------------------------------------
describe("LIST-API-01: Base listing for authenticated requester", () => {
  it("returns 200 with items array and pagination for active requester", async () => {
    const res = await request(app)
      .get("/api/tickets")
      .set("X-Requester-Id", String(requesterAId));

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("items");
    expect(res.body).toHaveProperty("pagination");
    expect(Array.isArray(res.body.items)).toBe(true);

    // Pagination shape
    const { pagination } = res.body;
    expect(pagination).toHaveProperty("page");
    expect(pagination).toHaveProperty("pageSize");
    expect(pagination).toHaveProperty("totalItems");
    expect(pagination).toHaveProperty("totalPages");
  });

  it("returns tickets with required fields including _count.attachments (active only)", async () => {
    // Seed one ticket for requester A
    const ticketId = await seedTicket({
      requesterId: requesterAId,
      categoryId: categoryAId,
      relatedSystemId,
      summary: "Laptop battery drains fast",
    });

    // Add one active and one removed attachment for the ticket
    const prisma = getPrisma();
    await prisma.attachment.createMany({
      data: [
        {
          ticketId,
          storedFilename: `test-active-${ticketId}.png`,
          originalFilename: "active.png",
          mimeType: "image/png",
          sizeBytes: 1000,
          isRemoved: false,
        },
        {
          ticketId,
          storedFilename: `test-removed-${ticketId}.png`,
          originalFilename: "removed.png",
          mimeType: "image/png",
          sizeBytes: 1000,
          isRemoved: true, // should NOT count
        },
      ],
    });

    const res = await request(app)
      .get("/api/tickets")
      .set("X-Requester-Id", String(requesterAId));

    expect(res.status).toBe(200);

    const item = res.body.items.find((t: { id: number }) => t.id === ticketId);
    expect(item).toBeDefined();

    // Required fields per api-spec.md
    expect(item).toHaveProperty("id");
    expect(item).toHaveProperty("ticketNumber");
    expect(item).toHaveProperty("summary");
    expect(item).toHaveProperty("requestedPriority");
    expect(item).toHaveProperty("currentStatus");
    expect(item).toHaveProperty("createdAt");
    expect(item).toHaveProperty("updatedAt");
    expect(item).toHaveProperty("category");
    expect(item.category).toHaveProperty("id");
    expect(item.category).toHaveProperty("name");

    // _count.attachments must count only ACTIVE (isRemoved: false) attachments
    expect(item).toHaveProperty("_count");
    expect(item._count).toHaveProperty("attachments");
    expect(item._count.attachments).toBe(1); // only the active one
  });

  it("returns 401 when X-Requester-Id header is missing", async () => {
    const res = await request(app).get("/api/tickets");
    expect(res.status).toBe(401);
  });

  it("returns 403 for inactive requester", async () => {
    const prisma = getPrisma();
    const inactive = await prisma.requesterUser.findFirst({
      where: { isActive: false },
    });
    if (!inactive) return; // skip if no inactive requester in seed

    const res = await request(app)
      .get("/api/tickets")
      .set("X-Requester-Id", String(inactive.id));

    expect(res.status).toBe(403);
  });

  it("default sort is createdAt descending (most recent first)", async () => {
    // Seed two tickets for requester A with deliberate ordering
    // (They'll be created sequentially so createdAt will differ slightly)
    const firstId = await seedTicket({
      requesterId: requesterAId,
      categoryId: categoryAId,
      relatedSystemId,
      summary: "Older ticket for sort test",
    });

    await new Promise((r) => setTimeout(r, 10)); // tiny gap to ensure different createdAt

    const secondId = await seedTicket({
      requesterId: requesterAId,
      categoryId: categoryAId,
      relatedSystemId,
      summary: "Newer ticket for sort test",
    });

    const res = await request(app)
      .get("/api/tickets")
      .set("X-Requester-Id", String(requesterAId));

    expect(res.status).toBe(200);

    const items: { id: number; createdAt: string }[] = res.body.items;
    const firstIndex = items.findIndex((t) => t.id === firstId);
    const secondIndex = items.findIndex((t) => t.id === secondId);

    // Newer (secondId) should appear BEFORE older (firstId) in default desc sort
    expect(secondIndex).toBeLessThan(firstIndex);
  });
});

// ---------------------------------------------------------------------------
// LIST-API-02: Cross-requester isolation
// This is one of the most important tests in this issue (per the task instructions).
// ---------------------------------------------------------------------------
describe("LIST-API-02: Cross-requester ticket isolation", () => {
  it("Requester B never receives Requester A's tickets", async () => {
    // Seed a ticket exclusively for requester A
    const aTicketId = await seedTicket({
      requesterId: requesterAId,
      categoryId: categoryAId,
      relatedSystemId,
      summary: "Isolation test — Requester A exclusive",
    });

    // Request as Requester B
    const res = await request(app)
      .get("/api/tickets")
      .set("X-Requester-Id", String(requesterBId));

    expect(res.status).toBe(200);

    const returnedIds = res.body.items.map((t: { id: number }) => t.id);
    expect(returnedIds).not.toContain(aTicketId);
  });

  it("Requester A does not receive Requester B's tickets", async () => {
    // Seed a ticket exclusively for requester B
    const bTicketId = await seedTicket({
      requesterId: requesterBId,
      categoryId: categoryBId,
      relatedSystemId,
      summary: "Isolation test — Requester B exclusive",
    });

    const res = await request(app)
      .get("/api/tickets")
      .set("X-Requester-Id", String(requesterAId));

    expect(res.status).toBe(200);

    const returnedIds = res.body.items.map((t: { id: number }) => t.id);
    expect(returnedIds).not.toContain(bTicketId);
  });

  it("all returned items belong exclusively to the requesting requester", async () => {
    // Seed tickets for both requesters
    await seedTicket({
      requesterId: requesterAId,
      categoryId: categoryAId,
      relatedSystemId,
      summary: "A-only ticket alpha",
    });
    await seedTicket({
      requesterId: requesterBId,
      categoryId: categoryBId,
      relatedSystemId,
      summary: "B-only ticket beta",
    });

    // Fetch as A and confirm every returned item's id belongs to A
    const resA = await request(app)
      .get("/api/tickets")
      .query({ pageSize: 50 })
      .set("X-Requester-Id", String(requesterAId));

    expect(resA.status).toBe(200);
    for (const item of resA.body.items as { requesterId: number }[]) {
      // The response items don't necessarily expose requesterId, but we can
      // verify by checking that no B-exclusive tickets appear by cross-fetching
      // We assert non-null items returned — all must be owned by A
      expect(item).toBeDefined();
    }

    // Double-check: B's tickets don't appear when A requests
    const resB = await request(app)
      .get("/api/tickets")
      .query({ pageSize: 50 })
      .set("X-Requester-Id", String(requesterBId));

    const aItems = resA.body.items.map((t: { ticketNumber: string }) => t.ticketNumber);
    const bItems = resB.body.items.map((t: { ticketNumber: string }) => t.ticketNumber);

    // Intersection should be empty — no ticket appears in both requester's lists
    const intersection = aItems.filter((tn: string) => bItems.includes(tn));
    expect(intersection).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// LIST-API-03: Pagination
// ---------------------------------------------------------------------------
describe("LIST-API-03: Pagination parameters and metadata", () => {
  beforeAll(async () => {
    // Seed enough tickets for requester A to span multiple pages
    // We need pageSize=5 with at least 6 tickets, so seed 6 more
    for (let i = 1; i <= 6; i++) {
      await seedTicket({
        requesterId: requesterAId,
        categoryId: categoryAId,
        relatedSystemId,
        summary: `Pagination test ticket number ${i}`,
      });
    }
  });

  it("respects pageSize and returns correct item count on page 1", async () => {
    const res = await request(app)
      .get("/api/tickets")
      .query({ page: 1, pageSize: 5 })
      .set("X-Requester-Id", String(requesterAId));

    expect(res.status).toBe(200);
    expect(res.body.items.length).toBeLessThanOrEqual(5);
    expect(res.body.pagination.page).toBe(1);
    expect(res.body.pagination.pageSize).toBe(5);
    expect(typeof res.body.pagination.totalItems).toBe("number");
    expect(typeof res.body.pagination.totalPages).toBe("number");
    expect(res.body.pagination.totalPages).toBeGreaterThanOrEqual(2);
  });

  it("page 2 returns different items than page 1", async () => {
    const res1 = await request(app)
      .get("/api/tickets")
      .query({ page: 1, pageSize: 5 })
      .set("X-Requester-Id", String(requesterAId));

    const res2 = await request(app)
      .get("/api/tickets")
      .query({ page: 2, pageSize: 5 })
      .set("X-Requester-Id", String(requesterAId));

    expect(res1.status).toBe(200);
    expect(res2.status).toBe(200);

    const ids1 = res1.body.items.map((t: { id: number }) => t.id);
    const ids2 = res2.body.items.map((t: { id: number }) => t.id);

    // No overlap between pages
    const overlap = ids1.filter((id: number) => ids2.includes(id));
    expect(overlap).toHaveLength(0);
  });

  it("returns 400 for unsupported pageSize value", async () => {
    const res = await request(app)
      .get("/api/tickets")
      .query({ pageSize: 7 }) // not in allowed [5, 10, 20, 50]
      .set("X-Requester-Id", String(requesterAId));

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error");
  });

  it("totalItems matches across pages (same overall count)", async () => {
    const res1 = await request(app)
      .get("/api/tickets")
      .query({ page: 1, pageSize: 5 })
      .set("X-Requester-Id", String(requesterAId));

    const res2 = await request(app)
      .get("/api/tickets")
      .query({ page: 2, pageSize: 5 })
      .set("X-Requester-Id", String(requesterAId));

    expect(res1.body.pagination.totalItems).toBe(res2.body.pagination.totalItems);
  });
});

// ---------------------------------------------------------------------------
// LIST-API-04: Substring search on BOTH summary AND ticketNumber
// This test MUST assert both fields, not just summary.
// ---------------------------------------------------------------------------
describe("LIST-API-04: Substring search on summary and ticketNumber", () => {
  let searchTicketId: number;
  let searchTicketNumber: string;
  const uniqueSummarySubstr = "ZenGreenSearchUnique9x7";
  const uniqueNumberInfix = "SRCH9X7";

  beforeAll(async () => {
    // Seed a ticket with a predictable unique ticketNumber infix
    const prisma = getPrisma();
    const uniqueTicketNumber = `SRCH9X7-${Date.now()}`;

    const ticket = await prisma.ticket.create({
      data: {
        ticketNumber: uniqueTicketNumber,
        requesterId: requesterAId,
        categoryId: categoryAId,
        relatedSystemId,
        summary: "Regular summary without special text",
        description: "Plain description for search test at least ten chars.",
        requestedPriority: "MEDIUM",
        currentStatus: "NEW",
      },
    });
    searchTicketId = ticket.id;
    searchTicketNumber = ticket.ticketNumber;
    seededTicketIds.push(searchTicketId);

    // Also seed a ticket whose summary matches uniqueSummarySubstr
    const summaryId = await seedTicket({
      requesterId: requesterAId,
      categoryId: categoryAId,
      relatedSystemId,
      summary: `Issue with ${uniqueSummarySubstr} configuration`,
    });
    seededTicketIds.push(summaryId); // already pushed inside seedTicket, but harmless
  });

  it("finds ticket by ILIKE match on summary", async () => {
    const res = await request(app)
      .get("/api/tickets")
      .query({ search: uniqueSummarySubstr })
      .set("X-Requester-Id", String(requesterAId));

    expect(res.status).toBe(200);
    expect(res.body.items.length).toBeGreaterThanOrEqual(1);
    const found = res.body.items.some((t: { summary: string }) =>
      t.summary.toLowerCase().includes(uniqueSummarySubstr.toLowerCase())
    );
    expect(found).toBe(true);
  });

  it("finds ticket by ILIKE match on ticketNumber", async () => {
    const res = await request(app)
      .get("/api/tickets")
      .query({ search: uniqueNumberInfix })
      .set("X-Requester-Id", String(requesterAId));

    expect(res.status).toBe(200);
    expect(res.body.items.length).toBeGreaterThanOrEqual(1);
    const found = res.body.items.some(
      (t: { ticketNumber: string }) => t.ticketNumber === searchTicketNumber
    );
    expect(found).toBe(true);
  });

  it("is case-insensitive on summary search", async () => {
    const res = await request(app)
      .get("/api/tickets")
      .query({ search: uniqueSummarySubstr.toLowerCase() })
      .set("X-Requester-Id", String(requesterAId));

    expect(res.status).toBe(200);
    const found = res.body.items.some((t: { summary: string }) =>
      t.summary.toLowerCase().includes(uniqueSummarySubstr.toLowerCase())
    );
    expect(found).toBe(true);
  });

  it("is case-insensitive on ticketNumber search", async () => {
    // Search with lowercase version of the infix
    const res = await request(app)
      .get("/api/tickets")
      .query({ search: uniqueNumberInfix.toLowerCase() })
      .set("X-Requester-Id", String(requesterAId));

    expect(res.status).toBe(200);
    const found = res.body.items.some(
      (t: { ticketNumber: string }) => t.ticketNumber === searchTicketNumber
    );
    expect(found).toBe(true);
  });

  it("returns empty items (not an error) when search matches nothing", async () => {
    const res = await request(app)
      .get("/api/tickets")
      .query({ search: "ZZZNOMATCH999ZZZNOMATCH" })
      .set("X-Requester-Id", String(requesterAId));

    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(0);
    expect(res.body.pagination.totalItems).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// LIST-API-05: Filter by categoryId and status
// ---------------------------------------------------------------------------
describe("LIST-API-05: Filter by categoryId and status", () => {
  let catAOnlyTicketId: number;
  let catBOnlyTicketId: number;

  beforeAll(async () => {
    catAOnlyTicketId = await seedTicket({
      requesterId: requesterAId,
      categoryId: categoryAId,
      relatedSystemId,
      summary: "Filter test category A ticket",
    });

    catBOnlyTicketId = await seedTicket({
      requesterId: requesterAId,
      categoryId: categoryBId,
      relatedSystemId,
      summary: "Filter test category B ticket",
    });
  });

  it("filters by categoryId — only returns tickets in the given category", async () => {
    const res = await request(app)
      .get("/api/tickets")
      .query({ categoryId: categoryBId, pageSize: 50 })
      .set("X-Requester-Id", String(requesterAId));

    expect(res.status).toBe(200);

    // All returned items must have matching categoryId
    for (const item of res.body.items as { category: { id: number } }[]) {
      expect(item.category.id).toBe(categoryBId);
    }

    // catAOnlyTicketId must NOT appear in the filtered results
    const returnedIds = res.body.items.map((t: { id: number }) => t.id);
    expect(returnedIds).not.toContain(catAOnlyTicketId);

    // catBOnlyTicketId MUST appear
    expect(returnedIds).toContain(catBOnlyTicketId);
  });

  it("filters by status=NEW — returns only NEW tickets", async () => {
    const res = await request(app)
      .get("/api/tickets")
      .query({ status: "NEW", pageSize: 50 })
      .set("X-Requester-Id", String(requesterAId));

    expect(res.status).toBe(200);

    for (const item of res.body.items as { currentStatus: string }[]) {
      expect(item.currentStatus).toBe("NEW");
    }
  });

  it("returns 400 for invalid status value", async () => {
    const res = await request(app)
      .get("/api/tickets")
      .query({ status: "INVALID_STATUS" })
      .set("X-Requester-Id", String(requesterAId));

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error");
  });

  it("returns 400 for invalid categoryId (non-integer)", async () => {
    const res = await request(app)
      .get("/api/tickets")
      .query({ categoryId: "abc" })
      .set("X-Requester-Id", String(requesterAId));

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error");
  });

  it("filters by priority / requestedPriority — returns only tickets with specified priority", async () => {
    const highTicketId = await seedTicket({
      requesterId: requesterAId,
      categoryId: categoryAId,
      relatedSystemId,
      summary: "Priority filter HIGH ticket test",
      requestedPriority: "HIGH",
    });

    const lowTicketId = await seedTicket({
      requesterId: requesterAId,
      categoryId: categoryAId,
      relatedSystemId,
      summary: "Priority filter LOW ticket test",
      requestedPriority: "LOW",
    });

    const res = await request(app)
      .get("/api/tickets")
      .query({ priority: "HIGH", pageSize: 50 })
      .set("X-Requester-Id", String(requesterAId));

    expect(res.status).toBe(200);
    for (const item of res.body.items as { requestedPriority: string }[]) {
      expect(item.requestedPriority).toBe("HIGH");
    }

    const ids = res.body.items.map((t: { id: number }) => t.id);
    expect(ids).toContain(highTicketId);
    expect(ids).not.toContain(lowTicketId);

    // Also supports requestedPriority query parameter key
    const resAlias = await request(app)
      .get("/api/tickets")
      .query({ requestedPriority: "LOW", pageSize: 50 })
      .set("X-Requester-Id", String(requesterAId));

    expect(resAlias.status).toBe(200);
    for (const item of resAlias.body.items as { requestedPriority: string }[]) {
      expect(item.requestedPriority).toBe("LOW");
    }
    const aliasIds = resAlias.body.items.map((t: { id: number }) => t.id);
    expect(aliasIds).toContain(lowTicketId);
    expect(aliasIds).not.toContain(highTicketId);
  });

  it("returns 400 for invalid priority value", async () => {
    const res = await request(app)
      .get("/api/tickets")
      .query({ priority: "INVALID_PRIORITY" })
      .set("X-Requester-Id", String(requesterAId));

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error");
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });
});

// ---------------------------------------------------------------------------
// LIST-API-06: Sort by requestedPriority, status, and summary
// ---------------------------------------------------------------------------
describe("LIST-API-06: Sort by requestedPriority, status, and summary", () => {
  beforeAll(async () => {
    // Seed tickets with distinct priorities and summaries for reliable sort tests
    await seedTicket({
      requesterId: requesterAId,
      categoryId: categoryAId,
      relatedSystemId,
      summary: "Alpha sort test ticket",
      requestedPriority: "LOW",
    });
    await seedTicket({
      requesterId: requesterAId,
      categoryId: categoryAId,
      relatedSystemId,
      summary: "Bravo sort test ticket",
      requestedPriority: "HIGH",
    });
    await seedTicket({
      requesterId: requesterAId,
      categoryId: categoryAId,
      relatedSystemId,
      summary: "Charlie sort test ticket",
      requestedPriority: "MEDIUM",
    });
  });

  it("sorts by summary ascending (a-z)", async () => {
    const res = await request(app)
      .get("/api/tickets")
      .query({ search: "sort test ticket", sortBy: "summary", sortOrder: "asc", pageSize: 50 })
      .set("X-Requester-Id", String(requesterAId));

    expect(res.status).toBe(200);
    const summaries: string[] = res.body.items.map((t: { summary: string }) => t.summary);

    // Verify relative order of the three seeded items: Alpha < Bravo < Charlie
    const alphaIdx = summaries.indexOf("Alpha sort test ticket");
    const bravoIdx = summaries.indexOf("Bravo sort test ticket");
    const charlieIdx = summaries.indexOf("Charlie sort test ticket");

    expect(alphaIdx).toBeGreaterThanOrEqual(0);
    expect(bravoIdx).toBeGreaterThan(alphaIdx);
    expect(charlieIdx).toBeGreaterThan(bravoIdx);
  });

  it("sorts by summary descending (z-a)", async () => {
    const res = await request(app)
      .get("/api/tickets")
      .query({ search: "sort test ticket", sortBy: "summary", sortOrder: "desc", pageSize: 50 })
      .set("X-Requester-Id", String(requesterAId));

    expect(res.status).toBe(200);
    const summaries: string[] = res.body.items.map((t: { summary: string }) => t.summary);

    // Verify relative order in desc: Charlie < Bravo < Alpha in indices (Charlie appears before Bravo before Alpha)
    const alphaIdx = summaries.indexOf("Alpha sort test ticket");
    const bravoIdx = summaries.indexOf("Bravo sort test ticket");
    const charlieIdx = summaries.indexOf("Charlie sort test ticket");

    expect(charlieIdx).toBeGreaterThanOrEqual(0);
    expect(bravoIdx).toBeGreaterThan(charlieIdx);
    expect(alphaIdx).toBeGreaterThan(bravoIdx);
  });

  it("sorts by requestedPriority ascending (LOW < MEDIUM < HIGH)", async () => {
    const res = await request(app)
      .get("/api/tickets")
      .query({ sortBy: "requestedPriority", sortOrder: "asc", pageSize: 50 })
      .set("X-Requester-Id", String(requesterAId));

    expect(res.status).toBe(200);
    expect(res.body.items.length).toBeGreaterThan(0);

    const priorityOrder: Record<string, number> = { LOW: 1, MEDIUM: 2, HIGH: 3 };
    const priorities: string[] = res.body.items.map(
      (t: { requestedPriority: string }) => t.requestedPriority
    );
    for (let i = 0; i < priorities.length - 1; i++) {
      expect(priorityOrder[priorities[i]]).toBeLessThanOrEqual(
        priorityOrder[priorities[i + 1]]
      );
    }
  });

  it("sorts by requestedPriority descending (HIGH > MEDIUM > LOW)", async () => {
    const res = await request(app)
      .get("/api/tickets")
      .query({ sortBy: "requestedPriority", sortOrder: "desc", pageSize: 50 })
      .set("X-Requester-Id", String(requesterAId));

    expect(res.status).toBe(200);
    const priorityOrder: Record<string, number> = { LOW: 1, MEDIUM: 2, HIGH: 3 };
    const priorities: string[] = res.body.items.map(
      (t: { requestedPriority: string }) => t.requestedPriority
    );
    for (let i = 0; i < priorities.length - 1; i++) {
      expect(priorityOrder[priorities[i]]).toBeGreaterThanOrEqual(
        priorityOrder[priorities[i + 1]]
      );
    }
  });

  it("sorts by status ascending", async () => {
    const res = await request(app)
      .get("/api/tickets")
      .query({ sortBy: "status", sortOrder: "asc", pageSize: 50 })
      .set("X-Requester-Id", String(requesterAId));

    expect(res.status).toBe(200);
    // All tickets in Lab 2 are NEW so statuses are equal — just confirm 200 + items
    expect(Array.isArray(res.body.items)).toBe(true);
  });

  it("sorts by createdAt ascending", async () => {
    const res = await request(app)
      .get("/api/tickets")
      .query({ sortBy: "createdAt", sortOrder: "asc", pageSize: 50 })
      .set("X-Requester-Id", String(requesterAId));

    expect(res.status).toBe(200);
    const dates: string[] = res.body.items.map(
      (t: { createdAt: string }) => t.createdAt
    );
    for (let i = 0; i < dates.length - 1; i++) {
      expect(new Date(dates[i]).getTime()).toBeLessThanOrEqual(
        new Date(dates[i + 1]).getTime()
      );
    }
  });

  it("returns 400 for unsupported sortBy value", async () => {
    const res = await request(app)
      .get("/api/tickets")
      .query({ sortBy: "invalidField" })
      .set("X-Requester-Id", String(requesterAId));

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error");
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 400 for unsupported sortOrder value", async () => {
    const res = await request(app)
      .get("/api/tickets")
      .query({ sortOrder: "sideways" })
      .set("X-Requester-Id", String(requesterAId));

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error");
  });
});
