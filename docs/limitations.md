# Limitations

Every gap this file used to list as "planned" has shipped — see the "Resolved" section
below, which now also carries what used to be the "Current limitations" list. What
remains is deliberate design, not a missing feature:

- SSR streaming (`renderToStream`/`renderToReadableStream`, `@basenative/server`)
  renders the full output synchronously, then chunks the already-complete string to the
  stream — `@defer` sections are appended afterward as script injections. It is not
  incremental/progressive rendering of not-yet-resolved content.
- Template expressions intentionally support a safe subset of JavaScript-like syntax.
  They are not intended to run arbitrary program text — see the CSP-safe evaluator
  section in the README.

If a UI requires complex logic, move that logic into named functions in your script and
call those functions from the template.

For exactly what's published and at what version, `docs/package-inventory.md` is
generated from the packages themselves and is authoritative; this file is prose and can
lag it.

## Resolved (previously listed as gaps)

- ~~no router package~~ → `@basenative/router`
- ~~no forms package~~ → `@basenative/forms`
- ~~no validation adapters~~ → built-in validators + `zodAdapter()`
- ~~no packaged component library~~ → `@basenative/components` (15+ components,
  including `tree.js`, `datagrid.js`, `virtualizer.js`, `combobox.js`, `multiselect.js`,
  `calendar.js` — all of which a prior version of this file still listed as unbuilt)
- ~~no devtools~~ → `enableDevtools()` + `window.__BASENATIVE_DEVTOOLS__`
- ~~no CLI scaffolding tool~~ → `@basenative/cli` (`bn create`, `bn dev`, `bn build`, `bn generate`)
- ~~no middleware framework~~ → `@basenative/middleware` (pipeline, CORS, rate-limit, CSRF, logger)
- ~~no configuration system~~ → `@basenative/config` (env loading, validation, type-safe config)
- ~~no Docker support~~ → Dockerfile + docker-compose
- ~~no E2E testing~~ → Playwright integration
- ~~no database adapter layer~~ → `@basenative/db` (query builder + SQLite/PostgreSQL/D1 adapters, `packages/db/src/adapters/`)
- ~~no authentication or authorization~~ → `@basenative/auth` (session, RBAC, password hashing, OAuth providers) + `@basenative/auth-webauthn` (passkeys)
- ~~no i18n framework~~ → `@basenative/i18n` (ICU messages, locale detection, `@t` directive)
- ~~no multi-tenancy support~~ → `@basenative/tenant` (subdomain/path/header resolvers + query scoping)
- ~~no real-time features (WebSocket/SSE)~~ → `@basenative/realtime`

---

_Last verified against the code: 2026-09-11._
