# @basenative/auth-webauthn

> WebAuthn (passkey) adapter for @basenative/auth — server, client, and Cloudflare Workers/Pages handlers.

## Overview

`@basenative/auth-webauthn` implements the two WebAuthn ceremonies — registration (creating a passkey) and authentication (asserting one) — on top of `@simplewebauthn/server` (peer dependency, resolved lazily via dynamic `import()`) and `@simplewebauthn/browser` on the client. The server side (`webauthnAdapter`) returns a provider object shaped like `@basenative/auth`'s own providers (a `type` field plus lifecycle methods, the same convention used by `credentialsProvider`/`oauthProvider` — see `docs/api/auth.md`), but it is self-contained: there is no source-level import of `@basenative/auth`, and session/cookie handling (`createSession`, `currentUser`, the `cookie` helpers) is implemented independently rather than through `@basenative/auth`'s `createSessionManager`/`sessionMiddleware`. `@basenative/auth` is listed as a peer dependency for conceptual/version alignment when both packages are used together in one app.

The core adapter, client helpers, and handler factories use only WebCrypto/`atob`/`btoa` (no Node `crypto`, no `Buffer`), so they run on Cloudflare Workers, Cloudflare Pages Functions, and Node 18+ alike. The `./d1-stores` subpath is the one Workers-specific piece: it's a reference storage implementation built directly on a Cloudflare `D1Database` binding. Storage itself is pluggable — `webauthnAdapter` accepts any `stores` object satisfying the four-store contract (`users`, `credentials`, `challenges`, `userSessions`), so non-Workers deployments can supply their own backing store.

## Installation

```bash
npm install @basenative/auth-webauthn @basenative/auth @simplewebauthn/server
# Browser-side only:
npm install @simplewebauthn/browser
```

## Quick Start

```js
// functions/api/auth/_adapter.js — build once per request from bindings
import { webauthnAdapter, d1WebAuthnStores } from '@basenative/auth-webauthn';

export const getAdapter = (env) =>
  webauthnAdapter({
    rp: { rpName: env.RP_NAME, rpID: env.RP_ID, origin: env.RP_ORIGIN },
    stores: d1WebAuthnStores(env.DB),
  });

// functions/api/auth/register-options.js
import { registerOptionsHandler } from '@basenative/auth-webauthn/handlers';
import { getAdapter } from './_adapter.js';
export const onRequestPost = registerOptionsHandler(getAdapter);

// functions/api/auth/register-verify.js
import { registerVerifyHandler } from '@basenative/auth-webauthn/handlers';
import { getAdapter } from './_adapter.js';
export const onRequestPost = registerVerifyHandler(getAdapter);

// client
import { isPasskeySupported, registerPasskey, loginPasskey, me } from '@basenative/auth-webauthn/client';

if (isPasskeySupported()) {
  await registerPasskey('alice');           // → { user } payload, session cookie set
  const { user } = await loginPasskey('alice'); // or loginPasskey('') for usernameless
}
```

## API Reference

## Server (./server)

Also importable from the package root (`.`) — both spellings resolve to the same file.

### normHandle(h)

Normalizes a handle: coerces to string, trims whitespace, lowercases. Used internally before every handle lookup/validation so callers don't have to pre-normalize.

**Returns:** `string`

---

### validHandle(h)

Tests a (already-normalized) handle against `/^[a-z0-9_-]{2,24}$/`.

**Returns:** `boolean`

---

### b64uToBytes(s)

Decodes a base64url string into a `Uint8Array`, using `atob` (pads and swaps `-`/`_` back to standard base64 first). Used to turn a stored base64url public key back into raw bytes before handing it to `@simplewebauthn/server`.

**Returns:** `Uint8Array`

---

### bytesToB64u(bytes)

Encodes a byte array (or any iterable of byte values) to a base64url string via `btoa`, stripping padding. The inverse of `b64uToBytes`.

**Returns:** `string`

---

### userIdBytes(uuid)

