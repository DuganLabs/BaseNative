# BaseNative — Node.js Standalone Example

A complete Node.js HTTP server using BaseNative for SSR. No Express, no Fastify — pure `node:http` module.

## What's in this example

- **SSR** via `@basenative/server` — `render()` and `renderToStream()`
- **Routing** via `@basenative/router` — `resolveRoute()` for SSR path matching
- **Streaming** — Pages served via `renderToStream()` for chunked transfer
- **Static file serving** — Files from the `public/` directory
- **No framework** — Zero framework dependencies beyond BaseNative packages

## Prerequisites

Node.js 18+

## Setup

```sh
pnpm install
```

## Run

```sh
# Standard start
pnpm start

# Development (auto-restart on file changes)
pnpm dev
```

Visit [http://localhost:3000](http://localhost:3000).

## Project structure

```
src/
  server.js    HTTP handler — routes, renders, serves static files
public/        Static assets (CSS, JS, images)
package.json
README.md
```

## Key patterns

### SSR with streaming

```js
import { renderToStream } from '@basenative/server';

res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
renderToStream(template, ctx, res, { chunkSize: 8192 });
```

### Route matching

```js
import { resolveRoute } from '@basenative/router';

const { name, params } = resolveRoute(routes, req.url);
```

### Conditional rendering in templates

```js
import { render } from '@basenative/server';

const html = render(`
  <template @if="user">
    <p>Hello, {{ user.name }}!</p>
  </template>
  <template @else>
    <p>Please log in.</p>
  </template>
`, { user: null });
```

## License

MIT
