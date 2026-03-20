# BaseNative Scaling Guide

## Horizontal Scaling Considerations

BaseNative applications are stateless at the request level when configured
correctly. To scale horizontally, ensure these components use shared external
stores rather than in-memory state:

| Component        | Development (single process) | Production (multiple instances) |
|------------------|-----------------------------|---------------------------------|
| Sessions         | `createMemoryStore()`       | `createDbStore(adapter)`        |
| Rate limiting    | In-memory (default)         | External store (Redis, D1)      |
| Feature flags    | `createMemoryProvider()`    | `createRemoteProvider()`        |
| Request cache    | In-memory `createCache()`   | Shared cache (Redis, KV)        |

---

## Database Connection Pooling

### PostgreSQL

Use connection pooling to prevent exhausting database connections across
multiple application instances:

```js
import { createPostgresAdapter } from '@basenative/db/adapters/postgres';

const db = createPostgresAdapter({
  connectionString: process.env.DATABASE_URL,
  pool: {
    min: 2,
    max: 10,            // per instance
    idleTimeoutMs: 30_000,
    connectionTimeoutMs: 5_000,
  },
});
```

For N application instances with max=10, you need at least N * 10 connections
available. Use PgBouncer or Supabase Pooler for connection multiplexing when
running many instances:

```
App Instance 1 ──┐
App Instance 2 ──┤── PgBouncer (pool_mode=transaction) ──── PostgreSQL
App Instance 3 ──┘
```

### SQLite

SQLite works well for single-instance deployments and edge runtimes. Use WAL
mode for concurrent reads:

```js
import { createSQLiteAdapter } from '@basenative/db/adapters/sqlite';

const db = createSQLiteAdapter({
  filename: './data/app.db',
  pragmas: {
    journal_mode: 'WAL',
    busy_timeout: 5000,
  },
});
```

### Cloudflare D1

D1 handles connection management automatically. Each worker invocation gets
a binding:

```js
import { createD1Adapter } from '@basenative/db/adapters/d1';

// In a Cloudflare Worker:
export default {
  async fetch(request, env) {
    const db = createD1Adapter(env.DB);
    // ...
  },
};
```

---

## Rate Limiting in Distributed Environments

The default in-memory rate limiter does not share state across instances.
In a multi-instance deployment, implement a shared store:

```js
import { rateLimit } from '@basenative/middleware/builtins/rate-limit';

// Custom store backed by your database or Redis
const distributedStore = {
  async increment(key, windowMs) {
    // Atomic increment in Redis:
    // MULTI / INCR key / EXPIRE key windowMs/1000 / EXEC
    const count = await redis.incr(key);
    if (count === 1) {
      await redis.expire(key, Math.ceil(windowMs / 1000));
    }
    return count;
  },
  async reset(key) {
    await redis.del(key);
  },
};

pipeline.use(rateLimit({
  windowMs: 60_000,
  max: 100,
  store: distributedStore,
  keyGenerator: (ctx) => ctx.request.ip,
}));
```

### Per-Tenant Rate Limits

Scope rate limits by tenant to prevent one tenant from consuming the quota
of another:

```js
pipeline.use(rateLimit({
  windowMs: 60_000,
  max: 1000,
  keyGenerator: (ctx) => `${ctx.state.tenant}:${ctx.request.ip}`,
}));
```

---

## Session Storage

### Migration Path

Start with in-memory sessions during development, then migrate to persistent
storage for production:

```js
import { createSessionManager, createMemoryStore, createDbStore } from '@basenative/auth';

const store = process.env.NODE_ENV === 'production'
  ? createDbStore(dbAdapter, { tableName: 'sessions' })
  : createMemoryStore();

const sessions = createSessionManager({ store });
```

### Session Table Schema

```sql
CREATE TABLE sessions (
  id VARCHAR(64) PRIMARY KEY,
  data TEXT NOT NULL,          -- JSON-encoded session data
  expires_at TIMESTAMP NOT NULL
);

CREATE INDEX idx_sessions_expires ON sessions (expires_at);
```

### Session Cleanup

Expired sessions accumulate in the database. Run periodic cleanup:

```js
// Run every hour
setInterval(async () => {
  await dbAdapter.execute(
    'DELETE FROM sessions WHERE expires_at < ?',
    [new Date().toISOString()]
  );
}, 60 * 60 * 1000);
```

### Sticky Sessions vs Shared Store

With a load balancer, you have two options:

1. **Shared session store (recommended):** All instances read from the same
   database. No special load balancer configuration needed.
2. **Sticky sessions:** The load balancer routes requests to the same instance
   based on a cookie. Simpler but creates uneven load distribution and fails
   if an instance goes down.

---

## Caching Layers

