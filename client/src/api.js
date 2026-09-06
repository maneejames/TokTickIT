const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";
export async function checkHealth() {
    let res;
    try {
        res = await fetch(`${API_URL}/api/health`);
    }
    catch {
        throw new Error(`Unable to connect to the backend server at ${API_URL}. Please ensure the API is running.`);
    }
    if (!res.ok) {
        throw new Error(`Health check failed: Server responded with status ${res.status} (${res.statusText || "Error"})`);
    }
    return res.json();
}
export async function checkSystem() {
    let healthRes;
    try {
        healthRes = await fetch(`${API_URL}/api/health`);
    }
    catch {
        throw new Error("Unable to connect to TokTickIT API");
    }
    if (!healthRes.ok) {
        throw new Error(`Health check failed: Server returned HTTP ${healthRes.status} (${healthRes.statusText || "Error"})`);
    }
    let catRes;
    try {
        catRes = await fetch(`${API_URL}/api/categories`);
    }
    catch {
        throw new Error("Unable to connect to TokTickIT API");
    }
    if (!catRes.ok) {
        throw new Error(`Categories fetch failed: Server returned HTTP ${catRes.status} (${catRes.statusText || "Error"})`);
    }
    const categories = await catRes.json();
    return {
        online: true,
        categories,
    };
}
export async function getRequesters() {
    let res;
    try {
        res = await fetch(`${API_URL}/api/requesters`);
    }
    catch {
        throw new Error("Unable to connect to TokTickIT API");
    }
    if (!res.ok) {
        throw new Error(`Requesters fetch failed: Server returned HTTP ${res.status} (${res.statusText || "Error"})`);
    }
    return res.json();
}
export async function getCategories() {
    let res;
    try {
        res = await fetch(`${API_URL}/api/categories`);
    }
    catch {
        throw new Error("Unable to connect to TokTickIT API");
    }
    if (!res.ok) {
        throw new Error(`Failed to fetch categories: Server returned HTTP ${res.status}`);
    }
    return res.json();
}
export async function getRelatedSystems() {
    let res;
    try {
        res = await fetch(`${API_URL}/api/related-systems`);
    }
    catch {
        throw new Error("Unable to connect to TokTickIT API");
    }
    if (!res.ok) {
        throw new Error(`Failed to fetch related systems: Server returned HTTP ${res.status}`);
    }
    return res.json();
}
export async function createTicket(payload, requesterId) {
    let res;
    try {
        res = await fetch(`${API_URL}/api/tickets`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-Requester-Id": String(requesterId),
            },
            body: JSON.stringify(payload),
        });
    }
    catch {
        throw new Error("Unable to connect to TokTickIT API");
    }
    if (!res.ok) {
        let errorMsg = `Server error (HTTP ${res.status})`;
        try {
            const errorData = await res.json();
            if (errorData?.error?.message) {
                errorMsg = errorData.error.message;
                if (Array.isArray(errorData.error.details)) {
                    errorMsg = errorData.error.details.map((d) => d.message).join(", ");
                }
            }
        }
        catch {
            // fallback
        }
        throw new Error(errorMsg);
    }
    return res.json();
}
export async function uploadAttachment(ticketId, file, requesterId) {
    const formData = new FormData();
    formData.append("file", file);
    let res;
    try {
        res = await fetch(`${API_URL}/api/tickets/${ticketId}/attachments`, {
            method: "POST",
            headers: {
                "X-Requester-Id": String(requesterId),
            },
            body: formData,
        });
    }
    catch {
        throw new Error("Unable to connect to TokTickIT API");
    }
    if (!res.ok) {
        let errorMsg = `Failed to upload attachment (HTTP ${res.status})`;
        try {
            const errorData = await res.json();
            if (errorData?.error?.message) {
                errorMsg = errorData.error.message;
            }
        }
        catch {
            // fallback
        }
        throw new Error(errorMsg);
    }
    return res.json();
}
export async function getTickets(params = {}, requesterId) {
    const query = new URLSearchParams();
    if (params.search)
        query.set("search", params.search);
    if (params.categoryId)
        query.set("categoryId", String(params.categoryId));
    if (params.status)
        query.set("status", params.status);
    const priorityVal = params.requestedPriority || params.priority;
    if (priorityVal)
        query.set("requestedPriority", priorityVal);
    if (params.sortBy)
        query.set("sortBy", params.sortBy);
    if (params.sortOrder)
        query.set("sortOrder", params.sortOrder);
    if (params.page !== undefined)
        query.set("page", String(params.page));
    if (params.pageSize !== undefined)
        query.set("pageSize", String(params.pageSize));
    const queryString = query.toString();
    const url = `${API_URL}/api/tickets${queryString ? `?${queryString}` : ""}`;
    let res;
    try {
        res = await fetch(url, {
            headers: {
                "X-Requester-Id": String(requesterId),
            },
        });
    }
    catch {
        throw new Error("Unable to connect to TokTickIT API");
    }
    if (!res.ok) {
        let errorMsg = `Failed to fetch tickets (HTTP ${res.status})`;
        try {
            const errorData = await res.json();
            if (errorData?.error?.message) {
                errorMsg = errorData.error.message;
            }
        }
        catch {
            // fallback
        }
        throw new Error(errorMsg);
    }
    return res.json();
}
