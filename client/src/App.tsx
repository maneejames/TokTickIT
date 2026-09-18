import React, { useState } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext.js";
import { RequesterProvider, useRequester } from "./context/RequesterContext.js";
import { AppShell } from "./components/AppShell.js";
import { Login } from "./components/Login.js";
import { ChangePassword } from "./components/ChangePassword.js";
import { CreateTicket } from "./components/CreateTicket.js";
import { MyTickets } from "./components/MyTickets.js";
import { RequesterTicketDetail } from "./components/RequesterTicketDetail.js";
import { RequesterSelect } from "./components/RequesterSelect.js";

function MainContent() {
  const { user, isLoading: authLoading, refreshUser, logout } = useAuth();
  const { currentRequester, requesters, isLoading: requesterLoading } = useRequester();

  const [activeNav, setActiveNav] = useState<"my-tickets" | "create-ticket" | "staff-queue" | "admin-users">("my-tickets");
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(() => {
    const match = window.location.pathname.match(/^\/tickets\/(\d+)$/);
    return match ? Number(match[1]) : null;
  });

  const handleNavigateToTicketDetail = (ticketId: number) => {
    setSelectedTicketId(ticketId);
    window.history.pushState(null, "", `/tickets/${ticketId}`);
  };

  const handleBackToMyTickets = () => {
    setSelectedTicketId(null);
    setActiveNav("my-tickets");
    window.history.pushState(null, "", "/tickets");
  };

  const handleNavSelect = (nav: "my-tickets" | "create-ticket" | "staff-queue" | "admin-users") => {
    setSelectedTicketId(null);
    setActiveNav(nav);
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

  // 2. Unauthenticated: If legacy RequesterProvider is loaded with requesters in dev/test mode without an authenticated user,
  // show RequesterSelect if currentRequester is not set; otherwise show Login.
  if (!user) {
    if (requesters.length > 0 && !currentRequester) {
      return (
        <AppShell activeNav={activeNav} onNavSelect={handleNavSelect}>
          <RequesterSelect />
        </AppShell>
      );
    }

    if (!currentRequester) {
      return (
        <Login
          onLoginSuccess={async () => {
            await refreshUser();
          }}
        />
      );
    }
  }

  // 3. Mandatory Password Change per ui-spec.md §2.2 / §2.3
  if (user && user.mustChangePassword) {
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

  // Active requester identity derived from user (or fallback to currentRequester in legacy tests)
  const activeRequesterObj = user
    ? {
        id: user.id,
        name: user.name,
        email: user.email,
        department: "IT",
        isActive: true,
      }
    : currentRequester;

  // If in legacy test mode and no requester selected yet, show RequesterSelect
  if (!activeRequesterObj) {
    return (
      <AppShell activeNav={activeNav} onNavSelect={handleNavSelect}>
        <RequesterSelect />
      </AppShell>
    );
  }

  return (
    <AppShell activeNav={activeNav} onNavSelect={handleNavSelect}>
      {selectedTicketId !== null ? (
        <RequesterTicketDetail
          ticketId={selectedTicketId}
          currentRequester={activeRequesterObj}
          onNavigateToMyTickets={handleBackToMyTickets}
        />
      ) : activeNav === "create-ticket" ? (
        <CreateTicket
          currentRequester={activeRequesterObj}
          onNavigateToMyTickets={() => setActiveNav("my-tickets")}
          onNavigateToTicketDetail={handleNavigateToTicketDetail}
        />
      ) : (
        <MyTickets
          currentRequester={activeRequesterObj}
          onNavigateToCreateTicket={() => setActiveNav("create-ticket")}
          onNavigateToTicketDetail={handleNavigateToTicketDetail}
        />
      )}
    </AppShell>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <RequesterProvider>
        <MainContent />
      </RequesterProvider>
    </AuthProvider>
  );
}
