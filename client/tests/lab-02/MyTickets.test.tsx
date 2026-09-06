import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MyTickets } from "../../src/components/MyTickets.js";
import * as api from "../../src/api.js";

const mockRequester: api.RequesterUser = {
  id: 1,
  name: "Somchai Jaidee",
  email: "somchai.jai@kmutt.ac.th",
  department: "Engineering",
  isActive: true,
};

const mockCategories: api.Category[] = [
  { id: 1, name: "Account and Access", isActive: true },
  { id: 2, name: "Hardware", isActive: true },
];

const mockTickets: api.TicketListItem[] = [
  {
    id: 101,
    ticketNumber: "TICK-20260906-0001",
    summary: "Laptop battery drains in less than 30 minutes",
    requestedPriority: "HIGH",
    currentStatus: "NEW",
    createdAt: "2026-09-06T08:30:00.000Z",
    updatedAt: "2026-09-06T08:30:00.000Z",
    category: { id: 2, name: "Hardware" },
    _count: { attachments: 2 },
  },
  {
    id: 102,
    ticketNumber: "TICK-20260906-0002",
    summary: "Wi-Fi connection drops intermittently",
    requestedPriority: "LOW",
    currentStatus: "NEW",
    createdAt: "2026-09-06T09:00:00.000Z",
    updatedAt: "2026-09-06T09:00:00.000Z",
    category: { id: 1, name: "Account and Access" },
    _count: { attachments: 0 },
  },
];

const mockPaginatedResponse: api.PaginatedTickets = {
  items: mockTickets,
  pagination: {
    page: 1,
    pageSize: 10,
    totalItems: 2,
    totalPages: 1,
  },
};

