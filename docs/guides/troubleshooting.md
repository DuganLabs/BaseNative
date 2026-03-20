# BaseNative Troubleshooting Guide

## Common Errors and Solutions

### `BN_CONFIG_INVALID`

**Symptom:** Application crashes at startup with a validation error listing
invalid environment variables.

**Cause:** `validateConfig` found one or more environment variables that do not
match the schema.

**Fix:** Check your `.env` file against the schema. Common issues:
- Missing required variables
- `PORT` set to a string like `"three-thousand"` instead of `3000`
- Boolean values not recognized (use `"true"` or `"false"`, not `"yes"`)

```js
// Check your schema
const config = validateConfig(process.env, {
  PORT: number({ min: 1, max: 65535 }),  // must be numeric
  ENABLE_CSRF: boolean(),                 // must be "true" or "false"
});
```

### `TypeError: pipeline.use is not a function`

**Cause:** Importing `createPipeline` from the wrong path or using a stale
import.

**Fix:** Ensure you import from `@basenative/middleware`:

```js
import { createPipeline } from '@basenative/middleware';
const pipeline = createPipeline();
```

### `Cannot read properties of undefined (reading 'host')`

**Cause:** The tenant resolver received a context without properly structured
request headers.

**Fix:** Ensure your platform adapter correctly maps headers. Check that
`ctx.request.headers` is an object:

```js
pipeline.use(async (ctx, next) => {
  console.log('Headers:', ctx.request.headers);  // Should be an object, not undefined
  await next();
});
```

---

## Hydration Mismatch Debugging

### `BN_HYDRATE_MARKERS_WITHOUT_TEMPLATE`

**Symptom:** Console warning that hydration markers exist in the DOM but no
matching `<template>` directives were found.

**Cause:** The server rendered HTML with `hydratable: true`, but the client
hydration context is missing the data or the template structure changed
between server and client rendering.

**Diagnosis:**

1. Inspect the DOM for `<!--bn:if-->` or `<!--bn:for:item-->` comments.
2. Verify the same template HTML is used on server and client.
3. Ensure the hydration context provides all variables referenced in templates.

```js
// Server
const html = render(template, { items, showBanner: true }, { hydratable: true });

// Client -- must provide the same variables
hydrate(root, {
  items: itemsSignal,
  showBanner: showBannerSignal,  // Do not forget this
});
```

### `BN_HYDRATE_NO_DIRECTIVES`

**Symptom:** `hydrate()` finds no directives in the target element.

**Cause:** Usually one of:
- The wrong root element was passed to `hydrate()`
- The server rendered without `hydratable: true`
- JavaScript loaded before the SSR HTML was in the DOM

**Fix:**

```js
// Ensure the root element contains the rendered HTML
const root = document.getElementById('app');
console.log('Root innerHTML length:', root.innerHTML.length);  // Should be > 0

// Ensure hydratable was enabled on the server
const html = render(template, data, { hydratable: true });  // <-- required
```

### Content Mismatch Between Server and Client

**Symptom:** The page flickers or content changes after hydration.

**Cause:** The data used for server rendering differs from the initial signal
values on the client.

**Fix:** Serialize the server data and use it to initialize client signals:

```html
<!-- Server: inject serialized state -->
<script type="application/json" id="__BN_STATE__">
  {{ JSON.stringify(serverData) }}
</script>
```

```js
// Client: read serialized state
const state = JSON.parse(document.getElementById('__BN_STATE__').textContent);
const items = signal(state.items);

hydrate(root, { items });
```

### Non-Deterministic Rendering

**Symptom:** Hydration mismatches on every page load, even with correct data.

**Cause:** The template uses values that differ between server and client, such
as `Date.now()`, `Math.random()`, or locale-dependent formatting.

**Fix:** Generate these values on the server and pass them as data:

```js
// Server
const html = render(template, {
  timestamp: Date.now(),
  requestId: crypto.randomUUID(),
});

// Client: use the same values from serialized state
const state = JSON.parse(document.getElementById('__BN_STATE__').textContent);
const timestamp = signal(state.timestamp);
```

---

## Signal Dependency Tracking Issues

### Effect Not Re-running

**Symptom:** An effect does not fire when a signal it reads changes.

**Cause:** The signal was read outside the effect's tracking scope, or
`peek()` was used instead of the accessor.

**Diagnosis:**

```js
const count = signal(0);

// Bug: count is read outside the effect body
const current = count();
effect(() => {
  console.log(current);  // This captures the value, not the signal
});

// Fix: read the signal inside the effect
effect(() => {
  console.log(count());  // Now the effect subscribes to count
});
```

