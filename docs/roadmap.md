# Roadmap

## v0.2 Trust Release ✅

- ✅ CSP-safe expression engine
- ✅ keyed `@for` reconciliation
- ✅ hydration diagnostics
- ✅ browser support policy
- ✅ README, changelog, governance, security docs
- ✅ CI pipeline (test + lint on every PR)
- ✅ ESLint + Prettier configuration
- ✅ TypeScript type declarations
- ✅ Changesets + release automation
- ✅ Bundle size tracking

## v0.3 Pilot Release ✅

- ✅ router package (`@basenative/router`)
- ✅ forms package (`@basenative/forms`)
- ✅ semantic component baseline (`@basenative/components` — 15 components)
- ✅ design tokens and theming (light/dark mode, density scales)
- ✅ reference business app (`examples/enterprise/`)
- ✅ published benchmark evidence (`benchmarks/`)
- ✅ API reference documentation (`docs/api/`)
- ✅ getting started guide (`docs/getting-started.md`)

## v0.4+ ✅

- ✅ broader component/system coverage (button, input, textarea, checkbox, radio, toggle, select, alert, toast, table, pagination, badge, card, progress/spinner, skeleton)
- ✅ design tokens and density guidance
- ✅ accessibility matrices (`docs/accessibility.md`)
- ✅ debug/devtools hooks (`enableDevtools()`, `window.__BASENATIVE_DEVTOOLS__`)
- ✅ error boundary system (`createErrorBoundary()`, `renderWithBoundary()`)
- ✅ SSR streaming support (`renderToStream()`, `renderToReadableStream()`)
- ✅ migration guides (`docs/migration.md`)
- ✅ release process documentation (`docs/releasing.md`)
- ✅ enhanced CONTRIBUTING.md with development setup

## v0.5 Foundation & Tooling ✅

- ✅ configuration package (`@basenative/config` — env loading, validation, type-safe config)
- ✅ middleware framework (`@basenative/middleware` — pipeline, CORS, rate-limit, CSRF, logger)
- ✅ Express adapter (`@basenative/middleware/express`)
- ✅ CLI tool (`@basenative/cli` — create, dev, build, generate commands)
- ✅ project scaffolding (`npx create-basenative` — minimal, enterprise, api templates)
- ✅ Docker support (Dockerfile, docker-compose)
- ✅ E2E testing infrastructure (Playwright)
- ✅ CI coverage reporting

## v0.6 Data & Auth ✅

- ✅ database adapter layer (`@basenative/db` — SQLite, PostgreSQL, Cloudflare D1)
- ✅ query builder
- ✅ authentication (`@basenative/auth` — sessions, password hashing, OAuth2/OIDC)
- ✅ RBAC authorization (role hierarchies, route guards)
- ✅ CSRF token integration with auth sessions
- ✅ enterprise example with login, persistence, and role-based access

## v0.7 Observability & Data Fetching ✅

- ✅ structured logging (`@basenative/logger` — JSON output, transports, request context)
- ✅ data fetching (`@basenative/fetch` — signal-based resources, caching, SSR preload)
- ✅ date utilities (`@basenative/date` — formatting, timezones, relative time, calendars)

## v0.8 Platform Features ✅

- ✅ multi-tenancy (`@basenative/tenant` — context, row-level isolation, subdomain/path resolution)
- ✅ internationalization (`@basenative/i18n` — `@t` directive, ICU messages, locale detection)
- ✅ real-time (`@basenative/realtime` — SSE, WebSocket, signal integration, channels)
- ✅ file uploads (`@basenative/upload` — multipart parsing, R2/S3 storage adapters)
- ✅ feature flags (`@basenative/flags` — `@feature` directive, percentage rollouts)
- ✅ email/notifications (`@basenative/notify` — email templates, SMTP/SendGrid transport)

## v1.0 Enterprise Release ✅

- ✅ lazy hydration (`@lazy` directive — `hydrateOnIdle`, `hydrateOnInteraction`, `hydrateOnMedia`)
- ✅ Web Vitals integration (`observeLCP`, `observeFID`, `observeCLS`, `observeFCP`, `observeTTFB`, `observeINP`)
- ✅ plugin system (`definePlugin()`, `createPluginRegistry()`, lifecycle hooks)
- ✅ server adapters (Hono, Fastify, Cloudflare Workers)
- ✅ enterprise documentation (architecture, deployment, security, scaling, multi-tenancy guides)
- ✅ enterprise-v2 reference app (multi-tenant SaaS patterns)
- ✅ comprehensive test coverage (1232 tests across 23 packages — 1213 unit + 19 integration)
- ✅ Cloudflare Workers example (`examples/cloudflare-workers/`)
- ✅ standalone Node.js server example (`examples/node/`)

## v1.x+ Platform & Ecosystem

- BaseNative Cloud (hosted deployment, `bn deploy`)
- component marketplace (`bn add <package>`)
- visual builder (drag-and-drop page editor)
- data grid (virtual scroll, column resize, cell editing, row selection)
- combobox, date picker, time picker, command palette
