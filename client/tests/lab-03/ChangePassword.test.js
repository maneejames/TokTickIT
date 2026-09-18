import { jsx as _jsx } from "react/jsx-runtime";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ChangePassword } from "../../src/components/ChangePassword.js";
import * as api from "../../src/api.js";
describe("Change Password Component UI Tests", () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });
    // Validation errors: missing fields, mismatch, complexity hints
    it("AUTH-UI-03: displays validation errors for missing fields or password mismatch", async () => {
        render(_jsx(ChangePassword, { onSuccess: vi.fn(), onLogout: vi.fn() }));
        const updateBtn = screen.getByRole("button", { name: /update password/i });
        fireEvent.click(updateBtn);
        await waitFor(() => {
            expect(screen.getByText(/current password is required/i)).toBeInTheDocument();
            expect(screen.getByText(/new password is required/i)).toBeInTheDocument();
        });
        const currInput = screen.getByLabelText(/^current password/i);
        const newInput = screen.getByLabelText(/^new password/i);
        const confInput = screen.getByLabelText(/^confirm new password/i);
        fireEvent.change(currInput, { target: { value: "Password123!" } });
        fireEvent.change(newInput, { target: { value: "NewSecure456!" } });
        fireEvent.change(confInput, { target: { value: "Different456!" } });
        fireEvent.click(updateBtn);
        await waitFor(() => {
            expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
        });
    });
    // Busy state
    it("AUTH-UI-03: enters busy state during password update submission", async () => {
        let resolveChange;
        const changePromise = new Promise((resolve) => {
            resolveChange = resolve;
        });
        vi.spyOn(api, "changePassword").mockReturnValue(changePromise);
        render(_jsx(ChangePassword, { onSuccess: vi.fn(), onLogout: vi.fn() }));
        fireEvent.change(screen.getByLabelText(/^current password/i), {
            target: { value: "Password123!" },
        });
        fireEvent.change(screen.getByLabelText(/^new password/i), {
            target: { value: "NewSecurePassword456!" },
        });
        fireEvent.change(screen.getByLabelText(/^confirm new password/i), {
            target: { value: "NewSecurePassword456!" },
        });
        const updateBtn = screen.getByRole("button", { name: /update password/i });
        fireEvent.click(updateBtn);
        await waitFor(() => {
            expect(screen.getByRole("button", { name: /updating password/i })).toBeDisabled();
        });
        resolveChange({ message: "Password changed successfully" });
    });
    // Server error display
    it("AUTH-UI-03: displays server error banner when API returns error", async () => {
        vi.spyOn(api, "changePassword").mockRejectedValue(new Error("Password must be at least 8 characters long, contain uppercase, lowercase, number, and special character"));
        render(_jsx(ChangePassword, { onSuccess: vi.fn(), onLogout: vi.fn() }));
        fireEvent.change(screen.getByLabelText(/^current password/i), {
            target: { value: "Password123!" },
        });
        fireEvent.change(screen.getByLabelText(/^new password/i), {
            target: { value: "weak" },
        });
        fireEvent.change(screen.getByLabelText(/^confirm new password/i), {
            target: { value: "weak" },
        });
        const updateBtn = screen.getByRole("button", { name: /update password/i });
        fireEvent.click(updateBtn);
        await waitFor(() => {
            expect(screen.getByText(/at least 8 characters/i)).toBeInTheDocument();
        });
    });
    // Successful submission calls onSuccess
    it("AUTH-UI-03: calls onSuccess when password is changed successfully", async () => {
        vi.spyOn(api, "changePassword").mockResolvedValue({
            message: "Password changed successfully",
        });
        const handleSuccess = vi.fn();
        render(_jsx(ChangePassword, { onSuccess: handleSuccess, onLogout: vi.fn() }));
        fireEvent.change(screen.getByLabelText(/^current password/i), {
            target: { value: "Password123!" },
        });
        fireEvent.change(screen.getByLabelText(/^new password/i), {
            target: { value: "NewSecurePassword456!" },
        });
        fireEvent.change(screen.getByLabelText(/^confirm new password/i), {
            target: { value: "NewSecurePassword456!" },
        });
        const updateBtn = screen.getByRole("button", { name: /update password/i });
        fireEvent.click(updateBtn);
        await waitFor(() => {
            expect(handleSuccess).toHaveBeenCalled();
        });
    });
    // Logout abort action
    it("AUTH-UI-03: provides a logout action to abort mandatory password change", async () => {
        const handleLogout = vi.fn();
        render(_jsx(ChangePassword, { onSuccess: vi.fn(), onLogout: handleLogout }));
        const logoutBtn = screen.getByRole("button", { name: /logout/i });
        fireEvent.click(logoutBtn);
        expect(handleLogout).toHaveBeenCalled();
    });
});
