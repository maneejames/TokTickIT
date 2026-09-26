import React, { useState, useEffect } from "react";
import {
  TicketDetail,
  Attachment,
  User,
  PublicCommentItem,
  InternalNoteItem,
  StaffPriority,
  StaffTicketStatus,
  getTicketDetail,
  getInternalNotes,
  postInternalNote,
  postPublicComment,
  updateTicketOwner,
  updateTicketPriority,
  updateTicketStatus,
  getStaffUsers,
  getAttachmentDownloadUrl,
} from "../api.js";

interface StaffTicketDetailProps {
  ticketId: number;
  currentUser: User;
  onNavigateBack?: () => void;
}

export const StaffTicketDetail: React.FC<StaffTicketDetailProps> = ({
  ticketId,
  currentUser,
  onNavigateBack,
}) => {
  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [internalNotes, setInternalNotes] = useState<InternalNoteItem[]>([]);
  const [staffUsers, setStaffUsers] = useState<User[]>([]);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Ownership state
  const [isUpdatingOwner, setIsUpdatingOwner] = useState<boolean>(false);
  const [ownerError, setOwnerError] = useState<string | null>(null);

  // Priority state
  const [isUpdatingPriority, setIsUpdatingPriority] = useState<boolean>(false);
  const [priorityFeedback, setPriorityFeedback] = useState<string | null>(null);
  const [priorityError, setPriorityError] = useState<string | null>(null);

  // Status transition state
  const [isUpdatingStatus, setIsUpdatingStatus] = useState<boolean>(false);
  const [statusError, setStatusError] = useState<string | null>(null);

  // Public comments state
  const [commentContent, setCommentContent] = useState<string>("");
  const [isSubmittingComment, setIsSubmittingComment] = useState<boolean>(false);
  const [commentError, setCommentError] = useState<string | null>(null);

  // Internal notes state
  const [noteContent, setNoteContent] = useState<string>("");
  const [isSubmittingNote, setIsSubmittingNote] = useState<boolean>(false);
  const [noteError, setNoteError] = useState<string | null>(null);

  const fetchDetailAndNotes = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const [ticketData, notesData, usersData] = await Promise.all([
        getTicketDetail(ticketId),
        getInternalNotes(ticketId).catch(() => []),
        getStaffUsers().catch(() => []),
      ]);

      setTicket(ticketData);
      setInternalNotes(notesData);
      if (usersData && usersData.length > 0) {
        setStaffUsers(usersData);
      } else {
        setStaffUsers([currentUser]);
      }
    } catch (err: unknown) {
      const e = err as Error;
      setErrorMessage(e.message || "Failed to load ticket details");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDetailAndNotes();
  }, [ticketId]);

  // Handle claiming ticket
  const handleClaimTicket = async () => {
    if (!ticket || isUpdatingOwner) return;
    setIsUpdatingOwner(true);
    setOwnerError(null);

    try {
      const res = await updateTicketOwner(ticket.id, currentUser.id);
      setTicket((prev) =>
        prev
          ? {
              ...prev,
              ownerId: res.ownerId,
              owner: res.owner,
            }
          : null
      );
    } catch (err: unknown) {
      const e = err as Error;
      setOwnerError(e.message || "Failed to claim ticket");
    } finally {
      setIsUpdatingOwner(false);
    }
  };

  // Handle reassigning ticket
  const handleReassignTicket = async (targetOwnerId: number) => {
    if (!ticket || isUpdatingOwner || !targetOwnerId) return;
    setIsUpdatingOwner(true);
    setOwnerError(null);

    try {
      const res = await updateTicketOwner(ticket.id, targetOwnerId);
      setTicket((prev) =>
        prev
          ? {
              ...prev,
              ownerId: res.ownerId,
              owner: res.owner,
            }
          : null
      );
    } catch (err: unknown) {
      const e = err as Error;
      setOwnerError(e.message || "Failed to reassign ticket");
    } finally {
      setIsUpdatingOwner(false);
    }
  };

  // Handle updating IT priority
  const handleUpdatePriority = async (newPriority: StaffPriority) => {
    if (!ticket || isUpdatingPriority) return;
    setIsUpdatingPriority(true);
    setPriorityError(null);
    setPriorityFeedback(null);

    try {
      await updateTicketPriority(ticket.id, newPriority);
      setTicket((prev) => (prev ? { ...prev, itPriority: newPriority } : null));
      setPriorityFeedback("Priority saved");
      setTimeout(() => setPriorityFeedback(null), 3000);
    } catch (err: unknown) {
      const e = err as Error;
      setPriorityError(e.message || "Failed to update priority");
    } finally {
      setIsUpdatingPriority(false);
    }
  };

  // Handle status transition
  const handleTransitionStatus = async (nextStatus: StaffTicketStatus) => {
    if (!ticket || isUpdatingStatus) return;
    setIsUpdatingStatus(true);
    setStatusError(null);

    try {
      const res = await updateTicketStatus(ticket.id, nextStatus);
      setTicket((prev) =>
        prev
          ? {
              ...prev,
              currentStatus: res.status || res.currentStatus,
            }
          : null
      );
    } catch (err: unknown) {
      const e = err as Error;
      setStatusError(e.message || "Status transition failed");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Handle posting public comment
  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticket || isSubmittingComment) return;
    const trimmed = commentContent.trim();
    if (!trimmed) {
      setCommentError("Comment cannot be empty");
      return;
    }
    if (trimmed.length > 2000) {
      setCommentError("Comment exceeds 2000 characters limit");
      return;
    }

    setCommentError(null);
    setIsSubmittingComment(true);

    try {
      const newComment = await postPublicComment(ticket.id, trimmed);
      setTicket((prev) =>
        prev
          ? {
              ...prev,
              publicComments: [...(prev.publicComments || []), newComment],
            }
          : null
      );
      setCommentContent("");
    } catch (err: unknown) {
      const e = err as Error;
      setCommentError(e.message || "Failed to post comment");
    } finally {
      setIsSubmittingComment(false);
    }
  };

  // Handle posting internal note
  const handlePostNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticket || isSubmittingNote) return;
    const trimmed = noteContent.trim();
    if (!trimmed) {
      setNoteError("Internal note cannot be empty");
      return;
    }
    if (trimmed.length > 2000) {
      setNoteError("Internal note exceeds 2000 characters limit");
      return;
    }

    setNoteError(null);
    setIsSubmittingNote(true);

    try {
      const newNote = await postInternalNote(ticket.id, trimmed);
      setInternalNotes((prev) => [...prev, newNote]);
      setNoteContent("");
    } catch (err: unknown) {
      const e = err as Error;
      setNoteError(e.message || "Failed to add internal note");
    } finally {
      setIsSubmittingNote(false);
    }
  };

  const formatStatusTitle = (status: string): string => {
    switch (status) {
      case "NEW":
        return "New";
      case "OPEN":
        return "Open";
      case "IN_PROGRESS":
        return "In Progress";
      case "WAITING_FOR_REQUESTER":
        return "Waiting for Requester";
      case "RESOLVED":
        return "Resolved";
      case "CLOSED":
        return "Closed";
      case "REOPENED":
        return "Reopened";
      case "CANCELLED":
        return "Cancelled";
      default:
        return status;
    }
  };

  const getStatusBadgeStyle = (status: string) => {
    switch (status) {
      case "NEW":
        return { backgroundColor: "#EBF3EE", color: "#0B7A46", border: "1px solid #A3CCA8" };
      case "OPEN":
        return { backgroundColor: "#E6F4EA", color: "#137333", border: "1px solid #CEEAD6" };
      case "IN_PROGRESS":
        return { backgroundColor: "#E8F0FE", color: "#1A73E8", border: "1px solid #D2E3FC" };
      case "WAITING_FOR_REQUESTER":
        return { backgroundColor: "#FEF7E0", color: "#B06000", border: "1px solid #FEEFC3" };
      case "RESOLVED":
        return { backgroundColor: "#CEEAD6", color: "#0D652D", border: "1px solid #81C995" };
      case "CLOSED":
        return { backgroundColor: "#F1F3F4", color: "#5F6368", border: "1px solid #DADCE0" };
      case "REOPENED":
        return { backgroundColor: "#FCE8E6", color: "#C5221F", border: "1px solid #FAD2CF" };
      case "CANCELLED":
        return { backgroundColor: "#F1F3F4", color: "#80868B", border: "1px solid #DADCE0" };
      default:
        return { backgroundColor: "#EBF3EE", color: "#0B7A46", border: "1px solid #A3CCA8" };
    }
  };

  const getPriorityBadgeClass = (priority?: string) => {
    switch (priority) {
      case "URGENT":
        return "bg-danger text-white";
      case "HIGH":
        return "bg-warning text-dark";
      case "MEDIUM":
        return "bg-info text-dark";
      case "LOW":
        return "bg-light text-secondary border";
      default:
        return "bg-light text-secondary border";
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "—";
    try {
      return new Date(dateStr).toLocaleString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Render contextual status transition buttons per ui-spec.md §3.5
  const renderStatusTransitionButtons = () => {
    if (!ticket) return null;
    const status = ticket.currentStatus;

    switch (status) {
      case "NEW":
        return (
          <div className="d-flex gap-2 flex-wrap align-items-center">
            <button
              type="button"
              className="zen-btn-primary"
              onClick={() => handleTransitionStatus("OPEN")}
              disabled={isUpdatingStatus}
            >
              Mark as Open
            </button>
            <button
              type="button"
              className="btn btn-outline-danger"
              onClick={() => handleTransitionStatus("CANCELLED")}
              disabled={isUpdatingStatus}
            >
              Cancel Ticket
            </button>
          </div>
        );
      case "OPEN":
        return (
          <div className="d-flex gap-2 flex-wrap align-items-center">
            <button
              type="button"
              className="zen-btn-primary"
              onClick={() => handleTransitionStatus("IN_PROGRESS")}
              disabled={isUpdatingStatus}
            >
              Start Progress
            </button>
            <button
              type="button"
              className="btn btn-outline-danger"
              onClick={() => handleTransitionStatus("CANCELLED")}
              disabled={isUpdatingStatus}
            >
              Cancel Ticket
            </button>
          </div>
        );
      case "IN_PROGRESS":
        return (
          <div className="d-flex gap-2 flex-wrap align-items-center">
            <button
              type="button"
              className="zen-btn-secondary"
              onClick={() => handleTransitionStatus("WAITING_FOR_REQUESTER")}
              disabled={isUpdatingStatus}
            >
              Wait for Requester
            </button>
            <button
              type="button"
              className="zen-btn-primary"
              onClick={() => handleTransitionStatus("RESOLVED")}
              disabled={isUpdatingStatus}
            >
              Resolve Ticket
            </button>
            <button
              type="button"
              className="btn btn-outline-danger"
              onClick={() => handleTransitionStatus("CANCELLED")}
              disabled={isUpdatingStatus}
            >
              Cancel Ticket
            </button>
          </div>
        );
      case "WAITING_FOR_REQUESTER":
        return (
          <div className="d-flex gap-2 flex-wrap align-items-center">
            <button
              type="button"
              className="zen-btn-primary"
              onClick={() => handleTransitionStatus("IN_PROGRESS")}
              disabled={isUpdatingStatus}
            >
              Resume Progress
            </button>
            <button
              type="button"
              className="zen-btn-secondary"
              onClick={() => handleTransitionStatus("RESOLVED")}
              disabled={isUpdatingStatus}
            >
              Resolve Ticket
            </button>
            <button
              type="button"
              className="btn btn-outline-danger"
              onClick={() => handleTransitionStatus("CANCELLED")}
              disabled={isUpdatingStatus}
            >
              Cancel Ticket
            </button>
          </div>
        );
      case "RESOLVED":
        return (
          <div className="d-flex gap-2 flex-wrap align-items-center">
            <button
              type="button"
              className="zen-btn-primary"
              onClick={() => handleTransitionStatus("CLOSED")}
              disabled={isUpdatingStatus}
            >
              Close Ticket
            </button>
            <button
              type="button"
              className="zen-btn-secondary"
              onClick={() => handleTransitionStatus("REOPENED")}
              disabled={isUpdatingStatus}
            >
              Reopen Ticket
            </button>
          </div>
        );
      case "CLOSED":
        return (
          <div className="d-flex gap-2 flex-wrap align-items-center">
            <button
              type="button"
              className="zen-btn-secondary"
              onClick={() => handleTransitionStatus("REOPENED")}
              disabled={isUpdatingStatus}
            >
              Reopen Ticket
            </button>
          </div>
        );
      case "CANCELLED":
      case "REOPENED":
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="zen-card p-5 text-center my-4" data-testid="detail-loading-state">
        <div className="spinner-border text-success mb-3" role="status" style={{ color: "var(--color-primary-green)" }}>
          <span className="visually-hidden">Loading ticket details...</span>
        </div>
        <p className="text-muted mb-0">Loading ticket details and notes...</p>
      </div>
    );
  }

  if (errorMessage || !ticket) {
    return (
      <div className="zen-card p-4 my-4" data-testid="detail-error-state">
        <div className="d-flex align-items-center gap-2 text-danger mb-3">
          <span style={{ fontSize: "24px" }}>⚠️</span>
          <h4 className="mb-0 fw-bold">Error Loading Ticket</h4>
        </div>
        <p className="text-danger mb-4">{errorMessage || "Ticket not found"}</p>
        {onNavigateBack && (
          <button type="button" className="zen-btn-secondary" onClick={onNavigateBack}>
            ← Back
          </button>
        )}
      </div>
    );
  }

  const activeAttachments = ticket.attachments ? ticket.attachments.filter((a) => !a.isRemoved) : [];
  const removedAttachments = ticket.attachments ? ticket.attachments.filter((a) => a.isRemoved) : [];

  return (
    <div
      className="staff-ticket-detail-view container py-4"
      style={{ maxWidth: "1100px", paddingBottom: "60px" }}
    >
      {/* Back button */}
      {onNavigateBack && (
        <div className="mb-4 pt-2">
          <button
            type="button"
            className="zen-btn-secondary d-inline-flex align-items-center gap-1"
            onClick={onNavigateBack}
            style={{ fontSize: "14px", padding: "6px 14px" }}
          >
            ← Back to Queue
          </button>
        </div>
      )}

      {/* Operational Header Bar */}
      <div className="zen-card p-4 mb-4 shadow-sm" style={{ borderTop: "4px solid var(--color-primary-green)" }}>
        {/* Top bar: Ticket Number & Status Workflow Action Bar */}
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-3 mb-3 pb-3 border-bottom">
          <div className="d-flex align-items-center gap-3 flex-wrap">
            <h2 className="mb-0 fw-bold" style={{ color: "var(--color-primary-green)", fontSize: "24px" }}>
              {ticket.ticketNumber}
            </h2>
            <span
              className="badge px-3 py-2 rounded-pill fw-semibold"
              data-testid="status-badge"
              style={getStatusBadgeStyle(ticket.currentStatus)}
            >
              {formatStatusTitle(ticket.currentStatus)}
            </span>
            {ticket.isRequesterResolved && (
              <span
                className="badge px-2 py-1 rounded-pill"
                data-testid="requester-resolved-badge"
                style={{ backgroundColor: "#E6F4EA", color: "#137333", border: "1px solid #34A853" }}
              >
                ✓ Requester Resolved
              </span>
            )}
          </div>

          {/* Contextual Status Action Buttons */}
          <div>{renderStatusTransitionButtons()}</div>
        </div>

        {statusError && (
          <div className="alert alert-danger py-2 mb-3 small" role="alert">
            ⚠️ {statusError}
          </div>
        )}

        {/* Ownership Bar */}
        <div
          className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-3 p-3 rounded-3 mb-3"
          style={{ background: "#F4F7F4", border: "1px solid var(--color-border)" }}
          data-testid="ticket-ownership-bar"
        >
          <div>
            <span className="text-muted small fw-bold text-uppercase d-block mb-1">
              Ticket Ownership
            </span>
            <span className="fw-semibold" data-testid="current-owner-display" style={{ color: "var(--color-text-main)", fontSize: "15px" }}>
              {ticket.owner ? `👤 ${ticket.owner.name}` : "Unassigned"}
            </span>
          </div>

          <div className="d-flex align-items-center gap-2 flex-wrap">
            {ticket.ownerId !== currentUser.id && (
              <button
                type="button"
                className="zen-btn-primary"
                data-testid="claim-ticket-btn"
                onClick={handleClaimTicket}
                disabled={isUpdatingOwner}
                style={{ fontSize: "13px", padding: "6px 14px" }}
              >
                {isUpdatingOwner ? "Claiming..." : "Claim Ticket"}
              </button>
            )}

            <div className="d-flex align-items-center gap-2">
              <label htmlFor="reassign-select" className="small text-muted mb-0 fw-semibold">
                Reassign:
              </label>
              <select
                id="reassign-select"
                className="form-select form-select-sm"
                data-testid="reassign-owner-select"
                value={ticket.ownerId ?? ""}
                onChange={(e) => handleReassignTicket(Number(e.target.value))}
                disabled={isUpdatingOwner}
                style={{ width: "auto", minWidth: "180px" }}
              >
                <option value="" disabled>Select Staff / Admin</option>
                {staffUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.role === "ADMINISTRATOR" ? "Admin" : "Staff"})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {ownerError && (
          <div className="alert alert-danger py-2 mb-3 small" role="alert">
            ⚠️ {ownerError}
          </div>
        )}

        {/* IT Priority Bar */}
        <div className="d-flex flex-column flex-sm-row align-items-start align-items-sm-center justify-content-between gap-3 pt-2">
          <div className="d-flex align-items-center gap-3 flex-wrap">
            <div className="d-flex align-items-center gap-2">
              <span className="text-muted small fw-bold text-uppercase">Requested Priority:</span>
              <span
                className={`badge ${getPriorityBadgeClass(ticket.requestedPriority)} px-2 py-1`}
                data-testid="requested-priority-badge"
              >
                {ticket.requestedPriority}
              </span>
            </div>

            <div className="d-flex align-items-center gap-2">
              <span className="text-muted small fw-bold text-uppercase ms-sm-2">IT Priority:</span>
              <select
                className="form-select form-select-sm"
                data-testid="it-priority-select"
                value={ticket.itPriority ?? ticket.requestedPriority}
                onChange={(e) => handleUpdatePriority(e.target.value as StaffPriority)}
                disabled={isUpdatingPriority}
                style={{ width: "auto", minWidth: "120px", fontWeight: 600 }}
              >
                <option value="LOW">LOW</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="HIGH">HIGH</option>
                <option value="URGENT">URGENT</option>
              </select>
              {priorityFeedback && (
                <span className="small text-success fw-semibold ms-1" role="status">
                  ✓ {priorityFeedback}
                </span>
              )}
            </div>
          </div>

          <div className="small text-muted">
            Created: {formatDate(ticket.createdAt)} • Updated: {formatDate(ticket.updatedAt)}
          </div>
        </div>

        {priorityError && (
          <div className="alert alert-danger py-2 mt-2 mb-0 small" role="alert">
            ⚠️ {priorityError}
          </div>
        )}
      </div>

      {/* Ticket Content Card */}
      <div className="zen-card p-4 mb-4 shadow-sm">
        <h4 className="fw-bold mb-3" style={{ color: "var(--color-text-main)" }}>
          {ticket.summary}
        </h4>

        {/* Meta Grid */}
        <div className="row g-3 mb-4 p-3 rounded-3" style={{ backgroundColor: "#F9FAF9", border: "1px solid var(--color-border)" }}>
          <div className="col-12 col-sm-6 col-md-3">
            <span className="text-muted small fw-bold text-uppercase d-block">Requester</span>
            <span className="fw-semibold text-truncate d-block" style={{ color: "var(--color-text-main)" }}>
              {ticket.requester.name}
            </span>
            <span className="small text-muted text-truncate d-block">{ticket.requester.email}</span>
          </div>
          <div className="col-12 col-sm-6 col-md-3">
            <span className="text-muted small fw-bold text-uppercase d-block">Category</span>
            <span className="fw-semibold" style={{ color: "var(--color-text-main)" }}>
              {ticket.category.name}
            </span>
          </div>
          <div className="col-12 col-sm-6 col-md-3">
            <span className="text-muted small fw-bold text-uppercase d-block">Related System</span>
            <span className="fw-semibold" style={{ color: "var(--color-text-main)" }}>
              {ticket.relatedSystem.name}
            </span>
          </div>
          <div className="col-12 col-sm-6 col-md-3">
            <span className="text-muted small fw-bold text-uppercase d-block">Attachments</span>
            <span className="fw-semibold" style={{ color: "var(--color-text-main)" }}>
              {activeAttachments.length} file{activeAttachments.length === 1 ? "" : "s"}
            </span>
          </div>
        </div>

        {/* Full Description */}
        <div className="mb-4">
          <label className="text-muted small fw-bold text-uppercase d-block mb-2">Description</label>
          <div
            className="p-3 rounded-3"
            style={{
              backgroundColor: "#FFFFFF",
              border: "1px solid var(--color-border)",
              whiteSpace: "pre-wrap",
              color: "var(--color-text-main)",
              lineHeight: 1.6,
              minHeight: "80px",
            }}
          >
            {ticket.description}
          </div>
        </div>

        {/* Attachments Section */}
        <div>
          <label className="text-muted small fw-bold text-uppercase d-block mb-2">Attachments</label>
          {activeAttachments.length > 0 ? (
            <div className="list-group mb-3">
              {activeAttachments.map((att) => (
                <div
                  key={att.id}
                  className="list-group-item d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center gap-2 p-3"
                  style={{ borderColor: "var(--color-border)" }}
                >
                  <div className="d-flex align-items-center gap-3">
                    <div style={{ fontSize: "24px" }}>📎</div>
                    <div>
                      <div className="fw-semibold text-truncate" style={{ maxWidth: "350px", color: "var(--color-text-main)" }}>
                        {att.originalFilename}
                      </div>
                      <div className="small text-muted">
                        {formatFileSize(att.sizeBytes)} • Uploaded {formatDate(att.uploadedAt)}
                      </div>
                    </div>
                  </div>

                  <a
                    href={getAttachmentDownloadUrl(ticketId, att.id)}
                    download
                    className="zen-btn-secondary text-decoration-none d-inline-flex align-items-center gap-1"
                    style={{ fontSize: "13px", padding: "4px 12px" }}
                    aria-label={`Download ${att.originalFilename}`}
                  >
                    ⬇ Download
                  </a>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted small mb-3">No active attachments on this ticket.</p>
          )}

          {/* Audit: Soft-Removed Attachments */}
          {removedAttachments.length > 0 && (
            <div className="mt-3 p-3 rounded-3" style={{ backgroundColor: "#F9FAFB", border: "1px dashed #D1D5DB" }}>
              <span className="small text-muted fw-bold text-uppercase d-block mb-2">
                Audit: Removed Attachments ({removedAttachments.length})
              </span>
              <ul className="list-unstyled mb-0 small text-muted">
                {removedAttachments.map((a) => (
                  <li key={a.id} className="py-1">
                    🗑 <del>{a.originalFilename}</del> • Removed on {formatDate(a.removedAt || "")}
                    {a.removedReason && ` (Reason: "${a.removedReason}")`}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Communication Hub: Internal Notes & Public Comments */}
      <div className="row g-4">
        {/* Internal Notes Section (Amber/Gold Distinct Styling per ui-spec §3.5) */}
        <div className="col-12 col-lg-6">
          <div
            className="zen-card p-4 h-100 shadow-sm rounded-3"
            data-testid="internal-notes-section"
            style={{
              backgroundColor: "rgb(255, 251, 235)",
              border: "1px solid #FDE68A",
            }}
          >
            {/* Distinct Internal Header Banner */}
            <div
              className="p-2 mb-3 rounded-2 fw-semibold small text-center"
              style={{
                backgroundColor: "#FEF3C7",
                color: "#92400E",
                border: "1px solid #FCD34D",
              }}
            >
              🔒 Internal IT Notes — Private to IT Staff & Admin (Requesters cannot see this)
            </div>

            {/* Note Composer */}
            <form onSubmit={handlePostNote} className="mb-4">
              <label htmlFor="staff-note-input" className="small fw-bold text-uppercase d-block mb-1" style={{ color: "#92400E" }}>
                Add Private Note
              </label>
              <textarea
                id="staff-note-input"
                className="form-control mb-2"
                rows={3}
                placeholder="Enter private internal note..."
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                disabled={isSubmittingNote}
                maxLength={2000}
                style={{ borderColor: "#FCD34D", fontSize: "14px" }}
              />

              <div className="d-flex justify-content-between align-items-center">
                <span className="small text-muted">{noteContent.length} / 2000 chars</span>
                <button
                  type="submit"
                  className="btn fw-semibold"
                  disabled={isSubmittingNote || !noteContent.trim()}
                  style={{
                    backgroundColor: "#D97706",
                    borderColor: "#B45309",
                    color: "#FFFFFF",
                    fontSize: "13px",
                    padding: "6px 14px",
                    borderRadius: "8px",
                  }}
                >
                  {isSubmittingNote ? "Adding Note..." : "Add Internal Note"}
                </button>
              </div>

              {noteError && (
                <div className="text-danger small mt-2 fw-semibold" role="alert">
                  ⚠️ {noteError}
                </div>
              )}
            </form>

            {/* Chronological Internal Notes List */}
            <div className="internal-notes-stream">
              {internalNotes.length > 0 ? (
                <div className="d-flex flex-column gap-3">
                  {internalNotes.map((note) => (
                    <div
                      key={note.id}
                      className="p-3 rounded-3"
                      style={{
                        backgroundColor: "#FFFFFF",
                        border: "1px solid #FDE68A",
                        boxShadow: "0 1px 2px rgba(245, 158, 11, 0.08)",
                      }}
                    >
                      <div className="d-flex justify-content-between align-items-center mb-1 pb-1 border-bottom border-warning-subtle">
                        <span className="fw-semibold small" style={{ color: "#92400E" }}>
                          🔒 {note.authorName}
                        </span>
                        <span className="small text-muted" style={{ fontSize: "11px" }}>
                          {formatDate(note.createdAt)}
                        </span>
                      </div>
                      <div className="small mt-2" style={{ whiteSpace: "pre-wrap", color: "#451A03" }}>
                        {note.content}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted small text-center my-4">No internal notes yet.</p>
              )}
            </div>
          </div>
        </div>

        {/* Public Comments Section (Light Green/White Styling per ui-spec §3.5) */}
        <div className="col-12 col-lg-6">
          <div
            className="zen-card p-4 h-100 shadow-sm rounded-3"
            data-testid="public-comments-section"
            style={{
              backgroundColor: "#FFFFFF",
              border: "1px solid var(--color-border)",
            }}
          >
            {/* Public Header Banner */}
            <div
              className="p-2 mb-3 rounded-2 fw-semibold small text-center"
              style={{
                backgroundColor: "var(--color-pale-green)",
                color: "var(--color-primary-green)",
                border: "1px solid var(--color-border)",
              }}
            >
              🌐 Public Comments — Visible to Requester and IT Staff
            </div>

            {/* Comment Composer */}
            <form onSubmit={handlePostComment} className="mb-4">
              <label htmlFor="staff-comment-input" className="small fw-bold text-uppercase d-block mb-1" style={{ color: "var(--color-text-main)" }}>
                Add Public Comment
              </label>
              <textarea
                id="staff-comment-input"
                className="form-control mb-2"
                rows={3}
                placeholder="Write a comment visible to requester..."
                value={commentContent}
                onChange={(e) => setCommentContent(e.target.value)}
                disabled={isSubmittingComment}
                maxLength={2000}
                style={{ fontSize: "14px" }}
              />

              <div className="d-flex justify-content-between align-items-center">
                <span className="small text-muted">{commentContent.length} / 2000 chars</span>
                <button
                  type="submit"
                  className="zen-btn-primary"
                  disabled={isSubmittingComment || !commentContent.trim()}
                  style={{ fontSize: "13px", padding: "6px 14px" }}
                >
                  {isSubmittingComment ? "Posting..." : "Post Public Comment"}
                </button>
              </div>

              {commentError && (
                <div className="text-danger small mt-2 fw-semibold" role="alert">
                  ⚠️ {commentError}
                </div>
              )}
            </form>

            {/* Chronological Public Comments List */}
            <div className="public-comments-stream">
              {ticket.publicComments && ticket.publicComments.length > 0 ? (
                <div className="d-flex flex-column gap-3">
                  {ticket.publicComments.map((c) => (
                    <div
                      key={c.id}
                      className="p-3 rounded-3"
                      style={{
                        backgroundColor: "#F9FAF9",
                        border: "1px solid var(--color-border)",
                      }}
                    >
                      <div className="d-flex justify-content-between align-items-center mb-1 pb-1 border-bottom">
                        <div className="d-flex align-items-center gap-2">
                          <span className="fw-semibold small" style={{ color: "var(--color-text-main)" }}>
                            {c.authorName}
                          </span>
                          <span
                            className="badge small"
                            style={{
                              backgroundColor: c.authorRole === "IT_STAFF" ? "var(--color-primary-green)" : "#5F6368",
                              fontSize: "10px",
                            }}
                          >
                            {c.authorRole === "IT_STAFF" ? "IT Staff" : "Requester"}
                          </span>
                        </div>
                        <span className="small text-muted" style={{ fontSize: "11px" }}>
                          {formatDate(c.createdAt)}
                        </span>
                      </div>
                      <div className="small mt-2" style={{ whiteSpace: "pre-wrap", color: "var(--color-text-main)" }}>
                        {c.content}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted small text-center my-4">No public comments yet.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
