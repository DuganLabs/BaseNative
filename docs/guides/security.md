# BaseNative Security Guide

## CSP-Safe by Design

BaseNative generates no inline scripts or `eval()` calls. The runtime hydrates
existing DOM elements using comment markers and attribute bindings. This means
your Content Security Policy can be strict:

```
Content-Security-Policy:
  default-src 'self';
  script-src 'self';
  style-src 'self';
  img-src 'self' data:;
  connect-src 'self';
```

No `'unsafe-inline'` or `'unsafe-eval'` is required. Template expressions
(`{{ }}`) are evaluated at render time on the server, not at runtime via eval.

---

## CSRF Protection

BaseNative uses a double-submit cookie pattern. The CSRF middleware generates a
token, stores it in a cookie, and validates it against a request header on
mutating methods (POST, PUT, PATCH, DELETE).

```js
import { createPipeline } from '@basenative/middleware';
import { csrf } from '@basenative/middleware/builtins/csrf';

const pipeline = createPipeline();
pipeline.use(csrf({
  cookieName: '_csrf',
  headerName: 'x-csrf-token',
  // Token is also available via ctx.state.csrfToken for injection into forms
}));
```

Inject the token into server-rendered forms:

```html
<form method="POST" action="/api/users">
  <input type="hidden" name="_csrf" value="{{ csrfToken }}" />
  <!-- form fields -->
</form>
```

For AJAX requests, read the cookie and send it as a header:

```js
const token = document.cookie.match(/(?:^|;\s*)_csrf=([^;]*)/)?.[1];
fetch('/api/users', {
  method: 'POST',
  headers: { 'x-csrf-token': token, 'Content-Type': 'application/json' },
  body: JSON.stringify(data),
});
```

---

## Rate Limiting

Protect endpoints from abuse with the built-in rate limiter. It tracks
requests by client IP using an in-memory sliding window:

```js
import { rateLimit } from '@basenative/middleware/builtins/rate-limit';

// Global rate limit
pipeline.use(rateLimit({ windowMs: 60_000, max: 100 }));

// Strict limit on authentication routes
const authLimiter = rateLimit({ windowMs: 15 * 60_000, max: 5 });
pipeline.use(async (ctx, next) => {
  if (ctx.request.path === '/login') {
    return authLimiter(ctx, next);
  }
  await next();
});
```

When the limit is exceeded, the middleware returns HTTP 429 with a
`Retry-After` header.

For distributed deployments, see the [scaling guide](scaling.md) on using
external stores for rate-limit state.

---

## Session Security

Sessions are managed by `@basenative/auth` with secure defaults:

```js
import { createSessionManager, createDbStore } from '@basenative/auth';
import { sessionMiddleware } from '@basenative/auth';

const sessions = createSessionManager({
  store: createDbStore(dbAdapter),  // persistent storage
  cookieName: 'bn_session',
  maxAge: 24 * 60 * 60 * 1000,     // 24 hours
  httpOnly: true,                    // not accessible via document.cookie
  secure: true,                      // HTTPS only in production
  sameSite: 'lax',                   // prevents cross-origin sending
});

pipeline.use(sessionMiddleware(sessions));
```

### Session Best Practices

- **Use database-backed sessions in production.** The in-memory store
  (`createMemoryStore`) does not survive restarts and does not share state
  across processes.
- **Set `maxAge` to the minimum acceptable value.** 24 hours is a common
  default; sensitive applications should use shorter sessions.
- **Call `sessions.touch(id)` on active requests** to implement sliding
  expiration windows.
- **Rotate session IDs after authentication.** Destroy the old session and
  create a new one after login to prevent session fixation.

```js
import { login, logout } from '@basenative/auth';

// After verifying credentials:
if (ctx.state.session) {
  await sessions.destroy(ctx.state.session.id);  // rotate
}
const session = await login(sessions, ctx, user);
```

---

## Password Hashing

`@basenative/auth` uses Node.js built-in scrypt for password hashing with
timing-safe comparison to prevent timing attacks:

