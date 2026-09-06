import React from "react";
import { useRequester } from "../context/RequesterContext.js";
import { RequesterSelect } from "./RequesterSelect.js";

interface AppShellProps {
  children?: React.ReactNode;
  activeNav?: "my-tickets" | "create-ticket";
  onNavSelect?: (nav: "my-tickets" | "create-ticket") => void;
}

export const AppShell: React.FC<AppShellProps> = ({
  children,
  activeNav = "create-ticket",
  onNavSelect,
}) => {
  const { currentRequester, changeRequester, isLoading } = useRequester();

  return (
    <div className="d-flex flex-column min-vh-100" style={{ backgroundColor: "var(--color-page-bg)" }}>
      {/* Top Navigation Bar */}
      <header
        className="d-flex align-items-center justify-content-between px-4"
        style={{
          backgroundColor: "var(--color-primary-green)",
          height: "60px",
          color: "#FFFFFF",
        }}
      >
        <div className="d-flex align-items-center gap-4">
          <div className="d-flex align-items-center gap-2">
            <h1 style={{ fontSize: "20px", fontWeight: 700, letterSpacing: "-0.5px", margin: 0, color: "#FFFFFF" }}>
              TokTickIT
            </h1>
          </div>

          {/* Navigation Links (visible when requester is active) */}
          {currentRequester && (
            <nav className="d-none d-md-flex align-items-center gap-3 ms-3">
              <span
                role="button"
                tabIndex={0}
                onClick={() => onNavSelect?.("my-tickets")}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") onNavSelect?.("my-tickets");
                }}
                style={{
                  color: activeNav === "my-tickets" ? "#FFFFFF" : "rgba(255, 255, 255, 0.8)",
                  fontWeight: activeNav === "my-tickets" ? 600 : 500,
                  fontSize: "14px",
                  cursor: "pointer",
                  borderBottom: activeNav === "my-tickets" ? "3px solid #FFFFFF" : "none",
                  paddingBottom: "4px",
                }}
              >
                My Tickets
              </span>
              <span
                role="button"
                tabIndex={0}
                onClick={() => onNavSelect?.("create-ticket")}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") onNavSelect?.("create-ticket");
                }}
                style={{
                  color: activeNav === "create-ticket" ? "#FFFFFF" : "rgba(255, 255, 255, 0.8)",
                  fontWeight: activeNav === "create-ticket" ? 600 : 500,
                  fontSize: "14px",
                  cursor: "pointer",
                  borderBottom: activeNav === "create-ticket" ? "3px solid #FFFFFF" : "none",
                  paddingBottom: "4px",
                }}
              >
                Create Ticket
              </span>
            </nav>
          )}
        </div>

        {/* Right: Development Requester Context Pill */}
        <div className="d-flex align-items-center">
          {currentRequester ? (
            <div className="d-flex align-items-center gap-3">
              <div
                className="d-flex align-items-center px-3 py-1 rounded-pill"
                style={{
                  backgroundColor: "rgba(255, 255, 255, 0.15)",
                  color: "#FFFFFF",
                  fontSize: "13px",
                  fontWeight: 500,
                }}
              >
                <span className="me-1" aria-hidden="true">👤</span>
                <span>
                  {currentRequester.name} ({currentRequester.department})
                </span>
              </div>
              <button
                type="button"
                className="zen-btn-secondary"
                onClick={changeRequester}
                style={{
                  fontSize: "12px",
                  padding: "4px 10px",
                  backgroundColor: "#FFFFFF",
                  color: "var(--color-primary-green)",
                  borderColor: "#FFFFFF",
                }}
              >
                Change Requester
              </button>
            </div>
          ) : (
            <span
              style={{
                fontSize: "12px",
                color: "rgba(255, 255, 255, 0.8)",
                fontStyle: "italic",
              }}
            >
              Testing Mode — No Requester Selected
            </span>
          )}
        </div>
      </header>

      {/* Sub-banner: Testing Mode Notice */}
      <div
        className="px-4 py-2 text-center"
        style={{
          backgroundColor: "var(--color-warning-bg)",
          color: "#6C4E00",
          borderBottom: "1px solid #E5CE85",
          fontSize: "13px",
        }}
        role="note"
      >
        <span>
          🧪 <strong>Lab 2 Testing Mode:</strong> Authenticated sessions will be introduced in Lab 3.
          Use the &apos;Change Requester&apos; button to switch user context.
        </span>
      </div>

      {/* Main Content Area */}
      <main className="flex-grow-1">
        {isLoading ? (
          <div className="d-flex justify-content-center align-items-center py-5">
            <div
              className="spinner-border"
              style={{ color: "var(--color-primary-green)" }}
              role="status"
            >
              <span className="visually-hidden">Loading...</span>
            </div>
          </div>
        ) : !currentRequester ? (
          <RequesterSelect />
        ) : null}
        {children}
      </main>
    </div>
  );
};
