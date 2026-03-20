# BaseNative Performance Guide

## Lazy Hydration Strategies

BaseNative supports four lazy hydration strategies that defer client-side
hydration until the component is actually needed, reducing initial JavaScript
execution time.

### Viewport (Intersection Observer)

Hydrate when the element scrolls into view:

```html
<div bn-hydrate="viewport">
  <template @for="item of items; track item.id">
    <div class="card">{{ item.title }}</div>
  </template>
</div>
```

```js
import { hydrate } from '@basenative/runtime';

hydrate(document.getElementById('app'), context, {
  lazy: {
    viewport: { rootMargin: '200px' },  // start hydrating 200px before visible
  },
});
```

### Idle (requestIdleCallback)

Hydrate during browser idle periods:

```html
<div bn-hydrate="idle">
  <!-- non-critical interactive content -->
</div>
```

### Interaction

Hydrate on first user interaction (click, focus, mouseover):

```html
<div bn-hydrate="interaction">
  <button @click="handleSubmit()">Submit</button>
</div>
```

The first interaction is captured and replayed after hydration completes,
so the user's click is never lost.

### Media Query

Hydrate only when a media query matches:

```html
<div bn-hydrate="media" bn-hydrate-query="(min-width: 768px)">
  <!-- desktop-only interactive sidebar -->
</div>
```

### Combining Strategies

Strategies can be combined. A component with `bn-hydrate="viewport idle"` will
hydrate when it enters the viewport OR when the browser is idle, whichever
comes first.

---

## Web Vitals Monitoring

Track Core Web Vitals and report them to your analytics endpoint:

```js
import { createVitalsReporter } from '@basenative/runtime';

const reporter = createVitalsReporter({
  onReport(metric) {
    // metric: { name, value, rating, id, navigationType }
    // name is one of: LCP, FID, CLS, FCP, TTFB, INP
    navigator.sendBeacon('/api/vitals', JSON.stringify(metric));
  },
});

reporter.start();
```

On the server, aggregate metrics and set alert thresholds:

```js
import { createLogger } from '@basenative/logger';
const logger = createLogger({ name: 'vitals' });

pipeline.use(async (ctx, next) => {
  if (ctx.request.path === '/api/vitals' && ctx.request.method === 'POST') {
    const metric = ctx.request.body;
    logger.info({ metric }, `Web vital: ${metric.name}=${metric.value}`);
    if (metric.name === 'LCP' && metric.value > 2500) {
      logger.warn({ metric }, 'LCP exceeds 2.5s threshold');
    }
    ctx.response.status = 204;
    return;
  }
  await next();
});
```

---

## Virtual Scrolling

For large datasets, use the virtualizer from `@basenative/components` to
render only visible rows:

```html
<bn-virtualizer
  :items="items"
  :item-height="48"
  :overscan="5"
  style="height: 600px; overflow: auto;"
>
  <template @for="item of visibleItems; track item.id">
    <div class="row" style="height: 48px;">{{ item.name }}</div>
  </template>
</bn-virtualizer>
```

```js
import { signal } from '@basenative/runtime';

const items = signal(Array.from({ length: 100_000 }, (_, i) => ({
  id: i,
  name: `Row ${i}`,
})));
```

The virtualizer renders only the visible rows plus an overscan buffer,
keeping DOM node count constant regardless of dataset size.

### DataGrid with Virtualization

The `@basenative/components` datagrid uses virtualization by default:

```js
import { renderDataGrid } from '@basenative/components';

const grid = renderDataGrid({
  columns: [
    { key: 'id', label: 'ID', width: 80 },
    { key: 'name', label: 'Name', sortable: true },
    { key: 'email', label: 'Email', sortable: true },
  ],
  rows: largeDataset,       // any size
  virtualScroll: true,       // default
  rowHeight: 48,
});
```

---

## SSR Streaming

