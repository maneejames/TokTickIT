import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { RequesterTicketDetail } from "../../src/components/RequesterTicketDetail.js";
import * as api from "../../src/api.js";

describe("RequesterTicketDetail Component UI Tests", () => {
  const mockRequester: api.RequesterUser = {
    id: 1,
    name: "Somchai Jaidee",
    email: "somchai.jai@kmutt.ac.th",
    department: "Engineering",
    isActive: true,
  };

  const mockTicket: api.TicketDetail = {
    id: 101,
    ticketNumber: "TICK-20260906-0001",
    requesterId: 1,
    categoryId: 2,
    relatedSystemId: 7,
    summary: "Laptop battery drains in less than 30 minutes",
    description: "Detailed description of the issue after recent update.",
    requestedPriority: "HIGH",
    currentStatus: "NEW",
    createdAt: "2026-09-06T08:30:00.000Z",
    updatedAt: "2026-09-06T08:30:00.000Z",
    requester: {
      id: 1,
      name: "Somchai Jaidee",
      email: "somchai.jai@kmutt.ac.th",
      department: "Engineering",
    },
    category: { id: 2, name: "Hardware" },
    relatedSystem: { id: 7, name: "Corporate Laptop" },
    attachments: [
      {
        id: 11,
        ticketId: 101,
        originalFilename: "battery_diagnostic.png",
        mimeType: "image/png",
        sizeBytes: 245000,
        isRemoved: false,
        uploadedAt: "2026-09-06T08:32:00.000Z",
      },
      {
        id: 12,
        ticketId: 101,
        originalFilename: "wrong_invoice.pdf",
        mimeType: "application/pdf",
        sizeBytes: 512000,
        isRemoved: true,
        removedAt: "2026-09-06T09:00:00.000Z",
        removedReason: "Uploaded incorrect document",
        uploadedAt: "2026-09-06T08:35:00.000Z",
      },
    ],
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // ---------------------------------------------------------------------------
  // DET-UI-01: Read-only ticket detail display
  // ---------------------------------------------------------------------------
  describe("DET-UI-01: Read-only ticket detail display", () => {
    it("renders ticket header, requester info, summary, description, and badges in read-only containers", async () => {
      vi.spyOn(api, "getTicketDetail").mockResolvedValueOnce(mockTicket);

      render(
        <RequesterTicketDetail
          ticketId={101}
          currentRequester={mockRequester}
          onNavigateToMyTickets={vi.fn()}
        />
      );

      // Loading state
      expect(screen.getByTestId("ticket-detail-loading")).toBeInTheDocument();

      // Wait for content
      await waitFor(() => {
        expect(screen.getByText("TICK-20260906-0001")).toBeInTheDocument();
      });

      expect(screen.getByText("Laptop battery drains in less than 30 minutes")).toBeInTheDocument();
      expect(screen.getByText("Detailed description of the issue after recent update.")).toBeInTheDocument();
      expect(screen.getByText(/Somchai Jaidee \(Engineering\)/)).toBeInTheDocument();
      expect(screen.getByText("Hardware — Corporate Laptop")).toBeInTheDocument();
      expect(screen.getByText("HIGH")).toBeInTheDocument();
      expect(screen.getByText("New")).toBeInTheDocument();
    });

    it("displays clean not found screen when ticket returns 404", async () => {
      const error = new Error("Ticket not found") as Error & { status?: number };
      error.status = 404;
      vi.spyOn(api, "getTicketDetail").mockRejectedValueOnce(error);

      render(
        <RequesterTicketDetail
          ticketId={999}
          currentRequester={mockRequester}
          onNavigateToMyTickets={vi.fn()}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId("ticket-not-found")).toBeInTheDocument();
      });
      expect(screen.getByText("Ticket Not Found")).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // ATT-UI-01: Active vs removed attachments lists, remove confirmation modal
  // ---------------------------------------------------------------------------
  describe("ATT-UI-01: Attachment list rendering and removal modal", () => {
    it("renders active attachments with download links and soft-removed attachments in separate audit section with disabled download", async () => {
      vi.spyOn(api, "getTicketDetail").mockResolvedValueOnce(mockTicket);

      render(
        <RequesterTicketDetail
          ticketId={101}
          currentRequester={mockRequester}
          onNavigateToMyTickets={vi.fn()}
        />
      );

      await waitFor(() => {
        expect(screen.getByText("battery_diagnostic.png")).toBeInTheDocument();
      });

      // Active attachment check
      const downloadLink = screen.getByRole("link", { name: /download battery_diagnostic\.png/i });
      expect(downloadLink).toBeInTheDocument();
      expect(downloadLink).toHaveAttribute("download");
      expect(downloadLink.getAttribute("href")).toContain("requesterId=1");

      // Removed attachment check
      expect(screen.getByText("wrong_invoice.pdf")).toBeInTheDocument();
      expect(screen.getByText(/Uploaded incorrect document/)).toBeInTheDocument();
      expect(screen.getByText("Download Disabled")).toBeInTheDocument();
    });

    it("opens removal modal, allows optional reason, and updates attachment to soft-removed", async () => {
      vi.spyOn(api, "getTicketDetail").mockResolvedValueOnce(mockTicket);
      vi.spyOn(api, "removeAttachment").mockResolvedValueOnce({
        id: 11,
        isRemoved: true,
        removedAt: "2026-09-06T09:30:00.000Z",
        removedReason: "Duplicate file",
      });

      render(
        <RequesterTicketDetail
          ticketId={101}
          currentRequester={mockRequester}
          onNavigateToMyTickets={vi.fn()}
        />
      );

      await waitFor(() => {
        expect(screen.getByText("battery_diagnostic.png")).toBeInTheDocument();
      });

      // Click remove button
      const removeBtn = screen.getByRole("button", { name: /remove battery_diagnostic\.png/i });
      fireEvent.click(removeBtn);

      // Modal is visible
      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(screen.getByText(/Are you sure you want to remove/)).toBeInTheDocument();
      expect(screen.getByText(/This file will no longer be downloadable/)).toBeInTheDocument();

      // Enter optional removal reason
      const reasonInput = screen.getByLabelText(/reason for removal/i);
      fireEvent.change(reasonInput, { target: { value: "Duplicate file" } });

      // Confirm removal
      const confirmBtn = screen.getByRole("button", { name: /confirm removal/i });
      fireEvent.click(confirmBtn);

      await waitFor(() => {
        expect(api.removeAttachment).toHaveBeenCalledWith(101, 11, 1, "Duplicate file");
      });

      // After soft-removal, modal closes
      await waitFor(() => {
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      });
    });
  });

  // ---------------------------------------------------------------------------
  // ATT-UI-02: Dropzone hidden/disabled when 5 active attachments exist
  // ---------------------------------------------------------------------------
  describe("ATT-UI-02: 5 active attachments limit in UI", () => {
    it("displays maximum attachments reached notice when active count is 5", async () => {
      const fiveActiveTicket: api.TicketDetail = {
        ...mockTicket,
        attachments: Array.from({ length: 5 }, (_, i) => ({
          id: 20 + i,
          ticketId: 101,
          originalFilename: `file_${i + 1}.png`,
          mimeType: "image/png",
          sizeBytes: 1000,
          isRemoved: false,
          uploadedAt: "2026-09-06T08:30:00.000Z",
        })),
      };

      vi.spyOn(api, "getTicketDetail").mockResolvedValueOnce(fiveActiveTicket);

      render(
        <RequesterTicketDetail
          ticketId={101}
          currentRequester={mockRequester}
          onNavigateToMyTickets={vi.fn()}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/Maximum attachments reached/i)).toBeInTheDocument();
      });

      expect(screen.queryByText(/Click or drag file here to attach/i)).not.toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // ATT-UI-03: Client-side immediate file validation error
  // ---------------------------------------------------------------------------
  describe("ATT-UI-03: Client-side immediate file validation error", () => {
    it("displays error message when selecting file exceeding 5MB", async () => {
      vi.spyOn(api, "getTicketDetail").mockResolvedValueOnce(mockTicket);
      vi.spyOn(api, "uploadAttachment");

      render(
        <RequesterTicketDetail
          ticketId={101}
          currentRequester={mockRequester}
          onNavigateToMyTickets={vi.fn()}
        />
      );

      await waitFor(() => {
        expect(screen.getByText("battery_diagnostic.png")).toBeInTheDocument();
      });

      // Find hidden file input
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      expect(fileInput).not.toBeNull();

      // Create oversized file (>5MB)
      const oversizedFile = new File(["a".repeat(10)], "huge_doc.pdf", {
        type: "application/pdf",
      });
      Object.defineProperty(oversizedFile, "size", { value: 6 * 1024 * 1024 });

      fireEvent.change(fileInput, { target: { files: [oversizedFile] } });

      await waitFor(() => {
        expect(screen.getByText(/exceeds the 5 MB limit/i)).toBeInTheDocument();
      });

      expect(api.uploadAttachment).not.toHaveBeenCalled();
    });

    it("displays error message when selecting unsupported MIME type (e.g. .exe)", async () => {
      vi.spyOn(api, "getTicketDetail").mockResolvedValueOnce(mockTicket);
      vi.spyOn(api, "uploadAttachment");

      render(
        <RequesterTicketDetail
          ticketId={101}
          currentRequester={mockRequester}
          onNavigateToMyTickets={vi.fn()}
        />
      );

      await waitFor(() => {
        expect(screen.getByText("battery_diagnostic.png")).toBeInTheDocument();
      });

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      const invalidFile = new File(["binary"], "program.exe", {
        type: "application/x-msdownload",
      });

      fireEvent.change(fileInput, { target: { files: [invalidFile] } });

      await waitFor(() => {
        expect(screen.getByText(/unsupported format/i)).toBeInTheDocument();
      });

      expect(api.uploadAttachment).not.toHaveBeenCalled();
    });
  });
});
