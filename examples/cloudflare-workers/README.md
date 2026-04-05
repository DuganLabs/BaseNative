# BaseNative — Cloudflare Workers Example

A complete example of BaseNative running on Cloudflare Workers. Demonstrates SSR, routing, and form handling — no bundler required.

## What's in this example

- **SSR** via `@basenative/server` — renders templates with `{{ }}` interpolation and `@if`/`@for` directives
- **Routing** via `@basenative/router` — `resolveRoute()` for SSR path matching
- **Form handling** — POST form submission with redirect
- **Client hydration** — `hydrate()` from CDN in a `<script type="module">`
- **Streaming** — `renderToReadableStream()` for chunked responses

## Prerequisites

- [Node.js](https://nodejs.org) 18+
- [Wrangler](https://developers.cloudflare.com/workers/wrangler/) (`npm install -g wrangler`)
- A Cloudflare account (free tier works)

## Setup

```sh
pnpm install
```

## Development

```sh
pnpm dev
```

Visit [http://localhost:8787](http://localhost:8787).

## Deploy

```sh
wrangler login
pnpm deploy
```

## Project structure

```
src/
  worker.js     Entry point — routes requests, renders pages
wrangler.toml   Cloudflare Workers configuration
package.json
README.md
```

## Key patterns

### SSR with routing

```js
import { render } from '@basenative/server';
import { resolveRoute } from '@basenative/router';

const match = resolveRoute(routes, url.pathname);

const html = render(`<h1>{{ title }}</h1>`, { title: 'Hello' });
return new Response(html, { headers: { 'Content-Type': 'text/html' } });
```

### Streaming response

```js
import { renderToReadableStream } from '@basenative/server';

const stream = renderToReadableStream(template, ctx);
return new Response(stream, { headers: { 'Content-Type': 'text/html' } });
```

## License

MIT
