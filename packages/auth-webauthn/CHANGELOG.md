# Changelog

## 1.0.0

### Minor Changes

- 3ce5feb: Initial release: WebAuthn (passkey) adapter for `@basenative/auth` — server adapter, browser helpers, drop-in Cloudflare Workers / Pages handlers, D1 store factory, role-seed-on-login, and a ready-to-apply D1 migration. Lifted from the production-tested t4bs implementation.

### Patch Changes

- Updated dependencies [fdfa251]
  - @basenative/auth@0.3.0

## 0.1.0 — 2026-04-26

Initial release. Lifted from the production-tested passkey implementation in
[t4bs](https://github.com/DuganLabs/t4bs) (`functions/api/auth/*`,
`functions/_shared/webauthn.js`, `functions/_shared/util.js`,
`src/lib/auth.js`).

### Added

- `webauthnAdapter({ rp, stores, ttl })` — server-side passkey adapter for
  `@basenative/auth`. Storage-agnostic via the four-store interface
  (`users`, `credentials`, `challenges`, `userSessions`).
- `d1WebAuthnStores(DB)` — Cloudflare D1 store factory using the canonical
  schema.
- `migrations/0001_webauthn_schema.sql` — D1-ready schema with `users`,
  `credentials`, `challenges`, `user_sessions`, plus role columns.
- Drop-in handler factories: `registerOptionsHandler`,
  `registerVerifyHandler`, `loginOptionsHandler`, `loginVerifyHandler`,
  `meHandler`, `logoutHandler`. Wire into Cloudflare Pages Functions or
  any Workers-style router.
- Browser helpers: `isPasskeySupported`, `isPlatformPasskeySupported`,
  `registerPasskey`, `loginPasskey`, `me`, `logout`. Configurable endpoint
  paths.
- `seedRoles({ stores, user, seedMap })` — generic role-seed-on-login,
  generalized from t4bs's `seedAdminRole`. Plus `parseHandleList(csv, role)`.
- Cookie defaults: `HttpOnly; Secure; SameSite=Lax`. Challenge TTL clamped
  to 5 minutes.
- TypeScript ambient declarations under `types/index.d.ts`.