Packs a UUID string (with dashes) into 16 raw bytes, for use as the WebAuthn `userID` handed to `generateRegistrationOptions`.

**Returns:** `Uint8Array` (16 bytes)

---

### getCookie(request, name)

Reads a single cookie value from a `Request`'s `Cookie` header via regex match; returns the URI-decoded value or `null` if absent. Same helper is duplicated privately inside `handlers.js` for `logoutHandler`.

**Returns:** `string | null`

---

### setCookieHeader(name, value, opts = {})

Builds a `Set-Cookie` header value. Always includes `Path=/`, `HttpOnly`, and `SameSite=Lax`.

**Parameters:**
- `opts.secure` — omit `Secure` only when explicitly `false`; otherwise `Secure` is always added (default-on)
- `opts.maxAgeSeconds` — adds `Max-Age` when provided

**Returns:** `string`

---

### clearCookieHeader(name)

Builds a `Set-Cookie` header value that expires the named cookie immediately (`Max-Age=0`), with the same `HttpOnly; SameSite=Lax; Secure` flags.

**Returns:** `string`

---

### webauthnAdapter(opts)

Builds the WebAuthn provider/adapter. This is the main entry point of the package.

**Parameters:**
- `opts.rp.rpName` — relying-party display name; defaults to `rp.rpID` if omitted
- `opts.rp.rpID` — relying-party domain (e.g. `'acme.com'` or `'localhost'`) — **required**
- `opts.rp.origin` — full expected origin (e.g. `'https://acme.com'`) — **required**
- `opts.stores` — the four-store object (see `d1WebAuthnStores` below, or supply your own) — **required**; validated eagerly (throws synchronously if any required store method is missing)
- `opts.ttl.sessionSeconds` — session cookie/session-store TTL; default `2592000` (30 days)
- `opts.ttl.challengeSeconds` — challenge TTL; default `300` (5 minutes), and always clamped down to **at most 300 seconds** regardless of what's passed
- `opts.cookieName` — default `'bn_auth'`
- `opts.secureCookie` — default `true`; set `false` for local `http://` development
- `opts.lib` — inject the `@simplewebauthn/server`-shaped module directly (must export `generateRegistrationOptions`, `verifyRegistrationResponse`, `generateAuthenticationOptions`, `verifyAuthenticationResponse`); otherwise the peer dependency is loaded lazily via dynamic `import()` on first use

Throws synchronously if `opts.rp.rpID`/`opts.rp.origin` or `opts.stores` are missing, or if `opts.stores` is missing any required method.

**Returns:** an adapter object with `type: 'webauthn'`, `cookieName`, and the methods below, plus `cookie.set(value)` / `cookie.clear()` (wrapping `setCookieHeader`/`clearCookieHeader` with the adapter's configured `cookieName`/`secureCookie`/`sessionTtl`) and a `_config` object (`{ rp, sessionTtl, challengeTtl, cookieName, secureCookie }`) exposed for tests/debugging only:

- **`getRegistrationOptions(rawHandle)`** — normalizes and validates the handle (`{ error: 'bad-handle', status: 400 }` if invalid); looks up or creates the user; excludes the user's existing credentials via `excludeCredentials`; calls `generateRegistrationOptions` with `attestationType: 'none'` and `authenticatorSelection: { residentKey: 'preferred', userVerification: 'preferred' }`; stores the challenge (`purpose: 'register'`) with the configured TTL. Returns `{ options }`.
- **`verifyRegistration(attestation)`** — extracts the challenge from `attestation.response.clientDataJSON`, consumes it from the challenge store (single-use — `{ error: 'challenge-not-found' }` if missing/already used), then calls `verifyRegistrationResponse` with `expectedOrigin`/`expectedRPID` from `rp` and **`requireUserVerification: false`** (user verification is requested as `'preferred'` during the ceremony above but not enforced at verification time). On success, stores the new credential (id, public key, counter, transports) and returns `{ ok: true, userId, token }` via `createSession`.
- **`getAuthenticationOptions(rawHandle)`** — if a handle is given, validates it and restricts `allowCredentials` to that user's registered credentials (`{ error: 'user-not-found', status: 404 }` if the handle doesn't exist); if omitted, produces a usernameless/discoverable-credential challenge. Calls `generateAuthenticationOptions` with `userVerification: 'preferred'`. Stores the challenge (`purpose: 'authenticate'`). Returns `{ options }`.
- **`verifyAuthentication(assertion)`** — consumes the matching challenge, looks up the credential by `assertion.id` (`{ error: 'credential-not-found', status: 404 }` if unknown), and calls `verifyAuthenticationResponse` with the stored public key/counter/transports and, again, **`requireUserVerification: false`**. On success, persists the authenticator's new signature counter and returns `{ ok: true, userId, user, token }`.
- **`createSession(userId)`** — generates a session id (`crypto.randomUUID()`, with a manual `getRandomValues`-based fallback) and stores it via `stores.userSessions.create`. Returns the token string.
- **`destroySession(token)`** — deletes the session via `stores.userSessions.destroy`; no-op if `token` is falsy.
- **`currentUser(request)`** — reads the adapter's cookie from the request and resolves it via `stores.userSessions.getUser`; returns `null` if there's no cookie or the store returns nothing (e.g. expired).

