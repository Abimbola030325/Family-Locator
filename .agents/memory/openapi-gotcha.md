---
name: OpenAPI Orval gotcha
description: Orval hook name collision when combining limit/offset query params with path params
---

**Rule:** Do NOT add `limit`, `offset`, or other query params to OpenAPI operations that also have path params (e.g., `circleId`, `memberId`).

**Why:** Orval generates hook names from the operation's parameter combinations. When a route has both path params AND query params, Orval can produce duplicate or colliding generated names, breaking the codegen output.

**How to apply:** For list endpoints under a resource (e.g., GET /circles/{circleId}/messages), omit pagination query params entirely. Use a fixed server-side `.limit(50)` in the Drizzle query instead.
