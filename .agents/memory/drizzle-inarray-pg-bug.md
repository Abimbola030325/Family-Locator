---
name: Drizzle inArray / ANY bug with pg driver
description: inArray() and sql template with JS arrays generate invalid PostgreSQL syntax in drizzle-orm@0.45.x with the pg driver.
---

## The Rule

Never use `inArray(col, jsArray)` or `sql\`${col} = ANY(${jsArray})\`` in this project.

**Why:** Both approaches serialize JS arrays as row-expressions `= ANY(($1, $2))` instead of proper PostgreSQL array syntax `= ANY(ARRAY[$1, $2])`. PostgreSQL rejects the row-expression form and throws a query error.

**How to apply:** Replace every `inArray(col, ids)` call with:

```ts
or(...ids.map(id => eq(col, id)))
```

Always guard empty arrays — `or()` with no arguments returns undefined. Since we always check `if (!ids.length) return early` before reaching these queries, this is safe. If that guard is missing, add it.

Also applies to the `delete().where(inArray(...))` pattern — replace with:
```ts
.where(or(...ids.map(id => eq(col, id))))
```
