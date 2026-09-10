# @basenative/server API

## `render(html, ctx?, options?)`

Renders an HTML template string with the given context. Processes all BaseNative directives server-side.

```js
import { render } from '@basenative/server';

const html = render(`
  <h1>{{ title }}</h1>
  <template @for="item of items; track item.id">
    <p>{{ item.name }}</p>
  </template>
`, {
  title: 'My Page',
  items: [
    { id: 1, name: 'Item A' },
    { id: 2, name: 'Item B' },
  ],
});
```

### Options

| Option | Type | Description |
|--------|------|-------------|
| `hydratable` | `boolean` | Emit `<!--bn:...-->` marker comments for hydration diagnostics |
| `onDiagnostic` | `(diagnostic) => void` | Callback for diagnostic events during rendering |

### Hydratable Mode

```js
const html = render(template, ctx, { hydratable: true });
// Output includes <!--bn:if-->...<!--/bn:if--> markers
```

### Server-Side Directives

All template directives (`@if`, `@for`, `@switch`, `:attr`, `{{ }}`) are evaluated at render time. Event handlers (`@click`, `@input`) are stripped from the output (they activate on client hydration).

Directives contributed by other packages (`@feature` from `@basenative/flags`, `@t` from `@basenative/i18n`) are also evaluated at render time — `render()` never imports these packages; it looks each directive up by name in `@basenative/runtime`'s shared registry (`getDirective`/`listDirectives`) and calls the directive's `server(value, ctx, options)` handler. Importing a directive-providing package registers it as a side effect, so no extra wiring is needed in `render()` calls. See `registerDirective(name, config)` in [docs/api/runtime.md](./runtime.md#custom-directives--registerdirectivename-config) for how directives are registered, and [docs/api/flags.md](./flags.md) / [docs/api/i18n.md](./i18n.md) for `@feature` / `@t` themselves.

### resolveDeferred(options)

Renders the content queued by `@defer` blocks encountered during `render()`, and returns a matching `<script>` injection for each one that swaps it into the page once the deferred HTML is ready. Pass the same `options` object that was passed to `render()` — `render()` accumulates deferred blocks onto it internally (`options._deferred`).

```js
import { render, resolveDeferred } from '@basenative/server';

const options = { hydratable: true };
const html = render(`
  <template @defer>
    <p>{{ slowStat() }}</p>
  </template>
`, ctx, options);

// After the initial response is sent (or streamed), resolve each deferred block:
const deferred = resolveDeferred(options);
for (const { id, html: fragmentHtml, script } of deferred) {
  // `script` is a ready-to-inject <script> tag that finds the
  // `<div data-bn-defer="id">` placeholder and replaces its innerHTML.
}
```

**Parameters:**
- `options` — the options object passed to the preceding `render()` call; read via `options._deferred` (an internal array populated by `render()` — do not construct it by hand)

**Returns:** `Array<{ id: string, html: string, script: string }>` — one entry per `@defer` block, in the order encountered. `script` is a self-contained `<script data-bn-defer-resolve="id">` tag that replaces the corresponding `<div data-bn-defer="id">` placeholder's `innerHTML` and dispatches a `bn:defer` `CustomEvent` on `document` once applied.

`renderToStream`/`renderToReadableStream` (below) call `resolveDeferred` for you and append the scripts after the main content — call it directly only if you're building a custom streaming or multi-response flow.

## Streaming

Both streaming helpers live in the `@basenative/server/stream` subpath export, not the package root.

### renderToStream(html, ctx, stream, options?)

Renders a template and writes it to a Node.js-style writable stream in chunks, respecting backpressure. Deferred (`@defer`) sections are resolved and appended after the main content as `<script>` injections, same as `resolveDeferred` above.

```js
import { renderToStream } from '@basenative/server/stream';

app.get('/', (req, res) => {
  res.setHeader('Content-Type', 'text/html');
  renderToStream(template, ctx, res, { chunkSize: 8192, hydratable: true });
});
```

**Parameters:**
- `html` — full HTML template string
- `ctx` — template context
- `stream` — a writable stream with `write(chunk)` (returning `false` to signal backpressure), `end()`, and a `'drain'` event — e.g. an Express/Node.js `res`
- `options.chunkSize` — characters per chunk; default `4096`
- `options.hydratable` — emit hydration markers; default `false`
- `options.onDiagnostic` — diagnostic callback, same as `render()`

**Returns:** `undefined` — writes to `stream` and calls `stream.end()` when done.

---

### renderToReadableStream(html, ctx, options?)

Same rendering and chunking behavior as `renderToStream`, but returns a Web-standard `ReadableStream` instead of writing to a passed-in stream — for Cloudflare Workers, Deno, or any `Response`-based runtime.

```js
import { renderToReadableStream } from '@basenative/server/stream';

export default {
  fetch(request) {
    const stream = renderToReadableStream(template, ctx, { chunkSize: 8192 });
    return new Response(stream, { headers: { 'Content-Type': 'text/html' } });
  },
};
```

**Parameters:**
- `html` — full HTML template string
- `ctx` — template context
- `options.chunkSize` — characters per chunk; default `4096`
- `options.hydratable` — emit hydration markers; default `false`
- `options.onDiagnostic` — diagnostic callback, same as `render()`

**Returns:** `ReadableStream` of UTF-8-encoded chunks; closes automatically once the rendered output (including any resolved `@defer` scripts) has been fully enqueued.
