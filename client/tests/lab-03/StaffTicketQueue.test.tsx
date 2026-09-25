import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StaffTicketQueue } from "../../src/components/StaffTicketQueue.js";
import * as api from "../../src/api.js";

// Mock the API module
vi.mock("../../src/api.js", async () => {
  const actual = await vi.importActual("../../src/api.js");
  return {
    ...actual,
    getStaffTickets: vi.fn(),
    getCategories: vi.fn(),
  };
});

describe("StaffTicketQueue Component UI Tests (QUEUE-UI-01, QUEUE-UI-02)", () => {
  const mockCategories: api.Category[] = [
    { id: 1, name: "Network" },
    { id: 2, name: "Hardware" },
    { id: 3, name: "Software" },
  ];

  const mockTickets: api.StaffQueueTicket[] = [
    {
      id: 101,
      ticketNumber: "TICK-20260916-0001",
      summary: "VPN connection drops frequently when working from remote office",
      category: { id: 1, name: "Network" },
      requestedPriority: "HIGH",
      itPriority: "HIGH",
      status: "OPEN",
      owner: { id: 2, name: "Witchai Tech" },
      requester: { id: 1, name: "Somchai Jaidee" },
      isRequesterResolved: false,
      createdAt: "2026-09-16T12:00:00.000Z",
      updatedAt: "2026-09-16T12:10:00.000Z",
    },
    {
      id: 102,
      ticketNumber: "TICK-20260916-0002",
      summary: "Monitor screen flickering horizontally during high brightness",
      category: { id: 2, name: "Hardware" },
      requestedPriority: "LOW",
      itPriority: "LOW",
      status: "NEW",
      owner: null,
      requester: { id: 4, name: "Suda Rakdee" },
      isRequesterResolved: true,
      createdAt: "2026-09-17T09:30:00.000Z",
      updatedAt: "2026-09-17T09:30:00.000Z",
    },
  ];

  const mockQueueResponse: api.StaffQueueResponse = {
    items: mockTickets,
    pagination: {
      page: 1,
      pageSize: 10,
      totalItems: 2,
      totalPages: 1,
    },
  };

  const defaultUser: api.User = {
    id: 2,
    name: "Witchai Tech",
    email: "staff.witchai@kmutt.ac.th",
    role: "IT_STAFF",
    mustChangePassword: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.getCategories).mockResolvedValue(mockCategories);
    vi.mocked(api.getStaffTickets).mockResolvedValue(mockQueueResponse);
  });

  // -------------------------------------------------------------------------
  // QUEUE-UI-01: Table Rendering, 9 Columns, Badges, Requester Resolved, Mobile Cards
  // -------------------------------------------------------------------------
  describe("QUEUE-UI-01: Desktop Table & Mobile Card Rendering", () => {
    it("renders desktop table with 9 columns and badge states", async () => {
      render(<StaffTicketQueue currentUser={defaultUser} onOpenTicket={vi.fn()} />);

      // Wait for table to load
      await waitFor(() => {
        expect(screen.getByTestId("staff-queue-table")).toBeInTheDocument();
      });

      // Verify header title and total active count badge
      expect(screen.getByText("IT Support Ticket Queue")).toBeInTheDocument();
      expect(screen.getByTestId("queue-count-badge")).toHaveTextContent("2");

      // Verify desktop table columns (9 columns)
      const table = screen.getByTestId("staff-queue-table");
      expect(table).toHaveTextContent("Ticket #");
      expect(table).toHaveTextContent("Created");
      expect(table).toHaveTextContent("Summary");
      expect(table).toHaveTextContent("Category");
      expect(table).toHaveTextContent("Requested Priority");
      expect(table).toHaveTextContent("IT Priority");
      expect(table).toHaveTextContent("Status");
      expect(table).toHaveTextContent("Owner");
      expect(table).toHaveTextContent("Actions");

      // Check ticket 101 row
      expect(table).toHaveTextContent("TICK-20260916-0001");
      expect(table).toHaveTextContent("Witchai Tech");

      // Check ticket 102 row (unassigned owner pill and Requester Resolved badge)
      expect(table).toHaveTextContent("TICK-20260916-0002");
      expect(table).toHaveTextContent("Unassigned");
      expect(table).toHaveTextContent("Requester Resolved");
    });

    it("renders mobile card layout with required elements", async () => {
      render(<StaffTicketQueue currentUser={defaultUser} onOpenTicket={vi.fn()} />);

      await waitFor(() => {
        expect(screen.getByTestId("staff-queue-mobile-cards")).toBeInTheDocument();
      });

      const mobileCards = screen.getByTestId("staff-queue-mobile-cards");
      expect(mobileCards).toHaveTextContent("TICK-20260916-0001");
      expect(mobileCards).toHaveTextContent("TICK-20260916-0002");
      expect(mobileCards).toHaveTextContent("Requester Resolved");
    });

    it("triggers onOpenTicket when Open Ticket button is clicked", async () => {
      const handleOpen = vi.fn();
      render(<StaffTicketQueue currentUser={defaultUser} onOpenTicket={handleOpen} />);

      await waitFor(() => {
        expect(screen.getByTestId("staff-queue-table")).toBeInTheDocument();
      });

      const openButtons = screen.getAllByRole("button", { name: /Open Ticket/i });
      fireEvent.click(openButtons[0]);

      expect(handleOpen).toHaveBeenCalledWith(101);
    });
  });

  // -------------------------------------------------------------------------
  // QUEUE-UI-02: Toolbar, Filtering, Empty, No Results, Forbidden, Loading
  // -------------------------------------------------------------------------
  describe("QUEUE-UI-02: Search Toolbar and UI States", () => {
    it("renders loading skeleton during initial fetch", () => {
      // Delay resolution
      vi.mocked(api.getStaffTickets).mockReturnValue(new Promise(() => {}));

      render(<StaffTicketQueue currentUser={defaultUser} onOpenTicket={vi.fn()} />);

      expect(screen.getByTestId("queue-loading-skeleton")).toBeInTheDocument();
    });

    it("renders empty state when there are no tickets in the system", async () => {
      vi.mocked(api.getStaffTickets).mockResolvedValue({
        items: [],
        pagination: { page: 1, pageSize: 10, totalItems: 0, totalPages: 1 },
      });

      render(<StaffTicketQueue currentUser={defaultUser} onOpenTicket={vi.fn()} />);

      await waitFor(() => {
        expect(screen.getByText("No tickets currently in the system.")).toBeInTheDocument();
      });
    });

    it("renders no-search-results state with Clear Filters button when search yields nothing", async () => {
      // Initial render with tickets
      const { rerender } = render(
        <StaffTicketQueue currentUser={defaultUser} onOpenTicket={vi.fn()} />
      );

      await waitFor(() => {
        expect(screen.getByTestId("staff-queue-table")).toBeInTheDocument();
      });

      // Now return 0 items when filtered
      vi.mocked(api.getStaffTickets).mockResolvedValue({
        items: [],
        pagination: { page: 1, pageSize: 10, totalItems: 0, totalPages: 1 },
      });

      const searchInput = screen.getByPlaceholderText(/Search ticket #, summary, requester/i);
      await userEvent.type(searchInput, "nonexistent query");

      await waitFor(() => {
        expect(screen.getByText("No tickets match your filter criteria.")).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /Clear Filters/i })).toBeInTheDocument();
      });

      // Clicking Clear Filters resets the search and triggers reload
      const clearBtn = screen.getByRole("button", { name: /Clear Filters/i });
      fireEvent.click(clearBtn);

      await waitFor(() => {
        expect(searchInput).toHaveValue("");
      });
    });

    it("renders forbidden state when API returns FORBIDDEN (403)", async () => {
      vi.mocked(api.getStaffTickets).mockRejectedValue(new Error("FORBIDDEN"));

      render(<StaffTicketQueue currentUser={defaultUser} onOpenTicket={vi.fn()} />);

      await waitFor(() => {
        expect(screen.getByText(/Access Forbidden/i)).toBeInTheDocument();
        expect(screen.getByText(/You do not have permission to view the IT Staff ticket queue/i)).toBeInTheDocument();
      });
    });

    it("renders failure state with retry button when API returns generic error", async () => {
      vi.mocked(api.getStaffTickets).mockRejectedValue(new Error("Network failed"));

      render(<StaffTicketQueue currentUser={defaultUser} onOpenTicket={vi.fn()} />);

      await waitFor(() => {
        expect(screen.getByText(/Failed to load ticket queue/i)).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /Try Again/i })).toBeInTheDocument();
      });

      // Clicking retry re-calls the API
      vi.mocked(api.getStaffTickets).mockResolvedValue(mockQueueResponse);
      const retryBtn = screen.getByRole("button", { name: /Try Again/i });
      fireEvent.click(retryBtn);

      await waitFor(() => {
        expect(screen.getByTestId("staff-queue-table")).toBeInTheDocument();
      });
    });

    it("filters by ownership (My Assigned Tickets vs Unassigned)", async () => {
      render(<StaffTicketQueue currentUser={defaultUser} onOpenTicket={vi.fn()} />);

      await waitFor(() => {
        expect(screen.getByTestId("staff-queue-table")).toBeInTheDocument();
      });

      const ownerSelect = screen.getByLabelText(/Ownership/i);
      fireEvent.change(ownerSelect, { target: { value: "mine" } });

      await waitFor(() => {
        expect(api.getStaffTickets).toHaveBeenCalledWith(
          expect.objectContaining({ ownerId: defaultUser.id })
        );
      });
    });
  });
});
