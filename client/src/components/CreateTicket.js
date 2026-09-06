import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect, useRef } from "react";
import { getCategories, getRelatedSystems, createTicket, uploadAttachment, } from "../api.js";
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".pdf"];
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
export const CreateTicket = ({ currentRequester, onNavigateToMyTickets, onNavigateToTicketDetail, }) => {
    // Reference data state
    const [categories, setCategories] = useState([]);
    const [relatedSystems, setRelatedSystems] = useState([]);
    const [loadingRefData, setLoadingRefData] = useState(true);
    const [refDataError, setRefDataError] = useState(null);
    // Form field state
    const [categoryId, setCategoryId] = useState("");
    const [relatedSystemId, setRelatedSystemId] = useState("");
    const [requestedPriority, setRequestedPriority] = useState("MEDIUM");
    const [summary, setSummary] = useState("");
    const [description, setDescription] = useState("");
    const [attachments, setAttachments] = useState([]);
    // Validation & feedback state
    const [validationErrors, setValidationErrors] = useState({});
    const [attachmentError, setAttachmentError] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [apiError, setApiError] = useState(null);
    const [isDragOver, setIsDragOver] = useState(false);
    // Submission success result
    const [successResult, setSuccessResult] = useState(null);
    const fileInputRef = useRef(null);
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
        }
        catch (err) {
            setRefDataError(err instanceof Error ? err.message : "Failed to load form reference data");
        }
        finally {
            setLoadingRefData(false);
        }
    };
    useEffect(() => {
        loadReferenceData();
    }, []);
    const formatFileSize = (bytes) => {
        if (bytes < 1024)
            return `${bytes} B`;
        if (bytes < 1024 * 1024)
            return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };
    const handleFilesSelected = (filesList) => {
        if (!filesList || filesList.length === 0)
            return;
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
    const handleRemoveAttachment = (indexToRemove) => {
        setAttachments((prev) => prev.filter((_, idx) => idx !== indexToRemove));
        setAttachmentError(null);
    };
    const validateForm = () => {
        const errors = {};
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
    const handleSubmit = async (e) => {
        e.preventDefault();
        setApiError(null);
        if (!validateForm()) {
            return;
        }
        setIsSubmitting(true);
        try {
            // Step 1: Create Ticket via JSON payload
            const createdTicket = await createTicket({
                categoryId: Number(categoryId),
                relatedSystemId: Number(relatedSystemId),
                summary: summary.trim(),
                description: description.trim(),
                requestedPriority,
            }, currentRequester.id);
            // Step 2: Upload staged attachments sequentially
            let failedCount = 0;
            if (attachments.length > 0) {
                for (const file of attachments) {
                    try {
                        await uploadAttachment(createdTicket.id, file, currentRequester.id);
                    }
                    catch {
                        failedCount++;
                    }
                }
            }
            setSuccessResult({
                ticket: createdTicket,
                failedAttachmentsCount: failedCount,
                totalAttachmentsCount: attachments.length,
            });
        }
        catch (err) {
            // Preserve form values upon failure!
            setApiError(err instanceof Error ? err.message : "Failed to create ticket");
        }
        finally {
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
        return (_jsxs("div", { className: "container py-5 text-center", children: [_jsx("div", { className: "spinner-border", style: { color: "var(--color-primary-green)" }, role: "status", children: _jsx("span", { className: "visually-hidden", children: "Loading form..." }) }), _jsx("p", { className: "mt-3 text-muted", children: "Loading categories and systems..." })] }));
    }
    // Error loading reference data state
    if (refDataError) {
        return (_jsx("div", { className: "container py-5", children: _jsxs("div", { className: "zen-card p-4 mx-auto text-center", style: { maxWidth: "600px" }, children: [_jsx("div", { className: "alert alert-danger", role: "alert", children: refDataError }), _jsx("button", { type: "button", className: "zen-btn-primary mt-3", onClick: loadReferenceData, children: "Retry Loading" })] }) }));
    }
    // Success state view
    if (successResult) {
        const { ticket, failedAttachmentsCount, totalAttachmentsCount } = successResult;
        return (_jsx("div", { className: "container py-5", children: _jsxs("div", { className: "zen-card p-4 p-md-5 mx-auto", style: { maxWidth: "760px" }, children: [_jsxs("div", { className: "p-4 rounded-3 text-center mb-4", style: {
                            backgroundColor: "var(--color-pale-green)",
                            border: "1px solid #B8E2CB",
                        }, children: [_jsx("div", { style: { fontSize: "40px", color: "var(--color-primary-green)", lineHeight: 1 }, children: "\u2713" }), _jsx("h2", { className: "h4 mt-3 mb-2", style: { color: "var(--color-primary-green)", fontWeight: 700 }, children: "Ticket Created Successfully" }), _jsx("p", { className: "text-muted mb-3", children: "Your ticket has been officially registered in the TokTickIT system." }), _jsx("div", { className: "d-inline-block px-4 py-2 rounded-3 bg-white", style: {
                                    border: "2px dashed var(--color-secondary-green)",
                                    color: "var(--color-primary-green)",
                                    fontSize: "20px",
                                    fontWeight: 700,
                                    letterSpacing: "0.5px",
                                }, children: ticket.ticketNumber })] }), failedAttachmentsCount > 0 && (_jsxs("div", { className: "alert mb-4", style: {
                            backgroundColor: "var(--color-warning-bg)",
                            border: "1px solid #E5CE85",
                            color: "#6C4E00",
                        }, role: "alert", children: [_jsx("strong", { children: "Attachment Upload Notice:" }), " Ticket ", ticket.ticketNumber, " created.", " ", failedAttachmentsCount, " of ", totalAttachmentsCount, " attachments failed to upload \u2014 you can retry from Ticket Detail."] })), _jsxs("div", { className: "d-flex flex-column flex-sm-row justify-content-center gap-3 mt-4", children: [_jsx("a", { href: `/tickets/${ticket.id}`, className: "zen-btn-primary text-center text-decoration-none", style: { padding: "10px 20px" }, onClick: (e) => {
                                    if (onNavigateToTicketDetail) {
                                        e.preventDefault();
                                        onNavigateToTicketDetail(ticket.id);
                                    }
                                }, children: "View Ticket Details" }), _jsx("button", { type: "button", className: "zen-btn-secondary", onClick: handleCreateAnother, style: { padding: "10px 20px" }, children: "Create Another Ticket" })] })] }) }));
    }
    const currentDateFormatted = new Date().toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    });
    return (_jsx("div", { className: "container py-4 py-md-5", children: _jsxs("div", { className: "zen-card p-4 p-md-5 mx-auto", style: { maxWidth: "760px" }, children: [_jsxs("div", { className: "mb-4", children: [_jsx("h1", { style: {
                                fontSize: "22px",
                                fontWeight: 700,
                                color: "var(--color-primary-green)",
                                margin: 0,
                            }, children: "Create IT Support Ticket" }), _jsx("p", { className: "text-muted small mt-1 mb-0", children: "Fill out the details below to submit a technical assistance request to the TokTickIT team." })] }), apiError && (_jsxs("div", { className: "alert mb-4", style: {
                        backgroundColor: "var(--color-error-bg)",
                        border: "1px solid var(--color-error)",
                        color: "var(--color-error)",
                    }, role: "alert", children: [_jsx("strong", { children: "Submission Error:" }), " ", apiError] })), _jsxs("form", { onSubmit: handleSubmit, noValidate: true, children: [_jsxs("div", { className: "row g-3 mb-3", children: [_jsxs("div", { className: "col-12 col-md-6", children: [_jsx("label", { htmlFor: "ticketNumberDisplay", className: "form-label mb-1", style: { fontWeight: 600, fontSize: "14px", color: "var(--color-text-main)" }, children: "Ticket Number" }), _jsx("input", { id: "ticketNumberDisplay", type: "text", readOnly: true, disabled: true, value: "Generated upon submission", className: "form-control", style: {
                                                backgroundColor: "var(--color-field-readonly)",
                                                borderColor: "var(--color-border)",
                                                color: "var(--color-text-muted)",
                                                fontStyle: "italic",
                                                minHeight: "40px",
                                            } })] }), _jsxs("div", { className: "col-12 col-md-6", children: [_jsx("label", { htmlFor: "requesterDisplay", className: "form-label mb-1", style: { fontWeight: 600, fontSize: "14px", color: "var(--color-text-main)" }, children: "Requester" }), _jsx("input", { id: "requesterDisplay", type: "text", readOnly: true, disabled: true, value: `${currentRequester.name} (${currentRequester.department})`, className: "form-control", style: {
                                                backgroundColor: "var(--color-field-readonly)",
                                                borderColor: "var(--color-border)",
                                                color: "var(--color-text-main)",
                                                minHeight: "40px",
                                                fontWeight: 500,
                                            } })] })] }), _jsxs("div", { className: "row g-3 mb-3", children: [_jsxs("div", { className: "col-12 col-md-6", children: [_jsxs("label", { htmlFor: "category", className: "form-label mb-1", style: { fontWeight: 600, fontSize: "14px", color: "var(--color-text-main)" }, children: ["Category ", _jsx("span", { style: { color: "var(--color-error)" }, children: "*" })] }), _jsxs("select", { id: "category", className: "zen-select", value: categoryId, onChange: (e) => {
                                                setCategoryId(e.target.value);
                                                if (validationErrors.categoryId) {
                                                    setValidationErrors((prev) => ({ ...prev, categoryId: "" }));
                                                }
                                            }, style: {
                                                borderColor: validationErrors.categoryId ? "var(--color-error)" : undefined,
                                            }, "aria-required": "true", "aria-invalid": !!validationErrors.categoryId, "aria-describedby": validationErrors.categoryId ? "category-error" : undefined, children: [_jsx("option", { value: "", children: "Select Category" }), categories.map((cat) => (_jsx("option", { value: cat.id, children: cat.name }, cat.id)))] }), validationErrors.categoryId && (_jsx("div", { id: "category-error", role: "alert", style: { color: "var(--color-error)", fontSize: "12px", marginTop: "4px" }, children: validationErrors.categoryId }))] }), _jsxs("div", { className: "col-12 col-md-6", children: [_jsxs("label", { htmlFor: "relatedSystem", className: "form-label mb-1", style: { fontWeight: 600, fontSize: "14px", color: "var(--color-text-main)" }, children: ["Related System ", _jsx("span", { style: { color: "var(--color-error)" }, children: "*" })] }), _jsxs("select", { id: "relatedSystem", className: "zen-select", value: relatedSystemId, onChange: (e) => {
                                                setRelatedSystemId(e.target.value);
                                                if (validationErrors.relatedSystemId) {
                                                    setValidationErrors((prev) => ({ ...prev, relatedSystemId: "" }));
                                                }
                                            }, style: {
                                                borderColor: validationErrors.relatedSystemId ? "var(--color-error)" : undefined,
                                            }, "aria-required": "true", "aria-invalid": !!validationErrors.relatedSystemId, "aria-describedby": validationErrors.relatedSystemId ? "relatedSystem-error" : undefined, children: [_jsx("option", { value: "", children: "Select Related System" }), relatedSystems.map((sys) => (_jsx("option", { value: sys.id, children: sys.name }, sys.id)))] }), validationErrors.relatedSystemId && (_jsx("div", { id: "relatedSystem-error", role: "alert", style: { color: "var(--color-error)", fontSize: "12px", marginTop: "4px" }, children: validationErrors.relatedSystemId }))] })] }), _jsxs("div", { className: "row g-3 mb-3", children: [_jsxs("div", { className: "col-12 col-md-6", children: [_jsxs("label", { htmlFor: "requestedPriority", className: "form-label mb-1", style: { fontWeight: 600, fontSize: "14px", color: "var(--color-text-main)" }, children: ["Requested Priority ", _jsx("span", { style: { color: "var(--color-error)" }, children: "*" })] }), _jsxs("select", { id: "requestedPriority", className: "zen-select", value: requestedPriority, onChange: (e) => setRequestedPriority(e.target.value), "aria-required": "true", children: [_jsx("option", { value: "LOW", children: "Low" }), _jsx("option", { value: "MEDIUM", children: "Medium (Default)" }), _jsx("option", { value: "HIGH", children: "High" })] })] }), _jsxs("div", { className: "col-12 col-md-6", children: [_jsx("label", { htmlFor: "ticketDateDisplay", className: "form-label mb-1", style: { fontWeight: 600, fontSize: "14px", color: "var(--color-text-main)" }, children: "Ticket Date" }), _jsx("input", { id: "ticketDateDisplay", type: "text", readOnly: true, disabled: true, value: currentDateFormatted, className: "form-control", style: {
                                                backgroundColor: "var(--color-field-readonly)",
                                                borderColor: "var(--color-border)",
                                                color: "var(--color-text-main)",
                                                minHeight: "40px",
                                            } })] })] }), _jsxs("div", { className: "mb-3", children: [_jsxs("div", { className: "d-flex justify-content-between align-items-center mb-1", children: [_jsxs("label", { htmlFor: "summary", className: "form-label mb-0", style: { fontWeight: 600, fontSize: "14px", color: "var(--color-text-main)" }, children: ["Ticket Summary ", _jsx("span", { style: { color: "var(--color-error)" }, children: "*" })] }), _jsxs("span", { style: {
                                                fontSize: "12px",
                                                color: summary.trim().length > 100 ? "var(--color-error)" : "var(--color-text-muted)",
                                            }, children: [summary.trim().length, "/100"] })] }), _jsx("input", { id: "summary", type: "text", className: "zen-input", placeholder: "Brief description of the problem (5\u2013100 characters)", value: summary, maxLength: 100, onChange: (e) => {
                                        setSummary(e.target.value);
                                        if (validationErrors.summary) {
                                            setValidationErrors((prev) => ({ ...prev, summary: "" }));
                                        }
                                    }, style: {
                                        borderColor: validationErrors.summary ? "var(--color-error)" : undefined,
                                    }, "aria-required": "true", "aria-invalid": !!validationErrors.summary, "aria-describedby": validationErrors.summary ? "summary-error" : undefined }), validationErrors.summary && (_jsx("div", { id: "summary-error", role: "alert", style: { color: "var(--color-error)", fontSize: "12px", marginTop: "4px" }, children: validationErrors.summary }))] }), _jsxs("div", { className: "mb-4", children: [_jsxs("div", { className: "d-flex justify-content-between align-items-center mb-1", children: [_jsxs("label", { htmlFor: "description", className: "form-label mb-0", style: { fontWeight: 600, fontSize: "14px", color: "var(--color-text-main)" }, children: ["Problem Description ", _jsx("span", { style: { color: "var(--color-error)" }, children: "*" })] }), _jsxs("span", { style: {
                                                fontSize: "12px",
                                                color: description.trim().length > 2000 ? "var(--color-error)" : "var(--color-text-muted)",
                                            }, children: [description.trim().length, "/2000"] })] }), _jsx("textarea", { id: "description", className: "zen-input", rows: 5, placeholder: "Detailed explanation of steps to reproduce, affected hardware, software versions, or context...", value: description, maxLength: 2000, onChange: (e) => {
                                        setDescription(e.target.value);
                                        if (validationErrors.description) {
                                            setValidationErrors((prev) => ({ ...prev, description: "" }));
                                        }
                                    }, style: {
                                        borderColor: validationErrors.description ? "var(--color-error)" : undefined,
                                        minHeight: "120px",
                                        resize: "vertical",
                                    }, "aria-required": "true", "aria-invalid": !!validationErrors.description, "aria-describedby": validationErrors.description ? "description-error" : undefined }), validationErrors.description && (_jsx("div", { id: "description-error", role: "alert", style: { color: "var(--color-error)", fontSize: "12px", marginTop: "4px" }, children: validationErrors.description }))] }), _jsxs("div", { className: "mb-4", children: [_jsxs("div", { className: "d-flex justify-content-between align-items-center mb-1", children: [_jsx("label", { htmlFor: "attachments", className: "form-label mb-0", style: { fontWeight: 600, fontSize: "14px", color: "var(--color-text-main)" }, children: "Attachments" }), _jsxs("span", { className: "text-muted small", children: [attachments.length, " of 5 files selected"] })] }), _jsx("p", { className: "text-muted small mb-2", children: "Allowed formats: JPG, PNG, WEBP, PDF. Max 5 MB per file. Up to 5 attachments total." }), _jsxs("div", { onDragOver: (e) => {
                                        e.preventDefault();
                                        setIsDragOver(true);
                                    }, onDragLeave: () => setIsDragOver(false), onDrop: (e) => {
                                        e.preventDefault();
                                        setIsDragOver(false);
                                        handleFilesSelected(e.dataTransfer.files);
                                    }, onClick: () => {
                                        if (attachments.length < 5 && fileInputRef.current) {
                                            fileInputRef.current.click();
                                        }
                                    }, style: {
                                        border: "2px dashed",
                                        borderColor: isDragOver ? "var(--color-secondary-green)" : "var(--color-border)",
                                        backgroundColor: isDragOver ? "var(--color-pale-green)" : "#FAFCFA",
                                        borderRadius: "8px",
                                        padding: "24px 16px",
                                        textAlign: "center",
                                        cursor: attachments.length >= 5 ? "not-allowed" : "pointer",
                                        transition: "all 0.2s",
                                    }, children: [_jsx("input", { ref: fileInputRef, id: "attachments", type: "file", multiple: true, className: "d-none", disabled: attachments.length >= 5, onChange: (e) => handleFilesSelected(e.target.files) }), _jsx("div", { style: { fontSize: "24px", marginBottom: "8px" }, "aria-hidden": "true", children: "\uD83D\uDCCE" }), _jsx("div", { style: { fontSize: "14px", fontWeight: 600, color: "var(--color-text-main)" }, children: attachments.length >= 5 ? ("Maximum 5 active attachments reached") : (_jsxs(_Fragment, { children: [_jsx("span", { style: { color: "var(--color-secondary-green)", textDecoration: "underline" }, children: "Click to browse" }), " ", "or drag files here"] })) })] }), attachmentError && (_jsx("div", { role: "alert", style: {
                                        color: "var(--color-error)",
                                        fontSize: "12px",
                                        marginTop: "6px",
                                        fontWeight: 500,
                                    }, children: attachmentError })), attachments.length > 0 && (_jsx("ul", { className: "list-group mt-3", children: attachments.map((file, idx) => (_jsxs("li", { className: "list-group-item d-flex justify-content-between align-items-center py-2 px-3", style: {
                                            borderColor: "var(--color-border)",
                                            fontSize: "13px",
                                            backgroundColor: "#FFFFFF",
                                        }, children: [_jsxs("div", { className: "d-flex align-items-center gap-2 text-truncate", children: [_jsx("span", { "aria-hidden": "true", children: "\uD83D\uDCC4" }), _jsx("span", { className: "fw-semibold text-truncate", children: file.name }), _jsxs("span", { className: "text-muted", children: ["(", formatFileSize(file.size), ")"] })] }), _jsx("button", { type: "button", className: "btn btn-sm btn-link text-danger p-0 ms-2 text-decoration-none", style: { fontSize: "12px", fontWeight: 600 }, onClick: () => handleRemoveAttachment(idx), "aria-label": `Remove ${file.name}`, children: "Remove" })] }, `${file.name}-${idx}`))) }))] }), _jsxs("div", { className: "d-flex flex-column flex-sm-row justify-content-end gap-3 pt-3 border-top", children: [onNavigateToMyTickets && (_jsx("button", { type: "button", className: "zen-btn-secondary", disabled: isSubmitting, onClick: onNavigateToMyTickets, children: "Cancel" })), _jsx("button", { type: "submit", className: "zen-btn-primary d-flex align-items-center justify-content-center gap-2", disabled: isSubmitting, style: { minWidth: "140px" }, children: isSubmitting ? (_jsxs(_Fragment, { children: [_jsx("span", { className: "spinner-border spinner-border-sm", role: "status", "aria-hidden": "true" }), _jsx("span", { children: "Submitting..." })] })) : ("Submit Ticket") })] })] })] }) }));
};
