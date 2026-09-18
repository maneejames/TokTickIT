# TokTickIT — Sprint 3 REST API Specification

`docs/lab-03/api-spec.md`

---

## 1. Overview and Global Conventions

### 1.1 Base URL
```text
http://localhost:3000/api
```

### 1.2 Authentication & Session Architecture
Lab 3 transitions from the temporary `X-Requester-Id` header simulation to standard cookie-based sessions:
- Upon successful login (`POST /api/auth/login`), the server issues an HTTP-only, `SameSite=Lax` cookie named `toktickit_session`.
- The cookie contains a cryptographically signed session token or securely signed JWT.
- In automated integration tests, clients may supply standard cookie headers (`Cookie: toktickit_session=...`) or the Bearer token header (`Authorization: Bearer <token>`).
- Client-supplied `requesterId` or `userId` in request bodies or query parameters are strictly ignored for authorization and ownership determinations; identity is exclusively extracted from the validated server session.
- **Session Re-validation**: To enforce immediate account deactivation and password change requirements, session validation middleware must check `isActive` and `mustChangePassword` against the database on every authenticated request. If an account is deactivated (`isActive: false`), any session is immediately rejected with `401 Unauthorized`. If `mustChangePassword: true`, all operational endpoints reject the call with `403 Forbidden` until password change is fulfilled.

#### 1.2.1 Transitional Dual-Authentication Support (Issue #5 only)
**TEMPORARY - TO BE REMOVED IN ISSUE #6:**
During Issue #5 implementation (server-side authorization layer), Requester-role endpoints accept authentication via EITHER:
1. **Session cookies** (Lab 3+ standard), OR
2. **Legacy `X-Requester-Id` header** (Lab 2 compatibility for regression testing)

This dual-auth support exists solely to preserve Lab 2 regression test suite pass rates while the frontend migration to session authentication is completed in Issue #6. Once Issue #6 completes frontend migration, the `X-Requester-Id` authentication path will be removed entirely from the authorization middleware.

For the existing attachment-download route only, the Lab 2 `?requesterId=` browser-download compatibility exception is also accepted during this transition. Issue #6 removes that exception with the header path.

**Note**: IT Staff and Administrator endpoints require session authentication only - no legacy header support.

### 1.3 Standard Error Envelopes
Every error response returns a standardized JSON structure:
```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable summary of the error",
    "details": [
      {
        "field": "fieldName",
        "message": "Specific validation failure message"
      }
    ]
  }
}
```

### 1.4 HTTP Status Codes
| HTTP Code | Meaning | Example Trigger Scenario |
|---|---|---|
| `200 OK` | Request succeeded | Successful GET, PATCH, logout, or session validation |
| `201 Created` | Resource created | Successful ticket, user, comment, or note creation |
| `400 Bad Request` | Invalid input or business rule breach | Malformed JSON, failed validation, invalid status transition, self-deactivation attempt |
| `401 Unauthorized` | Missing, invalid, or expired session | Calling protected endpoint without active session, invalid credentials, inactive account login attempt |
| `403 Forbidden` | Authenticated but lacking permission | Requester calling IT Staff queue or Admin user endpoints; Requester or Administrator accessing Internal Notes; user with `mustChangePassword=true` calling normal endpoints |
| `404 Not Found` | Resource does not exist or hidden | Ticket ID does not exist; Requester accessing another Requester's ticket (enumeration defense) |
| `409 Conflict` | Unique constraint violation | Registering or updating user with an email already taken |
| `410 Gone` | Resource removed | Attempting to download a soft-removed attachment |
| `413 Payload Too Large`| File exceeds size limit | Uploading attachment > 5 MB |
| `415 Unsupported Media`| File type not permitted | Uploading non-allowed file MIME type |
| `500 Server Error` | Unhandled internal exception | Database connection drop or unexpected server failure |

---

## 2. Authentication & Current User Endpoints