describe("MyTickets Component UI Tests", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(api, "getCategories").mockResolvedValue(mockCategories);
    vi.spyOn(api, "getTickets").mockResolvedValue(mockPaginatedResponse);
  });

  // LIST-UI-01: Desktop table view vs mobile card view, including 8 columns and attachments count
  describe("LIST-UI-01: Desktop table vs mobile card view", () => {
    it("renders desktop table with 8 columns and active attachments count", async () => {
      render(<MyTickets currentRequester={mockRequester} />);

      // Wait for loading to finish and table to appear
      await waitFor(() => {
        expect(screen.getByTestId("tickets-table")).toBeInTheDocument();
      });

      // 8 columns verification
      expect(screen.getByRole("columnheader", { name: /Ticket #/i })).toBeInTheDocument();
      expect(screen.getByRole("columnheader", { name: /Summary/i })).toBeInTheDocument();
      expect(screen.getByRole("columnheader", { name: /Category/i })).toBeInTheDocument();
      expect(screen.getByRole("columnheader", { name: /Priority/i })).toBeInTheDocument();
      expect(screen.getByRole("columnheader", { name: /Status/i })).toBeInTheDocument();
      expect(screen.getByRole("columnheader", { name: /Attachments/i })).toBeInTheDocument();
      expect(screen.getByRole("columnheader", { name: /Date Created/i })).toBeInTheDocument();
      expect(screen.getByRole("columnheader", { name: /Action/i })).toBeInTheDocument();

      // Check ticket data rendered in table
      expect(screen.getAllByText("TICK-20260906-0001").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("Laptop battery drains in less than 30 minutes").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("Hardware").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("HIGH").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("NEW").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/📎 2/).length).toBeGreaterThanOrEqual(1);

      // Mobile cards container rendered with same tickets
      expect(screen.getByTestId("tickets-mobile-cards")).toBeInTheDocument();
    });

    it("clicking Create Ticket action button calls onNavigateToCreateTicket", async () => {
      const onNavigate = vi.fn();
      render(<MyTickets currentRequester={mockRequester} onNavigateToCreateTicket={onNavigate} />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /\+ New Ticket/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole("button", { name: /\+ New Ticket/i }));
      expect(onNavigate).toHaveBeenCalled();
    });
  });

  // LIST-UI-02: Empty tickets state
  describe("LIST-UI-02: Empty tickets state", () => {
    it("displays 'You haven't submitted any tickets yet.' when count=0 and no search/filter", async () => {
      vi.spyOn(api, "getTickets").mockResolvedValue({
        items: [],
        pagination: { page: 1, pageSize: 10, totalItems: 0, totalPages: 1 },
      });

      const onNavigate = vi.fn();
      render(<MyTickets currentRequester={mockRequester} onNavigateToCreateTicket={onNavigate} />);

      await waitFor(() => {
        expect(screen.getByText(/You haven't submitted any tickets yet\./i)).toBeInTheDocument();
      });

      // Contains a prominent Create Ticket button
      const emptyCreateBtn = screen.getByRole("button", { name: /Create Ticket/i });
      expect(emptyCreateBtn).toBeInTheDocument();
      fireEvent.click(emptyCreateBtn);
      expect(onNavigate).toHaveBeenCalled();
    });
  });

  // LIST-UI-03: No results search state
  describe("LIST-UI-03: No results search state", () => {
    it("displays 'No tickets match your search criteria.' with 'Clear Filters' button when search has no results", async () => {
      // First return regular tickets
      const getTicketsSpy = vi.spyOn(api, "getTickets");

      render(<MyTickets currentRequester={mockRequester} />);

      await waitFor(() => {
        expect(screen.getByTestId("tickets-table")).toBeInTheDocument();
      });

      // Now mock no results for search query
      getTicketsSpy.mockResolvedValue({
        items: [],
        pagination: { page: 1, pageSize: 10, totalItems: 0, totalPages: 1 },
      });

      const searchInput = screen.getByPlaceholderText(/Search by summary or ticket #\.\.\./i);
      await waitFor(() => {
        fireEvent.change(searchInput, { target: { value: "NonExistentTicket999" } });
      });

      await waitFor(() => {
        expect(screen.getByText(/No tickets match your search criteria\./i)).toBeInTheDocument();
      });

      // Must have Clear Filters button
      const clearBtn = screen.getByRole("button", { name: /Clear Filters/i });
      expect(clearBtn).toBeInTheDocument();

      // Clicking Clear Filters resets the search
      await waitFor(() => {
        fireEvent.click(clearBtn);
      });
      expect(searchInput).toHaveValue("");
    });
  });

  // Additional interaction tests: sorting, filtering, pagination, and error state
  describe("Additional UI Interactions", () => {
    it("renders safe error message when API fails", async () => {
      vi.spyOn(api, "getTickets").mockRejectedValue(new Error("Database connection lost"));

      render(<MyTickets currentRequester={mockRequester} />);

      await waitFor(() => {
        expect(screen.getByRole("alert")).toBeInTheDocument();
        expect(screen.getByText(/Database connection lost/i)).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /Retry/i })).toBeInTheDocument();
      });
    });

    it("clicking sortable column headers toggles sortOrder and calls API", async () => {
      const getTicketsSpy = vi.spyOn(api, "getTickets");
      render(<MyTickets currentRequester={mockRequester} />);

      await waitFor(() => {
        expect(screen.getByTestId("tickets-table")).toBeInTheDocument();
      });

      const summaryHeader = screen.getByRole("columnheader", { name: /Summary/i });
      fireEvent.click(summaryHeader);

      await waitFor(() => {
        expect(getTicketsSpy).toHaveBeenCalledWith(
          expect.objectContaining({ sortBy: "summary", sortOrder: "asc" }),
          mockRequester.id
        );
      });
    });

    it("changing category filter calls getTickets with categoryId", async () => {
      const getTicketsSpy = vi.spyOn(api, "getTickets");
      render(<MyTickets currentRequester={mockRequester} />);

      await waitFor(() => {
        expect(screen.getByLabelText(/Category Filter/i)).toBeInTheDocument();
      });

      const categorySelect = screen.getByLabelText(/Category Filter/i);
      fireEvent.change(categorySelect, { target: { value: "2" } });

      await waitFor(() => {
        expect(getTicketsSpy).toHaveBeenCalledWith(
          expect.objectContaining({ categoryId: 2 }),
          mockRequester.id
        );
      });
    });

    it("renders Priority Filter dropdown and changing priority calls getTickets with priority", async () => {
      const getTicketsSpy = vi.spyOn(api, "getTickets");
      render(<MyTickets currentRequester={mockRequester} />);

      await waitFor(() => {
        expect(screen.getByLabelText(/Category Filter/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Priority Filter/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Status Filter/i)).toBeInTheDocument();
      });

      const prioritySelect = screen.getByLabelText(/Priority Filter/i);
      expect(screen.getByRole("option", { name: /All Priorities/i })).toBeInTheDocument();
      expect(screen.getByRole("option", { name: /Low/i })).toBeInTheDocument();
      expect(screen.getByRole("option", { name: /Medium/i })).toBeInTheDocument();
      expect(screen.getByRole("option", { name: /High/i })).toBeInTheDocument();

      fireEvent.change(prioritySelect, { target: { value: "HIGH" } });

      await waitFor(() => {
        expect(getTicketsSpy).toHaveBeenCalledWith(
          expect.objectContaining({ priority: "HIGH" }),
          mockRequester.id
        );
      });
    });
  });
});
