import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TicketWorkflow } from "../../src/components/TicketWorkflow.js";
import * as api from "../../src/api.js";

// Mock API module
vi.mock("../../src/api.js", async () => {
  const actual = await vi.importActual("../../src/api.js");
  return {
    ...actual,
    updateTicketStatus: vi.fn(),
  };
});

describe("TicketWorkflow Component UI Tests (WF-UI-01 to WF-UI-04)", () => {
  const baseTicket: api.TicketDetail = {
    id: 101,
    ticketNumber: "TICK-101",
    requesterId: 1,
    categoryId: 1,
    relatedSystemId: 1,
    summary: "Workflow test ticket",
    description: "Ticket to verify workflow transitions",
    requestedPriority: "MEDIUM",
    itPriority: "HIGH",
    currentStatus: "NEW",
    isRequesterResolved: false,
    version: 1,
    ownerId: 2,
    owner: { id: 2, name: "Witchai Tech" },
    createdAt: "2026-10-29T10:00:00Z",
    updatedAt: "2026-10-29T10:00:00Z",
    requester: {
      id: 1,
      name: "Somchai Requester",
      email: "somchai@kmutt.ac.th",
      department: "Computer Engineering",
    },
    category: { id: 1, name: "Hardware" },
    relatedSystem: { id: 1, name: "Lab Workstation" },
    attachments: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // =========================================================================
  // WF-UI-01: Buttons shown only for permitted transitions for each status
  // =========================================================================
  describe("WF-UI-01: Transition buttons permitted per status matrix", () => {
    it("renders 'Mark as Open' and 'Cancel Ticket' for NEW status", () => {
      render(<TicketWorkflow ticket={{ ...baseTicket, currentStatus: "NEW" }} />);

      expect(screen.getByRole("button", { name: "Mark as Open" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Cancel Ticket" })).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Start Progress" })).toBeNull();
      expect(screen.queryByRole("button", { name: "Resolve Ticket" })).toBeNull();
      expect(screen.queryByRole("button", { name: "Close Ticket" })).toBeNull();
    });

    it("renders 'Start Progress' and 'Cancel Ticket' for OPEN status", () => {
      render(<TicketWorkflow ticket={{ ...baseTicket, currentStatus: "OPEN" }} />);

      expect(screen.getByRole("button", { name: "Start Progress" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Cancel Ticket" })).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Mark as Open" })).toBeNull();
      expect(screen.queryByRole("button", { name: "Resolve Ticket" })).toBeNull();
    });

    it("renders 'Wait for Requester', 'Resolve Ticket', and 'Cancel Ticket' for IN_PROGRESS status", () => {
      render(<TicketWorkflow ticket={{ ...baseTicket, currentStatus: "IN_PROGRESS" }} />);

      expect(screen.getByRole("button", { name: "Wait for Requester" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Resolve Ticket" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Cancel Ticket" })).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Close Ticket" })).toBeNull();
      expect(screen.queryByRole("button", { name: "Resume Progress" })).toBeNull();
    });

    it("renders 'Resume Progress', 'Resolve Ticket', and 'Cancel Ticket' for WAITING_FOR_REQUESTER status", () => {
      render(<TicketWorkflow ticket={{ ...baseTicket, currentStatus: "WAITING_FOR_REQUESTER" }} />);

      expect(screen.getByRole("button", { name: "Resume Progress" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Resolve Ticket" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Cancel Ticket" })).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Wait for Requester" })).toBeNull();
      expect(screen.queryByRole("button", { name: "Close Ticket" })).toBeNull();
    });

    it("renders 'Close Ticket' and 'Reopen Ticket' for RESOLVED status", () => {
      render(<TicketWorkflow ticket={{ ...baseTicket, currentStatus: "RESOLVED" }} />);

      expect(screen.getByRole("button", { name: "Close Ticket" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Reopen Ticket" })).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Cancel Ticket" })).toBeNull();
      expect(screen.queryByRole("button", { name: "Resolve Ticket" })).toBeNull();
    });

    it("renders 'Reopen Ticket' for CLOSED status", () => {
      render(<TicketWorkflow ticket={{ ...baseTicket, currentStatus: "CLOSED" }} />);

      expect(screen.getByRole("button", { name: "Reopen Ticket" })).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Close Ticket" })).toBeNull();
      expect(screen.queryByRole("button", { name: "Cancel Ticket" })).toBeNull();
    });

    it("renders 0 transition buttons for REOPENED status per §6.1 matrix", () => {
      render(<TicketWorkflow ticket={{ ...baseTicket, currentStatus: "REOPENED" }} />);

      const actionBar = screen.getByTestId("workflow-action-bar");
      expect(actionBar.querySelectorAll("button")).toHaveLength(0);
    });

    it("renders 0 transition buttons for CANCELLED status (Terminal state)", () => {
      render(<TicketWorkflow ticket={{ ...baseTicket, currentStatus: "CANCELLED" }} />);

      const actionBar = screen.getByTestId("workflow-action-bar");
      expect(actionBar.querySelectorAll("button")).toHaveLength(0);
    });
  });

  // =========================================================================
  // WF-UI-02: Success refreshes header and announces via aria-live
  // =========================================================================
  describe("WF-UI-02: Successful status transition with aria-live announcement", () => {
    it("disables buttons while submitting, sends expectedVersion, and announces via aria-live", async () => {
      let resolvePromise: (value: any) => void;
      const deferred = new Promise((resolve) => {
        resolvePromise = resolve;
      });
      vi.mocked(api.updateTicketStatus).mockReturnValue(deferred as any);

      const onStatusChanged = vi.fn();
      render(
        <TicketWorkflow
          ticket={{ ...baseTicket, currentStatus: "OPEN", version: 3 }}
          onStatusChanged={onStatusChanged}
        />
      );

      const startProgressBtn = screen.getByRole("button", { name: "Start Progress" });
      const cancelBtn = screen.getByRole("button", { name: "Cancel Ticket" });

      // Click Start Progress
      fireEvent.click(startProgressBtn);

      // Verify busy state: buttons disabled
      expect(startProgressBtn).toBeDisabled();
      expect(cancelBtn).toBeDisabled();

      // Ensure double clicks do not trigger another API call
      fireEvent.click(startProgressBtn);
      expect(api.updateTicketStatus).toHaveBeenCalledTimes(1);
      expect(api.updateTicketStatus).toHaveBeenCalledWith(101, "IN_PROGRESS", 3);

      // Resolve the API call
      resolvePromise!({
        id: 101,
        ticketNumber: "TICK-101",
        status: "IN_PROGRESS",
        currentStatus: "IN_PROGRESS",
        version: 4,
      });

      // Verify aria-live announcement
      await waitFor(() => {
        const liveRegion = screen.getByTestId("status-announcement");
        expect(liveRegion).toHaveTextContent("Status changed to In Progress");
      });

      // Verify callback called
      expect(onStatusChanged).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "IN_PROGRESS",
          currentStatus: "IN_PROGRESS",
          version: 4,
        })
      );
    });
  });

  // =========================================================================
  // WF-UI-03: 400 and 409 responses show specified messages
  // =========================================================================
  describe("WF-UI-03: 400 invalid transition and 409 conflict handling", () => {
    it("shows 'That change isn't allowed from the current status.' on 400 error", async () => {
      const error: any = new Error("Invalid transition");
      error.status = 400;
      vi.mocked(api.updateTicketStatus).mockRejectedValue(error);

      const onReload = vi.fn();
      render(
        <TicketWorkflow
          ticket={{ ...baseTicket, currentStatus: "NEW", version: 1 }}
          onReloadTicket={onReload}
        />
      );

      fireEvent.click(screen.getByRole("button", { name: "Mark as Open" }));

      await waitFor(() => {
        expect(screen.getByTestId("workflow-error-alert")).toHaveTextContent(
          "That change isn't allowed from the current status."
        );
      });
      expect(onReload).toHaveBeenCalled();
    });

    it("shows 'This ticket was changed by someone else.' with Reload ticket button on 409 conflict", async () => {
      const error: any = new Error("Ticket version conflict");
      error.status = 409;
      vi.mocked(api.updateTicketStatus).mockRejectedValue(error);

      const onReload = vi.fn();
      render(
        <TicketWorkflow
          ticket={{ ...baseTicket, currentStatus: "OPEN", version: 1 }}
          onReloadTicket={onReload}
        />
      );

      fireEvent.click(screen.getByRole("button", { name: "Start Progress" }));

      await waitFor(() => {
        expect(screen.getByTestId("workflow-conflict-alert")).toHaveTextContent(
          "This ticket was changed by someone else."
        );
      });

      const reloadBtn = screen.getByRole("button", { name: "Reload ticket" });
      expect(reloadBtn).toBeInTheDocument();

      fireEvent.click(reloadBtn);
      expect(onReload).toHaveBeenCalled();
    });
  });

  // =========================================================================
  // WF-UI-04: Requester says resolved advisory
  // =========================================================================
  describe("WF-UI-04: Staff see 'Requester says resolved — please verify' advisory", () => {
    it("displays advisory without altering formal status when isRequesterResolved is true", () => {
      render(
        <TicketWorkflow
          ticket={{
            ...baseTicket,
            currentStatus: "IN_PROGRESS",
            isRequesterResolved: true,
          }}
        />
      );

      const advisory = screen.getByTestId("requester-resolved-advisory");
      expect(advisory).toBeInTheDocument();
      expect(advisory).toHaveTextContent("Requester says resolved — please verify");

      // Buttons for IN_PROGRESS are still rendered normally
      expect(screen.getByRole("button", { name: "Resolve Ticket" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Wait for Requester" })).toBeInTheDocument();
    });

    it("does not render advisory when isRequesterResolved is false", () => {
      render(
        <TicketWorkflow
          ticket={{
            ...baseTicket,
            currentStatus: "IN_PROGRESS",
            isRequesterResolved: false,
          }}
        />
      );

      expect(screen.getByTestId("ticket-workflow")).toBeInTheDocument();
      expect(screen.queryByTestId("requester-resolved-advisory")).toBeNull();
    });
  });
});

