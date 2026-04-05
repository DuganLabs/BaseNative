# BaseNative

**A signal-based web runtime over native HTML — zero build step, zero production dependencies.**

BaseNative makes the browser's own primitives the component model. A `<template>` element is the component. A `{{ }}` interpolation is the binding. `signal()` is the state. No JSX, no virtual DOM, no namespace theater.

[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)
[![npm](https://img.shields.io/npm/v/@basenative/runtime)](https://www.npmjs.com/package/@basenative/runtime)

---

## Why BaseNative?

| Problem | BaseNative |
|---------|------------|
| Frameworks ship 50-300KB of runtime | Core runtime is < 5KB gzipped |
| Build pipelines break, lock you in | No build step — `<script type="module">` is enough |
| JSX/template syntax is proprietary | Standard HTML — any LLM reads it in zero shots |
| State is tangled across multiple files | Trinity Standard — state + logic + template in one file |
| CSS-in-JS pollutes markup | Zero inline styles — cascade layers only |

---

## Quick Start

```bash
npm install @basenative/runtime @basenative/server
```

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
| [`@basenative/marketplace`](packages/marketplace) | Community component registry |
| [`@basenative/visual-builder`](packages/visual-builder) | No-code template builder |

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

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Built on conventional commits with Changesets for versioning.

## Security

See [SECURITY.md](SECURITY.md) for the security policy and how to report vulnerabilities.

## License

Apache 2.0 — see [LICENSE](LICENSE).
