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
  requesterId: number
): Promise<Ticket> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}/api/tickets`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Requester-Id": String(requesterId),
      },
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
  requesterId: number
): Promise<Attachment> {
  const formData = new FormData();
  formData.append("file", file);

  let res: Response;
  try {
    res = await fetch(`${API_URL}/api/tickets/${ticketId}/attachments`, {
      method: "POST",
      headers: {
        "X-Requester-Id": String(requesterId),
      },
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
  requesterId: number
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

  let res: Response;
  try {
    res = await fetch(url, {
      headers: {
        "X-Requester-Id": String(requesterId),
      },
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

