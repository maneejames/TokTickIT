import React, { useState, useEffect, useCallback } from "react";
import {
  User,
  RequesterDashboardResponse,
  RequesterDashboardTicketItem,
  getRequesterDashboard,
} from "../api.js";

export interface RequesterDashboardProps {
  currentRequester: User;
  onDrillDownToMyTickets?: (drillDown: { status: string }) => void;
  onNavigateToMyTickets?: () => void;
  onNavigateToCreateTicket?: () => void;
  onNavigateToTicketDetail?: (ticketId: number) => void;
  onNavigateHome?: () => void;
}

const formatBangkokTimestamp = (isoString: string): string => {
  try {
    return new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Bangkok",
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date(isoString));
  } catch {
    return isoString;
  }
};

const formatStatusLabel = (status: string): string => {
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

export const RequesterDashboard: React.FC<RequesterDashboardProps> = ({
  currentRequester,
  onDrillDownToMyTickets,
  onNavigateToMyTickets,
  onNavigateToCreateTicket,
  onNavigateToTicketDetail,
  onNavigateHome,
}) => {
  const [data, setData] = useState<RequesterDashboardResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isForbidden, setIsForbidden] = useState<boolean>(
    currentRequester.role !== "REQUESTER"
  );

  const firstName = currentRequester.name.split(" ")[0] || currentRequester.name;

  const fetchDashboard = useCallback(async (isRefreshCall = false) => {
    if (isRefreshCall) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);

    try {
      const response = await getRequesterDashboard();
      setData(response);
      setIsForbidden(false);
    } catch (err: any) {
      if (err?.status === 403 || err?.message === "FORBIDDEN") {
        setIsForbidden(true);
      } else {
        setError(err instanceof Error ? err.message : "Failed to load dashboard");
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (currentRequester.role !== "REQUESTER") {
      setIsForbidden(true);
      setIsLoading(false);
      return;
    }
    fetchDashboard(false);
  }, [currentRequester.role, fetchDashboard]);

  const handleCardDrillDown = (drillDown: { status: string }) => {
    if (onDrillDownToMyTickets) {
      onDrillDownToMyTickets(drillDown);
    } else {
      window.history.pushState(
        null,
        "",
        `/tickets?status=${encodeURIComponent(drillDown.status)}`
      );
      onNavigateToMyTickets?.();
    }
  };

  // 1. Forbidden State (403)
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
            aria-hidden="true"
          >
            ✕
          </div>
          <h2 className="h4 mb-2" style={{ color: "#991B1B", fontWeight: 700 }}>
            Access Forbidden
          </h2>
          <p className="text-muted mb-4">
            This dashboard is available only to Requesters. Please return to your allowed workspace.
          </p>
          {onNavigateHome && (
            <button type="button" className="zen-btn-primary" onClick={onNavigateHome}>
              Return to Allowed Home
            </button>
          )}
        </div>
      </div>
    );
  }

  // 2. Initial Loading State (shimmer / skeleton with aria-busy="true")
  if (isLoading && !data) {
    return (
      <div
        className="container py-4"
        style={{ maxWidth: "1140px" }}
        data-testid="requester-dashboard-loading"
        aria-busy="true"
        aria-live="polite"
      >
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h1 className="h3 mb-1" style={{ color: "var(--color-primary-green)", fontWeight: 700 }}>
              Welcome, {firstName}
            </h1>
            <p className="text-muted small mb-0">Loading your dashboard metrics...</p>
          </div>
        </div>
        <div className="row g-3 mb-4">
          {[1, 2, 3, 4].map((idx) => (
            <div key={idx} className="col-6 col-md-4 col-lg-3">
              <div
                className="zen-card p-3"
                style={{
                  minHeight: "116px",
                  backgroundColor: "#F3F4F6",
                  border: "1px solid var(--color-border)",
                }}
              />
            </div>
          ))}
        </div>
        <div className="row g-4">
          {[1, 2].map((idx) => (
            <div key={idx} className="col-12 col-lg-6">
              <div
                className="zen-card p-4"
                style={{
                  minHeight: "220px",
                  backgroundColor: "#F3F4F6",
                  border: "1px solid var(--color-border)",
                }}
              />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const renderMetricCard = (
    label: string,
    metric: { count: number; drillDown: { status: string } },
    options?: { isAttention?: boolean; testId?: string }
  ) => {
    const count = metric.count;
    const isZero = count === 0;
    const showAttention = Boolean(options?.isAttention && count > 0);
    const accessibleName = `${label}: ${count}. View in My Tickets.`;

    const cardContent = (
      <div className="d-flex flex-column justify-content-between h-100">
        <div>
          <div
            className="d-flex justify-content-between align-items-start gap-2 mb-1"
            style={{
              fontSize: "13px",
              fontWeight: 600,
              color: isZero ? "var(--color-text-muted)" : "var(--color-text-main)",
            }}
          >
            <span>{label}</span>
            {showAttention && (
              <span
                style={{
                  backgroundColor: "#FEF3C7",
                  color: "#92400E",
                  border: "1px solid #FCD34D",
                  borderRadius: "999px",
                  padding: "2px 8px",
                  fontSize: "11px",
                  fontWeight: 700,
                  whiteSpace: "nowrap",
                }}
              >
                ⚠️ Needs your attention
              </span>
            )}
          </div>
          <div
            style={{
              fontSize: "28px",
              fontWeight: 700,
              color: isZero
                ? "#9CA3AF"
                : showAttention
                ? "#B45309"
                : "var(--color-primary-green)",
              lineHeight: 1.2,
              marginTop: "6px",
            }}
          >
            {count}
          </div>
        </div>

        <div className="mt-3 pt-2 border-top d-flex justify-content-between align-items-center">
          {isZero ? (
            <span style={{ fontSize: "12px", color: "#9CA3AF" }}>No tickets</span>
          ) : (
            <span
              style={{
                fontSize: "12px",
                fontWeight: 600,
                color: "var(--color-primary-green)",
                textDecoration: "underline",
              }}
            >
              View →
            </span>
          )}
        </div>
      </div>
    );

    if (isZero) {
      return (
        <div
          data-testid={options?.testId}
          className="zen-card p-3 h-100"
          style={{
            backgroundColor: "#F9FAFB",
            border: "1px solid var(--color-border)",
            color: "var(--color-text-muted)",
          }}
        >
          {cardContent}
        </div>
      );
    }

    return (
      <a
        href={`/tickets?status=${encodeURIComponent(metric.drillDown.status)}`}
        role="link"
        tabIndex={0}
        aria-label={accessibleName}
        data-testid={options?.testId}
        onClick={(e) => {
          e.preventDefault();
          handleCardDrillDown(metric.drillDown);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleCardDrillDown(metric.drillDown);
          }
        }}
        className="zen-card p-3 h-100 d-block text-decoration-none"
        style={{
          backgroundColor: showAttention ? "#FFFBEB" : "var(--color-surface)",
          border: showAttention ? "2px solid #F59E0B" : "1px solid var(--color-border)",
          cursor: "pointer",
          transition: "box-shadow 0.15s ease",
        }}
      >
        {cardContent}
      </a>
    );
  };

  const renderTicketRow = (item: RequesterDashboardTicketItem) => (
    <div
      key={item.id}
      role="button"
      tabIndex={0}
      onClick={() => onNavigateToTicketDetail?.(item.id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onNavigateToTicketDetail?.(item.id);
        }
      }}
      className="p-3 border-bottom d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-2"
      style={{ cursor: "pointer", minHeight: "48px" }}
    >
      <div style={{ minWidth: 0, flex: 1 }}>
        <div className="d-flex align-items-center gap-2 mb-1 flex-wrap">
          <span
            style={{
              fontFamily: "monospace",
              fontWeight: 700,
              color: "var(--color-primary-green)",
              fontSize: "13px",
            }}
          >
            {item.ticketNumber}
          </span>
          <span
            style={{
              backgroundColor: "var(--color-pale-green)",
              color: "var(--color-primary-green)",
              border: "1px solid #B8E2CB",
              borderRadius: "12px",
              padding: "2px 8px",
              fontSize: "11px",
              fontWeight: 600,
            }}
          >
            {formatStatusLabel(item.status)}
          </span>
        </div>
        <div
          title={item.summary}
          style={{
            fontSize: "14px",
            fontWeight: 500,
            color: "var(--color-text-main)",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {item.summary}
        </div>
      </div>
      <div
        style={{
          fontSize: "12px",
          color: "var(--color-text-muted)",
          whiteSpace: "nowrap",
        }}
      >
        {formatBangkokTimestamp(item.updatedAt)}
      </div>
    </div>
  );

  return (
    <div
      className="container py-4"
      style={{ maxWidth: "1140px" }}
      aria-busy={isRefreshing ? "true" : "false"}
      data-testid="requester-dashboard"
    >
      {/* Page Header */}
      <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-3 mb-4">
        <div>
          <h1 className="h3 mb-1" style={{ color: "var(--color-primary-green)", fontWeight: 700 }}>
            Welcome, {firstName}
          </h1>
          <p className="text-muted small mb-0">
            Quick overview of your IT support requests and recent updates
          </p>
        </div>

        <div className="d-flex align-items-center gap-2 flex-wrap">
          <button
            type="button"
            className="zen-btn-secondary"
            disabled={isRefreshing || isLoading}
            onClick={() => fetchDashboard(true)}
            style={{ minHeight: "40px" }}
          >
            {isRefreshing ? "Refreshing..." : "Refresh"}
          </button>
          <button
            type="button"
            className="zen-btn-secondary"
            onClick={onNavigateToMyTickets}
            style={{ minHeight: "40px" }}
          >
            View My Tickets
          </button>
          <button
            type="button"
            className="zen-btn-primary"
            onClick={onNavigateToCreateTicket}
            style={{ minHeight: "40px" }}
          >
            + Create Ticket
          </button>
        </div>
      </div>

      {/* Inline Failure Alert (keeps previously loaded data if present) */}
      {error && (
        <div
          role="alert"
          className="zen-card p-3 mb-4 d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-3"
          style={{
            backgroundColor: "#FEF2F2",
            border: "1px solid #FCA5A5",
            color: "#991B1B",
          }}
        >
          <div>
            <strong>We couldn&apos;t load the dashboard.</strong>{" "}
            <span className="small">{error}</span>
          </div>
          <button
            type="button"
            className="zen-btn-primary"
            onClick={() => fetchDashboard(Boolean(data))}
            style={{ minHeight: "40px", whiteSpace: "nowrap" }}
          >
            Retry
          </button>
        </div>
      )}

      {data && (
        <>
          {/* 4 Metric Cards Row */}
          <div className="row g-3 mb-4">
            <div className="col-6 col-md-4 col-lg-3">
              {renderMetricCard("Active Tickets", data.metrics.activeTickets, {
                testId: "req-card-active",
              })}
            </div>
            <div className="col-6 col-md-4 col-lg-3">
              {renderMetricCard("Waiting for You", data.metrics.waitingForRequester, {
                isAttention: true,
                testId: "req-card-waiting",
              })}
            </div>
            <div className="col-6 col-md-4 col-lg-3">
              {renderMetricCard("Resolved", data.metrics.resolved, {
                testId: "req-card-resolved",
              })}
            </div>
            <div className="col-6 col-md-4 col-lg-3">
              {renderMetricCard("Closed", data.metrics.closed, {
                testId: "req-card-closed",
              })}
            </div>
          </div>

          {/* Two-Column Recent Lists */}
          <div className="row g-4">
            {/* Recently Updated (max 5) */}
            <div className="col-12 col-lg-6">
              <div
                className="zen-card h-100 overflow-hidden"
                style={{
                  backgroundColor: "var(--color-surface)",
                  border: "1px solid var(--color-border)",
                }}
              >
                <div
                  className="p-3 border-bottom d-flex justify-content-between align-items-center"
                  style={{ backgroundColor: "#F9FAFB" }}
                >
                  <h2 className="h6 mb-0 fw-bold" style={{ color: "var(--color-text-main)" }}>
                    Recently Updated (Last 7 Days)
                  </h2>
                  <span className="badge bg-light text-dark border">
                    {data.recentlyUpdated.length}
                  </span>
                </div>
                {data.recentlyUpdated.length === 0 ? (
                  <div className="p-4 text-center text-muted">
                    <p className="fw-semibold mb-1">Nothing to show yet.</p>
                    <p className="small mb-0">
                      Tickets updated within the last 7 days will appear here.
                    </p>
                  </div>
                ) : (
                  <div>{data.recentlyUpdated.map(renderTicketRow)}</div>
                )}
              </div>
            </div>

            {/* Recently Resolved (max 5) */}
            <div className="col-12 col-lg-6">
              <div
                className="zen-card h-100 overflow-hidden"
                style={{
                  backgroundColor: "var(--color-surface)",
                  border: "1px solid var(--color-border)",
                }}
              >
                <div
                  className="p-3 border-bottom d-flex justify-content-between align-items-center"
                  style={{ backgroundColor: "#F9FAFB" }}
                >
                  <h2 className="h6 mb-0 fw-bold" style={{ color: "var(--color-text-main)" }}>
                    Recently Resolved (Last 7 Days)
                  </h2>
                  <span className="badge bg-light text-dark border">
                    {data.recentlyResolved.length}
                  </span>
                </div>
                {data.recentlyResolved.length === 0 ? (
                  <div className="p-4 text-center text-muted">
                    <p className="fw-semibold mb-1">Nothing to show yet.</p>
                    <p className="small mb-0">
                      Tickets resolved within the last 7 days will appear here.
                    </p>
                  </div>
                ) : (
                  <div>{data.recentlyResolved.map(renderTicketRow)}</div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
