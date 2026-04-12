# CLAUDE.md — BaseNative AI Assistant Guide

## Project Identity

BaseNative is an open specifications project that delivers a signal-based web runtime over native HTML — zero build step, zero production dependencies in the core runtime, ~120 lines for the core primitives. It is the runtime foundation for DuganLabs projects (PendingBusiness, Greenput).

**Monorepo**: Nx + pnpm workspace  
**Package scope**: `@basenative/*`  
**Node.js version**: 22 (Volta-managed)  
**Package manager**: pnpm 10

---

## Constitution (Four Axioms)

1. **No namespace theater** — Semantic HTML only. W3C primitives are the component model. No `app-header`, no `my-button`.
2. **Zero inline styles** — All CSS lives in cascade layers. No `style=""`, no CSS-in-JS.
3. **`display: contents` on host elements** — Wrappers must not affect layout.
4. **Trinity Standard** — State, logic, and template fuse in one file. No splitting across three files.

---

## Workspace Structure

```
basenative/
├── packages/           # 23 publishable @basenative/* packages
│   ├── runtime/        # CORE: signal(), computed(), effect(), hydrate()
│   ├── server/         # SSR: render(), renderToStream(), renderToReadableStream()
│   ├── router/         # SSR-aware path routing
│   ├── forms/          # Signal-based form state + validation
│   ├── components/     # 15 semantic UI components
│   ├── auth/           # Session, RBAC, password hashing, OAuth providers
│   ├── db/             # Query builder + SQLite/Postgres/D1 adapters
│   ├── middleware/      # Pipeline, CORS, rate-limit, CSRF, adapters
│   ├── config/         # Env loading, type-safe schema validation
│   ├── logger/         # Structured logging with transports
│   ├── fetch/          # Signal-based resource fetching with cache
│   ├── i18n/           # ICU messages, locale detection, @t directive
│   ├── realtime/       # SSE + WebSocket + channel manager
│   ├── tenant/         # Multi-tenant middleware + query scoping
│   ├── upload/         # File upload with R2/S3 adapters
│   ├── notify/         # Email via SMTP/SendGrid with templates
│   ├── flags/          # Feature flags with percentage rollouts
│   ├── date/           # Date utilities and formatting
│   ├── cli/            # `bn` / `create-basenative` scaffolding
│   ├── fonts/          # Font loading utilities
│   ├── icons/          # Icon system
│   ├── marketplace/    # Community component marketplace
│   └── visual-builder/ # No-code template builder
├── examples/           # Working reference apps
│   ├── express/        # Node.js + Express SSR
│   ├── enterprise/     # Auth + DB + middleware stack
│   ├── enterprise-v2/  # Multi-tenant enterprise patterns
│   ├── cloudflare-workers/ # Cloudflare Workers deployment
│   └── node/           # Standalone Node.js server
├── docs/               # Documentation
├── benchmarks/         # Performance benchmarks
├── tests/              # Cross-package integration tests
└── src/
    └── shared/
        └── expression.js  # CSP-safe expression evaluator (shared runtime/server)
```

---

## Build / Test / Lint Commands

```bash
# Install dependencies
pnpm install

# Run tests for a single package
cd packages/runtime && node --test

# Run tests for all packages via Nx
npx nx run-many --target=test --all

# Run lint for all packages
npx nx run-many --target=lint --all

# Run specific package tests
npx nx run @basenative/runtime:test
```

All packages use **Node.js built-in test runner** (`node:test`). No Jest, no Vitest.

---

## Architecture Decisions

### Template Processing Pipeline
1. **Server**: Parse HTML → interpolate `{{ }}` → evaluate `@if`/`@for`/`@switch` → emit with `<!--bn:*-->` hydration markers
2. **Client**: Parse markers → attach signal dependencies → re-render on mutation

### CSP-Safe Expression Evaluator
Located at `src/shared/expression.js`. Used by both `@basenative/server` (SSR) and `@basenative/runtime` (client hydration).

- **No `eval`**, **no `new Function`**
- Supports: property access, method calls, arithmetic, comparison, logical, ternary, array/object literals
- Explicit allowlist of operations — no arbitrary code execution

### Signal Reactivity
```js
// signals.js — ~60 lines, zero deps
signal(initial)     // readable/writable reactive value
computed(fn)        // derived signal, lazy with dependency tracking
effect(fn)          // auto-tracks reads, re-runs on change, returns cleanup
```

`computed()` is implemented as `effect(() => s.set(fn()))` — elegant composition.

### Package Exports
All packages use `"type": "module"` and `"exports": { ".": "./src/index.js" }`. No build step required for development. ESBuild used for production bundles only.

---

## Package Dependency Graph (key relationships)

