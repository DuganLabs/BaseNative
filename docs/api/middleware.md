# @basenative/middleware

> Server-agnostic middleware pipeline with built-in CORS, rate limiting, CSRF, and logging.

## Overview

`@basenative/middleware` provides a framework-agnostic middleware pipeline modeled on Koa's `(ctx, next)` pattern. The context object has a uniform shape (`{ request, response, state }`) regardless of the underlying server. Adapter exports translate Express, Hono, Fastify, and Cloudflare Workers conventions into this common shape.

## Installation

```bash
npm install @basenative/middleware
```

## Quick Start

```js
import { createPipeline, cors, rateLimit, csrf, logger } from '@basenative/middleware';
import { toExpressMiddleware } from '@basenative/middleware';

const pipeline = createPipeline()
  .use(logger())
  .use(cors({ origin: 'https://example.com' }))
  .use(rateLimit({ max: 100, windowMs: 60_000 }))
  .use(csrf());

// Mount on Express
app.use(toExpressMiddleware(pipeline));
```

## API Reference

### createPipeline()

Creates a middleware pipeline.

**Returns:** Pipeline object.

**Pipeline methods:**
- `.use(middleware)` — registers a middleware function; returns the pipeline for chaining
- `.run(ctx)` — executes the pipeline with the given context; returns `Promise<ctx>`
- `.toHandler()` — returns a function `(ctx) => Promise<ctx>` suitable for manual dispatch
- `.stack` — read-only array of registered middlewares

**Example:**
```js
const pipeline = createPipeline();
pipeline.use(async (ctx, next) => {
  console.log(ctx.request.method, ctx.request.url);
  await next();
});
await pipeline.run({ request, response, state: {} });
```

---

### compose(...middlewares)

Combines multiple middleware functions into a single middleware function.

**Parameters:**
- `...middlewares` — middleware functions or arrays of middleware functions

**Returns:** `async (ctx, next) => void`

**Example:**
```js
import { compose } from '@basenative/middleware';

const combined = compose(logger(), cors(), rateLimit());
pipeline.use(combined);
```

---

### cors(options)

CORS middleware.

**Parameters:**
- `options.origin` — `'*'`, a string, an array of strings, or a function `(origin) => boolean`; default `'*'`
- `options.methods` — allowed HTTP methods; default all standard methods
- `options.allowedHeaders` — allowed request headers
- `options.exposedHeaders` — headers exposed to the browser
- `options.credentials` — allow cookies/auth headers; default `false`
- `options.maxAge` — preflight cache in seconds

**Returns:** Middleware function. Handles `OPTIONS` preflight requests automatically.

---

### rateLimit(options)

In-memory sliding-window rate limiter.

**Parameters:**
- `options.max` — maximum requests per window; default `100`
- `options.windowMs` — window duration in ms; default `60000`
- `options.keyFn` — function `(ctx) => string` for generating the rate-limit key; default uses client IP

**Returns:** Middleware function. Sets `429 Too Many Requests` when the limit is exceeded.

---

### csrf(options)

CSRF token middleware. Issues a token and validates it on mutating requests.

**Parameters:**
- `options.cookie` — cookie name for the CSRF token; default `'csrf_token'`
- `options.header` — request header to check; default `'x-csrf-token'`
- `options.ignoreMethods` — methods that skip validation; default `['GET', 'HEAD', 'OPTIONS']`

**Returns:** Middleware function.

---

### logger(options)

Request logging middleware. Logs method, URL, status, and duration.

**Parameters:**
- `options.log` — log function `(message, data) => void`; default `console.log`

**Returns:** Middleware function.

---

### toExpressMiddleware(pipeline)

Adapts a pipeline or middleware function for use with Express.

**Parameters:**
- `pipeline` — a pipeline instance or middleware function

**Returns:** Express-compatible `(req, res, next) => void` function.

---

### toHonoMiddleware(pipeline)

Adapts a pipeline for Hono.

**Returns:** Hono-compatible middleware.

---

### toFastifyPlugin(pipeline)

Adapts a pipeline as a Fastify plugin.

**Returns:** Fastify plugin function.

---

### toCloudflareHandler(pipeline)

Adapts a pipeline for Cloudflare Workers `fetch` handler.

**Returns:** `(request: Request, env, ctx) => Promise<Response>` function.

## Context Shape

All middleware receives a `ctx` object with this structure:

```js
{
  request: {
    method: string,
    url: string,
    path: string,
    headers: object,
    body: any,
    cookies: object,
  },
  response: {
    status: number,
    headers: object,
    body: any,
    cookies: object,
  },
  state: {},  // shared mutable state across middleware
}
```

## Integration

Use with `@basenative/auth` session and RBAC middleware, `@basenative/logger` for structured logging, and `@basenative/tenant` for multi-tenant routing. All adapter functions accept a pipeline directly.
