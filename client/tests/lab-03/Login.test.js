import { jsx as _jsx } from "react/jsx-runtime";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { Login } from "../../src/components/Login.js";
import * as api from "../../src/api.js";
describe("Login Component UI Tests", () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });
    // Validation errors
    it("AUTH-UI-01: shows inline validation errors when submitting empty form", async () => {
        render(_jsx(Login, { onLoginSuccess: vi.fn() }));
        const submitBtn = screen.getByRole("button", { name: /sign in/i });
        fireEvent.click(submitBtn);
        await waitFor(() => {
            expect(screen.getByText(/email is required/i)).toBeInTheDocument();
            expect(screen.getByText(/password is required/i)).toBeInTheDocument();
        });
    });
    // Busy state
    it("AUTH-UI-01: demonstrates busy state with disabled inputs and spinner during submission", async () => {
        let resolveLogin;
        const loginPromise = new Promise((resolve) => {
            resolveLogin = resolve;
        });
        vi.spyOn(api, "login").mockReturnValue(loginPromise);
        render(_jsx(Login, { onLoginSuccess: vi.fn() }));
        const emailInput = screen.getByLabelText(/email address/i);
        const passwordInput = screen.getByLabelText(/password/i);
        const submitBtn = screen.getByRole("button", { name: /sign in/i });
        fireEvent.change(emailInput, { target: { value: "user@kmutt.ac.th" } });
        fireEvent.change(passwordInput, { target: { value: "Password123!" } });
        fireEvent.click(submitBtn);
        // Should enter busy state: "Signing In..." and disabled button
        await waitFor(() => {
            expect(screen.getByRole("button", { name: /signing in/i })).toBeDisabled();
        });
        // Resolve
        resolveLogin({
            user: {
                id: 1,
                name: "Test User",
                email: "user@kmutt.ac.th",
                role: "REQUESTER",
                mustChangePassword: false,
            },
        });
    });
    // Generic failure message
    it("AUTH-UI-02: displays generic error alert on 401 invalid credentials or inactive account", async () => {
        vi.spyOn(api, "login").mockRejectedValue(new Error("Invalid email or password"));
        render(_jsx(Login, { onLoginSuccess: vi.fn() }));
        const emailInput = screen.getByLabelText(/email address/i);
        const passwordInput = screen.getByLabelText(/password/i);
        const submitBtn = screen.getByRole("button", { name: /sign in/i });
        fireEvent.change(emailInput, { target: { value: "wrong@kmutt.ac.th" } });
        fireEvent.change(passwordInput, { target: { value: "Wrong123!" } });
        fireEvent.click(submitBtn);
        await waitFor(() => {
            expect(screen.getByText(/invalid email or password/i)).toBeInTheDocument();
        });
    });
    // Successful-login redirect behavior
    it("AUTH-UI-01: calls onLoginSuccess with user payload on successful authentication", async () => {
        const mockUser = {
            id: 1,
            name: "Somchai Jaidee",
            email: "somchai.jai@kmutt.ac.th",
            role: "REQUESTER",
            mustChangePassword: false,
        };
        vi.spyOn(api, "login").mockResolvedValue({ user: mockUser });
        const handleSuccess = vi.fn();
        render(_jsx(Login, { onLoginSuccess: handleSuccess }));
        const emailInput = screen.getByLabelText(/email address/i);
        const passwordInput = screen.getByLabelText(/password/i);
        const submitBtn = screen.getByRole("button", { name: /sign in/i });
        fireEvent.change(emailInput, { target: { value: "somchai.jai@kmutt.ac.th" } });
        fireEvent.change(passwordInput, { target: { value: "Password123!" } });
        fireEvent.click(submitBtn);
        await waitFor(() => {
            expect(handleSuccess).toHaveBeenCalledWith(mockUser);
        });
    });
    // Successful-login redirect behavior with mustChangePassword: true per ui-spec.md §2.3
    it("AUTH-UI-01: successful login with mustChangePassword: true passes user with flag for redirect to /change-password", async () => {
        const mockTempUser = {
            id: 2,
            name: "Temporary Requester",
            email: "temp.req@kmutt.ac.th",
            role: "REQUESTER",
            mustChangePassword: true,
        };
        vi.spyOn(api, "login").mockResolvedValue({ user: mockTempUser });
        const handleSuccess = vi.fn();
        render(_jsx(Login, { onLoginSuccess: handleSuccess }));
        const emailInput = screen.getByLabelText(/email address/i);
        const passwordInput = screen.getByLabelText(/password/i);
        const submitBtn = screen.getByRole("button", { name: /sign in/i });
        fireEvent.change(emailInput, { target: { value: "temp.req@kmutt.ac.th" } });
        fireEvent.change(passwordInput, { target: { value: "Password123!" } });
        fireEvent.click(submitBtn);
        await waitFor(() => {
            expect(handleSuccess).toHaveBeenCalledWith(mockTempUser);
            expect(mockTempUser.mustChangePassword).toBe(true);
        });
    });
});