```
runtime          ← server, router, forms, fetch, realtime, i18n, flags
server           ← src/shared/expression.js
runtime          ← src/shared/expression.js (via hydrate)
auth             ← node:crypto (no external deps)
db               ← optional: better-sqlite3, pg, @cloudflare/workers-types
middleware       ← runtime (signals for CSRF tokens)
```

---

## Commit Conventions

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(runtime): add batch() API for synchronous signal updates
fix(server): handle null ctx in attribute binding
test(auth): add RBAC hierarchical inheritance tests
docs(api): add @basenative/fetch API reference
chore(ci): add bundle size check to PR workflow
```

**Always include**: `Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>`

---

## Code Style Guide

- **ESM only**: `import`/`export`, no CommonJS
- **No TypeScript source**: TypeScript declarations in `types/` only
- **Minimal abstractions**: Read existing code, match its style
- **No external dependencies** in core packages (`runtime`, `server`, `router`)
- **Error messages must be actionable**: Tell users WHAT to fix, not just what went wrong
- **No inline comments** unless logic is genuinely non-obvious

---

## Key Invariants to Preserve

1. `@basenative/runtime` must stay under **5KB gzipped** — check with every bundle-impacting change
2. The CSP-safe evaluator must never use `eval` or `new Function`
3. All parameterized DB queries use `?` placeholders — never string interpolation
4. `hydrate()` must work from server-rendered HTML without JavaScript re-rendering everything

---

## Contribution Guidelines for AI Assistants

- **Read source before testing**: Never write tests for guessed APIs
- **Run tests before committing**: `cd packages/{name} && node --test`  
- **Fix broken tests before writing new code**
- **Commit frequently**: Every 2-3 logical changes, push after each phase
- **Branch protection**: All changes via PRs — create a branch, push, open PR
- **No new packages** unless explicitly requested
- **No new production dependencies** in core packages

---

## Related Projects

- **PendingBusiness** — Business management app built on BaseNative
- **Greenput** — Input/workflow platform built on BaseNative  
- **Greenput OS** — Long-term: BaseNative as hardware runtime substrate

---

## Next Steps / AI Backlog

**UPSTREAM DOGFOODING DIRECTIVE**: You are the foundational framework builder. If a downstream consumer app (Greenput, PendingBusiness, DuganLabs) requires a generically useful primitive (like a specialized UI component, an auth flow wrapper, or parsing string utility), YOU must build it here as an open-source package first. 

You will pull from this task list when executing autonomously.

### Epic 1: Dogfooding Primitives (`@basenative/markdown` & `@basenative/components`)
- **Task A**: Build `@basenative/markdown`, a pure ES module zero-dependency markdown parser. This is a hard blocker for DuganLabs' Dynamic Blog Epic.
- **Task B**: Expand `@basenative/components` with a Drag-and-Drop Calendar/Pipeline block component utilizing CSS grid and native drag-and-drop APIs. This is a hard blocker for Greenput's Schedule-Aware Lead Routing Epic.
- **Task C**: Build `@basenative/integrations/plaid`, a headless wrapper module that wraps the Plaid Link client-side initialization script and the server-side OAuth exchange logic. This is a hard blocker for PendingBusiness's FedNow auto-pay engine.

### Epic 2: Reactivity Optimization (`@basenative/runtime`)
- **Task A**: Write benchmarking tests in `benchmarks/` to measure `effect()` re-render overhead with 10,000 DOM nodes.
- **Task B**: Implement a `batch()` API to allow synchronous grouping of signal mutations without triggering immediate re-renders, solving the diamond problem.
- **Task C**: Implement comprehensive unit testing (`node:test`) for diamond-dependency cases.

### Epic 3: SSR Advanced Streaming (`@basenative/server`)
- **Task A**: Introduce `@defer` directive parser logic, splitting the document stream parsing to allow "Suspense-like" partial HTML streaming.
- **Task B**: Link `@defer` chunks to `hydrate()` so that delayed script injection re-evaluates the signal tree automatically.

### Epic 4: No-Code Visual Builder Engine [Phase 3]
- **Task A**: Initialize `@basenative/visual-builder` package. Build an AST-to-DOM parser that can translate JSON schema representations back into BaseNative primitives safely.
- **Task B**: Expose a drag-and-drop layout grid component inside `@basenative/components` that hooks directly into the visual builder state machine.
- **Task C**: Implement a specialized `<bn-canvas>` web component to orchestrate the drag-and-drop interface, strictly respecting `display: contents` constraints on hosts.

### Epic 5: Plugin Infrastructure & Feature Flags [Phase 3]
- **Task A**: Build `@basenative/flags`, enabling edge-cached feature flag evaluations utilizing Cloudflare KV.
- **Task B**: Overhaul `@basenative/runtime` to expose an internal `registerPlugin()` API hooked into the reactivity lifecycle. Ensure external plugins can intercept signal writes without breaking the diamond-problem resolutions.
