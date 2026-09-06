const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

export interface Category {
  id: number;
  name: string;
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

// Issue 2 + Issue 4 — call the backend.
// Steps: fetch `${API_URL}/api/health`; if not ok, throw.
//        then fetch `${API_URL}/api/categories`; if not ok, throw.
//        return { online: true, categories }.
// Throwing on failure lets the UI show a single Offline/error state.
export async function checkSystem(): Promise<SystemStatus> {
  let healthRes: Response;
  try {
    healthRes = await fetch(`${API_URL}/api/health`);
  } catch {
    throw new Error(
      "Unable to connect to TokTickIT API"
    );
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

