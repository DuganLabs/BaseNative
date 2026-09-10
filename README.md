# BaseNative

**The UI runtime for code you didn't write.**

A model can generate a BaseNative interface at inference time — no build step, and
no escape hatch to arbitrary JavaScript. Every other generative-UI system today
pre-registers a fixed component set and has the model pick from it. BaseNative
streams arbitrary UI.

[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](https://nodejs.org)
[![Tests](https://github.com/DuganLabs/basenative/actions/workflows/ci.yml/badge.svg)](https://github.com/DuganLabs/basenative/actions/workflows/ci.yml)

---

## Why this is different

### 1. Model-generated templates cannot execute arbitrary code

The expression evaluator never calls `eval` or `new Function`. It implements a
deliberate subset — identifiers, member and computed access, calls, literals,
arithmetic, comparison, logical operators, ternary, array and object literals —
and blocks access to `constructor`, `prototype`, and `__proto__`.

This is the security boundary the whole idea rests on, so it is audited
adversarially rather than assumed. See [SECURITY.md](SECURITY.md) for reporting.

### 2. `render()` takes a template string at runtime

No build step means no compile step in the agent loop. A model emits a template and
it renders immediately:

```js
import { render } from '@basenative/server';

render('<template @if="user"><p>{{ user.name }}</p></template>', { user });
```

### 3. The model can check its own output

Reading a syntax is not the same as writing it. BaseNative's syntax is a hybrid of
four ecosystems, and the failure mode for a model is not invention but **confident
regression to the nearest neighbour** — reaching for `v-if` because the syntax
rhymes with Vue's, or Angular 17's `@if (cond) { }` block form because `@if` is a
real directive name here.

So the toolchain catches it:

- **[`@basenative/validate`](packages/validate)** returns structured, repairable
  diagnostics. Every error carries the corrected syntax rather than a description of
  the problem — the design rule is that a model must be able to fix the template
  from the error object alone, with no documentation.
- **[`@basenative/mcp`](packages/mcp)** exposes that to any agent over MCP, so a
  model validates, renders, and checks expressions instead of guessing.
- **[`@basenative/evals`](packages/evals)** measures whether that actually works,
  running a hand-authored corpus against multiple models with and without the
  validation loop.

```js
validateTemplate('<div v-if="isAdmin">…</div>');
// BN_E_FOREIGN_DIRECTIVE — "v-if" is Vue syntax
// fix: <template @if="isAdmin">
```

> **Eval results are not published yet.** The harness ships; the corpus is
> hand-authored and in progress. This README will carry the numbers when they
> exist, not before.

---

## Quick Start

`@basenative/*` publishes to **GitHub Packages**, not npmjs.org. Consuming it needs
a GitHub token with `read:packages` — see
[docs/CONSUMING-FROM-GH-PACKAGES.md](docs/CONSUMING-FROM-GH-PACKAGES.md).

```bash
# .npmrc in your project:
#   @basenative:registry=https://npm.pkg.github.com/
npm install @basenative/runtime @basenative/server
```

> Older `0.2.x`/`0.3.x` builds of some packages remain on npmjs.org from before the
> move. They are stale — [docs/package-inventory.md](docs/package-inventory.md)
> records exactly what is published where.

**Server (Node.js / Cloudflare Workers):**

```js
import { render } from '@basenative/server';

const html = render(`
  <h1>{{ title }}</h1>
  <template @if="user">
    <p>Welcome, {{ user.name }}!</p>
  </template>
  <template @else>
    <p><a href="/login">Sign in</a></p>
  </template>
  <ul>
    <template @for="item of items; track item.id">
      <li>{{ item.name }}</li>
    </template>
  </ul>
`, { title: 'Dashboard', user: { name: 'Alice' }, items });
```

**Client (browser):**

```js
import { signal, computed, effect, hydrate } from '@basenative/runtime';

const count = signal(0);
const doubled = computed(() => count() * 2);

effect(() => console.log(`${count()} → ${doubled()}`));

hydrate(document.getElementById('app'), { count, doubled });
```

---

## Packages

| Package | Description |
|---------|-------------|
| [`@basenative/runtime`](packages/runtime) | Signals, computed, effects, hydration, lazy loading, Web Vitals |
| [`@basenative/server`](packages/server) | SSR — render(), streaming, hydration markers |
| [`@basenative/router`](packages/router) | SSR-aware routing with params, wildcards, query helpers |
| [`@basenative/forms`](packages/forms) | Signal-based field state, validators, Zod adapter |
| [`@basenative/components`](packages/components) | 15 semantic UI components with design token theming |
| [`@basenative/auth`](packages/auth) | Session management, RBAC, password hashing, OAuth providers |
| [`@basenative/db`](packages/db) | Query builder + SQLite/PostgreSQL/D1 adapters |
| [`@basenative/middleware`](packages/middleware) | Pipeline, CORS, rate-limit, CSRF — Hono/Fastify/CF Workers adapters |
| [`@basenative/config`](packages/config) | Env loading, type-safe schema validation |
| [`@basenative/logger`](packages/logger) | Structured logging, multiple transports, child loggers |
| [`@basenative/fetch`](packages/fetch) | Signal-based resource fetching with SSR preload and cache |
| [`@basenative/i18n`](packages/i18n) | ICU message formatting, locale detection, `@t` directive |
| [`@basenative/realtime`](packages/realtime) | SSE + WebSocket with reactive channel management |
| [`@basenative/tenant`](packages/tenant) | Multi-tenant middleware — subdomain, path, header resolvers |
| [`@basenative/upload`](packages/upload) | Multipart upload with R2/S3 storage adapters |
| [`@basenative/notify`](packages/notify) | Email templates + SMTP/SendGrid transports |
| [`@basenative/flags`](packages/flags) | Feature flags with percentage rollouts and user context |
| [`@basenative/date`](packages/date) | Date utilities, formatting, calendar generation |
| [`@basenative/cli`](packages/cli) | `create-basenative` scaffolding and `bn` dev commands |
| [`@basenative/fonts`](packages/fonts) | Font loading utilities |
| [`@basenative/icons`](packages/icons) | Icon system |
| [`@basenative/marketplace`](packages/marketplace) | Component registry (infrastructure; no third-party packages published yet) |
| [`@basenative/visual-builder`](packages/visual-builder) | No-code template builder |
| [`@basenative/validate`](packages/validate) | Structured template diagnostics a model can repair from |
| [`@basenative/mcp`](packages/mcp) | MCP server — validate, render, directive reference, scaffolding |
| [`@basenative/evals`](packages/evals) | Eval harness measuring model output correctness |

---

## Template Directives

```html
<!-- Interpolation -->
<p>Hello, {{ user.name }}!</p>

<!-- Conditional -->
<template @if="isAdmin"><button>Delete</button></template>
<template @else><span>Read-only</span></template>

<!-- Lists with keyed reconciliation -->
<template @for="item of items; track item.id">
  <li>{{ item.name }}</li>
</template>
<template @empty><p>No items.</p></template>

<!-- Switch/case -->
<template @switch="role">
  <template @case="'admin'"><AdminPanel /></template>
  <template @case="'editor'"><EditorTools /></template>
  <template @default><ViewerMode /></template>
</template>

<!-- Dynamic attributes -->
<input :disabled="!canEdit" :class="isActive ? 'active' : ''">
```

---

## CSP-Safe Expression Evaluator

BaseNative never calls `eval` or `new Function`. The expression evaluator supports a deliberate safe subset: property access, method calls, arithmetic, comparison, logical operators, ternary, array/object literals. Move complex logic into named functions in your context object.

---

## Architecture

```
Template (HTML)
    ↓ @basenative/server (Node / Workers)
Rendered HTML + <!--bn:*--> markers
    ↓ @basenative/runtime (browser)
Hydrated DOM with live signal bindings
    ↓ signal updates
Targeted DOM patches (no full re-render)
```

---

## Browser Support

Current evergreen browsers: Chrome, Edge, Firefox, Safari.

---

## Development

```bash
pnpm install
node --test                          # tests in any package directory
npx nx run-many --target=test --all  # all packages via Nx
npx nx run-many --target=lint --all
```

---

## Examples

| Example | Description |
|---------|-------------|
| [`examples/express`](examples/express) | Full Express app with components showcase |
| [`examples/cloudflare-workers`](examples/cloudflare-workers) | Cloudflare Workers with SSR + routing |
| [`examples/node`](examples/node) | Standalone Node.js HTTP server |
| [`examples/enterprise`](examples/enterprise) | Auth + DB + middleware stack |
| [`examples/enterprise-v2`](examples/enterprise-v2) | Multi-tenant enterprise patterns |

---

## Documentation

| Guide | Description |
|-------|-------------|
| [Getting Started](docs/getting-started.md) | Install, first component, routing, SSR |
| [Building a Todo App](docs/guides/todo-app.md) | End-to-end tutorial: SSR + signals + forms + flags |
| [API Reference](docs/api/) | Full API docs for all 23 packages |
| [Migration Guide](docs/migration.md) | Moving from React, Vue, Svelte, or vanilla JS |
| [Accessibility](docs/accessibility.md) | ARIA, keyboard nav, screen reader support |
| [Browser Support](docs/browser-support.md) | Supported browsers and polyfill guidance |
| [Roadmap](docs/roadmap.md) | Upcoming features and milestones |
| [Release Process](docs/releasing.md) | How versions are cut and published |

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Contributions welcome — open an issue first for significant changes. Built on conventional commits with Changesets for versioning.

## Security

See [SECURITY.md](SECURITY.md) for the security policy and how to report vulnerabilities.

## Bundle size

Measured by `scripts/bundle-size.js`, enforced in CI:

| Package | Gzipped | Budget |
|---|---|---|
| `@basenative/runtime` | 8.8KB | 10KB |
| `@basenative/server` | 2.2KB | 16KB |

Zero production dependencies in the runtime.

This is a supporting fact, not the argument. Bundle size is a fight with Svelte
that BaseNative does not need to win — the CSP sandbox and runtime string rendering
are the reasons to use it.

---

## License

Apache 2.0 — see [LICENSE](LICENSE).
