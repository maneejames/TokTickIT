# Lab 2 REST API Specification

## 1. Overview and Global Conventions

### Base URL
```
http://localhost:3000/api
```

### Authentication Simulation & Headers
Because authentication is implemented in Lab 3, Lab 2 simulates multi-user requester sessions using the `X-Requester-Id` HTTP request header.
- For all requester-owned routes (`/tickets*`), clients must include:
  ```http
  X-Requester-Id: <number>
  ```
- If `X-Requester-Id` is missing, malformed, or references an inactive/non-existent user, the server rejects the request with `401 Unauthorized` or `403 Forbidden`.

### Standard Error Response Format
All error responses return a standardized JSON envelope:
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed on one or more fields",
    "details": [
      {
        "field": "summary",
        "message": "Summary must be between 5 and 100 characters"
      }
    ]
  }
}
```

---

## 2. Endpoints

### 2.1 Reference Data & Requester Endpoints

#### `GET /api/requesters`
Returns all active Development Requesters for the selection screen. Inactive requesters (`isActive: false`) are filtered out.

- **Headers**: None required
- **Query Parameters**: None
- **Response `200 OK`**:
```json
[
  {
    "id": 1,
    "name": "Somchai Jaidee",
    "email": "somchai.jai@kmutt.ac.th",
    "department": "Engineering",
    "isActive": true
  },
  {
    "id": 2,
    "name": "Suda Rakdee",
    "email": "suda.rak@kmutt.ac.th",
    "department": "Science",
    "isActive": true
  }
]
```

---

#### `GET /api/categories`
Returns all active IT ticket categories.

- **Headers**: None required
- **Query Parameters**: None
- **Response `200 OK`**:
```json
[
  { "id": 1, "name": "Account and Access" },
  { "id": 2, "name": "Hardware" },
  { "id": 3, "name": "Software" },
  { "id": 4, "name": "Network" }
]
```

---

#### `GET /api/related-systems`
Returns all active Related Systems.

- **Headers**: None required
- **Query Parameters**: None
- **Response `200 OK`**:
```json
[
  { "id": 1, "name": "Email", "description": "University mail service" },
  { "id": 2, "name": "Campus Wi-Fi", "description": "KMUTT Secure Wireless" },
  { "id": 3, "name": "VPN", "description": "Off-campus network access" },
  { "id": 4, "name": "LEB2 App", "description": "Learning environment platform" },
  { "id": 5, "name": "Grade Submission App", "description": "Faculty grading system" },
  { "id": 6, "name": "Printer", "description": "Central and departmental printers" },
  { "id": 7, "name": "Corporate Laptop", "description": "Assigned university laptop" }
]
```

---

### 2.2 Ticket Endpoints

#### `POST /api/tickets`
Creates a new IT support ticket for the active requester.

- **Headers**:
  - `Content-Type: application/json`
  - `X-Requester-Id: 1`
- **Request Body**:
```json
{
  "categoryId": 2,
  "relatedSystemId": 7,
  "summary": "Laptop battery drains in less than 30 minutes",
  "description": "After the recent operating system update, the laptop shuts down unexpectedly when unplugged.",
  "requestedPriority": "HIGH"
}
```
- **Validation Rules**:
  - `categoryId`: Required, must reference an existing Category in DB.
  - `relatedSystemId`: Required, must reference an existing RelatedSystem in DB.
  - `summary`: Required string, trimmed length between 5 and 100 characters.
  - `description`: Required string, trimmed length between 10 and 2000 characters.
  - `requestedPriority`: Optional string, allowed values: `"LOW"`, `"MEDIUM"`, `"HIGH"`. Defaults to `"MEDIUM"`.
- **Response `201 Created`**:
```json
{
  "id": 101,
  "ticketNumber": "TICK-20260906-0001",
  "requesterId": 1,
  "categoryId": 2,
  "relatedSystemId": 7,
  "summary": "Laptop battery drains in less than 30 minutes",
  "description": "After the recent operating system update, the laptop shuts down unexpectedly when unplugged.",
  "requestedPriority": "HIGH",
  "currentStatus": "NEW",
  "createdAt": "2026-09-06T08:30:00.000Z",
  "updatedAt": "2026-09-06T08:30:00.000Z",
  "category": { "id": 2, "name": "Hardware" },
  "relatedSystem": { "id": 7, "name": "Corporate Laptop" },
  "attachments": []
}
```
- **Error Responses**:
  - `400 Bad Request`: Field validation error or empty trimmed strings.
  - `401 / 403`: Missing or invalid `X-Requester-Id`.
  - `500 Internal Server Error`: Unexpected database failure.

---

#### `GET /api/tickets`
Retrieves a paginated list of tickets owned by the requester specified in `X-Requester-Id`. Does NOT return tickets belonging to other requesters.

- **Headers**:
  - `X-Requester-Id: 1`
- **Query Parameters**:
  | Parameter | Type | Default | Description |
  |---|---|---|---|
  | `search` | string | `""` | Filter by case-insensitive substring in `summary` or exact `ticketNumber` |
  | `categoryId` | number | none | Filter by Category ID |
  | `status` | string | none | Filter by ticket status (e.g. `NEW`) |
  | `sortBy` | string | `"createdAt"` | Field to sort by: `"createdAt"`, `"requestedPriority"`, `"summary"` |
  | `sortOrder` | string | `"desc"` | Sort direction: `"asc"` or `"desc"` |
  | `page` | number | `1` | Page number (1-based index) |
  | `pageSize` | number | `10` | Items per page (allowed: 5, 10, 20, 50) |

- **Response `200 OK`**:
```json
{
  "items": [
    {
      "id": 101,
      "ticketNumber": "TICK-20260906-0001",
      "summary": "Laptop battery drains in less than 30 minutes",
      "requestedPriority": "HIGH",
      "currentStatus": "NEW",
      "createdAt": "2026-09-06T08:30:00.000Z",
      "updatedAt": "2026-09-06T08:30:00.000Z",
      "category": { "id": 2, "name": "Hardware" },
      "relatedSystem": { "id": 7, "name": "Corporate Laptop" },
      "_count": { "attachments": 2 }
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 10,
    "totalItems": 1,
    "totalPages": 1
  }
}
```

---

#### `GET /api/tickets/:id`
Retrieves full details for a single ticket, including its active and soft-removed attachments.

- **Headers**:
  - `X-Requester-Id: 1`
- **URL Parameters**:
  - `id`: Ticket primary key (integer)
- **Ownership Check**:
  - The server verifies `ticket.requesterId === Number(req.headers['x-requester-id'])`.
  - If the ticket belongs to a different requester, the server returns `404 Not Found` (or `403 Forbidden`) to prevent enumeration.
- **Response `200 OK`**:
```json
{
  "id": 101,
  "ticketNumber": "TICK-20260906-0001",
  "requesterId": 1,
  "categoryId": 2,
  "relatedSystemId": 7,
  "summary": "Laptop battery drains in less than 30 minutes",
  "description": "After the recent operating system update, the laptop shuts down unexpectedly when unplugged.",
  "requestedPriority": "HIGH",
  "currentStatus": "NEW",
  "createdAt": "2026-09-06T08:30:00.000Z",
  "updatedAt": "2026-09-06T08:30:00.000Z",
  "requester": {
    "id": 1,
    "name": "Somchai Jaidee",
    "email": "somchai.jai@kmutt.ac.th",
    "department": "Engineering"
  },
  "category": { "id": 2, "name": "Hardware" },
  "relatedSystem": { "id": 7, "name": "Corporate Laptop" },
  "attachments": [
    {
      "id": 11,
      "originalFilename": "battery_diagnostic.png",
      "mimeType": "image/png",
      "sizeBytes": 245000,
      "isRemoved": false,
      "removedAt": null,
      "removedReason": null,
      "uploadedAt": "2026-09-06T08:32:00.000Z"
    },
    {
      "id": 12,
      "originalFilename": "wrong_invoice.pdf",
      "mimeType": "application/pdf",
      "sizeBytes": 512000,
      "isRemoved": true,
      "removedAt": "2026-09-06T09:00:00.000Z",
      "removedReason": "Uploaded incorrect document",
      "uploadedAt": "2026-09-06T08:35:00.000Z"
    }
  ]
}
```

---

### 2.3 Attachment Endpoints

#### `POST /api/tickets/:id/attachments`
Uploads a single attachment to an existing ticket.

- **Headers**:
  - `Content-Type: multipart/form-data`
  - `X-Requester-Id: 1`
- **Body**:
  - `file`: Binary file upload
- **Enforced Constraints**:
  - Ticket ownership verified (`requesterId === header`).
  - Active attachment count check: `COUNT(attachments where ticketId = :id and isRemoved = false) < 5`. If 5, returns `400 Bad Request` ("Maximum of 5 active attachments reached").
  - File size: max 5 MB (5,242,880 bytes). If exceeded, returns `413 Payload Too Large`.
  - MIME type: must be `image/jpeg`, `image/png`, `image/webp`, or `application/pdf`. If not, returns `415 Unsupported Media Type`.
- **Response `201 Created`**:
```json
{
  "id": 13,
  "ticketId": 101,
  "originalFilename": "error_screen.jpg",
  "mimeType": "image/jpeg",
  "sizeBytes": 182000,
  "isRemoved": false,
  "uploadedAt": "2026-09-06T09:15:00.000Z"
}
```

---

#### `GET /api/tickets/:id/attachments/:attachmentId/download`
Downloads an active attachment file.

- **Headers**:
  - `X-Requester-Id: 1`
- **Security Checks**:
  1. Ticket must exist and belong to `X-Requester-Id`.
  2. Attachment must belong to Ticket.
  3. `isRemoved` must be `false`. If `true`, returns `404 Not Found` or `410 Gone` with message: `"This attachment has been removed and cannot be downloaded"`.
- **Response `200 OK`**:
  - Headers:
    - `Content-Type: image/png` (matches attachment mime type)
    - `Content-Disposition: attachment; filename="battery_diagnostic.png"`
    - `Content-Length: 245000`
  - Binary file stream from `server/uploads/attachments/{storedFilename}`.

---

#### `PATCH /api/tickets/:id/attachments/:attachmentId/remove`
Soft-removes an attachment with an optional reason.

- **Headers**:
  - `Content-Type: application/json`
  - `X-Requester-Id: 1`
- **Request Body**:
```json
{
  "reason": "Duplicate screenshot uploaded by mistake"
}
```
- **Validation Rules**:
  - `reason`: Optional string, max length 200 characters.
  - Attachment must belong to ticket, ticket must belong to `X-Requester-Id`.
  - If already removed, returns `400 Bad Request` ("Attachment is already removed").
- **Backend Operation**:
  - Updates DB record: `isRemoved: true`, `removedAt: new Date()`, `removedReason: reason || null`.
  - Underlying file remains on disk (or moved to soft-delete folder) and is NOT deleted to maintain auditability.
- **Response `200 OK`**:
```json
{
  "id": 13,
  "isRemoved": true,
  "removedAt": "2026-09-06T09:20:00.000Z",
  "removedReason": "Duplicate screenshot uploaded by mistake"
}
```

---

## 3. Full HTTP Status Code Mapping

| HTTP Code | Name | Usage in TokTickIT Lab 2 API |
|---|---|---|
| **200** | OK | Successful `GET` queries (requesters, categories, tickets list/detail), download stream, and `PATCH` soft-remove. |
| **201** | Created | Successful `POST /api/tickets` and `POST /api/tickets/:id/attachments`. |
| **400** | Bad Request | Validation errors (e.g. summary < 5 chars, description > 2000 chars, limit of 5 attachments exceeded, invalid query params). |
| **401** | Unauthorized | Missing `X-Requester-Id` header on protected ticket routes. |
| **403** | Forbidden | Requester identity inactive, or attempting to access/modify a ticket belonging to another requester. |
| **404** | Not Found | Requested ticket or attachment does not exist (or belongs to another user, preventing enumeration). |
| **410** | Gone | Attempted download of an attachment flagged as `isRemoved = true`. |
| **413** | Payload Too Large | Uploaded file size exceeds the 5 MB limit. |
| **415** | Unsupported Media Type | Uploaded file MIME type is not JPEG, PNG, WEBP, or PDF. |
| **500** | Internal Server Error | Unexpected database or disk I/O error. Never exposes internal stack traces to client. |
