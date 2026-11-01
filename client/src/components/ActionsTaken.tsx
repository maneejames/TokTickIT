import React, { useState, useEffect, useRef } from "react";
import {
  ActionTaken,
  ActionStatus,
  User,
  AdminUser,
  getTicketActions,
  postTicketAction,
  reassignTicketAction,
  updateTicketActionStatus,
  getStaffUsers,
} from "../api.js";

interface ActionsTakenProps {
  ticketId: number;
  currentUser: User;
  isStaffOrAdmin?: boolean;
  ticketAttachments?: { id: number; originalFilename: string }[];
  onActionAdded?: () => void;
}

function generateIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return "act-key-" + Date.now() + "-" + Math.random().toString(36).substring(2, 9);
}

export const ActionsTaken: React.FC<ActionsTakenProps> = ({
  ticketId,
  currentUser,
  isStaffOrAdmin = currentUser.role === "IT_STAFF" || currentUser.role === "ADMINISTRATOR",
  ticketAttachments = [],
  onActionAdded,
}) => {
  const [actions, setActions] = useState<ActionTaken[]>([]);
  const [staffUsers, setStaffUsers] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [listError, setListError] = useState<string | null>(null);
  const [conflictMessage, setConflictMessage] = useState<string | null>(null);

  // Add action form state
  const [isAdding, setIsAdding] = useState<boolean>(false);
  const [idempotencyKey, setIdempotencyKey] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [result, setResult] = useState<string>("");
  const [followUpRequired, setFollowUpRequired] = useState<boolean>(false);
  const [followUpNote, setFollowUpNote] = useState<string>("");
  const [assignedToId, setAssignedToId] = useState<string>("");
  const [attachmentNotes, setAttachmentNotes] = useState<string>("");

  const [formErrors, setFormErrors] = useState<{
    description?: string;
    result?: string;
    followUpNote?: string;
  }>({});
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Field refs for moving focus to first invalid field
  const descRef = useRef<HTMLTextAreaElement>(null);
  const resultRef = useRef<HTMLTextAreaElement>(null);
  const noteRef = useRef<HTMLTextAreaElement>(null);

  const fetchActions = async () => {
    setIsLoading(true);
    setListError(null);
    setConflictMessage(null);
    try {
      const res = await getTicketActions(ticketId);
      // Stable ascending order: actionDate/actionDateTime ascending, tie-break by id
      const sorted = (res.items || []).slice().sort((a, b) => {
        const timeA = new Date(a.actionDateTime || a.actionDate || a.createdAt).getTime();
        const timeB = new Date(b.actionDateTime || b.actionDate || b.createdAt).getTime();
        if (timeA !== timeB) return timeA - timeB;
        return a.id - b.id;
      });
      setActions(sorted);
    } catch (err: any) {
      setListError(err.message || "Failed to load actions taken");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchActions();
    if (isStaffOrAdmin) {
      getStaffUsers()
        .then((users) => {
          // Filter to only active staff/admins
          const active = (users as unknown as AdminUser[]).filter(
            (u) => u.isActive !== false && (u.role === "IT_STAFF" || u.role === "ADMINISTRATOR")
          );
          setStaffUsers(active);
        })
        .catch(() => {
          setStaffUsers([]);
        });
    }
  }, [ticketId, isStaffOrAdmin]);

  const handleOpenAddForm = () => {
    setIdempotencyKey(generateIdempotencyKey());
    setDescription("");
    setResult("");
    setFollowUpRequired(false);
    setFollowUpNote("");
    setAssignedToId("");
    setAttachmentNotes("");
    setFormErrors({});
    setSubmitError(null);
    setIsAdding(true);
  };

  const handleCloseAddForm = () => {
    if (description.trim() || result.trim() || followUpNote.trim() || attachmentNotes.trim()) {
      const confirmed = window.confirm("Discard unsaved changes?");
      if (!confirmed) return;
    }
    setIsAdding(false);
    setFormErrors({});
    setSubmitError(null);
  };

  const handleSaveAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    const errors: { description?: string; result?: string; followUpNote?: string } = {};
    if (!description.trim()) {
      errors.description = "Description is required";
    }
    if (!result.trim()) {
      errors.result = "Result is required";
    }
    if (followUpRequired && !followUpNote.trim()) {
      errors.followUpNote = "Follow-up note is required when follow-up is enabled";
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      if (errors.description) {
        descRef.current?.focus();
      } else if (errors.result) {
        resultRef.current?.focus();
      } else if (errors.followUpNote) {
        noteRef.current?.focus();
      }
      return;
    }

    setFormErrors({});
    setSubmitError(null);
    setIsSubmitting(true);

    try {
      const parsedAssigneeId = assignedToId ? parseInt(assignedToId, 10) : null;
      const payload = {
        description: description.trim(),
        result: result.trim(),
        followUpRequired,
        followUpNote: followUpRequired ? followUpNote.trim() : null,
        assignedToId: parsedAssigneeId,
        assigneeId: parsedAssigneeId,
        attachmentNotes: attachmentNotes.trim() ? attachmentNotes.trim() : null,
      };

      await postTicketAction(ticketId, payload, idempotencyKey);
      setIsAdding(false);
      await fetchActions();
      if (onActionAdded) onActionAdded();
    } catch (err: any) {
      setSubmitError(err.message || "Failed to save action");
      if (err.status === 409 || err.message?.includes("409")) {
        setConflictMessage("This action was changed by someone else. Reload to see the latest version.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusChange = async (action: ActionTaken, nextStatus: "COMPLETED" | "CANCELLED") => {
    if (nextStatus === "CANCELLED") {
      const confirmed = window.confirm("Are you sure you want to cancel this action?");
      if (!confirmed) return;
    }

    try {
      await updateTicketActionStatus(ticketId, action.id, {
        status: nextStatus,
        expectedVersion: action.version,
      });
      await fetchActions();
    } catch (err: any) {
      if (err.status === 409 || err.message?.includes("409")) {
        setConflictMessage("This action was changed by someone else. Reload to see the latest version.");
      } else {
        alert(err.message || "Failed to update action status");
      }
    }
  };

  const handleReassign = async (action: ActionTaken, newAssigneeId: string) => {
    try {
      const parsedId = newAssigneeId ? parseInt(newAssigneeId, 10) : null;
      await reassignTicketAction(ticketId, action.id, {
        assignedToId: parsedId,
        assigneeId: parsedId,
        expectedVersion: action.version,
      });
      await fetchActions();
    } catch (err: any) {
      if (err.status === 409 || err.message?.includes("409")) {
        setConflictMessage("This action was changed by someone else. Reload to see the latest version.");
      } else {
        alert(err.message || "Failed to reassign action");
      }
    }
  };

  const getStatusBadge = (status: ActionStatus) => {
    switch (status) {
      case "PLANNED":
        return (
          <span
            className="badge px-2 py-1 rounded-pill"
            style={{
              backgroundColor: "#E8F0FE",
              color: "#1A73E8",
              border: "1px solid #D2E3FC",
              fontWeight: 600,
              fontSize: "12px",
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
            }}
          >
            <span>📋</span>
            <span>Planned</span>
          </span>
        );
      case "COMPLETED":
        return (
          <span
            className="badge px-2 py-1 rounded-pill"
            style={{
              backgroundColor: "var(--color-pale-green)",
              color: "var(--color-primary-green)",
              border: "1px solid #B8E2CB",
              fontWeight: 600,
              fontSize: "12px",
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
            }}
          >
            <span>✓</span>
            <span>Completed</span>
          </span>
        );
      case "CANCELLED":
        return (
          <span
            className="badge px-2 py-1 rounded-pill"
            style={{
              backgroundColor: "#F1F3F4",
              color: "#5F6368",
              border: "1px solid #DADCE0",
              fontWeight: 600,
              fontSize: "12px",
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
            }}
          >
            <span>✕</span>
            <span>Cancelled</span>
          </span>
        );
      default:
        return <span className="badge">{status}</span>;
    }
  };

  const formatDateTime = (isoString?: string | null) => {
    if (!isoString) return "—";
    try {
      const d = new Date(isoString);
      return d.toLocaleString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="actions-taken-container" style={{ width: "100%" }}>
      {/* Responsive Styles: Table on Desktop (≥768px) -> Stacked Cards on Mobile (<768px) */}
      <style>{`
        @media (max-width: 767.98px) {
          .actions-table-responsive {
            overflow: visible !important;
            max-height: none !important;
            border: none !important;
            background: transparent !important;
            box-shadow: none !important;
          }
          .actions-table-responsive table,
          .actions-table-responsive tbody {
            display: block !important;
            width: 100% !important;
            background: transparent !important;
          }
          .actions-table-responsive thead {
            display: none !important;
          }
          .actions-table-responsive tr {
            display: grid !important;
            grid-template-columns: 1fr auto !important;
            grid-gap: 8px 12px !important;
            background-color: var(--color-surface) !important;
            border: 1px solid var(--color-border) !important;
            border-radius: 12px !important;
            padding: 14px 16px !important;
            margin-bottom: 14px !important;
            box-shadow: 0 2px 6px rgba(0, 0, 0, 0.04) !important;
          }
          .actions-table-responsive td {
            display: block !important;
            padding: 0 !important;
            border: none !important;
          }
          .actions-table-responsive td::before {
            content: attr(data-label);
            display: block;
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
            color: var(--color-text-muted);
            margin-bottom: 2px;
          }

          /* Date/Time and Status top bar */
          .actions-table-responsive td[data-label="Date/Time"] {
            grid-column: 1 / 2 !important;
            font-size: 12px !important;
            color: var(--color-text-muted) !important;
          }
          .actions-table-responsive td[data-label="Date/Time"]::before {
            display: none !important;
          }

          .actions-table-responsive td[data-label="Status"] {
            grid-column: 2 / 3 !important;
            grid-row: 1 / 3 !important;
            justify-self: end !important;
            align-self: start !important;
          }
          .actions-table-responsive td[data-label="Status"]::before {
            display: none !important;
          }

          /* Performer */
          .actions-table-responsive td[data-label="Performed by"] {
            grid-column: 1 / 2 !important;
            font-weight: 700 !important;
            font-size: 14px !important;
            color: var(--color-text-main) !important;
          }
          .actions-table-responsive td[data-label="Performed by"]::before {
            display: none !important;
          }

          /* Description, Result, Attachment Notes full width */
          .actions-table-responsive td[data-label="Description"],
          .actions-table-responsive td[data-label="Result"],
          .actions-table-responsive td[data-label="Attachment Notes"] {
            grid-column: 1 / -1 !important;
            border-top: 1px dashed #E5E7EB !important;
            padding-top: 6px !important;
          }

          /* Assignee & Follow-up row */
          .actions-table-responsive td[data-label="Assignee"] {
            grid-column: 1 / 2 !important;
            border-top: 1px dashed #E5E7EB !important;
            padding-top: 6px !important;
          }
          .actions-table-responsive td[data-label="Follow-up"] {
            grid-column: 2 / 3 !important;
            border-top: 1px dashed #E5E7EB !important;
            padding-top: 6px !important;
          }

          /* Actions bar at bottom */
          .actions-table-responsive td.cell-actions {
            grid-column: 1 / -1 !important;
            border-top: 1px solid var(--color-border) !important;
            padding-top: 10px !important;
            margin-top: 4px !important;
          }
          .actions-table-responsive td.cell-actions::before {
            display: none !important;
          }
          .actions-table-responsive td.cell-actions .d-inline-flex {
            display: flex !important;
            width: 100% !important;
            gap: 8px !important;
          }
          .actions-table-responsive td.cell-actions button {
            flex: 1 1 auto !important;
            min-height: 40px !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            font-size: 13px !important;
          }
        }
      `}</style>

      {/* Section Header */}
      <div
        className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3 pb-2 border-bottom"
      >
        <div>
          <div className="d-flex align-items-center gap-2">
            <h2
              className="h5 mb-0"
              style={{ color: "var(--color-text-main)", fontWeight: 700 }}
            >
              Actions Taken ({actions.length})
            </h2>
            <span
              className="badge px-2 py-1 rounded-pill"
              style={{
                backgroundColor: "var(--color-pale-green)",
                color: "var(--color-primary-green)",
                border: "1px solid var(--color-border)",
                fontSize: "11px",
                fontWeight: 600,
              }}
            >
              Permanent Record
            </span>
          </div>
          <p className="small text-muted mb-0 mt-1" style={{ fontSize: "13px" }}>
            Actions are a permanent record — add a new action for corrections.
          </p>
        </div>

        {isStaffOrAdmin && !isAdding && (
          <button
            type="button"
            className="zen-btn-primary d-inline-flex align-items-center gap-1"
            onClick={handleOpenAddForm}
            aria-label="Add Action"
            style={{ fontSize: "14px", padding: "6px 16px" }}
          >
            <span>+</span> Add Action
          </button>
        )}
      </div>

      {/* 409 Conflict Banner */}
      {conflictMessage && (
        <div
          role="alert"
          className="p-3 mb-3 rounded-2 d-flex justify-content-between align-items-center gap-2"
          style={{
            backgroundColor: "var(--color-warning-bg)",
            color: "var(--color-warning)",
            border: "1px solid #FCD34D",
            fontSize: "14px",
            fontWeight: 500,
          }}
        >
          <div className="d-flex align-items-center gap-2">
            <span>⚠️</span>
            <span>{conflictMessage}</span>
          </div>
          <button
            type="button"
            className="zen-btn-secondary"
            onClick={fetchActions}
            style={{ fontSize: "13px", padding: "4px 12px", whiteSpace: "nowrap" }}
          >
            Reload
          </button>
        </div>
      )}

      {/* General List Error */}
      {listError && (
        <div
          role="alert"
          className="p-3 mb-3 rounded-2"
          style={{
            backgroundColor: "var(--color-error-bg)",
            color: "var(--color-error)",
            border: "1px solid #FCA5A5",
            fontSize: "14px",
          }}
        >
          ⚠️ {listError}
        </div>
      )}

      {/* Inline Add Action Panel */}
      {isStaffOrAdmin && isAdding && (
        <div
          className="add-action-panel p-4 mb-4 rounded-3"
          style={{
            backgroundColor: "var(--color-surface)",
            border: "1.5px solid var(--color-primary-green)",
            boxShadow: "0 4px 12px rgba(0, 107, 60, 0.08)",
          }}
        >
          <div className="d-flex justify-content-between align-items-center mb-3 pb-2 border-bottom">
            <h3 className="h6 mb-0 fw-bold" style={{ color: "var(--color-primary-green)" }}>
              Record New Action Taken
            </h3>
            <span
              className="badge px-2 py-1 rounded-pill"
              style={{
                backgroundColor: "var(--color-pale-green)",
                color: "var(--color-secondary-green)",
                border: "1px solid var(--color-border)",
                fontSize: "11px",
                fontWeight: 600,
              }}
            >
              Draft
            </span>
          </div>

          {submitError && (
            <div
              role="alert"
              className="p-3 mb-3 rounded-2"
              style={{
                backgroundColor: "var(--color-error-bg)",
                color: "var(--color-error)",
                border: "1px solid #FCA5A5",
                fontSize: "13px",
              }}
            >
              ⚠️ {submitError}
            </div>
          )}

          <form onSubmit={handleSaveAction} noValidate>
            {/* Action Date and Performed By */}
            <div className="row g-3 mb-3">
              <div className="col-12 col-md-6">
                <label className="form-label small fw-semibold text-muted text-uppercase mb-1">
                  Action date/time
                </label>
                <div
                  className="zen-input d-flex align-items-center"
                  style={{
                    backgroundColor: "var(--color-field-readonly)",
                    color: "var(--color-text-muted)",
                    minHeight: "38px",
                  }}
                >
                  Set when saved
                </div>
              </div>
              <div className="col-12 col-md-6">
                <label className="form-label small fw-semibold text-muted text-uppercase mb-1">
                  Performed by
                </label>
                <div
                  className="zen-input d-flex align-items-center"
                  style={{
                    backgroundColor: "var(--color-field-readonly)",
                    color: "var(--color-text-main)",
                    fontWeight: 600,
                    minHeight: "38px",
                  }}
                >
                  {currentUser.name}
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="mb-3">
              <div className="d-flex justify-content-between align-items-center mb-1">
                <label htmlFor="action-description" className="form-label small fw-bold mb-0" style={{ color: "var(--color-text-main)" }}>
                  Description <span style={{ color: "var(--color-error)" }}>*</span>
                </label>
                <span className="small text-muted" style={{ fontSize: "12px" }}>{description.length} / 2000 chars</span>
              </div>
              <textarea
                id="action-description"
                ref={descRef}
                aria-label="Description *"
                className="zen-input"
                rows={3}
                maxLength={2000}
                placeholder="Describe the action taken (e.g. Inspected hardware, cleaned fan, replaced toner)..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                style={{
                  borderColor: formErrors.description ? "var(--color-error)" : "var(--color-border)",
                  fontSize: "14px",
                }}
              />
              {formErrors.description && (
                <div role="alert" className="text-danger small mt-1 fw-semibold" style={{ color: "var(--color-error)" }}>
                  ⚠️ {formErrors.description}
                </div>
              )}
            </div>

            {/* Result */}
            <div className="mb-3">
              <div className="d-flex justify-content-between align-items-center mb-1">
                <label htmlFor="action-result" className="form-label small fw-bold mb-0" style={{ color: "var(--color-text-main)" }}>
                  Result <span style={{ color: "var(--color-error)" }}>*</span>
                </label>
                <span className="small text-muted" style={{ fontSize: "12px" }}>{result.length} / 1000 chars</span>
              </div>
              <textarea
                id="action-result"
                ref={resultRef}
                aria-label="Result *"
                className="zen-input"
                rows={2}
                maxLength={1000}
                placeholder="Describe the outcome or finding..."
                value={result}
                onChange={(e) => setResult(e.target.value)}
                style={{
                  borderColor: formErrors.result ? "var(--color-error)" : "var(--color-border)",
                  fontSize: "14px",
                }}
              />
              {formErrors.result && (
                <div role="alert" className="text-danger small mt-1 fw-semibold" style={{ color: "var(--color-error)" }}>
                  ⚠️ {formErrors.result}
                </div>
              )}
            </div>

            {/* Follow-up Required Toggle */}
            <div
              className="mb-3 p-3 rounded-2"
              style={{
                backgroundColor: "var(--color-pale-green)",
                border: "1px solid var(--color-border)",
              }}
            >
              <label
                className="d-flex align-items-center gap-2 mb-0"
                style={{ cursor: "pointer", fontWeight: 600, color: "var(--color-text-main)" }}
              >
                <input
                  type="checkbox"
                  aria-label="Follow-up required?"
                  checked={followUpRequired}
                  onChange={(e) => setFollowUpRequired(e.target.checked)}
                  style={{ width: "18px", height: "18px", accentColor: "var(--color-primary-green)" }}
                />
                <span>Follow-up required?</span>
              </label>
              <div className="small text-muted mt-1" style={{ fontSize: "12px", paddingLeft: "26px" }}>
                Enable if this ticket requires subsequent work or part ordering.
              </div>

              {/* Follow-up Note */}
              {followUpRequired && (
                <div className="mt-3" style={{ paddingLeft: "26px" }}>
                  <div className="d-flex justify-content-between align-items-center mb-1">
                    <label htmlFor="action-followup-note" className="form-label small fw-bold mb-0" style={{ color: "var(--color-text-main)" }}>
                      Follow-up note <span style={{ color: "var(--color-error)" }}>*</span>
                    </label>
                    <span className="small text-muted" style={{ fontSize: "12px" }}>{followUpNote.length} / 1000 chars</span>
                  </div>
                  <textarea
                    id="action-followup-note"
                    ref={noteRef}
                    aria-label="Follow-up note *"
                    className="zen-input"
                    rows={2}
                    maxLength={1000}
                    placeholder="Provide specific follow-up instructions..."
                    value={followUpNote}
                    onChange={(e) => setFollowUpNote(e.target.value)}
                    style={{
                      borderColor: formErrors.followUpNote ? "var(--color-error)" : "var(--color-border)",
                      fontSize: "14px",
                    }}
                  />
                  {formErrors.followUpNote && (
                    <div role="alert" className="text-danger small mt-1 fw-semibold" style={{ color: "var(--color-error)" }}>
                      ⚠️ {formErrors.followUpNote}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Assignee & Status */}
            <div className="row g-3 mb-3">
              <div className="col-12 col-md-6">
                <label htmlFor="action-assignee" className="form-label small fw-semibold text-muted text-uppercase mb-1">
                  Assignee
                </label>
                <select
                  id="action-assignee"
                  aria-label="Assignee"
                  className="zen-select"
                  value={assignedToId}
                  onChange={(e) => setAssignedToId(e.target.value)}
                  style={{ minHeight: "38px" }}
                >
                  <option value="">Unassigned</option>
                  {staffUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name || u.email}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-12 col-md-6">
                <label className="form-label small fw-semibold text-muted text-uppercase mb-1">
                  Initial Status
                </label>
                <div className="pt-1">
                  <span
                    className="badge px-3 py-2 rounded-pill"
                    style={{
                      backgroundColor: "#E8F0FE",
                      color: "#1A73E8",
                      border: "1px solid #D2E3FC",
                      fontWeight: 600,
                      fontSize: "13px",
                      display: "inline-block",
                    }}
                  >
                    <span>📋 </span>
                    <span>Planned</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Attachment Notes / Assign File */}
            <div className="mb-4">
              <div className="d-flex justify-content-between align-items-center mb-1 flex-wrap gap-1">
                <label htmlFor="action-attachment-notes" className="form-label small fw-semibold text-muted text-uppercase mb-0">
                  Attachment notes
                </label>
                {ticketAttachments && ticketAttachments.length > 0 && (
                  <div className="d-flex align-items-center gap-1">
                    <span className="small text-muted" style={{ fontSize: "11px" }}>Assign file:</span>
                    <select
                      aria-label="Assign attached file"
                      className="form-select form-select-sm py-0 px-2"
                      style={{ fontSize: "11px", height: "24px", width: "auto" }}
                      onChange={(e) => {
                        if (e.target.value) {
                          setAttachmentNotes(e.target.value);
                        }
                      }}
                      defaultValue=""
                    >
                      <option value="" disabled>Select file...</option>
                      {ticketAttachments.map((f) => (
                        <option key={f.id} value={`Photo/file: ${f.originalFilename} in Attachments`}>
                          {f.originalFilename}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
              <input
                type="text"
                id="action-attachment-notes"
                aria-label="Attachment notes"
                className="zen-input"
                value={attachmentNotes}
                maxLength={500}
                onChange={(e) => setAttachmentNotes(e.target.value)}
                placeholder="e.g. photo of the old battery in Attachments"
                style={{ minHeight: "38px" }}
              />
              <span className="small text-muted d-block mt-1" style={{ fontSize: "12px" }}>
                Describe which file to look for (e.g. 'photo of the old battery in Attachments').
              </span>
            </div>

            {/* Form Action Buttons */}
            <div className="d-flex justify-content-end gap-2 pt-2 border-top">
              <button
                type="button"
                className="zen-btn-secondary"
                onClick={handleCloseAddForm}
                disabled={isSubmitting}
                style={{ fontSize: "14px", padding: "6px 18px" }}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="zen-btn-primary"
                disabled={isSubmitting}
                aria-label="Save Action"
                style={{ fontSize: "14px", padding: "6px 22px" }}
              >
                {isSubmitting ? "Saving..." : "Save Action"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Actions List State */}
      {isLoading ? (
        <div className="p-4 text-center text-muted" aria-busy="true">
          <div className="spinner-border spinner-border-sm me-2" role="status" style={{ color: "var(--color-primary-green)" }}></div>
          Loading actions taken...
        </div>
      ) : actions.length === 0 ? (
        <div
          className="p-4 text-center rounded-3"
          style={{
            backgroundColor: "var(--color-field-readonly)",
            border: "1px dashed var(--color-border)",
            color: "var(--color-text-muted)",
            fontSize: "14px",
          }}
        >
          No actions have been recorded for this ticket yet.
        </div>
      ) : (
        /* Unified Semantic Table with Desktop Internal Scrolling & Mobile Card Transformation */
        <div
          className="zen-card overflow-hidden actions-table-responsive"
          style={{
            backgroundColor: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            maxHeight: "480px",
            overflowY: "auto",
          }}
        >
          <div className="table-responsive">
            <table
              className="table table-hover align-middle mb-0 actions-table"
              style={{ borderCollapse: "collapse", fontSize: "13px" }}
            >
              <thead
                style={{
                  backgroundColor: "#F9FAF9",
                  borderBottom: "2px solid var(--color-border)",
                  position: "sticky",
                  top: 0,
                  zIndex: 1,
                }}
              >
                <tr>
                  <th scope="col" style={{ padding: "12px 16px", fontWeight: 600, color: "var(--color-text-main)", textAlign: "left", verticalAlign: "middle", minWidth: "140px" }}>Date/Time</th>
                  <th scope="col" style={{ padding: "12px 16px", fontWeight: 600, color: "var(--color-text-main)", textAlign: "left", verticalAlign: "middle", minWidth: "130px" }}>Performed by</th>
                  <th scope="col" style={{ padding: "12px 16px", fontWeight: 600, color: "var(--color-text-main)", textAlign: "left", verticalAlign: "middle", minWidth: "150px" }}>Assignee</th>
                  <th scope="col" style={{ padding: "12px 16px", fontWeight: 600, color: "var(--color-text-main)", textAlign: "left", verticalAlign: "middle", minWidth: "120px" }}>Status</th>
                  <th scope="col" style={{ padding: "12px 16px", fontWeight: 600, color: "var(--color-text-main)", textAlign: "left", verticalAlign: "middle", minWidth: "220px" }}>Description</th>
                  <th scope="col" style={{ padding: "12px 16px", fontWeight: 600, color: "var(--color-text-main)", textAlign: "left", verticalAlign: "middle", minWidth: "180px" }}>Result</th>
                  <th scope="col" style={{ padding: "12px 16px", fontWeight: 600, color: "var(--color-text-main)", textAlign: "left", verticalAlign: "middle", minWidth: "150px" }}>Follow-up</th>
                  <th scope="col" style={{ padding: "12px 16px", fontWeight: 600, color: "var(--color-text-main)", textAlign: "left", verticalAlign: "middle", minWidth: "160px" }}>Attachment Notes</th>
                  {isStaffOrAdmin && <th scope="col" style={{ padding: "12px 16px", fontWeight: 600, color: "var(--color-text-main)", textAlign: "right", verticalAlign: "middle", minWidth: "140px" }}>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {actions.map((action) => {
                  const performerName =
                    action.performedBy?.firstName && action.performedBy?.lastName
                      ? `${action.performedBy.firstName} ${action.performedBy.lastName}`
                      : (action.performedBy as any)?.name || action.performedBy?.username || `User #${action.performedById}`;

                  const assigneeName = action.assignee
                    ? action.assignee.name || `${action.assignee.firstName || ""} ${action.assignee.lastName || ""}`.trim()
                    : action.assignedTo
                    ? `${action.assignedTo.firstName || ""} ${action.assignedTo.lastName || ""}`.trim() || (action.assignedTo as any).name || action.assignedTo.username
                    : "—";

                  const isPlanned = action.status === "PLANNED";

                  return (
                    <tr key={action.id} style={{ borderBottom: "1px solid var(--color-border)" }}>
                      <td data-label="Date/Time" style={{ padding: "12px 16px", textAlign: "left", verticalAlign: "middle", color: "var(--color-text-muted)", whiteSpace: "nowrap" }}>
                        {formatDateTime(action.actionDateTime || action.actionDate || action.createdAt)}
                      </td>
                      <td data-label="Performed by" style={{ padding: "12px 16px", textAlign: "left", verticalAlign: "middle", fontWeight: 600, color: "var(--color-text-main)" }}>
                        {performerName}
                      </td>
                      <td data-label="Assignee" style={{ padding: "12px 16px", textAlign: "left", verticalAlign: "middle" }}>
                        {isStaffOrAdmin && isPlanned ? (
                          <select
                            aria-label={`Reassign action ${action.id}`}
                            className="zen-select"
                            value={action.assigneeId || action.assignedToId || ""}
                            onChange={(e) => handleReassign(action, e.target.value)}
                            style={{ fontSize: "12px", minHeight: "32px", padding: "4px 8px" }}
                          >
                            <option value="">Unassigned</option>
                            {staffUsers.map((u) => (
                              <option key={u.id} value={u.id}>
                                {u.name || u.email}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span style={{ color: "var(--color-text-muted)" }}>
                            {assigneeName !== "—" ? `👤 ${assigneeName}` : "—"}
                          </span>
                        )}
                      </td>
                      <td data-label="Status" style={{ padding: "12px 16px", textAlign: "left", verticalAlign: "middle" }}>
                        {getStatusBadge(action.status)}
                      </td>
                      <td data-label="Description" style={{ padding: "12px 16px", textAlign: "left", verticalAlign: "middle", whiteSpace: "pre-wrap", color: "var(--color-text-main)" }}>
                        {action.description}
                      </td>
                      <td data-label="Result" style={{ padding: "12px 16px", textAlign: "left", verticalAlign: "middle", whiteSpace: "pre-wrap", color: "var(--color-text-main)" }}>
                        {action.result}
                      </td>
                      <td data-label="Follow-up" style={{ padding: "12px 16px", textAlign: "left", verticalAlign: "middle" }}>
                        {action.followUpRequired ? (
                          <div>
                            <span
                              className="badge px-2 py-1 rounded-pill"
                              style={{
                                backgroundColor: "var(--color-warning-bg)",
                                color: "var(--color-warning)",
                                border: "1px solid #FCD34D",
                                fontSize: "11px",
                                fontWeight: 600,
                                display: "inline-block",
                              }}
                            >
                              Follow-up required
                            </span>
                            {action.followUpNote && (
                              <div className="small mt-1 text-muted" style={{ fontSize: "12px", fontStyle: "italic" }}>
                                {action.followUpNote}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>
                      <td data-label="Attachment Notes" style={{ padding: "12px 16px", textAlign: "left", verticalAlign: "middle", color: "var(--color-text-muted)" }}>
                        {action.attachmentNotes ? (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                            <span>📎</span>
                            <span>{action.attachmentNotes}</span>
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>

                      {isStaffOrAdmin && (
                        <td data-label="Actions" className="cell-actions" style={{ padding: "12px 16px", textAlign: "right", verticalAlign: "middle", whiteSpace: "nowrap" }}>
                          {isPlanned ? (
                            <div className="d-inline-flex gap-1 justify-content-end">
                              <button
                                type="button"
                                name="complete"
                                aria-label="Complete action"
                                className="zen-btn-primary"
                                onClick={() => handleStatusChange(action, "COMPLETED")}
                                style={{ fontSize: "12px", padding: "4px 10px", borderRadius: "6px" }}
                              >
                                Complete
                              </button>
                              <button
                                type="button"
                                name="cancel"
                                aria-label="Cancel action"
                                className="btn btn-outline-danger btn-sm"
                                onClick={() => handleStatusChange(action, "CANCELLED")}
                                style={{
                                  fontSize: "12px",
                                  padding: "4px 10px",
                                  borderRadius: "6px",
                                  fontWeight: 600,
                                }}
                              >
                                Cancel
                              </button>
                            </div>
                          ) : null}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