### Infinite Effect Loop

**Symptom:** The page freezes or you see "Maximum call stack size exceeded."

**Cause:** An effect both reads and writes the same signal:

```js
// Bug: infinite loop
const items = signal([]);
effect(() => {
  items.set([...items(), newItem]);  // reads and writes items
});
```

**Fix:** Use `peek()` to break the cycle, or restructure so the write
happens outside the reading effect:

```js
// Fix with peek
effect(() => {
  const current = items.peek();
  items.set([...current, newItem]);
});

// Better: use a separate action function
function addItem(item) {
  items.set(prev => [...prev, item]);
}
```

### Computed Not Updating

**Symptom:** A `computed` value seems stale.

**Cause:** The dependency was accessed conditionally and not reached on the
first run:

```js
const showDetails = signal(false);
const details = signal({ name: 'Alice' });

// Bug: details() is only called when showDetails is true.
// If showDetails starts as false, computed never subscribes to details.
const label = computed(() => {
  if (showDetails()) {
    return details().name;
  }
  return 'Hidden';
});
```

**Fix:** Access all dependencies unconditionally when possible, or restructure
the computation:

```js
const label = computed(() => {
  const d = details();  // always subscribe
  return showDetails() ? d.name : 'Hidden';
});
```

### Memory Leaks from Undisposed Effects

**Symptom:** Memory usage grows over time, especially in single-page
applications.

**Cause:** Effects created during navigation are not disposed when the view
changes.

**Fix:** Always store and call the dispose function returned by `hydrate()`
and `effect()`:

```js
let currentDispose = null;

function navigateTo(view) {
  if (currentDispose) currentDispose();  // clean up previous view
  const html = render(views[view], data, { hydratable: true });
  root.innerHTML = html;
  currentDispose = hydrate(root, context);
}
```

---

## Middleware Ordering Problems

### CSRF Token Not Found

**Symptom:** POST requests fail with "CSRF token invalid" even though the
token is sent.

**Cause:** CSRF middleware runs before the cookie parser, so the token cookie
is not available.

**Fix:** Ensure middleware is ordered correctly. The pipeline adapter should
parse cookies before CSRF validation:

```js
pipeline.use(cors({ origin: '...' }));
pipeline.use(rateLimit({ windowMs: 60_000, max: 100 }));
// Cookies must be parsed before CSRF
pipeline.use(csrf({ cookieName: '_csrf', headerName: 'x-csrf-token' }));
```

### Auth Middleware Returns 401 for Public Routes

**Cause:** `requireAuth` is applied globally instead of selectively.

**Fix:** Apply auth only to protected routes:

```js
const authRequired = requireAuth({ redirectTo: '/login' });

pipeline.use(async (ctx, next) => {
  const publicPaths = ['/login', '/register', '/health', '/assets'];
  if (publicPaths.some(p => ctx.request.path.startsWith(p))) {
    await next();
    return;
  }
  await authRequired(ctx, next);
});
```

### Tenant Middleware Returns Null

**Cause:** The tenant resolver runs before the request headers or path are
fully populated by the platform adapter.

**Fix:** Place tenant middleware after the platform adapter has constructed
the full request context. Verify with logging:

```js
pipeline.use(async (ctx, next) => {
  console.log('Host:', ctx.request.headers.host);
  console.log('Path:', ctx.request.path);
  await next();
});
pipeline.use(tenantMiddleware(resolver));
```

### Recommended Middleware Order

```js
const pipeline = createPipeline();
pipeline.use(cors());              // 1. CORS (handle preflight first)
pipeline.use(rateLimit());         // 2. Rate limiting (reject abuse early)
pipeline.use(loggerMiddleware());  // 3. Logger (start timing)
pipeline.use(csrf());              // 4. CSRF (validate tokens)
pipeline.use(sessionMiddleware()); // 5. Session (load user)
pipeline.use(requireAuth());       // 6. Auth guard (reject unauthenticated)
pipeline.use(tenantMiddleware());  // 7. Tenant (resolve after auth)
pipeline.use(flagMiddleware());    // 8. Feature flags (needs user + tenant)
```

---

## Database Connection Issues

### `ECONNREFUSED` or `Connection timed out`

**Cause:** The database is not running, or the connection string is wrong.

