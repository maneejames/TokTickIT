import React, { useState } from "react";
import { TicketDetail, StaffTicketStatus, updateTicketStatus } from "../api.js";

export interface TicketWorkflowProps {
  ticket: TicketDetail;
  onStatusChanged?: (updated: {
    status: StaffTicketStatus;
    currentStatus: StaffTicketStatus;
    version: number;
  }) => void;
  onReloadTicket?: () => void;
}

interface TransitionOption {
  target: StaffTicketStatus;
  label: string;
  variant: "primary" | "secondary" | "danger";
}

export const STATUS_TRANSITIONS: Record<StaffTicketStatus, TransitionOption[]> = {
  NEW: [
    { target: "OPEN", label: "Mark as Open", variant: "primary" },
    { target: "CANCELLED", label: "Cancel Ticket", variant: "danger" },
  ],
  OPEN: [
    { target: "IN_PROGRESS", label: "Start Progress", variant: "primary" },
    { target: "CANCELLED", label: "Cancel Ticket", variant: "danger" },
  ],
  IN_PROGRESS: [
    { target: "WAITING_FOR_REQUESTER", label: "Wait for Requester", variant: "secondary" },
    { target: "RESOLVED", label: "Resolve Ticket", variant: "primary" },
    { target: "CANCELLED", label: "Cancel Ticket", variant: "danger" },
  ],
  WAITING_FOR_REQUESTER: [
    { target: "IN_PROGRESS", label: "Resume Progress", variant: "primary" },
    { target: "RESOLVED", label: "Resolve Ticket", variant: "secondary" },
    { target: "CANCELLED", label: "Cancel Ticket", variant: "danger" },
  ],
  RESOLVED: [
    { target: "CLOSED", label: "Close Ticket", variant: "primary" },
    { target: "REOPENED", label: "Reopen Ticket", variant: "secondary" },
  ],
  CLOSED: [
    { target: "REOPENED", label: "Reopen Ticket", variant: "secondary" },
  ],
  REOPENED: [],
  CANCELLED: [],
};

export const STATUS_LABELS: Record<StaffTicketStatus, string> = {
  NEW: "New",
  OPEN: "Open",
  IN_PROGRESS: "In Progress",
  WAITING_FOR_REQUESTER: "Waiting for Requester",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
  REOPENED: "Reopened",
  CANCELLED: "Cancelled",
};

export const TicketWorkflow: React.FC<TicketWorkflowProps> = ({
  ticket,
  onStatusChanged,
  onReloadTicket,
}) => {
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [activeTarget, setActiveTarget] = useState<StaffTicketStatus | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [conflictMessage, setConflictMessage] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState<string>("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const currentStatus = (ticket.currentStatus?.toUpperCase() || "NEW") as StaffTicketStatus;
  const transitions = STATUS_TRANSITIONS[currentStatus] || [];

  const handleTransition = async (nextStatus: StaffTicketStatus) => {
    if (isSubmitting) return;

    setIsSubmitting(true);
    setActiveTarget(nextStatus);
    setErrorMessage(null);
    setConflictMessage(null);

    try {
      const res =
        ticket.version !== undefined
          ? await updateTicketStatus(ticket.id, nextStatus, ticket.version)
          : await updateTicketStatus(ticket.id, nextStatus);

      const targetLabel = STATUS_LABELS[nextStatus] || nextStatus;
      const announcementMsg = `Status changed to ${targetLabel}`;
      setAnnouncement(announcementMsg);
      setToastMessage(announcementMsg);

      onStatusChanged?.({
        status: nextStatus,
        currentStatus: nextStatus,
        version: res.version ?? (ticket.version !== undefined ? ticket.version + 1 : 1),
      });
    } catch (err: any) {
      if (err.status === 409 || err.message?.includes("409") || err.message?.toLowerCase().includes("conflict")) {
        setConflictMessage("This ticket was changed by someone else.");
      } else if (
        err.status === 400 ||
        err.message?.includes("400") ||
        err.message?.toLowerCase().includes("not allowed") ||
        err.message?.toLowerCase().includes("invalid transition")
      ) {
        setErrorMessage("That change isn't allowed from the current status.");
        onReloadTicket?.();
      } else {
        setErrorMessage(err.message || "Failed to update status");
      }
    } finally {
      setIsSubmitting(false);
      setActiveTarget(null);
    }
  };

  return (
    <div className="ticket-workflow" data-testid="ticket-workflow">
      {/* Live Region for Screen Readers */}
      <div
        role="status"
        aria-live="polite"
        className="visually-hidden"
        data-testid="status-announcement"
      >
        {announcement}
      </div>

      {/* Requester Resolved Advisory */}
      {ticket.isRequesterResolved && (
        <div
          className="badge px-3 py-2 rounded-pill fw-semibold mb-3 d-inline-flex align-items-center gap-1"
          data-testid="requester-resolved-advisory"
          style={{
            backgroundColor: "#E6F4EA",
            color: "#137333",
            border: "1px solid #34A853",
            fontSize: "13px",
          }}
        >
          <span>Requester says resolved — please verify</span>
        </div>
      )}

      {/* Success Feedback Toast */}
      {toastMessage && (
        <div
          className="alert alert-success py-2 px-3 mb-3 d-flex align-items-center justify-content-between small"
          role="alert"
          data-testid="workflow-success-toast"
        >
          <span>{toastMessage}</span>
          <button
            type="button"
            className="btn-close btn-close-sm"
            aria-label="Close"
            onClick={() => setToastMessage(null)}
          />
        </div>
      )}

      {/* 409 Conflict Alert with Reload Ticket */}
      {conflictMessage && (
        <div
          className="alert alert-warning py-2 px-3 mb-3 d-flex align-items-center justify-content-between gap-3 small"
          role="alert"
          data-testid="workflow-conflict-alert"
        >
          <span className="fw-medium">{conflictMessage}</span>
          <button
            type="button"
            className="btn btn-sm btn-outline-dark fw-semibold"
            data-testid="reload-ticket-btn"
            onClick={() => {
              setConflictMessage(null);
              onReloadTicket?.();
            }}
          >
            Reload ticket
          </button>
        </div>
      )}

      {/* 400 or other Error Alert */}
      {errorMessage && (
        <div
          className="alert alert-danger py-2 px-3 mb-3 small"
          role="alert"
          data-testid="workflow-error-alert"
        >
          {errorMessage}
        </div>
      )}

      {/* Workflow Transition Action Bar */}
      <div className="d-flex gap-2 flex-wrap align-items-center" data-testid="workflow-action-bar">
        {transitions.map((t) => (
          <button
            key={t.target}
            type="button"
            className={
              t.variant === "primary"
                ? "zen-btn-primary"
                : t.variant === "danger"
                ? "btn btn-outline-danger"
                : "zen-btn-secondary"
            }
            disabled={isSubmitting}
            data-testid={`transition-btn-${t.target.toLowerCase()}`}
            onClick={() => handleTransition(t.target)}
          >
            {isSubmitting && activeTarget === t.target && (
              <span
                className="spinner-border spinner-border-sm me-1"
                role="status"
                aria-hidden="true"
              />
            )}
            {t.label}
          </button>
        ))}
      </div>
    </div>
  );
};
