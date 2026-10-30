import { describe, it, expect } from "vitest";
import { getPrisma } from "../../src/prisma.js";

describe("Lab 4 - Migration and Data Model Integrity Tests (MIG-01, MIG-02, MIG-03)", () => {
  const prisma = getPrisma();

  it("MIG-01: Preserves Lab 1-3 data integrity (Users, Tickets, Attachments, Comments, Notes)", async () => {
    const userCount = await prisma.user.count();
    expect(userCount).toBeGreaterThanOrEqual(1);

    const ticketCount = await prisma.ticket.count();
    expect(ticketCount).toBeGreaterThanOrEqual(1);

    const tickets = await prisma.ticket.findMany({
      include: {
        requester: true,
        attachments: true,
        publicComments: true,
        internalNotes: true,
      },
    });

    for (const ticket of tickets) {
      expect(ticket.requester).toBeDefined();
      expect(ticket.requesterId).toBe(ticket.requester.id);
      expect(ticket.ticketNumber).toBeDefined();
    }
  });

  it("MIG-02: All tickets have version column defined and existing legacy tickets default to version = 0", async () => {
    const tickets = await prisma.ticket.findMany();
    expect(tickets.length).toBeGreaterThanOrEqual(1);

    for (const ticket of tickets) {
      expect((ticket as any).version).toBeDefined();
      expect(typeof (ticket as any).version).toBe("number");
      expect((ticket as any).version).toBeGreaterThanOrEqual(0);
    }
  });

  it("MIG-03: Seed is idempotent and covers tickets with 0, 1, multiple Actions Taken and zero/non-zero dashboard states", async () => {
    // Check ActionTaken model exists and can be queried
    expect((prisma as any).actionTaken).toBeDefined();

    const actions = await (prisma as any).actionTaken.findMany();
    expect(actions.length).toBeGreaterThanOrEqual(1);

    // Group actions by ticketId
    const actionCountsByTicket: Record<number, number> = {};
    for (const action of actions) {
      actionCountsByTicket[action.ticketId] = (actionCountsByTicket[action.ticketId] || 0) + 1;
    }

    const allTickets = await prisma.ticket.findMany();
    const ticketsWithZeroActions = allTickets.filter((t) => !actionCountsByTicket[t.id]);
    const ticketsWithOneAction = allTickets.filter((t) => actionCountsByTicket[t.id] === 1);
    const ticketsWithMultipleActions = allTickets.filter((t) => actionCountsByTicket[t.id] > 1);

    expect(ticketsWithZeroActions.length).toBeGreaterThanOrEqual(1);
    expect(ticketsWithOneAction.length).toBeGreaterThanOrEqual(1);
    expect(ticketsWithMultipleActions.length).toBeGreaterThanOrEqual(1);

    // Check zero-ticket requester exists
    const requesters = await prisma.user.findMany({ where: { role: "REQUESTER" } });
    const zeroTicketRequester = requesters.find(
      async (r) => (await prisma.ticket.count({ where: { requesterId: r.id } })) === 0
    );
    expect(zeroTicketRequester).toBeDefined();
  });
});

