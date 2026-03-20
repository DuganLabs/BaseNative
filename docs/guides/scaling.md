# Scaling Guide

Strategies for scaling BaseNative applications from prototype to production.

## Horizontal Scaling

BaseNative applications are stateless by default when using external session storage:

```js
import { sessionMiddleware, createDbStore } from '@basenative/auth';

// Use database-backed sessions instead of in-memory
const sessionStore = createDbStore(dbAdapter, { tableName: 'sessions' });

pipeline.use(sessionMiddleware({
  secret: process.env.SESSION_SECRET,
  store: sessionStore,
}));
```

With database-backed sessions, you can run multiple instances behind a load balancer.

## Database Connection Pooling

### PostgreSQL

```js
import { createPostgresAdapter } from '@basenative/db';

const db = createPostgresAdapter({
  connectionString: process.env.DATABASE_URL,
  max: 20,           // Max pool size
  idleTimeoutMillis: 30000,
});
```

### SQLite (Single Instance)

SQLite works well for single-instance deployments:

```js
import { createSqliteAdapter } from '@basenative/db';

const db = createSqliteAdapter({
  filename: './data/app.db',
  wal: true,  // Write-Ahead Logging for concurrent reads
});
```

## Rate Limiting in Distributed Environments

The built-in rate limiter uses in-memory storage. For multiple instances, implement a shared store:

```js
import { rateLimit } from '@basenative/middleware';

// Custom store backed by Redis or database
const distributedStore = {
  hits: new Map(),
  async increment(key) { /* Use Redis INCR */ },
  async get(key) { /* Use Redis GET */ },
  async reset(key) { /* Use Redis DEL */ },
};

pipeline.use(rateLimit({
  windowMs: 60_000,
  max: 100,
  // Override keyGenerator for distributed awareness
  keyGenerator: (ctx) => `${ctx.request.ip}:${ctx.state.tenant?.id}`,
}));
```

## Caching Layers

### Application-Level Cache

```js
import { createCache } from '@basenative/fetch';

const cache = createCache({
  maxAge: 300_000,     // 5 minutes
  maxEntries: 1000,
  staleWhileRevalidate: true,
});

const resource = createResource(fetchUsers, { cache, key: 'users' });
```

### Response Caching

```js
pipeline.use(async (ctx, next) => {
  const cacheKey = ctx.request.url;
  const cached = responseCache.get(cacheKey);
  if (cached && !isStale(cached)) {
    ctx.response.body = cached.body;
    ctx.response.headers['x-cache'] = 'HIT';
    return;
  }
  await next();
  if (ctx.response.status === 200) {
    responseCache.set(cacheKey, {
      body: ctx.response.body,
      timestamp: Date.now(),
    });
  }
});
```

## Edge Deployment

### Cloudflare Workers

Use the Cloudflare adapter for edge deployment:

```js
import { createPipeline, cors, rateLimit } from '@basenative/middleware';
import { toCloudflareHandler } from '@basenative/middleware';

const pipeline = createPipeline();
pipeline.use(cors());
pipeline.use(rateLimit({ max: 100 }));
// ... add routes

export default {
  fetch: toCloudflareHandler(pipeline),
};
```

### Hono (Edge-First)

```js
import { Hono } from 'hono';
import { toHonoMiddleware } from '@basenative/middleware';

const app = new Hono();
app.use('*', toHonoMiddleware(pipeline));
```

## Monitoring and Observability

### Structured Logging

```js
import { createLogger } from '@basenative/logger';

const logger = createLogger({
  level: 'info',
  format: 'json',
  fields: {
    service: 'my-app',
    version: process.env.APP_VERSION,
  },
});
```

### Request Logging

```js
import { requestLogger } from '@basenative/logger';

pipeline.use(requestLogger(logger));
// Logs: method, path, status, duration, request ID
```

### Health Checks

```js
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

app.get('/ready', async (req, res) => {
  try {
    await db.execute({ sql: 'SELECT 1', params: [] });
    res.json({ status: 'ready' });
  } catch {
    res.status(503).json({ status: 'not ready' });
  }
});
```

### Web Vitals

```js
import { createVitalsReporter } from '@basenative/runtime';

const reporter = createVitalsReporter({
  onReport: (metric) => {
    navigator.sendBeacon('/api/vitals', JSON.stringify(metric));
  },
});
reporter.start();
```

## Scaling Checklist

- [ ] Use database-backed sessions (not in-memory)
- [ ] Enable connection pooling for PostgreSQL
- [ ] Use WAL mode for SQLite
- [ ] Implement response caching for read-heavy endpoints
- [ ] Add health check and readiness endpoints
- [ ] Configure structured logging with request IDs
- [ ] Monitor Web Vitals in production
- [ ] Consider edge deployment for global latency
- [ ] Set up rate limiting appropriate for your load
