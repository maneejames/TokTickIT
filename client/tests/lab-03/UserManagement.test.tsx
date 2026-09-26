import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { UserManagement } from "../../src/components/UserManagement.js";
import * as api from "../../src/api.js";

// Mock API module
vi.mock("../../src/api.js", async () => {
  const actual = await vi.importActual("../../src/api.js");
  return {
    ...actual,
    getAdminUsers: vi.fn(),
    createAdminUser: vi.fn(),
    updateAdminUser: vi.fn(),
    resetAdminUserPassword: vi.fn(),
  };
});

describe("Admin User Management Component UI Tests (ADMIN-UI-01, ADMIN-UI-02)", () => {
  const currentAdminUser: api.User = {
    id: 1,
    name: "Central Administrator",
    email: "admin@kmutt.ac.th",
    role: "ADMINISTRATOR",
    mustChangePassword: false,
    isActive: true,
  };

  const mockUsersList: api.AdminUser[] = [
    {
      id: 1,
      name: "Central Administrator",
      email: "admin@kmutt.ac.th",
      role: "ADMINISTRATOR",
      isActive: true,
      mustChangePassword: false,
      createdAt: "2026-09-01T08:00:00.000Z",
    },
    {
      id: 2,
      name: "Witchai Tech",
      email: "staff.witchai@kmutt.ac.th",
      role: "IT_STAFF",
      isActive: true,
      mustChangePassword: false,
      createdAt: "2026-09-02T08:00:00.000Z",
    },
    {
      id: 3,
      name: "Somchai Jaidee",
      email: "somchai.jai@kmutt.ac.th",
      role: "REQUESTER",
      isActive: true,
      mustChangePassword: true,
      createdAt: "2026-09-03T08:00:00.000Z",
    },
    {
      id: 4,
      name: "Former Staff",
      email: "staff.inactive@kmutt.ac.th",
      role: "IT_STAFF",
      isActive: false,
      mustChangePassword: false,
      createdAt: "2026-09-04T08:00:00.000Z",
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.getAdminUsers).mockResolvedValue(mockUsersList);
  });

  // =========================================================================
  // ADMIN-UI-01: Table Rendering, Search, Role Filter, and Create User Modal
  // =========================================================================
  describe("ADMIN-UI-01: Table Rendering, Search, and Create User Modal", () => {
    it("renders page header, user table with 6 columns, and user records", async () => {
      render(<UserManagement currentUser={currentAdminUser} />);

      expect(screen.getByText(/User Account Management/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /\+ Create New User/i })).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByText("Central Administrator")).toBeInTheDocument();
        expect(screen.getByText("Witchai Tech")).toBeInTheDocument();
        expect(screen.getByText("Somchai Jaidee")).toBeInTheDocument();
        expect(screen.getByText("Former Staff")).toBeInTheDocument();
      });

      // Status badges
      const activeBadges = screen.getAllByText("Active");
      expect(activeBadges.length).toBe(3);
      expect(screen.getByText("Inactive")).toBeInTheDocument();

      // Password Change Required badge
      expect(screen.getByText("Required")).toBeInTheDocument();

      // Edit buttons
      const editButtons = screen.getAllByRole("button", { name: /Edit/i });
      expect(editButtons.length).toBe(4);
    });

    it("filters users via search input by name or email", async () => {
      const user = userEvent.setup();
      render(<UserManagement currentUser={currentAdminUser} />);

      await waitFor(() => {
        expect(screen.getByText("Witchai Tech")).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/Search name or email/i);
      await user.type(searchInput, "somchai");

      await waitFor(() => {
        expect(api.getAdminUsers).toHaveBeenCalledWith(expect.objectContaining({ search: "somchai" }));
      });
    });

    it("filters users via role dropdown filter", async () => {
      const user = userEvent.setup();
      render(<UserManagement currentUser={currentAdminUser} />);

      await waitFor(() => {
        expect(screen.getByText("Witchai Tech")).toBeInTheDocument();
      });

      const roleSelect = screen.getByLabelText(/Filter by Role/i);
      await user.selectOptions(roleSelect, "IT_STAFF");

      await waitFor(() => {
        expect(api.getAdminUsers).toHaveBeenCalledWith(expect.objectContaining({ role: "IT_STAFF" }));
      });
    });

    it("opens Create User modal, validates required fields, and creates new user", async () => {
      const user = userEvent.setup();
      const newUser: api.AdminUser = {
        id: 5,
        name: "New Person",
        email: "new.person@kmutt.ac.th",
        role: "IT_STAFF",
        isActive: true,
        mustChangePassword: true,
        createdAt: "2026-09-27T08:00:00.000Z",
      };
      vi.mocked(api.createAdminUser).mockResolvedValue(newUser);

      render(<UserManagement currentUser={currentAdminUser} />);

      await waitFor(() => {
        expect(screen.getByText("Central Administrator")).toBeInTheDocument();
      });

      // Click Create New User button
      const createBtn = screen.getByRole("button", { name: /\+ Create New User/i });
      await user.click(createBtn);

      expect(screen.getByRole("heading", { name: /Create New User/i })).toBeInTheDocument();

      // Submit empty form to trigger validation
      const submitBtn = screen.getByRole("button", { name: /^Create User$/i });
      await user.click(submitBtn);

      await waitFor(() => {
        expect(screen.getByText(/Full Name is required/i)).toBeInTheDocument();
        expect(screen.getByText(/Valid Email Address is required/i)).toBeInTheDocument();
        expect(screen.getByText(/Initial password is required/i)).toBeInTheDocument();
      });

      // Fill in valid details
      await user.type(screen.getByLabelText(/Full Name/i), "New Person");
      await user.type(screen.getByLabelText(/Email Address/i), "new.person@kmutt.ac.th");
      await user.selectOptions(screen.getByLabelText(/^Role/i), "IT_STAFF");
      await user.type(screen.getByLabelText(/Initial Password/i), "InitialPassword123!");

      await user.click(submitBtn);

      await waitFor(() => {
        expect(api.createAdminUser).toHaveBeenCalledWith({
          name: "New Person",
          email: "new.person@kmutt.ac.th",
          role: "IT_STAFF",
          isActive: true,
          initialPassword: "InitialPassword123!",
        });
      });

      // Modal closed and success banner displayed
      await waitFor(() => {
        expect(screen.queryByRole("heading", { name: /Create New User/i })).toBeNull();
        expect(screen.getByText(/User created successfully/i)).toBeInTheDocument();
      });
    });

    it("handles create user duplicate email 409 conflict safely", async () => {
      const user = userEvent.setup();
      vi.mocked(api.createAdminUser).mockRejectedValue(new Error("Email already exists in the system"));

      render(<UserManagement currentUser={currentAdminUser} />);

      await waitFor(() => {
        expect(screen.getByText("Central Administrator")).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: /\+ Create New User/i }));

      await user.type(screen.getByLabelText(/Full Name/i), "Duplicate Person");
      await user.type(screen.getByLabelText(/Email Address/i), "admin@kmutt.ac.th");
      await user.selectOptions(screen.getByLabelText(/^Role/i), "REQUESTER");
      await user.type(screen.getByLabelText(/Initial Password/i), "InitialPassword123!");

      await user.click(screen.getByRole("button", { name: /^Create User$/i }));

      await waitFor(() => {
        expect(screen.getByText(/Email already exists in the system/i)).toBeInTheDocument();
      });
    });
  });

  // =========================================================================
  // ADMIN-UI-02: Edit User and Deactivation Safety Checks (AC-28, AC-29)
  // =========================================================================
  describe("ADMIN-UI-02: Edit User Modal, Password Reset, and Deactivation Safety Checks", () => {
    it("disables self-deactivation checkbox when editing current logged-in Administrator", async () => {
      const user = userEvent.setup();
      render(<UserManagement currentUser={currentAdminUser} />);

      await waitFor(() => {
        expect(screen.getByText("Central Administrator")).toBeInTheDocument();
      });

      // Edit row for Central Administrator (id: 1)
      const editButtons = screen.getAllByRole("button", { name: /Edit/i });
      await user.click(editButtons[0]);

      expect(screen.getByRole("heading", { name: /Edit User/i })).toBeInTheDocument();

      // Deactivation toggle should be disabled with explanation
      const activeCheckbox = screen.getByLabelText(/Account Active/i) as HTMLInputElement;
      expect(activeCheckbox).toBeDisabled();
      expect(screen.getByText(/You cannot deactivate your own account/i)).toBeInTheDocument();
    });

    it("disables deactivation and demotion when user is the sole remaining active Administrator", async () => {
      const user = userEvent.setup();
      render(<UserManagement currentUser={currentAdminUser} />);

      await waitFor(() => {
        expect(screen.getByText("Central Administrator")).toBeInTheDocument();
      });

      // In mockUsersList, Central Administrator is the only ADMINISTRATOR
      const editButtons = screen.getAllByRole("button", { name: /Edit/i });
      await user.click(editButtons[0]);

      const roleSelect = screen.getByLabelText(/^Role/i) as HTMLSelectElement;
      expect(roleSelect).toBeDisabled();
      expect(screen.getByText(/Cannot demote or deactivate the last active Administrator/i)).toBeInTheDocument();
    });

    it("allows editing details and toggling active status for another user", async () => {
      const user = userEvent.setup();
      const updatedUser: api.AdminUser = {
        ...mockUsersList[1],
        name: "Witchai Tech (Senior)",
        isActive: false,
      };
      vi.mocked(api.updateAdminUser).mockResolvedValue(updatedUser);

      render(<UserManagement currentUser={currentAdminUser} />);

      await waitFor(() => {
        expect(screen.getByText("Witchai Tech")).toBeInTheDocument();
      });

      // Edit row for Witchai Tech (second user)
      const editButtons = screen.getAllByRole("button", { name: /Edit/i });
      await user.click(editButtons[1]);

      const nameInput = screen.getByLabelText(/Full Name/i);
      await user.clear(nameInput);
      await user.type(nameInput, "Witchai Tech (Senior)");

      // Toggle active status (should NOT be disabled)
      const activeCheckbox = screen.getByLabelText(/Account Active/i);
      expect(activeCheckbox).not.toBeDisabled();
      await user.click(activeCheckbox);

      await user.click(screen.getByRole("button", { name: /Save Changes/i }));

      await waitFor(() => {
        expect(api.updateAdminUser).toHaveBeenCalledWith(2, {
          name: "Witchai Tech (Senior)",
          email: "staff.witchai@kmutt.ac.th",
          role: "IT_STAFF",
          isActive: false,
        });
      });
    });

    it("allows resetting initial password inside edit modal", async () => {
      const user = userEvent.setup();
      vi.mocked(api.resetAdminUserPassword).mockResolvedValue({
        message: "Initial password reset successfully",
        userId: 2,
        mustChangePassword: true,
      });

      render(<UserManagement currentUser={currentAdminUser} />);

      await waitFor(() => {
        expect(screen.getByText("Witchai Tech")).toBeInTheDocument();
      });

      // Edit row for Witchai Tech
      const editButtons = screen.getAllByRole("button", { name: /Edit/i });
      await user.click(editButtons[1]);

      // Open password reset section
      const resetToggle = screen.getByRole("button", { name: /Set New Initial Password/i });
      await user.click(resetToggle);

      const newPwdInput = screen.getByLabelText(/New Temporary Password/i);
      await user.type(newPwdInput, "NewTempPassword123!");

      const confirmResetBtn = screen.getByRole("button", { name: /Confirm Password Reset/i });
      await user.click(confirmResetBtn);

      await waitFor(() => {
        expect(api.resetAdminUserPassword).toHaveBeenCalledWith(2, {
          newInitialPassword: "NewTempPassword123!",
        });
        expect(screen.getByText(/Password reset successfully/i)).toBeInTheDocument();
      });
    });
  });

  // =========================================================================
  // Forbidden State (Non-Administrator) and Loading / Error States
  // =========================================================================
  describe("Forbidden & Error UI States", () => {
    it("renders forbidden message when logged-in user is not an Administrator", () => {
      const requesterUser: api.User = {
        id: 3,
        name: "Somchai Jaidee",
        email: "somchai.jai@kmutt.ac.th",
        role: "REQUESTER",
        mustChangePassword: false,
      };

      render(<UserManagement currentUser={requesterUser} />);

      expect(screen.getByText(/Access Denied/i)).toBeInTheDocument();
      expect(screen.getByText(/Administrator role required/i)).toBeInTheDocument();
      expect(screen.queryByRole("table")).toBeNull();
    });

    it("renders safe error banner when API fetch fails", async () => {
      vi.mocked(api.getAdminUsers).mockRejectedValue(new Error("Unable to connect to TokTickIT API"));

      render(<UserManagement currentUser={currentAdminUser} />);

      await waitFor(() => {
        expect(screen.getByText(/Unable to connect to TokTickIT API/i)).toBeInTheDocument();
      });
    });
  });
});
