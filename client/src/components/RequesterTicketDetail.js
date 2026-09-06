import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect, useRef } from "react";
import { getTicketDetail, uploadAttachment, removeAttachment, getAttachmentDownloadUrl, } from "../api.js";
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".pdf"];
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
export const RequesterTicketDetail = ({ ticketId, currentRequester, onNavigateToMyTickets, }) => {
    const [ticket, setTicket] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [errorStatus, setErrorStatus] = useState(null);
    const [errorMessage, setErrorMessage] = useState(null);
    // Uploading state
    const [isUploading, setIsUploading] = useState(false);
    const [uploadError, setUploadError] = useState(null);
    const [isDragOver, setIsDragOver] = useState(false);
    const fileInputRef = useRef(null);
    // Removal modal state
    const [removingAttachment, setRemovingAttachment] = useState(null);
    const [removalReason, setRemovalReason] = useState("");
    const [removalError, setRemovalError] = useState(null);
    const [isRemoving, setIsRemoving] = useState(false);
    const fetchDetail = async () => {
        setIsLoading(true);
        setErrorStatus(null);
        setErrorMessage(null);
        try {
            const data = await getTicketDetail(ticketId, currentRequester.id);
            setTicket(data);
        }
        catch (err) {
            const e = err;
            setErrorStatus(e.status ?? 500);
            setErrorMessage(e.message || "Failed to load ticket details");
        }
        finally {
            setIsLoading(false);
        }
    };
    useEffect(() => {
        fetchDetail();
    }, [ticketId, currentRequester.id]);
    const activeAttachments = ticket?.attachments?.filter((a) => !a.isRemoved) ?? [];
    const removedAttachments = ticket?.attachments?.filter((a) => a.isRemoved) ?? [];
    const canAddAttachment = activeAttachments.length < 5;
    const validateFile = (file) => {
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
    const handleFileUpload = async (file) => {
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
        }
        catch (err) {
            setUploadError(err instanceof Error ? err.message : "Failed to upload attachment");
        }
        finally {
            setIsUploading(false);
        }
    };
    const handleFileInputChange = (e) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            handleFileUpload(files[0]);
        }
    };
    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragOver(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleFileUpload(e.dataTransfer.files[0]);
        }
    };
    const openRemovalModal = (att) => {
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
        if (!removingAttachment)
            return;
        if (removalReason.length > 200) {
            setRemovalError("Removal reason must not exceed 200 characters.");
            return;
        }
        setIsRemoving(true);
        setRemovalError(null);
        try {
            const res = await removeAttachment(ticketId, removingAttachment.id, currentRequester.id, removalReason);
            if (ticket) {
                setTicket({
                    ...ticket,
                    attachments: ticket.attachments.map((a) => a.id === removingAttachment.id
                        ? {
                            ...a,
                            isRemoved: true,
                            removedAt: res.removedAt,
                            removedReason: res.removedReason ?? (removalReason.trim() || null),
                        }
                        : a),
                });
            }
            closeRemovalModal();
        }
        catch (err) {
            setRemovalError(err instanceof Error ? err.message : "Failed to remove attachment");
        }
        finally {
            setIsRemoving(false);
        }
    };
    const formatFileSize = (bytes) => {
        if (bytes < 1024)
            return `${bytes} B`;
        if (bytes < 1024 * 1024)
            return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };
    const formatDate = (isoString) => {
        if (!isoString)
            return "—";
        try {
            const d = new Date(isoString);
            return (d.toLocaleDateString("en-GB", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
            }) +
                " " +
                d.toLocaleTimeString("en-GB", {
                    hour: "2-digit",
                    minute: "2-digit",
                }));
        }
        catch {
            return isoString;
        }
    };
    const renderPriorityBadge = (priority) => {
        const p = priority?.toUpperCase();
        if (p === "HIGH") {
            return (_jsx("span", { className: "badge", style: {
                    backgroundColor: "var(--color-error-bg)",
                    color: "var(--color-error)",
                    border: "1px solid #F8B4B4",
                    padding: "4px 10px",
                    fontSize: "12px",
                    fontWeight: 600,
                    borderRadius: "12px",
                }, children: "HIGH" }));
        }
        if (p === "LOW") {
            return (_jsx("span", { className: "badge", style: {
                    backgroundColor: "#F0F4F2",
                    color: "#375043",
                    border: "1px solid #D1DDD5",
                    padding: "4px 10px",
                    fontSize: "12px",
                    fontWeight: 600,
                    borderRadius: "12px",
                }, children: "LOW" }));
        }
        return (_jsx("span", { className: "badge", style: {
                backgroundColor: "var(--color-warning-bg)",
                color: "#8F6500",
                border: "1px solid #F5DE9C",
                padding: "4px 10px",
                fontSize: "12px",
                fontWeight: 600,
                borderRadius: "12px",
            }, children: "MEDIUM" }));
    };
    const renderStatusBadge = (_status) => {
        return (_jsx("span", { className: "badge", style: {
                backgroundColor: "var(--color-pale-green)",
                color: "var(--color-primary-green)",
                border: "1px solid #B8E2CB",
                padding: "4px 10px",
                fontSize: "12px",
                fontWeight: 600,
                borderRadius: "12px",
            }, children: "New" }));
    };
    // ── Loading state ────────────────────────────────────────────────────────
    if (isLoading) {
        return (_jsxs("div", { className: "container py-5 text-center", "data-testid": "ticket-detail-loading", children: [_jsx("div", { className: "spinner-border text-success", role: "status", style: { color: "var(--color-primary-green)" }, children: _jsx("span", { className: "visually-hidden", children: "Loading ticket details..." }) }), _jsx("p", { className: "mt-3 text-muted", children: "Loading ticket details..." })] }));
    }
    // ── Error / Not Found state (safe rejection) ─────────────────────────────
    if (errorStatus === 404 || !ticket) {
        return (_jsx("div", { className: "container py-5", "data-testid": "ticket-not-found", children: _jsxs("div", { className: "zen-card p-5 text-center mx-auto", style: { maxWidth: "600px" }, children: [_jsx("div", { style: { fontSize: "48px", color: "var(--color-text-muted)" }, children: "\uD83D\uDD0D" }), _jsx("h2", { className: "h4 mt-3", style: { color: "var(--color-text-main)", fontWeight: 700 }, children: "Ticket Not Found" }), _jsx("p", { className: "text-muted mt-2 mb-4", children: "The requested ticket does not exist or you do not have permission to view it." }), _jsx("button", { type: "button", className: "zen-btn-primary", onClick: onNavigateToMyTickets, children: "Back to My Tickets" })] }) }));
    }
    return (_jsxs("div", { className: "container py-4", style: { maxWidth: "860px" }, children: [_jsx("div", { className: "mb-3 d-flex justify-content-between align-items-center", children: _jsx("button", { type: "button", className: "btn btn-link p-0 text-decoration-none", onClick: onNavigateToMyTickets, style: { color: "var(--color-secondary-green)", fontWeight: 600 }, children: "\u2190 Back to My Tickets" }) }), _jsxs("div", { className: "zen-card p-4 p-md-5 mb-4", "data-testid": "ticket-header-card", children: [_jsxs("div", { className: "d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center gap-2 mb-4 pb-3 border-bottom", children: [_jsxs("div", { children: [_jsx("h1", { className: "h3 mb-1", style: { color: "var(--color-primary-green)", fontWeight: 700 }, children: ticket.ticketNumber }), _jsxs("span", { className: "text-muted small", children: ["Submitted on ", formatDate(ticket.createdAt)] })] }), _jsxs("div", { className: "d-flex gap-2 align-items-center", children: [renderStatusBadge(ticket.currentStatus), renderPriorityBadge(ticket.requestedPriority)] })] }), _jsxs("div", { className: "row g-3 mb-4", children: [_jsxs("div", { className: "col-12 col-md-6", children: [_jsx("label", { className: "text-muted small fw-bold text-uppercase d-block mb-1", children: "Requester" }), _jsxs("div", { className: "p-2 rounded-2", style: {
                                            backgroundColor: "var(--color-field-readonly)",
                                            border: "1px solid var(--color-border)",
                                            color: "var(--color-text-main)",
                                            fontSize: "14px",
                                        }, children: ["\uD83D\uDC64 ", ticket.requester.name, " (", ticket.requester.department, ")"] })] }), _jsxs("div", { className: "col-12 col-md-6", children: [_jsx("label", { className: "text-muted small fw-bold text-uppercase d-block mb-1", children: "Category & Related System" }), _jsxs("div", { className: "p-2 rounded-2", style: {
                                            backgroundColor: "var(--color-field-readonly)",
                                            border: "1px solid var(--color-border)",
                                            color: "var(--color-text-main)",
                                            fontSize: "14px",
                                        }, children: [ticket.category.name, " \u2014 ", ticket.relatedSystem.name] })] })] }), _jsxs("div", { className: "mb-4", children: [_jsx("label", { className: "text-muted small fw-bold text-uppercase d-block mb-1", children: "Summary" }), _jsx("div", { className: "p-3 rounded-2 fw-semibold", style: {
                                    backgroundColor: "var(--color-field-readonly)",
                                    border: "1px solid var(--color-border)",
                                    color: "var(--color-text-main)",
                                    fontSize: "16px",
                                }, children: ticket.summary })] }), _jsxs("div", { className: "mb-2", children: [_jsx("label", { className: "text-muted small fw-bold text-uppercase d-block mb-1", children: "Description" }), _jsx("div", { className: "p-3 rounded-2", style: {
                                    backgroundColor: "var(--color-field-readonly)",
                                    border: "1px solid var(--color-border)",
                                    color: "var(--color-text-main)",
                                    fontSize: "14px",
                                    whiteSpace: "pre-wrap",
                                    minHeight: "120px",
                                    lineHeight: 1.6,
                                }, children: ticket.description })] })] }), _jsxs("div", { className: "zen-card p-4 p-md-5 mb-4", "data-testid": "attachments-section", children: [_jsx("div", { className: "d-flex justify-content-between align-items-center mb-3", children: _jsxs("h2", { className: "h5 mb-0", style: { color: "var(--color-text-main)", fontWeight: 700 }, children: ["Attachments (", activeAttachments.length, "/5 active)"] }) }), activeAttachments.length > 0 ? (_jsx("div", { className: "list-group mb-4", "data-testid": "active-attachments-list", children: activeAttachments.map((att) => (_jsxs("div", { className: "list-group-item d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center gap-2 p-3", style: { borderColor: "var(--color-border)" }, children: [_jsxs("div", { className: "d-flex align-items-center gap-3", children: [_jsx("div", { style: { fontSize: "24px" }, children: "\uD83D\uDCCE" }), _jsxs("div", { children: [_jsx("div", { className: "fw-semibold text-truncate", style: { maxWidth: "320px", color: "var(--color-text-main)" }, children: att.originalFilename }), _jsxs("div", { className: "small text-muted", children: [formatFileSize(att.sizeBytes), " \u2022 Uploaded ", formatDate(att.uploadedAt)] })] })] }), _jsxs("div", { className: "d-flex gap-2 align-self-end align-self-sm-center", children: [_jsx("a", { href: getAttachmentDownloadUrl(ticketId, att.id, currentRequester.id), download: true, className: "zen-btn-secondary text-decoration-none d-inline-flex align-items-center gap-1", style: { fontSize: "13px", padding: "4px 10px" }, "aria-label": `Download ${att.originalFilename}`, children: "\u2B07 Download" }), _jsx("button", { type: "button", className: "btn btn-outline-danger", style: { fontSize: "13px", padding: "4px 10px", borderRadius: "8px" }, onClick: () => openRemovalModal(att), "aria-label": `Remove ${att.originalFilename}`, children: "\uD83D\uDDD1 Remove" })] })] }, att.id))) })) : (_jsx("p", { className: "text-muted small mb-4", children: "No active attachments on this ticket." })), _jsxs("div", { className: "mb-4", children: [_jsx("label", { className: "text-muted small fw-bold text-uppercase d-block mb-2", children: "Add Attachment" }), canAddAttachment ? (_jsxs("div", { children: [_jsxs("div", { className: `p-4 text-center rounded-3 ${isDragOver ? "bg-light" : ""}`, style: {
                                            border: isDragOver
                                                ? "2px dashed var(--color-primary-green)"
                                                : "2px dashed var(--color-border)",
                                            backgroundColor: isDragOver ? "var(--color-pale-green)" : "#FAFCFA",
                                            cursor: "pointer",
                                            transition: "all 0.2s",
                                        }, onDragOver: (e) => {
                                            e.preventDefault();
                                            setIsDragOver(true);
                                        }, onDragLeave: () => setIsDragOver(false), onDrop: handleDrop, onClick: () => fileInputRef.current?.click(), children: [_jsx("div", { style: { fontSize: "28px", color: "var(--color-secondary-green)" }, children: "\uD83D\uDCC1" }), _jsx("div", { className: "mt-2 fw-semibold", style: { color: "var(--color-text-main)", fontSize: "14px" }, children: "Click or drag file here to attach" }), _jsx("div", { className: "text-muted small mt-1", children: "Allowed formats: JPG, PNG, WEBP, PDF. Max 5 MB." }), _jsx("input", { ref: fileInputRef, type: "file", className: "d-none", accept: ".jpg,.jpeg,.png,.webp,.pdf", onChange: handleFileInputChange, disabled: isUploading })] }), isUploading && (_jsxs("div", { className: "mt-2 text-center text-muted small", children: [_jsx("div", { className: "spinner-border spinner-border-sm text-success me-2", role: "status" }), "Uploading attachment..."] })), uploadError && (_jsxs("div", { className: "mt-2 text-danger small fw-semibold", role: "alert", children: ["\u26A0\uFE0F ", uploadError] }))] })) : (_jsxs("div", { className: "alert mb-0", style: {
                                    backgroundColor: "var(--color-warning-bg)",
                                    border: "1px solid #E5CE85",
                                    color: "#6C4E00",
                                    fontSize: "14px",
                                }, role: "status", children: [_jsx("strong", { children: "Maximum attachments reached:" }), " This ticket already has 5 active attachments. Remove an existing attachment to add a new one."] }))] }), removedAttachments.length > 0 && (_jsxs("div", { className: "mt-4 pt-3 border-top", "data-testid": "removed-attachments-section", children: [_jsxs("h3", { className: "h6 text-muted text-uppercase fw-bold mb-3", children: ["Removed Attachments (", removedAttachments.length, ")"] }), _jsx("div", { className: "list-group", "data-testid": "removed-attachments-list", children: removedAttachments.map((att) => (_jsx("div", { className: "list-group-item p-3 bg-light", style: { borderColor: "var(--color-border)" }, children: _jsxs("div", { className: "d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center gap-2", children: [_jsxs("div", { children: [_jsx("div", { className: "fw-semibold text-muted text-decoration-line-through text-truncate", style: { maxWidth: "340px" }, children: att.originalFilename }), _jsxs("div", { className: "small text-muted", children: ["Removed on ", formatDate(att.removedAt), att.removedReason && (_jsxs("span", { className: "ms-2 fst-italic", children: ["\u2014 Reason: \"", att.removedReason, "\""] }))] })] }), _jsx("span", { className: "badge bg-secondary text-white", style: { fontSize: "11px", padding: "4px 8px" }, children: "Download Disabled" })] }) }, att.id))) })] }))] }), removingAttachment && (_jsx("div", { className: "modal d-block", tabIndex: -1, style: { backgroundColor: "rgba(0, 0, 0, 0.5)" }, role: "dialog", "aria-modal": "true", children: _jsx("div", { className: "modal-dialog modal-dialog-centered", children: _jsxs("div", { className: "modal-content zen-card border-0 shadow", children: [_jsxs("div", { className: "modal-header border-bottom", children: [_jsx("h5", { className: "modal-title text-danger fw-bold", children: "Remove Attachment" }), _jsx("button", { type: "button", className: "btn-close", onClick: closeRemovalModal, disabled: isRemoving, "aria-label": "Close" })] }), _jsxs("div", { className: "modal-body", children: [_jsxs("p", { style: { color: "var(--color-text-main)", fontSize: "14px" }, children: ["Are you sure you want to remove ", _jsxs("strong", { children: ["\"", removingAttachment.originalFilename, "\""] }), "? This file will no longer be downloadable."] }), _jsxs("div", { className: "mt-3", children: [_jsx("label", { htmlFor: "removalReasonInput", className: "form-label small fw-semibold", children: "Reason for removal (optional, max 200 chars)" }), _jsx("textarea", { id: "removalReasonInput", className: "zen-input", rows: 3, maxLength: 200, placeholder: "e.g. Uploaded incorrect screenshot", value: removalReason, onChange: (e) => setRemovalReason(e.target.value), disabled: isRemoving }), _jsxs("div", { className: "d-flex justify-content-end text-muted small mt-1", children: [removalReason.length, "/200"] })] }), removalError && (_jsx("div", { className: "alert alert-danger py-2 mt-2 small", role: "alert", children: removalError }))] }), _jsxs("div", { className: "modal-footer border-top", children: [_jsx("button", { type: "button", className: "zen-btn-secondary", onClick: closeRemovalModal, disabled: isRemoving, children: "Cancel" }), _jsx("button", { type: "button", className: "btn btn-danger", style: { borderRadius: "8px", fontWeight: 600, padding: "8px 16px" }, onClick: handleConfirmRemoval, disabled: isRemoving, children: isRemoving ? "Removing..." : "Confirm Removal" })] })] }) }) }))] }));
};
