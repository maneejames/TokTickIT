import React, { useState, useEffect, useCallback } from "react";
import {
  User,
  StaffDashboardResponse,
  getStaffDashboard,
  getAdminUsers,
} from "../api.js";

export interface StaffDashboardProps {
  currentUser: User;
  onDrillDownToQueue?: (drillDown: {
    status?: string;
    ownerId?: string | number;
    priority?: string;
    requesterResolved?: boolean;
  }) => void;
  onOpenQueue?: () => void;
  onCreateTicket?: () => void;
  onOpenTicket?: (ticketId: number) => void;
  onOpenUserManagement?: () => void;
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

export const StaffDashboard: React.FC<StaffDashboardProps> = ({
  currentUser,
  onDrillDownToQueue,
  onOpenQueue,
  onCreateTicket,
  onOpenTicket,
  onOpenUserManagement,
  onNavigateHome,
}) => {
  const [data, setData] = useState<StaffDashboardResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isForbidden, setIsForbidden] = useState<boolean>(
    currentUser.role !== "IT_STAFF" && currentUser.role !== "ADMINISTRATOR"
  );
  const [activeListTab, setActiveListTab] = useState<"urgent" | "recent">("urgent");
  const [userCounts, setUserCounts] = useState<{ active: number; inactive: number } | null>(null);

  const firstName = currentUser.name.split(" ")[0] || currentUser.name;

  const fetchDashboard = useCallback(
    async (isRefreshCall = false) => {
      if (isRefreshCall) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      try {
        const response = await getStaffDashboard();
        setData(response);
        setIsForbidden(false);

        if (currentUser.role === "ADMINISTRATOR") {
          getAdminUsers()
            .then((users) => {
              const active = users.filter((u) => u.isActive).length;
              const inactive = users.filter((u) => !u.isActive).length;
              setUserCounts({ active, inactive });
            })
            .catch(() => {});
        }
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
    },
    [currentUser.role]
  );

  useEffect(() => {
    if (currentUser.role !== "IT_STAFF" && currentUser.role !== "ADMINISTRATOR") {
      setIsForbidden(true);
      setIsLoading(false);
      return;
    }
    fetchDashboard(false);
  }, [currentUser.role, fetchDashboard]);

  const buildQueueUrl = (drillDown: Record<string, string | number | boolean>) => {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(drillDown)) {
      if (v !== undefined) params.set(k, String(v));
    }
    const qs = params.toString();
    return `/staff/queue${qs ? `?${qs}` : ""}`;
  };

