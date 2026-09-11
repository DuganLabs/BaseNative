# @basenative/hmr

> Dev-only hot module replacement for BaseNative servers — the browser stops asking you to hit refresh, and keeps your caret where you left it

Part of the [BaseNative](https://github.com/DuganLabs/basenative) ecosystem — a signal-based web runtime over native HTML. Zero production dependencies, Node 22+, `node:` builtins only.

## Why this is HMR and not a live reload

A live reloader calls `location.reload()`. That works, and it also throws away
everything you were doing: the text you half-typed, the caret inside it, the
scroll position, the dialog you had open.

BaseNative renders HTML strings on the server and binds signals on the client,
which makes a better answer available. On a change the client re-fetches **the
current URL**, parses the HTML the server just produced, and reconciles it into
the live document node by node. Nodes that did not change are not touched — so
they keep their listeners, their signal bindings, and their focus.

A full reload is still there as the floor. It fires when a patch cannot be
correct, and it always says why in the console.

## Install

```bash
npm install -D @basenative/hmr
```

`bn dev` already depends on it — if you use the CLI there is nothing to install
and nothing to configure.

## Quick start

### With `bn dev` (nothing to do)

```bash
bn dev                # HMR on
bn dev --no-hmr       # the old behaviour: dev server straight on --port
BN_HMR=off bn dev     # same, via the environment
```

`bn dev` starts your dev server on a private internal port and puts the HMR
proxy on the port you asked for. Your app is untouched — no middleware, no
import, no change to `server.js`.

### In an Express app

```js
import express from 'express';
import { hmrMiddleware } from '@basenative/hmr';

const app = express();

if (process.env.NODE_ENV !== 'production') {
  app.use(hmrMiddleware({ roots: [import.meta.dirname] }));
}
```

That one line serves the event stream, serves the client module, and injects
the client tag into every HTML response.

### In a `@basenative/middleware` pipeline

```js
import { createPipeline } from '@basenative/middleware';
import { toPipelineMiddleware } from '@basenative/hmr';

const pipeline = createPipeline().use(toPipelineMiddleware());
```

The pipeline form injects into `ctx.response.body`. An event stream needs the
raw response object, so pair it with `hmrMiddleware()` or the proxy.

## What survives a patch

| State | How |
|---|---|
| **Focus** | The focused node is matched and reused, so focus never leaves. If it genuinely had to be rebuilt, it is refocused by a stable path (id → element-index path → `[name]`). |
| **Caret and selection** | `selectionStart` / `selectionEnd` / `selectionDirection` are captured and re-applied — guarded, because reading them throws on `type="number"` and friends. |
| **Typed input** | A control's live value wins unless the *source* changed its default. Same rule for `checked` and for `<textarea>` text. |
| **Scroll** | Window offset plus every scrolled container, by path. |
| **Open state** | `<dialog open>` and `<details open>` are never closed by a patch, because the server render has no `open` attribute to carry. |
| **Signals** | Preserved wherever the DOM node was preserved: the binding lives on the node, and the node survived. |

## What triggers a full reload

The client falls back to `location.reload()`, with a `[bn:hmr]` console line
explaining which of these fired:

- the re-fetch failed, returned a non-2xx, or redirected elsewhere
- the response was not HTML
- the response could not be parsed as an HTML document (an empty body, or a
  crash page with no markup at all)
- the page structure diverged — the new render's `<body>` shares no top-level
  tag with the live one
- the patch threw
- the server pushed a `hard` update: a browser-delivered `.js` file changed, and
  patching the DOM would leave stale module code running

## Update kinds

A changed file is classified before anything is sent:

| Change | Kind | What the browser does |
|---|---|---|
| `*.css` | `style` | Swaps `<link>` hrefs. No DOM work at all. |
| `.js` under `public/`, `static/`, `assets/`, `client/` | `hard` | Full reload. |
| everything else | `soft` | Re-fetch the URL and patch. |

The most conservative kind in a batch wins.

## Re-hydrating after a patch

A patch inserts server HTML. Nodes that are genuinely new are not yet bound to
your signals, so the client dispatches events on `document` for you to hook:

```js
document.addEventListener('bn:hmr:patched', (event) => {
  console.log(event.detail.stats); // { matched, inserted, removed, … }
  hydrate(document.querySelector('main'), ctx);
});
```

`bn:hmr:before-patch` fires first, and `bn:hmr:reload` fires just before a
fallback reload with `{ reason }`.

## Opting a subtree out

Custom elements that build their own DOM — `<bn-canvas>` and friends — should
not be reconciled against server markup that does not describe their runtime
contents:

```html
<bn-canvas data-bn-hmr-skip></bn-canvas>
```

Attributes on the element are still patched; its children are left alone.

## Content Security Policy

The injected tag is a single external, same-origin module script:

```html
<script type="module" src="/__bn_hmr/client.js" data-bn-hmr></script>
```

There is no inline script, no `eval`, no `new Function`, and no inline event
handler anywhere in this package — enforced by `src/csp.test.js`. It runs as-is
under the policy `docs/guides/security.md` documents for BaseNative apps:

```
default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'
```

`connect-src 'self'` already covers the event stream, which is same-origin.

## Development only

- `NODE_ENV=production` disables everything, and there is **no** environment
  variable, option, or force flag that turns it back on.
- The check runs per request, not once at construction, so a server that boots
  before `NODE_ENV` is read cannot stay hot.
- `createHmrProxy()` and `createWatcher()` throw in production rather than
  starting. `hmrMiddleware()` degrades to a pass-through instead, so a pipeline
  that accidentally ships with it still serves traffic.
- `BN_HMR=off` (or `0` / `false` / `no`) switches HMR off in development.

## API

### Server

- `createHmrServer(options?)` — the core: watcher, SSE fan-out, and the four
  browser modules. Returns `{ handle(req, res), notify(detail?), status(), close(), clients, generation, enabled }`.
  `handle()` returns `true` when it answered the request.
- `hmrMiddleware(options?)` — Node/Connect/Express `(req, res, next)`. Carries
  the server on `.hmr`.
- `toPipelineMiddleware(options?)` — `@basenative/middleware` `(ctx, next)` form.
- `createHmrProxy({ targetPort, port, … })` — reverse proxy that adds HMR to a
  server that knows nothing about it. Returns `{ listen(), close(), server, hmr, watcher }`.
- `createWatcher({ roots, onChange, … })` — debounced recursive `fs.watch`,
  ignoring `node_modules`, `.git`, `dist`, `.wrangler` and editor scratch files.
- `injectClientScript(html, options?)` — idempotent tag injection.
- `interceptHtml(res, transform, options?)` — buffer an HTML response so it can
  be rewritten; everything else streams through.
- `isPortOpen`, `waitForUpstream`, `findFreePort` — the port helpers the proxy
  uses to wait out a `node --watch` restart.
- `isDevEnvironment(env?)`, `assertDevOnly(api, env?)` — the guard.

### Isomorphic (`@basenative/hmr/patch`, `/preserve`)

- `patchDocument(liveDoc, nextDoc)` → `{ ok, stats, focusDisturbed }` or `{ ok: false, reason }`.
- `patchElement(liveRoot, nextRoot)` — the same, for one region.
- `parseDocument(html, parser?)` → `Document | null`.
- `canPatch(liveDoc, nextDoc)`, `keyOf(node)`, `isCompatible(a, b)`.
- `capture(doc)` / `restore(doc, state)` — focus, caret, scroll, open state.
- `pathTo(el)` / `resolvePath(doc, path)` / `resolveRef(doc, ref)`.

### Routes

| Route | Purpose |
|---|---|
| `/__bn_hmr/client.js` | The browser entry point. |
| `/__bn_hmr/patch.js`, `/preserve.js`, `/protocol.js` | Its modules. |
| `/__bn_hmr/stream` | SSE: `hello`, `update`, `ping`. |
| `/__bn_hmr/status` | JSON status — handy in tests. |

## Tests

```bash
cd packages/hmr && node --test
```

## License

Apache-2.0