Streaming SSR sends HTML to the browser as it is generated rather than
buffering the entire response. This reduces Time to First Byte (TTFB):

```js
import { renderToReadableStream } from '@basenative/server';

pipeline.use(async (ctx, next) => {
  const stream = renderToReadableStream(template, ctx.state.data, {
    hydratable: true,
    chunkSize: 4096,
    onShellReady() {
      // The initial HTML shell (before any async data) is ready
      ctx.response.headers['content-type'] = 'text/html';
    },
  });
  ctx.response.body = stream;
  await next();
});
```

For Node.js servers, use `renderToStream` which returns a Node Readable:

```js
import { renderToStream } from '@basenative/server';

app.get('/', (req, res) => {
  res.setHeader('content-type', 'text/html');
  const stream = renderToStream(template, data, { hydratable: true });
  stream.pipe(res);
});
```

---

## Signal-Based Reactivity

BaseNative signals provide fine-grained updates. Unlike virtual DOM diffing,
only the specific DOM nodes bound to a changed signal are updated:

```js
import { signal, computed, effect } from '@basenative/runtime';

const firstName = signal('Jane');
const lastName = signal('Doe');
const fullName = computed(() => `${firstName()} ${lastName()}`);

// Only the <span> bound to fullName updates when firstName changes.
// No diffing of the entire component tree.
```

### Avoiding Unnecessary Recomputation

Use `signal.peek()` to read a value without creating a dependency:

```js
effect(() => {
  // This effect depends on `items` but not `selectedId`
  const list = items();
  const id = selectedId.peek();  // read without subscribing
  renderList(list, id);
});
```

### Batch Updates

Multiple synchronous signal updates are batched into a single effect run:

```js
const a = signal(0);
const b = signal(0);

effect(() => console.log(a() + b()));
// Logs: 0

a.set(1);
b.set(2);
// Logs: 3 (once, not twice)
```

---

## Bundle Optimization

### Tree Shaking

All BaseNative packages use ESM exports with no side effects. Import only
what you need:

```js
// Good: only the signal primitives are included
import { signal, computed } from '@basenative/runtime';

// Avoid: do not import the entire package
import * as runtime from '@basenative/runtime';
```

### Code Splitting with Lazy Hydration

Combine dynamic imports with lazy hydration to load code on demand:

```js
const dispose = hydrate(root, context, {
  lazy: {
    interaction: {
      async load() {
        const { chartContext } = await import('./chart.js');
        return chartContext;
      },
    },
  },
});
```

---

## Caching Strategies

`@basenative/fetch` provides a built-in request cache to deduplicate
and cache API responses:

```js
import { createResource, createCache } from '@basenative/fetch';

const cache = createCache({ maxAge: 5 * 60 * 1000, maxSize: 100 });

const users = createResource(
  async (params, { signal }) => {
    const key = `/api/users?page=${params.page}`;
    const cached = cache.get(key);
    if (cached) return cached;

    const res = await fetch(key, { signal });
    const data = await res.json();
    cache.set(key, data);
    return data;
  },
  { immediate: false }
);

// Fetch page 1
users.fetch({ page: 1 });

// Invalidate cache after mutation
await createUserMutation.mutate(newUser);
cache.invalidate('/api/users?page=1');
users.refetch({ page: 1 });
```

### Server-Side Caching

Add response caching at the middleware level:

```js
const responseCache = createCache({ maxAge: 60_000, maxSize: 200 });

pipeline.use(async (ctx, next) => {
  if (ctx.request.method === 'GET') {
    const cached = responseCache.get(ctx.request.url);
    if (cached) {
      ctx.response.body = cached;
      ctx.response.headers['x-cache'] = 'HIT';
      return;
    }
  }

  await next();

  if (ctx.request.method === 'GET' && ctx.response.status === 200) {
    responseCache.set(ctx.request.url, ctx.response.body);
    ctx.response.headers['x-cache'] = 'MISS';
  }
});
```
