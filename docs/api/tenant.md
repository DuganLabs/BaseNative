# @basenative/tenant

> Multi-tenant middleware with subdomain, path, and header tenant resolution and query scoping.

## Overview

`@basenative/tenant` identifies the active tenant for every request and optionally enforces that all database queries include a `tenant_id` filter. Four resolver strategies are provided — subdomain, URL path prefix, request header, and composite (try them in order). The `tenantScope` wrapper automatically injects `tenant_id` into `@basenative/db` adapter calls so queries can never accidentally return cross-tenant data.

## Installation

```bash
npm install @basenative/tenant
```

## Quick Start

```js
import {
  createSubdomainResolver,
  tenantMiddleware,
  requireTenant,
  tenantScope,
} from '@basenative/tenant';
import { createSqliteAdapter } from '@basenative/db';

const resolver = createSubdomainResolver({ baseDomain: 'example.com' });

const pipeline = createPipeline()
  .use(tenantMiddleware(resolver))
  .use(requireTenant());

const db = await createSqliteAdapter({ filename: './app.db' });
const scopedDb = tenantScope(db);

// In a route handler:
const rows = await scopedDb.query(ctx, 'users', { active: true });
// Equivalent to: SELECT * FROM users WHERE tenant_id = '<ctx.state.tenant>' AND active = 1
```

## API Reference

### createSubdomainResolver(options)

Resolves tenant from the request hostname's leading subdomain.

**Parameters:**
- `options.baseDomain` — the base domain to strip (e.g. `'example.com'`); if omitted, assumes the last two segments are the base domain
- `options.exclude` — subdomains to ignore; default `['www']`

**Returns:** Resolver function `(ctx) => string | null`.

**Example:**
```
acme.example.com  → 'acme'
www.example.com   → null (excluded)
example.com       → null (no subdomain)
```

---

### createPathResolver(options)

Resolves tenant from a URL path prefix.

**Parameters:**
- `options.prefix` — path prefix segment; default `'/t'`

**Returns:** Resolver function `(ctx) => string | null`.

**Example:**
```
/t/acme/users  → 'acme'
/t/acme        → 'acme'
/dashboard     → null
```

---

### createHeaderResolver(options)

Resolves tenant from a request header.

**Parameters:**
- `options.header` — header name; default `'x-tenant-id'`

**Returns:** Resolver function `(ctx) => string | null`.

---

### createCompositeResolver(resolvers)

Tries multiple resolvers in order and returns the first non-null result.

**Parameters:**
- `resolvers` — array of resolver functions (at least one required)

**Returns:** Resolver function `(ctx) => string | null`.

**Example:**
```js
const resolver = createCompositeResolver([
  createSubdomainResolver({ baseDomain: 'example.com' }),
  createHeaderResolver({ header: 'x-tenant-id' }),
]);
```

---

### tenantMiddleware(resolver, options)

Middleware that runs the resolver and stores the result in `ctx.state`.

**Parameters:**
- `resolver` — any resolver function
- `options.stateKey` — key to store the tenant under in `ctx.state`; default `'tenant'`
- `options.onNotFound(ctx)` — called when the resolver returns `null`; does not block the request unless you set a response

**Returns:** Middleware function.

After this middleware runs:
- `ctx.state.tenant` — resolved tenant string or `null`

---

### requireTenant(options)

Middleware that blocks requests where no tenant was resolved.

**Parameters:**
- `options.stateKey` — key to read in `ctx.state`; default `'tenant'`
- `options.status` — HTTP status for rejection; default `400`
- `options.message` — error message body; default `'Tenant is required'`

**Returns:** Middleware function.

---

### tenantScope(adapter, options)

Wraps a database adapter to automatically add the `tenant_id` column to every query.

**Parameters:**
- `adapter` — database adapter with `query`, `insert`, `update`, `delete` methods
- `options.column` — tenant column name; default `'tenant_id'`
- `options.stateKey` — key to read tenant from `ctx.state`; default `'tenant'`

**Returns:** Scoped adapter object with methods that take `ctx` as their first argument.

**Scoped adapter methods:**
- `scopedDb.query(ctx, table, filters)` — appends `{ tenant_id: ctx.state.tenant }` to filters
- `scopedDb.insert(ctx, table, data)` — injects `tenant_id` into the inserted row
- `scopedDb.update(ctx, table, filters, data)` — scopes the `WHERE` clause
- `scopedDb.delete(ctx, table, filters)` — scopes the `WHERE` clause

**Example:**
```js
const scopedDb = tenantScope(db, { column: 'org_id' });

// In a route handler (ctx.state.tenant = 'acme'):
await scopedDb.insert(ctx, 'projects', { name: 'Alpha' });
// Inserts: { name: 'Alpha', org_id: 'acme' }

const projects = await scopedDb.query(ctx, 'projects');
// Queries: SELECT * FROM projects WHERE org_id = 'acme'
```

## Integration

Register `tenantMiddleware` early in the `@basenative/middleware` pipeline, before route handlers and before any database access. Pair with `requireTenant` to enforce tenant presence on protected routes. Use `tenantScope` with any `@basenative/db` adapter to prevent cross-tenant data leaks without modifying individual queries.
