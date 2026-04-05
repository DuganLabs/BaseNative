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

### Framework Adapters

- `toExpressMiddleware(pipeline)` — Wraps a pipeline for use as Express middleware.
- `toHonoMiddleware(pipeline)` — Wraps a pipeline for use as Hono middleware.
- `toFastifyPlugin(pipeline)` — Wraps a pipeline as a Fastify plugin.
- `toCloudflareHandler(pipeline)` — Wraps a pipeline as a Cloudflare Workers `fetch` handler.

## License

MIT
