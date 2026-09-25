const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

export interface Category {
  id: number;
  name: string;
  isActive?: boolean;
}

export interface RelatedSystem {
  id: number;
  name: string;
  description?: string;
  isActive?: boolean;
}

export interface SystemStatus {
  online: boolean;
  categories: Category[];
}

export interface HealthResponse {
  status: string;
  service: string;
}

export async function checkHealth(): Promise<HealthResponse> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}/api/health`);
  } catch {
    throw new Error(`Unable to connect to the backend server at ${API_URL}. Please ensure the API is running.`);
  }

  if (!res.ok) {
    throw new Error(`Health check failed: Server responded with status ${res.status} (${res.statusText || "Error"})`);
  }
  return res.json();
}

export async function checkSystem(): Promise<SystemStatus> {
  let healthRes: Response;
  try {
    healthRes = await fetch(`${API_URL}/api/health`);
  } catch {
    throw new Error("Unable to connect to TokTickIT API");
  }

  if (!healthRes.ok) {
    throw new Error(`Health check failed: Server returned HTTP ${healthRes.status} (${healthRes.statusText || "Error"})`);
  }

  let catRes: Response;
  try {
    catRes = await fetch(`${API_URL}/api/categories`);
  } catch {
    throw new Error("Unable to connect to TokTickIT API");
  }

  if (!catRes.ok) {
    throw new Error(`Categories fetch failed: Server returned HTTP ${catRes.status} (${catRes.statusText || "Error"})`);
  }

  const categories: Category[] = await catRes.json();

  return {
    online: true,
    categories,
  };
}

export interface RequesterUser {
  id: number;
  name: string;
  email: string;
  department: string;
  isActive: boolean;
}

export async function getRequesters(): Promise<RequesterUser[]> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}/api/requesters`);
  } catch {
    throw new Error("Unable to connect to TokTickIT API");
  }

  if (!res.ok) {
    throw new Error(`Requesters fetch failed: Server returned HTTP ${res.status} (${res.statusText || "Error"})`);
  }

  return res.json();
}

export async function getCategories(): Promise<Category[]> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}/api/categories`);
  } catch {
    throw new Error("Unable to connect to TokTickIT API");
  }

  if (!res.ok) {
    throw new Error(`Failed to fetch categories: Server returned HTTP ${res.status}`);
  }

  return res.json();
}

export async function getRelatedSystems(): Promise<RelatedSystem[]> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}/api/related-systems`);
  } catch {
    throw new Error("Unable to connect to TokTickIT API");
  }

  if (!res.ok) {
    throw new Error(`Failed to fetch related systems: Server returned HTTP ${res.status}`);
  }

  return res.json();
}

export interface CreateTicketPayload {
  categoryId: number;
  relatedSystemId: number;
  summary: string;
  description: string;
  requestedPriority?: "LOW" | "MEDIUM" | "HIGH";
}

export interface Attachment {
  id: number;
  ticketId: number;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
  isRemoved: boolean;
  removedAt?: string | null;
  removedReason?: string | null;
  uploadedAt: string;
}

export interface Ticket {
  id: number;
  ticketNumber: string;
  requesterId: number;
  categoryId: number;
  relatedSystemId: number;
  summary: string;
  description: string;
  requestedPriority: "LOW" | "MEDIUM" | "HIGH";
  currentStatus: string;
  createdAt: string;
  updatedAt: string;
  category?: { id: number; name: string };
  relatedSystem?: { id: number; name: string };
  attachments?: Attachment[];
}

export async function createTicket(
  payload: CreateTicketPayload,
  requesterId?: number
): Promise<Ticket> {
  let res: Response;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (requesterId) {
    headers["X-Requester-Id"] = String(requesterId);
  }

  try {
    res = await fetch(`${API_URL}/api/tickets`, {
      method: "POST",
      headers,
      credentials: "include",
      body: JSON.stringify(payload),
    });
  } catch {
    throw new Error("Unable to connect to TokTickIT API");
  }

  if (!res.ok) {
    let errorMsg = `Server error (HTTP ${res.status})`;
    try {
      const errorData = await res.json();
      if (errorData?.error?.message) {
        errorMsg = errorData.error.message;
        if (Array.isArray(errorData.error.details)) {
          errorMsg = errorData.error.details.map((d: { field: string; message: string }) => d.message).join(", ");
        }
      }
    } catch {
      // fallback
    }
    throw new Error(errorMsg);
  }

  return res.json();
}

