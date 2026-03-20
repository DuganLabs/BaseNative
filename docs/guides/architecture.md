# BaseNative Architecture Guide

## Overview

BaseNative is a semantic HTML application runtime that operates on standard HTML with
template directives (`@if`, `@for`, `@switch`) and reactive bindings (`:attr`, `{{ }}`).
The server renders HTML with hydration markers, and the client picks up where the server
left off -- no virtual DOM, no JSX compilation step.

## Package Dependency Graph

```
                        @basenative/cli
                             |
              +--------------+--------------+
              |              |              |
       @basenative/   @basenative/   @basenative/
          config         server        middleware
              |           |   |            |
              |     +-----+   |    +-------+-------+-------+
              |     |         |    | adapters:               |
              |  @basenative/ |    | express, hono,          |
              |   runtime     |    | fastify, cloudflare     |
              |     |         |    +-------+-------+-------+
              |     |         |            |
              +-----+---------+----+-------+
                    |              |
              @basenative/   @basenative/
                router          forms
                    |
     +---------+----+----+---------+---------+
     |         |         |         |         |
  @base..   @base..   @base..   @base..   @base..
   /auth     /db      /fetch   /tenant   /realtime
     |         |
  @base..   adapters:
   /rbac    sqlite, postgres, d1
```

Additional leaf packages: `@basenative/logger`, `@basenative/i18n`,
`@basenative/upload`, `@basenative/flags`, `@basenative/notify`,
`@basenative/date`, `@basenative/components`.

## Request Lifecycle

A typical server request flows through five stages:

```
Client Request
     |
     v
1. Middleware Pipeline (createPipeline)
   cors -> rateLimit -> csrf -> logger -> auth -> tenant
     |
     v
2. Router Match
   Matches URL path + method to a handler
     |
     v
3. Handler Execution
   Business logic, database queries, data preparation
     |
     v
4. SSR Render (render / renderToStream / renderToReadableStream)
   Processes @if, @for, @switch directives
   Interpolates {{ expressions }}
   Injects hydration markers (<!--bn:if-->, <!--bn:for:item-->)
     |
     v
5. Response
   Streamed or buffered HTML sent to client
```

### Middleware Pipeline

The pipeline uses a Koa-style `(ctx, next)` signature. Middleware is composed in
order via `pipeline.use()`:

```js
import { createPipeline } from '@basenative/middleware';
import { cors } from '@basenative/middleware/builtins/cors';
import { rateLimit } from '@basenative/middleware/builtins/rate-limit';
import { csrf } from '@basenative/middleware/builtins/csrf';
import { sessionMiddleware } from '@basenative/auth';
import { tenantMiddleware, createSubdomainResolver } from '@basenative/tenant';

const pipeline = createPipeline();
pipeline.use(cors({ origin: 'https://app.example.com', credentials: true }));
pipeline.use(rateLimit({ windowMs: 60_000, max: 100 }));
pipeline.use(csrf({ cookieName: '_csrf', headerName: 'x-csrf-token' }));
pipeline.use(sessionMiddleware(sessionManager));
pipeline.use(tenantMiddleware(createSubdomainResolver({ baseDomain: 'example.com' })));
```

The context object `ctx` carries `request`, `response`, and `state`:

```js
{
  request: { method, url, path, headers, cookies, query, body, ip, params },
  response: { status, headers, cookies, body },
  state: {}  // middleware attaches tenant, session, user, csrfToken here
}
```

### Middleware Ordering

Order matters. The recommended ordering is:

1. **CORS** -- must run first to handle preflight requests
2. **Rate limiting** -- reject abusive traffic before doing any work
3. **Logger** -- start the request timer before downstream middleware
4. **CSRF** -- validate tokens before processing body
5. **Session** -- load user session from cookie
6. **Auth guard** -- reject unauthenticated requests
7. **Tenant** -- resolve tenant after authentication
8. **Feature flags** -- load flags with user and tenant context
9. **Route handler** -- business logic

## Signal Reactivity Model

BaseNative signals are the core reactivity primitive on the client. They use
automatic dependency tracking -- no explicit subscription lists.

```
signal(value)         -- creates a reactive value
     |
     v
computed(fn)          -- derived value, re-runs when dependencies change
     |
     v
effect(fn)            -- side effect, re-runs when dependencies change
                         returns a dispose function
```

### How Tracking Works

