import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useAuth } from "../context/AuthContext.js";
import { useRequester } from "../context/RequesterContext.js";
export const AppShell = ({ children, activeNav = "my-tickets", onNavSelect, }) => {
    const { user, logout } = useAuth();
    const { currentRequester, changeRequester } = useRequester();
    const getRoleBadge = (role) => {
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
    return (_jsxs("div", { className: "d-flex flex-column min-vh-100", style: { backgroundColor: "var(--color-page-bg)" }, children: [_jsxs("header", { className: "d-flex align-items-center justify-content-between px-4", style: {
                    backgroundColor: "var(--color-primary-green)",
                    height: "60px",
                    color: "#FFFFFF",
                }, children: [_jsxs("div", { className: "d-flex align-items-center gap-4", children: [_jsx("div", { className: "d-flex align-items-center gap-2", children: _jsx("h1", { style: {
                                        fontSize: "20px",
                                        fontWeight: 700,
                                        letterSpacing: "-0.5px",
                                        margin: 0,
                                        color: "#FFFFFF",
                                        cursor: "pointer",
                                    }, onClick: () => {
                                        if (!user?.mustChangePassword) {
                                            if (user?.role === "REQUESTER")
                                                onNavSelect?.("my-tickets");
                                            else if (user?.role === "IT_STAFF")
                                                onNavSelect?.("staff-queue");
                                            else if (user?.role === "ADMINISTRATOR")
                                                onNavSelect?.("admin-users");
                                        }
                                    }, children: "TokTickIT" }) }), user && !user.mustChangePassword && (_jsxs("nav", { className: "d-none d-md-flex align-items-center gap-3 ms-3", children: [user.role === "REQUESTER" && (_jsxs(_Fragment, { children: [_jsx("span", { role: "button", tabIndex: 0, onClick: () => onNavSelect?.("my-tickets"), onKeyDown: (e) => {
                                                    if (e.key === "Enter" || e.key === " ")
                                                        onNavSelect?.("my-tickets");
                                                }, style: {
                                                    color: activeNav === "my-tickets" ? "#FFFFFF" : "rgba(255, 255, 255, 0.8)",
                                                    fontWeight: activeNav === "my-tickets" ? 600 : 500,
                                                    fontSize: "14px",
                                                    cursor: "pointer",
                                                    borderBottom: activeNav === "my-tickets" ? "3px solid #FFFFFF" : "none",
                                                    paddingBottom: "4px",
                                                }, children: "My Tickets" }), _jsx("span", { role: "button", tabIndex: 0, onClick: () => onNavSelect?.("create-ticket"), onKeyDown: (e) => {
                                                    if (e.key === "Enter" || e.key === " ")
                                                        onNavSelect?.("create-ticket");
                                                }, style: {
                                                    color: activeNav === "create-ticket" ? "#FFFFFF" : "rgba(255, 255, 255, 0.8)",
                                                    fontWeight: activeNav === "create-ticket" ? 600 : 500,
                                                    fontSize: "14px",
                                                    cursor: "pointer",
                                                    borderBottom: activeNav === "create-ticket" ? "3px solid #FFFFFF" : "none",
                                                    paddingBottom: "4px",
                                                }, children: "Create Ticket" })] })), user.role === "IT_STAFF" && (_jsx("span", { role: "button", tabIndex: 0, onClick: () => onNavSelect?.("staff-queue"), onKeyDown: (e) => {
                                            if (e.key === "Enter" || e.key === " ")
                                                onNavSelect?.("staff-queue");
                                        }, style: {
                                            color: activeNav === "staff-queue" ? "#FFFFFF" : "rgba(255, 255, 255, 0.8)",
                                            fontWeight: activeNav === "staff-queue" ? 600 : 500,
                                            fontSize: "14px",
                                            cursor: "pointer",
                                            borderBottom: activeNav === "staff-queue" ? "3px solid #FFFFFF" : "none",
                                            paddingBottom: "4px",
                                        }, children: "Ticket Queue" })), user.role === "ADMINISTRATOR" && (_jsx("span", { role: "button", tabIndex: 0, onClick: () => onNavSelect?.("admin-users"), onKeyDown: (e) => {
                                            if (e.key === "Enter" || e.key === " ")
                                                onNavSelect?.("admin-users");
                                        }, style: {
                                            color: activeNav === "admin-users" ? "#FFFFFF" : "rgba(255, 255, 255, 0.8)",
                                            fontWeight: activeNav === "admin-users" ? 600 : 500,
                                            fontSize: "14px",
                                            cursor: "pointer",
                                            borderBottom: activeNav === "admin-users" ? "3px solid #FFFFFF" : "none",
                                            paddingBottom: "4px",
                                        }, children: "User Management" }))] }))] }), _jsx("div", { className: "d-flex align-items-center", children: user ? (_jsxs("div", { className: "d-flex align-items-center gap-3", children: [_jsxs("div", { className: "d-flex align-items-center px-3 py-1 rounded-pill", style: {
                                        backgroundColor: "rgba(255, 255, 255, 0.15)",
                                        color: "#FFFFFF",
                                        fontSize: "13px",
                                        fontWeight: 500,
                                    }, children: [_jsx("span", { className: "me-1", "aria-hidden": "true", children: "\uD83D\uDC64" }), _jsxs("span", { children: [user.name, " (", getRoleBadge(user.role), ")"] })] }), _jsx("button", { type: "button", className: "zen-btn-secondary", onClick: logout, style: {
                                        fontSize: "12px",
                                        padding: "4px 12px",
                                        backgroundColor: "transparent",
                                        color: "#FFFFFF",
                                        borderColor: "rgba(255, 255, 255, 0.8)",
                                        borderRadius: "999px",
                                    }, children: "Logout" })] })) : currentRequester ? (_jsxs("div", { className: "d-flex align-items-center gap-3", children: [_jsxs("div", { className: "d-flex align-items-center px-3 py-1 rounded-pill", style: {
                                        backgroundColor: "rgba(255, 255, 255, 0.15)",
                                        color: "#FFFFFF",
                                        fontSize: "13px",
                                        fontWeight: 500,
                                    }, children: [_jsx("span", { className: "me-1", "aria-hidden": "true", children: "\uD83D\uDC64" }), _jsxs("span", { children: [currentRequester.name, " (", currentRequester.department, ")"] })] }), _jsx("button", { type: "button", className: "zen-btn-secondary", onClick: changeRequester, style: {
                                        fontSize: "12px",
                                        padding: "4px 10px",
                                        backgroundColor: "#FFFFFF",
                                        color: "var(--color-primary-green)",
                                        borderColor: "#FFFFFF",
                                    }, children: "Change Requester" })] })) : null })] }), _jsx("main", { className: "flex-grow-1", children: children })] }));
};
