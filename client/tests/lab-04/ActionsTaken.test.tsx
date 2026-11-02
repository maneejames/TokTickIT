import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ActionsTaken } from "../../src/components/ActionsTaken.js";
import * as api from "../../src/api.js";

// Mock API module
vi.mock("../../src/api.js", async () => {
  const actual = await vi.importActual("../../src/api.js");
  return {
    ...actual,
    getTicketActions: vi.fn(),
    postTicketAction: vi.fn(),
    reassignTicketAction: vi.fn(),
    updateTicketActionStatus: vi.fn(),
    getStaffUsers: vi.fn(),
  };
});

describe("ActionsTaken Component UI Tests (ACT-UI-01 to ACT-UI-07)", () => {
  const currentUserStaff: api.User = {
    id: 2,
    name: "Witchai Tech",
    email: "staff.witchai@kmutt.ac.th",
    role: "IT_STAFF",
    mustChangePassword: false,
  };

  const currentUserRequester: api.User = {
    id: 1,
    name: "Somchai Requester",
    email: "somchai@kmutt.ac.th",
    role: "REQUESTER",
    mustChangePassword: false,
  };

  const otherStaffUser: api.User = {
    id: 3,
    name: "Kamon Support",
    email: "staff.kamon@kmutt.ac.th",
    role: "IT_STAFF",
    mustChangePassword: false,
  };

  const inactiveStaffUser: api.AdminUser = {
    id: 4,
    name: "Inactive Tech",
    email: "inactive@kmutt.ac.th",
    role: "IT_STAFF",
    isActive: false,
    mustChangePassword: false,
    createdAt: "2026-09-01T00:00:00.000Z",
  };

  const activeStaffUser: api.AdminUser = {
    id: 3,
    name: "Kamon Support",
    email: "staff.kamon@kmutt.ac.th",
    role: "IT_STAFF",
    isActive: true,
    mustChangePassword: false,
    createdAt: "2026-09-01T00:00:00.000Z",
  };

  const mockStaffUsers: api.AdminUser[] = [
    {
      id: 2,
      name: "Witchai Tech",
      email: "staff.witchai@kmutt.ac.th",
      role: "IT_STAFF",
      isActive: true,
      mustChangePassword: false,
      createdAt: "2026-09-01T00:00:00.000Z",
    },
    activeStaffUser,
    inactiveStaffUser,
  ];

  const sampleActionPlanned: api.ActionTaken = {
    id: 101,
    ticketId: 10,
    description: "Inspected power adapter and checked voltage output",
    performedById: 2,
    performedBy: {
      id: 2,
      username: "witchai",
      firstName: "Witchai",
      lastName: "Tech",
      role: "IT_STAFF",
    },
    actionDate: "2026-10-30T10:00:00.000Z",
    result: "Voltage is fluctuating below 12V rating",
    status: "PLANNED",
    completedAt: null,
    followUpRequired: true,
    followUpNote: "Order replacement adapter part #ADP-45",
    assignedToId: 3,
    assignedTo: {
      id: 3,
      username: "kamon",
      firstName: "Kamon",
      lastName: "Support",
      role: "IT_STAFF",
    },
    attachmentNotes: "See multimeter reading photo in attachments",
    clientRequestId: "req-uuid-001",
    version: 0,
    createdAt: "2026-10-30T10:00:00.000Z",
    updatedAt: "2026-10-30T10:00:00.000Z",
  };

  const sampleActionCompleted: api.ActionTaken = {
    id: 102,
    ticketId: 10,
    description: "Replaced faulty power adapter with newly delivered spare",
    performedById: 3,
    performedBy: {
      id: 3,
      username: "kamon",
      firstName: "Kamon",
      lastName: "Support",
      role: "IT_STAFF",
    },
    actionDate: "2026-10-30T14:30:00.000Z",
    result: "Laptop charges normally, steady 19V supply",
    status: "COMPLETED",
    completedAt: "2026-10-30T15:00:00.000Z",
    followUpRequired: false,
    followUpNote: null,
    assignedToId: 3,
    assignedTo: {
      id: 3,
      username: "kamon",
      firstName: "Kamon",
      lastName: "Support",
      role: "IT_STAFF",
    },
    attachmentNotes: null,
    clientRequestId: "req-uuid-002",
    version: 1,
    createdAt: "2026-10-30T14:30:00.000Z",
    updatedAt: "2026-10-30T15:00:00.000Z",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.getTicketActions).mockResolvedValue({ items: [sampleActionPlanned, sampleActionCompleted] });
    vi.mocked(api.getStaffUsers).mockResolvedValue(mockStaffUsers as unknown as api.User[]);
  });

  // ACT-UI-01: List renders columns, multiple actions in stable order; empty state
  it("ACT-UI-01: renders columns, multiple actions in stable chronological order, and handles empty state", async () => {
    const { rerender } = render(
      <ActionsTaken ticketId={10} currentUser={currentUserStaff} isStaffOrAdmin={true} />
    );

    // Verify title and counter
    expect(await screen.findByRole("heading", { name: /actions taken/i })).toBeInTheDocument();

    // Verify list columns/headers exist on desktop
    expect(screen.getByText(/performed by/i)).toBeInTheDocument();
    expect(screen.getByText(/assignee/i)).toBeInTheDocument();
    expect(screen.getByText(/result/i)).toBeInTheDocument();

    // Verify rendered actions
    expect(screen.getByText("Inspected power adapter and checked voltage output")).toBeInTheDocument();
    expect(screen.getByText("Replaced faulty power adapter with newly delivered spare")).toBeInTheDocument();

    // Verify status badges with text
    expect(screen.getByText("Planned")).toBeInTheDocument();
    expect(screen.getByText("Completed")).toBeInTheDocument();

    // Verify follow-up note is displayed when present
    expect(screen.getByText(/Order replacement adapter part #ADP-45/i)).toBeInTheDocument();

    // Empty state test
    vi.mocked(api.getTicketActions).mockResolvedValueOnce({ items: [] });
    rerender(<ActionsTaken ticketId={20} currentUser={currentUserStaff} isStaffOrAdmin={true} />);

    expect(await screen.findByText(/no actions have been recorded for this ticket yet/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /add action/i })).toBeInTheDocument();
  });

  // ACT-UI-02: Follow-up note appears and becomes required when toggle = Yes; inline error; focus to first invalid field
  it("ACT-UI-02: shows follow-up note only when required toggle is Yes, validates required fields, and focuses first error", async () => {
    const user = userEvent.setup();
    render(<ActionsTaken ticketId={10} currentUser={currentUserStaff} isStaffOrAdmin={true} />);

    // Open Add Action panel
    const addButton = await screen.findByRole("button", { name: /add action/i });
    await user.click(addButton);

    // Initial check: follow-up note input is not visible/required by default
    expect(screen.queryByLabelText(/follow-up note/i)).not.toBeInTheDocument();

    // Submit empty form to trigger validation
    const saveButton = screen.getByRole("button", { name: /save action/i });
    await user.click(saveButton);

    // Verify inline errors
    expect(await screen.findByText(/description is required/i)).toBeInTheDocument();
    expect(screen.getByText(/result is required/i)).toBeInTheDocument();

    // First invalid field (Description) must receive focus
    const descriptionInput = screen.getByLabelText(/description \*/i);
    expect(descriptionInput).toHaveFocus();

    // Fill description and result
    await user.type(descriptionInput, "Checked cooling fan");
    const resultInput = screen.getByLabelText(/result \*/i);
    await user.type(resultInput, "Dust accumulated, fan bearing noisy");

    // Toggle Follow-up required to Yes
    const followUpToggle = screen.getByLabelText(/follow-up required\?/i);
    await user.click(followUpToggle);

    // Now follow-up note should appear
    const followUpNoteInput = await screen.findByLabelText(/follow-up note \*/i);
    expect(followUpNoteInput).toBeInTheDocument();

    // Try saving without entering follow-up note
    await user.click(saveButton);
    expect(await screen.findByText(/follow-up note is required when follow-up is enabled/i)).toBeInTheDocument();
    expect(followUpNoteInput).toHaveFocus();
  });

  // ACT-UI-03: Save disables while submitting; double click sends one request; retry reuses key
  it("ACT-UI-03: disables submit button during submission, prevents double-click submissions, and reuses idempotency key on retry", async () => {
    const user = userEvent.setup();
    let resolvePost: (value: any) => void = () => {};
    const pendingPromise = new Promise((resolve) => {
      resolvePost = resolve;
    });

    vi.mocked(api.postTicketAction).mockImplementationOnce(() => pendingPromise as any);

    render(<ActionsTaken ticketId={10} currentUser={currentUserStaff} isStaffOrAdmin={true} />);

    await user.click(await screen.findByRole("button", { name: /add action/i }));
    await user.type(screen.getByLabelText(/description \*/i), "Network speed test on switch port");
    await user.type(screen.getByLabelText(/result \*/i), "10 Mbps negotiation instead of 1 Gbps");

    const saveButton = screen.getByRole("button", { name: /save action/i });

    // Click twice rapidly
    await user.click(saveButton);
    await user.click(saveButton);

    // Only one call should be sent and button disabled
    expect(api.postTicketAction).toHaveBeenCalledTimes(1);
    expect(saveButton).toBeDisabled();

    const firstCallKey = vi.mocked(api.postTicketAction).mock.calls[0][2];
    expect(firstCallKey).toBeTruthy();

    // Reject first attempt to simulate network failure
    resolvePost(Promise.reject(new Error("Network timeout")));
    await waitFor(() => expect(saveButton).not.toBeDisabled());

    // Click retry
    vi.mocked(api.postTicketAction).mockResolvedValueOnce({
      ...sampleActionPlanned,
      id: 103,
      clientRequestId: firstCallKey,
    });

    await user.click(saveButton);

    // Second call must reuse the exact same idempotency key
    expect(api.postTicketAction).toHaveBeenCalledTimes(2);
    const secondCallKey = vi.mocked(api.postTicketAction).mock.calls[1][2];
    expect(secondCallKey).toBe(firstCallKey);
  });

  // ACT-UI-04: Failure keeps entered text and shows banner
  it("ACT-UI-04: preserves all entered text and shows banner upon recoverable failure", async () => {
    const user = userEvent.setup();
    vi.mocked(api.postTicketAction).mockRejectedValueOnce(new Error("Database connection lost"));

    render(<ActionsTaken ticketId={10} currentUser={currentUserStaff} isStaffOrAdmin={true} />);

    await user.click(await screen.findByRole("button", { name: /add action/i }));
    const desc = "Reconfigured VLAN tag on port 12";
    const result = "VLAN 20 tag applied successfully";
    const attachmentNotes = "Packet capture uploaded in Attachments";

    await user.type(screen.getByLabelText(/description \*/i), desc);
    await user.type(screen.getByLabelText(/result \*/i), result);
    await user.type(screen.getByLabelText(/attachment notes/i), attachmentNotes);

    await user.click(screen.getByRole("button", { name: /save action/i }));

    // Verify error banner is visible
    expect(await screen.findByText(/database connection lost/i)).toBeInTheDocument();

    // Verify entered text is completely preserved in the inputs
    expect(screen.getByLabelText(/description \*/i)).toHaveValue(desc);
    expect(screen.getByLabelText(/result \*/i)).toHaveValue(result);
    expect(screen.getByLabelText(/attachment notes/i)).toHaveValue(attachmentNotes);
  });

  // ACT-UI-05: Requester view has no Add/Edit controls rendered
  it("ACT-UI-05: does not render Add Action or modification controls for Requester", async () => {
    render(<ActionsTaken ticketId={10} currentUser={currentUserRequester} isStaffOrAdmin={false} />);

    // Actions list is visible
    expect(await screen.findByText("Inspected power adapter and checked voltage output")).toBeInTheDocument();

    // Controls must NOT exist in the DOM
    expect(screen.queryByRole("button", { name: /add action/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /reassign/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /complete/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /cancel action/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /delete/i })).not.toBeInTheDocument();
  });

  // ACT-UI-06: No Edit control anywhere (content always read-only); 409 shows conflict message; Completed/Cancelled rows show no controls; no Delete anywhere
  it("ACT-UI-06: enforces immutable content with no edit controls, handles 409 conflict with reload prompt, and hides mutation controls on terminal action rows", async () => {
    const user = userEvent.setup();
    const conflictError: any = new Error("Action was updated by another process");
    conflictError.status = 409;
    vi.mocked(api.updateTicketActionStatus).mockRejectedValueOnce(conflictError);

    render(<ActionsTaken ticketId={10} currentUser={currentUserStaff} isStaffOrAdmin={true} />);

    await screen.findByText("Inspected power adapter and checked voltage output");

    // Immutability: No Edit button anywhere in the component
    expect(screen.queryByRole("button", { name: /^edit$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /delete/i })).not.toBeInTheDocument();

    // Terminal row (Completed) has NO reassign/complete/cancel controls
    const completedRow = screen.getByText("Replaced faulty power adapter with newly delivered spare").closest("tr") ||
                         screen.getByText("Replaced faulty power adapter with newly delivered spare").closest("li")!;
    expect(completedRow).not.toBeNull();
    expect(completedRow.querySelector("button[name='complete']")).toBeNull();
    expect(completedRow.querySelector("button[name='cancel']")).toBeNull();
    expect(completedRow.querySelector("button[name='reassign']")).toBeNull();

    // On planned row, click Complete to trigger 409 conflict
    const completeButton = screen.getByRole("button", { name: /complete action/i });
    await user.click(completeButton);

    // 409 conflict banner and Reload button must appear
    expect(await screen.findByText(/this action was changed by someone else\. reload to see the latest version\./i)).toBeInTheDocument();
    const reloadButton = screen.getByRole("button", { name: /reload/i });
    expect(reloadButton).toBeInTheDocument();

    // Clicking Reload refreshes the list
    await user.click(reloadButton);
    expect(api.getTicketActions).toHaveBeenCalledTimes(2);
  });

  // ACT-UI-07: Assignee select lists only active staff/admin; Complete/Cancel buttons on Planned rows with cancel confirmation; status badge has text
  it("ACT-UI-07: offers only active staff in assignee select, requires confirmation for cancel, and renders clear status text badges", async () => {
    const user = userEvent.setup();
    // Spy on window.confirm
    const confirmSpy = vi.spyOn(window, "confirm").mockImplementation(() => true);

    vi.mocked(api.updateTicketActionStatus).mockResolvedValueOnce({
      ...sampleActionPlanned,
      status: "CANCELLED",
      version: 1,
    });

    render(<ActionsTaken ticketId={10} currentUser={currentUserStaff} isStaffOrAdmin={true} />);

    await screen.findByText("Inspected power adapter and checked voltage output");

    // Open Add Action panel to check Assignee select options
    await user.click(screen.getByRole("button", { name: /add action/i }));
    const assigneeSelect = screen.getByLabelText(/assignee/i);

    // Should include active staff (Witchai Tech, Kamon Support) and Unassigned
    expect(assigneeSelect).toContainHTML("Witchai Tech");
    expect(assigneeSelect).toContainHTML("Kamon Support");
    // Should NOT include inactive staff
    expect(assigneeSelect).not.toContainHTML("Inactive Tech");

    // Cancel action on Planned row
    const cancelButton = screen.getByRole("button", { name: /cancel action/i });
    await user.click(cancelButton);

    // Confirmation must be prompted
    expect(confirmSpy).toHaveBeenCalled();
    expect(api.updateTicketActionStatus).toHaveBeenCalledWith(10, 101, {
      status: "CANCELLED",
      expectedVersion: 0,
    });

    confirmSpy.mockRestore();
  });
});
