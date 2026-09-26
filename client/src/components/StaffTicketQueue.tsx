import React, { useState, useEffect, useCallback } from "react";
import {
  Category,
  User,
  StaffQueueTicket,
  StaffQueuePagination,
  StaffPriority,
  StaffTicketStatus,
  getCategories,
  getStaffTickets,
} from "../api.js";

interface StaffTicketQueueProps {
  currentUser: User;
  onOpenTicket?: (ticketId: number) => void;
}

type StaffSortByField = "createdAt" | "updatedAt" | "itPriority" | "status" | "ticketNumber";
type SortOrderDirection = "asc" | "desc";

export const StaffTicketQueue: React.FC<StaffTicketQueueProps> = ({
  currentUser,
  onOpenTicket,
}) => {
  // Reference data
  const [categories, setCategories] = useState<Category[]>([]);

  // Ticket queue data & pagination
  const [tickets, setTickets] = useState<StaffQueueTicket[]>([]);
  const [pagination, setPagination] = useState<StaffQueuePagination>({
    page: 1,
    pageSize: 10,
    totalItems: 0,
    totalPages: 1,
  });

  // Filter & search states
  const [search, setSearch] = useState<string>("");
  const [debouncedSearch, setDebouncedSearch] = useState<string>("");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [selectedPriority, setSelectedPriority] = useState<string>("ALL");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [selectedOwnership, setSelectedOwnership] = useState<"all" | "mine" | "unassigned">("all");

  // Sorting & pagination states
  const [sortBy, setSortBy] = useState<StaffSortByField>("createdAt");
  const [sortOrder, setSortOrder] = useState<SortOrderDirection>("desc");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Status / Feedback states
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isForbidden, setIsForbidden] = useState<boolean>(false);

  // Debounce search input (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Load categories
  useEffect(() => {
    let isMounted = true;
    getCategories()
      .then((cats) => {
        if (isMounted) setCategories(cats);
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, []);

  // Fetch ticket queue
  const fetchQueue = useCallback(async () => {
    setIsLoading(true);
    setApiError(null);
    setIsForbidden(false);

    try {
      let ownerIdParam: string | number | undefined;
      if (selectedOwnership === "mine") {
        ownerIdParam = currentUser.id;
      } else if (selectedOwnership === "unassigned") {
        ownerIdParam = "unassigned";
      }

      const response = await getStaffTickets({
        search: debouncedSearch || undefined,
        status: selectedStatus !== "ALL" ? selectedStatus : undefined,
        priority: selectedPriority !== "ALL" ? selectedPriority : undefined,
        categoryId: selectedCategory !== "ALL" ? Number(selectedCategory) : undefined,
        ownerId: ownerIdParam,
        sortBy,
        sortOrder,
        page: currentPage,
        pageSize,
      });

      setTickets(response.items);
      setPagination(response.pagination);
    } catch (err) {
      if (err instanceof Error && err.message === "FORBIDDEN") {
        setIsForbidden(true);
      } else {
        setApiError(err instanceof Error ? err.message : "Failed to load ticket queue");
      }
    } finally {
      setIsLoading(false);
    }
  }, [
    debouncedSearch,
    selectedStatus,
    selectedPriority,
    selectedCategory,
    selectedOwnership,
    sortBy,
    sortOrder,
    currentPage,
    pageSize,
    currentUser.id,
  ]);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  // Handle column sorting
  const handleSortToggle = (field: StaffSortByField) => {
    if (sortBy === field) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
    setCurrentPage(1);
  };

  const handleClearFilters = () => {
    setSearch("");
    setDebouncedSearch("");
    setSelectedStatus("ALL");
    setSelectedPriority("ALL");
    setSelectedCategory("ALL");
    setSelectedOwnership("all");
    setCurrentPage(1);
  };

  // Helper formatting functions
  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      const day = String(d.getDate()).padStart(2, "0");
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const month = months[d.getMonth()];
      const year = d.getFullYear();
      return `${day} ${month} ${year}`;
    } catch {
      return isoString;
    }
  };

  const getPriorityBadgeStyle = (priority: string) => {
    let bg = "#F3F4F6";
    let color = "#374151";
    let border = "1px solid #E5E7EB";

    if (priority === "LOW") {
      bg = "#F3F4F6";
      color = "#4B5563";
      border = "1px solid #D1D5DB";
    } else if (priority === "MEDIUM") {
      bg = "#FEF3C7";
      color = "#92400E";
      border = "1px solid #FCD34D";
    } else if (priority === "HIGH") {
      bg = "#FEE2E2";
      color = "#991B1B";
      border = "1px solid #FCA5A5";
    } else if (priority === "URGENT") {
      bg = "#7F1D1D";
      color = "#FFFFFF";
      border = "1px solid #991B1B";
    }

    return { bg, color, border };
  };

  const renderPriorityBadge = (priority: string) => {
    const { bg, color, border } = getPriorityBadgeStyle(priority);
    return (
      <span
        style={{
          backgroundColor: bg,
          color,
          border,
          borderRadius: "12px",
          padding: "2px 8px",
          fontSize: "12px",
          fontWeight: 600,
          display: "inline-block",
        }}
      >
        {priority}
      </span>
    );
  };

  const formatStatusTitle = (status: StaffTicketStatus) => {
    switch (status) {
      case "NEW":
        return "New";
      case "OPEN":
        return "Open";
      case "IN_PROGRESS":
        return "In Progress";
      case "WAITING_FOR_REQUESTER":
        return "Waiting for Requester";
      case "RESOLVED":
        return "Resolved";
      case "CLOSED":
        return "Closed";
      case "REOPENED":
        return "Reopened";
      case "CANCELLED":
        return "Cancelled";
      default:
        return status;
    }
  };

  const renderStatusBadge = (status: StaffTicketStatus) => {
    return (
      <span
        style={{
          backgroundColor: "var(--color-pale-green)",
          color: "var(--color-primary-green)",
          border: "1px solid #B8E2CB",
          borderRadius: "12px",
          padding: "2px 8px",
          fontSize: "12px",
          fontWeight: 600,
          display: "inline-block",
        }}
      >
        {formatStatusTitle(status)}
      </span>
    );
  };

  const renderSortIndicator = (field: StaffSortByField) => {
    if (sortBy !== field) {
      return (
        <span style={{ color: "#AAA", marginLeft: "6px", fontSize: "11px", whiteSpace: "nowrap" }}>
          ↕
        </span>
      );
    }
    return (
      <span
        style={{
          color: "var(--color-primary-green)",
          marginLeft: "6px",
          fontSize: "11px",
          whiteSpace: "nowrap",
        }}
      >
        {sortOrder === "asc" ? "▲" : "▼"}
      </span>
    );
  };

  const hasActiveFilters = Boolean(
    search ||
      selectedStatus !== "ALL" ||
      selectedPriority !== "ALL" ||
      selectedCategory !== "ALL" ||
      selectedOwnership !== "all"
  );

  // 1. Forbidden state
  if (isForbidden) {
    return (
      <div className="container py-5" style={{ maxWidth: "800px" }}>
        <div
          className="zen-card p-5 text-center"
          style={{
            backgroundColor: "var(--color-surface)",
            border: "1px solid #FCA5A5",
          }}
        >
          <div
            style={{
              width: "56px",
              height: "56px",
              borderRadius: "50%",
              backgroundColor: "#FEE2E2",
              color: "#DC2626",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "24px",
              margin: "0 auto 16px auto",
            }}
          >
            ✕
          </div>
          <h2 className="h4 mb-2" style={{ color: "#991B1B", fontWeight: 700 }}>
            Access Forbidden
          </h2>
          <p className="text-muted mb-0">
            You do not have permission to view the IT Staff ticket queue. Please switch to an IT Staff account.
          </p>
        </div>
      </div>
    );
  }

  // 2. Generic Error State
  if (apiError && !isLoading) {
    return (
      <div className="container py-5" style={{ maxWidth: "800px" }}>
        <div
          className="zen-card p-5 text-center"
          style={{
            backgroundColor: "var(--color-surface)",
            border: "1px solid #FCA5A5",
          }}
        >
          <h2 className="h4 mb-2" style={{ color: "#991B1B", fontWeight: 700 }}>
            Failed to load ticket queue
          </h2>
          <p className="text-muted mb-4">{apiError}</p>
          <button type="button" className="zen-btn-primary" onClick={() => fetchQueue()}>
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-4" style={{ maxWidth: "1280px" }}>
      {/* Header with Title and Total Active Count Badge */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
        <div className="d-flex align-items-center gap-3">
          <h1 className="h3 mb-0" style={{ color: "var(--color-primary-green)", fontWeight: 700 }}>
            IT Support Ticket Queue
          </h1>
          <span
            data-testid="queue-count-badge"
            style={{
              backgroundColor: "var(--color-pale-green)",
              color: "var(--color-primary-green)",
              border: "1px solid #B8E2CB",
              borderRadius: "16px",
              padding: "4px 12px",
              fontSize: "13px",
              fontWeight: 700,
            }}
          >
            {pagination.totalItems}
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div
        className="zen-card p-3 mb-4"
        style={{
          backgroundColor: "var(--color-surface)",
          border: "1px solid var(--color-border)",
        }}
      >
        <div className="row g-3 align-items-end">
          {/* Search Box */}
          <div className="col-12 col-md-3">
            <label
              htmlFor="queue-search-input"
              className="form-label mb-1"
              style={{ fontSize: "13px", fontWeight: 600, color: "var(--color-text-main)" }}
            >
              Search
            </label>
            <div className="position-relative">
              <input
                id="queue-search-input"
                type="text"
                className="zen-input"
                placeholder="Search ticket #, summary, requester..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ paddingRight: search ? "32px" : "12px" }}
              />
              {search && (
                <button
                  type="button"
                  aria-label="Clear search text"
                  onClick={() => setSearch("")}
                  style={{
                    position: "absolute",
                    right: "8px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    color: "#888",
                    cursor: "pointer",
                    padding: "2px 6px",
                  }}
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Status Filter */}
          <div className="col-6 col-md-2">
            <label
              htmlFor="queue-status-filter"
              className="form-label mb-1"
              style={{ fontSize: "13px", fontWeight: 600, color: "var(--color-text-main)" }}
            >
              Status
            </label>
            <select
              id="queue-status-filter"
              className="zen-select"
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="ALL">All Statuses</option>
              <option value="NEW">New</option>
              <option value="OPEN">Open</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="WAITING_FOR_REQUESTER">Waiting for Requester</option>
              <option value="RESOLVED">Resolved</option>
              <option value="CLOSED">Closed</option>
              <option value="REOPENED">Reopened</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>

          {/* Priority Filter */}
          <div className="col-6 col-md-2">
            <label
              htmlFor="queue-priority-filter"
              className="form-label mb-1"
              style={{ fontSize: "13px", fontWeight: 600, color: "var(--color-text-main)" }}
            >
              IT Priority
            </label>
            <select
              id="queue-priority-filter"
              className="zen-select"
              value={selectedPriority}
              onChange={(e) => {
                setSelectedPriority(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="ALL">All Priorities</option>
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="URGENT">Urgent</option>
            </select>
          </div>

          {/* Category Filter */}
          <div className="col-6 col-md-2">
            <label
              htmlFor="queue-category-filter"
              className="form-label mb-1"
              style={{ fontSize: "13px", fontWeight: 600, color: "var(--color-text-main)" }}
            >
              Category
            </label>
            <select
              id="queue-category-filter"
              className="zen-select"
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="ALL">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Ownership Filter */}
          <div className="col-6 col-md-2">
            <label
              htmlFor="queue-ownership-filter"
              className="form-label mb-1"
              style={{ fontSize: "13px", fontWeight: 600, color: "var(--color-text-main)" }}
            >
              Ownership
            </label>
            <select
              id="queue-ownership-filter"
              className="zen-select"
              value={selectedOwnership}
              onChange={(e) => {
                setSelectedOwnership(e.target.value as any);
                setCurrentPage(1);
              }}
            >
              <option value="all">All Tickets</option>
              <option value="mine">My Assigned Tickets</option>
              <option value="unassigned">Unassigned Tickets</option>
            </select>
          </div>

          {/* Reset button if active */}
          {hasActiveFilters && (
            <div className="col-12 col-md-1 d-flex align-items-end">
              <button
                type="button"
                className="btn btn-outline-secondary btn-sm w-100 py-2"
                onClick={handleClearFilters}
                style={{ fontSize: "12px", whiteSpace: "nowrap" }}
              >
                Clear
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area: Loading Skeleton, Empty, No Results, or List */}
      {isLoading ? (
        <div
          data-testid="queue-loading-skeleton"
          className="zen-card p-4 text-center"
          style={{
            backgroundColor: "var(--color-surface)",
            border: "1px solid var(--color-border)",
          }}
        >
          <div
            className="spinner-border text-success mb-3"
            style={{ width: "2.5rem", height: "2.5rem", color: "var(--color-primary-green)" }}
            role="status"
          >
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="text-muted mb-0">Loading IT ticket queue...</p>
        </div>
      ) : tickets.length === 0 ? (
        hasActiveFilters ? (
          <div
            className="zen-card p-5 text-center"
            style={{
              backgroundColor: "var(--color-surface)",
              border: "1px solid var(--color-border)",
            }}
          >
            <h2 className="h5 mb-2" style={{ color: "var(--color-text-main)", fontWeight: 600 }}>
              No tickets match your filter criteria.
            </h2>
            <p className="text-muted small mb-3">
              Try adjusting or clearing your search filters to find what you're looking for.
            </p>
            <button type="button" className="zen-btn-primary" onClick={handleClearFilters}>
              Clear Filters
            </button>
          </div>
        ) : (
          <div
            className="zen-card p-5 text-center"
            style={{
              backgroundColor: "var(--color-surface)",
              border: "1px solid var(--color-border)",
            }}
          >
            <h2 className="h5 mb-2" style={{ color: "var(--color-text-main)", fontWeight: 600 }}>
              No tickets currently in the system.
            </h2>
            <p className="text-muted small mb-0">
              When tickets are created by requesters, they will appear in this shared queue.
            </p>
          </div>
        )
      ) : (
        <>
          {/* Desktop Table Layout (≥992px) with 9 Columns per ui-spec.md §3.4 */}
          <div
            className="d-none d-lg-block zen-card overflow-hidden mb-4"
            style={{
              backgroundColor: "var(--color-surface)",
              border: "1px solid var(--color-border)",
            }}
          >
            <div className="table-responsive">
              <table
                data-testid="staff-queue-table"
                className="table table-hover align-middle mb-0"
                style={{ fontSize: "14px" }}
              >
                <thead style={{ backgroundColor: "#F9FAFB", borderBottom: "1px solid var(--color-border)" }}>
                  <tr>
                    <th
                      style={{ cursor: "pointer", width: "16%" }}
                      onClick={() => handleSortToggle("ticketNumber")}
                    >
                      Ticket #{renderSortIndicator("ticketNumber")}
                    </th>
                    <th
                      style={{ cursor: "pointer", width: "11%" }}
                      onClick={() => handleSortToggle("createdAt")}
                    >
                      Created{renderSortIndicator("createdAt")}
                    </th>
                    <th style={{ width: "22%" }}>Summary</th>
                    <th style={{ width: "11%" }}>Category</th>
                    <th style={{ width: "9%" }}>Requested Priority</th>
                    <th
                      style={{ cursor: "pointer", width: "9%" }}
                      onClick={() => handleSortToggle("itPriority")}
                    >
                      IT Priority{renderSortIndicator("itPriority")}
                    </th>
                    <th
                      style={{ cursor: "pointer", width: "12%" }}
                      onClick={() => handleSortToggle("status")}
                    >
                      Status{renderSortIndicator("status")}
                    </th>
                    <th style={{ width: "10%" }}>Owner</th>
                    <th style={{ width: "8%", textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {tickets.map((ticket) => (
                    <tr key={ticket.id}>
                      {/* 1. Ticket # */}
                      <td>
                        <span
                          role="button"
                          tabIndex={0}
                          onClick={() => onOpenTicket?.(ticket.id)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") onOpenTicket?.(ticket.id);
                          }}
                          style={{
                            fontWeight: 700,
                            color: "var(--color-primary-green)",
                            cursor: "pointer",
                            textDecoration: "underline",
                          }}
                        >
                          {ticket.ticketNumber}
                        </span>
                      </td>

                      {/* 2. Created */}
                      <td style={{ color: "#4B5563" }}>{formatDate(ticket.createdAt)}</td>

                      {/* 3. Summary (truncated to 60 chars) */}
                      <td>
                        <div
                          title={ticket.summary}
                          style={{
                            maxWidth: "260px",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            color: "var(--color-text-main)",
                          }}
                        >
                          {ticket.summary}
                        </div>
                        <div style={{ fontSize: "11px", color: "#6B7280" }}>
                          by {ticket.requester.name}
                        </div>
                      </td>

                      {/* 4. Category */}
                      <td>
                        <span style={{ color: "#374151" }}>{ticket.category.name}</span>
                      </td>

                      {/* 5. Requested Priority */}
                      <td>{renderPriorityBadge(ticket.requestedPriority)}</td>

                      {/* 6. IT Priority */}
                      <td>{renderPriorityBadge(ticket.itPriority)}</td>

                      {/* 7. Status + 'Requester Resolved' badge if true */}
                      <td>
                        <div className="d-flex flex-column gap-1 align-items-start">
                          {renderStatusBadge(ticket.status)}
                          {ticket.isRequesterResolved && (
                            <span
                              style={{
                                backgroundColor: "#DCFCE7",
                                color: "#166534",
                                border: "1px solid #86EFAC",
                                borderRadius: "12px",
                                padding: "2px 8px",
                                fontSize: "11px",
                                fontWeight: 700,
                                display: "inline-block",
                              }}
                            >
                              Requester Resolved
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 8. Owner */}
                      <td>
                        {ticket.owner ? (
                          <span style={{ fontWeight: 500, color: "#111827" }}>{ticket.owner.name}</span>
                        ) : (
                          <span
                            style={{
                              backgroundColor: "#F3F4F6",
                              color: "#6B7280",
                              border: "1px solid #E5E7EB",
                              borderRadius: "12px",
                              padding: "2px 8px",
                              fontSize: "11px",
                              fontWeight: 600,
                              display: "inline-block",
                            }}
                          >
                            Unassigned
                          </span>
                        )}
                      </td>

                      {/* 9. Actions */}
                      <td style={{ textAlign: "right" }}>
                        <button
                          type="button"
                          className="zen-btn-primary py-1 px-2"
                          style={{ fontSize: "12px" }}
                          onClick={() => onOpenTicket?.(ticket.id)}
                        >
                          Open Ticket
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Card Layout (<768px and tablet <992px) per ui-spec.md §3.4 */}
          <div data-testid="staff-queue-mobile-cards" className="d-lg-none d-flex flex-column gap-3 mb-4">
            {tickets.map((ticket) => (
              <div
                key={ticket.id}
                className="zen-card p-3"
                style={{
                  backgroundColor: "var(--color-surface)",
                  border: "1px solid var(--color-border)",
                  borderRadius: "8px",
                }}
              >
                <div className="d-flex justify-content-between align-items-start mb-2">
                  <div>
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={() => onOpenTicket?.(ticket.id)}
                      style={{
                        fontWeight: 700,
                        color: "var(--color-primary-green)",
                        cursor: "pointer",
                        fontSize: "15px",
                        textDecoration: "underline",
                      }}
                    >
                      {ticket.ticketNumber}
                    </span>
                    <div style={{ fontSize: "12px", color: "#6B7280" }}>
                      {formatDate(ticket.createdAt)} • by {ticket.requester.name}
                    </div>
                  </div>
                  <div className="d-flex flex-column align-items-end gap-1">
                    {renderStatusBadge(ticket.status)}
                    {ticket.isRequesterResolved && (
                      <span
                        style={{
                          backgroundColor: "#DCFCE7",
                          color: "#166534",
                          border: "1px solid #86EFAC",
                          borderRadius: "12px",
                          padding: "2px 8px",
                          fontSize: "10px",
                          fontWeight: 700,
                        }}
                      >
                        Requester Resolved
                      </span>
                    )}
                  </div>
                </div>

                <div className="mb-2">
                  <div
                    style={{
                      fontSize: "14px",
                      fontWeight: 600,
                      color: "var(--color-text-main)",
                      marginBottom: "4px",
                    }}
                  >
                    {ticket.summary}
                  </div>
                  <div style={{ fontSize: "12px", color: "#6B7280" }}>
                    Category: <strong>{ticket.category.name}</strong>
                  </div>
                </div>

                <div className="d-flex justify-content-between align-items-center pt-2 border-top">
                  <div className="d-flex align-items-center gap-2">
                    <span style={{ fontSize: "12px", color: "#4B5563" }}>IT:</span>
                    {renderPriorityBadge(ticket.itPriority)}
                    {ticket.owner ? (
                      <span style={{ fontSize: "12px", color: "#111827", fontWeight: 500 }}>
                        👤 {ticket.owner.name}
                      </span>
                    ) : (
                      <span
                        style={{
                          backgroundColor: "#F3F4F6",
                          color: "#6B7280",
                          borderRadius: "10px",
                          padding: "1px 6px",
                          fontSize: "11px",
                        }}
                      >
                        Unassigned
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    className="zen-btn-primary py-1 px-3"
                    style={{ fontSize: "12px" }}
                    onClick={() => onOpenTicket?.(ticket.id)}
                  >
                    Open Ticket
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination Controls */}
          {pagination.totalPages > 1 && (
            <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 pt-2">
              <div className="text-muted small">
                Showing page {pagination.page} of {pagination.totalPages} ({pagination.totalItems} total tickets)
              </div>
              <div className="d-flex gap-2">
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-sm"
                  disabled={pagination.page <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                >
                  Previous
                </button>
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-sm"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(p + 1, pagination.totalPages))}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
