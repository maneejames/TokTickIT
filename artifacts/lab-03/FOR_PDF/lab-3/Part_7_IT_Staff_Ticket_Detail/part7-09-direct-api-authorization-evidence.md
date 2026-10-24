# Lab 3 API Authorization Evidence

This document provides captured `curl` request/response pairs demonstrating API-level authorization enforcement in TokTickIT across the three required authorization failure categories:
1. **401 Unauthorized**: Request with missing or invalid authentication session.
2. **403 Forbidden**: Request from an authenticated user whose assigned role lacks required privileges.
3. **404 Not Found (Cross-Ownership Defense)**: Request from an authenticated requester attempting to access or manipulate a resource owned by another requester, returning `404 Not Found` to avoid disclosing resource existence.

All requests were executed against the active backend server (`http://localhost:3000`).

---

## 1. Unauthenticated Access (401 Unauthorized)

### Scenario
An unauthenticated client attempts to query the tickets endpoint (`GET /api/tickets`) without providing a session cookie (`toktickit_session`).

### Request
```http
GET /api/tickets HTTP/1.1
Host: localhost:3000
Accept: */*
User-Agent: curl/8.9.1
```

**Command:**
```bash
curl -i -X GET http://localhost:3000/api/tickets
```

### Response
```http
HTTP/1.1 401 Unauthorized
X-Powered-By: Express
Vary: Origin
Access-Control-Allow-Credentials: true
Content-Type: application/json; charset=utf-8
Content-Length: 69
ETag: W/"45-JP7DVE0hDQzX+mcXoyobRGQOx68"
Date: Sat, 03 Oct 2026 10:51:15 GMT
Connection: keep-alive
Keep-Alive: timeout=5

{"error":{"code":"UNAUTHORIZED","message":"Authentication required"}}
```

### Analysis
- **Status Code**: `401 Unauthorized`
- **Response Payload**: `{"error":{"code":"UNAUTHORIZED","message":"Authentication required"}}`
- **Security Confirmation**: The `requireAuth` middleware intercepts unauthenticated requests prior to controller execution, preventing unauthorized access to protected ticket records.

---

## 2. Wrong-Role Access (403 Forbidden)

### Scenario
An authenticated user with role `REQUESTER` (`somchai.jai@kmutt.ac.th`) attempts to access the administrative user management endpoint (`GET /api/admin/users`), which requires the `ADMINISTRATOR` role.

### Request
```http
GET /api/admin/users HTTP/1.1
Host: localhost:3000
Accept: */*
Cookie: toktickit_session=e4e3f55f1a1ab5a438587a426f6524c6d7aeff9d31a942198d9be4e16d7f15f5
User-Agent: curl/8.9.1
```

**Command:**
```bash
curl -i -X GET http://localhost:3000/api/admin/users \
  -H "Cookie: toktickit_session=e4e3f55f1a1ab5a438587a426f6524c6d7aeff9d31a942198d9be4e16d7f15f5"
```

### Response
```http
HTTP/1.1 403 Forbidden
X-Powered-By: Express
Vary: Origin
Access-Control-Allow-Credentials: true
Content-Type: application/json; charset=utf-8
Content-Length: 67
ETag: W/"43-Rs2EkGW+WCd0o8rtDxnW0CvxJOA"
Date: Sat, 03 Oct 2026 10:51:15 GMT
Connection: keep-alive
Keep-Alive: timeout=5

{"error":{"code":"FORBIDDEN","message":"Insufficient permissions"}}
```

### Analysis
- **Status Code**: `403 Forbidden`
- **Response Payload**: `{"error":{"code":"FORBIDDEN","message":"Insufficient permissions"}}`
- **Security Confirmation**: The `requireRole("ADMINISTRATOR")` authorization middleware validates the authenticated user's role from the session. Even though the requester session is fully valid, the request is rejected with a 403 Forbidden status, shielding admin capabilities.

---

## 3. Cross-Ownership Access (404 Not Found)

### Scenario
An authenticated requester (`somchai.jai@kmutt.ac.th`, user ID 1) attempts to inspect ticket detail (`GET /api/tickets/800`) belonging to another requester (user ID 2, `suda.rak@kmutt.ac.th`, ticket number `TICK-20260906-0013`: *"Statistical software package installation"*). Per the project security specification, cross-ownership violations return `404 Not Found` rather than `403 Forbidden` to prevent malicious enumeration and probing of private ticket IDs.

### Request
```http
GET /api/tickets/800 HTTP/1.1
Host: localhost:3000
Accept: */*
Cookie: toktickit_session=e4e3f55f1a1ab5a438587a426f6524c6d7aeff9d31a942198d9be4e16d7f15f5
User-Agent: curl/8.9.1
```

**Command:**
```bash
curl -i -X GET http://localhost:3000/api/tickets/800 \
  -H "Cookie: toktickit_session=e4e3f55f1a1ab5a438587a426f6524c6d7aeff9d31a942198d9be4e16d7f15f5"
```

### Response
```http
HTTP/1.1 404 Not Found
X-Powered-By: Express
Vary: Origin
Access-Control-Allow-Credentials: true
Content-Type: application/json; charset=utf-8
Content-Length: 59
ETag: W/"3b-Zq8/e3VVdQZGEB5cDWE0N+VRpig"
Date: Sat, 03 Oct 2026 14:44:12 GMT
Connection: keep-alive
Keep-Alive: timeout=5

{"error":{"code":"NOT_FOUND","message":"Ticket not found"}}
```

*(Note: Tested identically against dynamically created test ticket 4387 owned by user ID 2; both return the identical `404 Not Found` response).*

### Analysis
- **Status Code**: `404 Not Found`
- **Response Payload**: `{"error":{"code":"NOT_FOUND","message":"Ticket not found"}}`
- **Security Confirmation**: The ticket retrieval query scopes ownership strictly to the authenticated `requesterId` when the caller is a requester (`where: { id: 800, requesterId: 1 }`). Attempting to view another requester's ticket produces a generic `404 Not Found`, completely neutralizing IDOR (Insecure Direct Object Reference) information disclosure vulnerabilities.
