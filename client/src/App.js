import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { checkSystem } from "./api.js";
export default function App() {
    const [state, setState] = useState("idle");
    const [categories, setCategories] = useState([]);
    const [errorMessage, setErrorMessage] = useState("");
    async function handleCheck() {
        setState("loading");
        setErrorMessage("");
        try {
            const result = await checkSystem();
            setCategories(result.categories);
            setState("success");
        }
        catch (err) {
            let message = "Unable to connect to TokTickIT API. Please ensure the backend server is running.";
            if (err instanceof Error) {
                message =
                    err.message === "Failed to fetch"
                        ? "Cannot reach the backend service. Please ensure the API server is running on http://localhost:3000."
                        : err.message;
            }
            setErrorMessage(message);
            setState("error");
        }
    }
    return (_jsxs("div", { className: "container py-5", style: { maxWidth: 640 }, children: [_jsxs("h1", { className: "h3 mb-4", children: ["TokTickIT ", _jsx("span", { className: "text-success", children: "IT Service Desk" })] }), _jsx("div", { className: "mb-4", children: _jsx("button", { className: "btn btn-success", onClick: handleCheck, disabled: state === "loading", children: state === "loading" ? "Checking…" : "Check System" }) }), state === "loading" && (_jsxs("div", { className: "alert alert-info d-flex align-items-center", role: "status", children: [_jsx("span", { className: "spinner-border spinner-border-sm me-2", "aria-hidden": "true" }), _jsx("span", { children: "Checking backend system status..." })] })), state === "success" && (_jsxs("div", { className: "alert alert-success", role: "alert", children: [_jsx("h5", { className: "alert-heading mb-2", children: "System Status: Online" }), _jsx("p", { className: "mb-3", children: "TokTickIT API is operational and healthy." }), categories.length > 0 && (_jsxs("div", { children: [_jsx("div", { className: "fw-semibold mb-2", children: "Supported Request Categories" }), _jsx("ol", { className: "mb-0 ps-3", children: categories.map((cat) => (_jsx("li", { children: cat.name }, cat.id))) })] }))] })), state === "error" && (_jsxs("div", { className: "alert alert-danger", role: "alert", children: [_jsx("h5", { className: "alert-heading mb-1", children: "System Status: Offline" }), _jsx("p", { className: "mb-0", children: errorMessage || "Unable to connect to TokTickIT API" })] }))] }));
}
