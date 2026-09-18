import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { login } from "../api.js";
export const Login = ({ onLoginSuccess }) => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [emailError, setEmailError] = useState(null);
    const [passwordError, setPasswordError] = useState(null);
    const [serverError, setServerError] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const handleSubmit = async (e) => {
        e.preventDefault();
        setServerError(null);
        let hasError = false;
        if (!email.trim()) {
            setEmailError("Email is required");
            hasError = true;
        }
        else {
            setEmailError(null);
        }
        if (!password) {
            setPasswordError("Password is required");
            hasError = true;
        }
        else {
            setPasswordError(null);
        }
        if (hasError)
            return;
        setIsSubmitting(true);
        try {
            const response = await login({ email: email.trim(), password });
            onLoginSuccess(response.user);
        }
        catch (err) {
            setServerError(err instanceof Error ? err.message : "Invalid email or password");
            setPassword(""); // Clear password field on error
        }
        finally {
            setIsSubmitting(false);
        }
    };
    return (_jsx("div", { className: "d-flex align-items-center justify-content-center min-vh-100 px-3", style: { backgroundColor: "var(--color-page-bg)" }, children: _jsxs("div", { className: "zen-card p-4 p-sm-5", style: { width: "100%", maxWidth: "440px" }, children: [_jsxs("div", { className: "text-center mb-4", children: [_jsx("h1", { style: {
                                color: "var(--color-primary-green)",
                                fontSize: "28px",
                                fontWeight: 800,
                                marginBottom: "8px",
                            }, children: "TokTickIT" }), _jsx("h2", { style: {
                                fontSize: "20px",
                                fontWeight: 700,
                                color: "var(--color-text-main)",
                                marginBottom: "6px",
                            }, children: "Sign in to TokTickIT" }), _jsx("p", { style: { color: "var(--color-text-muted)", fontSize: "14px", margin: 0 }, children: "Enter your email and password to access the service desk." })] }), serverError && (_jsx("div", { className: "p-3 mb-4 rounded", style: {
                        backgroundColor: "var(--color-error-bg)",
                        border: "1px solid var(--color-error)",
                        color: "var(--color-error)",
                        fontSize: "14px",
                        fontWeight: 500,
                    }, role: "alert", children: serverError })), _jsxs("form", { onSubmit: handleSubmit, noValidate: true, children: [_jsxs("div", { className: "mb-3", children: [_jsxs("label", { htmlFor: "login-email", className: "form-label d-block mb-1", style: { fontSize: "14px", fontWeight: 600, color: "var(--color-text-main)" }, children: ["Email Address ", _jsx("span", { style: { color: "var(--color-error)" }, children: "*" })] }), _jsx("input", { id: "login-email", type: "email", className: "zen-input", value: email, disabled: isSubmitting, placeholder: "user@kmutt.ac.th", onChange: (e) => {
                                        setEmail(e.target.value);
                                        if (emailError)
                                            setEmailError(null);
                                    } }), emailError && (_jsx("div", { style: {
                                        color: "var(--color-error)",
                                        fontSize: "12px",
                                        marginTop: "4px",
                                        fontWeight: 500,
                                    }, children: emailError }))] }), _jsxs("div", { className: "mb-4", children: [_jsxs("label", { htmlFor: "login-password", className: "form-label d-block mb-1", style: { fontSize: "14px", fontWeight: 600, color: "var(--color-text-main)" }, children: ["Password ", _jsx("span", { style: { color: "var(--color-error)" }, children: "*" })] }), _jsx("input", { id: "login-password", type: "password", className: "zen-input", value: password, disabled: isSubmitting, onChange: (e) => {
                                        setPassword(e.target.value);
                                        if (passwordError)
                                            setPasswordError(null);
                                    } }), passwordError && (_jsx("div", { style: {
                                        color: "var(--color-error)",
                                        fontSize: "12px",
                                        marginTop: "4px",
                                        fontWeight: 500,
                                    }, children: passwordError }))] }), _jsxs("button", { type: "submit", className: "zen-btn-primary w-100 d-flex align-items-center justify-content-center gap-2", disabled: isSubmitting, style: { minHeight: "42px" }, children: [isSubmitting && (_jsx("span", { className: "spinner-border spinner-border-sm", role: "status", "aria-hidden": "true" })), _jsx("span", { children: isSubmitting ? "Signing In..." : "Sign In" })] })] })] }) }));
};
