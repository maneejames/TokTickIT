import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState, useEffect, useCallback } from "react";
import { getCategories, getTickets, } from "../api.js";
export const MyTickets = ({ currentRequester, onNavigateToCreateTicket, onNavigateToTicketDetail, }) => {
    // Reference data
    const [categories, setCategories] = useState([]);
    // Ticket data & pagination
    const [tickets, setTickets] = useState([]);
    const [pagination, setPagination] = useState({
        page: 1,
        pageSize: 10,
        totalItems: 0,
        totalPages: 1,
    });
    // Filter & search states
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("");
    const [selectedPriority, setSelectedPriority] = useState("");
    const [selectedStatus, setSelectedStatus] = useState("");
    const [sortBy, setSortBy] = useState("createdAt");
    const [sortOrder, setSortOrder] = useState("desc");
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    // Status/Feedback states
    const [isLoading, setIsLoading] = useState(true);
    const [apiError, setApiError] = useState(null);
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
            if (isMounted)
                setCategories(cats);
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
            const response = await getTickets({
                search: debouncedSearch || undefined,
                categoryId: selectedCategory ? Number(selectedCategory) : undefined,
                priority: selectedPriority || undefined,
                status: selectedStatus || undefined,
                sortBy,
                sortOrder,
                page: currentPage,
                pageSize,
            }, currentRequester.id);
            setTickets(response.items);
            setPagination(response.pagination);
        }
        catch (err) {
            setApiError(err instanceof Error ? err.message : "Failed to load tickets");
        }
        finally {
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
    const handleSortToggle = (field) => {
        if (sortBy === field) {
            // Toggle order
            setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
        }
        else {
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
    const formatDate = (isoString) => {
        try {
            const date = new Date(isoString);
            const day = String(date.getDate()).padStart(2, "0");
            const month = String(date.getMonth() + 1).padStart(2, "0");
            const year = date.getFullYear();
            const hours = String(date.getHours()).padStart(2, "0");
            const minutes = String(date.getMinutes()).padStart(2, "0");
            return `${day}/${month}/${year} ${hours}:${minutes}`;
        }
        catch {
            return isoString;
        }
    };
    // Priority Badge helper
    const renderPriorityBadge = (priority) => {
        let bg = "#FEF8E8";
        let color = "#8F6500";
        let border = "1px solid #F5DE9C";
        if (priority === "LOW") {
            bg = "#F0F4F2";
            color = "#375043";
            border = "1px solid #D1DDD5";
        }
        else if (priority === "HIGH") {
            bg = "#FDF2F2";
            color = "#B3261E";
            border = "1px solid #F8B4B4";
        }
        return (_jsx("span", { style: {
                backgroundColor: bg,
                color,
                border,
                borderRadius: "12px",
                padding: "2px 8px",
                fontSize: "12px",
                fontWeight: 600,
                display: "inline-block",
            }, children: priority }));
    };
    // Status Badge helper
    const renderStatusBadge = (status) => {
        return (_jsx("span", { style: {
                backgroundColor: "var(--color-pale-green)",
                color: "var(--color-primary-green)",
                border: "1px solid #B8E2CB",
                borderRadius: "12px",
                padding: "2px 8px",
                fontSize: "12px",
                fontWeight: 600,
                display: "inline-block",
            }, children: status }));
    };
    // Sort indicator helper
    const renderSortIndicator = (field) => {
        if (sortBy !== field) {
            return _jsx("span", { style: { color: "#AAA", marginLeft: "4px", fontSize: "11px" }, children: "\u2195" });
        }
        return (_jsx("span", { style: { color: "var(--color-primary-green)", marginLeft: "4px", fontSize: "11px" }, children: sortOrder === "asc" ? "▲" : "▼" }));
    };
    // Whether user has active filters applied
    const hasActiveFilters = Boolean(search || selectedCategory || selectedPriority || selectedStatus);
    return (_jsxs("div", { className: "container py-4", style: { maxWidth: "1140px" }, children: [_jsxs("div", { className: "d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4", children: [_jsxs("div", { children: [_jsx("h1", { className: "h3 mb-1", style: { color: "var(--color-primary-green)", fontWeight: 700 }, children: "My Tickets" }), _jsx("p", { className: "text-muted small mb-0", children: "View and track your submitted IT support requests" })] }), _jsx("button", { type: "button", className: "zen-btn-primary d-inline-flex align-items-center justify-content-center gap-1", onClick: onNavigateToCreateTicket, style: { whiteSpace: "nowrap" }, children: _jsx("span", { children: "+ New Ticket" }) })] }), _jsx("div", { className: "zen-card p-3 mb-4", style: { backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)" }, children: _jsxs("div", { className: "row g-3 align-items-end", children: [_jsxs("div", { className: "col-12 col-md-4", children: [_jsx("label", { htmlFor: "ticket-search-input", className: "form-label mb-1", style: { fontSize: "13px", fontWeight: 600, color: "var(--color-text-main)" }, children: "Search" }), _jsxs("div", { className: "position-relative", children: [_jsx("input", { id: "ticket-search-input", type: "text", className: "zen-input", placeholder: "Search by summary or ticket #...", value: search, onChange: (e) => setSearch(e.target.value), style: { paddingRight: search ? "32px" : "12px" } }), search && (_jsx("button", { type: "button", "aria-label": "Clear search text", onClick: () => setSearch(""), style: {
                                                position: "absolute",
                                                right: "8px",
                                                top: "50%",
                                                transform: "translateY(-50%)",
                                                background: "none",
                                                border: "none",
                                                color: "#888",
                                                cursor: "pointer",
                                                padding: "2px 6px",
                                            }, children: "\u2715" }))] })] }), _jsxs("div", { className: "col-12 col-sm-6 col-md-3", children: [_jsx("label", { htmlFor: "ticket-category-filter", className: "form-label mb-1", style: { fontSize: "13px", fontWeight: 600, color: "var(--color-text-main)" }, children: "Category Filter" }), _jsxs("select", { id: "ticket-category-filter", "aria-label": "Category Filter", className: "zen-select", value: selectedCategory, onChange: (e) => {
                                        setSelectedCategory(e.target.value);
                                        setCurrentPage(1);
                                    }, children: [_jsx("option", { value: "", children: "All Categories" }), categories.map((cat) => (_jsx("option", { value: cat.id, children: cat.name }, cat.id)))] })] }), _jsxs("div", { className: "col-12 col-sm-6 col-md-2", children: [_jsx("label", { htmlFor: "ticket-priority-filter", className: "form-label mb-1", style: { fontSize: "13px", fontWeight: 600, color: "var(--color-text-main)" }, children: "Priority Filter" }), _jsxs("select", { id: "ticket-priority-filter", "aria-label": "Priority Filter", className: "zen-select", value: selectedPriority, onChange: (e) => {
                                        setSelectedPriority(e.target.value);
                                        setCurrentPage(1);
                                    }, children: [_jsx("option", { value: "", children: "All Priorities" }), _jsx("option", { value: "LOW", children: "Low" }), _jsx("option", { value: "MEDIUM", children: "Medium" }), _jsx("option", { value: "HIGH", children: "High" })] })] }), _jsxs("div", { className: "col-12 col-sm-6 col-md-2", children: [_jsx("label", { htmlFor: "ticket-status-filter", className: "form-label mb-1", style: { fontSize: "13px", fontWeight: 600, color: "var(--color-text-main)" }, children: "Status Filter" }), _jsxs("select", { id: "ticket-status-filter", "aria-label": "Status Filter", className: "zen-select", value: selectedStatus, onChange: (e) => {
                                        setSelectedStatus(e.target.value);
                                        setCurrentPage(1);
                                    }, children: [_jsx("option", { value: "", children: "All Statuses" }), _jsx("option", { value: "NEW", children: "New" })] })] }), _jsx("div", { className: "col-12 col-md-1 d-flex justify-content-md-end", children: hasActiveFilters && tickets.length > 0 && (_jsx("button", { type: "button", className: "zen-btn-secondary w-100", onClick: handleClearFilters, children: "Clear" })) })] }) }), isLoading ? (
            // Loading State
            _jsxs("div", { className: "zen-card p-5 text-center my-4", children: [_jsx("div", { className: "spinner-border", style: { color: "var(--color-primary-green)" }, role: "status", children: _jsx("span", { className: "visually-hidden", children: "Loading tickets..." }) }), _jsx("p", { className: "mt-3 text-muted mb-0", children: "Loading your tickets..." })] })) : apiError ? (
            // API Failure State
            _jsxs("div", { className: "zen-card p-4 my-4", role: "alert", children: [_jsxs("div", { className: "alert mb-3", style: {
                            backgroundColor: "var(--color-error-bg)",
                            color: "var(--color-error)",
                            border: "1px solid #F8B4B4",
                        }, children: [_jsx("strong", { children: "Error:" }), " ", apiError] }), _jsx("div", { className: "text-center", children: _jsx("button", { type: "button", className: "zen-btn-primary", onClick: fetchTickets, children: "Retry" }) })] })) : tickets.length === 0 ? (hasActiveFilters ? (
            // No Results State (Requester has tickets, but search/filter matched none)
            _jsxs("div", { className: "zen-card p-5 text-center my-4", children: [_jsx("div", { style: { fontSize: "42px", color: "var(--color-text-muted)" }, children: "\uD83D\uDD0D" }), _jsx("h2", { className: "h5 fw-bold mt-3", style: { color: "var(--color-text-main)" }, children: "No tickets match your search criteria." }), _jsx("p", { className: "text-muted small mt-1 mb-4", children: "Try adjusting your search query, clearing filters, or checking for typos." }), _jsx("button", { type: "button", className: "zen-btn-secondary", onClick: handleClearFilters, children: "Clear Filters" })] })) : (
            // Empty State (Requester has zero tickets ever created)
            _jsxs("div", { className: "zen-card p-5 text-center my-4", children: [_jsx("div", { style: { fontSize: "48px", color: "var(--color-secondary-green)" }, children: "\uD83D\uDCCB" }), _jsx("h2", { className: "h5 fw-bold mt-3", style: { color: "var(--color-primary-green)" }, children: "You haven't submitted any tickets yet." }), _jsx("p", { className: "text-muted small mt-1 mb-4", children: "Need assistance? Submit your first IT support request now." }), _jsx("button", { type: "button", className: "zen-btn-primary", onClick: onNavigateToCreateTicket, children: "Create Ticket" })] }))) : (
            // Results Listing: Desktop Table (≥992px) and Mobile Cards (<768px)
            _jsxs("div", { children: [_jsx("div", { className: "d-none d-lg-block zen-card overflow-hidden mb-4", "data-testid": "tickets-table", children: _jsx("div", { className: "table-responsive", children: _jsxs("table", { className: "table table-hover align-middle mb-0", style: { borderCollapse: "collapse" }, children: [_jsx("thead", { style: { backgroundColor: "#F9FAF9", borderBottom: "2px solid var(--color-border)" }, children: _jsxs("tr", { children: [_jsx("th", { scope: "col", style: { width: "160px", padding: "12px 16px" }, children: "Ticket #" }), _jsxs("th", { scope: "col", onClick: () => handleSortToggle("summary"), style: { cursor: "pointer", userSelect: "none", padding: "12px 16px" }, children: ["Summary ", renderSortIndicator("summary")] }), _jsx("th", { scope: "col", style: { width: "150px", padding: "12px 16px" }, children: "Category" }), _jsxs("th", { scope: "col", onClick: () => handleSortToggle("requestedPriority"), style: {
                                                        cursor: "pointer",
                                                        userSelect: "none",
                                                        width: "110px",
                                                        padding: "12px 16px",
                                                    }, children: ["Priority ", renderSortIndicator("requestedPriority")] }), _jsxs("th", { scope: "col", onClick: () => handleSortToggle("status"), style: {
                                                        cursor: "pointer",
                                                        userSelect: "none",
                                                        width: "90px",
                                                        padding: "12px 16px",
                                                    }, children: ["Status ", renderSortIndicator("status")] }), _jsx("th", { scope: "col", style: { width: "110px", padding: "12px 16px" }, children: "Attachments" }), _jsxs("th", { scope: "col", onClick: () => handleSortToggle("createdAt"), style: {
                                                        cursor: "pointer",
                                                        userSelect: "none",
                                                        width: "150px",
                                                        padding: "12px 16px",
                                                    }, children: ["Date Created ", renderSortIndicator("createdAt")] }), _jsx("th", { scope: "col", style: { width: "80px", textAlign: "center", padding: "12px 16px" }, children: "Action" })] }) }), _jsx("tbody", { children: tickets.map((t) => (_jsxs("tr", { style: { cursor: "pointer" }, onClick: () => onNavigateToTicketDetail?.(t.id), children: [_jsx("td", { style: { padding: "14px 16px" }, children: _jsx("a", { href: `/tickets/${t.id}`, onClick: (e) => {
                                                            e.preventDefault();
                                                            onNavigateToTicketDetail?.(t.id);
                                                        }, style: {
                                                            fontFamily: "monospace",
                                                            fontWeight: 600,
                                                            color: "var(--color-secondary-green)",
                                                            textDecoration: "none",
                                                        }, children: t.ticketNumber }) }), _jsx("td", { style: {
                                                        padding: "14px 16px",
                                                        maxWidth: "280px",
                                                        whiteSpace: "nowrap",
                                                        overflow: "hidden",
                                                        textOverflow: "ellipsis",
                                                    }, title: t.summary, children: t.summary.length > 40 ? `${t.summary.slice(0, 40)}…` : t.summary }), _jsx("td", { style: { padding: "14px 16px", color: "var(--color-text-main)" }, children: t.category?.name || "—" }), _jsx("td", { style: { padding: "14px 16px" }, children: renderPriorityBadge(t.requestedPriority) }), _jsx("td", { style: { padding: "14px 16px" }, children: renderStatusBadge(t.currentStatus) }), _jsxs("td", { style: { padding: "14px 16px", color: "var(--color-text-muted)" }, children: ["\uD83D\uDCCE ", t._count?.attachments ?? 0] }), _jsx("td", { style: { padding: "14px 16px", fontSize: "13px", color: "var(--color-text-muted)" }, children: formatDate(t.createdAt) }), _jsx("td", { style: { padding: "14px 16px", textAlign: "center" }, children: _jsx("a", { href: `/tickets/${t.id}`, className: "zen-btn-secondary", onClick: (e) => {
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                            onNavigateToTicketDetail?.(t.id);
                                                        }, style: {
                                                            padding: "4px 10px",
                                                            fontSize: "12px",
                                                            textDecoration: "none",
                                                            display: "inline-block",
                                                        }, children: "View" }) })] }, t.id))) })] }) }) }), _jsx("div", { className: "d-lg-none d-flex flex-column gap-3 mb-4", "data-testid": "tickets-mobile-cards", children: tickets.map((t) => (_jsxs("div", { className: "zen-card p-3", style: { cursor: "pointer" }, onClick: () => onNavigateToTicketDetail?.(t.id), children: [_jsxs("div", { className: "d-flex justify-content-between align-items-center mb-2", children: [_jsx("span", { style: {
                                                fontFamily: "monospace",
                                                fontWeight: 700,
                                                color: "var(--color-secondary-green)",
                                                fontSize: "14px",
                                            }, children: t.ticketNumber }), _jsx("div", { children: renderStatusBadge(t.currentStatus) })] }), _jsx("div", { className: "fw-bold mb-2", style: { color: "var(--color-text-main)", fontSize: "15px" }, children: t.summary }), _jsxs("div", { className: "d-flex align-items-center gap-2 mb-3 small", children: [_jsx("span", { className: "text-muted", children: t.category?.name || "General" }), _jsx("span", { className: "text-muted", children: "\u2022" }), _jsx("span", { children: renderPriorityBadge(t.requestedPriority) })] }), _jsxs("div", { className: "d-flex justify-content-between align-items-center pt-2 border-top text-muted small mb-2", children: [_jsx("span", { children: formatDate(t.createdAt) }), _jsxs("span", { children: ["\uD83D\uDCCE ", t._count?.attachments ?? 0] })] }), _jsx("a", { href: `/tickets/${t.id}`, className: "zen-btn-secondary w-100 text-center text-decoration-none d-block py-2", onClick: (e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        onNavigateToTicketDetail?.(t.id);
                                    }, style: { fontSize: "13px" }, children: "View Details" })] }, t.id))) }), _jsxs("div", { className: "d-flex flex-column flex-sm-row justify-content-between align-items-center gap-3 pt-2", children: [_jsxs("div", { className: "text-muted small", children: ["Showing ", (pagination.page - 1) * pagination.pageSize + 1, " to", " ", Math.min(pagination.page * pagination.pageSize, pagination.totalItems), " of", " ", pagination.totalItems, " tickets"] }), _jsxs("div", { className: "d-flex align-items-center gap-1", children: [_jsx("button", { type: "button", className: "zen-btn-secondary", disabled: pagination.page <= 1, onClick: () => setCurrentPage((p) => Math.max(p - 1, 1)), style: { padding: "4px 10px", fontSize: "13px" }, "aria-label": "Previous page", children: "Previous" }), Array.from({ length: pagination.totalPages }, (_, idx) => idx + 1)
                                        .filter((p) => {
                                        // Only show current page, 1, total, and pages close to current
                                        return (p === 1 ||
                                            p === pagination.totalPages ||
                                            Math.abs(p - pagination.page) <= 1);
                                    })
                                        .map((p, idx, arr) => {
                                        const prevP = arr[idx - 1];
                                        const hasGap = prevP && p - prevP > 1;
                                        return (_jsxs(React.Fragment, { children: [hasGap && _jsx("span", { className: "px-1 text-muted", children: "..." }), _jsx("button", { type: "button", className: p === pagination.page ? "zen-btn-primary" : "zen-btn-secondary", onClick: () => setCurrentPage(p), style: {
                                                        minWidth: "34px",
                                                        padding: "4px 8px",
                                                        fontSize: "13px",
                                                    }, children: p })] }, p));
                                    }), _jsx("button", { type: "button", className: "zen-btn-secondary", disabled: pagination.page >= pagination.totalPages, onClick: () => setCurrentPage((p) => Math.min(p + 1, pagination.totalPages)), style: { padding: "4px 10px", fontSize: "13px" }, "aria-label": "Next page", children: "Next" })] })] })] }))] }));
};
