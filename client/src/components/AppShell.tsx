import React from "react";
import { useAuth } from "../context/AuthContext.js";

interface AppShellProps {
  children?: React.ReactNode;
  activeNav?: "my-tickets" | "create-ticket" | "staff-queue" | "admin-users";
  onNavSelect?: (nav: any) => void;
}

export const AppShell: React.FC<AppShellProps> = ({
  children,
  activeNav = "my-tickets",
  onNavSelect,
}) => {
  const { user, logout } = useAuth();

  const getRoleBadge = (role?: string) => {
    switch (role) {
      case "ADMINISTRATOR":
        return "Administrator";
      case "IT_STAFF":
        return "IT Staff";
      case "REQUESTER":
      default:
        return "Requester";
    }
  };

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
            <h1
              style={{
                fontSize: "20px",
                fontWeight: 700,
                letterSpacing: "-0.5px",
                margin: 0,
                color: "#FFFFFF",
                cursor: "pointer",
              }}
              onClick={() => {
                if (!user?.mustChangePassword) {
                  if (user?.role === "REQUESTER") onNavSelect?.("my-tickets");
                  else if (user?.role === "IT_STAFF") onNavSelect?.("staff-queue");
                  else if (user?.role === "ADMINISTRATOR") onNavSelect?.("admin-users");
                }
              }}
            >
              TokTickIT
            </h1>
          </div>

          {/* Navigation Links per ui-spec.md §2.1 (hidden if mustChangePassword) */}
          {user && !user.mustChangePassword && (
            <nav className="d-none d-md-flex align-items-center gap-3 ms-3">
              {user.role === "REQUESTER" && (
                <>
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
                </>
              )}

              {user.role === "IT_STAFF" && (
                <span
                  role="button"
                  tabIndex={0}
                  onClick={() => onNavSelect?.("staff-queue")}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") onNavSelect?.("staff-queue");
                  }}
                  style={{
                    color: activeNav === "staff-queue" ? "#FFFFFF" : "rgba(255, 255, 255, 0.8)",
                    fontWeight: activeNav === "staff-queue" ? 600 : 500,
                    fontSize: "14px",
                    cursor: "pointer",
                    borderBottom: activeNav === "staff-queue" ? "3px solid #FFFFFF" : "none",
                    paddingBottom: "4px",
                  }}
                >
                  Ticket Queue
                </span>
              )}

              {user.role === "ADMINISTRATOR" && (
                <span
                  role="button"
                  tabIndex={0}
                  onClick={() => onNavSelect?.("admin-users")}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") onNavSelect?.("admin-users");
                  }}
                  style={{
                    color: activeNav === "admin-users" ? "#FFFFFF" : "rgba(255, 255, 255, 0.8)",
                    fontWeight: activeNav === "admin-users" ? 600 : 500,
                    fontSize: "14px",
                    cursor: "pointer",
                    borderBottom: activeNav === "admin-users" ? "3px solid #FFFFFF" : "none",
                    paddingBottom: "4px",
                  }}
                >
                  User Management
                </span>
              )}
            </nav>
          )}
        </div>

        {/* Right: Authenticated User Profile & Logout Widget per ui-spec.md §2.1 */}
        <div className="d-flex align-items-center">
          {user ? (
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
                  {user.name} ({getRoleBadge(user.role)})
                </span>
              </div>
              <button
                type="button"
                className="zen-btn-secondary"
                onClick={logout}
                style={{
                  fontSize: "12px",
                  padding: "4px 12px",
                  backgroundColor: "transparent",
                  color: "#FFFFFF",
                  borderColor: "rgba(255, 255, 255, 0.8)",
                  borderRadius: "999px",
                }}
              >
                Logout
              </button>
            </div>
          ) : null}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-grow-1">
        {children}
      </main>
    </div>
  );
};