export async function uploadAttachment(
  ticketId: number,
  file: File,
  requesterId?: number
): Promise<Attachment> {
  const formData = new FormData();
  formData.append("file", file);

  const headers: Record<string, string> = {};
  if (requesterId) {
    headers["X-Requester-Id"] = String(requesterId);
  }

  let res: Response;
  try {
    res = await fetch(`${API_URL}/api/tickets/${ticketId}/attachments`, {
      method: "POST",
      headers,
      credentials: "include",
      body: formData,
    });
  } catch {
    throw new Error("Unable to connect to TokTickIT API");
  }

  if (!res.ok) {
    let errorMsg = `Failed to upload attachment (HTTP ${res.status})`;
    try {
      const errorData = await res.json();
      if (errorData?.error?.message) {
        errorMsg = errorData.error.message;
      }
    } catch {
      // fallback
    }
    throw new Error(errorMsg);
  }

  return res.json();
}

export interface TicketListItem {
  id: number;
  ticketNumber: string;
  summary: string;
  requestedPriority: "LOW" | "MEDIUM" | "HIGH";
  currentStatus: string;
  createdAt: string;
  updatedAt: string;
  category: { id: number; name: string };
  relatedSystem?: { id: number; name: string };
  _count?: { attachments: number };
}

export interface PaginationMetadata {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface PaginatedTickets {
  items: TicketListItem[];
  pagination: PaginationMetadata;
}

export interface GetTicketsParams {
  search?: string;
  categoryId?: number;
  status?: string;
  priority?: "LOW" | "MEDIUM" | "HIGH";
  requestedPriority?: "LOW" | "MEDIUM" | "HIGH";
  sortBy?: "createdAt" | "requestedPriority" | "status" | "summary";
  sortOrder?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}

export async function getTickets(
  params: GetTicketsParams = {},
  requesterId?: number
): Promise<PaginatedTickets> {
  const query = new URLSearchParams();
  if (params.search) query.set("search", params.search);
  if (params.categoryId) query.set("categoryId", String(params.categoryId));
  if (params.status) query.set("status", params.status);
  const priorityVal = params.requestedPriority || params.priority;
  if (priorityVal) query.set("requestedPriority", priorityVal);
  if (params.sortBy) query.set("sortBy", params.sortBy);
  if (params.sortOrder) query.set("sortOrder", params.sortOrder);
  if (params.page !== undefined) query.set("page", String(params.page));
  if (params.pageSize !== undefined) query.set("pageSize", String(params.pageSize));

  const queryString = query.toString();
  const url = `${API_URL}/api/tickets${queryString ? `?${queryString}` : ""}`;

  const headers: Record<string, string> = {};
  if (requesterId) {
    headers["X-Requester-Id"] = String(requesterId);
  }

  let res: Response;
  try {
    res = await fetch(url, {
      headers,
      credentials: "include",
    });
  } catch {
    throw new Error("Unable to connect to TokTickIT API");
  }

  if (!res.ok) {
    let errorMsg = `Failed to fetch tickets (HTTP ${res.status})`;
    try {
      const errorData = await res.json();
      if (errorData?.error?.message) {
        errorMsg = errorData.error.message;
      }
    } catch {
      // fallback
    }
    throw new Error(errorMsg);
  }

  return res.json();
}

export interface PublicCommentItem {
  id: number;
  ticketId: number;
  authorId: number;
  authorName: string;
  authorRole: string;
  content: string;
  createdAt: string;
}

export interface TicketDetail {
  id: number;
  ticketNumber: string;
  requesterId: number;
  categoryId: number;
  relatedSystemId: number;
  summary: string;
  description: string;
  requestedPriority: "LOW" | "MEDIUM" | "HIGH";
  currentStatus: string;
  isRequesterResolved?: boolean;
  createdAt: string;
  updatedAt: string;
  requester: {
    id: number;
    name: string;
    email: string;
    department: string;
  };
  category: {
    id: number;
    name: string;
  };
  relatedSystem: {
    id: number;
    name: string;
  };
  attachments: Attachment[];
  publicComments?: PublicCommentItem[];
}

export async function getTicketDetail(
  ticketId: number,
  requesterId?: number
): Promise<TicketDetail> {
  let res: Response;
  const headers: Record<string, string> = {};
  if (requesterId) {
    headers["X-Requester-Id"] = String(requesterId);
  }

  try {
    res = await fetch(`${API_URL}/api/tickets/${ticketId}`, {
      headers,
      credentials: "include",
    });
  } catch {
    throw new Error("Unable to connect to TokTickIT API");
  }

  if (!res.ok) {
    let errorMsg = `Failed to fetch ticket details (HTTP ${res.status})`;
    try {
      const errorData = await res.json();
      if (errorData?.error?.message) {
        errorMsg = errorData.error.message;
      }
    } catch {
      // fallback
    }
    const err = new Error(errorMsg) as Error & { status?: number; code?: string };
    err.status = res.status;
    throw err;
  }

  return res.json();
}

export async function removeAttachment(
  ticketId: number,
  attachmentId: number,
  requesterId?: number,
  removedReason?: string
): Promise<{ id: number; isRemoved: boolean; removedAt: string; removedReason?: string | null }> {
  let res: Response;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (requesterId) {
    headers["X-Requester-Id"] = String(requesterId);
  }

  try {
    res = await fetch(`${API_URL}/api/tickets/${ticketId}/attachments/${attachmentId}/remove`, {
      method: "PATCH",
      headers,
      credentials: "include",
      body: JSON.stringify(removedReason ? { removedReason } : {}),
    });
  } catch {
    throw new Error("Unable to connect to TokTickIT API");
  }

  if (!res.ok) {
    let errorMsg = `Failed to remove attachment (HTTP ${res.status})`;
    try {
      const errorData = await res.json();
      if (errorData?.error?.message) {
        errorMsg = errorData.error.message;
      }
    } catch {
      // fallback
    }
    throw new Error(errorMsg);
  }

  return res.json();
}

export function getAttachmentDownloadUrl(
  ticketId: number,
  attachmentId: number,
  requesterId?: number
): string {
  const query = requesterId ? `?requesterId=${requesterId}` : "";
  return `${API_URL}/api/tickets/${ticketId}/attachments/${attachmentId}/download${query}`;
}

export async function getPublicComments(ticketId: number): Promise<PublicCommentItem[]> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}/api/tickets/${ticketId}/comments`, {
      credentials: "include",
    });
  } catch {
    throw new Error("Unable to connect to TokTickIT API");
  }

  if (!res.ok) {
    let errorMsg = `Failed to fetch comments (HTTP ${res.status})`;
    try {
      const errorData = await res.json();
      if (errorData?.error?.message) {
        errorMsg = errorData.error.message;
      }
    } catch {
      // fallback
    }
    throw new Error(errorMsg);
  }

  return res.json();
}

export async function postPublicComment(
  ticketId: number,
  content: string
): Promise<PublicCommentItem> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}/api/tickets/${ticketId}/comments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({ content }),
    });
  } catch {
    throw new Error("Unable to connect to TokTickIT API");
  }

  if (!res.ok) {
    let errorMsg = `Failed to post comment (HTTP ${res.status})`;
    try {
      const errorData = await res.json();
      if (errorData?.error?.message) {
        errorMsg = errorData.error.message;
      }
    } catch {
      // fallback
    }
    throw new Error(errorMsg);
  }

  return res.json();
}

export async function updateResolveIndicator(
  ticketId: number,
  isRequesterResolved: boolean
): Promise<{ id: number; ticketNumber: string; isRequesterResolved: boolean; currentStatus: string }> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}/api/tickets/${ticketId}/resolve-indicator`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({ isRequesterResolved }),
    });
  } catch {
    throw new Error("Unable to connect to TokTickIT API");
  }

  if (!res.ok) {
    let errorMsg = `Failed to update resolve indicator (HTTP ${res.status})`;
    try {
      const errorData = await res.json();
      if (errorData?.error?.message) {
        errorMsg = errorData.error.message;
      }
    } catch {
      // fallback
    }
    throw new Error(errorMsg);
  }

  return res.json();
}

