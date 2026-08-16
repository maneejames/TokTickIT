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
      `Cannot connect to backend server at ${API_URL}. Please check if the server is running (npm run dev inside server/).`
    );
  }

  if (!healthRes.ok) {
    throw new Error(`Health check failed: Server returned HTTP ${healthRes.status} (${healthRes.statusText || "Error"})`);
  }

  // Issue 4 will fetch categories. If categories endpoint is not yet ready, handle gracefully or fetch
  let categories: Category[] = [];
  try {
    const catRes = await fetch(`${API_URL}/api/categories`);
    if (catRes.ok) {
      categories = await catRes.json();
    }
  } catch {
    // Categories not implemented yet (Issue 4), health check passed
  }

  return {
    online: true,
    categories,
  };
}

