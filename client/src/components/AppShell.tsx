import React from "react";
import { useAuth } from "../context/AuthContext.js";

export type AppNavKey =
  | "dashboard"
  | "my-tickets"
  | "create-ticket"
  | "staff-queue"
  | "admin-users";

interface AppShellProps {
  children?: React.ReactNode;
  activeNav?: AppNavKey;
  onNavSelect?: (nav: AppNavKey) => void;
}

export const AppShell: React.FC<AppShellProps> = ({
  children,
  activeNav = "dashboard",
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

  const renderNavLink = (key: AppNavKey, label: string) => {
    const isActive = activeNav === key;
    return (
      <span
        key={key}
        role="button"
        tabIndex={0}
        aria-current={isActive ? "page" : undefined}
        onClick={() => onNavSelect?.(key)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onNavSelect?.(key);
          }
        }}
        style={{
          color: isActive ? "#FFFFFF" : "rgba(255, 255, 255, 0.82)",
          fontWeight: isActive ? 700 : 500,
          fontSize: "14px",
          cursor: "pointer",
          borderBottom: isActive ? "3px solid #FFFFFF" : "3px solid transparent",
          paddingBottom: "4px",
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </span>
    );
  };

  const getRoleNavItems = (): Array<{ key: AppNavKey; label: string }> => {
    if (!user) return [];
    if (user.role === "REQUESTER") {
      return [
        { key: "dashboard", label: "Dashboard" },
        { key: "my-tickets", label: "My Tickets" },
        { key: "create-ticket", label: "Create Ticket" },
      ];
    }
    if (user.role === "IT_STAFF") {
      return [
        { key: "dashboard", label: "Dashboard" },
        { key: "staff-queue", label: "Ticket Queue" },
      ];
    }
    if (user.role === "ADMINISTRATOR") {
      return [
        { key: "dashboard", label: "Dashboard" },
        { key: "staff-queue", label: "Ticket Queue" },
        { key: "admin-users", label: "User Management" },
      ];
    }
    return [];
  };

  const navItems = getRoleNavItems();

  return (
    <div
      className="d-flex flex-column min-vh-100"
      style={{ backgroundColor: "var(--color-page-bg)", overflowX: "hidden" }}
    >
      {/* Top Navigation Bar */}
      <header
        className="d-flex flex-wrap align-items-center justify-content-between px-3 px-md-4 py-2"
        style={{
          backgroundColor: "var(--color-primary-green)",
          minHeight: "60px",
          color: "#FFFFFF",
        }}
      >
        <div className="d-flex align-items-center gap-3 gap-md-4 flex-wrap">
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
                  onNavSelect?.("dashboard");
                }
              }}
            >
              TokTickIT
            </h1>
          </div>

          {/* Navigation Links per ui-spec.md §1 (hidden if mustChangePassword) */}
          {user && !user.mustChangePassword && (
            <nav
              aria-label="Primary navigation"
              className="d-flex align-items-center gap-3 ms-1 ms-md-3 flex-wrap"
            >
              {navItems.map((item) => renderNavLink(item.key, item.label))}
            </nav>
          )}
        </div>

        {/* Right: Authenticated User Profile & Logout Widget */}
        <div className="d-flex align-items-center ms-auto">
          {user ? (
            <div className="d-flex align-items-center gap-2 gap-md-3">
              <div
                className="d-none d-sm-flex align-items-center px-3 py-1 rounded-pill"
                style={{
                  backgroundColor: "rgba(255, 255, 255, 0.15)",
                  color: "#FFFFFF",
                  fontSize: "13px",
                  fontWeight: 500,
                  whiteSpace: "nowrap",
                }}
              >
                <span className="me-1" aria-hidden="true">
                  👤
                </span>
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
      <main className="flex-grow-1">{children}</main>
    </div>
  );
};
