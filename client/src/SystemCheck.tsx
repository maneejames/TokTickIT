import { useState } from "react";
import { checkSystem, Category } from "./api.js";

type UiState = "idle" | "loading" | "success" | "error";

export function SystemCheck() {
  const [state, setState] = useState<UiState>("idle");
  const [categories, setCategories] = useState<Category[]>([]);
  const [errorMessage, setErrorMessage] = useState<string>("");

  async function handleCheck() {
    setState("loading");
    setErrorMessage("");
    try {
      const result = await checkSystem();
      setCategories(result.categories);
      setState("success");
    } catch (err: unknown) {
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

  return (
    <div className="container py-5" style={{ maxWidth: 640 }}>
      <h1 className="h3 mb-4">
        TokTickIT <span className="text-success">IT Service Desk</span>
      </h1>

      <div className="mb-4">
        <button
          className="btn btn-success"
          onClick={handleCheck}
          disabled={state === "loading"}
        >
          {state === "loading" ? "Checking…" : "Check System"}
        </button>
      </div>

      {state === "loading" && (
        <div className="alert alert-info d-flex align-items-center" role="status">
          <span className="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>
          <span>Checking backend system status...</span>
        </div>
      )}

      {state === "success" && (
        <div className="alert alert-success" role="alert">
          <h5 className="alert-heading mb-2">System Status: Online</h5>
          <p className="mb-3">TokTickIT API is operational and healthy.</p>
          {categories.length > 0 && (
            <div>
              <div className="fw-semibold mb-2">Supported Request Categories</div>
              <ol className="mb-0 ps-3">
                {categories.map((cat) => (
                  <li key={cat.id}>{cat.name}</li>
                ))}
              </ol>
            </div>
          )}
        </div>
      )}

      {state === "error" && (
        <div className="alert alert-danger" role="alert">
          <h5 className="alert-heading mb-1">System Status: Offline</h5>
          <p className="mb-0">{errorMessage || "Unable to connect to TokTickIT API"}</p>
        </div>
      )}
    </div>
  );
}

export default SystemCheck;