All ceremony methods that fail return `{ error: string, status: number }` rather than throwing, so callers (notably `handlers.js`) can forward the error directly as an HTTP response.

## Client (./client)

Browser-only helpers. Thin wrappers around `@simplewebauthn/browser` (loaded lazily via dynamic `import()`) plus `fetch` calls to a configurable set of JSON endpoints. Default endpoint paths: `/api/auth/register-options`, `/api/auth/register-verify`, `/api/auth/login-options`, `/api/auth/login-verify`, `/api/auth/me`, `/api/auth/logout` — override any of them via `opts.paths`. All requests are sent with `credentials: 'same-origin'`.

### isPasskeySupported()

True iff `window.PublicKeyCredential` exists as a function (i.e. the browser exposes the WebAuthn API at all).

**Returns:** `boolean`

---

### isPlatformPasskeySupported()

Some browsers report `isPasskeySupported()` true without actually supporting platform-bound (resident-key) passkeys. This checks `PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()` and returns `false` (rather than throwing) if that API is missing or the check itself fails.

**Returns:** `Promise<boolean>`

---

### registerPasskey(handle, opts = {})

Runs the full registration ceremony: fetches options from `paths.registerOptions`, calls `@simplewebauthn/browser`'s `startRegistration({ optionsJSON: options })` to prompt the platform authenticator, posts the resulting attestation to `paths.registerVerify`, then fetches and returns `paths.me`.

**Parameters:**
- `handle` — the handle to register
- `opts.paths` — override any of the default endpoint paths
- `opts.fetchInit` — extra `RequestInit` merged into every fetch (headers, etc.)
- `opts.lib` — inject a `@simplewebauthn/browser`-shaped module instead of the lazy import (used in tests)

**Returns:** `Promise<object>` — the `/me` response body

---

### loginPasskey(handle, opts = {})

Runs the authentication ceremony via `startAuthentication`. `handle` may be `''`/omitted for a usernameless flow, where the OS/browser prompts the user to pick from available passkeys.

**Returns:** `Promise<object>` — the `/me` response body

---

### me(opts = {})

Fetches `paths.me`.

**Returns:** `Promise<object>` — typically `{ user }` or `{ user: null }`, per whatever `meHandler`'s shape function produces server-side

---

### logout(opts = {})

Posts to `paths.logout` to destroy the session and clear the cookie.

**Returns:** `Promise<object>`

All four request helpers throw on a non-OK response: the thrown `Error`'s `message` is the response body's `error` field (or `request-failed-<status>`), with `.status` and `.data` attached.

## Handlers (./handlers)

