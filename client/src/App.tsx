import React, { useState } from "react";
import { RequesterProvider, useRequester } from "./context/RequesterContext.js";
import { AppShell } from "./components/AppShell.js";
import { CreateTicket } from "./components/CreateTicket.js";

function MainContent() {
  const { currentRequester } = useRequester();
  const [activeNav, setActiveNav] = useState<"my-tickets" | "create-ticket">("create-ticket");

  return (
    <AppShell activeNav={activeNav} onNavSelect={setActiveNav}>
      {currentRequester && (
        activeNav === "create-ticket" ? (
          <CreateTicket
            currentRequester={currentRequester}
            onNavigateToMyTickets={() => setActiveNav("my-tickets")}
          />
        ) : (
          <div className="container py-5 text-center">
            <div className="zen-card p-5 mx-auto" style={{ maxWidth: "600px" }}>
              <h2 className="h5 fw-bold" style={{ color: "var(--color-primary-green)" }}>
                My Tickets
              </h2>
              <p className="text-muted mt-2">
                My Tickets screen will be implemented in Sprint Issue #5.
              </p>
              <button
                type="button"
                className="zen-btn-primary mt-2"
                onClick={() => setActiveNav("create-ticket")}
              >
                Go to Create Ticket
              </button>
            </div>
          </div>
        )
      )}
    </AppShell>
  );
}

export default function App() {
  return (
    <RequesterProvider>
      <MainContent />
    </RequesterProvider>
  );
}
