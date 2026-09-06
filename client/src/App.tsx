import React, { useState } from "react";
import { RequesterProvider, useRequester } from "./context/RequesterContext.js";
import { AppShell } from "./components/AppShell.js";
import { CreateTicket } from "./components/CreateTicket.js";
import { MyTickets } from "./components/MyTickets.js";

function MainContent() {
  const { currentRequester } = useRequester();
  const [activeNav, setActiveNav] = useState<"my-tickets" | "create-ticket">("my-tickets");

  return (
    <AppShell activeNav={activeNav} onNavSelect={setActiveNav}>
      {currentRequester && (
        activeNav === "create-ticket" ? (
          <CreateTicket
            currentRequester={currentRequester}
            onNavigateToMyTickets={() => setActiveNav("my-tickets")}
          />
        ) : (
          <MyTickets
            currentRequester={currentRequester}
            onNavigateToCreateTicket={() => setActiveNav("create-ticket")}
            onNavigateToTicketDetail={(ticketId) => {
              window.location.href = `/tickets/${ticketId}`;
            }}
          />
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
