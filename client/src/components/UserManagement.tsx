import React, { useState, useEffect, useCallback } from "react";
import {
  User,
  AdminUser,
  UserRole,
  getAdminUsers,
  createAdminUser,
  updateAdminUser,
  resetAdminUserPassword,
} from "../api.js";

interface UserManagementProps {
  currentUser: User;
}

export const UserManagement: React.FC<UserManagementProps> = ({ currentUser }) => {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [apiError, setApiError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Search & filter
  const [search, setSearch] = useState<string>("");
  const [debouncedSearch, setDebouncedSearch] = useState<string>("");
  const [roleFilter, setRoleFilter] = useState<string>("ALL");

  // Create modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: "",
    email: "",
    role: "REQUESTER" as UserRole,
    isActive: true,
    initialPassword: "",
  });
  const [createErrors, setCreateErrors] = useState<Record<string, string>>({});
  const [createApiError, setCreateApiError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Edit modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    role: "REQUESTER" as UserRole,
    isActive: true,
  });
  const [editApiError, setEditApiError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Password reset inside edit modal
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [resetPassword, setResetPassword] = useState("");
  const [resetPasswordMsg, setResetPasswordMsg] = useState<string | null>(null);
  const [resetPasswordError, setResetPasswordError] = useState<string | null>(null);
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch users
  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    setApiError(null);
    try {
      const result = await getAdminUsers({
        search: debouncedSearch || undefined,
        role: roleFilter !== "ALL" ? roleFilter : undefined,
      });
      setUsers(result);
    } catch (err) {
      setApiError(err instanceof Error ? err.message : "Failed to load users");
    } finally {
      setIsLoading(false);
    }
  }, [debouncedSearch, roleFilter]);

  useEffect(() => {
    if (currentUser.role !== "ADMINISTRATOR") return;
    fetchUsers();
  }, [fetchUsers, currentUser.role]);

  // Forbidden guard
  if (currentUser.role !== "ADMINISTRATOR") {
    return (
      <div className="container py-5">
        <div className="zen-card p-5 text-center mx-auto" style={{ maxWidth: "600px" }}>
          <div style={{ fontSize: "48px" }}>🔒</div>
          <h2 className="h4 fw-bold mt-3" style={{ color: "var(--color-error)" }}>
            Access Denied
          </h2>
          <p className="text-muted mt-2">Administrator role required to manage user accounts.</p>
        </div>
      </div>
    );
  }

  // Helpers
  const activeAdminCount = users.filter(
    (u) => u.role === "ADMINISTRATOR" && u.isActive
  ).length;

  const isSoleActiveAdmin = (userId: number) => {
    const u = users.find((x) => x.id === userId);
    if (!u) return false;
    return u.role === "ADMINISTRATOR" && u.isActive && activeAdminCount <= 1;
  };

  const isSelf = (userId: number) => currentUser.id === userId;

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

  const roleBadge = (role: UserRole) => {
    const colors: Record<string, { bg: string; text: string; border: string }> = {
      REQUESTER: { bg: "#EFF6FF", text: "#1E40AF", border: "#BFDBFE" },
      IT_STAFF: { bg: "#F0FDF4", text: "#166534", border: "#86EFAC" },
      ADMINISTRATOR: { bg: "#FDF2F8", text: "#9D174D", border: "#FBCFE8" },
    };
    const c = colors[role] || colors.REQUESTER;
    const label = role === "IT_STAFF" ? "IT Staff" : role === "ADMINISTRATOR" ? "Administrator" : "Requester";
    return (
      <span
        style={{
          backgroundColor: c.bg,
          color: c.text,
          border: `1px solid ${c.border}`,
          borderRadius: "12px",
          padding: "2px 10px",
          fontSize: "12px",
          fontWeight: 600,
        }}
      >
        {label}
      </span>
    );
  };

  // --- Create User ---
  const openCreateModal = () => {
    setCreateForm({ name: "", email: "", role: "REQUESTER", isActive: true, initialPassword: "" });
    setCreateErrors({});
    setCreateApiError(null);
    setShowCreateModal(true);
  };

  const validateCreateForm = () => {
    const errs: Record<string, string> = {};
    if (!createForm.name.trim()) errs.name = "Full Name is required";
    if (!createForm.email.trim() || !createForm.email.includes("@")) errs.email = "Valid Email Address is required";
    if (!createForm.initialPassword) errs.initialPassword = "Initial password is required";
    setCreateErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleCreateUser = async () => {
    if (!validateCreateForm()) return;
    setIsCreating(true);
    setCreateApiError(null);
    try {
      await createAdminUser({
        name: createForm.name.trim(),
        email: createForm.email.trim(),
        role: createForm.role,
        isActive: createForm.isActive,
        initialPassword: createForm.initialPassword,
      });
      setShowCreateModal(false);
      setSuccessMessage("User created successfully");
      fetchUsers();
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err) {
      setCreateApiError(err instanceof Error ? err.message : "Failed to create user");
    } finally {
      setIsCreating(false);
    }
  };

  // --- Edit User ---
  const openEditModal = (u: AdminUser) => {
    setEditingUser(u);
    setEditForm({ name: u.name, email: u.email, role: u.role, isActive: u.isActive });
    setEditApiError(null);
    setShowResetPassword(false);
    setResetPassword("");
    setResetPasswordMsg(null);
    setResetPasswordError(null);
    setShowEditModal(true);
  };

  const handleSaveChanges = async () => {
    if (!editingUser) return;
    setIsEditing(true);
    setEditApiError(null);
    try {
      await updateAdminUser(editingUser.id, {
        name: editForm.name.trim(),
        email: editForm.email.trim(),
        role: editForm.role,
        isActive: editForm.isActive,
      });
      setShowEditModal(false);
      setSuccessMessage("User updated successfully");
      fetchUsers();
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err) {
      setEditApiError(err instanceof Error ? err.message : "Failed to update user");
    } finally {
      setIsEditing(false);
    }
  };

  const handleResetPassword = async () => {
    if (!editingUser || !resetPassword) return;
    setIsResettingPassword(true);
    setResetPasswordError(null);
    setResetPasswordMsg(null);
    try {
      await resetAdminUserPassword(editingUser.id, { newInitialPassword: resetPassword });
      setResetPasswordMsg("Password reset successfully. Forces user to change password at next login.");
      setResetPassword("");
      fetchUsers();
    } catch (err) {
      setResetPasswordError(err instanceof Error ? err.message : "Failed to reset password");
    } finally {
      setIsResettingPassword(false);
    }
  };

  // Determine edit modal constraints
  const editIsSelf = editingUser ? isSelf(editingUser.id) : false;
  const editIsSoleAdmin = editingUser ? isSoleActiveAdmin(editingUser.id) : false;
  const deactivateDisabled = editIsSelf || editIsSoleAdmin;
  const roleDisabled = editIsSoleAdmin;

  const deactivateHints: string[] = [];
  if (editIsSelf) deactivateHints.push("You cannot deactivate your own account");
  if (editIsSoleAdmin) deactivateHints.push("Cannot demote or deactivate the last active Administrator");

  return (
    <div className="container py-4" style={{ maxWidth: "1280px" }}>
      {/* Header */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
        <h1 className="h3 mb-0" style={{ color: "var(--color-primary-green)", fontWeight: 700 }}>
          User Account Management
        </h1>
        <button type="button" className="zen-btn-primary" onClick={openCreateModal}>
          + Create New User
        </button>
      </div>

      {/* Success Banner */}
      {successMessage && (
        <div
          className="alert mb-4"
          style={{ backgroundColor: "var(--color-pale-green)", border: "1px solid var(--color-secondary-green)", color: "var(--color-primary-green)" }}
          role="status"
        >
          ✅ {successMessage}
        </div>
      )}

      {/* Error Banner */}
      {apiError && (
        <div
          className="alert mb-4"
          style={{ backgroundColor: "var(--color-error-bg)", border: "1px solid var(--color-error)", color: "var(--color-error)" }}
          role="alert"
        >
          ⚠️ {apiError}
        </div>
      )}

      {/* Search & Filter Bar */}
      <div
        className="zen-card p-3 mb-4"
        style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)" }}
      >
        <div className="row g-3 align-items-end">
          <div className="col-12 col-md-6">
            <label htmlFor="user-search" className="form-label mb-1" style={{ fontSize: "13px", fontWeight: 600, color: "var(--color-text-main)" }}>
              Search
            </label>
            <input
              id="user-search"
              type="text"
              className="zen-input"
              placeholder="Search name or email"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ minHeight: "38px" }}
            />
          </div>
          <div className="col-12 col-md-4">
            <label htmlFor="user-role-filter" className="form-label mb-1" style={{ fontSize: "13px", fontWeight: 600, color: "var(--color-text-main)" }}>
              Filter by Role
            </label>
            <select
              id="user-role-filter"
              aria-label="Filter by Role"
              className="zen-select"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              style={{ minHeight: "38px" }}
            >
              <option value="ALL">All Roles</option>
              <option value="REQUESTER">Requester</option>
              <option value="IT_STAFF">IT Staff</option>
              <option value="ADMINISTRATOR">Administrator</option>
            </select>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="zen-card p-5 text-center my-4">
          <div className="spinner-border text-success mb-3" role="status">
            <span className="visually-hidden">Loading users...</span>
          </div>
          <p className="text-muted mb-0">Loading user accounts...</p>
        </div>
      )}

      {/* Users Table */}
      {!isLoading && !apiError && (
        <div className="zen-card mb-4" style={{ overflow: "hidden" }}>
          <div className="table-responsive" style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
            <table className="table table-hover align-middle mb-0" style={{ borderCollapse: "collapse", minWidth: "680px" }}>
              <thead style={{ backgroundColor: "#F9FAF9", borderBottom: "2px solid var(--color-border)" }}>
                <tr>
                  <th style={{ padding: "12px 16px" }}>Name</th>
                  <th style={{ padding: "12px 16px" }}>Email</th>
                  <th style={{ padding: "12px 16px" }}>Role</th>
                  <th style={{ padding: "12px 16px" }}>Status</th>
                  <th style={{ padding: "12px 16px" }}>Password Change</th>
                  <th style={{ padding: "12px 16px", textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-4 text-muted">
                      No users match your search criteria.
                    </td>
                  </tr>
                ) : (
                  users.map((u) => (
                    <tr key={u.id}>
                      <td style={{ padding: "12px 16px", fontWeight: 600, color: "var(--color-text-main)" }}>{u.name}</td>
                      <td style={{ padding: "12px 16px", color: "#4B5563", fontSize: "14px" }}>{u.email}</td>
                      <td style={{ padding: "12px 16px" }}>{roleBadge(u.role)}</td>
                      <td style={{ padding: "12px 16px" }}>
                        {u.isActive ? (
                          <span style={{ backgroundColor: "#DCFCE7", color: "#166534", border: "1px solid #86EFAC", borderRadius: "12px", padding: "2px 10px", fontSize: "12px", fontWeight: 600 }}>
                            Active
                          </span>
                        ) : (
                          <span style={{ backgroundColor: "#F3F4F6", color: "#6B7280", border: "1px solid #E5E7EB", borderRadius: "12px", padding: "2px 10px", fontSize: "12px", fontWeight: 600 }}>
                            Inactive
                          </span>
                        )}
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        {u.mustChangePassword ? (
                          <span style={{ backgroundColor: "#FEF3C7", color: "#92400E", border: "1px solid #FDE68A", borderRadius: "12px", padding: "2px 10px", fontSize: "12px", fontWeight: 600 }}>
                            Required
                          </span>
                        ) : (
                          <span className="text-muted" style={{ fontSize: "12px" }}>—</span>
                        )}
                      </td>
                      <td style={{ padding: "12px 16px", textAlign: "right" }}>
                        <button
                          type="button"
                          className="zen-btn-secondary py-1 px-3"
                          style={{ fontSize: "12px" }}
                          onClick={() => openEditModal(u)}
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ======================= CREATE MODAL ======================= */}
      {showCreateModal && (
        <div className="modal d-block" tabIndex={-1} style={{ backgroundColor: "rgba(0,0,0,0.5)" }} onClick={() => setShowCreateModal(false)}>
          <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: "520px" }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-content zen-card p-4">
              <h3 className="h5 fw-bold mb-4" style={{ color: "var(--color-primary-green)" }}>Create New User</h3>

              {createApiError && (
                <div className="alert mb-3" style={{ backgroundColor: "var(--color-error-bg)", border: "1px solid var(--color-error)", color: "var(--color-error)" }} role="alert">
                  {createApiError}
                </div>
              )}

              <div className="mb-3">
                <label htmlFor="create-name" className="form-label mb-1" style={{ fontWeight: 600, fontSize: "14px" }}>Full Name</label>
                <input id="create-name" type="text" className="zen-input" aria-label="Full Name"
                  value={createForm.name} onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })} />
                {createErrors.name && <div className="text-danger small mt-1">{createErrors.name}</div>}
              </div>

              <div className="mb-3">
                <label htmlFor="create-email" className="form-label mb-1" style={{ fontWeight: 600, fontSize: "14px" }}>Email Address</label>
                <input id="create-email" type="email" className="zen-input" aria-label="Email Address"
                  value={createForm.email} onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })} />
                {createErrors.email && <div className="text-danger small mt-1">{createErrors.email}</div>}
              </div>

              <div className="mb-3">
                <label htmlFor="create-role" className="form-label mb-1" style={{ fontWeight: 600, fontSize: "14px" }}>Role</label>
                <select id="create-role" className="zen-select" aria-label="Role"
                  value={createForm.role} onChange={(e) => setCreateForm({ ...createForm, role: e.target.value as UserRole })}>
                  <option value="REQUESTER">Requester</option>
                  <option value="IT_STAFF">IT Staff</option>
                  <option value="ADMINISTRATOR">Administrator</option>
                </select>
              </div>

              <div className="mb-3">
                <label htmlFor="create-password" className="form-label mb-1" style={{ fontWeight: 600, fontSize: "14px" }}>Initial Password</label>
                <input id="create-password" type="password" className="zen-input" aria-label="Initial Password"
                  value={createForm.initialPassword} onChange={(e) => setCreateForm({ ...createForm, initialPassword: e.target.value })} />
                <small className="text-muted">Min 8 chars, uppercase, lowercase, number, special character.</small>
                {createErrors.initialPassword && <div className="text-danger small mt-1">{createErrors.initialPassword}</div>}
              </div>

              <div className="mb-4 form-check">
                <input id="create-active" type="checkbox" className="form-check-input"
                  checked={createForm.isActive} onChange={(e) => setCreateForm({ ...createForm, isActive: e.target.checked })} />
                <label htmlFor="create-active" className="form-check-label" style={{ fontWeight: 500 }}>Account Active</label>
              </div>

              <div className="d-flex gap-2 justify-content-end">
                <button type="button" className="zen-btn-secondary" onClick={() => setShowCreateModal(false)}>Cancel</button>
                <button type="button" className="zen-btn-primary" onClick={handleCreateUser} disabled={isCreating}>
                  {isCreating ? "Creating..." : "Create User"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================= EDIT MODAL ======================= */}
      {showEditModal && editingUser && (
        <div className="modal d-block" tabIndex={-1} style={{ backgroundColor: "rgba(0,0,0,0.5)" }} onClick={() => setShowEditModal(false)}>
          <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: "520px" }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-content zen-card p-4">
              <h3 className="h5 fw-bold mb-4" style={{ color: "var(--color-primary-green)" }}>Edit User</h3>

              {editApiError && (
                <div className="alert mb-3" style={{ backgroundColor: "var(--color-error-bg)", border: "1px solid var(--color-error)", color: "var(--color-error)" }} role="alert">
                  {editApiError}
                </div>
              )}

              <div className="mb-3">
                <label htmlFor="edit-name" className="form-label mb-1" style={{ fontWeight: 600, fontSize: "14px" }}>Full Name</label>
                <input id="edit-name" type="text" className="zen-input" aria-label="Full Name"
                  value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
              </div>

              <div className="mb-3">
                <label htmlFor="edit-email" className="form-label mb-1" style={{ fontWeight: 600, fontSize: "14px" }}>Email Address</label>
                <input id="edit-email" type="email" className="zen-input" aria-label="Email Address"
                  value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} />
              </div>

              <div className="mb-3">
                <label htmlFor="edit-role" className="form-label mb-1" style={{ fontWeight: 600, fontSize: "14px" }}>Role</label>
                <select id="edit-role" className="zen-select" aria-label="Role" disabled={roleDisabled}
                  value={editForm.role} onChange={(e) => setEditForm({ ...editForm, role: e.target.value as UserRole })}>
                  <option value="REQUESTER">Requester</option>
                  <option value="IT_STAFF">IT Staff</option>
                  <option value="ADMINISTRATOR">Administrator</option>
                </select>
              </div>

              <div className="mb-3 form-check">
                <input id="edit-active" type="checkbox" className="form-check-input" aria-label="Account Active"
                  checked={editForm.isActive} disabled={deactivateDisabled}
                  onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })} />
                <label htmlFor="edit-active" className="form-check-label" style={{ fontWeight: 500 }}>Account Active</label>
                {deactivateHints.map((hint, i) => (
                  <div key={i} className="text-warning small mt-1">⚠️ {hint}</div>
                ))}
              </div>

              {/* Reset Initial Password Panel */}
              <div className="mb-4 p-3 rounded-2" style={{ backgroundColor: "#FFFBEB", border: "1px solid #FDE68A" }}>
                {!showResetPassword ? (
                  <button type="button" className="zen-btn-secondary w-100" onClick={() => setShowResetPassword(true)}>
                    Set New Initial Password
                  </button>
                ) : (
                  <>
                    <label htmlFor="reset-pwd" className="form-label mb-1" style={{ fontWeight: 600, fontSize: "14px" }}>New Temporary Password</label>
                    <input id="reset-pwd" type="password" className="zen-input mb-2" aria-label="New Temporary Password"
                      value={resetPassword} onChange={(e) => setResetPassword(e.target.value)} />
                    <small className="text-muted d-block mb-2">Forces user to change password at next login.</small>
                    {resetPasswordError && <div className="text-danger small mb-2">{resetPasswordError}</div>}
                    {resetPasswordMsg && <div className="text-success small mb-2">✅ {resetPasswordMsg}</div>}
                    <button type="button" className="zen-btn-primary" style={{ fontSize: "13px" }}
                      onClick={handleResetPassword} disabled={isResettingPassword || !resetPassword}>
                      {isResettingPassword ? "Resetting..." : "Confirm Password Reset"}
                    </button>
                  </>
                )}
              </div>

              <div className="d-flex gap-2 justify-content-end">
                <button type="button" className="zen-btn-secondary" onClick={() => setShowEditModal(false)}>Cancel</button>
                <button type="button" className="zen-btn-primary" onClick={handleSaveChanges} disabled={isEditing}>
                  {isEditing ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
