# Limitations

BaseNative has addressed the core framework gaps and is building toward enterprise readiness. Current limitations:

- no database adapter layer (planned v0.6)
- no authentication or authorization (planned v0.6)
- no i18n framework (planned v0.8)
- no combobox, multiselect, or date/time components (planned v0.7)
- no tree, data grid, treegrid, or virtualizer components (planned v0.7)
- no multi-tenancy support (planned v0.8)
- no real-time features (WebSocket/SSE) (planned v0.8)
- SSR streaming renders-then-chunks (not true progressive streaming)

Template expressions intentionally support a safe subset of JavaScript-like syntax. They are not intended to run arbitrary program text.

If a UI requires complex logic, move that logic into named functions in your script and call those functions from the template.

## Resolved (previously listed)

- ~~no router package~~ → `@basenative/router`
- ~~no forms package~~ → `@basenative/forms`
- ~~no validation adapters~~ → built-in validators + `zodAdapter()`
- ~~no packaged component library~~ → `@basenative/components` (15 components)
- ~~no devtools~~ → `enableDevtools()` + `window.__BASENATIVE_DEVTOOLS__`
- ~~no CLI scaffolding tool~~ → `@basenative/cli` (`bn create`, `bn dev`, `bn build`, `bn generate`)
- ~~no middleware framework~~ → `@basenative/middleware` (pipeline, CORS, rate-limit, CSRF, logger)
- ~~no configuration system~~ → `@basenative/config` (env loading, validation, type-safe config)
- ~~no Docker support~~ → Dockerfile + docker-compose
- ~~no E2E testing~~ → Playwright integration
