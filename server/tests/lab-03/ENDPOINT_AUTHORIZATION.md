# TokTickIT API Endpoint Authorization Matrix

Based on specification.md §6 Authorization Matrix

## Authentication Endpoints

| Endpoint | Method | Unauthenticated | Requester | IT Staff | Administrator |
|----------|--------|-----------------|-----------|----------|---------------|
| `/api/auth/login` | POST | ✅ | ✅ | ✅ | ✅ |
| `/api/auth/logout` | POST | ❌ 401 | ✅ | ✅ | ✅ |
| `/api/auth/me` | GET | ❌ 401 | ✅ | ✅ | ✅ |
| `/api/auth/change-password` | POST | ❌ 401 | ✅ | ✅ | ✅ |

## Requester Ticket Operations (Lab 2 + Lab 3)

| Endpoint | Method | Unauthenticated | Requester | IT Staff | Administrator |
|----------|--------|-----------------|-----------|----------|---------------|
| `/api/tickets` | POST | ❌ 401 | ✅ (Creates own) | ❌ 403 | ❌ 403 |
| `/api/tickets` | GET | ❌ 401 | ✅ (Owned only) | ❌ 403 | ❌ 403 |
| `/api/tickets/:id` | GET | ❌ 401 | ✅ (Owned only, 404 if not owned) | ✅ (Any ticket) | ❌ 403 |
| `/api/tickets/:id/attachments` | POST | ❌ 401 | ✅ (Owned only, 404 if not owned) | ❌ 403 | ❌ 403 |
| `/api/tickets/:id/attachments/:attachmentId` | GET | ❌ 401 | ✅ (Owned only, 404 if not owned) | ✅ (Any ticket) | ❌ 403 |
| `/api/tickets/:id/attachments/:attachmentId/download` | GET | ❌ 401 | ✅ (Owned only, 404 if not owned) | ✅ (Any ticket) | ❌ 403 |
| `/api/tickets/:id/attachments/:attachmentId/remove` | PATCH | ❌ 401 | ✅ (Owned only, 404 if not owned) | ❌ 403 | ❌ 403 |

**Note**: The specification §6 shows Administrator should get 403 for attachment download, but this seems inconsistent with typical patterns. Will implement as specified (403 for Admin).

## Requester Comments & Resolution (Lab 3)

| Endpoint | Method | Unauthenticated | Requester | IT Staff | Administrator |
|----------|--------|-----------------|-----------|----------|---------------|
| `/api/tickets/:id/comments` | POST | ❌ 401 | ✅ (Owned only) | ✅ (Any ticket) | ❌ 403 |
| `/api/tickets/:id/comments` | GET | ❌ 401 | ✅ (Owned only) | ✅ (Any ticket) | ❌ 403 |
| `/api/tickets/:id/resolve-indicator` | PATCH | ❌ 401 | ✅ (Owned only) | ❌ 403 | ❌ 403 |

## IT Staff Operations (Lab 3)

| Endpoint | Method | Unauthenticated | Requester | IT Staff | Administrator |
|----------|--------|-----------------|-----------|----------|---------------|
| `/api/staff/tickets` | GET | ❌ 401 | ❌ 403 | ✅ | ❌ 403 |
| `/api/staff/tickets/:id/owner` | PATCH | ❌ 401 | ❌ 403 | ✅ | ❌ 403 |
| `/api/staff/tickets/:id/priority` | PATCH | ❌ 401 | ❌ 403 | ✅ | ❌ 403 |
| `/api/staff/tickets/:id/status` | PATCH | ❌ 401 | ❌ 403 | ✅ | ❌ 403 |
| `/api/tickets/:id/notes` | POST | ❌ 401 | ❌ 403 | ✅ | ❌ 403 |
| `/api/tickets/:id/notes` | GET | ❌ 401 | ❌ 403 | ✅ | ❌ 403 |

## Administrator Operations (Lab 3)

| Endpoint | Method | Unauthenticated | Requester | IT Staff | Administrator |
|----------|--------|-----------------|-----------|----------|---------------|
| `/api/admin/users` | GET | ❌ 401 | ❌ 403 | ❌ 403 | ✅ |
| `/api/admin/users` | POST | ❌ 401 | ❌ 403 | ❌ 403 | ✅ |
| `/api/admin/users/:id` | PATCH | ❌ 401 | ❌ 403 | ❌ 403 | ✅ |
| `/api/admin/users/:id/reset-password` | POST | ❌ 401 | ❌ 403 | ❌ 403 | ✅ |

## Public/Utility Endpoints (No Auth Required)

| Endpoint | Method | Authorization |
|----------|--------|---------------|
| `/api/health` | GET | Public (no auth) |
| `/api/categories` | GET | Public (no auth) |
| `/api/related-systems` | GET | Public (no auth) |
| `/api/requesters` | GET | Public (no auth) - Lab 2 legacy |

## Key Authorization Rules

1. **Unauthenticated (401)**: All protected endpoints require authentication
2. **Wrong Role (403)**: Authenticated users attempting operations outside their role permissions
3. **Wrong Owner (404)**: Requesters attempting to access tickets they don't own return 404 (not 403) to prevent enumeration
4. **Session-Derived Identity**: All operations derive userId/requesterId from authenticated session, never from client-supplied IDs
5. **Internal Notes Secrecy**: Internal notes are STRICTLY forbidden for Requesters and Administrators (403)
6. **mustChangePassword Barrier**: Users with mustChangePassword=true cannot access operational endpoints (403) except /api/auth/change-password
