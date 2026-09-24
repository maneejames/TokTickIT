import React, { useState, useEffect, useRef } from "react";
import {
  TicketDetail,
  Attachment,
  RequesterUser,
  PublicCommentItem,
  getTicketDetail,
  uploadAttachment,
  removeAttachment,
  getAttachmentDownloadUrl,
  postPublicComment,
  updateResolveIndicator,
} from "../api.js";

interface RequesterTicketDetailProps {
  ticketId: number;
  currentRequester: RequesterUser;
  onNavigateToMyTickets: () => void;
}

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".pdf"];
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export const RequesterTicketDetail: React.FC<RequesterTicketDetailProps> = ({
  ticketId,
  currentRequester,
  onNavigateToMyTickets,
}) => {
  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Uploading state
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Removal modal state
  const [removingAttachment, setRemovingAttachment] = useState<Attachment | null>(null);
  const [removalReason, setRemovalReason] = useState<string>("");
  const [removalError, setRemovalError] = useState<string | null>(null);
  const [isRemoving, setIsRemoving] = useState<boolean>(false);

  // Problem Appears Resolved state
  const [isUpdatingResolved, setIsUpdatingResolved] = useState<boolean>(false);
  const [resolveError, setResolveError] = useState<string | null>(null);

  // Public Comments state
  const [commentContent, setCommentContent] = useState<string>("");
  const [isSubmittingComment, setIsSubmittingComment] = useState<boolean>(false);
  const [commentError, setCommentError] = useState<string | null>(null);

  const handleToggleResolved = async (checked: boolean) => {
    if (!ticket || isUpdatingResolved) return;
    setResolveError(null);
    setIsUpdatingResolved(true);
    const prevVal = ticket.isRequesterResolved ?? false;

    // Optimistic update
    setTicket({ ...ticket, isRequesterResolved: checked });

    try {
      const res = await updateResolveIndicator(ticket.id, checked);
      setTicket((prev) => (prev ? { ...prev, isRequesterResolved: res.isRequesterResolved } : null));
    } catch (err: unknown) {
      setTicket((prev) => (prev ? { ...prev, isRequesterResolved: prevVal } : null));
      const e = err as Error;
      setResolveError(e.message || "Failed to update resolved status");
    } finally {
      setIsUpdatingResolved(false);
    }
  };

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

  const fetchDetail = async () => {
    setIsLoading(true);
    setErrorStatus(null);
    setErrorMessage(null);
    try {
      const data = await getTicketDetail(ticketId, currentRequester.id);
      setTicket(data);
    } catch (err: unknown) {
      const e = err as Error & { status?: number };
      setErrorStatus(e.status ?? 500);
      setErrorMessage(e.message || "Failed to load ticket details");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [ticketId, currentRequester.id]);

  const activeAttachments = ticket?.attachments?.filter((a) => !a.isRemoved) ?? [];
  const removedAttachments = ticket?.attachments?.filter((a) => a.isRemoved) ?? [];
  const canAddAttachment = activeAttachments.length < 5;

  const validateFile = (file: File): string | null => {
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return `File "${file.name}" exceeds the 5 MB limit.`;
    }
    const fileExt = "." + file.name.split(".").pop()?.toLowerCase();
    const isMimeValid = ALLOWED_MIME_TYPES.includes(file.type);
    const isExtValid = ALLOWED_EXTENSIONS.includes(fileExt);
    if (!isMimeValid && !isExtValid) {
      return `File "${file.name}" has an unsupported format. Allowed formats: JPG, PNG, WEBP, PDF.`;
    }
    return null;
  };

  const handleFileUpload = async (file: File) => {
    setUploadError(null);
    if (!canAddAttachment) {
      setUploadError("Maximum of 5 active attachments reached for this ticket.");
      return;
    }

    const validationError = validateFile(file);
    if (validationError) {
      setUploadError(validationError);
      return;
    }

    setIsUploading(true);
    try {
      const uploaded = await uploadAttachment(ticketId, file, currentRequester.id);
      if (ticket) {
        setTicket({
          ...ticket,
          attachments: [...(ticket.attachments || []), uploaded],
        });
      }
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : "Failed to upload attachment");
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const openRemovalModal = (att: Attachment) => {
    setRemovingAttachment(att);
    setRemovalReason("");
    setRemovalError(null);
  };

  const closeRemovalModal = () => {
    setRemovingAttachment(null);
    setRemovalReason("");
    setRemovalError(null);
  };

  const handleConfirmRemoval = async () => {
    if (!removingAttachment) return;
    if (removalReason.length > 200) {
      setRemovalError("Removal reason must not exceed 200 characters.");
      return;
    }

    setIsRemoving(true);
    setRemovalError(null);
    try {
      const res = await removeAttachment(
        ticketId,
        removingAttachment.id,
        currentRequester.id,
        removalReason
      );

      if (ticket) {
        setTicket({
          ...ticket,
          attachments: ticket.attachments.map((a) =>
            a.id === removingAttachment.id
              ? {
                  ...a,
                  isRemoved: true,
                  removedAt: res.removedAt,
                  removedReason: res.removedReason ?? (removalReason.trim() || null),
                }
              : a
          ),
        });
      }
      closeRemovalModal();
    } catch (err: unknown) {
      setRemovalError(err instanceof Error ? err.message : "Failed to remove attachment");
    } finally {
      setIsRemoving(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (isoString?: string | null): string => {
    if (!isoString) return "—";
    try {
      const d = new Date(isoString);
      return (
        d.toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        }) +
        " " +
        d.toLocaleTimeString("en-GB", {
          hour: "2-digit",
          minute: "2-digit",
        })
      );
    } catch {
      return isoString;
    }
  };

  const renderPriorityBadge = (priority: string) => {
    const p = priority?.toUpperCase();
    if (p === "HIGH") {
      return (
        <span
          className="badge"
          style={{
            backgroundColor: "var(--color-error-bg)",
            color: "var(--color-error)",
            border: "1px solid #F8B4B4",
            padding: "4px 10px",
            fontSize: "12px",
            fontWeight: 600,
            borderRadius: "12px",
          }}
        >
          HIGH
        </span>
      );
    }
    if (p === "LOW") {
      return (
        <span
          className="badge"
          style={{
            backgroundColor: "#F0F4F2",
            color: "#375043",
            border: "1px solid #D1DDD5",
            padding: "4px 10px",
            fontSize: "12px",
            fontWeight: 600,
            borderRadius: "12px",
          }}
        >
          LOW
        </span>
      );
    }
    return (
      <span
        className="badge"
        style={{
          backgroundColor: "var(--color-warning-bg)",
          color: "#8F6500",
          border: "1px solid #F5DE9C",
          padding: "4px 10px",
          fontSize: "12px",
          fontWeight: 600,
          borderRadius: "12px",
        }}
      >
        MEDIUM
      </span>
    );
  };

  const renderStatusBadge = (_status: string) => {
    return (
      <span
        className="badge"
        style={{
          backgroundColor: "var(--color-pale-green)",
          color: "var(--color-primary-green)",
          border: "1px solid #B8E2CB",
          padding: "4px 10px",
          fontSize: "12px",
          fontWeight: 600,
          borderRadius: "12px",
        }}
      >
        New
      </span>
    );
  };

  // ── Loading state ────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="container py-5 text-center" data-testid="ticket-detail-loading">
        <div className="spinner-border text-success" role="status" style={{ color: "var(--color-primary-green)" }}>
          <span className="visually-hidden">Loading ticket details...</span>
        </div>
        <p className="mt-3 text-muted">Loading ticket details...</p>
      </div>
    );
  }

  // ── Error / Not Found state (safe rejection) ─────────────────────────────
  if (errorStatus === 404 || !ticket) {
    return (
      <div className="container py-5" data-testid="ticket-not-found">
        <div className="zen-card p-5 text-center mx-auto" style={{ maxWidth: "600px" }}>
          <div style={{ fontSize: "48px", color: "var(--color-text-muted)" }}>🔍</div>
          <h2 className="h4 mt-3" style={{ color: "var(--color-text-main)", fontWeight: 700 }}>
            Ticket Not Found
          </h2>
          <p className="text-muted mt-2 mb-4">
            The requested ticket does not exist or you do not have permission to view it.
          </p>
          <button
            type="button"
            className="zen-btn-primary"
            onClick={onNavigateToMyTickets}
          >
            Back to My Tickets
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-4" style={{ maxWidth: "860px" }}>
      {/* Back button & Breadcrumb */}
      <div className="mb-3 d-flex justify-content-between align-items-center">
        <button
          type="button"
          className="btn btn-link p-0 text-decoration-none"
          onClick={onNavigateToMyTickets}
          style={{ color: "var(--color-secondary-green)", fontWeight: 600 }}
        >
          ← Back to My Tickets
        </button>
      </div>

      {/* Ticket Header & Details Card */}
      <div className="zen-card p-4 p-md-5 mb-4" data-testid="ticket-header-card">
        <div className="d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center gap-2 mb-4 pb-3 border-bottom">
          <div>
            <h1 className="h3 mb-1" style={{ color: "var(--color-primary-green)", fontWeight: 700 }}>
              {ticket.ticketNumber}
            </h1>
            <span className="text-muted small">Submitted on {formatDate(ticket.createdAt)}</span>
          </div>
          <div className="d-flex gap-2 align-items-center">
            {renderStatusBadge(ticket.currentStatus)}
            {renderPriorityBadge(ticket.requestedPriority)}
          </div>
        </div>

        {/* Read-Only Ticket Meta Grid */}
        <div className="row g-3 mb-4">
          <div className="col-12 col-md-6">
            <label className="text-muted small fw-bold text-uppercase d-block mb-1">
              Requester
            </label>
            <div
              className="p-2 rounded-2"
              style={{
                backgroundColor: "var(--color-field-readonly)",
                border: "1px solid var(--color-border)",
                color: "var(--color-text-main)",
                fontSize: "14px",
              }}
            >
              👤 {ticket.requester.name} ({ticket.requester.department})
            </div>
          </div>

          <div className="col-12 col-md-6">
            <label className="text-muted small fw-bold text-uppercase d-block mb-1">
              Category & Related System
            </label>
            <div
              className="p-2 rounded-2"
              style={{
                backgroundColor: "var(--color-field-readonly)",
                border: "1px solid var(--color-border)",
                color: "var(--color-text-main)",
                fontSize: "14px",
              }}
            >
              {ticket.category.name} — {ticket.relatedSystem.name}
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="mb-4">
          <label className="text-muted small fw-bold text-uppercase d-block mb-1">
            Summary
          </label>
          <div
            className="p-3 rounded-2 fw-semibold"
            style={{
              backgroundColor: "var(--color-field-readonly)",
              border: "1px solid var(--color-border)",
              color: "var(--color-text-main)",
              fontSize: "16px",
            }}
          >
            {ticket.summary}
          </div>
        </div>

        {/* Description */}
        <div className="mb-2">
          <label className="text-muted small fw-bold text-uppercase d-block mb-1">
            Description
          </label>
          <div
            className="p-3 rounded-2"
            style={{
              backgroundColor: "var(--color-field-readonly)",
              border: "1px solid var(--color-border)",
              color: "var(--color-text-main)",
              fontSize: "14px",
              whiteSpace: "pre-wrap",
              minHeight: "120px",
              lineHeight: 1.6,
            }}
          >
            {ticket.description}
          </div>
        </div>
      </div>

      {/* Attachments Section */}
      <div className="zen-card p-4 p-md-5 mb-4" data-testid="attachments-section">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h2 className="h5 mb-0" style={{ color: "var(--color-text-main)", fontWeight: 700 }}>
            Attachments ({activeAttachments.length}/5 active)
          </h2>
        </div>

        {/* Active Attachments List */}
        {activeAttachments.length > 0 ? (
          <div className="list-group mb-4" data-testid="active-attachments-list">
            {activeAttachments.map((att) => (
              <div
                key={att.id}
                className="list-group-item d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center gap-2 p-3"
                style={{ borderColor: "var(--color-border)" }}
              >
                <div className="d-flex align-items-center gap-3">
                  <div style={{ fontSize: "24px" }}>📎</div>
                  <div>
                    <div className="fw-semibold text-truncate" style={{ maxWidth: "320px", color: "var(--color-text-main)" }}>
                      {att.originalFilename}
                    </div>
                    <div className="small text-muted">
                      {formatFileSize(att.sizeBytes)} • Uploaded {formatDate(att.uploadedAt)}
                    </div>
                  </div>
                </div>

                <div className="d-flex gap-2 align-self-end align-self-sm-center">
                  <a
                    href={getAttachmentDownloadUrl(ticketId, att.id, currentRequester.id)}
                    download
                    className="zen-btn-secondary text-decoration-none d-inline-flex align-items-center gap-1"
                    style={{ fontSize: "13px", padding: "4px 10px" }}
                    aria-label={`Download ${att.originalFilename}`}
                  >
                    ⬇ Download
                  </a>
                  <button
                    type="button"
                    className="btn btn-outline-danger"
                    style={{ fontSize: "13px", padding: "4px 10px", borderRadius: "8px" }}
                    onClick={() => openRemovalModal(att)}
                    aria-label={`Remove ${att.originalFilename}`}
                  >
                    🗑 Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted small mb-4">No active attachments on this ticket.</p>
        )}

        {/* Add Attachment Dropzone / Control */}
        <div className="mb-4">
          <label className="text-muted small fw-bold text-uppercase d-block mb-2">
            Add Attachment
          </label>

          {canAddAttachment ? (
            <div>
              <div
                className={`p-4 text-center rounded-3 ${isDragOver ? "bg-light" : ""}`}
                style={{
                  border: isDragOver
                    ? "2px dashed var(--color-primary-green)"
                    : "2px dashed var(--color-border)",
                  backgroundColor: isDragOver ? "var(--color-pale-green)" : "#FAFCFA",
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragOver(true);
                }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <div style={{ fontSize: "28px", color: "var(--color-secondary-green)" }}>📁</div>
                <div className="mt-2 fw-semibold" style={{ color: "var(--color-text-main)", fontSize: "14px" }}>
                  Click or drag file here to attach
                </div>
                <div className="text-muted small mt-1">
                  Allowed formats: JPG, PNG, WEBP, PDF. Max 5 MB.
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="d-none"
                  accept=".jpg,.jpeg,.png,.webp,.pdf"
                  onChange={handleFileInputChange}
                  disabled={isUploading}
                />
              </div>

              {isUploading && (
                <div className="mt-2 text-center text-muted small">
                  <div className="spinner-border spinner-border-sm text-success me-2" role="status" />
                  Uploading attachment...
                </div>
              )}

              {uploadError && (
                <div className="mt-2 text-danger small fw-semibold" role="alert">
                  ⚠️ {uploadError}
                </div>
              )}
            </div>
          ) : (
            <div
              className="alert mb-0"
              style={{
                backgroundColor: "var(--color-warning-bg)",
                border: "1px solid #E5CE85",
                color: "#6C4E00",
                fontSize: "14px",
              }}
              role="status"
            >
              <strong>Maximum attachments reached:</strong> This ticket already has 5 active attachments. Remove an existing attachment to add a new one.
            </div>
          )}
        </div>

        {/* Removed Attachments Audit List */}
        {removedAttachments.length > 0 && (
          <div className="mt-4 pt-3 border-top" data-testid="removed-attachments-section">
            <h3 className="h6 text-muted text-uppercase fw-bold mb-3">
              Removed Attachments ({removedAttachments.length})
            </h3>
            <div className="list-group" data-testid="removed-attachments-list">
              {removedAttachments.map((att) => (
                <div
                  key={att.id}
                  className="list-group-item p-3 bg-light"
                  style={{ borderColor: "var(--color-border)" }}
                >
                  <div className="d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center gap-2">
                    <div>
                      <div
                        className="fw-semibold text-muted text-decoration-line-through text-truncate"
                        style={{ maxWidth: "340px" }}
                      >
                        {att.originalFilename}
                      </div>
                      <div className="small text-muted">
                        Removed on {formatDate(att.removedAt)}
                        {att.removedReason && (
                          <span className="ms-2 fst-italic">
                            — Reason: "{att.removedReason}"
                          </span>
                        )}
                      </div>
                    </div>
                    <span
                      className="badge bg-secondary text-white"
                      style={{ fontSize: "11px", padding: "4px 8px" }}
                    >
                      Download Disabled
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Problem Appears Resolved Section (ui-spec §3.3, BR-05) */}
      <div className="zen-card p-4 p-md-5 mb-4" data-testid="problem-resolved-section">
        <h2 className="h5 mb-3" style={{ color: "var(--color-text-main)", fontWeight: 700 }}>
          Problem Appears Resolved
        </h2>
        <div className="d-flex flex-column gap-2">
          <div className="form-check d-flex align-items-center gap-2">
            <input
              type="checkbox"
              id="problemResolvedCheckbox"
              className="form-check-input"
              style={{ width: "20px", height: "20px", cursor: "pointer" }}
              checked={ticket.isRequesterResolved ?? false}
              onChange={(e) => handleToggleResolved(e.target.checked)}
              disabled={isUpdatingResolved}
            />
            <label
              htmlFor="problemResolvedCheckbox"
              className="form-check-label fw-semibold"
              style={{ cursor: "pointer", color: "var(--color-text-main)" }}
            >
              Mark as: Problem Appears Resolved
            </label>
          </div>

          {ticket.isRequesterResolved && (
            <div className="mt-2">
              <span
                className="badge"
                style={{
                  backgroundColor: "var(--color-accent-subtle)",
                  color: "var(--color-primary-dark)",
                  border: "1px solid var(--color-primary-light)",
                  padding: "6px 12px",
                  fontSize: "13px",
                  fontWeight: 600,
                  borderRadius: "16px",
                }}
              >
                ✓ Requester indicates issue resolved
              </span>
            </div>
          )}

          <p className="text-muted small mb-0 mt-1">
            Does not formally close ticket. IT Staff will verify and complete resolution.
          </p>

          {resolveError && (
            <div className="alert alert-danger py-2 mt-2 small" role="alert">
              {resolveError}
            </div>
          )}
        </div>
      </div>

      {/* Public Comments Section (ui-spec §3.3, AC-19) */}
      <div className="zen-card p-4 p-md-5 mb-4" data-testid="public-comments-section">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h2 className="h5 mb-0" style={{ color: "var(--color-text-main)", fontWeight: 700 }}>
            Public Comments
          </h2>
          <span className="small text-muted">
            🌐 Visible to Requester and IT Staff
          </span>
        </div>

        {/* Chronological Comment Stream */}
        <div className="d-flex flex-column gap-3 mb-4" data-testid="public-comments-list">
          {ticket.publicComments && ticket.publicComments.length > 0 ? (
            ticket.publicComments.map((comment) => {
              const isStaff = comment.authorRole === "IT_STAFF";
              return (
                <div
                  key={comment.id}
                  className="p-3 rounded-2"
                  style={{
                    backgroundColor: isStaff ? "#F0FDF4" : "var(--color-field-readonly)",
                    border: `1px solid ${isStaff ? "#BBF7D0" : "var(--color-border)"}`,
                  }}
                >
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <div className="d-flex align-items-center gap-2">
                      <span className="fw-semibold" style={{ color: "var(--color-text-main)", fontSize: "14px" }}>
                        {comment.authorName}
                      </span>
                      <span
                        className="badge"
                        style={{
                          backgroundColor: isStaff ? "#DCFCE7" : "#E0E7FF",
                          color: isStaff ? "#166534" : "#3730A3",
                          fontSize: "11px",
                          fontWeight: 600,
                          borderRadius: "8px",
                          padding: "2px 6px",
                        }}
                      >
                        {comment.authorRole === "IT_STAFF" ? "IT Staff" : "Requester"}
                      </span>
                    </div>
                    <span className="small text-muted" style={{ fontSize: "12px" }}>
                      {formatDate(comment.createdAt)}
                    </span>
                  </div>
                  <div
                    style={{
                      color: "var(--color-text-main)",
                      fontSize: "14px",
                      whiteSpace: "pre-wrap",
                      lineHeight: 1.5,
                    }}
                  >
                    {comment.content}
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-muted small mb-0">No public comments on this ticket yet.</p>
          )}
        </div>

        {/* Comment Composer */}
        <form onSubmit={handlePostComment} className="border-top pt-3">
          <label htmlFor="publicCommentInput" className="form-label small fw-semibold text-muted text-uppercase mb-2">
            Add Public Comment
          </label>
          <textarea
            id="publicCommentInput"
            className="zen-input w-100 mb-2"
            rows={3}
            maxLength={2000}
            placeholder="Write a message visible to IT Staff..."
            value={commentContent}
            onChange={(e) => setCommentContent(e.target.value)}
            disabled={isSubmittingComment}
          />
          <div className="d-flex justify-content-between align-items-center">
            <span className="small text-muted">
              {commentContent.length}/2000 characters
            </span>
            <button
              type="submit"
              className="zen-btn-primary"
              disabled={isSubmittingComment || !commentContent.trim()}
              style={{ padding: "8px 16px", fontSize: "14px" }}
            >
              {isSubmittingComment ? "Posting..." : "Post Public Comment"}
            </button>
          </div>

          {commentError && (
            <div className="alert alert-danger py-2 mt-2 small" role="alert">
              {commentError}
            </div>
          )}
        </form>
      </div>

      {/* Attachment Removal Confirmation Modal */}
      {removingAttachment && (
        <div
          className="modal d-block"
          tabIndex={-1}
          style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
          role="dialog"
          aria-modal="true"
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content zen-card border-0 shadow">
              <div className="modal-header border-bottom">
                <h5 className="modal-title text-danger fw-bold">Remove Attachment</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={closeRemovalModal}
                  disabled={isRemoving}
                  aria-label="Close"
                />
              </div>

              <div className="modal-body">
                <p style={{ color: "var(--color-text-main)", fontSize: "14px" }}>
                  Are you sure you want to remove <strong>"{removingAttachment.originalFilename}"</strong>?
                  This file will no longer be downloadable.
                </p>

                <div className="mt-3">
                  <label htmlFor="removalReasonInput" className="form-label small fw-semibold">
                    Reason for removal (optional, max 200 chars)
                  </label>
                  <textarea
                    id="removalReasonInput"
                    className="zen-input"
                    rows={3}
                    maxLength={200}
                    placeholder="e.g. Uploaded incorrect screenshot"
                    value={removalReason}
                    onChange={(e) => setRemovalReason(e.target.value)}
                    disabled={isRemoving}
                  />
                  <div className="d-flex justify-content-end text-muted small mt-1">
                    {removalReason.length}/200
                  </div>
                </div>

                {removalError && (
                  <div className="alert alert-danger py-2 mt-2 small" role="alert">
                    {removalError}
                  </div>
                )}
              </div>

              <div className="modal-footer border-top">
                <button
                  type="button"
                  className="zen-btn-secondary"
                  onClick={closeRemovalModal}
                  disabled={isRemoving}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-danger"
                  style={{ borderRadius: "8px", fontWeight: 600, padding: "8px 16px" }}
                  onClick={handleConfirmRemoval}
                  disabled={isRemoving}
                >
                  {isRemoving ? "Removing..." : "Confirm Removal"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
