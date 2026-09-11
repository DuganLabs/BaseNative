# Changelog — @basenative/admin

## 1.0.2

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

## 1.0.1

### Patch Changes

- be954c6: Remove the unused `@basenative/auth` peer dependency. No module in this package imports `@basenative/auth` — every module is written storage/auth-agnostic, accepting resolvers you supply (`getCurrentUser`, `setRole`, `identifier`, etc.) — so the declared peer was phantom and made `@basenative/auth` show as an `UNMET DEPENDENCY` for consumers who don't happen to install it. `@basenative/auth` remains a fine choice for implementing `getCurrentUser`, it's just no longer a declared dependency of this package.

## 1.0.0

### Minor Changes

- 3ce5feb: Initial release: pluggable admin & moderation surface — hierarchical role primitives, generic submission queue, append-only audit log middleware, drop-in CF Worker / Pages handlers, server-rendered queue/user list components, and a D1 migration.

### Patch Changes

- Updated dependencies [fdfa251]
  - @basenative/auth@0.3.0

## 0.1.0 — initial release

- `defineRoles` + `hasRole` + `requireRole` + `roleSeed` — hierarchical role primitives
- `defineQueue` — generic submission queue (submit / list / decide / promote-on-approve)
- `auditAction` + `withAudit` — append-only audit log with safe failure mode
- `defineAdminHandlers` — drop-in CF Worker / Pages Function handlers
- `renderAdminQueueList`, `renderAdminUserList` — server-rendered UI
- Migration `0001_audit_and_roles.sql`