### 2.1 User Login
- **Method & Route**: `POST /api/auth/login`
- **Access**: Public / Unauthenticated
- **Request Headers**: `Content-Type: application/json`
- **Request Body**:
```json
{
  "email": "somchai.jai@kmutt.ac.th",
  "password": "Password123!"
}
```
- **Responses**:
  - `200 OK`: Successful authentication. Sets `Set-Cookie: toktickit_session=...; HttpOnly; Path=/; SameSite=Lax`.
    ```json
    {
      "user": {
        "id": 1,
        "name": "Somchai Jaidee",
        "email": "somchai.jai@kmutt.ac.th",
        "role": "REQUESTER",
        "mustChangePassword": false
      }
    }
    ```
  - `401 Unauthorized`: Invalid credentials or inactive account (`isActive: false`).
    ```json
    {
      "error": {
        "code": "INVALID_CREDENTIALS",
        "message": "Invalid email or password"
      }
    }
    ```

---

### 2.2 User Logout
- **Method & Route**: `POST /api/auth/logout`
- **Access**: Authenticated (`REQUESTER`, `IT_STAFF`, `ADMINISTRATOR`)
- **Responses**:
  - `200 OK`: Clears `toktickit_session` cookie and invalidates session server-side.
    ```json
    {
      "message": "Successfully logged out"
    }
    ```

---

### 2.3 Current User Info
- **Method & Route**: `GET /api/auth/me`
- **Access**: Authenticated
- **Responses**:
  - `200 OK`:
    ```json
    {
      "user": {
        "id": 1,
        "name": "Somchai Jaidee",
        "email": "somchai.jai@kmutt.ac.th",
        "role": "REQUESTER",
        "mustChangePassword": false
      }
    }
    ```
  - `401 Unauthorized`: No active session or user account deactivated since session issuance.

---

### 2.4 Mandatory / User Password Change
- **Method & Route**: `POST /api/auth/change-password`
- **Access**: Authenticated (Permitted even if `mustChangePassword: true`)
- **Request Body**:
```json
{
  "currentPassword": "Password123!",
  "newPassword": "NewSecurePassword456!",
  "confirmPassword": "NewSecurePassword456!"
}
```
- **Responses**:
  - `200 OK`: Password updated successfully. Sets `mustChangePassword = false`. Invalidates old session token server-side and issues rotated session via `Set-Cookie: toktickit_session=...; HttpOnly; Path=/; SameSite=Lax`.
    ```json
    {
      "message": "Password changed successfully"
    }
    ```
  - `400 Bad Request`: Passwords do not match, wrong current password, or new password fails complexity rules.
    ```json
    {
      "error": {
        "code": "VALIDATION_ERROR",
        "message": "Password does not meet complexity requirements",
        "details": [
          {
            "field": "newPassword",
            "message": "Password must be at least 8 characters long, contain uppercase, lowercase, number, and special character"
          }
        ]
      }
    }
    ```

---

## 3. Requester Ticket Endpoints (Regression & Additions)

### 3.1 Create Ticket
- **Method & Route**: `POST /api/tickets`
- **Access**: `REQUESTER` only
- **Behavior**: Ignores any `requesterId` in body; assigns authenticated user ID as ticket owner requester. Sets initial status `NEW`. Sets `itPriority` to match `requestedPriority`.
- **Request Body**:
```json
{
  "categoryId": 1,
  "relatedSystemId": 2,
  "requestedPriority": "HIGH",
  "summary": "VPN connection drops every 5 minutes",
  "description": "Whenever I connect to the university VPN from off-campus, the tunnel drops abruptly."
}
```
- **Responses**:
  - `201 Created`:
    ```json
    {
      "id": 12,
      "ticketNumber": "TICK-20260916-0001",
      "status": "NEW",
      "requestedPriority": "HIGH",
      "itPriority": "HIGH",
      "summary": "VPN connection drops every 5 minutes",
      "createdAt": "2026-09-16T12:00:00.000Z"
    }
    ```

---

### 3.2 List "My Tickets"
- **Method & Route**: `GET /api/tickets`
- **Access**: `REQUESTER` only
- **Query Parameters**:
  - `page`: integer (default 1)
  - `pageSize`: integer (default 10, max 50)
  - `search`: string (case-insensitive substring of `ticketNumber` or `summary`)
  - `status`: string (filter by ticket status)
  - `categoryId`: integer
  - `sortBy`: `createdAt` | `requestedPriority` | `status` | `summary`
  - `sortOrder`: `asc` | `desc`
- **Responses**:
  - `200 OK`: Returns only tickets owned by the authenticated Requester.

---

