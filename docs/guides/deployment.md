# BaseNative Deployment Guide

## Environment Configuration

BaseNative uses `@basenative/config` to load environment variables with precedence:

```
.env.{NODE_ENV}.local   (highest priority, git-ignored)
.env.{NODE_ENV}
.env.local              (git-ignored)
.env                    (lowest priority)
```

Existing `process.env` values are never overwritten. Define a validated config
schema to catch misconfigurations at startup:

```js
import { loadEnv } from '@basenative/config/env';
import { validateConfig, string, number, boolean, oneOf } from '@basenative/config/schema';

loadEnv();

const config = validateConfig(process.env, {
  DATABASE_URL: string({ minLength: 1 }),
  PORT: number({ min: 1, max: 65535 }),
  LOG_LEVEL: oneOf(['trace', 'debug', 'info', 'warn', 'error']),
  ENABLE_CSRF: boolean(),
  SESSION_SECRET: string({ minLength: 32 }),
  SMTP_HOST: string({ optional: true }),
});
```

If any variable fails validation, the process throws with a detailed message
listing every invalid key.

---

## Docker Deployment

### Dockerfile

```dockerfile
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --production=false
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./
ENV NODE_ENV=production
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s CMD wget -qO- http://localhost:3000/health || exit 1
CMD ["node", "dist/server.js"]
```

### docker-compose.yml

```yaml
version: "3.8"
services:
  app:
    build: .
    ports:
      - "3000:3000"
    env_file:
      - .env.production
    depends_on:
      db:
        condition: service_healthy
    restart: unless-stopped

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: basenative
      POSTGRES_USER: app
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U app"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  pgdata:
```

Start with `docker compose up -d`. The health check ensures the database is
ready before the application starts.

### Production Hardening

```yaml
# Add resource limits in docker-compose.yml
services:
  app:
    deploy:
      resources:
        limits:
          cpus: "2.0"
          memory: 512M
        reservations:
          cpus: "0.5"
          memory: 256M
```

---

## Cloudflare Workers / Pages

BaseNative ships a first-class Cloudflare adapter in `@basenative/middleware`.
Use `toCloudflareHandler` to convert a middleware pipeline into a Workers
fetch handler:

```js
// worker.js
import { createPipeline } from '@basenative/middleware';
import { toCloudflareHandler } from '@basenative/middleware/adapters/cloudflare';
import { cors } from '@basenative/middleware/builtins/cors';
import { renderToReadableStream } from '@basenative/server';

const pipeline = createPipeline();
pipeline.use(cors({ origin: 'https://app.example.com' }));
pipeline.use(async (ctx, next) => {
  const stream = renderToReadableStream(template, ctx.state.data, {
    hydratable: true,
  });
  ctx.response.body = stream;
  ctx.response.headers['content-type'] = 'text/html';
  await next();
});

export default { fetch: toCloudflareHandler(pipeline) };
```

### wrangler.toml

```toml
name = "basenative-app"
main = "worker.js"
compatibility_date = "2025-01-01"

[vars]
APP_ENV = "production"

[[d1_databases]]
binding = "DB"
database_name = "app-db"
database_id = "your-database-id"

[[r2_buckets]]
binding = "UPLOADS"
bucket_name = "app-uploads"
```

The Cloudflare adapter reads the client IP from the `cf-connecting-ip` header
and parses cookies from the request. D1 bindings are available on `ctx.env.DB`.

### Using D1 with @basenative/db

```js
import { createD1Adapter } from '@basenative/db/adapters/d1';

pipeline.use(async (ctx, next) => {
  ctx.state.db = createD1Adapter(ctx.env.DB);
  await next();
});
```

---

## Vercel Deployment

Export a serverless function handler from your entry file:

```js
// api/index.js
import { createPipeline } from '@basenative/middleware';
import { render } from '@basenative/server';

const pipeline = createPipeline();
// ... configure middleware ...

export default async function handler(req, res) {
  const ctx = {
    request: {
      method: req.method,
      url: req.url,
      path: req.url.split('?')[0],
      headers: req.headers,
      query: req.query,
      body: req.body,
    },
    response: { status: 200, headers: {}, body: undefined },
    state: {},
  };

  await pipeline.run(ctx);

  res.status(ctx.response.status ?? 200);
  for (const [key, value] of Object.entries(ctx.response.headers)) {
    res.setHeader(key, value);
  }
  res.send(ctx.response.body);
}
```

### vercel.json

```json
{
  "builds": [{ "src": "api/index.js", "use": "@vercel/node" }],
  "routes": [{ "src": "/(.*)", "dest": "api/index.js" }]
}
```

Set environment variables in the Vercel dashboard or via `vercel env add`.

---

## AWS Lambda Deployment

Wrap the pipeline in a Lambda-compatible handler:

```js
// lambda.js
import { createPipeline } from '@basenative/middleware';
import { render } from '@basenative/server';

const pipeline = createPipeline();
// ... configure middleware ...

export async function handler(event) {
  const ctx = {
    request: {
      method: event.requestContext.http.method,
      url: event.rawPath + (event.rawQueryString ? `?${event.rawQueryString}` : ''),
      path: event.rawPath,
      headers: event.headers,
      query: event.queryStringParameters ?? {},
      body: event.body ? JSON.parse(event.body) : undefined,
      ip: event.requestContext.http.sourceIp,
    },
    response: { status: 200, headers: {}, body: undefined },
    state: {},
  };

  await pipeline.run(ctx);

  return {
    statusCode: ctx.response.status ?? 200,
    headers: ctx.response.headers,
    body: typeof ctx.response.body === 'object'
      ? JSON.stringify(ctx.response.body)
      : ctx.response.body ?? '',
  };
}
```

Deploy with SAM, CDK, or the Serverless Framework. Use Lambda Function URLs
or an API Gateway HTTP API for routing.

---

## Health Checks and Monitoring

Add a health endpoint as the first route in your pipeline:

```js
import { createLogger } from '@basenative/logger';

const logger = createLogger({ name: 'health', level: 'info' });

pipeline.use(async (ctx, next) => {
  if (ctx.request.path === '/health') {
    ctx.response.status = 200;
    ctx.response.body = {
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
    return;
  }
  await next();
});
```

For structured logging across all requests, use the built-in logger middleware:

```js
import { logger as loggerMiddleware } from '@basenative/middleware/builtins/logger';

pipeline.use(loggerMiddleware());
```

This emits JSON log entries with method, path, status, and response time --
suitable for ingestion by Datadog, Grafana Loki, or CloudWatch.

### Web Vitals (Client Side)

```js
import { createVitalsReporter } from '@basenative/runtime';

const reporter = createVitalsReporter({
  onReport(metric) {
    fetch('/api/vitals', {
      method: 'POST',
      body: JSON.stringify(metric),
      headers: { 'Content-Type': 'application/json' },
    });
  },
});
reporter.start();
```

This reports LCP, FID, CLS, FCP, TTFB, and INP metrics to your backend.

### Deep Health Checks

For production environments, add a `/health/deep` endpoint that verifies
downstream dependencies:

```js
pipeline.use(async (ctx, next) => {
  if (ctx.request.path === '/health/deep') {
    const checks = {};
    try {
      await ctx.state.db.execute('SELECT 1');
      checks.database = 'ok';
    } catch (err) {
      checks.database = 'error';
    }
    ctx.response.body = { status: checks.database === 'ok' ? 'ok' : 'degraded', checks };
    ctx.response.status = checks.database === 'ok' ? 200 : 503;
    return;
  }
  await next();
});
```
