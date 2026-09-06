import { jsx as _jsx } from "react/jsx-runtime";
import { useState } from "react";
import { RequesterProvider, useRequester } from "./context/RequesterContext.js";
import { AppShell } from "./components/AppShell.js";
import { CreateTicket } from "./components/CreateTicket.js";
import { MyTickets } from "./components/MyTickets.js";
function MainContent() {
    const { currentRequester } = useRequester();
    const [activeNav, setActiveNav] = useState("my-tickets");
    return (_jsx(AppShell, { activeNav: activeNav, onNavSelect: setActiveNav, children: currentRequester && (activeNav === "create-ticket" ? (_jsx(CreateTicket, { currentRequester: currentRequester, onNavigateToMyTickets: () => setActiveNav("my-tickets") })) : (_jsx(MyTickets, { currentRequester: currentRequester, onNavigateToCreateTicket: () => setActiveNav("create-ticket"), onNavigateToTicketDetail: (ticketId) => {
                window.location.href = `/tickets/${ticketId}`;
            } }))) }));
}
export default function App() {
    return (_jsx(RequesterProvider, { children: _jsx(MainContent, {}) }));
}
