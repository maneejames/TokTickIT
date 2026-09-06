import React, { useState, useEffect, useCallback } from "react";
import {
  Category,
  RequesterUser,
  TicketListItem,
  PaginationMetadata,
  getCategories,
  getTickets,
} from "../api.js";

interface MyTicketsProps {
  currentRequester: RequesterUser;
  onNavigateToCreateTicket?: () => void;
  onNavigateToTicketDetail?: (ticketId: number) => void;
}

type SortByField = "createdAt" | "requestedPriority" | "status" | "summary";
type SortOrderDirection = "asc" | "desc";

export const MyTickets: React.FC<MyTicketsProps> = ({
  currentRequester,
  onNavigateToCreateTicket,
  onNavigateToTicketDetail,
}) => {
  // Reference data
  const [categories, setCategories] = useState<Category[]>([]);

  // Ticket data & pagination
  const [tickets, setTickets] = useState<TicketListItem[]>([]);
  const [pagination, setPagination] = useState<PaginationMetadata>({
    page: 1,
    pageSize: 10,
    totalItems: 0,
    totalPages: 1,
  });

  // Filter & search states
  const [search, setSearch] = useState<string>("");
  const [debouncedSearch, setDebouncedSearch] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedPriority, setSelectedPriority] = useState<string>("");
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [sortBy, setSortBy] = useState<SortByField>("createdAt");
  const [sortOrder, setSortOrder] = useState<SortOrderDirection>("desc");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Status/Feedback states
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [apiError, setApiError] = useState<string | null>(null);

  // Debounce search input (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setCurrentPage(1); // Reset to page 1 on new search
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Load categories once
  useEffect(() => {
    let isMounted = true;
    getCategories()
      .then((cats) => {
        if (isMounted) setCategories(cats);
      })
      .catch(() => {
        // Fallback or ignore non-fatal categories fetch error
      });
    return () => {
      isMounted = false;
    };
  }, []);

  // Fetch tickets callback
  const fetchTickets = useCallback(async () => {
    setIsLoading(true);
    setApiError(null);
    try {
      const response = await getTickets(
        {
          search: debouncedSearch || undefined,
          categoryId: selectedCategory ? Number(selectedCategory) : undefined,
          priority: (selectedPriority as "LOW" | "MEDIUM" | "HIGH") || undefined,
          status: selectedStatus || undefined,
          sortBy,
          sortOrder,
          page: currentPage,
          pageSize,
        },
        currentRequester.id
      );

      setTickets(response.items);
      setPagination(response.pagination);
    } catch (err) {
      setApiError(err instanceof Error ? err.message : "Failed to load tickets");
    } finally {
      setIsLoading(false);
    }
  }, [
    debouncedSearch,
    selectedCategory,
    selectedPriority,
    selectedStatus,
    sortBy,
    sortOrder,
    currentPage,
    pageSize,
    currentRequester.id,
  ]);

  // Refetch when dependencies change
  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  // Column sort toggle handler
  const handleSortToggle = (field: SortByField) => {
    if (sortBy === field) {
      // Toggle order
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortOrder("asc");
    }
    setCurrentPage(1);
  };

  // Clear filters handler
  const handleClearFilters = () => {
    setSearch("");
    setDebouncedSearch("");
    setSelectedCategory("");
    setSelectedPriority("");
    setSelectedStatus("");
    setSortBy("createdAt");
    setSortOrder("desc");
    setCurrentPage(1);
  };

  // Format date helper: DD/MM/YYYY HH:mm
  const formatDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const day = String(date.getDate()).padStart(2, "0");
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const year = date.getFullYear();
      const hours = String(date.getHours()).padStart(2, "0");
      const minutes = String(date.getMinutes()).padStart(2, "0");
      return `${day}/${month}/${year} ${hours}:${minutes}`;
    } catch {
      return isoString;
    }
  };

  // Priority Badge helper
  const renderPriorityBadge = (priority: string) => {
    let bg = "#FEF8E8";
    let color = "#8F6500";
    let border = "1px solid #F5DE9C";

    if (priority === "LOW") {
      bg = "#F0F4F2";
      color = "#375043";
      border = "1px solid #D1DDD5";
    } else if (priority === "HIGH") {
      bg = "#FDF2F2";
      color = "#B3261E";
      border = "1px solid #F8B4B4";
    }

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

  // Status Badge helper
  const renderStatusBadge = (status: string) => {
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
        {status}
      </span>
    );
  };

  // Sort indicator helper
  const renderSortIndicator = (field: SortByField) => {
    if (sortBy !== field) {
      return <span style={{ color: "#AAA", marginLeft: "4px", fontSize: "11px" }}>↕</span>;
    }
    return (
      <span style={{ color: "var(--color-primary-green)", marginLeft: "4px", fontSize: "11px" }}>
        {sortOrder === "asc" ? "▲" : "▼"}
      </span>
    );
  };

  // Whether user has active filters applied
  const hasActiveFilters = Boolean(search || selectedCategory || selectedPriority || selectedStatus);

  return (
    <div className="container py-4" style={{ maxWidth: "1140px" }}>
      {/* Header & Action Toolbar */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
        <div>
          <h1 className="h3 mb-1" style={{ color: "var(--color-primary-green)", fontWeight: 700 }}>
            My Tickets
          </h1>
          <p className="text-muted small mb-0">
            View and track your submitted IT support requests
          </p>
        </div>

        <button
          type="button"
          className="zen-btn-primary d-inline-flex align-items-center justify-content-center gap-1"
          onClick={onNavigateToCreateTicket}
          style={{ whiteSpace: "nowrap" }}
        >
          <span>+ New Ticket</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div
        className="zen-card p-3 mb-4"
        style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)" }}
      >
        <div className="row g-3 align-items-end">
          {/* Search Box */}
          <div className="col-12 col-md-4">
            <label
              htmlFor="ticket-search-input"
              className="form-label mb-1"
              style={{ fontSize: "13px", fontWeight: 600, color: "var(--color-text-main)" }}
            >
              Search
            </label>
            <div className="position-relative">
              <input
                id="ticket-search-input"
                type="text"
                className="zen-input"
                placeholder="Search by summary or ticket #..."
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

          {/* Category Filter */}
          <div className="col-12 col-sm-6 col-md-3">
            <label
              htmlFor="ticket-category-filter"
              className="form-label mb-1"
              style={{ fontSize: "13px", fontWeight: 600, color: "var(--color-text-main)" }}
            >
              Category Filter
            </label>
            <select
              id="ticket-category-filter"
              aria-label="Category Filter"
              className="zen-select"
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="">All Categories</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Priority Filter */}
          <div className="col-12 col-sm-6 col-md-2">
            <label
              htmlFor="ticket-priority-filter"
              className="form-label mb-1"
              style={{ fontSize: "13px", fontWeight: 600, color: "var(--color-text-main)" }}
            >
              Priority Filter
            </label>
            <select
              id="ticket-priority-filter"
              aria-label="Priority Filter"
              className="zen-select"
              value={selectedPriority}
              onChange={(e) => {
                setSelectedPriority(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="">All Priorities</option>
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="col-12 col-sm-6 col-md-2">
            <label
              htmlFor="ticket-status-filter"
              className="form-label mb-1"
              style={{ fontSize: "13px", fontWeight: 600, color: "var(--color-text-main)" }}
            >
              Status Filter
            </label>
            <select
              id="ticket-status-filter"
              aria-label="Status Filter"
              className="zen-select"
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="">All Statuses</option>
              <option value="NEW">New</option>
            </select>
          </div>

          {/* Clear Filters Button (when filters are active and results are displayed) */}
          <div className="col-12 col-md-1 d-flex justify-content-md-end">
            {hasActiveFilters && tickets.length > 0 && (
              <button
                type="button"
                className="zen-btn-secondary w-100"
                onClick={handleClearFilters}
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content: States & Listing */}
      {isLoading ? (
        // Loading State
        <div className="zen-card p-5 text-center my-4">
          <div
            className="spinner-border"
            style={{ color: "var(--color-primary-green)" }}
            role="status"
          >
            <span className="visually-hidden">Loading tickets...</span>
          </div>
          <p className="mt-3 text-muted mb-0">Loading your tickets...</p>
        </div>
      ) : apiError ? (
        // API Failure State
        <div className="zen-card p-4 my-4" role="alert">
          <div
            className="alert mb-3"
            style={{
              backgroundColor: "var(--color-error-bg)",
              color: "var(--color-error)",
              border: "1px solid #F8B4B4",
            }}
          >
            <strong>Error:</strong> {apiError}
          </div>
          <div className="text-center">
            <button type="button" className="zen-btn-primary" onClick={fetchTickets}>
              Retry
            </button>
          </div>
        </div>
      ) : tickets.length === 0 ? (
        hasActiveFilters ? (
          // No Results State (Requester has tickets, but search/filter matched none)
          <div className="zen-card p-5 text-center my-4">
            <div style={{ fontSize: "42px", color: "var(--color-text-muted)" }}>🔍</div>
            <h2 className="h5 fw-bold mt-3" style={{ color: "var(--color-text-main)" }}>
              No tickets match your search criteria.
            </h2>
            <p className="text-muted small mt-1 mb-4">
              Try adjusting your search query, clearing filters, or checking for typos.
            </p>
            <button
              type="button"
              className="zen-btn-secondary"
              onClick={handleClearFilters}
            >
              Clear Filters
            </button>
          </div>
        ) : (
          // Empty State (Requester has zero tickets ever created)
          <div className="zen-card p-5 text-center my-4">
            <div style={{ fontSize: "48px", color: "var(--color-secondary-green)" }}>📋</div>
            <h2 className="h5 fw-bold mt-3" style={{ color: "var(--color-primary-green)" }}>
              You haven&apos;t submitted any tickets yet.
            </h2>
            <p className="text-muted small mt-1 mb-4">
              Need assistance? Submit your first IT support request now.
            </p>
            <button
              type="button"
              className="zen-btn-primary"
              onClick={onNavigateToCreateTicket}
            >
              Create Ticket
            </button>
          </div>
        )
      ) : (
        // Results Listing: Desktop Table (≥992px) and Mobile Cards (<768px)
        <div>
          {/* Desktop Table View (visible on lg screens ≥992px) */}
          <div className="d-none d-lg-block zen-card overflow-hidden mb-4" data-testid="tickets-table">
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0" style={{ borderCollapse: "collapse" }}>
                <thead style={{ backgroundColor: "#F9FAF9", borderBottom: "2px solid var(--color-border)" }}>
                  <tr>
                    <th scope="col" style={{ width: "160px", padding: "12px 16px" }}>
                      Ticket #
                    </th>
                    <th
                      scope="col"
                      onClick={() => handleSortToggle("summary")}
                      style={{ cursor: "pointer", userSelect: "none", padding: "12px 16px" }}
                    >
                      Summary {renderSortIndicator("summary")}
                    </th>
                    <th scope="col" style={{ width: "150px", padding: "12px 16px" }}>
                      Category
                    </th>
                    <th
                      scope="col"
                      onClick={() => handleSortToggle("requestedPriority")}
                      style={{
                        cursor: "pointer",
                        userSelect: "none",
                        width: "110px",
                        padding: "12px 16px",
                      }}
                    >
                      Priority {renderSortIndicator("requestedPriority")}
                    </th>
                    <th
                      scope="col"
                      onClick={() => handleSortToggle("status")}
                      style={{
                        cursor: "pointer",
                        userSelect: "none",
                        width: "90px",
                        padding: "12px 16px",
                      }}
                    >
                      Status {renderSortIndicator("status")}
                    </th>
                    <th scope="col" style={{ width: "110px", padding: "12px 16px" }}>
                      Attachments
                    </th>
                    <th
                      scope="col"
                      onClick={() => handleSortToggle("createdAt")}
                      style={{
                        cursor: "pointer",
                        userSelect: "none",
                        width: "150px",
                        padding: "12px 16px",
                      }}
                    >
                      Date Created {renderSortIndicator("createdAt")}
                    </th>
                    <th scope="col" style={{ width: "80px", textAlign: "center", padding: "12px 16px" }}>
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {tickets.map((t) => (
                    <tr
                      key={t.id}
                      style={{ cursor: "pointer" }}
                      onClick={() => onNavigateToTicketDetail?.(t.id)}
                    >
                      <td style={{ padding: "14px 16px" }}>
                        <a
                          href={`/tickets/${t.id}`}
                          onClick={(e) => {
                            e.preventDefault();
                            onNavigateToTicketDetail?.(t.id);
                          }}
                          style={{
                            fontFamily: "monospace",
                            fontWeight: 600,
                            color: "var(--color-secondary-green)",
                            textDecoration: "none",
                          }}
                        >
                          {t.ticketNumber}
                        </a>
                      </td>
                      <td
                        style={{
                          padding: "14px 16px",
                          maxWidth: "280px",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                        title={t.summary}
                      >
                        {t.summary.length > 40 ? `${t.summary.slice(0, 40)}…` : t.summary}
                      </td>
                      <td style={{ padding: "14px 16px", color: "var(--color-text-main)" }}>
                        {t.category?.name || "—"}
                      </td>
                      <td style={{ padding: "14px 16px" }}>
                        {renderPriorityBadge(t.requestedPriority)}
                      </td>
                      <td style={{ padding: "14px 16px" }}>
                        {renderStatusBadge(t.currentStatus)}
                      </td>
                      <td style={{ padding: "14px 16px", color: "var(--color-text-muted)" }}>
                        📎 {t._count?.attachments ?? 0}
                      </td>
                      <td style={{ padding: "14px 16px", fontSize: "13px", color: "var(--color-text-muted)" }}>
                        {formatDate(t.createdAt)}
                      </td>
                      <td style={{ padding: "14px 16px", textAlign: "center" }}>
                        <a
                          href={`/tickets/${t.id}`}
                          className="zen-btn-secondary"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onNavigateToTicketDetail?.(t.id);
                          }}
                          style={{
                            padding: "4px 10px",
                            fontSize: "12px",
                            textDecoration: "none",
                            display: "inline-block",
                          }}
                        >
                          View
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Card View (visible on screens <992px) */}
          <div className="d-lg-none d-flex flex-column gap-3 mb-4" data-testid="tickets-mobile-cards">
            {tickets.map((t) => (
              <div
                key={t.id}
                className="zen-card p-3"
                style={{ cursor: "pointer" }}
                onClick={() => onNavigateToTicketDetail?.(t.id)}
              >
                {/* Card Header: Ticket # and Status badge */}
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <span
                    style={{
                      fontFamily: "monospace",
                      fontWeight: 700,
                      color: "var(--color-secondary-green)",
                      fontSize: "14px",
                    }}
                  >
                    {t.ticketNumber}
                  </span>
                  <div>{renderStatusBadge(t.currentStatus)}</div>
                </div>

                {/* Card Body: Summary (bold) & Category + Priority on one line */}
                <div
                  className="fw-bold mb-2"
                  style={{ color: "var(--color-text-main)", fontSize: "15px" }}
                >
                  {t.summary}
                </div>
                <div className="d-flex align-items-center gap-2 mb-3 small">
                  <span className="text-muted">{t.category?.name || "General"}</span>
                  <span className="text-muted">•</span>
                  <span>{renderPriorityBadge(t.requestedPriority)}</span>
                </div>

                {/* Card Footer: Date Created, Attachments count (📎 N), and View Details button */}
                <div className="d-flex justify-content-between align-items-center pt-2 border-top text-muted small mb-2">
                  <span>{formatDate(t.createdAt)}</span>
                  <span>📎 {t._count?.attachments ?? 0}</span>
                </div>

                <a
                  href={`/tickets/${t.id}`}
                  className="zen-btn-secondary w-100 text-center text-decoration-none d-block py-2"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onNavigateToTicketDetail?.(t.id);
                  }}
                  style={{ fontSize: "13px" }}
                >
                  View Details
                </a>
              </div>
            ))}
          </div>

          {/* Pagination Bar */}
          <div className="d-flex flex-column flex-sm-row justify-content-between align-items-center gap-3 pt-2">
            <div className="text-muted small">
              Showing {(pagination.page - 1) * pagination.pageSize + 1} to{" "}
              {Math.min(pagination.page * pagination.pageSize, pagination.totalItems)} of{" "}
              {pagination.totalItems} tickets
            </div>

            <div className="d-flex align-items-center gap-1">
              <button
                type="button"
                className="zen-btn-secondary"
                disabled={pagination.page <= 1}
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                style={{ padding: "4px 10px", fontSize: "13px" }}
                aria-label="Previous page"
              >
                Previous
              </button>

              {Array.from({ length: pagination.totalPages }, (_, idx) => idx + 1)
                .filter((p) => {
                  // Only show current page, 1, total, and pages close to current
                  return (
                    p === 1 ||
                    p === pagination.totalPages ||
                    Math.abs(p - pagination.page) <= 1
                  );
                })
                .map((p, idx, arr) => {
                  const prevP = arr[idx - 1];
                  const hasGap = prevP && p - prevP > 1;

                  return (
                    <React.Fragment key={p}>
                      {hasGap && <span className="px-1 text-muted">...</span>}
                      <button
                        type="button"
                        className={
                          p === pagination.page ? "zen-btn-primary" : "zen-btn-secondary"
                        }
                        onClick={() => setCurrentPage(p)}
                        style={{
                          minWidth: "34px",
                          padding: "4px 8px",
                          fontSize: "13px",
                        }}
                      >
                        {p}
                      </button>
                    </React.Fragment>
                  );
                })}

              <button
                type="button"
                className="zen-btn-secondary"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => setCurrentPage((p) => Math.min(p + 1, pagination.totalPages))}
                style={{ padding: "4px 10px", fontSize: "13px" }}
                aria-label="Next page"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