```js
import { hashPassword, verifyPassword } from '@basenative/auth';

// Registration
const hashed = await hashPassword(userPassword);
// Stores: "scrypt:<hex-salt>:<hex-hash>"
await db.insert('users', { email, password: hashed });

// Login
const user = await db.queryOne('SELECT * FROM users WHERE email = ?', [email]);
const valid = await verifyPassword(inputPassword, user.password);
if (!valid) {
  ctx.response.status = 401;
  ctx.response.body = 'Invalid credentials';
  return;
}
```

Default parameters: salt length 32 bytes, key length 64 bytes, cost N=16384,
block size r=8, parallelism p=1. These provide strong protection against
brute-force attacks.

---

## Input Validation

Use `@basenative/forms` for both client and server-side validation:

```js
import { createField, createForm, required, email, minLength, pattern } from '@basenative/forms';

const registrationForm = createForm({
  email: createField('', { validators: [required(), email()] }),
  password: createField('', { validators: [required(), minLength(12)] }),
  username: createField('', {
    validators: [
      required(),
      pattern(/^[a-zA-Z0-9_]+$/, 'Alphanumeric characters and underscores only'),
    ],
  }),
});
```

On the server, validate incoming request bodies before processing:

```js
pipeline.use(async (ctx, next) => {
  if (ctx.request.method === 'POST' && ctx.request.path === '/register') {
    const form = createForm({ /* same schema as above */ });
    form.setValues(ctx.request.body);
    const result = form.validate();
    if (!result.valid) {
      ctx.response.status = 400;
      ctx.response.body = { errors: result.errors };
      return;
    }
  }
  await next();
});
```

---

## CORS Configuration

Configure CORS to restrict which origins can access your API:

```js
import { cors } from '@basenative/middleware/builtins/cors';

pipeline.use(cors({
  origin: ['https://app.example.com', 'https://admin.example.com'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'x-csrf-token', 'Authorization'],
  credentials: true,
  maxAge: 86400,  // preflight cache for 24 hours
}));
```

For multi-tenant applications, dynamically resolve allowed origins:

```js
pipeline.use(cors({
  origin: (requestOrigin, ctx) => {
    const tenant = ctx.state.tenant;
    const allowed = getAllowedOrigins(tenant);
    return allowed.includes(requestOrigin) ? requestOrigin : false;
  },
  credentials: true,
}));
```

---

## Role-Based Access Control

Use `@basenative/auth` RBAC for permission enforcement:

```js
import { defineRoles, createGuard } from '@basenative/auth';

const rbac = defineRoles({
  admin: { permissions: ['*'] },
  editor: { permissions: ['read', 'write', 'publish'], inherits: ['viewer'] },
  viewer: { permissions: ['read'] },
});

const guard = createGuard(rbac);

// Protect specific routes
pipeline.use(async (ctx, next) => {
  if (ctx.request.path.startsWith('/admin')) {
    return guard.requireRole('admin')(ctx, next);
  }
  if (ctx.request.path.startsWith('/api/articles') && ctx.request.method === 'DELETE') {
    return guard.require('publish')(ctx, next);
  }
  await next();
});
```

---

## OWASP Top 10 Coverage

| OWASP Category                  | BaseNative Mitigation                              |
|---------------------------------|----------------------------------------------------|
| A01: Broken Access Control      | RBAC via `createGuard`, `requireAuth` middleware    |
| A02: Cryptographic Failures     | scrypt hashing, timing-safe comparison             |
| A03: Injection                  | Parameterized queries in `@basenative/db`          |
| A04: Insecure Design            | Validated config schemas, secure session defaults  |
| A05: Security Misconfiguration  | CSP-safe output, no eval, strict CORS              |
| A06: Vulnerable Components      | Minimal dependencies, no runtime transpilation     |
| A07: Auth Failures              | Session rotation, rate-limited login               |
| A08: Data Integrity Failures    | CSRF double-submit cookies, form validation        |
| A09: Logging Failures           | Structured JSON logging via `@basenative/logger`   |
| A10: SSRF                       | No server-side URL fetching by default             |
