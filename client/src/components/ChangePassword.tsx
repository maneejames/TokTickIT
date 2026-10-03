import React, { useState } from "react";
import { changePassword } from "../api.js";

export interface ChangePasswordProps {
  onSuccess: () => void;
  onLogout: () => void;
}

export const ChangePassword: React.FC<ChangePasswordProps> = ({ onSuccess, onLogout }) => {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [currentError, setCurrentError] = useState<string | null>(null);
  const [newError, setNewError] = useState<string | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    let hasError = false;
    if (!currentPassword) {
      setCurrentError("Current password is required");
      hasError = true;
    } else {
      setCurrentError(null);
    }

    if (!newPassword) {
      setNewError("New password is required");
      hasError = true;
    } else {
      setNewError(null);
    }

    if (newPassword && confirmPassword && newPassword !== confirmPassword) {
      setConfirmError("Passwords do not match");
      hasError = true;
    } else {
      setConfirmError(null);
    }

    if (hasError) return;

    setIsSubmitting(true);
    try {
      await changePassword({
        currentPassword,
        newPassword,
        confirmPassword,
      });
      onSuccess();
    } catch (err: unknown) {
      setServerError(err instanceof Error ? err.message : "Failed to update password");
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
        style={{ width: "100%", maxWidth: "480px" }}
      >
        <div className="mb-4">
          <h2
            style={{
              fontSize: "22px",
              fontWeight: 700,
              color: "var(--color-text-main)",
              marginBottom: "12px",
            }}
          >
            Change Temporary Password
          </h2>
          <div
            className="p-3 rounded mb-3"
            style={{
              backgroundColor: "var(--color-warning-bg)",
              border: "1px solid var(--color-warning)",
              color: "var(--color-warning)",
              fontSize: "13px",
              fontWeight: 500,
            }}
          >
            ⚠️ First Login Notice: You must choose a new personal password before accessing TokTickIT.
          </div>
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
              htmlFor="current-password"
              className="form-label d-block mb-1"
              style={{ fontSize: "14px", fontWeight: 600, color: "var(--color-text-main)" }}
            >
              Current Password <span style={{ color: "var(--color-error)" }}>*</span>
            </label>
            <input
              id="current-password"
              type="password"
              className="zen-input"
              value={currentPassword}
              disabled={isSubmitting}
              onChange={(e) => {
                setCurrentPassword(e.target.value);
                if (currentError) setCurrentError(null);
              }}
            />
            {currentError && (
              <div
                style={{
                  color: "var(--color-error)",
                  fontSize: "12px",
                  marginTop: "4px",
                  fontWeight: 500,
                }}
              >
                {currentError}
              </div>
            )}
          </div>

          <div className="mb-3">
            <label
              htmlFor="new-password"
              className="form-label d-block mb-1"
              style={{ fontSize: "14px", fontWeight: 600, color: "var(--color-text-main)" }}
            >
              New Password <span style={{ color: "var(--color-error)" }}>*</span>
            </label>
            <input
              id="new-password"
              type="password"
              className="zen-input"
              value={newPassword}
              disabled={isSubmitting}
              onChange={(e) => {
                setNewPassword(e.target.value);
                if (newError) setNewError(null);
              }}
            />
            {newError && (
              <div
                style={{
                  color: "var(--color-error)",
                  fontSize: "12px",
                  marginTop: "4px",
                  fontWeight: 500,
                }}
              >
                {newError}
              </div>
            )}
          </div>

          <div className="mb-4">
            <label
              htmlFor="confirm-password"
              className="form-label d-block mb-1"
              style={{ fontSize: "14px", fontWeight: 600, color: "var(--color-text-main)" }}
            >
              Confirm New Password <span style={{ color: "var(--color-error)" }}>*</span>
            </label>
            <input
              id="confirm-password"
              type="password"
              className="zen-input"
              value={confirmPassword}
              disabled={isSubmitting}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                if (confirmError) setConfirmError(null);
              }}
            />
            {confirmError && (
              <div
                style={{
                  color: "var(--color-error)",
                  fontSize: "12px",
                  marginTop: "4px",
                  fontWeight: 500,
                }}
              >
                {confirmError}
              </div>
            )}
          </div>

          {/* Complexity Hints Callout per ui-spec.md §3.2 */}
          <div
            className="p-3 mb-4 rounded"
            style={{
              backgroundColor: "var(--color-pale-green)",
              border: "1px solid var(--color-border)",
              fontSize: "12px",
              color: "var(--color-text-muted)",
            }}
          >
            <div style={{ fontWeight: 600, color: "var(--color-text-main)", marginBottom: "4px" }}>
              Password Requirements:
            </div>
            <ul style={{ paddingLeft: "20px", margin: 0 }}>
              <li>Minimum 8 characters</li>
              <li>At least 1 uppercase letter (A-Z)</li>
              <li>At least 1 lowercase letter (a-z)</li>
              <li>At least 1 number (0-9)</li>
              <li>At least 1 special character (!@#$%^&*...)</li>
            </ul>
          </div>

          <div className="d-flex gap-2">
            <button
              type="submit"
              className="zen-btn-primary flex-grow-1 d-flex align-items-center justify-content-center gap-2"
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
              <span>{isSubmitting ? "Updating Password..." : "Update Password"}</span>
            </button>
            <button
              type="button"
              className="zen-btn-secondary"
              onClick={onLogout}
              disabled={isSubmitting}
              style={{ minHeight: "42px" }}
            >
              Logout
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