// ---------------------------------------------------------------------------
// Lab 3 — Authentication Types & Functions
// ---------------------------------------------------------------------------

export type UserRole = "REQUESTER" | "IT_STAFF" | "ADMINISTRATOR";

export interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  mustChangePassword: boolean;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: User;
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export async function login(credentials: LoginPayload): Promise<LoginResponse> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}/api/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify(credentials),
    });
  } catch {
    throw new Error("Unable to connect to TokTickIT API");
  }

  if (!res.ok) {
    let errorMsg = "Invalid email or password";
    try {
      const errData = await res.json();
      if (errData?.error?.message) {
        errorMsg = errData.error.message;
      }
    } catch {
      // fallback
    }
    throw new Error(errorMsg);
  }

  return res.json();
}

export async function logout(): Promise<{ message: string }> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}/api/auth/logout`, {
      method: "POST",
      credentials: "include",
    });
  } catch {
    throw new Error("Unable to connect to TokTickIT API");
  }

  if (!res.ok) {
    throw new Error(`Logout failed (HTTP ${res.status})`);
  }

  return res.json();
}

export async function getMe(): Promise<User> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}/api/auth/me`, {
      credentials: "include",
    });
  } catch {
    throw new Error("Unable to connect to TokTickIT API");
  }

  if (!res.ok) {
    throw new Error(`Session validation failed (HTTP ${res.status})`);
  }

  const data = await res.json();
  return data.user;
}

