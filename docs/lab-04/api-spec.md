# TokTickIT — Sprint 4 API Specification

`docs/lab-04/api-spec.md`

Extends the Lab 2 and Lab 3 API contracts. All approved Lab 2/3 endpoints continue unchanged unless listed in §3 or §6. Companion to `specification.md` (FR/BR/AC IDs referenced below).

---

## 1. Conventions

- **Auth**: session cookie `toktickit_session` (HttpOnly, SameSite=Lax) from Lab 3. Every endpoint below requires authentication unless stated.
- **Identity**: user id and role always come from the server session. Client-supplied `performedById`, `requesterId`, or `userId` are ignored (BR-04, BR-11, BR-12).
- **Error shape** (all errors):
  ```json
  { "error": { "code": "VALIDATION_ERROR", "message": "Human-readable safe message", "details": [{ "field": "followUpNote", "message": "Required when follow-up is needed" }] } }
  ```
  `details` is optional. Messages never expose stack traces, SQL, or the existence of resources the caller may not see.
- **Timestamps**: ISO 8601 UTC in responses. Dashboard windows use a rolling 7×24h window from request time; display time zone is `Asia/Bangkok` (UI converts).

### 1.1 Status codes

| Code | Meaning | Lab 4 example |
|---|---|---|
| 200 | OK | Successful GET / PATCH, idempotent replay of a create |
| 201 | Created | New Actions Taken |
| 400 | Validation / invalid transition | Missing Follow-up Note; status transition not in matrix |
| 401 | Unauthenticated | No/invalid session |
| 403 | Forbidden | Requester calling a write endpoint; `mustChangePassword` barrier |
| 404 | Not found | Missing ticket/action, **or** a Requester asking for another Requester's ticket (no existence leak) |
| 409 | Conflict | Stale `expectedVersion` on a workflow change |
| 500 | Unexpected error | Generic safe message only |

### 1.2 Concurrency (BR-10, FR-10)

`Ticket.version` (integer, starts at 0) increments on every workflow-changing write: status, owner, IT priority. Workflow endpoints require `expectedVersion` in the body.
- Match → apply change, increment version, return the new version.
- Mismatch → `409 CONFLICT`, nothing is written, response includes the current state so the client can refresh:
  ```json
  { "error": { "code": "CONFLICT", "message": "This ticket was changed by someone else. Review the latest state and try again." }, "current": { "status": "IN_PROGRESS", "ownerId": 7, "itPriority": "HIGH", "version": 5 } }
  ```

### 1.3 Idempotent create (BR/FR-16, AC-14)

`POST /api/tickets/:id/actions` requires header `Idempotency-Key: <uuid>` (client generates one per opened create form). The server stores it with the record (unique per ticket). Replaying the same key returns the **original** record with `200 OK` and creates nothing new. Missing key → `400`.

---

## 2. Actions Taken

### 2.1 List — `GET /api/tickets/:id/actions`
- **Access**: Requester (own ticket only), IT Staff, Administrator.
- **Order**: `actionDateTime ASC, id ASC` (stable). Full list, unpaginated (low volume per ticket).
- **200**:
  ```json
  { "items": [ {
      "id": 31, "ticketId": 12,
      "actionDateTime": "2026-10-08T03:15:00.000Z",
      "description": "Replaced faulty battery",
      "result": "Battery now holds charge",
      "performedBy": { "id": 8, "name": "Kamon Tech" },
      "assignee": { "id": 9, "name": "Naree Tech" },
      "status": "PLANNED",
      "completedAt": null,
      "followUpRequired": true,
      "followUpNote": "Check battery health again in one week",
      "attachmentNotes": "See photo of the old battery in Attachments",
      "version": 0,
      "createdAt": "…", "updatedAt": "…"
  } ] }
  ```
- **Errors**: 401; 404 (ticket missing, or Requester not owner).

