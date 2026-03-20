# BaseNative Multi-Tenancy Guide

## Overview

`@basenative/tenant` provides tenant resolution, middleware, and database
scoping for multi-tenant applications. It supports three resolution strategies
that can be used individually or composed together.

---

## Tenant Resolution Strategies

### Subdomain Resolution

Resolve the tenant from the hostname. For `acme.example.com`, the tenant is `acme`:

```js
import { createSubdomainResolver } from '@basenative/tenant';

const resolver = createSubdomainResolver({
  baseDomain: 'example.com',
  exclude: ['www', 'api'],  // subdomains that are not tenants
});
```

If `baseDomain` is omitted, the resolver assumes the last two hostname segments
are the base domain and uses the first segment as the tenant.

### Path Prefix Resolution

Resolve the tenant from a URL path prefix. For `/t/acme/dashboard`, the tenant
is `acme`:

```js
import { createPathResolver } from '@basenative/tenant';

const resolver = createPathResolver({
  prefix: '/t',  // default
});
```

### Header Resolution

Resolve the tenant from a request header. Useful for API clients or service-to-service calls:

```js
import { createHeaderResolver } from '@basenative/tenant';

const resolver = createHeaderResolver({
  header: 'x-tenant-id',  // default
});
```

### Composite Resolution

Try multiple resolvers in order, returning the first non-null result:

```js
import { createCompositeResolver, createSubdomainResolver, createHeaderResolver } from '@basenative/tenant';

const resolver = createCompositeResolver([
  createSubdomainResolver({ baseDomain: 'example.com' }),
  createHeaderResolver({ header: 'x-tenant-id' }),
]);
// Checks subdomain first, falls back to header
```

---

## Tenant Middleware Setup

Wire the resolver into your middleware pipeline:

```js
import { createPipeline } from '@basenative/middleware';
import { tenantMiddleware, requireTenant } from '@basenative/tenant';

const pipeline = createPipeline();

// Resolve tenant and attach to ctx.state.tenant
pipeline.use(tenantMiddleware(resolver, {
  stateKey: 'tenant',
  onNotFound(ctx) {
    // Optional: log or handle missing tenants
    console.warn(`No tenant resolved for ${ctx.request.headers.host}`);
  },
}));

// Reject requests without a tenant (for tenant-required routes)
pipeline.use(requireTenant({
  status: 400,
  message: 'Tenant is required',
}));
```

After this middleware runs, `ctx.state.tenant` contains the resolved tenant
identifier (e.g. `"acme"`).

### Selective Tenant Enforcement

Not all routes require a tenant. Apply `requireTenant` selectively:

```js
const tenantRequired = requireTenant();

pipeline.use(async (ctx, next) => {
  // Public routes do not require a tenant
  if (ctx.request.path === '/health' || ctx.request.path === '/login') {
    await next();
    return;
  }
  // Everything else requires a tenant
  await tenantRequired(ctx, next);
});
```

---

## Tenant-Scoped Database Queries

`tenantScope` wraps a database adapter to automatically inject the tenant ID
into every query, insert, update, and delete:

```js
import { tenantScope } from '@basenative/tenant';
import { createPostgresAdapter } from '@basenative/db/adapters/postgres';

const db = createPostgresAdapter({ connectionString: process.env.DATABASE_URL });
const scopedDb = tenantScope(db, { column: 'tenant_id' });

pipeline.use(async (ctx, next) => {
  // All queries through scopedDb automatically filter by ctx.state.tenant
  const users = await scopedDb.query(ctx, 'users', { active: true });
  // Executes: SELECT * FROM users WHERE active = true AND tenant_id = 'acme'

  await scopedDb.insert(ctx, 'users', { name: 'Alice', email: 'alice@acme.com' });
  // Executes: INSERT INTO users (name, email, tenant_id) VALUES ('Alice', 'alice@acme.com', 'acme')

  ctx.state.users = users;
  await next();
});
```

### Database Schema

Your tables need a `tenant_id` column (or whatever you configure in `column`):

```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  tenant_id VARCHAR(63) NOT NULL,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_users_tenant ON users (tenant_id);
```

Always index the tenant column. Composite indexes that lead with `tenant_id`
are recommended for frequently queried columns:

```sql
CREATE INDEX idx_users_tenant_email ON users (tenant_id, email);
```

---

## Configuration Per Tenant

Load tenant-specific configuration from the database or a config store:

```js
pipeline.use(async (ctx, next) => {
  const tenant = ctx.state.tenant;
  if (!tenant) { await next(); return; }

  // Load tenant config from database
  const config = await db.queryOne(
    'SELECT * FROM tenant_configs WHERE tenant_id = ?', [tenant]
  );

  ctx.state.tenantConfig = config ?? {
    theme: 'default',
    features: [],
    maxUsers: 50,
    locale: 'en',
  };

  await next();
});
```

Use tenant config in templates:

```js
import { render } from '@basenative/server';

const html = render(template, {
  theme: ctx.state.tenantConfig.theme,
  locale: ctx.state.tenantConfig.locale,
  // ...
});
```

### Feature Flags Per Tenant

Combine `@basenative/tenant` with `@basenative/flags` for tenant-scoped
feature rollouts:

```js
import { createFlagManager, flagMiddleware } from '@basenative/flags';
import { createMemoryProvider } from '@basenative/flags/providers/memory';

const flagProvider = createMemoryProvider({
  'new-dashboard': {
    enabled: true,
    rules: [{
      condition: (ctx) => ctx.tenantId === 'acme',
      value: true,
    }],
  },
  'beta-export': { percentage: 25 },
});

const flags = createFlagManager(flagProvider);
pipeline.use(flagMiddleware(flags));

// In a handler:
pipeline.use(async (ctx, next) => {
  const showDashboard = await ctx.state.isEnabled('new-dashboard');
  // ...
  await next();
});
```

---

## Data Isolation Patterns

### Shared Database, Shared Schema (Row-Level Isolation)

The default approach used by `tenantScope`. All tenants share tables; each row
includes a `tenant_id` column. Suitable for most SaaS applications.

**Advantages:** Simple operations, easy migrations, low resource overhead.
**Trade-offs:** Requires discipline to always scope queries. Use `tenantScope`
to enforce this automatically.

### Shared Database, Separate Schemas

Use PostgreSQL schemas for stronger isolation:

```js
pipeline.use(async (ctx, next) => {
  const tenant = ctx.state.tenant;
  await db.execute(`SET search_path TO ${tenant}, public`);
  await next();
});
```

**Advantages:** Better isolation, per-tenant backup possible.
**Trade-offs:** More complex migrations (must run per schema).

### Separate Databases

Each tenant gets its own database. Select the connection based on the resolved
tenant:

```js
const tenantDbs = new Map();

pipeline.use(async (ctx, next) => {
  const tenant = ctx.state.tenant;
  if (!tenantDbs.has(tenant)) {
    const connectionString = await getTenantDbUrl(tenant);
    tenantDbs.set(tenant, createPostgresAdapter({ connectionString }));
  }
  ctx.state.db = tenantDbs.get(tenant);
  await next();
});
```

**Advantages:** Strongest isolation, independent scaling.
**Trade-offs:** Higher resource usage, complex connection management. Use
connection pooling and set a maximum pool size per tenant.

---

## Tenant-Aware Auth and RBAC

Combine tenant resolution with role-based access control:

```js
import { defineRoles, createGuard } from '@basenative/auth';

// Roles can vary per tenant
pipeline.use(async (ctx, next) => {
  const tenantConfig = ctx.state.tenantConfig;
  const rbac = defineRoles(tenantConfig.roles ?? {
    admin: { permissions: ['*'] },
    member: { permissions: ['read', 'write'] },
    viewer: { permissions: ['read'] },
  });
  ctx.state.guard = createGuard(rbac);
  await next();
});

// Use in route handlers
pipeline.use(async (ctx, next) => {
  if (ctx.request.path.startsWith('/api/settings')) {
    return ctx.state.guard.require('admin')(ctx, next);
  }
  await next();
});
```

---

## Testing Multi-Tenant Routes

Set the tenant header in integration tests:

```js
const response = await fetch('http://localhost:3000/api/users', {
  headers: { 'x-tenant-id': 'test-tenant' },
});
```

Or test subdomain resolution by setting the `Host` header:

```js
const response = await fetch('http://localhost:3000/api/users', {
  headers: { Host: 'acme.example.com' },
});
```

### Seeding Per-Tenant Test Data

```js
async function seedTenant(tenantId) {
  const ctx = { state: { tenant: tenantId } };
  await scopedDb.insert(ctx, 'users', { name: 'Test User', email: 'test@example.com' });
  await scopedDb.insert(ctx, 'tenant_configs', { theme: 'default', maxUsers: 10 });
}

beforeEach(async () => {
  await seedTenant('test-tenant');
});
```