export async function changePassword(payload: ChangePasswordPayload): Promise<{ message: string }> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}/api/auth/change-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify(payload),
    });
  } catch {
    throw new Error("Unable to connect to TokTickIT API");
  }

  if (!res.ok) {
    let errorMsg = "Failed to update password";
    try {
      const errData = await res.json();
      if (errData?.error?.details?.[0]?.message) {
        errorMsg = errData.error.details[0].message;
      } else if (errData?.error?.message) {
        errorMsg = errData.error.message;
      }
    } catch {
      // fallback
    }
    throw new Error(errorMsg);
  }

  return res.json();
}

// ---------------------------------------------------------------------------
// Lab 3 Issue 7 — IT Staff Ticket Queue Types & Functions
// ---------------------------------------------------------------------------

export type StaffTicketStatus =
  | "NEW"
  | "OPEN"
  | "IN_PROGRESS"
  | "WAITING_FOR_REQUESTER"
  | "RESOLVED"
  | "CLOSED"
  | "REOPENED"
  | "CANCELLED";

export type StaffPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export interface StaffQueueTicket {
  id: number;
  ticketNumber: string;
  summary: string;
  category: { id: number; name: string };
  requestedPriority: "LOW" | "MEDIUM" | "HIGH";
  itPriority: StaffPriority;
  status: StaffTicketStatus;
  owner: { id: number; name: string } | null;
  requester: { id: number; name: string };
  isRequesterResolved: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StaffQueuePagination {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface StaffQueueResponse {
  items: StaffQueueTicket[];
  pagination: StaffQueuePagination;
}

export interface QueueFilterParams {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
  priority?: string;
  categoryId?: number;
  ownerId?: string | number;
  sortBy?: "createdAt" | "updatedAt" | "itPriority" | "status" | "ticketNumber";
  sortOrder?: "asc" | "desc";
}

export async function getStaffTickets(params: QueueFilterParams = {}): Promise<StaffQueueResponse> {
  const query = new URLSearchParams();

  if (params.page !== undefined) query.set("page", String(params.page));
  if (params.pageSize !== undefined) query.set("pageSize", String(params.pageSize));
  if (params.search) query.set("search", params.search);
  if (params.status && params.status !== "ALL") query.set("status", params.status);
  if (params.priority && params.priority !== "ALL") query.set("priority", params.priority);
  if (params.categoryId !== undefined && params.categoryId > 0) {
    query.set("categoryId", String(params.categoryId));
  }
  if (params.ownerId !== undefined && params.ownerId !== "ALL" && params.ownerId !== "") {
    query.set("ownerId", String(params.ownerId));
  }
  if (params.sortBy) query.set("sortBy", params.sortBy);
  if (params.sortOrder) query.set("sortOrder", params.sortOrder);

  const queryString = query.toString();
  const url = `${API_URL}/api/staff/tickets${queryString ? `?${queryString}` : ""}`;

  let res: Response;
  try {
    res = await fetch(url, {
      credentials: "include",
    });
  } catch {
    throw new Error("Unable to connect to TokTickIT API");
  }

  if (res.status === 401) {
    throw new Error("UNAUTHORIZED");
  }

  if (res.status === 403) {
    throw new Error("FORBIDDEN");
  }

  if (!res.ok) {
    let errorMsg = `Failed to load queue (HTTP ${res.status})`;
    try {
      const errData = await res.json();
      if (errData?.error?.message) {
        errorMsg = errData.error.message;
      }
    } catch {
      // fallback
    }
    throw new Error(errorMsg);
  }

  return res.json();
}


