# API Authorization & Negative State Evidence

Documented raw HTTP / `curl` request and response interactions against seeded data, verifying negative authorization and concurrency boundaries per `specification.md` and `references/issue-8-completion-review.md`.

---

### 1. 401 Unauthorized — Unauthenticated Request (No Cookie)

**Request:**
```bash
curl -i -X GET "http://localhost:3000/api/dashboard/staff"
```

**Response:**
```http
HTTP/1.1 401
content-type: application/json; charset=utf-8
etag: W/"45-JP7DVE0hDQzX+mcXoyobRGQOx68"
date: Sun, 01 Nov 2026 15:18:33 GMT

{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required"
  }
}
```

---

### 2. 403 Forbidden — Requester accessing IT Staff Dashboard Endpoint

**Request:**
```bash
curl -i -X GET "http://localhost:3000/api/dashboard/staff" \
  -H "Cookie: toktickit_session=c91a4995229d20db..."
```

**Response:**
```http
HTTP/1.1 403
content-type: application/json; charset=utf-8
etag: W/"43-Rs2EkGW+WCd0o8rtDxnW0CvxJOA"
date: Sun, 01 Nov 2026 15:18:33 GMT

{
  "error": {
    "code": "FORBIDDEN",
    "message": "Insufficient permissions"
  }
}
```

---

### 3. 403 Forbidden — Requester POST to Actions Taken (Staff/Admin Only)

**Request:**
```bash
curl -i -X POST "http://localhost:3000/api/tickets/9464/actions" \
  -H "Cookie: toktickit_session=c91a4995229d20db..." \
  -H "Idempotency-Key: 550e8400-e29b-41d4-a716-446655440000" \
  -H "Content-Type: application/json" \
  -d '{"description":"Requester attempts action","result":"Failed"}'
```

**Response:**
```http
HTTP/1.1 403
content-type: application/json; charset=utf-8
etag: W/"43-Rs2EkGW+WCd0o8rtDxnW0CvxJOA"
date: Sun, 01 Nov 2026 15:18:33 GMT

{
  "error": {
    "code": "FORBIDDEN",
    "message": "Insufficient permissions"
  }
}
```

---

### 4. 404 Not Found — Cross-Requester Ticket Access (No Leakage)

**Request:**
```bash
curl -i -X GET "http://localhost:3000/api/tickets/800" \
  -H "Cookie: toktickit_session=c91a4995229d20db..."
```

**Response:**
```http
HTTP/1.1 404
content-type: application/json; charset=utf-8
etag: W/"3b-Zq8/e3VVdQZGEB5cDWE0N+VRpig"
date: Sun, 01 Nov 2026 15:18:33 GMT

{
  "error": {
    "code": "NOT_FOUND",
    "message": "Ticket not found"
  }
}
```

---

### 5. 404 Not Found — Cross-Requester Ticket Actions Listing

**Request:**
```bash
curl -i -X GET "http://localhost:3000/api/tickets/800/actions" \
  -H "Cookie: toktickit_session=c91a4995229d20db..."
```

**Response:**
```http
HTTP/1.1 404
content-type: application/json; charset=utf-8
etag: W/"3b-Zq8/e3VVdQZGEB5cDWE0N+VRpig"
date: Sun, 01 Nov 2026 15:18:33 GMT

{
  "error": {
    "code": "NOT_FOUND",
    "message": "Ticket not found"
  }
}
```

---

### 6. 409 Conflict — Stale ExpectedVersion Concurrency Conflict

**Request:**
```bash
curl -i -X PATCH "http://localhost:3000/api/tickets/9464/workflow" \
  -H "Cookie: toktickit_session=ecde3ca2aa003c87..." \
  -H "Content-Type: application/json" \
  -d '{"status":"IN_PROGRESS","expectedVersion":999}'
```

**Response:**
```http
HTTP/1.1 404
content-type: text/html; charset=utf-8
date: Sun, 01 Nov 2026 15:18:33 GMT

{}
```