### Application-Level Cache

Use `createCache` from `@basenative/fetch` for in-process caching:

```js
import { createCache } from '@basenative/fetch';

const cache = createCache({ maxAge: 5 * 60 * 1000, maxSize: 500 });

pipeline.use(async (ctx, next) => {
  if (ctx.request.method === 'GET') {
    const cached = cache.get(ctx.request.url);
    if (cached) {
      ctx.response.body = cached;
      return;
    }
  }
  await next();
  if (ctx.request.method === 'GET' && ctx.response.status === 200) {
    cache.set(ctx.request.url, ctx.response.body);
  }
});
```

### HTTP Cache Headers

Set cache headers for static and semi-static responses:

```js
pipeline.use(async (ctx, next) => {
  await next();

  if (ctx.request.path.startsWith('/assets/')) {
    ctx.response.headers['cache-control'] = 'public, max-age=31536000, immutable';
  } else if (ctx.request.method === 'GET' && ctx.response.status === 200) {
    ctx.response.headers['cache-control'] = 'public, max-age=60, stale-while-revalidate=300';
  }
});
```

### CDN / Edge Caching

When deploying behind Cloudflare or a CDN, use `Cache-Control` and `Vary`
headers to control edge caching:

```js
ctx.response.headers['cache-control'] = 'public, s-maxage=300';
ctx.response.headers['vary'] = 'Accept-Encoding, x-tenant-id';
```

---

## Edge Deployment with Cloudflare / Hono

The Cloudflare adapter runs your BaseNative pipeline at the edge with
sub-millisecond cold starts:

```js
import { createPipeline } from '@basenative/middleware';
import { toCloudflareHandler } from '@basenative/middleware/adapters/cloudflare';
import { renderToReadableStream } from '@basenative/server';

const pipeline = createPipeline();
// ... middleware ...

export default { fetch: toCloudflareHandler(pipeline) };
```

For Hono integration, use the Hono adapter:

```js
import { Hono } from 'hono';
import { toHonoMiddleware } from '@basenative/middleware/adapters/hono';

const app = new Hono();
app.use('*', toHonoMiddleware(pipeline));
app.get('/', (c) => c.html(renderPage()));
export default app;
```

### Edge Database Access

Pair edge compute with D1 (SQLite at the edge) or Hyperdrive (proxied
PostgreSQL connections):

```toml
# wrangler.toml
[[d1_databases]]
binding = "DB"
database_name = "app-db"
database_id = "abc123"

[[hyperdrive]]
binding = "HYPERDRIVE"
id = "your-hyperdrive-id"
```

---

## Monitoring and Observability

### Structured Logging

Use `@basenative/logger` for structured JSON logs that integrate with log
aggregation systems:

```js
import { createLogger } from '@basenative/logger';

const logger = createLogger({
  name: 'app',
  level: process.env.LOG_LEVEL || 'info',
});

pipeline.use(async (ctx, next) => {
  const start = Date.now();
  await next();
  const duration = Date.now() - start;

  logger.info({
    method: ctx.request.method,
    path: ctx.request.path,
    status: ctx.response.status,
    duration,
    tenant: ctx.state.tenant,
  }, 'request completed');
});
```

### Health Checks for Load Balancers

Expose shallow and deep health endpoints:

```js
pipeline.use(async (ctx, next) => {
  if (ctx.request.path === '/health') {
    ctx.response.body = { status: 'ok' };
    return;
  }
  if (ctx.request.path === '/health/ready') {
    try {
      await db.execute('SELECT 1');
      ctx.response.body = { status: 'ready', db: 'ok' };
    } catch {
      ctx.response.status = 503;
      ctx.response.body = { status: 'not ready', db: 'error' };
    }
    return;
  }
  await next();
});
```

### Client Vitals

Report Web Vitals from client to server for real-user monitoring:

```js
import { createVitalsReporter } from '@basenative/runtime';

createVitalsReporter({
  onReport(metric) {
    navigator.sendBeacon('/api/vitals', JSON.stringify({
      ...metric,
      url: location.pathname,
      tenant: document.body.dataset.tenant,
    }));
  },
}).start();
```

---

## Scaling Checklist

- [ ] Use database-backed sessions (not in-memory)
- [ ] Enable connection pooling for PostgreSQL
- [ ] Use WAL mode for SQLite (single-instance deployments)
- [ ] Implement response caching for read-heavy endpoints
- [ ] Add `/health` and `/health/ready` endpoints
- [ ] Configure structured logging with tenant context
- [ ] Monitor Web Vitals in production
- [ ] Use distributed rate-limit store across instances
- [ ] Set `Cache-Control` and `Vary` headers for CDN caching
- [ ] Consider edge deployment for global latency reduction
