# @basenative/middleware

> Server-agnostic middleware pipeline with CORS, rate limiting, CSRF, and framework adapters

Part of the [BaseNative](https://github.com/DuganLabs/basenative) ecosystem — a signal-based web runtime over native HTML.

## Install

```bash
npm install @basenative/middleware
```

## Quick Start

```js
import { createPipeline, cors, rateLimit, csrf, logger } from '@basenative/middleware';
import { toExpressMiddleware } from '@basenative/middleware';

const pipeline = createPipeline()
  .use(cors({ origins: ['https://example.com'] }))
  .use(rateLimit({ max: 100, windowMs: 60_000 }))
  .use(csrf())
  .use(logger());

// Use with Express
const app = express();
app.use(toExpressMiddleware(pipeline));
```

## API

### Pipeline

- `createPipeline()` — Creates a middleware pipeline. Returns an object with:
  - `.use(middleware)` — Appends a middleware function `(ctx, next) => Promise<void>`.
  - `.run(ctx)` — Executes the pipeline with a context object.
  - `.toHandler()` — Returns the pipeline as a single handler function.
  - `.stack` — Read-only array of registered middlewares.
- `compose(...middlewares)` — Combines multiple middleware functions into one.

### Context Shape

Each middleware receives a context object:
```js
{ request: { method, url, headers, body }, response: { status, headers, body }, state: {} }
```

### Built-in Middlewares

- `cors(options?)` — Sets CORS headers. Options: `origins`, `methods`, `headers`, `credentials`, `maxAge`.
- `rateLimit(options?)` — In-process rate limiter. Options: `max`, `windowMs`, `keyFn`, `message`.
- `csrf(options?)` — Double-submit cookie CSRF protection. Options: `cookieName`, `headerName`.
- `logger(options?)` — Request/response logging middleware. Options: `format`, `skip`.
- `securityHeaders(options?)` — Response hardening headers (CSP, HSTS, Permissions-Policy, COOP/COEP/CORP, cache stance) for Workers-style handlers. See below.

### Security Headers

```js
import { securityHeaders } from '@basenative/middleware/security-headers';
```

One hardened baseline, shared. Products supply what is genuinely theirs — which
hosts they talk to, whether they want to be indexed, how long a response may be
cached — and the package supplies everything else, so adding a CDN to `script-src`
can never silently drop `frame-ancestors 'none'`.

#### Adopting it in a new product

```js
import { securityHeaders } from '@basenative/middleware/security-headers';

// Configure once, at module scope. Options are validated eagerly: a bad
// directive throws at boot, not on the first request that needs it.
const harden = securityHeaders({
  csp: {
    // Merged INTO the baseline. 'self' stays; this adds to it.
    'script-src': ['https://cdn.example.com'],
    'connect-src': ['https://api.example.com'],
  },
  hsts: { preload: true },
  cache: ({ contentType }) =>
    contentType.startsWith('application/json') ? 'private, no-store' : null,
});

export default {
  async fetch(request, env, ctx) {
    const response = await handle(request, env, ctx);
    return harden(response, { request });
  },
};
```

That is the whole adoption. `harden` accepts any `Response` — including the
immutable one `env.ASSETS.fetch()` returns — and gives back a new one with the
status, statusText, body and every unrelated header intact.

#### What you get without asking

| Header | Default | Why this value |
| --- | --- | --- |
| `Content-Security-Policy` | `default-src 'self'`, `script-src 'self'`, `style-src 'self'`, `style-src-attr 'none'`, `img-src 'self' data:`, `font-src 'self'`, `connect-src 'self'`, `object-src 'none'`, `frame-ancestors 'none'`, `base-uri 'self'`, `form-action 'self'`, `upgrade-insecure-requests` | Deny by default; every allowance is something a product asked for by name |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` | One year. `preload` is **opt-in** — it is a submission to a browser-vendor list that is slow and painful to leave |
| `X-Frame-Options` | `DENY` | Redundant with `frame-ancestors`, still graded by scanners and honoured by older engines |
| `X-Content-Type-Options` | `nosniff` | Not configurable. There is no response this is wrong for |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=(), payment=(), usb=()` | Deny the high-risk features; opt one back in per feature |
| `Cross-Origin-Opener-Policy` | `same-origin` | |
| `Cross-Origin-Resource-Policy` | *omitted* | `same-origin` breaks any product serving assets to a sibling subdomain. Set it deliberately (`corp: 'same-site'`) rather than discovering it in an outage |
| `Cross-Origin-Embedder-Policy` | *omitted* | Requires every cross-origin subresource to opt in; enable it when you have audited them |
| `X-Robots-Tag` | *omitted* | `noindex: true` on an internal tool; wrong on a marketing site, so never a default |

#### Merge semantics — the part worth reading twice

**CSP directives merge.** A caller source list is unioned into the baseline's,
deduplicated, baseline first. `csp: { 'connect-src': ['https://api.example.com'] }`
yields `connect-src 'self' https://api.example.com`. A directive the baseline does
not have is added as given.

**Permissions-Policy features replace.** Unioning a deny with an allow is
meaningless, so `permissions: { camera: ['self'] }` opts that one feature back in
and leaves every other default denial standing.

**`null` removes.** In either map, `null` drops that entry. It is the only way to
lose a baseline protection, and it has to be written out:

```js
securityHeaders({
  csp: { 'upgrade-insecure-requests': null },  // local dev over plain http
  permissions: { usb: null },                   // do not send the feature at all
});
```

**`csp: false`** sends no CSP at all, so a product that has never had one can adopt
the package for the other seven headers today and write its policy later. Same for
`hsts: false`, `coop: false`, `frameOptions: false`.

#### Nonces

`nonce: true` generates a fresh base64 nonce per response and appends it to
`script-src` (configurable via `nonceDirectives`). Use it when something injects
scripts into your markup after you return — a Cloudflare Web Analytics beacon, a
Bot Fight Mode snippet — so those tags run without `'unsafe-inline'`.

When the body itself carries the nonce, generate it first and hand it back:

```js
import { securityHeaders, createNonce } from '@basenative/middleware/security-headers';

const harden = securityHeaders({ nonce: true });

const nonce = createNonce();
const html = renderPage({ nonce });           // <script nonce="...">
return harden(new Response(html, { headers }), { nonce });
```

Passing a nonce without `nonce: true` **throws**. Silently dropping it would block
the inline script in production with nothing failing locally.

#### Per-request policy

When the policy varies by request — a per-tenant camera allow-list, a
preview-only CORP — build the record instead of decorating a response:

```js
import { buildSecurityHeaders } from '@basenative/middleware/security-headers';

const headers = buildSecurityHeaders({
  permissions: { camera: tenant.allowsScanner ? ['self'] : [] },
  corp: env.ENVIRONMENT === 'production' ? 'same-site' : 'cross-origin',
});

return new Response(html, { headers: { ...headers, 'Content-Type': 'text/html' } });
```

`buildSecurityHeaders` never includes `Cache-Control`; that is derived from a
response, so only `securityHeaders()` applies it.

#### Cache stance

`cache` is called with `{ contentType, status, request, response }`. Return a
`Cache-Control` value to set it, or `null`/`undefined` to leave whatever the
handler already chose:

```js
cache: ({ contentType, status }) => {
  if (status !== 200) return null;
  if (contentType.startsWith('text/html')) return 'public, max-age=300';
  return null;
},
```

#### Inside a pipeline

`securityHeadersMiddleware(options)` is the same headers as a `createPipeline()`
stage. It runs downstream middleware first so `cache` sees the content type the
handler chose, and publishes the nonce on `ctx.state.cspNonce`.

#### Errors it will throw at you

Every one of these is a failure that has actually shipped somewhere, now caught at
construction:

- `hsts: { preload: true, includeSubDomains: false }` — the preload list rejects
  the submission, so the directive claims eligibility it does not have.
- `permissions: { bluetooth: [] }` — not a registered feature. Browsers ignore it
  and log a console warning on every response.
- an unknown option key — a typo silently drops a header, so it is rejected.
- a CSP source containing `;` — it would inject a second directive.
- a nonce with no CSP, or targeting a directive that was removed.

#### API

- `securityHeaders(options?)` → `(response, context?) => Response`
- `buildSecurityHeaders(options?, context?)` → `Record<string, string>`
- `securityHeadersMiddleware(options?)` → pipeline `MiddlewareFn`
- `createNonce(byteLength = 16)` → base64 string
- `DEFAULT_CSP`, `DEFAULT_PERMISSIONS` — frozen, for inspection

`context` is `{ request?, nonce? }`. `request` is passed through to `cache` and is
never inspected for header construction.

### Framework Adapters

- `toExpressMiddleware(pipeline)` — Wraps a pipeline for use as Express middleware.
- `toHonoMiddleware(pipeline)` — Wraps a pipeline for use as Hono middleware.
- `toFastifyPlugin(pipeline)` — Wraps a pipeline as a Fastify plugin.
- `toCloudflareHandler(pipeline)` — Wraps a pipeline as a Cloudflare Workers `fetch` handler.

## License

Apache-2.0
