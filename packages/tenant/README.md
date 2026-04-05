# @basenative/tenant

> Multi-tenant middleware with subdomain, path, and header tenant resolution

Part of the [BaseNative](https://github.com/DuganLabs/basenative) ecosystem — a signal-based web runtime over native HTML.

## Install

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
import { createPipeline } from '@basenative/middleware';

const pipeline = createPipeline()
  .use(tenantMiddleware(createSubdomainResolver({ baseDomain: 'example.com' })))
  .use(requireTenant())
  .use(async (ctx, next) => {
    // ctx.state.tenantId is now set
    console.log('Tenant:', ctx.state.tenantId);
    await next();
  });
```

## Resolvers

```js
// Subdomain: acme.example.com -> "acme"
createSubdomainResolver({ baseDomain: 'example.com' });

// Path prefix: /t/acme/dashboard -> "acme"
createPathResolver({ prefix: '/t' });

// Request header: X-Tenant-ID: acme
createHeaderResolver({ header: 'x-tenant-id' });

// Try multiple resolvers in order
createCompositeResolver([subdomainResolver, headerResolver]);
```

## API

### Resolvers

- `createSubdomainResolver(options?)` — Extracts tenant from the subdomain. Options: `baseDomain`, `exclude` (default: `['www']`).
- `createPathResolver(options?)` — Extracts tenant from a URL path prefix. Options: `prefix` (default: `'/t'`).
- `createHeaderResolver(options?)` — Extracts tenant from a request header. Options: `header`.
- `createCompositeResolver(resolvers[])` — Tries each resolver in order and returns the first non-null result.

### Middleware

- `tenantMiddleware(resolver)` — Runs the resolver on each request and stores the result in `ctx.state.tenantId`.
- `requireTenant(options?)` — Rejects requests where `ctx.state.tenantId` is not set. Options: `status` (default: 400), `message`.
- `tenantScope(db, options?)` — Wraps a database adapter to automatically inject tenant scoping into queries. Options: `column` (default: `'tenant_id'`).

## License

MIT