Cloudflare Pages Functions / Workers handler factories for the six canonical passkey endpoints. Each factory takes `getAdapter(env)` — a function consumers supply to build a `webauthnAdapter` per-request from their environment bindings — so the factories themselves stay adapter-agnostic. Handlers use the request shape `{ request, env }` (Pages Functions convention). Errors from the underlying adapter method (`{ error, status }`) are forwarded as `{ error: message }` JSON with that status; all responses set `Cache-Control: no-store`.

### registerOptionsHandler(getAdapter)

Reads `{ handle }` from the JSON body, calls `adapter.getRegistrationOptions(handle)`, and returns the options JSON (or the forwarded error).

**Returns:** `(ctx: { request, env }) => Promise<Response>`

---

### registerVerifyHandler(getAdapter, hooks = {})

Reads `{ attestation }` from the JSON body, calls `adapter.verifyRegistration(attestation)`. On success, sets the session cookie (`adapter.cookie.set(token)`) and returns `{ ok: true }`. If `hooks.onLogin({ env, userId, adapter })` is provided it's awaited first — its errors are swallowed (logged nowhere; auth still succeeds) so a hook bug can never break registration.

**Returns:** `(ctx) => Promise<Response>`

---

### loginOptionsHandler(getAdapter)

Reads `{ handle }` from the JSON body, calls `adapter.getAuthenticationOptions(handle)`, returns the options JSON.

**Returns:** `(ctx) => Promise<Response>`

---

### loginVerifyHandler(getAdapter, hooks = {})

Reads `{ assertion }` from the JSON body, calls `adapter.verifyAuthentication(assertion)`. On success, sets the session cookie and returns `{ ok: true }`; `hooks.onLogin({ env, userId, user, adapter })` runs the same way as in `registerVerifyHandler` (errors swallowed).

**Returns:** `(ctx) => Promise<Response>`

---

### meHandler(getAdapter, options = {})

Resolves `adapter.currentUser(request)` and returns `{ user: null }` if there's no session, else `{ user: shape(u) }`.

**Parameters:**
- `options.shape` — function `(user) => object`; defaults to `{ id, handle, role, isAdmin, isModerator }` (role defaults to `'user'`; `isAdmin`/`isModerator` are derived from `role`)

**Returns:** `(ctx) => Promise<Response>`

---

### logoutHandler(getAdapter)

Reads the adapter's cookie from the request, calls `adapter.destroySession(cookieValue)` if present, and returns `{ ok: true }` with the cookie cleared.

**Returns:** `(ctx) => Promise<Response>`

---

### onRequestPost

Not itself exported by this package. It's the Cloudflare Pages Functions convention name that consumers bind the return value of a handler factory to, e.g.:

```js
export const onRequestPost = registerOptionsHandler(getAdapter);
```

(shown in the JSDoc block at the top of `handlers.js`). `me`/`logout` routes are typically bound as `onRequestGet`/`onRequestPost` respectively depending on the HTTP verb your router expects — the handler factories don't dictate the verb name.

## D1 Stores (./d1-stores)

Cloudflare D1 reference implementation of the `stores` contract `webauthnAdapter` requires. Field mappings match the schema in `packages/auth-webauthn/migrations/0001_webauthn_schema.sql`.

### d1WebAuthnStores(DB)

Builds all four stores at once from a D1 binding.

**Parameters:**
- `DB` — a `D1Database` binding; throws synchronously if it doesn't look like one (`typeof DB.prepare !== 'function'`)

**Returns:** `{ users, credentials, challenges, userSessions }` — equivalent to calling the four factories below individually

---

### d1Users(DB)

**Returns:** object with:
- `getByHandle(handle)` — `SELECT id, handle, role ... WHERE handle=?1`
- `getById(id)` — same columns, by id
- `create({ id, handle })` — inserts a row; returns `{ id, handle, role: 'user' }` (the DB default)
- `setRole(id, role, changedBy)` — updates `role`, `role_changed_at` (`unixepoch()`), `role_changed_by`; used by `seedRoles`, not by `webauthnAdapter` itself

`users.role` is constrained by a `CHECK (role IN ('user','moderator','admin'))` in the schema.

---

