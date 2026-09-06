import React, { useState } from "react";
import { useRequester } from "../context/RequesterContext.js";

export const RequesterSelect: React.FC = () => {
  const { requesters, isLoading, error, selectRequester, loadRequesters } = useRequester();
  const [selectedId, setSelectedId] = useState<string>("");

  const handleContinue = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedId) {
      selectRequester(Number(selectedId));
    }
  };

  return (
    <div
      className="container d-flex justify-content-center"
      style={{ marginTop: "60px", marginBottom: "40px" }}
    >
      <div
        className="zen-card p-4 w-100"
        style={{ maxWidth: "480px" }}
      >
        <h2
          className="h4 mb-3"
          style={{ color: "var(--color-primary-green)", fontSize: "22px", fontWeight: 700 }}
        >
          Welcome to Service Desk
        </h2>

        {/* Testing Banner */}
        <div
          className="p-3 mb-4 rounded"
          style={{
            backgroundColor: "var(--color-warning-bg)",
            border: "1px solid #E5CE85",
            color: "#6C4E00",
            fontSize: "13px",
            lineHeight: 1.4,
          }}
          role="note"
        >
          <span className="me-2" aria-hidden="true">🧪</span>
          <strong>Lab 2 Testing Mode:</strong> Authenticated sessions will be introduced in Lab 3.
          Please select a Development Requester to simulate user context.
        </div>

        {/* Loading State */}
        {isLoading && (
          <div
            className="d-flex align-items-center justify-content-center py-4 text-muted"
            role="status"
            aria-label="Loading requesters"
          >
            <span
              className="spinner-border spinner-border-sm me-2"
              style={{ color: "var(--color-secondary-green)" }}
              aria-hidden="true"
            ></span>
            <span>Loading development requesters...</span>
          </div>
        )}

        {/* API Error State */}
        {!isLoading && error && (
          <div
            className="alert p-3 mb-3"
            style={{
              backgroundColor: "var(--color-error-bg)",
              border: "1px solid var(--color-error)",
              color: "var(--color-error)",
              fontSize: "14px",
            }}
            role="alert"
          >
            <div className="fw-semibold mb-1">Failed to load requesters</div>
            <div className="mb-2">{error}</div>
            <button
              type="button"
              className="zen-btn-secondary"
              onClick={loadRequesters}
              style={{ fontSize: "13px", padding: "4px 10px" }}
            >
              Retry
            </button>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && requesters.length === 0 && (
          <div
            className="alert p-3 mb-3"
            style={{
              backgroundColor: "var(--color-warning-bg)",
              border: "1px solid var(--color-warning)",
              color: "#6C4E00",
              fontSize: "14px",
            }}
            role="status"
          >
            No active development requesters found in the database.
          </div>
        )}

        {/* Form State */}
        {!isLoading && !error && requesters.length > 0 && (
          <form onSubmit={handleContinue}>
            <div className="mb-4">
              <label
                htmlFor="requester-select"
                className="form-label mb-1"
                style={{
                  display: "block",
                  fontWeight: 600,
                  fontSize: "14px",
                  color: "var(--color-text-main)",
                }}
              >
                Select Development Requester{" "}
                <span style={{ color: "var(--color-error)" }}>*</span>
              </label>
              <select
                id="requester-select"
                className="zen-select"
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
                required
              >
                <option value="" disabled>
                  -- Choose a Requester --
                </option>
                {requesters.map((req) => (
                  <option key={req.id} value={req.id}>
                    {req.name} — {req.department} ({req.email})
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              className="zen-btn-primary w-100"
              disabled={!selectedId}
              style={{ height: "42px" }}
            >
              Continue to Portal
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