### 2.2 Create — `POST /api/tickets/:id/actions`
- **Access**: IT Staff, Administrator. Requester → `403`.
- **Headers**: `Idempotency-Key` (required).
- **Body**: `{ "description": string, "result": string, "followUpRequired": boolean, "followUpNote"?: string, "attachmentNotes"?: string, "assigneeId"?: number | null, "actionDateTime"?: ISO string }` (new records always start as `PLANNED`; the server sets `status`, `completedAt`, `version`).
- **Server-set**: `performedBy` (session user), `ticketId` (path), `createdAt`. `actionDateTime` defaults to now; if supplied it must not be in the future (> now + 5 min tolerance) → `400`.
- **Validation**:
  | Field | Rule |
  |---|---|
  | description | required, trimmed, 1–2000 chars |
  | result | required, trimmed, 1–1000 chars |
  | followUpRequired | required boolean |
  | followUpNote | required and non-blank **iff** `followUpRequired = true` (BR-05); 1–1000 chars |
  | attachmentNotes | optional, ≤ 500 chars |
  | assigneeId | optional; if present must be an **active** IT Staff/Administrator, else `400` (BR-15, AC-15) |
- **Ticket state rule**: creating on a `CANCELLED` or `CLOSED` ticket → `400 INVALID_STATE` (BR-18, AC-18).
- **201** returns the record (shape of §2.1 item). **200** on idempotent replay.
- **Errors**: 400, 401, 403, 404, 500.

### 2.3 Reassign — `PATCH /api/tickets/:id/actions/:actionId/assign`
- **Access**: IT Staff, Administrator. Requester → `403`.
- **Body**: `{ "assigneeId": number | null, "expectedVersion": number }`. `assigneeId` must be an active IT Staff/Administrator, or `null` to unassign; else `400` (BR-15, AC-15).
- Only while the action is `PLANNED` — calling this on a `COMPLETED`/`CANCELLED` record → `400 INVALID_STATE`. Closed/Cancelled **ticket** → `400 INVALID_STATE` (BR-18).
- Stale `expectedVersion` → `409`.
- **No other field on this endpoint** — it changes nothing except `assigneeId`; `description`, `result`, `followUpRequired`, `followUpNote`, `attachmentNotes`, `performedBy`, `ticketId`, `createdAt` are append-only and cannot be touched here (BR-06).
- **Errors**: 400, 401, 403, 404, 409.

### 2.4 Complete / Cancel — `PATCH /api/tickets/:id/actions/:actionId/status`
- **Access**: IT Staff, Administrator. Requester → `403`.
- **Body**: `{ "status": "COMPLETED" | "CANCELLED", "expectedVersion": number }`.
- Only `PLANNED → COMPLETED` (sets `completedAt` to server time) and `PLANNED → CANCELLED` are valid; any other value, or calling this on an already-`COMPLETED`/`CANCELLED` record, → `400` (BR-16, AC-16).
- Closed/Cancelled **ticket** → `400 INVALID_STATE` (BR-18).
- Stale `expectedVersion` → `409`.
- **This endpoint cannot change `description`, `result`, `followUpRequired`, `followUpNote`, or `attachmentNotes`** — those are append-only (BR-06). There is **no DELETE endpoint** anywhere for Actions Taken; an unwanted action is cancelled, never removed.
- **Errors**: 400, 401, 403, 404, 409.

---

## 3. Ticket workflow (extended from Lab 3)

All three endpoints keep their Lab 3 paths and validation. In Lab 4, authorization is **IT Staff and Administrator** (decision D-3 / BR-17). **New in Lab 4**: required `expectedVersion`, and `version` returned in the response.

| Endpoint | Body | Notes |
|---|---|---|
| `PATCH /api/staff/tickets/:id/status` | `{ "status": "RESOLVED", "expectedVersion": 4 }` | Must be in the transition matrix (`specification.md` §6). Resolved/Closed only by IT Staff/Admin (FR-08). Invalid transition → 400. |
| `PATCH /api/staff/tickets/:id/owner` | `{ "ownerId"?: number, "expectedVersion": 4 }` | Omitted `ownerId` = claim. Owner must be active IT Staff/Admin. |
| `PATCH /api/staff/tickets/:id/priority` | `{ "itPriority": "HIGH", "expectedVersion": 4 }` | `requestedPriority` never changes. |

