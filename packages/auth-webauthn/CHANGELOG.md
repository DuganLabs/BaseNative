# Changelog

## 1.1.1

### Patch Changes

- 9741b75: Public-readiness metadata sweep, no behavior change:

  - Add a per-package `LICENSE` file (Apache-2.0) — previously only the repo root
    carried one, so it was never included in the published tarball.
  - Fix `repository.url`/`homepage`/`bugs.url` to the correct `DuganLabs/BaseNative`
    casing with a `git+` prefix on `repository.url`, matching npm's convention; add
    the `bugs` field to `@basenative/eslint-config` and `@basenative/tsconfig`, which
    were missing it.
  - Normalize `publishConfig` to `{ "access": "public" }` across every publishable
    package. The previous per-package `registry` override duplicated the scope
    mapping `.npmrc` already sets for `@basenative:*` (and that the Release/publish
    workflows reassert via `actions/setup-node`'s `registry-url`/`scope` inputs), so
    it only added drift risk and would have blocked a future npmjs registry target.
  - Fix README `## License` sections that said `MIT` while `package.json` and the
    repo `LICENSE` say `Apache-2.0` (`auth`, `config`, `date`, `db`, `fetch`, `flags`,
    `fonts`, `forms`, `i18n`, `icons`, `logger`, `marketplace`, `middleware`,
    `notify`, `realtime`, `router`, `runtime`, `server`, `tenant`, `upload`,
    `visual-builder`); add a missing `## License` section to `builder` and `evals`.
  - Add the missing `README.md` for `@basenative/integrations` (Plaid Link +
    accounts/transfers, and the pure float-yield-optimization math).

  No `private`/version/`exports` changes. `@basenative/evals`, `fonts`, and `icons`
  stay private and are not part of this changeset.

## 1.1.0

### Minor Changes

- 44d4c9a: Add a `userVerification: 'preferred' | 'required' | 'discouraged'` option to `webauthnAdapter` (default `'preferred'`, matching prior behaviour byte-for-byte). It now drives both option generation (`authenticatorSelection.userVerification` on registration, `userVerification` on authentication) _and_ the verification step (`requireUserVerification: userVerification === 'required'`), so the two settings can no longer disagree — previously the adapter always requested `'preferred'` UV but never enforced it (`requireUserVerification: false`), regardless of what the caller wanted. Set `'required'` to enforce UV on every login; see the README for the security tradeoff (authenticators without UV support, including previously-registered passkeys, will be rejected).

  Also removes the unused `@basenative/auth` peer dependency — no module in this package imports it; the adapter follows the same `{ type, ... }` provider shape by convention, not by coupling, and the declared peer was surfacing as an `UNMET DEPENDENCY` for consumers who don't install `@basenative/auth`.

## 1.0.3

### Patch Changes

- 809ac53: Widen the `@simplewebauthn/server` peer range to `^11.0.0 || ^12.0.0 || ^13.0.0 || ^14.0.0` so consumers can upgrade past v11 (for example via Dependabot). No code changes were required: the adapter's option and result shapes have been stable across that whole range, and the fallbacks are now covered by regression tests.

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
