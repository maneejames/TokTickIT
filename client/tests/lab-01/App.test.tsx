import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import App from "../../src/SystemCheck.js";
import * as api from "../../src/api.js";

describe("App", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // WORKED EXAMPLE — provided for you.
  it("renders the TokTickIT heading", () => {
    render(<App />);
    expect(screen.getByText(/TokTickIT/i)).toBeInTheDocument();
  });

  it("shows Online when the API is reachable", async () => {
    vi.spyOn(api, "checkSystem").mockResolvedValue({
      online: true,
      categories: [
        { id: 1, name: "Hardware" },
        { id: 2, name: "Software" },
      ],
    });

    render(<App />);
    const checkBtn = screen.getByRole("button", { name: /Check System/i });
    fireEvent.click(checkBtn);

    await waitFor(() => {
      expect(screen.getByText(/System Status: Online/i)).toBeInTheDocument();
      expect(screen.getByText(/TokTickIT API is operational and healthy/i)).toBeInTheDocument();
      expect(screen.getByText("Hardware")).toBeInTheDocument();
      expect(screen.getByText("Software")).toBeInTheDocument();
    });
  });

  it("shows an Offline error message when the API is unavailable", async () => {
    vi.spyOn(api, "checkSystem").mockRejectedValue(
      new Error("Failed to fetch from backend")
    );

    render(<App />);
    const checkBtn = screen.getByRole("button", { name: /Check System/i });
    fireEvent.click(checkBtn);

    await waitFor(() => {
      expect(screen.getByText(/System Status: Offline/i)).toBeInTheDocument();
      expect(screen.getByText(/Failed to fetch from backend/i)).toBeInTheDocument();
    });
  });
});