**200 response** (all three): `{ "id": 12, "ticketNumber": "…", "status": "...", "ownerId": 7, "itPriority": "...", "requestedPriority": "...", "version": 5, "updatedAt": "…" }`
**409**: see §1.2.

**Resolution gate (AC-05, AC-07)**: enforced here at the API. `PATCH /api/tickets/:id/resolve-indicator` (Lab 3, Requester) continues to only toggle `isRequesterResolved`; it never changes `status` or `version`.

`GET /api/tickets/:id` and `GET /api/staff/tickets/:id` additionally return `version`.

---

## 4. Dashboards

Metrics are computed by the backend only (BR-13). "Non-terminal" = `NEW, OPEN, IN_PROGRESS, WAITING_FOR_REQUESTER, REOPENED`. Each metric returns `count` and `drillDown` (the exact query params for the existing list endpoint/screen so the list total always equals the card count). Empty data returns `count: 0` and empty arrays, never an error.

### 4.1 Requester — `GET /api/dashboard/requester`
- **Access**: Requester only (IT Staff/Admin → `403`). Scope: `requesterId = session user` (BR-11).
- **200**:
  ```json
  {
    "generatedAt": "…",
    "metrics": {
      "activeTickets":       { "count": 3, "drillDown": { "status": "NEW,OPEN,IN_PROGRESS,WAITING_FOR_REQUESTER,REOPENED" } },
      "waitingForRequester": { "count": 1, "drillDown": { "status": "WAITING_FOR_REQUESTER" } },
      "resolved":            { "count": 5, "drillDown": { "status": "RESOLVED" } },
      "closed":              { "count": 12, "drillDown": { "status": "CLOSED" } }
    },
    "recentlyUpdated":  [ { "id": 12, "ticketNumber": "…", "summary": "…", "status": "…", "updatedAt": "…" } ],
    "recentlyResolved": [ { "id": 9,  "ticketNumber": "…", "summary": "…", "status": "RESOLVED", "updatedAt": "…" } ]
  }
  ```
