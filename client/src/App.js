import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { RequesterProvider, useRequester } from "./context/RequesterContext.js";
import { AppShell } from "./components/AppShell.js";
import { CreateTicket } from "./components/CreateTicket.js";
function MainContent() {
    const { currentRequester } = useRequester();
    const [activeNav, setActiveNav] = useState("create-ticket");
    return (_jsx(AppShell, { activeNav: activeNav, onNavSelect: setActiveNav, children: currentRequester && (activeNav === "create-ticket" ? (_jsx(CreateTicket, { currentRequester: currentRequester, onNavigateToMyTickets: () => setActiveNav("my-tickets") })) : (_jsx("div", { className: "container py-5 text-center", children: _jsxs("div", { className: "zen-card p-5 mx-auto", style: { maxWidth: "600px" }, children: [_jsx("h2", { className: "h5 fw-bold", style: { color: "var(--color-primary-green)" }, children: "My Tickets" }), _jsx("p", { className: "text-muted mt-2", children: "My Tickets screen will be implemented in Sprint Issue #5." }), _jsx("button", { type: "button", className: "zen-btn-primary mt-2", onClick: () => setActiveNav("create-ticket"), children: "Go to Create Ticket" })] }) }))) }));
}
export default function App() {
    return (_jsx(RequesterProvider, { children: _jsx(MainContent, {}) }));
}
