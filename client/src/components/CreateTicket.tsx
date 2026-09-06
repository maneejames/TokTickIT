import React, { useState, useEffect, useRef } from "react";
import {
  Category,
  RelatedSystem,
  RequesterUser,
  Ticket,
  getCategories,
  getRelatedSystems,
  createTicket,
  uploadAttachment,
} from "../api.js";

interface CreateTicketProps {
  currentRequester: RequesterUser;
  onNavigateToMyTickets?: () => void;
  onNavigateToTicketDetail?: (ticketId: number) => void;
}

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".pdf"];
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export const CreateTicket: React.FC<CreateTicketProps> = ({
  currentRequester,
  onNavigateToMyTickets,
  onNavigateToTicketDetail,
}) => {
  // Reference data state
  const [categories, setCategories] = useState<Category[]>([]);
  const [relatedSystems, setRelatedSystems] = useState<RelatedSystem[]>([]);
  const [loadingRefData, setLoadingRefData] = useState<boolean>(true);
  const [refDataError, setRefDataError] = useState<string | null>(null);

  // Form field state
  const [categoryId, setCategoryId] = useState<string>("");
  const [relatedSystemId, setRelatedSystemId] = useState<string>("");
  const [requestedPriority, setRequestedPriority] = useState<"LOW" | "MEDIUM" | "HIGH">("MEDIUM");
  const [summary, setSummary] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [attachments, setAttachments] = useState<File[]>([]);

  // Validation & feedback state
  const [validationErrors, setValidationErrors] = useState<{ [key: string]: string }>({});
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);

  // Submission success result
  const [successResult, setSuccessResult] = useState<{
    ticket: Ticket;
    failedAttachmentsCount: number;
    totalAttachmentsCount: number;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadReferenceData = async () => {
    setLoadingRefData(true);
    setRefDataError(null);
    try {
      const [cats, systems] = await Promise.all([
        getCategories(),
        getRelatedSystems(),
      ]);
      setCategories(cats);
      setRelatedSystems(systems);
    } catch (err: unknown) {
      setRefDataError(err instanceof Error ? err.message : "Failed to load form reference data");
    } finally {
      setLoadingRefData(false);
    }
  };

  useEffect(() => {
    loadReferenceData();
  }, []);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleFilesSelected = (filesList: FileList | null) => {
    if (!filesList || filesList.length === 0) return;
    setAttachmentError(null);

    const newFiles = Array.from(filesList);

    for (const file of newFiles) {
      // 1. File size check (5 MB)
      if (file.size > MAX_FILE_SIZE_BYTES) {
        setAttachmentError("File exceeds 5 MB limit. Please select a smaller file.");
        return;
      }

      // 2. MIME type check
      const ext = "." + (file.name.split(".").pop()?.toLowerCase() || "");
      const hasValidExt = ALLOWED_EXTENSIONS.includes(ext);
      const hasValidMime = ALLOWED_MIME_TYPES.includes(file.type);

      if (!hasValidMime && !hasValidExt) {
        setAttachmentError("Unsupported file type. Only JPG, PNG, WEBP, and PDF are allowed.");
        return;
      }
    }

    // 3. Max active attachments check (max 5)
    if (attachments.length + newFiles.length > 5) {
      setAttachmentError("Maximum of 5 attachments allowed.");
      return;
    }

    setAttachments((prev) => [...prev, ...newFiles]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleRemoveAttachment = (indexToRemove: number) => {
    setAttachments((prev) => prev.filter((_, idx) => idx !== indexToRemove));
    setAttachmentError(null);
  };

  const validateForm = (): boolean => {
    const errors: { [key: string]: string } = {};

    if (!categoryId) {
      errors.categoryId = "Category is required";
    }

    if (!relatedSystemId) {
      errors.relatedSystemId = "Related System is required";
    }

    const trimmedSummary = summary.trim();
    if (!trimmedSummary || trimmedSummary.length < 5 || trimmedSummary.length > 100) {
      errors.summary = "Summary must be between 5 and 100 characters";
    }

    const trimmedDesc = description.trim();
    if (!trimmedDesc || trimmedDesc.length < 10 || trimmedDesc.length > 2000) {
      errors.description = "Description must be between 10 and 2000 characters";
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError(null);

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Step 1: Create Ticket via JSON payload
      const createdTicket = await createTicket(
        {
          categoryId: Number(categoryId),
          relatedSystemId: Number(relatedSystemId),
          summary: summary.trim(),
          description: description.trim(),
          requestedPriority,
        },
        currentRequester.id
      );

      // Step 2: Upload staged attachments sequentially
      let failedCount = 0;
      if (attachments.length > 0) {
        for (const file of attachments) {
          try {
            await uploadAttachment(createdTicket.id, file, currentRequester.id);
          } catch {
            failedCount++;
          }
        }
      }

      setSuccessResult({
        ticket: createdTicket,
        failedAttachmentsCount: failedCount,
        totalAttachmentsCount: attachments.length,
      });
    } catch (err: unknown) {
      // Preserve form values upon failure!
      setApiError(err instanceof Error ? err.message : "Failed to create ticket");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateAnother = () => {
    setCategoryId("");
    setRelatedSystemId("");
    setRequestedPriority("MEDIUM");
    setSummary("");
    setDescription("");
    setAttachments([]);
    setValidationErrors({});
    setAttachmentError(null);
    setApiError(null);
    setSuccessResult(null);
  };

  // Loading reference data state
  if (loadingRefData) {
    return (
      <div className="container py-5 text-center">
        <div className="spinner-border" style={{ color: "var(--color-primary-green)" }} role="status">
          <span className="visually-hidden">Loading form...</span>
        </div>
        <p className="mt-3 text-muted">Loading categories and systems...</p>
      </div>
    );
  }

  // Error loading reference data state
  if (refDataError) {
    return (
      <div className="container py-5">
        <div className="zen-card p-4 mx-auto text-center" style={{ maxWidth: "600px" }}>
          <div className="alert alert-danger" role="alert">
            {refDataError}
          </div>
          <button type="button" className="zen-btn-primary mt-3" onClick={loadReferenceData}>
            Retry Loading
          </button>
        </div>
      </div>
    );
  }

  // Success state view
  if (successResult) {
    const { ticket, failedAttachmentsCount, totalAttachmentsCount } = successResult;
    return (
      <div className="container py-5">
        <div className="zen-card p-4 p-md-5 mx-auto" style={{ maxWidth: "760px" }}>
          <div
            className="p-4 rounded-3 text-center mb-4"
            style={{
              backgroundColor: "var(--color-pale-green)",
              border: "1px solid #B8E2CB",
            }}
          >
            <div style={{ fontSize: "40px", color: "var(--color-primary-green)", lineHeight: 1 }}>
              ✓
            </div>
            <h2 className="h4 mt-3 mb-2" style={{ color: "var(--color-primary-green)", fontWeight: 700 }}>
              Ticket Created Successfully
            </h2>
            <p className="text-muted mb-3">
              Your ticket has been officially registered in the TokTickIT system.
            </p>
            <div
              className="d-inline-block px-4 py-2 rounded-3 bg-white"
              style={{
                border: "2px dashed var(--color-secondary-green)",
                color: "var(--color-primary-green)",
                fontSize: "20px",
                fontWeight: 700,
                letterSpacing: "0.5px",
              }}
            >
              {ticket.ticketNumber}
            </div>
          </div>

          {/* Partial-Success Handling Alert */}
          {failedAttachmentsCount > 0 && (
            <div
              className="alert mb-4"
              style={{
                backgroundColor: "var(--color-warning-bg)",
                border: "1px solid #E5CE85",
                color: "#6C4E00",
              }}
              role="alert"
            >
              <strong>Attachment Upload Notice:</strong> Ticket {ticket.ticketNumber} created.{" "}
              {failedAttachmentsCount} of {totalAttachmentsCount} attachments failed to upload — you
              can retry from Ticket Detail.
            </div>
          )}

          <div className="d-flex flex-column flex-sm-row justify-content-center gap-3 mt-4">
            <a
              href={`/tickets/${ticket.id}`}
              className="zen-btn-primary text-center text-decoration-none"
              style={{ padding: "10px 20px" }}
              onClick={(e) => {
                if (onNavigateToTicketDetail) {
                  e.preventDefault();
                  onNavigateToTicketDetail(ticket.id);
                }
              }}
            >
              View Ticket Details
            </a>
            <button
              type="button"
              className="zen-btn-secondary"
              onClick={handleCreateAnother}
              style={{ padding: "10px 20px" }}
            >
              Create Another Ticket
            </button>
          </div>
        </div>
      </div>
    );
  }

  const currentDateFormatted = new Date().toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  return (
    <div className="container py-4 py-md-5">
      <div className="zen-card p-4 p-md-5 mx-auto" style={{ maxWidth: "760px" }}>
        {/* Header */}
        <div className="mb-4">
          <h1
            style={{
              fontSize: "22px",
              fontWeight: 700,
              color: "var(--color-primary-green)",
              margin: 0,
            }}
          >
            Create IT Support Ticket
          </h1>
          <p className="text-muted small mt-1 mb-0">
            Fill out the details below to submit a technical assistance request to the TokTickIT team.
          </p>
        </div>

        {/* Top-level API Error Alert (Inputs preserved) */}
        {apiError && (
          <div
            className="alert mb-4"
            style={{
              backgroundColor: "var(--color-error-bg)",
              border: "1px solid var(--color-error)",
              color: "var(--color-error)",
            }}
            role="alert"
          >
            <strong>Submission Error:</strong> {apiError}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          {/* System & Requester Context Row (Read-only) */}
          <div className="row g-3 mb-3">
            <div className="col-12 col-md-6">
              <label
                htmlFor="ticketNumberDisplay"
                className="form-label mb-1"
                style={{ fontWeight: 600, fontSize: "14px", color: "var(--color-text-main)" }}
              >
                Ticket Number
              </label>
              <input
                id="ticketNumberDisplay"
                type="text"
                readOnly
                disabled
                value="Generated upon submission"
                className="form-control"
                style={{
                  backgroundColor: "var(--color-field-readonly)",
                  borderColor: "var(--color-border)",
                  color: "var(--color-text-muted)",
                  fontStyle: "italic",
                  minHeight: "40px",
                }}
              />
            </div>

            <div className="col-12 col-md-6">
              <label
                htmlFor="requesterDisplay"
                className="form-label mb-1"
                style={{ fontWeight: 600, fontSize: "14px", color: "var(--color-text-main)" }}
              >
                Requester
              </label>
              <input
                id="requesterDisplay"
                type="text"
                readOnly
                disabled
                value={`${currentRequester.name} (${currentRequester.department})`}
                className="form-control"
                style={{
                  backgroundColor: "var(--color-field-readonly)",
                  borderColor: "var(--color-border)",
                  color: "var(--color-text-main)",
                  minHeight: "40px",
                  fontWeight: 500,
                }}
              />
            </div>
          </div>

          {/* Classification Row */}
          <div className="row g-3 mb-3">
            <div className="col-12 col-md-6">
              <label
                htmlFor="category"
                className="form-label mb-1"
                style={{ fontWeight: 600, fontSize: "14px", color: "var(--color-text-main)" }}
              >
                Category <span style={{ color: "var(--color-error)" }}>*</span>
              </label>
              <select
                id="category"
                className="zen-select"
                value={categoryId}
                onChange={(e) => {
                  setCategoryId(e.target.value);
                  if (validationErrors.categoryId) {
                    setValidationErrors((prev) => ({ ...prev, categoryId: "" }));
                  }
                }}
                style={{
                  borderColor: validationErrors.categoryId ? "var(--color-error)" : undefined,
                }}
                aria-required="true"
                aria-invalid={!!validationErrors.categoryId}
                aria-describedby={validationErrors.categoryId ? "category-error" : undefined}
              >
                <option value="">Select Category</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
              {validationErrors.categoryId && (
                <div
                  id="category-error"
                  role="alert"
                  style={{ color: "var(--color-error)", fontSize: "12px", marginTop: "4px" }}
                >
                  {validationErrors.categoryId}
                </div>
              )}
            </div>

            <div className="col-12 col-md-6">
              <label
                htmlFor="relatedSystem"
                className="form-label mb-1"
                style={{ fontWeight: 600, fontSize: "14px", color: "var(--color-text-main)" }}
              >
                Related System <span style={{ color: "var(--color-error)" }}>*</span>
              </label>
              <select
                id="relatedSystem"
                className="zen-select"
                value={relatedSystemId}
                onChange={(e) => {
                  setRelatedSystemId(e.target.value);
                  if (validationErrors.relatedSystemId) {
                    setValidationErrors((prev) => ({ ...prev, relatedSystemId: "" }));
                  }
                }}
                style={{
                  borderColor: validationErrors.relatedSystemId ? "var(--color-error)" : undefined,
                }}
                aria-required="true"
                aria-invalid={!!validationErrors.relatedSystemId}
                aria-describedby={validationErrors.relatedSystemId ? "relatedSystem-error" : undefined}
              >
                <option value="">Select Related System</option>
                {relatedSystems.map((sys) => (
                  <option key={sys.id} value={sys.id}>
                    {sys.name}
                  </option>
                ))}
              </select>
              {validationErrors.relatedSystemId && (
                <div
                  id="relatedSystem-error"
                  role="alert"
                  style={{ color: "var(--color-error)", fontSize: "12px", marginTop: "4px" }}
                >
                  {validationErrors.relatedSystemId}
                </div>
              )}
            </div>
          </div>

          {/* Priority Row */}
          <div className="row g-3 mb-3">
            <div className="col-12 col-md-6">
              <label
                htmlFor="requestedPriority"
                className="form-label mb-1"
                style={{ fontWeight: 600, fontSize: "14px", color: "var(--color-text-main)" }}
              >
                Requested Priority <span style={{ color: "var(--color-error)" }}>*</span>
              </label>
              <select
                id="requestedPriority"
                className="zen-select"
                value={requestedPriority}
                onChange={(e) => setRequestedPriority(e.target.value as "LOW" | "MEDIUM" | "HIGH")}
                aria-required="true"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium (Default)</option>
                <option value="HIGH">High</option>
              </select>
            </div>

            <div className="col-12 col-md-6">
              <label
                htmlFor="ticketDateDisplay"
                className="form-label mb-1"
                style={{ fontWeight: 600, fontSize: "14px", color: "var(--color-text-main)" }}
              >
                Ticket Date
              </label>
              <input
                id="ticketDateDisplay"
                type="text"
                readOnly
                disabled
                value={currentDateFormatted}
                className="form-control"
                style={{
                  backgroundColor: "var(--color-field-readonly)",
                  borderColor: "var(--color-border)",
                  color: "var(--color-text-main)",
                  minHeight: "40px",
                }}
              />
            </div>
          </div>

          {/* Problem Details: Ticket Summary */}
          <div className="mb-3">
            <div className="d-flex justify-content-between align-items-center mb-1">
              <label
                htmlFor="summary"
                className="form-label mb-0"
                style={{ fontWeight: 600, fontSize: "14px", color: "var(--color-text-main)" }}
              >
                Ticket Summary <span style={{ color: "var(--color-error)" }}>*</span>
              </label>
              <span
                style={{
                  fontSize: "12px",
                  color: summary.trim().length > 100 ? "var(--color-error)" : "var(--color-text-muted)",
                }}
              >
                {summary.trim().length}/100
              </span>
            </div>
            <input
              id="summary"
              type="text"
              className="zen-input"
              placeholder="Brief description of the problem (5–100 characters)"
              value={summary}
              maxLength={100}
              onChange={(e) => {
                setSummary(e.target.value);
                if (validationErrors.summary) {
                  setValidationErrors((prev) => ({ ...prev, summary: "" }));
                }
              }}
              style={{
                borderColor: validationErrors.summary ? "var(--color-error)" : undefined,
              }}
              aria-required="true"
              aria-invalid={!!validationErrors.summary}
              aria-describedby={validationErrors.summary ? "summary-error" : undefined}
            />
            {validationErrors.summary && (
              <div
                id="summary-error"
                role="alert"
                style={{ color: "var(--color-error)", fontSize: "12px", marginTop: "4px" }}
              >
                {validationErrors.summary}
              </div>
            )}
          </div>

          {/* Problem Details: Problem Description */}
          <div className="mb-4">
            <div className="d-flex justify-content-between align-items-center mb-1">
              <label
                htmlFor="description"
                className="form-label mb-0"
                style={{ fontWeight: 600, fontSize: "14px", color: "var(--color-text-main)" }}
              >
                Problem Description <span style={{ color: "var(--color-error)" }}>*</span>
              </label>
              <span
                style={{
                  fontSize: "12px",
                  color: description.trim().length > 2000 ? "var(--color-error)" : "var(--color-text-muted)",
                }}
              >
                {description.trim().length}/2000
              </span>
            </div>
            <textarea
              id="description"
              className="zen-input"
              rows={5}
              placeholder="Detailed explanation of steps to reproduce, affected hardware, software versions, or context..."
              value={description}
              maxLength={2000}
              onChange={(e) => {
                setDescription(e.target.value);
                if (validationErrors.description) {
                  setValidationErrors((prev) => ({ ...prev, description: "" }));
                }
              }}
              style={{
                borderColor: validationErrors.description ? "var(--color-error)" : undefined,
                minHeight: "120px",
                resize: "vertical",
              }}
              aria-required="true"
              aria-invalid={!!validationErrors.description}
              aria-describedby={validationErrors.description ? "description-error" : undefined}
            />
            {validationErrors.description && (
              <div
                id="description-error"
                role="alert"
                style={{ color: "var(--color-error)", fontSize: "12px", marginTop: "4px" }}
              >
                {validationErrors.description}
              </div>
            )}
          </div>

          {/* Attachments Section */}
          <div className="mb-4">
            <div className="d-flex justify-content-between align-items-center mb-1">
              <label
                htmlFor="attachments"
                className="form-label mb-0"
                style={{ fontWeight: 600, fontSize: "14px", color: "var(--color-text-main)" }}
              >
                Attachments
              </label>
              <span className="text-muted small">
                {attachments.length} of 5 files selected
              </span>
            </div>
            <p className="text-muted small mb-2">
              Allowed formats: JPG, PNG, WEBP, PDF. Max 5 MB per file. Up to 5 attachments total.
            </p>

            {/* Dropzone container */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragOver(false);
                handleFilesSelected(e.dataTransfer.files);
              }}
              onClick={() => {
                if (attachments.length < 5 && fileInputRef.current) {
                  fileInputRef.current.click();
                }
              }}
              style={{
                border: "2px dashed",
                borderColor: isDragOver ? "var(--color-secondary-green)" : "var(--color-border)",
                backgroundColor: isDragOver ? "var(--color-pale-green)" : "#FAFCFA",
                borderRadius: "8px",
                padding: "24px 16px",
                textAlign: "center",
                cursor: attachments.length >= 5 ? "not-allowed" : "pointer",
                transition: "all 0.2s",
              }}
            >
              <input
                ref={fileInputRef}
                id="attachments"
                type="file"
                multiple
                className="d-none"
                disabled={attachments.length >= 5}
                onChange={(e) => handleFilesSelected(e.target.files)}
              />
              <div style={{ fontSize: "24px", marginBottom: "8px" }} aria-hidden="true">
                📎
              </div>
              <div style={{ fontSize: "14px", fontWeight: 600, color: "var(--color-text-main)" }}>
                {attachments.length >= 5 ? (
                  "Maximum 5 active attachments reached"
                ) : (
                  <>
                    <span style={{ color: "var(--color-secondary-green)", textDecoration: "underline" }}>
                      Click to browse
                    </span>{" "}
                    or drag files here
                  </>
                )}
              </div>
            </div>

            {/* Inline Attachment Validation Error */}
            {attachmentError && (
              <div
                role="alert"
                style={{
                  color: "var(--color-error)",
                  fontSize: "12px",
                  marginTop: "6px",
                  fontWeight: 500,
                }}
              >
                {attachmentError}
              </div>
            )}

            {/* Staged files list */}
            {attachments.length > 0 && (
              <ul className="list-group mt-3">
                {attachments.map((file, idx) => (
                  <li
                    key={`${file.name}-${idx}`}
                    className="list-group-item d-flex justify-content-between align-items-center py-2 px-3"
                    style={{
                      borderColor: "var(--color-border)",
                      fontSize: "13px",
                      backgroundColor: "#FFFFFF",
                    }}
                  >
                    <div className="d-flex align-items-center gap-2 text-truncate">
                      <span aria-hidden="true">📄</span>
                      <span className="fw-semibold text-truncate">{file.name}</span>
                      <span className="text-muted">({formatFileSize(file.size)})</span>
                    </div>
                    <button
                      type="button"
                      className="btn btn-sm btn-link text-danger p-0 ms-2 text-decoration-none"
                      style={{ fontSize: "12px", fontWeight: 600 }}
                      onClick={() => handleRemoveAttachment(idx)}
                      aria-label={`Remove ${file.name}`}
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Form Actions Footer */}
          <div className="d-flex flex-column flex-sm-row justify-content-end gap-3 pt-3 border-top">
            {onNavigateToMyTickets && (
              <button
                type="button"
                className="zen-btn-secondary"
                disabled={isSubmitting}
                onClick={onNavigateToMyTickets}
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              className="zen-btn-primary d-flex align-items-center justify-content-center gap-2"
              disabled={isSubmitting}
              style={{ minWidth: "140px" }}
            >
              {isSubmitting ? (
                <>
                  <span
                    className="spinner-border spinner-border-sm"
                    role="status"
                    aria-hidden="true"
                  ></span>
                  <span>Submitting...</span>
                </>
              ) : (
                "Submit Ticket"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
