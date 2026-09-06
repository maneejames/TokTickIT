import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { RequesterProvider, useRequester } from "./context/RequesterContext.js";
import { AppShell } from "./components/AppShell.js";
function MainContent() {
    const { currentRequester } = useRequester();
    return (_jsx(AppShell, { children: currentRequester && (_jsx("div", { className: "container py-5 text-center", children: _jsxs("div", { className: "zen-card p-5 mx-auto", style: { maxWidth: "680px" }, children: [_jsxs("h2", { className: "h4", style: { color: "var(--color-primary-green)", fontWeight: 700 }, children: ["Welcome, ", currentRequester.name, "!"] }), _jsxs("p", { className: "text-muted mt-2 mb-0", children: ["Department: ", _jsx("strong", { children: currentRequester.department }), " | Email: ", _jsx("strong", { children: currentRequester.email })] })] }) })) }));
}
export default function App() {
    return (_jsx(RequesterProvider, { children: _jsx(MainContent, {}) }));
}