1. An `effect` sets itself as `currentEffect` before running its function.
2. When a `signal` accessor is called, it detects `currentEffect` and subscribes it.
3. When `signal.set()` is called, all subscribed effects re-run.
4. `computed` is built on top of `effect` + `signal` -- it creates an internal
   signal and an effect that keeps it updated.

```js
import { signal, computed, effect } from '@basenative/runtime';

const count = signal(0);
const doubled = computed(() => count() * 2);

const dispose = effect(() => {
  console.log(`Count: ${count()}, Doubled: ${doubled()}`);
});
// Logs: "Count: 0, Doubled: 0"

count.set(5);
// Logs: "Count: 5, Doubled: 10"

dispose(); // Cleans up subscriptions
```

### Batching

Signal updates are batched within the same microtask. If you call `set()` multiple
times synchronously, effects fire once after all updates settle:

```js
const a = signal(1);
const b = signal(2);

effect(() => console.log(a() + b())); // Logs: 3

a.set(10);
b.set(20);
// Logs: 30 (only once, not 12 then 30)
```

## Plugin System

Plugins hook into the render/hydrate lifecycle. The registry supports five hooks:

| Hook              | When                                     |
|-------------------|------------------------------------------|
| `beforeRender`    | Before server-side template rendering    |
| `afterRender`     | After server-side template rendering     |
| `beforeHydrate`   | Before client-side hydration begins      |
| `afterHydrate`    | After client-side hydration completes    |
| `error`           | When a render or hydration error occurs  |

Plugins can also register custom directives:

```js
import { definePlugin, createPluginRegistry } from '@basenative/runtime';

const analyticsPlugin = definePlugin({
  name: 'analytics',
  setup(api) {
    api.onAfterHydrate((root) => {
      trackPageView(root);
    });
    api.addDirective('track', (element, value, ctx) => {
      element.addEventListener('click', () => sendEvent(value));
    });
    api.onError((err) => {
      reportError(err);
    });
  },
});

const registry = createPluginRegistry();
registry.register(analyticsPlugin);
```

### Plugin Composition

Plugins execute in registration order. Each hook receives the output from the
previous plugin, enabling transformation chains:

```js
const i18nPlugin = definePlugin({
  name: 'i18n',
  setup(api) {
    api.onBeforeRender((html, ctx) => {
      // Replace {{t:key}} placeholders with translations
      return html.replace(/\{\{t:(\w+)\}\}/g, (_, key) => translate(key, ctx.locale));
    });
  },
});
```

## SSR + Hydration Flow

### Server Side

`render(html, ctx, options)` parses the HTML template, processes directives
(`@if`, `@for`, `@switch`), interpolates `{{ }}` expressions, and returns a
string. With `hydratable: true`, it injects comment markers (`<!--bn:if-->`,
`<!--bn:for:item:key=...-->`) that the client uses to reconcile.

```js
import { render } from '@basenative/server';

const html = render(`
  <ul>
    <template @for="item of items; track item.id">
      <li>{{ item.name }}</li>
    </template>
  </ul>
`, { items: [{ id: 1, name: 'Alpha' }] }, { hydratable: true });
```

For streaming, use `renderToStream` (Node writable) or `renderToReadableStream`
(Web Streams / Cloudflare Workers):

```js
import { renderToReadableStream } from '@basenative/server';

const stream = renderToReadableStream(template, data, {
  hydratable: true,
  chunkSize: 4096,
});
return new Response(stream, { headers: { 'content-type': 'text/html' } });
```

### Client Side

`hydrate(root, ctx)` walks the DOM, finds template directives, sets up
reactive bindings, and wires signals to DOM updates. It returns a dispose
function to tear down all effects:

```js
import { hydrate } from '@basenative/runtime';

const dispose = hydrate(document.getElementById('app'), {
  items: itemsSignal,
  handleClick,
});

// Later, to unmount:
dispose();
```

### Hydration Markers

The server injects comment nodes that the client uses to locate dynamic regions:

```html
<!--bn:if-->          <!-- conditional block boundary -->
<!--bn:for:item-->    <!-- loop iteration boundary with key -->
<!--bn:switch-->      <!-- switch block boundary -->
```

These markers carry no runtime cost once hydration completes. The hydrate function
removes them from the DOM after wiring up the reactive bindings.

### Hydration Errors

Hydration mismatches are reported via the diagnostics system with error codes
like `BN_HYDRATE_MARKERS_WITHOUT_TEMPLATE` and `BN_HYDRATE_NO_DIRECTIVES`.
See the [troubleshooting guide](troubleshooting.md) for common causes and fixes.