- **Definitions**: `activeTickets` = own tickets in non-terminal statuses; `waitingForRequester` is a subset of active (needs the Requester's attention). `recentlyUpdated` = own tickets with `updatedAt` in last 7 days, newest first, max 5. `recentlyResolved` = own tickets with `status = RESOLVED` and `updatedAt` in last 7 days, newest first, max 5.
- **Drill-down target**: existing `GET /api/tickets` (My Tickets). **API change**: its `status` filter now accepts a comma-separated list (backward compatible with the single-value Lab 2 behavior; invalid value → 400).

### 4.2 IT Staff — `GET /api/dashboard/staff`
- **Access**: IT Staff, Administrator (reuses the same endpoint). Requester → `403`.
- **200**:
  ```json
  {
    "generatedAt": "…",
    "metrics": {
      "byStatus": { "NEW": {"count":14,"drillDown":{"status":"NEW"}}, "OPEN": {…}, "IN_PROGRESS": {…}, "WAITING_FOR_REQUESTER": {…}, "RESOLVED": {…}, "CLOSED": {…}, "REOPENED": {…}, "CANCELLED": {…} },
      "unassigned":   { "count": 4, "drillDown": { "ownerId": "unassigned", "status": "NEW,OPEN,IN_PROGRESS,WAITING_FOR_REQUESTER,REOPENED" } },
      "myOwned":      { "count": 6, "drillDown": { "ownerId": 7, "status": "NEW,OPEN,IN_PROGRESS,WAITING_FOR_REQUESTER,REOPENED" } },
      "byItPriority": { "URGENT": {"count":2,"drillDown":{"priority":"URGENT","status":"NEW,OPEN,IN_PROGRESS,WAITING_FOR_REQUESTER,REOPENED"}}, "HIGH": {…}, "MEDIUM": {…}, "LOW": {…} },
      "requesterResolvedPending": { "count": 3, "drillDown": { "status": "OPEN,IN_PROGRESS,WAITING_FOR_REQUESTER,REOPENED", "requesterResolved": true } },
      "myFollowUps":  { "count": 2 }
    },
    "urgentTickets":   [ { "id": 5, "ticketNumber": "…", "summary": "…", "itPriority": "URGENT", "status": "…", "ownerName": null, "createdAt": "…" } ],
    "recentlyUpdated": [ { "id": 12, "ticketNumber": "…", "summary": "…", "status": "…", "updatedAt": "…" } ],
    "myRecentActions": [ { "id": 31, "ticketId": 12, "ticketNumber": "…", "descriptionPreview": "Replaced faulty battery", "followUpRequired": true, "actionDateTime": "…" } ]
  }
  ```
- **Definitions**: `byStatus` counts all tickets by status (all eight keys always present, 0 when empty). `unassigned` = `ownerId IS NULL` and non-terminal. `myOwned` = `ownerId = session user` and non-terminal (BR-12). `byItPriority` = non-terminal tickets by `itPriority`. `requesterResolvedPending` = `isRequesterResolved = true` and status in the four statuses listed (awaiting IT Staff verification). `myFollowUps` = Actions Taken by the session user with `followUpRequired = true` on non-terminal tickets (no drill-down; informational). `urgentTickets` = non-terminal with `itPriority = URGENT`, oldest first, max 5. `recentlyUpdated` = `updatedAt` in last 7 days, newest first, max 5. `myRecentActions` = latest 5 Actions Taken by the session user.
- **Drill-down target**: existing `GET /api/staff/tickets`. **API change**: add optional filter `requesterResolved=true|false` (invalid → 400). Existing `status`, `priority`, `ownerId` filters already support these values.
- **Consistency rule (AC-08, AC-09)**: for every metric with a `drillDown`, `GET <list>?<drillDown>` must return `pagination.totalItems == count`.

---

## 5. Regression and health
- `GET /api/health` unchanged (200, `{ "status": "ok", … }`).
- All Lab 2/3 endpoints keep paths, shapes, and authorization (AC-11). The only shape changes are additive: `version` on ticket detail/workflow responses, comma-separated `status` on `GET /api/tickets`, `requesterResolved` filter on the staff queue.

## 6. Authorization summary

| Endpoint | Unauth | Requester | IT Staff | Administrator |
|---|---|---|---|---|
| `GET /api/tickets/:id/actions` | 401 | ✅ own ticket (else 404) | ✅ | ✅ |
| `POST /api/tickets/:id/actions` | 401 | 403 | ✅ | ✅ |
| `PATCH /api/tickets/:id/actions/:actionId/assign` | 401 | 403 | ✅ | ✅ |
| `PATCH /api/tickets/:id/actions/:actionId/status` | 401 | 403 | ✅ | ✅ |
| `GET /api/dashboard/requester` | 401 | ✅ | 403 | 403 |
| `GET /api/dashboard/staff` | 401 | 403 | ✅ | ✅ |
| `PATCH /api/staff/tickets/:id/{status,owner,priority}` | 401 | 403 | ✅ | ✅ (D-3) |

## 7. Decisions applied to this contract
- **D-1 (adopted)**: Actions Taken have an optional `assigneeId` (active IT Staff/Admin only) and a `status` (`PLANNED | COMPLETED | CANCELLED`) — §2.2–§2.4.
- **D-2 (adopted)**: content (description, result, follow-up fields) is append-only — no edit endpoint exists for it, ever. Only `assigneeId` (§2.3) and `status` (§2.4) can change after creation; `performedBy`/`ticketId`/`createdAt` are always immutable; a stale `expectedVersion` → 409; there is no DELETE endpoint.
- **D-3 (adopted)**: in Lab 4, Administrator has the same access as IT Staff on every ticket/staff endpoint in §6 below. Requester-only endpoints (`POST /api/tickets`, `GET /api/tickets`, attachment upload/remove, `resolve-indicator`, `GET /api/dashboard/requester`) stay Requester-only.
- **Data model note**: `ActionTaken` has `version`, `clientRequestId`, `assigneeId`, `status`, `completedAt` (see `specification.md` §8).