**Diagnosis:**
1. Verify the database is running: `pg_isready -h localhost -p 5432`
2. Check `DATABASE_URL` in your `.env` file
3. Ensure network access (firewalls, security groups)
4. In Docker, use the service name (e.g. `db`) not `localhost`

### Connection Pool Exhaustion

**Symptom:** Requests hang and eventually time out. Logs show "connection pool
exhausted" or "timeout waiting for available connection."

**Cause:** Long-running queries or leaked connections.

**Fix:**
1. Reduce `pool.max` and set `connectionTimeoutMs`:

```js
const db = createPostgresAdapter({
  connectionString: process.env.DATABASE_URL,
  pool: { max: 10, connectionTimeoutMs: 5_000 },
});
```

2. Ensure every query uses `await` to return connections to the pool.
3. Add query timeouts: `SET statement_timeout = 5000;`

### D1 Binding Not Available

**Symptom:** `ctx.env.DB` is undefined in Cloudflare Workers.

**Fix:** Check `wrangler.toml` for the D1 binding and ensure the binding
name matches:

```toml
[[d1_databases]]
binding = "DB"            # Must match ctx.env.DB
database_name = "app-db"
database_id = "your-id"
```

### `SQLITE_BUSY` Errors

**Cause:** Multiple write operations contending for the database lock.

**Fix:** Enable WAL mode and set a busy timeout:

```js
const db = createSQLiteAdapter({
  filename: './data/app.db',
  pragmas: { journal_mode: 'WAL', busy_timeout: 5000 },
});
```

---

## Auth Session Problems

### Session Lost After Redirect

**Symptom:** User is authenticated, gets redirected, and is no longer
authenticated on the next page.

**Cause:** The session cookie is not being set or read correctly. Common
reasons:
- `secure: true` on HTTP (non-HTTPS) in development
- `sameSite: 'strict'` blocking the cookie on cross-origin redirects
- Missing `path: '/'` on the cookie

**Fix:**

```js
const sessions = createSessionManager({
  store: createDbStore(db),
  secure: process.env.NODE_ENV === 'production',  // false in dev
  sameSite: 'lax',     // allows cookies on top-level navigations
  httpOnly: true,
});
```

### Session Data Not Persisting

**Symptom:** `ctx.state.user` is null even after successful login.

**Cause:** Using `createMemoryStore` across multiple processes or after a
restart.

**Fix:** Use `createDbStore` for persistent sessions:

```js
import { createDbStore } from '@basenative/auth';

const store = createDbStore(dbAdapter, { tableName: 'sessions' });
const sessions = createSessionManager({ store });
```

### Session Fixation

**Symptom:** Security audit flags session fixation vulnerability.

**Fix:** Rotate the session ID after authentication:

```js
import { login } from '@basenative/auth';

// After verifying credentials, destroy old session and create new one
if (ctx.state.session) {
  await sessions.destroy(ctx.state.session.id);
}
await login(sessions, ctx, user);
```

---

## Performance Profiling

### Server-Side Profiling

Add timing middleware to identify slow handlers:

```js
import { createLogger } from '@basenative/logger';
const logger = createLogger({ name: 'perf' });

pipeline.use(async (ctx, next) => {
  const start = performance.now();
  await next();
  const duration = performance.now() - start;

  if (duration > 500) {
    logger.warn({
      path: ctx.request.path,
      method: ctx.request.method,
      duration: Math.round(duration),
    }, `Slow request: ${Math.round(duration)}ms`);
  }
});
```

### Client-Side Profiling

Use the vitals reporter to track real-user performance:

```js
import { createVitalsReporter } from '@basenative/runtime';

createVitalsReporter({
  onReport(metric) {
    if (metric.rating === 'poor') {
      console.warn(`Poor ${metric.name}: ${metric.value}`);
    }
    navigator.sendBeacon('/api/vitals', JSON.stringify(metric));
  },
}).start();
```

### Identifying Hydration Bottlenecks

Profile hydration time by wrapping the call:

```js
const start = performance.now();
const dispose = hydrate(root, context);
const duration = performance.now() - start;
console.log(`Hydration took ${duration.toFixed(1)}ms`);
```

If hydration takes more than 50ms, consider lazy hydration strategies
(see [performance guide](performance.md)).

---

## Getting Help

- Check the [Architecture Guide](architecture.md) for system overview
- Review the [Security Guide](security.md) for auth and session issues
- See the [Performance Guide](performance.md) for optimization strategies
- See the [Scaling Guide](scaling.md) for production deployment issues
- See the [Multi-Tenancy Guide](multi-tenancy.md) for tenant resolution issues
