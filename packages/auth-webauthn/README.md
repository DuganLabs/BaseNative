# @basenative/auth-webauthn

> WebAuthn (passkey) adapter for `@basenative/auth`. Drop-in passkey login for Cloudflare Workers / Pages, with pluggable storage and a tiny browser client.

Part of the [BaseNative](https://basenative.dev) ecosystem. Lifted from the production-tested passkey implementation in [t4bs](https://github.com/DuganLabs/t4bs).

## Why

Modern passkey auth is a small amount of code with a lot of papercuts. This package handles the papercuts (challenge TTL, cookie flags, base64url encoding, WebAuthn version drift, role seeding) so your app code stays small.

## Install

```bash
pnpm add @basenative/auth-webauthn @basenative/auth @simplewebauthn/server
# Browser-side (only on the client):
pnpm add @simplewebauthn/browser
```

`@simplewebauthn/server` is loaded lazily — peers aren't pulled into your worker bundle until first use.

## Quick start (Cloudflare Pages Functions + D1)

### 1. Bindings (`wrangler.toml`)

```toml
[[d1_databases]]
binding = "DB"
database_name = "myapp-db"
database_id = "..."

[vars]
RP_NAME   = "MyApp"
RP_ID     = "myapp.com"          # use "localhost" in dev
RP_ORIGIN = "https://myapp.com"  # use "http://localhost:8788" in dev
ADMIN_HANDLES = "warren,bob"     # optional — see "Role seeding"
```

### 2. Apply the schema

```bash
wrangler d1 execute DB --local  --file=./node_modules/@basenative/auth-webauthn/migrations/0001_webauthn_schema.sql
wrangler d1 execute DB --remote --file=./node_modules/@basenative/auth-webauthn/migrations/0001_webauthn_schema.sql
```

Or copy the SQL into your own `migrations/` directory.

### 3. Wire the six handlers

Create one file per route under `functions/api/auth/`. They're all the same shape:

```js
// functions/api/auth/_adapter.js
import {
  webauthnAdapter,
  d1WebAuthnStores,
} from '@basenative/auth-webauthn';

export const getAdapter = (env) =>
  webauthnAdapter({
    rp: { rpName: env.RP_NAME, rpID: env.RP_ID, origin: env.RP_ORIGIN },
    stores: d1WebAuthnStores(env.DB),
  });
```

```js
// functions/api/auth/register-options.js
import { registerOptionsHandler } from '@basenative/auth-webauthn/handlers';
import { getAdapter } from './_adapter.js';
export const onRequestPost = registerOptionsHandler(getAdapter);
```

```js
// functions/api/auth/register-verify.js
import { registerVerifyHandler } from '@basenative/auth-webauthn/handlers';
import { getAdapter } from './_adapter.js';
export const onRequestPost = registerVerifyHandler(getAdapter);
```

```js
// functions/api/auth/login-options.js
import { loginOptionsHandler } from '@basenative/auth-webauthn/handlers';
import { getAdapter } from './_adapter.js';
export const onRequestPost = loginOptionsHandler(getAdapter);
```

```js
// functions/api/auth/login-verify.js
import { loginVerifyHandler } from '@basenative/auth-webauthn/handlers';
import { seedRoles, parseHandleList, d1WebAuthnStores } from '@basenative/auth-webauthn';
import { getAdapter } from './_adapter.js';

export const onRequestPost = loginVerifyHandler(getAdapter, {
  onLogin: async ({ env, user }) => {
    if (!user) return;
    const stores = d1WebAuthnStores(env.DB);
    await seedRoles({
      stores,
      user,
      seedMap: parseHandleList(env.ADMIN_HANDLES, 'admin'),
      changedBy: 'seed:ADMIN_HANDLES',
    });
  },
});
```

```js
// functions/api/auth/me.js
import { meHandler } from '@basenative/auth-webauthn/handlers';
import { getAdapter } from './_adapter.js';
export const onRequestGet = meHandler(getAdapter);
```

```js
// functions/api/auth/logout.js
import { logoutHandler } from '@basenative/auth-webauthn/handlers';
import { getAdapter } from './_adapter.js';
export const onRequestPost = logoutHandler(getAdapter);
```

That's the entire server side.

## Client-side usage

```js
import {
  isPasskeySupported,
  registerPasskey,
  loginPasskey,
  me,
  logout,
} from '@basenative/auth-webauthn/client';

if (isPasskeySupported()) {
  await registerPasskey('alice');   // → /me payload
  await loginPasskey('alice');      // or loginPasskey('') for usernameless
  const { user } = await me();
  await logout();
}
```

Custom endpoint paths:

```js
await registerPasskey('alice', {
  paths: {
    registerOptions: '/auth/passkey/register/start',
    registerVerify:  '/auth/passkey/register/finish',
    me:              '/auth/whoami',
  },
});
```

## Role seeding

If your app has admins/moderators, list them in an env var (or anywhere). On login, upgrade matching handles automatically:

```js
import { seedRoles, parseHandleList } from '@basenative/auth-webauthn';

await seedRoles({
  stores,
  user,
  seedMap: parseHandleList(env.ADMIN_HANDLES, 'admin'),
  changedBy: 'seed:ADMIN_HANDLES',
});
```

This is a no-op when the user is already at or above the target role — admins won't be downgraded. Use the `seedMap` directly for arbitrary mappings (`{ alice: 'admin', mod-bob: 'moderator' }`).

## Storage interface (the contract)

`webauthnAdapter` takes any `stores` object with these four members:

```ts
interface WebAuthnStores {
  users: {
    getByHandle(handle): Promise<User | null>;
    getById(id):         Promise<User | null>;
    create({ id, handle }): Promise<User>;          // returns { id, handle, role: 'user' }
    setRole?(id, role, changedBy): Promise<void>;   // optional, used by seedRoles
  };

  credentials: {
    listByUser(userId):  Promise<Credential[]>;
    getById(credId):     Promise<Credential & { userId } | null>;
    create({ id, userId, publicKey, counter, transports }): Promise<void>;
    updateCounter(id, counter): Promise<void>;
  };

  challenges: {
    create({ challenge, userId, purpose, ttlSeconds }): Promise<void>;
    consume(challenge, purpose): Promise<{ userId } | null>; // single-use; deletes on read
  };

  userSessions: {
    create({ id, userId, ttlSeconds }): Promise<void>;
    getUser(token):       Promise<User | null>;     // returns null if expired
    destroy(token):       Promise<void>;
  };
}
```

`d1WebAuthnStores(DB)` is the reference implementation; write your own to back this with Postgres, MySQL, Redis, or Durable Objects. The `migration` constant exported from `@basenative/auth-webauthn/d1-stores` contains the same SQL as the migrations file, in case you want to apply it programmatically.

## Configuration

```js
webauthnAdapter({
  rp: {
    rpName: 'MyApp',
    rpID:   'myapp.com',
    origin: 'https://myapp.com',
  },
  stores,
  ttl: {
    sessionSeconds:   30 * 24 * 3600, // default
    challengeSeconds: 300,            // default; clamped to ≤ 300
  },
  cookieName:    'bn_auth',           // default
  secureCookie:  true,                // default; set false for localhost http://
});
```

The session cookie is always `HttpOnly; SameSite=Lax`. `Secure` is on by default.

## Migrating an existing project

### From `express-session` / cookie-session (PendingBusiness)

If your current auth looks like:

```js
// before
app.use(session({ secret, store: new RedisStore({ ... }) }));
app.post('/login', async (req, res) => {
  if (await checkPassword(req.body.email, req.body.password)) {
    req.session.user = await db.users.findByEmail(req.body.email);
    res.redirect('/');
  } else {
    res.status(401).send('bad-creds');
  }
});
app.get('/me', (req, res) => res.json({ user: req.session.user || null }));
```

The mapping is:

| Express-session                         | `@basenative/auth-webauthn`                       |
| --------------------------------------- | ------------------------------------------------- |
| `req.session.user` (loaded by middleware) | `await adapter.currentUser(request)`             |
| `req.session.user = ...` (login)         | `verifyAuthentication` returns a session token   |
| `req.session.destroy()` (logout)         | `adapter.destroySession(token)`                  |
| `RedisStore` / `MemoryStore`             | swap `stores.userSessions` for a Redis-backed one|
| `secret` (signed cookies)                | not needed — session token is opaque + random    |

Step-by-step migration:

1. **Add the schema.** Run `migrations/0001_webauthn_schema.sql` against your DB. If you already have a `users` table, replace the `CREATE TABLE users` line with `ALTER TABLE` statements that add `role`, `role_changed_at`, `role_changed_by`. Keep your existing `email`, `password_hash`, etc. — passkey-only doesn't require dropping them.
2. **Pick a handle field.** PendingBusiness probably authenticates by email; the adapter validates handles against `^[a-z0-9_-]{2,24}$`. Either expose a separate `handle` field or override `validHandle` by writing a tiny custom store layer that hashes/normalizes emails. (Most apps add a one-time "pick a username" step at first login; users like it more than emails as login IDs.)
3. **Run both auths in parallel.** Mount the new `/api/auth/*` endpoints alongside the existing `/login` route. Add a "Set up passkey" button on the account-settings page that calls `registerPasskey(currentUser.handle)`. Existing password-based logins keep working.
4. **Migrate session reads.** Where you have `req.session.user`, switch to `await adapter.currentUser(req)`. If you're on Express, write a thin middleware:
   ```js
   app.use(async (req, _res, next) => {
     req.user = await adapter.currentUser(req);
     next();
   });
   ```
   The adapter is runtime-agnostic — it just needs a `Request`-shaped object with `.headers.get('cookie')`. Wrap Express's `req.headers` if needed.
5. **Cut over.** Once every active user has at least one passkey, retire the password endpoints. The DB rows can stay — `password_hash` simply becomes unused.

### From NextAuth / Auth.js

Those libraries already speak provider plugins; this package fits the same model. Implement an adapter call inside a custom NextAuth provider's `authorize` callback that wraps `verifyAuthentication`. The cookie name in `webauthnAdapter` should match your NextAuth cookie if you want session reuse, otherwise use distinct names and call both `currentUser` and `getSession` until you cut over.

## Security notes

- Challenge rows are single-use and deleted on `consume()`, regardless of expiry.
- Challenge TTL is clamped to ≤ 5 minutes server-side. Don't try to override it higher; consumer code that passes a larger value gets silently clamped.
- Cookies are `HttpOnly; Secure; SameSite=Lax`. Disable `Secure` only for local-HTTP development.
- Errors come back as `{ error: 'reason' }` with a numeric status. The reason strings are stable and safe to log; no PII or PII-derivable values are included.
- `seedRoles` only ever upgrades. It will never remove `admin` from a user, even if they're missing from the seed list — handle role removal manually.

## Testing

```bash
pnpm --filter @basenative/auth-webauthn test
```

The unit tests inject a fake WebAuthn primitives object (`opts.lib`) so the suite runs without the `@simplewebauthn/server` peer dep installed. Production code never passes `opts.lib`; it's an internal hook.

## License

Apache-2.0
