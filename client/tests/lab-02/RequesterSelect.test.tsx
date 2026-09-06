import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import App from "../../src/App.js";
import * as api from "../../src/api.js";

const mockRequesters: api.RequesterUser[] = [
  {
    id: 1,
    name: "Somchai Jaidee",
    email: "somchai.jai@kmutt.ac.th",
    department: "Engineering",
    isActive: true,
  },
  {
    id: 2,
    name: "Suda Rakdee",
    email: "suda.rak@kmutt.ac.th",
    department: "Science",
    isActive: true,
  },
];

describe("Development Requester Context UI", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  // REQ-UI-01: selecting a requester saves it to localStorage and displays the name in the app shell
  it("REQ-UI-01: selecting a requester saves it to localStorage and displays the name in the app shell", async () => {
    vi.spyOn(api, "getRequesters").mockResolvedValue(mockRequesters);

    render(<App />);

    // Wait for dropdown to populate
    await waitFor(() => {
      expect(screen.getByRole("combobox", { name: /select development requester/i })).toBeInTheDocument();
    });

    const select = screen.getByRole("combobox", { name: /select development requester/i });
    fireEvent.change(select, { target: { value: "1" } });

    const continueBtn = screen.getByRole("button", { name: /continue to portal/i });
    expect(continueBtn).not.toBeDisabled();
    fireEvent.click(continueBtn);

    // Verify localStorage has the saved requester ID
    await waitFor(() => {
      expect(localStorage.getItem("selectedRequesterId")).toBe("1");
      const header = screen.getByRole("banner");
      expect(within(header).getByText(/Somchai Jaidee/i)).toBeInTheDocument();
      expect(within(header).getByText(/Engineering/i)).toBeInTheDocument();
    });
  });

  // REQ-UI-02: Change Requester button clears context and returns to selection screen
  it("REQ-UI-02: Change Requester button clears context and returns to selection screen", async () => {
    vi.spyOn(api, "getRequesters").mockResolvedValue(mockRequesters);
    localStorage.setItem("selectedRequesterId", "1");

    render(<App />);

    // Initial render with valid stored ID should validate and show shell
    await waitFor(() => {
      const header = screen.getByRole("banner");
      expect(within(header).getByText(/Somchai Jaidee/i)).toBeInTheDocument();
    });

    const changeBtn = screen.getByRole("button", { name: /change requester/i });
    fireEvent.click(changeBtn);

    // Should clear localStorage and show the selection screen
    await waitFor(() => {
      expect(localStorage.getItem("selectedRequesterId")).toBeNull();
      expect(screen.getByRole("combobox", { name: /select development requester/i })).toBeInTheDocument();
    });
  });

  // REQ-UI-03: an invalid or stale localStorage requesterId clears storage and redirects to selection screen
  it("REQ-UI-03: invalid or stale localStorage requesterId clears storage and redirects to selection screen", async () => {
    vi.spyOn(api, "getRequesters").mockResolvedValue(mockRequesters);
    localStorage.setItem("selectedRequesterId", "9999"); // nonexistent ID

    render(<App />);

    // App should validate against active requesters, clear localStorage and redirect to selection screen
    await waitFor(() => {
      expect(localStorage.getItem("selectedRequesterId")).toBeNull();
      expect(screen.getByRole("combobox", { name: /select development requester/i })).toBeInTheDocument();
    });
  });
});
