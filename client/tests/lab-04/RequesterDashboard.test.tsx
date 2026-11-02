import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RequesterDashboard } from "../../src/components/RequesterDashboard.js";
import * as api from "../../src/api.js";

vi.mock("../../src/api.js", async () => {
  const actual = await vi.importActual("../../src/api.js");
  return {
    ...actual,
    getRequesterDashboard: vi.fn(),
  };
});

describe("RequesterDashboard Component UI Tests (RDASH-UI-01 to RDASH-UI-02)", () => {
  const requesterUser: api.User = {
    id: 6,
    name: "Somchai Jaidee",
    email: "somchai.jai@kmutt.ac.th",
    role: "REQUESTER",
    mustChangePassword: false,
  };

  const populatedDashboardData: api.RequesterDashboardResponse = {
    generatedAt: "2026-11-01T12:00:00.000Z",
    metrics: {
      activeTickets: {
        count: 3,
        drillDown: { status: "NEW,OPEN,IN_PROGRESS,WAITING_FOR_REQUESTER,REOPENED" },
      },
      waitingForRequester: {
        count: 1,
        drillDown: { status: "WAITING_FOR_REQUESTER" },
      },
      resolved: {
        count: 5,
        drillDown: { status: "RESOLVED" },
      },
      closed: {
        count: 12,
        drillDown: { status: "CLOSED" },
      },
    },
    recentlyUpdated: [
      {
        id: 12,
        ticketNumber: "TICK-20260906-0001",
        summary: "Laptop battery drains in less than 30 minutes",
        status: "IN_PROGRESS",
        updatedAt: "2026-11-01T10:30:00.000Z",
      },
      {
        id: 14,
        ticketNumber: "TICK-20260906-0004",
        summary: "Request installation of Docker Desktop for coursework",
        status: "WAITING_FOR_REQUESTER",
        updatedAt: "2026-11-01T09:15:00.000Z",
      },
    ],
    recentlyResolved: [
      {
        id: 9,
        ticketNumber: "TICK-20260906-0005",
        summary: "Engineering lab printer paper jam in tray 2",
        status: "RESOLVED",
        updatedAt: "2026-10-31T14:00:00.000Z",
      },
    ],
  };

  const zeroDashboardData: api.RequesterDashboardResponse = {
    generatedAt: "2026-11-01T12:00:00.000Z",
    metrics: {
      activeTickets: {
        count: 0,
        drillDown: { status: "NEW,OPEN,IN_PROGRESS,WAITING_FOR_REQUESTER,REOPENED" },
      },
      waitingForRequester: {
        count: 0,
        drillDown: { status: "WAITING_FOR_REQUESTER" },
      },
      resolved: {
        count: 0,
        drillDown: { status: "RESOLVED" },
      },
      closed: {
        count: 0,
        drillDown: { status: "CLOSED" },
      },
    },
    recentlyUpdated: [],
    recentlyResolved: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // =========================================================================
  // RDASH-UI-01: Cards, recent lists, drill-down, "Needs your attention" text cue
  // =========================================================================
  describe("RDASH-UI-01: Metric cards, recent lists, drill-down, and 'Needs your attention' cue", () => {
    it("renders welcome header, 4 metric cards, 'Needs your attention' text cue when waitingForRequester > 0, and recent ticket lists", async () => {
      vi.mocked(api.getRequesterDashboard).mockResolvedValueOnce(populatedDashboardData);

      render(<RequesterDashboard currentRequester={requesterUser} />);

      expect(await screen.findByText(/Welcome, Somchai/i)).toBeInTheDocument();

      // 4 metric cards with accessible names ("label: value. action")
      expect(
        screen.getByRole("link", { name: /Active Tickets:\s*3\.\s*View in My Tickets/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("link", { name: /Waiting for You:\s*1\.\s*View in My Tickets/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("link", { name: /Resolved:\s*5\.\s*View in My Tickets/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("link", { name: /Closed:\s*12\.\s*View in My Tickets/i })
      ).toBeInTheDocument();

      // Non-color attention cue per ui-spec.md §3
      expect(screen.getByText(/Needs your attention/i)).toBeInTheDocument();

      // Recently Updated and Recently Resolved lists
      expect(screen.getByText("TICK-20260906-0001")).toBeInTheDocument();
      expect(screen.getByText("Laptop battery drains in less than 30 minutes")).toBeInTheDocument();
      expect(screen.getByText("TICK-20260906-0005")).toBeInTheDocument();
      expect(screen.getByText("Engineering lab printer paper jam in tray 2")).toBeInTheDocument();
    });

    it("activates drill-down with exact status filter params and opens ticket detail on row click", async () => {
      const user = userEvent.setup();
      const onDrillDown = vi.fn();
      const onOpenTicket = vi.fn();
      vi.mocked(api.getRequesterDashboard).mockResolvedValueOnce(populatedDashboardData);

      render(
        <RequesterDashboard
          currentRequester={requesterUser}
          onDrillDownToMyTickets={onDrillDown}
          onNavigateToTicketDetail={onOpenTicket}
        />
      );

      const activeCard = await screen.findByRole("link", {
        name: /Active Tickets:\s*3\.\s*View in My Tickets/i,
      });
      await user.click(activeCard);

      expect(onDrillDown).toHaveBeenCalledWith({
        status: "NEW,OPEN,IN_PROGRESS,WAITING_FOR_REQUESTER,REOPENED",
      });

      const waitingCard = screen.getByRole("link", {
        name: /Waiting for You:\s*1\.\s*View in My Tickets/i,
      });
      await user.click(waitingCard);

      expect(onDrillDown).toHaveBeenCalledWith({
        status: "WAITING_FOR_REQUESTER",
      });

      await user.click(screen.getByText("TICK-20260906-0001"));
      expect(onOpenTicket).toHaveBeenCalledWith(12);
    });
  });

  // =========================================================================
  // RDASH-UI-02: Loading, empty, forbidden, failure + Retry states
  // =========================================================================
  describe("RDASH-UI-02: Loading, empty, forbidden, and failure + Retry states", () => {
    it("renders loading skeleton with aria-busy='true' while fetching", () => {
      vi.mocked(api.getRequesterDashboard).mockReturnValueOnce(new Promise(() => {}));

      render(<RequesterDashboard currentRequester={requesterUser} />);

      const loadingRegion = screen.getByTestId("requester-dashboard-loading");
      expect(loadingRegion).toHaveAttribute("aria-busy", "true");
    });

    it("renders zero counts with no drill-down links and 'Nothing to show yet.' when empty", async () => {
      const user = userEvent.setup();
      const onDrillDown = vi.fn();
      vi.mocked(api.getRequesterDashboard).mockResolvedValueOnce(zeroDashboardData);

      render(
        <RequesterDashboard
          currentRequester={requesterUser}
          onDrillDownToMyTickets={onDrillDown}
        />
      );

      expect(await screen.findByText(/Welcome, Somchai/i)).toBeInTheDocument();

      // No "Needs your attention" cue when waitingForRequester is 0
      expect(screen.queryByText(/Needs your attention/i)).toBeNull();

      // Zero-count metric cards are not links
      expect(screen.queryByRole("link", { name: /Active Tickets:/i })).toBeNull();
      await user.click(screen.getByText("Active Tickets"));
      expect(onDrillDown).not.toHaveBeenCalled();

      // Empty lists show "Nothing to show yet."
      const emptyHints = screen.getAllByText(/Nothing to show yet\./i);
      expect(emptyHints.length).toBeGreaterThanOrEqual(2);
    });

    it("renders Forbidden screen when API returns 403 FORBIDDEN", async () => {
      const err: any = new Error("FORBIDDEN");
      err.status = 403;
      vi.mocked(api.getRequesterDashboard).mockRejectedValueOnce(err);

      render(<RequesterDashboard currentRequester={requesterUser} />);

      expect(await screen.findByText(/Access Forbidden/i)).toBeInTheDocument();
    });

    it("renders inline alert 'We couldn't load the dashboard.' with Retry button on failure", async () => {
      const user = userEvent.setup();
      vi.mocked(api.getRequesterDashboard)
        .mockRejectedValueOnce(new Error("Server error"))
        .mockResolvedValueOnce(populatedDashboardData);

      render(<RequesterDashboard currentRequester={requesterUser} />);

      expect(
        await screen.findByText(/We couldn't load the dashboard\./i)
      ).toBeInTheDocument();

      const retryBtn = screen.getByRole("button", { name: /Retry/i });
      await user.click(retryBtn);

      await waitFor(() => {
        expect(api.getRequesterDashboard).toHaveBeenCalledTimes(2);
      });
      expect(await screen.findByText("TICK-20260906-0001")).toBeInTheDocument();
    });
  });
});

