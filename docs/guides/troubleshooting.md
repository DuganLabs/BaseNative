# Troubleshooting Guide

Common issues and solutions for BaseNative applications.

## Hydration Mismatches

**Symptom:** Console warnings about hydration mismatches; UI flickers on page load.

**Cause:** Server-rendered HTML differs from what the client expects.

**Solutions:**

1. Ensure server and client use the same data:
```js
// Server: pass the same context to both render and hydrate
const context = { user, items };
const html = render(template, context);
// Embed context for client hydration
const script = `<script type="application/json" id="ctx">${JSON.stringify(context)}</script>`;
```

2. Enable mismatch reporting:
```js
import { hydrate } from '@basenative/runtime';

hydrate(root, context, {
  onMismatch: (message, detail) => {
    console.warn('Hydration mismatch:', message, detail);
  },
  recover: 'client', // Fall back to client rendering
});
```

3. Avoid non-deterministic rendering (dates, random IDs) in initial render.

## Signal Dependency Tracking

**Symptom:** Effects don't re-run when signals change.

**Cause:** Signal was read outside the effect tracking scope.

```js
// Wrong: signal read happens outside effect
const value = count();
effect(() => {
  element.textContent = value; // Captured by closure, not tracked
});

// Correct: signal read inside effect
effect(() => {
  element.textContent = count(); // Automatically tracked
});
```

**Symptom:** Infinite effect loop.

**Cause:** Effect writes to a signal it reads from.

```js
// Wrong: creates infinite loop
effect(() => {
  count.set(count() + 1);
});

// Correct: use peek() to read without subscribing
effect(() => {
  if (someCondition()) {
    count.set(count.peek() + 1);
  }
});
```

## Middleware Ordering

**Symptom:** CSRF validation fails; auth middleware can't find session.

**Cause:** Middleware is in the wrong order.

**Correct order:**
```js
const pipeline = createPipeline();
pipeline.use(logger());          // 1. Logging (first, to capture all requests)
pipeline.use(cors());            // 2. CORS (before any response)
pipeline.use(rateLimit());       // 3. Rate limiting (before processing)
pipeline.use(sessionMiddleware()); // 4. Session (before auth)
pipeline.use(csrf());            // 5. CSRF (after session, before handlers)
pipeline.use(requireAuth());     // 6. Auth (after session)
pipeline.use(tenantMiddleware()); // 7. Tenant (after auth)
```

## Database Connection Issues

**Symptom:** `SQLITE_BUSY` errors.

**Solution:** Enable WAL mode:
```js
const db = createSqliteAdapter({
  filename: './data/app.db',
  wal: true,
});
```

**Symptom:** PostgreSQL `too many connections`.

**Solution:** Configure pool limits:
```js
const db = createPostgresAdapter({
  connectionString: process.env.DATABASE_URL,
  max: 10, // Reduce from default
});
```

## Auth Session Problems

**Symptom:** User gets logged out unexpectedly.

**Causes and fixes:**

1. **In-memory session store resets on restart** — use database-backed store:
```js
import { createDbStore } from '@basenative/auth';
const store = createDbStore(dbAdapter, { tableName: 'sessions' });
```

2. **Cookie not sent cross-origin** — check sameSite and secure settings:
```js
sessionMiddleware({
  cookie: {
    sameSite: 'lax',    // or 'none' for cross-origin (requires secure)
    secure: true,        // Required for sameSite: 'none'
    httpOnly: true,
  },
});
```

3. **Session expired** — increase maxAge:
```js
sessionMiddleware({
  cookie: { maxAge: 7 * 24 * 60 * 60 * 1000 }, // 7 days
});
```

## Feature Flags Not Updating

**Symptom:** Remote flag changes don't take effect.

**Solution:** Check polling configuration:
```js
import { createRemoteProvider } from '@basenative/flags';

const provider = createRemoteProvider({
  url: 'https://flags.example.com/api/flags',
  pollInterval: 30_000, // 30 seconds (default is 60s)
  timeout: 5000,
});

// Force immediate refresh
await provider.refresh();

// Start background polling
provider.startPolling();
```

## I18n Missing Translations

**Symptom:** Translation keys shown instead of translated text.

**Solution:** Check locale and message loading:
```js
import { createI18n } from '@basenative/i18n';

const i18n = createI18n({ defaultLocale: 'en' });
i18n.addMessages('en', { greeting: 'Hello, {{ name }}!' });

// Verify the key exists
console.log(i18n.t('greeting', { name: 'World' }));
// If it prints "greeting" instead of "Hello, World!", messages weren't loaded
```

## File Upload Failures

**Symptom:** Upload returns 413 or file is rejected.

**Check:**
```js
import { createUploadHandler } from '@basenative/upload';

const upload = createUploadHandler({
  maxFileSize: 10 * 1024 * 1024, // 10MB
  allowedTypes: ['image/jpeg', 'image/png', 'application/pdf'],
});
```

Also check reverse proxy limits (nginx: `client_max_body_size`, etc.).

## Performance Profiling

Use the built-in logger for timing:
```js
import { createLogger } from '@basenative/logger';

const logger = createLogger({ level: 'debug' });

pipeline.use(async (ctx, next) => {
  const start = performance.now();
  await next();
  const duration = performance.now() - start;
  if (duration > 1000) {
    logger.warn('Slow request', {
      path: ctx.request.path,
      duration: `${duration.toFixed(0)}ms`,
    });
  }
});
```

## Getting Help

- Check the [Architecture Guide](./architecture.md) for system overview
- Review [Security Guide](./security.md) for auth/session issues
- See [Performance Guide](./performance.md) for optimization
- Report issues at https://github.com/basenative/basenative/issues
