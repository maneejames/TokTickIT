import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { useRequester } from "../context/RequesterContext.js";
export const RequesterSelect = () => {
    const { requesters, isLoading, error, selectRequester, loadRequesters } = useRequester();
    const [selectedId, setSelectedId] = useState("");
    const handleContinue = (e) => {
        e.preventDefault();
        if (selectedId) {
            selectRequester(Number(selectedId));
        }
    };
    return (_jsx("div", { className: "container d-flex justify-content-center", style: { marginTop: "60px", marginBottom: "40px" }, children: _jsxs("div", { className: "zen-card p-4 w-100", style: { maxWidth: "480px" }, children: [_jsx("h2", { className: "h4 mb-3", style: { color: "var(--color-primary-green)", fontSize: "22px", fontWeight: 700 }, children: "Welcome to Service Desk" }), _jsxs("div", { className: "p-3 mb-4 rounded", style: {
                        backgroundColor: "var(--color-warning-bg)",
                        border: "1px solid #E5CE85",
                        color: "#6C4E00",
                        fontSize: "13px",
                        lineHeight: 1.4,
                    }, role: "note", children: [_jsx("span", { className: "me-2", "aria-hidden": "true", children: "\uD83E\uDDEA" }), _jsx("strong", { children: "Lab 2 Testing Mode:" }), " Authenticated sessions will be introduced in Lab 3. Please select a Development Requester to simulate user context."] }), isLoading && (_jsxs("div", { className: "d-flex align-items-center justify-content-center py-4 text-muted", role: "status", "aria-label": "Loading requesters", children: [_jsx("span", { className: "spinner-border spinner-border-sm me-2", style: { color: "var(--color-secondary-green)" }, "aria-hidden": "true" }), _jsx("span", { children: "Loading development requesters..." })] })), !isLoading && error && (_jsxs("div", { className: "alert p-3 mb-3", style: {
                        backgroundColor: "var(--color-error-bg)",
                        border: "1px solid var(--color-error)",
                        color: "var(--color-error)",
                        fontSize: "14px",
                    }, role: "alert", children: [_jsx("div", { className: "fw-semibold mb-1", children: "Failed to load requesters" }), _jsx("div", { className: "mb-2", children: error }), _jsx("button", { type: "button", className: "zen-btn-secondary", onClick: loadRequesters, style: { fontSize: "13px", padding: "4px 10px" }, children: "Retry" })] })), !isLoading && !error && requesters.length === 0 && (_jsx("div", { className: "alert p-3 mb-3", style: {
                        backgroundColor: "var(--color-warning-bg)",
                        border: "1px solid var(--color-warning)",
                        color: "#6C4E00",
                        fontSize: "14px",
                    }, role: "status", children: "No active development requesters found in the database." })), !isLoading && !error && requesters.length > 0 && (_jsxs("form", { onSubmit: handleContinue, children: [_jsxs("div", { className: "mb-4", children: [_jsxs("label", { htmlFor: "requester-select", className: "form-label mb-1", style: {
                                        display: "block",
                                        fontWeight: 600,
                                        fontSize: "14px",
                                        color: "var(--color-text-main)",
                                    }, children: ["Select Development Requester", " ", _jsx("span", { style: { color: "var(--color-error)" }, children: "*" })] }), _jsxs("select", { id: "requester-select", className: "zen-select", value: selectedId, onChange: (e) => setSelectedId(e.target.value), required: true, children: [_jsx("option", { value: "", disabled: true, children: "-- Choose a Requester --" }), requesters.map((req) => (_jsxs("option", { value: req.id, children: [req.name, " \u2014 ", req.department, " (", req.email, ")"] }, req.id)))] })] }), _jsx("button", { type: "submit", className: "zen-btn-primary w-100", disabled: !selectedId, style: { height: "42px" }, children: "Continue to Portal" })] }))] }) }));
};
