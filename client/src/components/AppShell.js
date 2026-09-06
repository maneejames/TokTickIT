import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useRequester } from "../context/RequesterContext.js";
import { RequesterSelect } from "./RequesterSelect.js";
export const AppShell = ({ children }) => {
    const { currentRequester, changeRequester, isLoading } = useRequester();
    return (_jsxs("div", { className: "d-flex flex-column min-vh-100", style: { backgroundColor: "var(--color-page-bg)" }, children: [_jsxs("header", { className: "d-flex align-items-center justify-content-between px-4", style: {
                    backgroundColor: "var(--color-primary-green)",
                    height: "60px",
                    color: "#FFFFFF",
                }, children: [_jsxs("div", { className: "d-flex align-items-center gap-4", children: [_jsx("div", { className: "d-flex align-items-center gap-2", children: _jsx("h1", { style: { fontSize: "20px", fontWeight: 700, letterSpacing: "-0.5px", margin: 0, color: "#FFFFFF" }, children: "TokTickIT" }) }), currentRequester && (_jsxs("nav", { className: "d-none d-md-flex align-items-center gap-3 ms-3", children: [_jsx("span", { style: {
                                            color: "#FFFFFF",
                                            fontWeight: 600,
                                            fontSize: "14px",
                                            cursor: "pointer",
                                            borderBottom: "3px solid #FFFFFF",
                                            paddingBottom: "4px",
                                        }, children: "My Tickets" }), _jsx("span", { style: {
                                            color: "rgba(255, 255, 255, 0.8)",
                                            fontWeight: 500,
                                            fontSize: "14px",
                                            cursor: "pointer",
                                            paddingBottom: "4px",
                                        }, children: "Create Ticket" })] }))] }), _jsx("div", { className: "d-flex align-items-center", children: currentRequester ? (_jsxs("div", { className: "d-flex align-items-center gap-3", children: [_jsxs("div", { className: "d-flex align-items-center px-3 py-1 rounded-pill", style: {
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
                                    }, children: "Change Requester" })] })) : (_jsx("span", { style: {
                                fontSize: "12px",
                                color: "rgba(255, 255, 255, 0.8)",
                                fontStyle: "italic",
                            }, children: "Testing Mode \u2014 No Requester Selected" })) })] }), _jsx("div", { className: "px-4 py-2 text-center", style: {
                    backgroundColor: "var(--color-warning-bg)",
                    color: "#6C4E00",
                    borderBottom: "1px solid #E5CE85",
                    fontSize: "13px",
                }, role: "note", children: _jsxs("span", { children: ["\uD83E\uDDEA ", _jsx("strong", { children: "Lab 2 Testing Mode:" }), " Authenticated sessions will be introduced in Lab 3. Use the 'Change Requester' button to switch user context."] }) }), _jsxs("main", { className: "flex-grow-1", children: [isLoading ? (_jsx("div", { className: "d-flex justify-content-center align-items-center py-5", children: _jsx("div", { className: "spinner-border", style: { color: "var(--color-primary-green)" }, role: "status", children: _jsx("span", { className: "visually-hidden", children: "Loading..." }) }) })) : !currentRequester ? (_jsx(RequesterSelect, {})) : null, children] })] }));
};
