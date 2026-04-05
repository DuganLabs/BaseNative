# @basenative/auth

> Session management, password hashing, RBAC, and OAuth for BaseNative applications.

## Overview

`@basenative/auth` provides a complete authentication and authorization layer with zero external dependencies in the core. It includes session management with pluggable stores, bcrypt-compatible password hashing using `node:crypto`, a role-based access control (RBAC) engine with inheritance, and provider adapters for credentials and OAuth flows.

## Installation

```bash
npm install @basenative/auth
```

## Quick Start

```js
import {
  createSessionManager,
  createMemoryStore,
  hashPassword,
  verifyPassword,
  defineRoles,
  createGuard,
  sessionMiddleware,
  requireAuth,
  login,
  logout,
} from '@basenative/auth';

const sessions = createSessionManager({ store: createMemoryStore() });

const rbac = defineRoles({
  admin: { permissions: ['*'] },
  editor: { permissions: ['write'], inherits: ['viewer'] },
  viewer: { permissions: ['read'] },
});

const guard = createGuard(rbac);

// In a route handler
const hashed = await hashPassword('secret');
const ok = await verifyPassword('secret', hashed); // true

await login(sessions, ctx, { id: 1, role: 'editor' });
```

## API Reference

### createSessionManager(options)

Creates a session manager with configurable storage and cookie settings.

**Parameters:**
- `options.store` — storage backend; defaults to `createMemoryStore()`
- `options.cookieName` — cookie name; default `'bn_session'`
- `options.maxAge` — session TTL in ms; default `86400000` (24 hours)
- `options.secure` — set Secure flag; default `true` in production
- `options.sameSite` — SameSite policy; default `'lax'`
- `options.httpOnly` — HttpOnly flag; default `true`

**Returns:** Session manager object with methods: `create`, `get`, `update`, `destroy`, `touch`, `cookieOptions`.

**Example:**
```js
const sessions = createSessionManager({
  store: createDbStore(adapter),
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
});

const session = await sessions.create({ user: { id: 42, role: 'admin' } });
const loaded = await sessions.get(session.id);
await sessions.destroy(session.id);
```

---

### createMemoryStore()

In-memory session store. Suitable for development and testing.

**Returns:** Store object with `get`, `set`, `delete`, `clear`, `size`.

---

### createDbStore(adapter, options)

Database-backed session store. Requires a table with `id`, `data`, and `expires_at` columns.

**Parameters:**
- `adapter` — database adapter with `queryOne` and `execute` methods
- `options.tableName` — table name; default `'sessions'`

**Returns:** Store object compatible with `createSessionManager`.

---

### hashPassword(password)

Hashes a password using `node:crypto` (PBKDF2 with SHA-512). No external dependencies.

**Parameters:**
- `password` — plain text password string

**Returns:** `Promise<string>` — encoded hash string

---

### verifyPassword(password, hash)

Verifies a plain text password against a stored hash.

**Parameters:**
- `password` — plain text password to verify
- `hash` — hash produced by `hashPassword`

**Returns:** `Promise<boolean>`

---

### defineRoles(definition)

Defines roles and their permissions, with optional inheritance.

**Parameters:**
- `definition` — object mapping role names to `{ permissions: string[], inherits?: string[] }`

**Returns:** RBAC engine with methods: `can`, `canAll`, `canAny`, `getPermissions`, `getRoles`, `hasRole`.

**Example:**
```js
const rbac = defineRoles({
  admin: { permissions: ['*'] },
  editor: { permissions: ['write'], inherits: ['viewer'] },
  viewer: { permissions: ['read'] },
});

rbac.can('editor', 'read');   // true (inherited)
rbac.can('viewer', 'write');  // false
rbac.getPermissions('editor'); // ['write', 'read']
```

---

### createGuard(rbac, options)

Creates route guard middleware factories from an RBAC engine.

**Parameters:**
- `rbac` — RBAC engine from `defineRoles`
- `options.getRoleFromContext` — function `(ctx) => string`; default reads `ctx.state.user.role`
- `options.onDenied` — function `(ctx) => void`; default returns 403

**Returns:** Guard object with methods:
- `guard.require(permission)` — middleware requiring a single permission
- `guard.requireAny(...permissions)` — middleware requiring any of the given permissions
- `guard.requireRole(...roleNames)` — middleware requiring a specific role

**Example:**
```js
const guard = createGuard(rbac);

app.get('/admin', guard.requireRole('admin'), handler);
app.post('/posts', guard.require('write'), handler);
```

---

### sessionMiddleware(sessionManager)

Loads session from the request cookie and attaches it to `ctx.state`.

After this middleware runs:
- `ctx.state.session` — session object or `null`
- `ctx.state.user` — `session.data.user` or `null`
- `ctx.state.isAuthenticated` — boolean

---

### requireAuth(options)

Middleware that rejects unauthenticated requests.

**Parameters:**
- `options.redirectTo` — redirect URL; if omitted returns 401
- `options.message` — body text for 401 responses; default `'Authentication required'`

---

### login(sessionManager, ctx, user)

Creates a session for the given user and attaches it to context.

**Parameters:**
- `sessionManager` — session manager instance
- `ctx` — request context
- `user` — user object to store in session data

**Returns:** `Promise<Session>`

---

### logout(sessionManager, ctx)

Destroys the current session and clears the session cookie.

---

### credentialsProvider(options)

Email/password authentication provider.

**Parameters:**
- `options.findUser(email)` — async function returning a user object with `passwordHash`
- `options.onSuccess(user, ctx)` — called on successful login
- `options.onFailure(ctx)` — called on failed login

---

### oauthProvider(providerName, options)

OAuth 2.0 provider adapter. Built-in provider configs available via `providers`.

**Parameters:**
- `providerName` — key from the `providers` map (e.g. `'github'`, `'google'`)
- `options.clientId` — OAuth app client ID
- `options.clientSecret` — OAuth app client secret
- `options.redirectUri` — callback URL

## Integration

Use `sessionMiddleware` from this package with `createPipeline` from `@basenative/middleware`. Combine `createGuard` with `@basenative/router` for per-route authorization.

```js
import { createPipeline } from '@basenative/middleware';
import { sessionMiddleware, requireAuth } from '@basenative/auth';

const pipeline = createPipeline();
pipeline.use(sessionMiddleware(sessions));
pipeline.use(requireAuth({ redirectTo: '/login' }));
```
