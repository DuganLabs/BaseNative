# @basenative/auth

> Session management, password hashing, RBAC, and OAuth — no external dependencies

Part of the [BaseNative](https://github.com/DuganLabs/basenative) ecosystem — a signal-based web runtime over native HTML.

## Install

```bash
npm install @basenative/auth
```

## Quick Start

```js
import {
  createSessionManager,
  hashPassword,
  verifyPassword,
  defineRoles,
  createGuard,
  sessionMiddleware,
  requireAuth,
} from '@basenative/auth';

// Password hashing (uses node:crypto — no bcrypt dependency)
const hash = await hashPassword('secret123');
const ok = await verifyPassword('secret123', hash); // true

// Session management
const sessions = createSessionManager({ maxAge: 24 * 60 * 60 * 1000 });
const session = await sessions.create({ userId: 42, role: 'admin' });

// RBAC
const roles = defineRoles({
  admin: { permissions: ['read', 'write', 'delete'] },
  editor: { permissions: ['read', 'write'] },
  viewer: { permissions: ['read'] },
});
const guard = createGuard(roles);
guard.can('editor', 'write'); // true
guard.can('viewer', 'write'); // false
```

## API

### Sessions

- `createSessionManager(options?)` — Creates a session manager with pluggable storage. Options: `store`, `cookieName`, `maxAge`, `secure`, `sameSite`, `httpOnly`.
  - `.create(data)` — Creates a new session and returns it.
  - `.get(id)` — Retrieves a session by ID (returns `null` if expired).
  - `.update(id, data)` — Merges data into an existing session.
  - `.destroy(id)` — Deletes a session.
- `createMemoryStore()` — In-memory session store (development / single-process).
- `createDbStore(db)` — Database-backed session store using a `@basenative/db` adapter.

### Password

- `hashPassword(password)` — Hashes a password using PBKDF2 via `node:crypto`. Returns a `Promise<string>`.
- `verifyPassword(password, hash)` — Verifies a password against a stored hash. Returns a `Promise<boolean>`.

### RBAC

- `defineRoles(config)` — Defines a role hierarchy with permissions arrays.
- `createGuard(roles)` — Creates a guard object with `.can(role, permission)` checks.

### Middleware

- `sessionMiddleware(manager)` — Loads the session from the request cookie and attaches it to `ctx.state.session`.
- `requireAuth(options?)` — Rejects unauthenticated requests with a 401 response.
- `login(manager, sessionData, ctx)` — Creates a session and sets the session cookie on the response.
- `logout(manager, ctx)` — Destroys the current session and clears the cookie.

### OAuth Providers

- `credentialsProvider(options)` — Username/password authentication strategy.
- `oauthProvider(providerName, options)` — OAuth 2.0 flow for a named provider.
- `providers` — Pre-configured OAuth settings for common providers (GitHub, Google, etc.).

## License

MIT
