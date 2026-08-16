# Lab 1 — Test Plan and Evidence  (fill this in)

All test files live under server/tests/lab-01/ and client/tests/lab-01/.

| # | Tool | Test | Result |
|---|------|------|--------|
| 1 | Supertest | GET /api/health returns 200, status=ok | PASS |
| 2 | Supertest | GET /api/categories returns 4 seeded categories in id order | PASS |
| 3 | Vitest | Heading renders | PASS |
| 4 | Vitest | Success state shows Online + category list | PASS |
| 5 | Vitest | Error state shows Offline + message | PASS |

### Backend Test Output (Supertest + Vitest)
```text
 ✓ tests/lab-01/health.test.ts (1 test) 33ms
 ✓ tests/lab-01/categories.test.ts (1 test) 473ms
   ✓ GET /api/categories > returns the four seeded categories in id order 471ms

 Test Files  2 passed (2)
      Tests  2 passed (2)
```

### Frontend Test Output (Vitest + React Testing Library)
```text
 ✓ tests/lab-01/App.test.tsx (3 tests) 132ms

 Test Files  1 passed (1)
      Tests  3 passed (3)
```

