import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StaffTicketDetail } from "../../src/components/StaffTicketDetail.js";
import * as api from "../../src/api.js";

// Mock API module
vi.mock("../../src/api.js", async () => {
  const actual = await vi.importActual("../../src/api.js");
  return {
    ...actual,
    getTicketDetail: vi.fn(),
    getInternalNotes: vi.fn(),
    postInternalNote: vi.fn(),
    postPublicComment: vi.fn(),
    updateTicketOwner: vi.fn(),
    updateTicketPriority: vi.fn(),
    updateTicketStatus: vi.fn(),
    getStaffUsers: vi.fn(),
  };
});

describe("StaffTicketDetail Component UI Tests (DETAIL-UI-01)", () => {
  const currentUser: api.User = {
    id: 2,
    name: "Witchai Tech",
    email: "staff.witchai@kmutt.ac.th",
    role: "IT_STAFF",
    mustChangePassword: false,
  };

  const otherStaffUser: api.User = {
    id: 3,
    name: "Kamon Support",
    email: "staff.kamon@kmutt.ac.th",
    role: "IT_STAFF",
    mustChangePassword: false,
  };

  const mockStaffUsers: api.User[] = [currentUser, otherStaffUser];

  const baseTicket: api.TicketDetail = {
    id: 101,
    ticketNumber: "TICK-20260916-0001",
    requesterId: 1,
    categoryId: 1,
    relatedSystemId: 1,
    summary: "VPN connection drops every 5 minutes",
    description: "Whenever I connect to the university VPN from off-campus, the tunnel drops abruptly.",
    requestedPriority: "HIGH",
    itPriority: "HIGH",
    currentStatus: "NEW",
    isRequesterResolved: false,
    ownerId: null,
    owner: null,
    createdAt: "2026-09-16T12:00:00.000Z",
    updatedAt: "2026-09-16T12:00:00.000Z",
    requester: {
      id: 1,
      name: "Somchai Jaidee",
      email: "somchai.jai@kmutt.ac.th",
      department: "General",
    },
    category: { id: 1, name: "Network" },
    relatedSystem: { id: 1, name: "VPN Gateway" },
    attachments: [
      {
        id: 1,
        ticketId: 101,
        originalFilename: "vpn_error.png",
        mimeType: "image/png",
        sizeBytes: 1024,
        isRemoved: false,
        uploadedAt: "2026-09-16T12:05:00.000Z",
      },
    ],
    publicComments: [
      {
        id: 1,
        ticketId: 101,
        authorId: 1,
        authorName: "Somchai Jaidee",
        authorRole: "REQUESTER",
        content: "Here is the screenshot of the error.",
        createdAt: "2026-09-16T12:10:00.000Z",
      },
    ],
  };

  const mockInternalNotes: api.InternalNoteItem[] = [
    {
      id: 1,
      ticketId: 101,
      authorId: 2,
      authorName: "Witchai Tech",
      content: "Investigated firewall logs on core switch. Detected intermittent packet loss.",
      createdAt: "2026-09-16T12:35:00.000Z",
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.getTicketDetail).mockResolvedValue(baseTicket);
    vi.mocked(api.getInternalNotes).mockResolvedValue(mockInternalNotes);
    vi.mocked(api.getStaffUsers).mockResolvedValue(mockStaffUsers);
  });

  // =========================================================================
  // 1. Ticket Ownership Bar (Claim & Reassign)
  // =========================================================================
  describe("Ticket Ownership Bar (Claim & Reassign Controls)", () => {
    it("renders 'Unassigned' and 'Claim Ticket' button when owner is null", async () => {
      render(<StaffTicketDetail ticketId={101} currentUser={currentUser} />);

      await waitFor(() => {
        expect(screen.getByTestId("current-owner-display")).toHaveTextContent("Unassigned");
      });

      expect(screen.getByTestId("claim-ticket-btn")).toBeInTheDocument();
      expect(screen.getByTestId("claim-ticket-btn")).toHaveTextContent("Claim Ticket");
    });

    it("claims ticket when 'Claim Ticket' is clicked", async () => {
      vi.mocked(api.updateTicketOwner).mockResolvedValue({
        id: 101,
        ticketNumber: "TICK-20260916-0001",
        ownerId: currentUser.id,
        owner: { id: currentUser.id, name: currentUser.name },
      });

      render(<StaffTicketDetail ticketId={101} currentUser={currentUser} />);

      await waitFor(() => {
        expect(screen.getByTestId("claim-ticket-btn")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId("claim-ticket-btn"));

      await waitFor(() => {
        expect(api.updateTicketOwner).toHaveBeenCalledWith(101, currentUser.id);
        expect(screen.getByTestId("current-owner-display")).toHaveTextContent(currentUser.name);
      });
    });

    it("reassigns ticket to another active IT Staff member via Reassign control", async () => {
      const ownedTicket = {
        ...baseTicket,
        ownerId: currentUser.id,
        owner: { id: currentUser.id, name: currentUser.name },
      };
      vi.mocked(api.getTicketDetail).mockResolvedValue(ownedTicket);
      vi.mocked(api.updateTicketOwner).mockResolvedValue({
        id: 101,
        ticketNumber: "TICK-20260916-0001",
        ownerId: otherStaffUser.id,
        owner: { id: otherStaffUser.id, name: otherStaffUser.name },
      });

      render(<StaffTicketDetail ticketId={101} currentUser={currentUser} />);

      await waitFor(() => {
        expect(screen.getByTestId("current-owner-display")).toHaveTextContent(currentUser.name);
      });

      const reassignSelect = screen.getByTestId("reassign-owner-select");
      fireEvent.change(reassignSelect, { target: { value: String(otherStaffUser.id) } });

      await waitFor(() => {
        expect(api.updateTicketOwner).toHaveBeenCalledWith(101, otherStaffUser.id);
        expect(screen.getByTestId("current-owner-display")).toHaveTextContent(otherStaffUser.name);
      });
    });
  });

  // =========================================================================
  // 2. IT Priority Editable Badge / Control
  // =========================================================================
  describe("IT Priority Control", () => {
    it("renders editable IT Priority control and allows updating priority", async () => {
      vi.mocked(api.updateTicketPriority).mockResolvedValue({
        id: 101,
        itPriority: "URGENT",
      });

      render(<StaffTicketDetail ticketId={101} currentUser={currentUser} />);

      await waitFor(() => {
        expect(screen.getByTestId("it-priority-select")).toHaveValue("HIGH");
      });

      // Verify Requested Priority is displayed and immutable
      expect(screen.getByTestId("requested-priority-badge")).toHaveTextContent("HIGH");

      // Change IT Priority
      fireEvent.change(screen.getByTestId("it-priority-select"), {
        target: { value: "URGENT" },
      });

      await waitFor(() => {
        expect(api.updateTicketPriority).toHaveBeenCalledWith(101, "URGENT");
      });
    });
  });

  // =========================================================================
  // 3. Status Workflow Action Bar (All 8 Statuses Button Sets per ui-spec §3.5)
  // =========================================================================
  describe("Status Workflow Action Bar (All 8 Statuses per ui-spec.md §3.5)", () => {
    it("renders 'Mark as Open' and 'Cancel Ticket' when status is NEW", async () => {
      render(<StaffTicketDetail ticketId={101} currentUser={currentUser} />);

      await waitFor(() => {
        expect(screen.getByTestId("status-badge")).toHaveTextContent("New");
      });

      expect(screen.getByRole("button", { name: /Mark as Open/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Cancel Ticket/i })).toBeInTheDocument();
    });

    it("renders 'Start Progress' and 'Cancel Ticket' when status is OPEN", async () => {
      vi.mocked(api.getTicketDetail).mockResolvedValue({
        ...baseTicket,
        currentStatus: "OPEN",
      });

      render(<StaffTicketDetail ticketId={101} currentUser={currentUser} />);

      await waitFor(() => {
        expect(screen.getByTestId("status-badge")).toHaveTextContent("Open");
      });

      expect(screen.getByRole("button", { name: /Start Progress/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Cancel Ticket/i })).toBeInTheDocument();
    });

    it("renders 'Wait for Requester', 'Resolve Ticket', and 'Cancel Ticket' when status is IN_PROGRESS", async () => {
      vi.mocked(api.getTicketDetail).mockResolvedValue({
        ...baseTicket,
        currentStatus: "IN_PROGRESS",
      });

      render(<StaffTicketDetail ticketId={101} currentUser={currentUser} />);

      await waitFor(() => {
        expect(screen.getByTestId("status-badge")).toHaveTextContent("In Progress");
      });

      expect(screen.getByRole("button", { name: /Wait for Requester/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Resolve Ticket/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Cancel Ticket/i })).toBeInTheDocument();
    });

    it("renders 'Resume Progress', 'Resolve Ticket', and 'Cancel Ticket' when status is WAITING_FOR_REQUESTER", async () => {
      vi.mocked(api.getTicketDetail).mockResolvedValue({
        ...baseTicket,
        currentStatus: "WAITING_FOR_REQUESTER",
      });

      render(<StaffTicketDetail ticketId={101} currentUser={currentUser} />);

      await waitFor(() => {
        expect(screen.getByTestId("status-badge")).toHaveTextContent("Waiting for Requester");
      });

      expect(screen.getByRole("button", { name: /Resume Progress/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Resolve Ticket/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Cancel Ticket/i })).toBeInTheDocument();
    });

    it("renders 'Close Ticket' and 'Reopen Ticket' when status is RESOLVED", async () => {
      vi.mocked(api.getTicketDetail).mockResolvedValue({
        ...baseTicket,
        currentStatus: "RESOLVED",
      });

      render(<StaffTicketDetail ticketId={101} currentUser={currentUser} />);

      await waitFor(() => {
        expect(screen.getByTestId("status-badge")).toHaveTextContent("Resolved");
      });

      expect(screen.getByRole("button", { name: /Close Ticket/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Reopen Ticket/i })).toBeInTheDocument();
    });

    it("renders 'Reopen Ticket' when status is CLOSED", async () => {
      vi.mocked(api.getTicketDetail).mockResolvedValue({
        ...baseTicket,
        currentStatus: "CLOSED",
      });

      render(<StaffTicketDetail ticketId={101} currentUser={currentUser} />);

      await waitFor(() => {
        expect(screen.getByTestId("status-badge")).toHaveTextContent("Closed");
      });

      expect(screen.getByRole("button", { name: /Reopen Ticket/i })).toBeInTheDocument();
    });

    it("renders NO transition buttons when status is CANCELLED (Terminal)", async () => {
      vi.mocked(api.getTicketDetail).mockResolvedValue({
        ...baseTicket,
        currentStatus: "CANCELLED",
      });

      render(<StaffTicketDetail ticketId={101} currentUser={currentUser} />);

      await waitFor(() => {
        expect(screen.getByTestId("status-badge")).toHaveTextContent("Cancelled");
      });

      expect(screen.queryByRole("button", { name: /Mark as Open|Start Progress|Wait for Requester|Resolve Ticket|Close Ticket|Reopen Ticket|Cancel Ticket/i })).toBeNull();
    });

    it("renders NO transition buttons when status is REOPENED", async () => {
      vi.mocked(api.getTicketDetail).mockResolvedValue({
        ...baseTicket,
        currentStatus: "REOPENED",
      });

      render(<StaffTicketDetail ticketId={101} currentUser={currentUser} />);

      await waitFor(() => {
        expect(screen.getByTestId("status-badge")).toHaveTextContent("Reopened");
      });

      expect(screen.queryByRole("button", { name: /Mark as Open|Start Progress|Wait for Requester|Resolve Ticket|Close Ticket|Reopen Ticket|Cancel Ticket/i })).toBeNull();
    });

    it("transitions ticket status when a transition button is clicked", async () => {
      vi.mocked(api.updateTicketStatus).mockResolvedValue({
        id: 101,
        status: "OPEN",
        currentStatus: "OPEN",
      });

      render(<StaffTicketDetail ticketId={101} currentUser={currentUser} />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /Mark as Open/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole("button", { name: /Mark as Open/i }));

      await waitFor(() => {
        expect(api.updateTicketStatus).toHaveBeenCalledWith(101, "OPEN");
        expect(screen.getByTestId("status-badge")).toHaveTextContent("Open");
      });
    });
  });

  // =========================================================================
  // 4. Communication Hub: Distinct Internal Notes vs Public Comments
  // =========================================================================
  describe("Communication Hub (Internal Notes vs Public Comments)", () => {
    it("renders Public Comments with standard green/white styling and distinct banner", async () => {
      render(<StaffTicketDetail ticketId={101} currentUser={currentUser} />);

      await waitFor(() => {
        expect(screen.getByTestId("public-comments-section")).toBeInTheDocument();
      });

      expect(screen.getByText(/Public Comments — Visible to Requester and IT Staff/i)).toBeInTheDocument();
      expect(screen.getByText("Here is the screenshot of the error.")).toBeInTheDocument();
    });

    it("renders Internal Notes with distinct Amber/Gold styling and private header", async () => {
      render(<StaffTicketDetail ticketId={101} currentUser={currentUser} />);

      await waitFor(() => {
        const notesSection = screen.getByTestId("internal-notes-section");
        expect(notesSection).toBeInTheDocument();
        // Check amber style or class
        expect(notesSection).toHaveStyle({ backgroundColor: "rgb(255, 251, 235)" });
      });

      expect(screen.getByText(/Internal IT Notes — Private to IT Staff & Admin/i)).toBeInTheDocument();
      expect(screen.getByText("Investigated firewall logs on core switch. Detected intermittent packet loss.")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Add Internal Note/i })).toBeInTheDocument();
    });

    it("posts an internal note successfully", async () => {
      vi.mocked(api.postInternalNote).mockResolvedValue({
        id: 2,
        ticketId: 101,
        authorId: 2,
        authorName: "Witchai Tech",
        content: "Applied firewall rule fix on router.",
        createdAt: "2026-09-16T12:40:00.000Z",
      });

      render(<StaffTicketDetail ticketId={101} currentUser={currentUser} />);

      await waitFor(() => {
        expect(screen.getByTestId("internal-notes-section")).toBeInTheDocument();
      });

      const noteTextarea = screen.getByPlaceholderText(/Enter private internal note/i);
      fireEvent.change(noteTextarea, {
        target: { value: "Applied firewall rule fix on router." },
      });

      fireEvent.click(screen.getByRole("button", { name: /Add Internal Note/i }));

      await waitFor(() => {
        expect(api.postInternalNote).toHaveBeenCalledWith(101, "Applied firewall rule fix on router.");
        expect(screen.getByText("Applied firewall rule fix on router.")).toBeInTheDocument();
      });
    });
  });
});