### d1Credentials(DB)

**Returns:** object with:
- `listByUser(userId)` — all credentials for a user (id, publicKey, counter, transports — `transports` JSON-parsed back to an array, or `undefined` if null)
- `getById(credId)` — a single credential, including `userId`
- `create({ id, userId, publicKey, counter, transports })` — inserts a row (`transports` JSON-stringified; `counter` defaults to `0`)
- `updateCounter(id, counter)` — updates the stored signature counter after a successful authentication

---

### d1Challenges(DB)

**Returns:** object with:
- `create({ challenge, userId, purpose, ttlSeconds = 300 })` — inserts a row with `expires_at = now + ttlSeconds`; `userId` may be `null` (usernameless flows)
- `consume(challenge, purpose)` — looks up the row by `(challenge, purpose)`, **deletes it unconditionally** (single-use, whether or not it turns out to be expired), then returns `null` if it had already expired, otherwise `{ challenge, userId, purpose, expiresAt }`

---

### d1UserSessions(DB)

**Returns:** object with:
- `create({ id, userId, ttlSeconds })` — inserts a row with `expires_at = now + ttlSeconds`
- `getUser(token)` — joins `user_sessions` to `users`; returns `null` if the token doesn't exist **or** has expired (expired rows are not deleted here, only filtered out — the `d1-stores` module has no separate sweep/cleanup routine for expired sessions or challenges)
- `destroy(token)` — deletes the session row

---

### migration

A template-string constant containing the full D1 schema (`users`, `credentials`, `challenges`, `user_sessions` tables and their indexes) — byte-for-byte the same SQL as `migrations/0001_webauthn_schema.sql`, exported so it can be applied programmatically (e.g. from a setup script) instead of shelling out to `wrangler d1 execute --file=...`.

## Seed Role (./seed-role)

Optional helper for bootstrapping privileged accounts without a manual SQL step, independent of the WebAuthn ceremonies themselves — it only touches `stores.users.setRole`.

### seedRoles({ stores, user, seedMap, changedBy = 'seed' })

If `user.handle` (lowercased) is a key in `seedMap`, and the user's current role isn't already that value, calls `stores.users.setRole(user.id, desired, changedBy)`. Guards against downgrading: a user already at `'admin'` is never moved to a lesser role even if `seedMap` maps them elsewhere. No-ops (returns `user` unchanged) if `user.handle` or `seedMap` is missing, or if there's no matching/needed change.

**Returns:** `Promise<User>` — the original `user` object, or a shallow copy with `role` updated

Typically called right after a successful login (e.g. inside a handler's `hooks.onLogin`), not during the ceremonies themselves.

---

### parseHandleList(csv, role)

Parses a comma-separated string (e.g. an env var like `"alice,bob,charlie"`) into a `seedMap` object mapping every trimmed, lowercased handle to the given `role`.

**Returns:** `object` — `{ [handle]: role }`

## Integration

- `webauthnAdapter`'s return shape (`type: 'webauthn'` plus lifecycle methods) mirrors the convention used by `@basenative/auth`'s own `credentialsProvider`/`oauthProvider` (`type: 'oauth'`, etc. — see `docs/api/auth.md`), but there is no source-level dependency between the two packages: this adapter manages its own cookie (`bn_auth` by default) and its own session store (`stores.userSessions`) rather than going through `@basenative/auth`'s `createSessionManager`/`sessionMiddleware`.
- `d1WebAuthnStores`/`d1Users`/`d1Credentials`/`d1Challenges`/`d1UserSessions` are a reference storage implementation for Cloudflare D1; any storage backend can be used with `webauthnAdapter` as long as it implements the same four-store method contract (`users.getByHandle/getById/create`, `credentials.listByUser/getById/create/updateCounter`, `challenges.create/consume`, `userSessions.create/getUser/destroy`).
- `seedRoles`/`parseHandleList` read and write through the same `stores.users` object passed to `webauthnAdapter`, so they compose with either the D1 stores or a custom store implementation.

## License

Apache-2.0
