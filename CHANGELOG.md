# Changelog

All notable changes to BaseNative will be documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) and
BaseNative adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased] — 0.3.x (v1-Readiness)

### Added
- Comprehensive test suites across all 23 packages (1442 unit tests + 19 cross-package integration tests)
- `@basenative/runtime`: 81 edge case + security boundary tests for the CSP expression evaluator
- "Building a Todo App" tutorial in `docs/guides/todo-app.md` (SSR + signals + forms + flags)
- `@basenative/date`: full date utility coverage — timezone, relative time, date ranges
- `@basenative/fetch`: signal-based resource caching, SSR preload, abort controller, retry logic
- `@basenative/flags`: percentage rollout bucketing, user context evaluation, `@feature` directive
- `@basenative/logger`: structured JSON output, file transport, child loggers, correlation IDs
- `@basenative/notify`: email template rendering, SMTP and SendGrid transports
- `@basenative/upload`: multipart parsing, file validation, R2 and S3 adapters, progress tracking
- Node.js 18/20/22 matrix in CI workflow
- Package-level READMEs for all 23 packages
- API documentation for all packages in `docs/api/`
- `description`, `license`, `repository`, `keywords` fields in all `package.json` files
- Cloudflare Workers deployment example (`examples/cloudflare-workers/`)
- Node.js standalone HTTP server example (`examples/node/`)
- `CLAUDE.md` AI assistant guide with architecture, commands, and invariants
- Cross-package integration tests (`tests/integration/`)
- Framework migration guides (React, Vue, Svelte, vanilla JS) in `docs/migration.md`
- Changeset for all packages (`v1-readiness`)
- `@basenative/runtime`: debug mode (`enableDebug`, `debugSignal`, `debugEffect`, `debugTime`, `debugAssert`)
- Signal comparison benchmarks vs Preact-style and Solid-style reactive primitives (`benchmarks/signal-comparison.bench.js`)
- "Building a Multi-tenant SaaS" tutorial (`docs/guides/multitenant-saas.md`)
- Starter template example (`examples/starter/`) — Node.js, routing, SSR, client hydration
- Tests for `@basenative/fonts` (26) and `@basenative/icons` (58)
- Expanded test coverage: `@basenative/realtime` (17→47), `@basenative/i18n` (21→42), `@basenative/config` (20→39), `@basenative/server` (30→58)
- Expanded test coverage: `@basenative/middleware` (27→44), `@basenative/tenant` (25→37), `@basenative/logger` (25→32), `@basenative/auth` (27→51), `@basenative/db` (25→38), `@basenative/forms` (27→45)
- Expanded test coverage: `@basenative/runtime` (261→320), `@basenative/flags` (25→31), `@basenative/cli` (19→25), `@basenative/router` (33→40)
- Expanded test coverage: `@basenative/components` (42→55), `@basenative/fetch` (20→42), `@basenative/upload` (20→45)
- Expanded test coverage: cross-package integration tests (15→19)

### Changed
- CI workflow: replaced `test:coverage` (undefined target) with `test`, added node version matrix
- Root `README.md` rewritten for open-source audience with full package table

### Fixed
- Nx Cloud 401 auth errors no longer block local test runs (cloud token is optional)

---

## [0.3.0] — 2026-03-28 (Pilot Baseline)

### Added
- `@basenative/runtime`: error boundaries (`createErrorBoundary`, `renderWithBoundary`)
- `@basenative/runtime`: plugin system (`definePlugin`, `createPluginRegistry`)
- `@basenative/runtime`: lazy hydration strategies (`hydrateOnIdle`, `hydrateOnInteraction`, `hydrateOnMedia`)
- `@basenative/runtime`: Web Vitals integration (`observeLCP`, `observeFID`, `observeCLS`, `observeFCP`, `observeTTFB`, `observeINP`)
- `@basenative/runtime`: devtools hooks (`enableDevtools`, `trackSignal`, `trackEffect`)
- `@basenative/server`: `renderToStream` (Node.js) and `renderToReadableStream` (Web Streams API)
- `@basenative/server`: server adapter compatibility (Express, Hono)
- `@basenative/router`: guard functions (before-enter, before-leave, redirect)
- `@basenative/forms`: Zod schema adapter
- `@basenative/components`: 15 semantic UI components with CSS custom property theming
- `@basenative/components`: light/dark mode, density scales (compact/default/spacious)
- Unified design system with design token showcase
- Nx Cloud workspace integration
- Enterprise reference app (`examples/enterprise/`)
- `@basenative/auth`, `@basenative/db`, `@basenative/middleware`, `@basenative/config`
- `@basenative/i18n`, `@basenative/realtime`, `@basenative/tenant`
- `@basenative/upload`, `@basenative/notify`, `@basenative/flags`, `@basenative/date`
- `@basenative/visual-builder` and `@basenative/marketplace`

---

## [0.2.0] — 2026-03-20 (Trust Release)

### Changed
- Replaced eval-based template execution with a shared CSP-safe expression interpreter (no `eval`, no `new Function`)
- Keyed `@for ... track ...` reconciliation in the runtime

### Added
- Hydration diagnostics hooks and server-side hydratable markers
- Browser feature detection utilities (`browserFeatures`, `detectBrowserFeatures`, `supportsFeature`)
- Explicit browser support documentation

### Fixed
- Public positioning tightened from demo claims toward pilot-stage framework documentation

---

## [0.1.0] — 2026-02-15 (Foundation)

### Added
- `@basenative/runtime`: `signal()`, `computed()`, `effect()`, `hydrate()`
- `@basenative/server`: `render()` with `@if`, `@for`, `@switch` directive support
- `@basenative/router`: path matching with named params and wildcards
- `@basenative/forms`: signal-based field state and validators
- `@basenative/cli`: `bn` / `create-basenative` scaffolding
- Express reference example
- CSP-safe expression evaluator shared between server and runtime
- Nx + pnpm monorepo setup with GitHub Actions CI
