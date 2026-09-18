import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { changePassword } from "../api.js";
export const ChangePassword = ({ onSuccess, onLogout }) => {
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [currentError, setCurrentError] = useState(null);
    const [newError, setNewError] = useState(null);
    const [confirmError, setConfirmError] = useState(null);
    const [serverError, setServerError] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const handleSubmit = async (e) => {
        e.preventDefault();
        setServerError(null);
        let hasError = false;
        if (!currentPassword) {
            setCurrentError("Current password is required");
            hasError = true;
        }
        else {
            setCurrentError(null);
        }
        if (!newPassword) {
            setNewError("New password is required");
            hasError = true;
        }
        else {
            setNewError(null);
        }
        if (newPassword && confirmPassword && newPassword !== confirmPassword) {
            setConfirmError("Passwords do not match");
            hasError = true;
        }
        else {
            setConfirmError(null);
        }
        if (hasError)
            return;
        setIsSubmitting(true);
        try {
            await changePassword({
                currentPassword,
                newPassword,
                confirmPassword,
            });
            onSuccess();
        }
        catch (err) {
            setServerError(err instanceof Error ? err.message : "Failed to update password");
        }
        finally {
            setIsSubmitting(false);
        }
    };
    return (_jsx("div", { className: "d-flex align-items-center justify-content-center min-vh-100 px-3", style: { backgroundColor: "var(--color-page-bg)" }, children: _jsxs("div", { className: "zen-card p-4 p-sm-5", style: { width: "100%", maxWidth: "480px" }, children: [_jsxs("div", { className: "mb-4", children: [_jsx("h2", { style: {
                                fontSize: "22px",
                                fontWeight: 700,
                                color: "var(--color-text-main)",
                                marginBottom: "12px",
                            }, children: "Change Temporary Password" }), _jsx("div", { className: "p-3 rounded mb-3", style: {
                                backgroundColor: "var(--color-warning-bg)",
                                border: "1px solid var(--color-warning)",
                                color: "var(--color-warning)",
                                fontSize: "13px",
                                fontWeight: 500,
                            }, children: "\u26A0\uFE0F First Login Notice: You must choose a new personal password before accessing TokTickIT." })] }), serverError && (_jsx("div", { className: "p-3 mb-4 rounded", style: {
                        backgroundColor: "var(--color-error-bg)",
                        border: "1px solid var(--color-error)",
                        color: "var(--color-error)",
                        fontSize: "14px",
                        fontWeight: 500,
                    }, role: "alert", children: serverError })), _jsxs("form", { onSubmit: handleSubmit, noValidate: true, children: [_jsxs("div", { className: "mb-3", children: [_jsxs("label", { htmlFor: "current-password", className: "form-label d-block mb-1", style: { fontSize: "14px", fontWeight: 600, color: "var(--color-text-main)" }, children: ["Current Password ", _jsx("span", { style: { color: "var(--color-error)" }, children: "*" })] }), _jsx("input", { id: "current-password", type: "password", className: "zen-input", value: currentPassword, disabled: isSubmitting, onChange: (e) => {
                                        setCurrentPassword(e.target.value);
                                        if (currentError)
                                            setCurrentError(null);
                                    } }), currentError && (_jsx("div", { style: {
                                        color: "var(--color-error)",
                                        fontSize: "12px",
                                        marginTop: "4px",
                                        fontWeight: 500,
                                    }, children: currentError }))] }), _jsxs("div", { className: "mb-3", children: [_jsxs("label", { htmlFor: "new-password", className: "form-label d-block mb-1", style: { fontSize: "14px", fontWeight: 600, color: "var(--color-text-main)" }, children: ["New Password ", _jsx("span", { style: { color: "var(--color-error)" }, children: "*" })] }), _jsx("input", { id: "new-password", type: "password", className: "zen-input", value: newPassword, disabled: isSubmitting, onChange: (e) => {
                                        setNewPassword(e.target.value);
                                        if (newError)
                                            setNewError(null);
                                    } }), newError && (_jsx("div", { style: {
                                        color: "var(--color-error)",
                                        fontSize: "12px",
                                        marginTop: "4px",
                                        fontWeight: 500,
                                    }, children: newError }))] }), _jsxs("div", { className: "mb-4", children: [_jsxs("label", { htmlFor: "confirm-password", className: "form-label d-block mb-1", style: { fontSize: "14px", fontWeight: 600, color: "var(--color-text-main)" }, children: ["Confirm New Password ", _jsx("span", { style: { color: "var(--color-error)" }, children: "*" })] }), _jsx("input", { id: "confirm-password", type: "password", className: "zen-input", value: confirmPassword, disabled: isSubmitting, onChange: (e) => {
                                        setConfirmPassword(e.target.value);
                                        if (confirmError)
                                            setConfirmError(null);
                                    } }), confirmError && (_jsx("div", { style: {
                                        color: "var(--color-error)",
                                        fontSize: "12px",
                                        marginTop: "4px",
                                        fontWeight: 500,
                                    }, children: confirmError }))] }), _jsxs("div", { className: "p-3 mb-4 rounded", style: {
                                backgroundColor: "var(--color-pale-green)",
                                border: "1px solid var(--color-border)",
                                fontSize: "12px",
                                color: "var(--color-text-muted)",
                            }, children: [_jsx("div", { style: { fontWeight: 600, color: "var(--color-text-main)", marginBottom: "4px" }, children: "Password Requirements:" }), _jsxs("ul", { style: { paddingLeft: "20px", margin: 0 }, children: [_jsx("li", { children: "Minimum 8 characters" }), _jsx("li", { children: "At least 1 uppercase letter (A-Z)" }), _jsx("li", { children: "At least 1 lowercase letter (a-z)" }), _jsx("li", { children: "At least 1 number (0-9)" }), _jsx("li", { children: "At least 1 special character (!@#$%^&*...)" })] })] }), _jsxs("div", { className: "d-flex gap-2", children: [_jsxs("button", { type: "submit", className: "zen-btn-primary flex-grow-1 d-flex align-items-center justify-content-center gap-2", disabled: isSubmitting, style: { minHeight: "42px" }, children: [isSubmitting && (_jsx("span", { className: "spinner-border spinner-border-sm", role: "status", "aria-hidden": "true" })), _jsx("span", { children: isSubmitting ? "Updating Password..." : "Update Password" })] }), _jsx("button", { type: "button", className: "zen-btn-secondary", onClick: onLogout, disabled: isSubmitting, style: { minHeight: "42px" }, children: "Logout" })] })] })] }) }));
};
