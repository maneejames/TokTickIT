import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
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
    const [activeNav, setActiveNav] = useState("my-tickets");
    const [selectedTicketId, setSelectedTicketId] = useState(() => {
        const match = window.location.pathname.match(/^\/tickets\/(\d+)$/);
        return match ? Number(match[1]) : null;
    });
    const handleNavigateToTicketDetail = (ticketId) => {
        setSelectedTicketId(ticketId);
        window.history.pushState(null, "", `/tickets/${ticketId}`);
    };
    const handleBackToMyTickets = () => {
        setSelectedTicketId(null);
        setActiveNav("my-tickets");
        window.history.pushState(null, "", "/tickets");
    };
    const handleNavSelect = (nav) => {
        setSelectedTicketId(null);
        setActiveNav(nav);
    };
    // 1. Initial Load / Verifying session per ui-spec.md §2.3
    if (authLoading) {
        return (_jsxs("div", { className: "d-flex flex-column justify-content-center align-items-center min-vh-100", style: { backgroundColor: "var(--color-page-bg)" }, children: [_jsx("div", { className: "spinner-border", style: { color: "var(--color-primary-green)", width: "3rem", height: "3rem" }, role: "status", children: _jsx("span", { className: "visually-hidden", children: "Loading..." }) }), _jsx("div", { style: {
                        marginTop: "16px",
                        color: "var(--color-primary-green)",
                        fontWeight: 600,
                        fontSize: "15px",
                    }, children: "Authenticating TokTickIT..." })] }));
    }
    // 2. Unauthenticated: If legacy RequesterProvider is loaded with requesters in dev/test mode without an authenticated user,
    // show RequesterSelect if currentRequester is not set; otherwise show Login.
    if (!user) {
        if (requesters.length > 0 && !currentRequester) {
            return (_jsx(AppShell, { activeNav: activeNav, onNavSelect: handleNavSelect, children: _jsx(RequesterSelect, {}) }));
        }
        if (!currentRequester) {
            return (_jsx(Login, { onLoginSuccess: async () => {
                    await refreshUser();
                } }));
        }
    }
    // 3. Mandatory Password Change per ui-spec.md §2.2 / §2.3
    if (user && user.mustChangePassword) {
        return (_jsx(AppShell, { children: _jsx(ChangePassword, { onSuccess: async () => {
                    await refreshUser();
                }, onLogout: async () => {
                    await logout();
                } }) }));
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
        return (_jsx(AppShell, { activeNav: activeNav, onNavSelect: handleNavSelect, children: _jsx(RequesterSelect, {}) }));
    }
    return (_jsx(AppShell, { activeNav: activeNav, onNavSelect: handleNavSelect, children: selectedTicketId !== null ? (_jsx(RequesterTicketDetail, { ticketId: selectedTicketId, currentRequester: activeRequesterObj, onNavigateToMyTickets: handleBackToMyTickets })) : activeNav === "create-ticket" ? (_jsx(CreateTicket, { currentRequester: activeRequesterObj, onNavigateToMyTickets: () => setActiveNav("my-tickets"), onNavigateToTicketDetail: handleNavigateToTicketDetail })) : (_jsx(MyTickets, { currentRequester: activeRequesterObj, onNavigateToCreateTicket: () => setActiveNav("create-ticket"), onNavigateToTicketDetail: handleNavigateToTicketDetail })) }));
}
export default function App() {
    return (_jsx(AuthProvider, { children: _jsx(RequesterProvider, { children: _jsx(MainContent, {}) }) }));
}
