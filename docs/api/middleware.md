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

### securityHeaders(options)

Builds a response finalizer that stamps a hardened header set onto every outgoing
response. Imported from `@basenative/middleware/security-headers`. Options are
validated eagerly, so a bad directive throws at boot rather than on the first
request that needs it.

```js
import { securityHeaders } from '@basenative/middleware/security-headers';

const harden = securityHeaders({
  csp: { 'connect-src': ['https://api.example.com'] },
  hsts: { preload: true },
  cache: ({ contentType }) =>
    contentType.startsWith('application/json') ? 'private, no-store' : null,
});

export default {
  async fetch(request, env, ctx) {
    return harden(await handle(request, env, ctx), { request });
  },
};
```

**Parameters:**
- `options.csp` — directives merged into the hardened baseline, or `false` to send no CSP. A source array is unioned with the baseline's sources; `null` removes the directive.
- `options.nonce` — generate a fresh per-response CSP nonce; default `false`
- `options.nonceDirectives` — directives the nonce is added to; default `['script-src']`
- `options.hsts` — `{ maxAge = 31536000, includeSubDomains = true, preload = false }`, or `false` to omit. `preload` requires `includeSubDomains` and a one-year `maxAge`, matching the browser preload list's own requirements.
- `options.permissions` — per-feature allow-lists. Unlike CSP these **replace** the default for that feature; `null` removes it. Unregistered feature names are rejected.
- `options.frameOptions` — default `'DENY'`; `false` omits
- `options.referrerPolicy` — default `'strict-origin-when-cross-origin'`
- `options.coop` / `options.coep` / `options.corp` — Cross-Origin-Opener / Embedder / Resource Policy. `coop` defaults to `'same-origin'`; the other two are omitted unless set.
- `options.noindex` — `true` sends `noindex, nofollow, noarchive`; a string sends itself
- `options.cache` — `({ contentType, status, request, response }) => string | null`; return a `Cache-Control` value to set, `null` to leave the handler's

**Returns:** `(response, context?) => Response`, where `context` is `{ request?, nonce? }`. The returned response preserves status, statusText, body and every header the finalizer does not own, and accepts the immutable `Response` that `env.ASSETS.fetch()` returns.

**Defaults:** `default-src 'self'`, `script-src 'self'`, `style-src 'self'`, `style-src-attr 'none'`, `img-src 'self' data:`, `font-src 'self'`, `connect-src 'self'`, `object-src 'none'`, `frame-ancestors 'none'`, `base-uri 'self'`, `form-action 'self'`, `upgrade-insecure-requests`; HSTS one year with `includeSubDomains`; `X-Frame-Options: DENY`; `X-Content-Type-Options: nosniff`; `Referrer-Policy: strict-origin-when-cross-origin`; `Permissions-Policy` denying camera, microphone, geolocation, payment and usb; `Cross-Origin-Opener-Policy: same-origin`.

---

### buildSecurityHeaders(options, context)

The same header set as a plain record, for handlers that need headers before a
response exists or whose policy varies per request. Never includes
`Cache-Control`, which is derived from a response.

```js
const headers = buildSecurityHeaders({
  permissions: { camera: tenant.allowsScanner ? ['self'] : [] },
});
return new Response(html, { headers: { ...headers, 'Content-Type': 'text/html' } });
```

**Returns:** `Record<string, string>`.

---

### securityHeadersMiddleware(options)

The same headers as a `createPipeline()` stage. Runs downstream middleware first
so `cache` sees the content type the handler chose, and publishes the nonce on
`ctx.state.cspNonce`.

**Returns:** Middleware function.

---

### createNonce(byteLength)

A base64 CSP nonce from the platform CSPRNG. Use it when the response body must
carry the same nonce the header declares, then pass the value back as
`context.nonce`; supplying a nonce without `nonce: true` throws rather than
silently blocking the script it tags.

**Parameters:**
- `byteLength` — default `16`; fewer than 16 throws, per CSP Level 3

**Returns:** `string`.

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

### createExpressContext(req, res)

Converts a raw Express `req`/`res` pair into the common `ctx` shape (`{ request, response, state }`) described below. `toExpressMiddleware` calls this internally for every request — you don't need to call it yourself unless you're building a custom Express integration that needs the context object without running a full pipeline (e.g. in a test).

**Parameters:**
- `req` — Express request object
- `res` — Express response object (accepted for signature symmetry with other adapters; unused — response state is written back by `toExpressMiddleware` after the pipeline runs)

**Returns:** `ctx` object with `request` populated from `req` (`method`, `url`, `path`, `headers`, `cookies`, `query`, `body`, `ip`, `params`) and an empty `response`/`state`.

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
