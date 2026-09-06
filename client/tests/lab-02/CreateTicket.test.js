import { jsx as _jsx } from "react/jsx-runtime";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CreateTicket } from "../../src/components/CreateTicket.js";
import * as api from "../../src/api.js";
// Mock Requester Context
const mockRequester = {
    id: 1,
    name: "Somchai Jaidee",
    email: "somchai.jai@kmutt.ac.th",
    department: "Engineering",
    isActive: true,
};
const mockCategories = [
    { id: 1, name: "Account and Access", isActive: true },
    { id: 2, name: "Hardware", isActive: true },
];
const mockRelatedSystems = [
    { id: 1, name: "Email", description: "Mail" },
    { id: 7, name: "Corporate Laptop", description: "Laptop" },
];
describe("Create Ticket Component UI Tests", () => {
    beforeEach(() => {
        vi.restoreAllMocks();
        vi.spyOn(api, "getCategories").mockResolvedValue(mockCategories);
        vi.spyOn(api, "getRelatedSystems").mockResolvedValue(mockRelatedSystems);
    });
    const renderComponent = () => {
        return render(_jsx(CreateTicket, { currentRequester: mockRequester }));
    };
    // TICK-UI-01: form validation errors appear below invalid controls and API is NOT called
    describe("TICK-UI-01: Form validation errors", () => {
        it("displays field-level error messages below invalid fields and does not call API", async () => {
            const createTicketSpy = vi.spyOn(api, "createTicket");
            renderComponent();
            await waitFor(() => {
                expect(screen.getByLabelText(/Category/i)).toBeInTheDocument();
            });
            // Submit empty form
            const submitBtn = screen.getByRole("button", { name: /Submit Ticket/i });
            fireEvent.click(submitBtn);
            // Verify validation error messages are displayed
            await waitFor(() => {
                expect(screen.getByText(/Category is required/i)).toBeInTheDocument();
                expect(screen.getByText(/Related System is required/i)).toBeInTheDocument();
                expect(screen.getByText(/Summary must be between 5 and 100 characters/i)).toBeInTheDocument();
                expect(screen.getByText(/Description must be between 10 and 2000 characters/i)).toBeInTheDocument();
            });
            // API should not have been called
            expect(createTicketSpy).not.toHaveBeenCalled();
        });
    });
    // TICK-UI-02: submission failure preserves form inputs
    describe("TICK-UI-02: Submission failure preserves form inputs", () => {
        it("shows error callout on 500 API failure and preserves entered form values", async () => {
            vi.spyOn(api, "createTicket").mockRejectedValue(new Error("Database connection failed"));
            renderComponent();
            await waitFor(() => {
                expect(screen.getByLabelText(/Category/i)).toBeInTheDocument();
            });
            // Fill in fields
            fireEvent.change(screen.getByLabelText(/Category/i), { target: { value: "2" } });
            fireEvent.change(screen.getByLabelText(/Related System/i), { target: { value: "7" } });
            fireEvent.change(screen.getByLabelText(/Ticket Summary/i), {
                target: { value: "Laptop screen flickering intermittently" },
            });
            fireEvent.change(screen.getByLabelText(/Problem Description/i), {
                target: { value: "The screen flickers whenever brightness is adjusted above 50%." },
            });
            // Click submit
            const submitBtn = screen.getByRole("button", { name: /Submit Ticket/i });
            fireEvent.click(submitBtn);
            // Verify error callout is shown
            await waitFor(() => {
                expect(screen.getByRole("alert")).toBeInTheDocument();
                expect(screen.getByText(/Database connection failed/i)).toBeInTheDocument();
            });
            // Form inputs should remain preserved
            expect(screen.getByLabelText(/Category/i).value).toBe("2");
            expect(screen.getByLabelText(/Related System/i).value).toBe("7");
            expect(screen.getByLabelText(/Ticket Summary/i).value).toBe("Laptop screen flickering intermittently");
            expect(screen.getByLabelText(/Problem Description/i).value).toBe("The screen flickers whenever brightness is adjusted above 50%.");
        });
    });
    // TICK-UI-03: submit button enters busy state
    describe("TICK-UI-03: Submit button enters busy state", () => {
        it("disables submit button and displays busy spinner during in-flight request", async () => {
            let resolvePromise;
            const pendingPromise = new Promise((resolve) => {
                resolvePromise = resolve;
            });
            vi.spyOn(api, "createTicket").mockReturnValue(pendingPromise);
            renderComponent();
            await waitFor(() => {
                expect(screen.getByLabelText(/Category/i)).toBeInTheDocument();
            });
            // Fill valid values
            fireEvent.change(screen.getByLabelText(/Category/i), { target: { value: "2" } });
            fireEvent.change(screen.getByLabelText(/Related System/i), { target: { value: "7" } });
            fireEvent.change(screen.getByLabelText(/Ticket Summary/i), {
                target: { value: "Valid Summary for Testing" },
            });
            fireEvent.change(screen.getByLabelText(/Problem Description/i), {
                target: { value: "Valid Problem Description with sufficient characters." },
            });
            const submitBtn = screen.getByRole("button", { name: /Submit Ticket/i });
            fireEvent.click(submitBtn);
            // Verify busy state
            await waitFor(() => {
                expect(submitBtn).toBeDisabled();
                expect(screen.getByText(/Submitting.../i)).toBeInTheDocument();
            });
            // Resolve API call
            resolvePromise({
                id: 101,
                ticketNumber: "TICK-20260906-0001",
                currentStatus: "NEW",
            });
            await waitFor(() => {
                expect(screen.getByText("TICK-20260906-0001")).toBeInTheDocument();
            });
        });
    });
    // TICK-UI-04: submission success confirmation
    describe("TICK-UI-04: Submission success confirmation", () => {
        it("displays generated ticket number and stub link to ticket details on success", async () => {
            vi.spyOn(api, "createTicket").mockResolvedValue({
                id: 101,
                ticketNumber: "TICK-20260906-0001",
                requesterId: 1,
                categoryId: 2,
                relatedSystemId: 7,
                summary: "Laptop issue",
                description: "Laptop issue description here",
                requestedPriority: "MEDIUM",
                currentStatus: "NEW",
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            });
            renderComponent();
            await waitFor(() => {
                expect(screen.getByLabelText(/Category/i)).toBeInTheDocument();
            });
            fireEvent.change(screen.getByLabelText(/Category/i), { target: { value: "2" } });
            fireEvent.change(screen.getByLabelText(/Related System/i), { target: { value: "7" } });
            fireEvent.change(screen.getByLabelText(/Ticket Summary/i), {
                target: { value: "Valid Summary for Testing" },
            });
            fireEvent.change(screen.getByLabelText(/Problem Description/i), {
                target: { value: "Valid Problem Description with sufficient characters." },
            });
            fireEvent.click(screen.getByRole("button", { name: /Submit Ticket/i }));
            // Success screen displayed
            await waitFor(() => {
                expect(screen.getByText("TICK-20260906-0001")).toBeInTheDocument();
                expect(screen.getByText(/Ticket Created Successfully/i)).toBeInTheDocument();
                expect(screen.getByRole("link", { name: /View Ticket Details/i })).toHaveAttribute("href", "/tickets/101");
            });
        });
    });
    // ATT-UI-03: client-side immediate file validation error
    describe("ATT-UI-03: Client-side immediate file validation error", () => {
        it("displays immediate inline error when selecting a file > 5MB", async () => {
            renderComponent();
            await waitFor(() => {
                expect(screen.getByLabelText(/Attachments/i)).toBeInTheDocument();
            });
            const fileInput = screen.getByLabelText(/Attachments/i);
            // Create a 6MB dummy file
            const bigFile = new File(["a".repeat(6 * 1024 * 1024)], "huge.png", {
                type: "image/png",
            });
            await userEvent.upload(fileInput, bigFile);
            await waitFor(() => {
                expect(screen.getByText(/File exceeds 5 MB limit/i)).toBeInTheDocument();
            });
        });
        it("displays immediate inline error when selecting an invalid MIME type", async () => {
            renderComponent();
            await waitFor(() => {
                expect(screen.getByLabelText(/Attachments/i)).toBeInTheDocument();
            });
            const fileInput = screen.getByLabelText(/Attachments/i);
            const invalidFile = new File(["binary content"], "script.exe", {
                type: "application/x-msdownload",
            });
            await userEvent.upload(fileInput, invalidFile);
            await waitFor(() => {
                expect(screen.getByText(/Unsupported file type/i)).toBeInTheDocument();
            });
        });
    });
    // A11Y-UI-01: Keyboard focus rings
    describe("A11Y-UI-01: Keyboard accessibility", () => {
        it("renders required fields with proper labels and accessible identifiers", async () => {
            renderComponent();
            await waitFor(() => {
                expect(screen.getByLabelText(/Category \*/i)).toBeInTheDocument();
                expect(screen.getByLabelText(/Related System \*/i)).toBeInTheDocument();
                expect(screen.getByLabelText(/Ticket Summary \*/i)).toBeInTheDocument();
                expect(screen.getByLabelText(/Problem Description \*/i)).toBeInTheDocument();
            });
        });
    });
});