### 3.3 Ticket Detail (Requester View)
- **Method & Route**: `GET /api/tickets/:id`
- **Access**: `REQUESTER` (owned tickets only) or `IT_STAFF` (any ticket)
- **Responses**:
  - `200 OK`: Full ticket detail including category, related system, attachments, and public comments.
  - `404 Not Found`: Ticket does not exist OR belongs to another requester when accessed by a Requester.

---

### 3.4 Requester "Problem Appears Resolved" Indicator
- **Method & Route**: `PATCH /api/tickets/:id/resolve-indicator`
- **Access**: `REQUESTER` (owner of ticket only)
- **Request Body**:
```json
{
  "isRequesterResolved": true
}
```
- **Responses**:
  - `200 OK`: Returns updated `isRequesterResolved` state. Note: Formal ticket status remains unchanged.

---

## 4. Public Comments & Internal Notes Endpoints

### 4.1 Post Public Comment
- **Method & Route**: `POST /api/tickets/:id/comments`
- **Access**: `REQUESTER` (owner of ticket only) or `IT_STAFF`
- **Request Body**:
```json
{
  "content": "I have rebooted the gateway as requested, but the connection still drops."
}
```
- **Responses**:
  - `201 Created`:
    ```json
    {
      "id": 1,
      "ticketId": 12,
      "authorId": 1,
      "authorName": "Somchai Jaidee",
      "authorRole": "REQUESTER",
      "content": "I have rebooted the gateway as requested, but the connection still drops.",
      "createdAt": "2026-09-16T12:30:00.000Z"
    }
    ```
  - `400 Bad Request`: Empty or whitespace-only content, or content exceeding 2000 characters.

---

### 4.2 Get Public Comments
- **Method & Route**: `GET /api/tickets/:id/comments`
- **Access**: `REQUESTER` (owner of ticket only) or `IT_STAFF`
- **Responses**:
  - `200 OK`: Full list of all public comments for the ticket, returned unpaginated and sorted chronologically ascending (`createdAt ASC`).

---

### 4.3 Post Internal Note
- **Method & Route**: `POST /api/tickets/:id/notes`
- **Access**: `IT_STAFF` only (`REQUESTER` and `ADMINISTRATOR` receive `403 Forbidden`)
- **Request Body**:
```json
{
  "content": "Investigated firewall logs on core switch. Detected intermittent packet loss."
}
```
- **Responses**:
  - `201 Created`:
    ```json
    {
      "id": 1,
      "ticketId": 12,
      "authorId": 2,
      "authorName": "Witchai Tech",
      "content": "Investigated firewall logs on core switch. Detected intermittent packet loss.",
      "createdAt": "2026-09-16T12:35:00.000Z"
    }
    ```
  - `403 Forbidden`: Called by Requester or Administrator.

---

### 4.4 Get Internal Notes
- **Method & Route**: `GET /api/tickets/:id/notes`
- **Access**: `IT_STAFF` only (`REQUESTER` and `ADMINISTRATOR` receive `403 Forbidden`)
- **Responses**:
  - `200 OK`: Full list of all internal notes for the ticket, returned unpaginated and sorted chronologically ascending (`createdAt ASC`).
  - `403 Forbidden`: Called by Requester or Administrator. Content is never revealed.

---

## 5. IT Staff Ticket Operations Endpoints

### 5.1 IT Staff Ticket Queue
- **Method & Route**: `GET /api/staff/tickets`
- **Access**: `IT_STAFF` only
- **Query Parameters**:
  - `page`: integer (default 1)
  - `pageSize`: integer (default 10, max 50)
  - `search`: string (case-insensitive search on `ticketNumber`, `summary`, or requester name)
  - `status`: string (filter by single status or multiple)
  - `priority`: `LOW` | `MEDIUM` | `HIGH` | `URGENT` (filters `itPriority`)
  - `categoryId`: integer
  - `ownerId`: integer | `unassigned`
  - `sortBy`: `createdAt` | `updatedAt` | `itPriority` | `status` | `ticketNumber`
  - `sortOrder`: `asc` | `desc`
