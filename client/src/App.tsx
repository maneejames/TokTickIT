import React, { useState } from "react";
import { RequesterProvider, useRequester } from "./context/RequesterContext.js";
import { AppShell } from "./components/AppShell.js";
import { CreateTicket } from "./components/CreateTicket.js";
import { MyTickets } from "./components/MyTickets.js";

import { RequesterTicketDetail } from "./components/RequesterTicketDetail.js";

function MainContent() {
  const { currentRequester } = useRequester();
  const [activeNav, setActiveNav] = useState<"my-tickets" | "create-ticket">("my-tickets");
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(() => {
    // Check if initial URL matches /tickets/:id
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

  const handleNavSelect = (nav: "my-tickets" | "create-ticket") => {
    setSelectedTicketId(null);
    setActiveNav(nav);
  };

  return (
    <AppShell activeNav={activeNav} onNavSelect={handleNavSelect}>
      {currentRequester && (
        selectedTicketId !== null ? (
          <RequesterTicketDetail
            ticketId={selectedTicketId}
            currentRequester={currentRequester}
            onNavigateToMyTickets={handleBackToMyTickets}
          />
        ) : activeNav === "create-ticket" ? (
          <CreateTicket
            currentRequester={currentRequester}
            onNavigateToMyTickets={() => setActiveNav("my-tickets")}
            onNavigateToTicketDetail={handleNavigateToTicketDetail}
          />
        ) : (
          <MyTickets
            currentRequester={currentRequester}
            onNavigateToCreateTicket={() => setActiveNav("create-ticket")}
            onNavigateToTicketDetail={handleNavigateToTicketDetail}
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
