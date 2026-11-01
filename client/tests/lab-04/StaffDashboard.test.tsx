import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StaffDashboard } from "../../src/components/StaffDashboard.js";
import { AppShell } from "../../src/components/AppShell.js";
import * as api from "../../src/api.js";
import * as AuthContextModule from "../../src/context/AuthContext.js";

vi.mock("../../src/api.js", async () => {
  const actual = await vi.importActual("../../src/api.js");
  return {
    ...actual,
    getStaffDashboard: vi.fn(),
    getAdminUsers: vi.fn(),
  };
});

describe("StaffDashboard & Navigation UI Tests (SDASH-UI-01..03, NAV-UI-01)", () => {
  const staffUser: api.User = {
    id: 2,
    name: "Witchai Tech",
    email: "staff.witchai@kmutt.ac.th",
    role: "IT_STAFF",
    mustChangePassword: false,
  };

  const adminUser: api.User = {
    id: 1,
    name: "Central Administrator",
    email: "admin@kmutt.ac.th",
    role: "ADMINISTRATOR",
    mustChangePassword: false,
  };

  const requesterUser: api.User = {
    id: 6,
    name: "Somchai Jaidee",
    email: "somchai.jai@kmutt.ac.th",
    role: "REQUESTER",
    mustChangePassword: false,
  };

  const populatedStaffDashboard: api.StaffDashboardResponse = {
    generatedAt: "2026-11-01T12:00:00.000Z",
    metrics: {
      byStatus: {
        NEW: { count: 7, drillDown: { status: "NEW" } },
        OPEN: { count: 2, drillDown: { status: "OPEN" } },
        IN_PROGRESS: { count: 2, drillDown: { status: "IN_PROGRESS" } },
        WAITING_FOR_REQUESTER: { count: 1, drillDown: { status: "WAITING_FOR_REQUESTER" } },
        RESOLVED: { count: 1, drillDown: { status: "RESOLVED" } },
        CLOSED: { count: 1, drillDown: { status: "CLOSED" } },
        REOPENED: { count: 1, drillDown: { status: "REOPENED" } },
        CANCELLED: { count: 1, drillDown: { status: "CANCELLED" } },
      },
      unassigned: {
        count: 6,
        drillDown: {
          ownerId: "unassigned",
          status: "NEW,OPEN,IN_PROGRESS,WAITING_FOR_REQUESTER,REOPENED",
        },
      },
      myOwned: {
        count: 4,
        drillDown: {
          ownerId: 2,
          status: "NEW,OPEN,IN_PROGRESS,WAITING_FOR_REQUESTER,REOPENED",
        },
      },
      byItPriority: {
        URGENT: {
          count: 2,
          drillDown: {
            priority: "URGENT",
            status: "NEW,OPEN,IN_PROGRESS,WAITING_FOR_REQUESTER,REOPENED",
          },
        },
        HIGH: {
          count: 3,
          drillDown: {
            priority: "HIGH",
            status: "NEW,OPEN,IN_PROGRESS,WAITING_FOR_REQUESTER,REOPENED",
          },
        },
        MEDIUM: {
          count: 4,
          drillDown: {
            priority: "MEDIUM",
            status: "NEW,OPEN,IN_PROGRESS,WAITING_FOR_REQUESTER,REOPENED",
          },
        },
        LOW: {
          count: 4,
          drillDown: {
            priority: "LOW",
            status: "NEW,OPEN,IN_PROGRESS,WAITING_FOR_REQUESTER,REOPENED",
          },
        },
      },
      requesterResolvedPending: {
        count: 3,
        drillDown: {
          status: "OPEN,IN_PROGRESS,WAITING_FOR_REQUESTER,REOPENED",
          requesterResolved: true,
        },
      },
      myFollowUps: {
        count: 1,
      },
    },
    urgentTickets: [
      {
        id: 14,
        ticketNumber: "TICK-20260906-0014",
        summary: "Display flickering reappeared after sleep mode",
        itPriority: "URGENT",
        status: "REOPENED",
        ownerName: "Witchai Tech",
        createdAt: "2026-09-07T10:00:00.000Z",
      },
      {
        id: 16,
        ticketNumber: "TICK-20260906-0016",
        summary: "Faculty VPN disconnection during off-campus grading",
        itPriority: "URGENT",
        status: "IN_PROGRESS",
        ownerName: "Kamon Support",
        createdAt: "2026-09-07T13:00:00.000Z",
      },
    ],
    recentlyUpdated: [
      {
        id: 1,
        ticketNumber: "TICK-20260906-0001",
        summary: "Laptop battery drains in less than 30 minutes",
        status: "IN_PROGRESS",
        updatedAt: "2026-11-01T11:00:00.000Z",
      },
    ],
    myRecentActions: [
      {
        id: 31,
        ticketId: 1,
        ticketNumber: "TICK-20260906-0001",
        descriptionPreview: "Diagnosed hardware malfunction and replaced faulty battery",
        followUpRequired: true,
        actionDateTime: "2026-09-06T09:30:00.000Z",
      },
    ],
  };

  const zeroStaffDashboard: api.StaffDashboardResponse = {
    generatedAt: "2026-11-01T12:00:00.000Z",
    metrics: {
      byStatus: {
        NEW: { count: 0, drillDown: { status: "NEW" } },
        OPEN: { count: 0, drillDown: { status: "OPEN" } },
        IN_PROGRESS: { count: 0, drillDown: { status: "IN_PROGRESS" } },
        WAITING_FOR_REQUESTER: { count: 0, drillDown: { status: "WAITING_FOR_REQUESTER" } },
        RESOLVED: { count: 0, drillDown: { status: "RESOLVED" } },
        CLOSED: { count: 0, drillDown: { status: "CLOSED" } },
        REOPENED: { count: 0, drillDown: { status: "REOPENED" } },
        CANCELLED: { count: 0, drillDown: { status: "CANCELLED" } },
      },
      unassigned: {
        count: 0,
        drillDown: {
          ownerId: "unassigned",
          status: "NEW,OPEN,IN_PROGRESS,WAITING_FOR_REQUESTER,REOPENED",
        },
      },
      myOwned: {
        count: 0,
        drillDown: {
          ownerId: 2,
          status: "NEW,OPEN,IN_PROGRESS,WAITING_FOR_REQUESTER,REOPENED",
        },
      },
      byItPriority: {
        URGENT: {
          count: 0,
          drillDown: {
            priority: "URGENT",
            status: "NEW,OPEN,IN_PROGRESS,WAITING_FOR_REQUESTER,REOPENED",
          },
        },
        HIGH: {
          count: 0,
          drillDown: {
            priority: "HIGH",
            status: "NEW,OPEN,IN_PROGRESS,WAITING_FOR_REQUESTER,REOPENED",
          },
        },
        MEDIUM: {
          count: 0,
          drillDown: {
            priority: "MEDIUM",
            status: "NEW,OPEN,IN_PROGRESS,WAITING_FOR_REQUESTER,REOPENED",
          },
        },
        LOW: {
          count: 0,
          drillDown: {
            priority: "LOW",
            status: "NEW,OPEN,IN_PROGRESS,WAITING_FOR_REQUESTER,REOPENED",
          },
        },
      },
      requesterResolvedPending: {
        count: 0,
        drillDown: {
          status: "OPEN,IN_PROGRESS,WAITING_FOR_REQUESTER,REOPENED",
          requesterResolved: true,
        },
      },
      myFollowUps: {
        count: 0,
      },
    },
    urgentTickets: [],
    recentlyUpdated: [],
    myRecentActions: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.getAdminUsers).mockResolvedValue([
      {
        id: 1,
        name: "Central Administrator",
        email: "admin@kmutt.ac.th",
        role: "ADMINISTRATOR",
        isActive: true,
        mustChangePassword: false,
        createdAt: "2026-09-01T00:00:00.000Z",
      },
      {
        id: 2,
        name: "Witchai Tech",
        email: "staff.witchai@kmutt.ac.th",
        role: "IT_STAFF",
        isActive: true,
        mustChangePassword: false,
        createdAt: "2026-09-01T00:00:00.000Z",
      },
      {
        id: 5,
        name: "Former Staff",
        email: "staff.inactive@kmutt.ac.th",
        role: "IT_STAFF",
        isActive: false,
        mustChangePassword: false,
        createdAt: "2026-09-01T00:00:00.000Z",
      },
    ]);
  });

  // =========================================================================
  // SDASH-UI-01: Cards, lists, and drill-down links render from API data
  // =========================================================================
  describe("SDASH-UI-01: Metric cards, attention row, lists, and drill-down links", () => {
    it("renders 5 primary metric cards, 3 attention cards, Urgent/Recently Updated tabs, My Recent Actions Taken, and accessible card names", async () => {
      const user = userEvent.setup();
      const onDrillDown = vi.fn();
      vi.mocked(api.getStaffDashboard).mockResolvedValueOnce(populatedStaffDashboard);

      render(
        <StaffDashboard currentUser={staffUser} onDrillDownToQueue={onDrillDown} />
      );

      expect(await screen.findByText(/Welcome back, Witchai/i)).toBeInTheDocument();

      // 5 Primary Metric Cards with accessible names ("label: value. View in queue.")
      const newCard = screen.getByRole("link", {
        name: /New tickets:\s*7\.\s*View in queue\./i,
      });
      expect(newCard).toBeInTheDocument();
      expect(
        screen.getByRole("link", { name: /Open tickets:\s*2\.\s*View in queue\./i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("link", { name: /In Progress tickets:\s*2\.\s*View in queue\./i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("link", {
          name: /Waiting for Requester tickets:\s*1\.\s*View in queue\./i,
        })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("link", { name: /My Owned tickets:\s*4\.\s*View in queue\./i })
      ).toBeInTheDocument();

      // 3 Attention Cards
      const unassignedCard = screen.getByRole("link", {
        name: /Unassigned:\s*6\.\s*View in queue\./i,
      });
      const urgentCard = screen.getByRole("link", {
        name: /Urgent \(IT Priority\):\s*2\.\s*View in queue\./i,
      });
      const reqResolvedCard = screen.getByRole("link", {
        name: /Requester Resolved.*:\s*3\.\s*View in queue\./i,
      });
      expect(unassignedCard).toBeInTheDocument();
      expect(urgentCard).toBeInTheDocument();
      expect(reqResolvedCard).toBeInTheDocument();

      // Clicking cards passes exact drillDown params
      await user.click(newCard);
      expect(onDrillDown).toHaveBeenCalledWith({ status: "NEW" });

      await user.click(unassignedCard);
      expect(onDrillDown).toHaveBeenCalledWith({
        ownerId: "unassigned",
        status: "NEW,OPEN,IN_PROGRESS,WAITING_FOR_REQUESTER,REOPENED",
      });

      await user.click(reqResolvedCard);
      expect(onDrillDown).toHaveBeenCalledWith({
        status: "OPEN,IN_PROGRESS,WAITING_FOR_REQUESTER,REOPENED",
        requesterResolved: true,
      });

      // Lists: Urgent Tickets & My Recent Actions Taken
      expect(screen.getByText("TICK-20260906-0014")).toBeInTheDocument();
      expect(
        screen.getByText("Diagnosed hardware malfunction and replaced faulty battery")
      ).toBeInTheDocument();
      expect(screen.getByText(/Follow-up/i)).toBeInTheDocument();
    });
  });

  // =========================================================================
  // SDASH-UI-02: Loading, empty (0), forbidden, failure + Retry states
  // =========================================================================
  describe("SDASH-UI-02: Loading, empty (0), forbidden, and failure + Retry states", () => {
    it("renders loading skeleton with aria-busy='true' while fetching", () => {
      vi.mocked(api.getStaffDashboard).mockReturnValueOnce(new Promise(() => {}));

      render(<StaffDashboard currentUser={staffUser} />);

      const loadingEl = screen.getByTestId("staff-dashboard-loading");
      expect(loadingEl).toHaveAttribute("aria-busy", "true");
    });

    it("renders 0 counts without drill-down links and 'Nothing to show yet.' when lists are empty", async () => {
      const user = userEvent.setup();
      const onDrillDown = vi.fn();
      vi.mocked(api.getStaffDashboard).mockResolvedValueOnce(zeroStaffDashboard);

      render(
        <StaffDashboard currentUser={staffUser} onDrillDownToQueue={onDrillDown} />
      );

      expect(await screen.findByText(/Welcome back, Witchai/i)).toBeInTheDocument();

      // Zero-count cards have no drill-down links
      expect(screen.queryByRole("link", { name: /New tickets:/i })).toBeNull();
      await user.click(screen.getByText("New"));
      expect(onDrillDown).not.toHaveBeenCalled();

      // Empty lists show "Nothing to show yet."
      const emptyMsgs = screen.getAllByText(/Nothing to show yet\./i);
      expect(emptyMsgs.length).toBeGreaterThanOrEqual(2);
    });

    it("renders Forbidden screen when API returns 403 FORBIDDEN", async () => {
      const err: any = new Error("FORBIDDEN");
      err.status = 403;
      vi.mocked(api.getStaffDashboard).mockRejectedValueOnce(err);

      render(<StaffDashboard currentUser={staffUser} />);

      expect(await screen.findByText(/Access Forbidden/i)).toBeInTheDocument();
    });

    it("renders 'We couldn't load the dashboard.' alert with Retry button and keeps previously loaded data on refresh error", async () => {
      const user = userEvent.setup();
      vi.mocked(api.getStaffDashboard)
        .mockRejectedValueOnce(new Error("Network error"))
        .mockResolvedValueOnce(populatedStaffDashboard)
        .mockRejectedValueOnce(new Error("Refresh failed"));

      render(<StaffDashboard currentUser={staffUser} />);

      // Initial failure
      expect(
        await screen.findByText(/We couldn't load the dashboard\./i)
      ).toBeInTheDocument();

      const retryBtn = screen.getByRole("button", { name: /Retry/i });
      await user.click(retryBtn);

      // Data loads after Retry
      expect(await screen.findByText("TICK-20260906-0014")).toBeInTheDocument();

      // Refresh fails -> inline alert appears AND previously loaded data is kept
      const refreshBtn = screen.getByRole("button", { name: /Refresh/i });
      await user.click(refreshBtn);

      expect(
        await screen.findByText(/We couldn't load the dashboard\./i)
      ).toBeInTheDocument();
      expect(screen.getByText("TICK-20260906-0014")).toBeInTheDocument();
    });
  });

  // =========================================================================
  // SDASH-UI-03: Refresh button busy state; admin extra card
  // =========================================================================
  describe("SDASH-UI-03: Refresh button busy state and Administrator extra card", () => {
    it("shows busy state on Refresh button while re-fetching and renders Users card for Administrator", async () => {
      const user = userEvent.setup();
      let resolveRefresh!: (val: api.StaffDashboardResponse) => void;
      const refreshPromise = new Promise<api.StaffDashboardResponse>((res) => {
        resolveRefresh = res;
      });

      vi.mocked(api.getStaffDashboard)
        .mockResolvedValueOnce(populatedStaffDashboard)
        .mockReturnValueOnce(refreshPromise);

      const onOpenUsers = vi.fn();
      render(
        <StaffDashboard
          currentUser={adminUser}
          onOpenUserManagement={onOpenUsers}
        />
      );

      expect(await screen.findByText(/Welcome back, Central/i)).toBeInTheDocument();

      // Admin extra card: "Users: 2 active / 1 inactive"
      const usersCard = await screen.findByText(/Users:\s*2 active \/ 1 inactive/i);
      expect(usersCard).toBeInTheDocument();
      await user.click(usersCard);
      expect(onOpenUsers).toHaveBeenCalledTimes(1);

      // Click Refresh -> button disables / shows busy state
      const refreshBtn = screen.getByRole("button", { name: /Refresh/i });
      await user.click(refreshBtn);
      expect(refreshBtn).toBeDisabled();

      resolveRefresh(populatedStaffDashboard);
      await waitFor(() => {
        expect(refreshBtn).not.toBeDisabled();
      });
    });
  });

  // =========================================================================
  // NAV-UI-01: Role-specific nav links and aria-current on active page
  // =========================================================================
  describe("NAV-UI-01: Role-specific navigation links and aria-current='page'", () => {
    it("renders role-specific header links in order and sets aria-current='page' on active page", () => {
      const useAuthSpy = vi.spyOn(AuthContextModule, "useAuth");

      // 1. Requester: Dashboard · My Tickets · Create Ticket
      useAuthSpy.mockReturnValue({
        user: requesterUser,
        isLoading: false,
        login: vi.fn(),
        logout: vi.fn(),
        refreshUser: vi.fn(),
      } as any);

      const { unmount: unmountReq } = render(
        <AppShell activeNav="dashboard">
          <div>Child</div>
        </AppShell>
      );

      const reqDashLink = screen.getByRole("button", { name: "Dashboard" });
      const reqTicketsLink = screen.getByRole("button", { name: "My Tickets" });
      const reqCreateLink = screen.getByRole("button", { name: "Create Ticket" });
      expect(reqDashLink).toHaveAttribute("aria-current", "page");
      expect(reqTicketsLink).not.toHaveAttribute("aria-current", "page");
      expect(reqCreateLink).not.toHaveAttribute("aria-current", "page");
      unmountReq();

      // 2. IT Staff: Dashboard · Ticket Queue
      useAuthSpy.mockReturnValue({
        user: staffUser,
        isLoading: false,
        login: vi.fn(),
        logout: vi.fn(),
        refreshUser: vi.fn(),
      } as any);

      const { unmount: unmountStaff } = render(
        <AppShell activeNav="staff-queue">
          <div>Child</div>
        </AppShell>
      );

      expect(screen.getByRole("button", { name: "Dashboard" })).not.toHaveAttribute(
        "aria-current",
        "page"
      );
      expect(screen.getByRole("button", { name: "Ticket Queue" })).toHaveAttribute(
        "aria-current",
        "page"
      );
      expect(screen.queryByRole("button", { name: "User Management" })).toBeNull();
      unmountStaff();

      // 3. Administrator: Dashboard · Ticket Queue · User Management
      useAuthSpy.mockReturnValue({
        user: adminUser,
        isLoading: false,
        login: vi.fn(),
        logout: vi.fn(),
        refreshUser: vi.fn(),
      } as any);

      const { unmount: unmountAdmin } = render(
        <AppShell activeNav="admin-users">
          <div>Child</div>
        </AppShell>
      );

      expect(screen.getByRole("button", { name: "Dashboard" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Ticket Queue" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "User Management" })).toHaveAttribute(
        "aria-current",
        "page"
      );
      unmountAdmin();
      useAuthSpy.mockRestore();
    });
  });
});