- **Responses**:
  - `200 OK`: Paginated list of all system tickets.
    ```json
    {
      "items": [
        {
          "id": 12,
          "ticketNumber": "TICK-20260916-0001",
          "summary": "VPN connection drops every 5 minutes",
          "category": { "id": 4, "name": "Network" },
          "requestedPriority": "HIGH",
          "itPriority": "HIGH",
          "status": "OPEN",
          "owner": { "id": 2, "name": "Witchai Tech" },
          "requester": { "id": 1, "name": "Somchai Jaidee" },
          "isRequesterResolved": false,
          "createdAt": "2026-09-16T12:00:00.000Z",
          "updatedAt": "2026-09-16T12:10:00.000Z"
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

### 5.2 Claim or Assign Ticket Ownership
- **Method & Route**: `PATCH /api/staff/tickets/:id/owner`
- **Access**: `IT_STAFF` only
- **Request Body**:
```json
{
  "ownerId": 2
}
```
*(If `ownerId` is omitted, defaults to the authenticated IT Staff user claiming the ticket)*
- **Responses**:
  - `200 OK`: Ticket owner updated.
  - `400 Bad Request`: Target owner is inactive, does not exist, or possesses role `REQUESTER`.

---

### 5.3 Update IT Priority
- **Method & Route**: `PATCH /api/staff/tickets/:id/priority`
- **Access**: `IT_STAFF` only
- **Request Body**:
```json
{
  "itPriority": "URGENT"
}
```
- **Responses**:
  - `200 OK`: Updates `itPriority`. Does not modify `requestedPriority`.
  - `400 Bad Request`: Invalid priority value.

---

### 5.4 Update Ticket Status (Workflow Transition)
- **Method & Route**: `PATCH /api/staff/tickets/:id/status`
- **Access**: `IT_STAFF` only
- **Request Body**:
```json
{
  "status": "IN_PROGRESS"
}
```
- **Responses**:
  - `200 OK`: Updates status in accordance with the status transition matrix.
  - `400 Bad Request`: Transition not permitted from current status.

---

## 6. Administrator User Management Endpoints

### 6.1 List Users
- **Method & Route**: `GET /api/admin/users`
- **Access**: `ADMINISTRATOR` only
- **Query Parameters**:
  - `search`: string (case-insensitive search in `name` or `email`)
  - `role`: `REQUESTER` | `IT_STAFF` | `ADMINISTRATOR`
- **Responses**:
  - `200 OK`: Full array of all matching user accounts, unpaginated and ordered deterministically by `id ASC` (`isActive` both true and false included).
    ```json
    [
      {
        "id": 1,
        "name": "Somchai Jaidee",
        "email": "somchai.jai@kmutt.ac.th",
        "role": "REQUESTER",
        "isActive": true,
        "mustChangePassword": false,
        "createdAt": "2026-09-01T08:00:00.000Z"
      }
    ]
    ```

---

### 6.2 Create User
- **Method & Route**: `POST /api/admin/users`
- **Access**: `ADMINISTRATOR` only
- **Request Body**:
```json
{
  "name": "Prasert Somboon",
  "email": "prasert.som@kmutt.ac.th",
  "role": "IT_STAFF",
  "isActive": true,
  "initialPassword": "<initial-password>"
}
```
- **Responses**:
  - `201 Created`: User created, password hashed with bcrypt, `mustChangePassword = true`.
  - `400 Bad Request`: Validation failure, invalid role, or initial password fails complexity rules.
  - `409 Conflict`: Email already exists in the system.

---

### 6.3 Update User
- **Method & Route**: `PATCH /api/admin/users/:id`
- **Access**: `ADMINISTRATOR` only
- **Request Body**:
```json
{
  "name": "Prasert Somboon (Senior)",
  "email": "prasert.som@kmutt.ac.th",
  "role": "IT_STAFF",
  "isActive": false
}
```
- **Responses**:
  - `200 OK`: Returns updated user object.
  - `400 Bad Request`: Administrator attempts to deactivate their own account, or deactivates/reassigns the last active administrator.
  - `409 Conflict`: Email address is already in use by another user.

---

### 6.4 Set New Initial Password
- **Method & Route**: `POST /api/admin/users/:id/reset-password`
- **Access**: `ADMINISTRATOR` only
- **Request Body**:
```json
{
  "newInitialPassword": "NewTempPassword123!"
}
```
- **Responses**:
  - `200 OK`: Hashes new password, sets `mustChangePassword = true`.
  - `400 Bad Request`: Password fails complexity rules.