  const handleCardDrillDown = (drillDown: {
    status?: string;
    ownerId?: string | number;
    priority?: string;
    requesterResolved?: boolean;
  }) => {
    if (onDrillDownToQueue) {
      onDrillDownToQueue(drillDown);
    } else {
      window.history.pushState(null, "", buildQueueUrl(drillDown as any));
      onOpenQueue?.();
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
            You do not have permission to view the IT Staff dashboard.
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
        style={{ maxWidth: "1280px" }}
        data-testid="staff-dashboard-loading"
        aria-busy="true"
        aria-live="polite"
      >
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h1 className="h3 mb-1" style={{ color: "var(--color-primary-green)", fontWeight: 700 }}>
              Welcome back, {firstName}
            </h1>
            <p className="text-muted small mb-0">Loading service desk overview...</p>
          </div>
        </div>
        <div className="row g-3 mb-4">
          {[1, 2, 3, 4, 5].map((idx) => (
            <div key={idx} className="col-6 col-md-4 col-lg">
              <div
                className="zen-card p-3"
                style={{
                  minHeight: "110px",
                  backgroundColor: "#F3F4F6",
                  border: "1px solid var(--color-border)",
                }}
              />
            </div>
          ))}
        </div>
        <div className="row g-3 mb-4">
          {[1, 2, 3].map((idx) => (
            <div key={idx} className="col-6 col-md-4">
              <div
                className="zen-card p-3"
                style={{
                  minHeight: "96px",
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

  const renderPrimaryMetricCard = (
    displayLabel: string,
    accessiblePrefix: string,
    metric: { count: number; drillDown: Record<string, any> },
    testId?: string
  ) => {
    const count = metric.count;
    const isZero = count === 0;
    const accessibleName = `${accessiblePrefix}: ${count}. View in queue.`;

    const inner = (
      <div className="d-flex flex-column justify-content-between h-100">
        <div>
          <div
            style={{
              fontSize: "13px",
              fontWeight: 600,
              color: isZero ? "var(--color-text-muted)" : "var(--color-text-main)",
            }}
          >
            {displayLabel}
          </div>
          <div
            style={{
              fontSize: "28px",
              fontWeight: 700,
              color: isZero ? "#9CA3AF" : "var(--color-primary-green)",
              lineHeight: 1.2,
              marginTop: "6px",
            }}
          >
            {count}
          </div>
        </div>
        <div className="mt-3 pt-2 border-top d-flex justify-content-between align-items-center">
          {isZero ? (
            <span style={{ fontSize: "12px", color: "#9CA3AF" }}>0 tickets</span>
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
          data-testid={testId}
          className="zen-card p-3 h-100"
          style={{
            backgroundColor: "#F9FAFB",
            border: "1px solid var(--color-border)",
            color: "var(--color-text-muted)",
          }}
        >
          {inner}
        </div>
      );
    }

    return (
      <a
        href={buildQueueUrl(metric.drillDown)}
        role="link"
        tabIndex={0}
        aria-label={accessibleName}
        data-testid={testId}
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
          backgroundColor: "var(--color-surface)",
          border: "1px solid var(--color-border)",
          cursor: "pointer",
        }}
      >
        {inner}
      </a>
    );
  };

  const renderAttentionCard = (
    displayLabel: string,
    metric: { count: number; drillDown: Record<string, any> },
    options?: { accentColor?: string; accentBg?: string; testId?: string }
  ) => {
    const count = metric.count;
    const isZero = count === 0;
    const accessibleName = `${displayLabel}: ${count}. View in queue.`;

    const inner = (
      <div className="d-flex justify-content-between align-items-center gap-2 h-100">
        <div>
          <div
            style={{
              fontSize: "13px",
              fontWeight: 600,
              color: isZero ? "var(--color-text-muted)" : "var(--color-text-main)",
            }}
          >
            {displayLabel}
          </div>
          <div className="mt-1">
            {isZero ? (
              <span style={{ fontSize: "12px", color: "#9CA3AF" }}>None pending</span>
            ) : (
              <span
                style={{
                  fontSize: "12px",
                  fontWeight: 600,
                  color: options?.accentColor || "var(--color-primary-green)",
                  textDecoration: "underline",
                }}
              >
                View in queue →
              </span>
            )}
          </div>
        </div>
        <div
          style={{
            fontSize: "24px",
            fontWeight: 700,
            color: isZero
              ? "#9CA3AF"
              : options?.accentColor || "var(--color-primary-green)",
          }}
        >
          {count}
        </div>
      </div>
    );

    if (isZero) {
      return (
        <div
          data-testid={testIdOrUndefined(options?.testId)}
          className="zen-card p-3 h-100"
          style={{
            backgroundColor: "#F9FAFB",
            border: "1px solid var(--color-border)",
            color: "var(--color-text-muted)",
          }}
        >
          {inner}
        </div>
      );
    }

    return (
      <a
        href={buildQueueUrl(metric.drillDown)}
        role="link"
        tabIndex={0}
        aria-label={accessibleName}
        data-testid={testIdOrUndefined(options?.testId)}
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
          backgroundColor: options?.accentBg || "var(--color-surface)",
          border: `1px solid ${options?.accentColor || "var(--color-border)"}`,
          cursor: "pointer",
        }}
      >
        {inner}
      </a>
    );
  };

  function testIdOrUndefined(id?: string) {
    return id || undefined;
  }

  return (
    <div
      className="container py-4"
      style={{ maxWidth: "1280px" }}
      aria-busy={isRefreshing ? "true" : "false"}
      data-testid="staff-dashboard"
    >
      {/* 1. Page Header */}
      <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-3 mb-4">
        <div>
          <h1 className="h3 mb-1" style={{ color: "var(--color-primary-green)", fontWeight: 700 }}>
            Welcome back, {firstName}
          </h1>
          <p className="text-muted small mb-0">
            IT Service Desk Operations &amp; Queue Overview
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
            className="zen-btn-primary"
            onClick={onOpenQueue}
            style={{ minHeight: "40px" }}
          >
            Open Queue
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
          {/* 2. Metric Card Row (5 primary cards): New · Open · In Progress · Waiting for Requester · My Owned */}
          <div className="row g-3 mb-3">
            <div className="col-6 col-md-4 col-lg">
              {renderPrimaryMetricCard(
                "New",
                "New tickets",
                data.metrics.byStatus.NEW,
                "staff-card-new"
              )}
            </div>
            <div className="col-6 col-md-4 col-lg">
              {renderPrimaryMetricCard(
                "Open",
                "Open tickets",
                data.metrics.byStatus.OPEN,
                "staff-card-open"
              )}
            </div>
            <div className="col-6 col-md-4 col-lg">
              {renderPrimaryMetricCard(
                "In Progress",
                "In Progress tickets",
                data.metrics.byStatus.IN_PROGRESS,
                "staff-card-in-progress"
              )}
            </div>
            <div className="col-6 col-md-4 col-lg">
              {renderPrimaryMetricCard(
                "Waiting for Requester",
                "Waiting for Requester tickets",
                data.metrics.byStatus.WAITING_FOR_REQUESTER,
                "staff-card-waiting"
              )}
            </div>
            <div className="col-6 col-md-4 col-lg">
              {renderPrimaryMetricCard(
                "My Owned",
                "My Owned tickets",
                data.metrics.myOwned,
                "staff-card-my-owned"
              )}
            </div>
          </div>

          {/* 3. Attention Row (3 compact cards): Unassigned · Urgent (IT Priority) · Requester Resolved */}
          <div className="row g-3 mb-4">
            <div className="col-6 col-md-4">
              {renderAttentionCard("Unassigned", data.metrics.unassigned, {
                accentColor: "#B45309",
                accentBg: "#FFFBEB",
                testId: "staff-card-unassigned",
              })}
            </div>
            <div className="col-6 col-md-4">
              {renderAttentionCard("Urgent (IT Priority)", data.metrics.byItPriority.URGENT, {
                accentColor: "#991B1B",
                accentBg: "#FEF2F2",
                testId: "staff-card-urgent",
              })}
            </div>
            <div className="col-12 col-md-4">
              {renderAttentionCard(
                "Requester Resolved — awaiting your verification",
                data.metrics.requesterResolvedPending,
                {
                  accentColor: "#166534",
                  accentBg: "#F0FDF4",
                  testId: "staff-card-requester-resolved",
                }
              )}
            </div>
          </div>

          {/* Admin Extra Card + Informational Summary Strip */}
          <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-4">
            <div className="d-flex flex-wrap align-items-center gap-2 small text-muted">
              <span className="badge bg-light text-dark border px-2 py-1">
                My Pending FollowUps: <strong>{data.metrics.myFollowUps.count}</strong>
              </span>
              <span className="badge bg-light text-dark border px-2 py-1">
                Resolved: <strong>{data.metrics.byStatus.RESOLVED.count}</strong>
              </span>
              <span className="badge bg-light text-dark border px-2 py-1">
                Closed: <strong>{data.metrics.byStatus.CLOSED.count}</strong>
              </span>
              <span className="badge bg-light text-dark border px-2 py-1">
                Reopened: <strong>{data.metrics.byStatus.REOPENED.count}</strong>
              </span>
              <span className="badge bg-light text-dark border px-2 py-1">
                Cancelled: <strong>{data.metrics.byStatus.CANCELLED.count}</strong>
              </span>
            </div>

            {currentUser.role === "ADMINISTRATOR" && userCounts && (
              <a
                href="/admin/users"
                role="link"
                tabIndex={0}
                onClick={(e) => {
                  e.preventDefault();
                  onOpenUserManagement?.();
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onOpenUserManagement?.();
                  }
                }}
                className="zen-card px-3 py-2 text-decoration-none d-inline-flex align-items-center gap-2"
                style={{
                  backgroundColor: "var(--color-surface)",
                  border: "1px solid var(--color-border)",
                  color: "var(--color-primary-green)",
                  fontWeight: 600,
                  fontSize: "13px",
                  cursor: "pointer",
                }}
              >
                <span>
                  Users: {userCounts.active} active / {userCounts.inactive} inactive
                </span>
                <span aria-hidden="true">→</span>
              </a>
            )}
          </div>

          {/* 4. Two-Column Lists */}
          <div className="row g-4">
            {/* Left Column: Urgent Tickets & Recently Updated (Tabs, max 5 rows each) */}
            <div className="col-12 col-lg-7">
              <div
                className="zen-card h-100 overflow-hidden"
                style={{
                  backgroundColor: "var(--color-surface)",
                  border: "1px solid var(--color-border)",
                }}
              >
                <div
                  className="px-3 pt-2 border-bottom d-flex align-items-center gap-3"
                  style={{ backgroundColor: "#F9FAFB" }}
                  role="tablist"
                  aria-label="Ticket lists"
                >
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeListTab === "urgent"}
                    onClick={() => setActiveListTab("urgent")}
                    style={{
                      background: "none",
                      border: "none",
                      borderBottom:
                        activeListTab === "urgent"
                          ? "3px solid var(--color-primary-green)"
                          : "3px solid transparent",
                      padding: "8px 4px",
                      fontWeight: activeListTab === "urgent" ? 700 : 500,
                      color:
                        activeListTab === "urgent"
                          ? "var(--color-primary-green)"
                          : "var(--color-text-muted)",
                      fontSize: "14px",
                      cursor: "pointer",
                    }}
                  >
                    Urgent Tickets ({data.urgentTickets.length})
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeListTab === "recent"}
                    onClick={() => setActiveListTab("recent")}
                    style={{
                      background: "none",
                      border: "none",
                      borderBottom:
                        activeListTab === "recent"
                          ? "3px solid var(--color-primary-green)"
                          : "3px solid transparent",
                      padding: "8px 4px",
                      fontWeight: activeListTab === "recent" ? 700 : 500,
                      color:
                        activeListTab === "recent"
                          ? "var(--color-primary-green)"
                          : "var(--color-text-muted)",
                      fontSize: "14px",
                      cursor: "pointer",
                    }}
                  >
                    Recently Updated ({data.recentlyUpdated.length})
                  </button>
                </div>

                {activeListTab === "urgent" ? (
                  data.urgentTickets.length === 0 ? (
                    <div className="p-4 text-center text-muted">
                      <p className="fw-semibold mb-1">Nothing to show yet.</p>
                      <p className="small mb-0">
                        No non-terminal urgent tickets currently require immediate triage.
                      </p>
                    </div>
                  ) : (
                    <div>
                      {data.urgentTickets.map((t) => (
                        <div
                          key={t.id}
                          role="button"
                          tabIndex={0}
                          onClick={() => onOpenTicket?.(t.id)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              onOpenTicket?.(t.id);
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
                                {t.ticketNumber}
                              </span>
                              <span
                                style={{
                                  backgroundColor: "#7F1D1D",
                                  color: "#FFFFFF",
                                  borderRadius: "12px",
                                  padding: "2px 8px",
                                  fontSize: "11px",
                                  fontWeight: 700,
                                }}
                              >
                                {t.itPriority}
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
                                {formatStatusLabel(t.status)}
                              </span>
                            </div>
                            <div
                              title={t.summary}
                              style={{
                                fontSize: "14px",
                                fontWeight: 500,
                                color: "var(--color-text-main)",
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                              }}
                            >
                              {t.summary}
                            </div>
                          </div>
                          <div
                            style={{
                              fontSize: "12px",
                              color: "var(--color-text-muted)",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {formatBangkokTimestamp(t.createdAt)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                ) : data.recentlyUpdated.length === 0 ? (
                  <div className="p-4 text-center text-muted">
                    <p className="fw-semibold mb-1">Nothing to show yet.</p>
                    <p className="small mb-0">
                      Tickets updated within the last 7 days will appear here.
                    </p>
                  </div>
                ) : (
                  <div>
                    {data.recentlyUpdated.map((t) => (
                      <div
                        key={t.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => onOpenTicket?.(t.id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            onOpenTicket?.(t.id);
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
                              {t.ticketNumber}
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
                              {formatStatusLabel(t.status)}
                            </span>
                          </div>
                          <div
                            title={t.summary}
                            style={{
                              fontSize: "14px",
                              fontWeight: 500,
                              color: "var(--color-text-main)",
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {t.summary}
                          </div>
                        </div>
                        <div
                          style={{
                            fontSize: "12px",
                            color: "var(--color-text-muted)",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {formatBangkokTimestamp(t.updatedAt)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: My Recent Actions Taken (max 5) & Quick Actions */}
            <div className="col-12 col-lg-5 d-flex flex-column gap-4">
              <div
                className="zen-card overflow-hidden flex-grow-1"
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
                    My Recent Actions Taken
                  </h2>
                  <span className="badge bg-light text-dark border">
                    {data.myRecentActions.length}
                  </span>
                </div>

                {data.myRecentActions.length === 0 ? (
                  <div className="p-4 text-center text-muted">
                    <p className="fw-semibold mb-1">Nothing to show yet.</p>
                    <p className="small mb-0">
                      Actions you log on support tickets will appear here.
                    </p>
                  </div>
                ) : (
                  <div>
                    {data.myRecentActions.map((act) => (
                      <div
                        key={act.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => onOpenTicket?.(act.ticketId)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            onOpenTicket?.(act.ticketId);
                          }
                        }}
                        className="p-3 border-bottom d-flex flex-column gap-1"
                        style={{ cursor: "pointer", minHeight: "48px" }}
                      >
                        <div className="d-flex justify-content-between align-items-center gap-2 flex-wrap">
                          <div className="d-flex align-items-center gap-2">
                            <span
                              style={{
                                fontFamily: "monospace",
                                fontWeight: 700,
                                color: "var(--color-primary-green)",
                                fontSize: "13px",
                              }}
                            >
                              {act.ticketNumber}
                            </span>
                            {act.followUpRequired && (
                              <span
                                style={{
                                  backgroundColor: "#FEF3C7",
                                  color: "#92400E",
                                  border: "1px solid #FCD34D",
                                  borderRadius: "12px",
                                  padding: "1px 8px",
                                  fontSize: "11px",
                                  fontWeight: 700,
                                }}
                              >
                                Follow-up
                              </span>
                            )}
                          </div>
                          <span style={{ fontSize: "11px", color: "var(--color-text-muted)" }}>
                            {formatBangkokTimestamp(act.actionDateTime)}
                          </span>
                        </div>
                        <div
                          title={act.descriptionPreview}
                          style={{
                            fontSize: "13px",
                            color: "var(--color-text-main)",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {act.descriptionPreview}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Quick Actions Card */}
              <div
                className="zen-card p-3"
                style={{
                  backgroundColor: "var(--color-surface)",
                  border: "1px solid var(--color-border)",
                }}
              >
                <h2 className="h6 mb-3 fw-bold" style={{ color: "var(--color-text-main)" }}>
                  Quick Actions
                </h2>
                <div className="d-flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="zen-btn-primary"
                    onClick={onOpenQueue}
                    style={{ minHeight: "40px" }}
                  >
                    Open Queue
                  </button>
                  {onCreateTicket && (
                    <button
                      type="button"
                      className="zen-btn-secondary"
                      onClick={onCreateTicket}
                      style={{ minHeight: "40px" }}
                    >
                      Create Ticket
                    </button>
                  )}
                  {currentUser.role === "ADMINISTRATOR" && onOpenUserManagement && (
                    <button
                      type="button"
                      className="zen-btn-secondary"
                      onClick={onOpenUserManagement}
                      style={{ minHeight: "40px" }}
                    >
                      User Management
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
