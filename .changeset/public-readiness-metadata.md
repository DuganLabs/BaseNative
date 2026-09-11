---
"@basenative/admin": patch
"@basenative/auth": patch
"@basenative/auth-webauthn": patch
"@basenative/builder": patch
"@basenative/claude-config": patch
"@basenative/cli": patch
"@basenative/combobox": patch
"@basenative/components": patch
"@basenative/config": patch
"@basenative/date": patch
"@basenative/db": patch
"@basenative/doppler": patch
"@basenative/eslint-config": patch
"@basenative/favicon": patch
"@basenative/fetch": patch
"@basenative/flags": patch
"@basenative/forms": patch
"@basenative/i18n": patch
"@basenative/integrations": patch
"@basenative/keyboard": patch
"@basenative/logger": patch
"@basenative/markdown": patch
"@basenative/marketplace": patch
"@basenative/mcp": patch
"@basenative/middleware": patch
"@basenative/notify": patch
"@basenative/og-image": patch
"@basenative/persist": patch
"@basenative/realtime": patch
"@basenative/router": patch
"@basenative/runtime": patch
"@basenative/server": patch
"@basenative/share": patch
"@basenative/station": patch
"@basenative/tenant": patch
"@basenative/tsconfig": patch
"@basenative/upload": patch
"@basenative/validate": patch
"@basenative/visual-builder": patch
"@basenative/wrangler-preset": patch
---

Public-readiness metadata sweep, no behavior change:

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
