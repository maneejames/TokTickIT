import React, { useState } from "react";
import { login, User } from "../api.js";

export interface LoginProps {
  onLoginSuccess: (user: User) => void;
}

export const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    let hasError = false;
    if (!email.trim()) {
      setEmailError("Email is required");
      hasError = true;
    } else {
      setEmailError(null);
    }

    if (!password) {
      setPasswordError("Password is required");
      hasError = true;
    } else {
      setPasswordError(null);
    }

    if (hasError) return;

    setIsSubmitting(true);
    try {
      const response = await login({ email: email.trim(), password });
      onLoginSuccess(response.user);
    } catch (err: unknown) {
      setServerError(err instanceof Error ? err.message : "Invalid email or password");
      setPassword(""); // Clear password field on error
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="d-flex align-items-center justify-content-center min-vh-100 px-3"
      style={{ backgroundColor: "var(--color-page-bg)" }}
    >
      <div
        className="zen-card p-4 p-sm-5"
        style={{ width: "100%", maxWidth: "440px" }}
      >
        <div className="text-center mb-4">
          <h1
            style={{
              color: "var(--color-primary-green)",
              fontSize: "28px",
              fontWeight: 800,
              marginBottom: "8px",
            }}
          >
            TokTickIT
          </h1>
          <h2
            style={{
              fontSize: "20px",
              fontWeight: 700,
              color: "var(--color-text-main)",
              marginBottom: "6px",
            }}
          >
            Sign in to TokTickIT
          </h2>
          <p style={{ color: "var(--color-text-muted)", fontSize: "14px", margin: 0 }}>
            Enter your email and password to access the service desk.
          </p>
        </div>

        {serverError && (
          <div
            className="p-3 mb-4 rounded"
            style={{
              backgroundColor: "var(--color-error-bg)",
              border: "1px solid var(--color-error)",
              color: "var(--color-error)",
              fontSize: "14px",
              fontWeight: 500,
            }}
            role="alert"
          >
            {serverError}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div className="mb-3">
            <label
              htmlFor="login-email"
              className="form-label d-block mb-1"
              style={{ fontSize: "14px", fontWeight: 600, color: "var(--color-text-main)" }}
            >
              Email Address <span style={{ color: "var(--color-error)" }}>*</span>
            </label>
            <input
              id="login-email"
              type="email"
              className="zen-input"
              value={email}
              disabled={isSubmitting}
              placeholder="user@kmutt.ac.th"
              onChange={(e) => {
                setEmail(e.target.value);
                if (emailError) setEmailError(null);
              }}
            />
            {emailError && (
              <div
                style={{
                  color: "var(--color-error)",
                  fontSize: "12px",
                  marginTop: "4px",
                  fontWeight: 500,
                }}
              >
                {emailError}
              </div>
            )}
          </div>

          <div className="mb-4">
            <label
              htmlFor="login-password"
              className="form-label d-block mb-1"
              style={{ fontSize: "14px", fontWeight: 600, color: "var(--color-text-main)" }}
            >
              Password <span style={{ color: "var(--color-error)" }}>*</span>
            </label>
            <input
              id="login-password"
              type="password"
              className="zen-input"
              value={password}
              disabled={isSubmitting}
              onChange={(e) => {
                setPassword(e.target.value);
                if (passwordError) setPasswordError(null);
              }}
            />
            {passwordError && (
              <div
                style={{
                  color: "var(--color-error)",
                  fontSize: "12px",
                  marginTop: "4px",
                  fontWeight: 500,
                }}
              >
                {passwordError}
              </div>
            )}
          </div>

          <button
            type="submit"
            className="zen-btn-primary w-100 d-flex align-items-center justify-content-center gap-2"
            disabled={isSubmitting}
            style={{ minHeight: "42px" }}
          >
            {isSubmitting && (
              <span
                className="spinner-border spinner-border-sm"
                role="status"
                aria-hidden="true"
              />
            )}
            <span>{isSubmitting ? "Signing In..." : "Sign In"}</span>
          </button>
        </form>
      </div>
    </div>
  );
};
