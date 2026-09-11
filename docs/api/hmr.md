# @basenative/hmr

> Dev-only hot module replacement: the browser re-fetches the current URL and patches the live DOM, preserving focus, caret, scroll, and open dialogs.

## Overview

`@basenative/hmr` is the reason `bn dev` no longer asks you to hit refresh. On a file change it does not reload the page — it re-fetches the current URL, parses the HTML the server just rendered, and reconciles it into the live document node by node. Nodes whose content is unchanged are never touched, so they keep their event listeners, their signal bindings, and their focus.

A full `location.reload()` remains the floor, used whenever a patch cannot be applied safely, and the client always logs which condition fired.

The package has zero production dependencies, targets Node 22+, and uses `node:` builtins only. It is development-only: `NODE_ENV=production` disables it with no override.

## Installation

```bash
npm install -D @basenative/hmr
```

`@basenative/cli` already depends on it, so `bn dev` needs no setup.

## Quick Start

```bash
bn dev                # hot module replacement on
bn dev --no-hmr       # dev server straight on --port, as before
BN_HMR=off bn dev     # same, via the environment
```

`bn dev` starts your dev server on a private internal port and puts the HMR reverse proxy on the port you asked for, so the project itself needs no wiring.

In an Express app, one line is enough:

```js
import { hmrMiddleware } from '@basenative/hmr';

if (process.env.NODE_ENV !== 'production') {
  app.use(hmrMiddleware({ roots: [import.meta.dirname] }));
}
```

## API Reference

### createHmrServer(options?)

The core: file watcher, SSE fan-out, and the four browser modules.

**Options:** `roots`, `cwd`, `debounceMs`, `ignoredDirs`, `watch`, `log`, `env`.

**Returns:** `{ handle(req, res), notify(detail?), status(), close(), clients, generation, enabled }`. `handle()` returns `true` when it answered the request, so a host server knows to stop.

```js
const hmr = createHmrServer({ roots: [process.cwd()] });
http.createServer((req, res) => {
  if (hmr.handle(req, res)) return;
  app(req, res);
});
```

---

### hmrMiddleware(options?)

Node/Connect/Express middleware `(req, res, next)`. Serves the HMR routes and injects the client tag into any HTML response that passes through. The HMR server is exposed on `.hmr`, and `.close()` shuts it down.

Inert when `NODE_ENV=production`, checked per request rather than once at construction.

---

### toPipelineMiddleware(options?)

`@basenative/middleware` pipeline form `(ctx, next)`. Injects the client tag into `ctx.response.body` and updates `content-length` if the pipeline set one. Injection only — pair it with `hmrMiddleware()` or the proxy for the event stream.

---

### createHmrProxy(options)

A dev-only reverse proxy that adds HMR to a server that knows nothing about it. It owns the public port, forwards to `targetPort`, injects into HTML responses, serves the event stream, and watches the tree.

It also absorbs the `node --watch` restart race: on a server-side change it waits for the upstream socket to reopen before telling the browser anything, so the re-fetch lands on a live server instead of a refused connection.

**Options:** `targetPort` (required), `targetHost`, `port`, `host`, `roots`, `cwd`, `settleMs`, `debounceMs`, `ignoredDirs`, `log`, `env`.

**Returns:** `{ listen(), close(), server, hmr, watcher }`.

---

### createWatcher(options)

Debounced recursive `fs.watch` over one or more roots. Ignores `node_modules`, `.git`, `dist`, `.wrangler` at any depth, plus editor and OS scratch files. Reports paths relative to `cwd`, coalesced into one batch per quiet period.

**Returns:** `{ roots, watching, close() }`.

---

### patchDocument(liveDoc, nextDoc)

Reconcile a freshly parsed render into the live document.

**Returns:** `{ ok: true, stats, focusDisturbed }` or `{ ok: false, reason }`, where `stats` is `{ matched, inserted, removed, attrsChanged, textChanged, formChanged, skipped }`.

Also exported: `patchElement(liveRoot, nextRoot)` for a single region, `parseDocument(html, parser?)`, `canPatch(liveDoc, nextDoc)`, `keyOf(node)`, `isCompatible(a, b)`.

---

### capture(doc) / restore(doc, state)

Snapshot and re-apply the state a patch cannot carry: the focused element and its selection range, window and container scroll offsets, and open `<dialog>`/`<details>`.

`restore()` returns `{ focusRestored, focusUntouched, scrollers, opened }`. `focusUntouched: true` means the patch was clean enough that focus never left in the first place.

Also exported: `pathTo(el)`, `resolvePath(doc, path)`, `resolveRef(doc, ref)`.

---

### injectClientScript(html, options?)

Idempotent injection of the client tag before `</body>` (falling back to `</html>`). Fragments are left alone. Also exported: `clientTag(src?)`, `isFullDocument(html)`.

---

### isDevEnvironment(env?) / assertDevOnly(api, env?)

The production guard. `NODE_ENV=production` is absolute — no flag re-enables HMR. `BN_HMR=off` (or `0`, `false`, `no`) switches it off in development.

## Update Kinds

| Change | Kind | Browser action |
|---|---|---|
| `*.css` | `style` | Swap `<link>` hrefs; no DOM work |
| `.js` under `public/`, `static/`, `assets/`, `client/` | `hard` | `location.reload()` |
| anything else | `soft` | Re-fetch the URL and patch the DOM |

The most conservative kind in a batch wins. `classifyChange(file)` and `classifyBatch(files)` are exported.

## Fallback Conditions

The client reloads, and says so in the console, when the re-fetch fails or returns a non-2xx; when it redirects elsewhere; when the response is not HTML; when the body cannot be parsed as an HTML document; when the new render's `<body>` shares no top-level tag with the live one; when the patch throws; or when the server pushed a `hard` update.

## Template Directives

Two attributes participate in a patch:

- `data-bn-hmr-skip` — children of the element are left completely alone. The escape hatch for custom elements such as `<bn-canvas>` that build their subtree imperatively.
- `data-bn-key` — an explicit identity for a list row, matched across renders before position is considered.

## Events

Dispatched on `document` so an app can re-bind signals to newly inserted nodes:

- `bn:hmr:before-patch` — `{ files }`
- `bn:hmr:patched` — `{ kind, files, stats, restored }`
- `bn:hmr:reload` — `{ reason }`, immediately before a fallback reload

## Routes

| Route | Purpose |
|---|---|
| `/__bn_hmr/client.js` | Browser entry point (external module script) |
| `/__bn_hmr/patch.js`, `/preserve.js`, `/protocol.js` | Its modules |
| `/__bn_hmr/stream` | SSE: `hello`, `update`, `ping` |
| `/__bn_hmr/status` | JSON status |

## Content Security Policy

The injected tag is one external same-origin module script — no inline code, no nonce:

```html
<script type="module" src="/__bn_hmr/client.js" data-bn-hmr></script>
```

It runs unchanged under the strict policy in [the security guide](../guides/security.md): `default-src 'self'; script-src 'self'; connect-src 'self'`. `src/csp.test.js` enforces the absence of `eval`, `new Function`, inline handlers, and `javascript:` URLs.

## License

Apache-2.0
