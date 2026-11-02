import React, { useState } from "react";
import { User } from "./api.js";
import { AuthProvider, useAuth } from "./context/AuthContext.js";
import { AppShell, AppNavKey } from "./components/AppShell.js";
import { Login } from "./components/Login.js";
import { ChangePassword } from "./components/ChangePassword.js";
import { CreateTicket } from "./components/CreateTicket.js";
import { MyTickets } from "./components/MyTickets.js";
import { RequesterTicketDetail } from "./components/RequesterTicketDetail.js";
import { StaffTicketQueue } from "./components/StaffTicketQueue.js";
import { StaffTicketDetail } from "./components/StaffTicketDetail.js";
import { UserManagement } from "./components/UserManagement.js";
import { RequesterDashboard } from "./components/RequesterDashboard.js";
import { StaffDashboard } from "./components/StaffDashboard.js";

function MainContent() {
  const { user, isLoading: authLoading, refreshUser, logout } = useAuth();

  const [activeNav, setActiveNav] = useState<AppNavKey>(() => {
    const path = window.location.pathname;
    if (path.startsWith("/staff/queue")) return "staff-queue";
    if (path.startsWith("/admin/users")) return "admin-users";
    if (path.startsWith("/tickets/create")) return "create-ticket";
    if (path === "/tickets") return "my-tickets";
    return "dashboard";
  });

  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(() => {
    const match = window.location.pathname.match(/^\/(?:staff\/)?tickets\/(\d+)$/);
    return match ? Number(match[1]) : null;
  });

  const [requesterDrillDownStatus, setRequesterDrillDownStatus] = useState<string | undefined>(
    undefined
  );
  const [staffQueueDrillDown, setStaffQueueDrillDown] = useState<
    | {
        status?: string;
        priority?: string;
        ownerId?: string | number;
        requesterResolved?: boolean;
      }
    | undefined
  >(undefined);

  const handleNavigateToTicketDetail = (ticketId: number) => {
    setSelectedTicketId(ticketId);
    if (user?.role === "IT_STAFF" || user?.role === "ADMINISTRATOR") {
      window.history.pushState(null, "", `/staff/tickets/${ticketId}`);
    } else {
      window.history.pushState(null, "", `/tickets/${ticketId}`);
    }
  };

  const handleBackToMyTickets = () => {
    setSelectedTicketId(null);
    if (user?.role === "IT_STAFF" || user?.role === "ADMINISTRATOR") {
      setActiveNav("staff-queue");
      window.history.pushState(null, "", "/staff/queue");
    } else {
      setActiveNav("my-tickets");
      window.history.pushState(null, "", "/tickets");
    }
  };

  const handleNavSelect = (nav: AppNavKey) => {
    setSelectedTicketId(null);
    setRequesterDrillDownStatus(undefined);
    setStaffQueueDrillDown(undefined);
    setActiveNav(nav);

    switch (nav) {
      case "dashboard":
        window.history.pushState(null, "", "/dashboard");
        break;
      case "my-tickets":
        window.history.pushState(null, "", "/tickets");
        break;
      case "create-ticket":
        window.history.pushState(null, "", "/tickets/create");
        break;
      case "staff-queue":
        window.history.pushState(null, "", "/staff/queue");
        break;
      case "admin-users":
        window.history.pushState(null, "", "/admin/users");
        break;
    }
  };

  // 1. Initial Load / Verifying session per ui-spec.md §2.3
  if (authLoading) {
    return (
      <div
        className="d-flex flex-column justify-content-center align-items-center min-vh-100"
        style={{ backgroundColor: "var(--color-page-bg)" }}
      >
        <div
          className="spinner-border"
          style={{ color: "var(--color-primary-green)", width: "3rem", height: "3rem" }}
          role="status"
        >
          <span className="visually-hidden">Loading...</span>
        </div>
        <div
          style={{
            marginTop: "16px",
            color: "var(--color-primary-green)",
            fontWeight: 600,
            fontSize: "15px",
          }}
        >
          Authenticating TokTickIT...
        </div>
      </div>
    );
  }

  // 2. Unauthenticated: Show Login screen
  if (!user) {
    return (
      <Login
        onLoginSuccess={async () => {
          await refreshUser();
        }}
      />
    );
  }

  // 3. Mandatory Password Change
  if (user.mustChangePassword) {
    return (
      <AppShell>
        <ChangePassword
          onSuccess={async () => {
            await refreshUser();
          }}
          onLogout={async () => {
            await logout();
          }}
        />
      </AppShell>
    );
  }

  // Active requester identity derived from authenticated user
  const activeRequesterObj: User = {
    ...user,
    department: user.department ?? "IT",
    isActive: user.isActive ?? true,
  };

  return (
    <AppShell activeNav={activeNav} onNavSelect={handleNavSelect}>
      {selectedTicketId !== null ? (
        user.role === "IT_STAFF" || user.role === "ADMINISTRATOR" ? (
          <StaffTicketDetail
            ticketId={selectedTicketId}
            currentUser={user}
            onNavigateBack={handleBackToMyTickets}
          />
        ) : (
          <RequesterTicketDetail
            ticketId={selectedTicketId}
            currentRequester={activeRequesterObj}
            onNavigateToMyTickets={handleBackToMyTickets}
          />
        )
      ) : activeNav === "dashboard" ? (
        user.role === "REQUESTER" ? (
          <RequesterDashboard
            currentRequester={activeRequesterObj}
            onDrillDownToMyTickets={(drillDown) => {
              setRequesterDrillDownStatus(drillDown.status);
              setActiveNav("my-tickets");
              window.history.pushState(
                null,
                "",
                `/tickets?status=${encodeURIComponent(drillDown.status)}`
              );
            }}
            onNavigateToMyTickets={() => handleNavSelect("my-tickets")}
            onNavigateToCreateTicket={() => handleNavSelect("create-ticket")}
            onNavigateToTicketDetail={handleNavigateToTicketDetail}
          />
        ) : (
          <StaffDashboard
            currentUser={user}
            onDrillDownToQueue={(drillDown) => {
              setStaffQueueDrillDown(drillDown);
              setActiveNav("staff-queue");
              const params = new URLSearchParams();
              for (const [k, v] of Object.entries(drillDown)) {
                if (v !== undefined) params.set(k, String(v));
              }
              const qs = params.toString();
              window.history.pushState(null, "", `/staff/queue${qs ? `?${qs}` : ""}`);
            }}
            onOpenQueue={() => handleNavSelect("staff-queue")}
            onOpenTicket={handleNavigateToTicketDetail}
            onOpenUserManagement={
              user.role === "ADMINISTRATOR"
                ? () => handleNavSelect("admin-users")
                : undefined
            }
          />
        )
      ) : activeNav === "staff-queue" ? (
        <StaffTicketQueue
          currentUser={user}
          initialFilters={staffQueueDrillDown}
          onOpenTicket={(ticketId) => {
            handleNavigateToTicketDetail(ticketId);
          }}
        />
      ) : activeNav === "admin-users" ? (
        <UserManagement currentUser={user} />
      ) : activeNav === "create-ticket" ? (
        <CreateTicket
          currentRequester={activeRequesterObj}
          onNavigateToMyTickets={() => handleNavSelect("my-tickets")}
          onNavigateToTicketDetail={handleNavigateToTicketDetail}
        />
      ) : (
        <MyTickets
          currentRequester={activeRequesterObj}
          initialStatusFilter={requesterDrillDownStatus}
          onNavigateToCreateTicket={() => handleNavSelect("create-ticket")}
          onNavigateToTicketDetail={handleNavigateToTicketDetail}
        />
      )}
    </AppShell>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainContent />
    </AuthProvider>
  );
}
