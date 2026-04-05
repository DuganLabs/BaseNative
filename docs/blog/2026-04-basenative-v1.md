# BaseNative v1.0: Signal-Based Web Without the Build Tax

*April 2026*

---

We're releasing BaseNative v1.0 today.

BaseNative is a signal-based web framework that treats the browser's own HTML as the component model. No JSX. No virtual DOM. No build step required to get started. The runtime is under 5KB gzipped, and it has zero production dependencies.

This post explains what BaseNative is, why we built it, and what v1.0 includes.

---

## The Problem

Modern JavaScript frameworks solve real problems — but they've also created new ones.

A typical React app in 2026 ships 50-300KB of runtime before you've written a single line of application code. Your CI pipeline requires a build step to produce anything the browser can run. State is scattered across `useState`, `useEffect`, `useContext`, `useReducer`, `useMemo`, `useCallback`, and your choice of one of a dozen state management libraries. Templates live in JSX, which looks like HTML but isn't, and requires a transpiler that understands your build configuration.

We wanted something different: the expressiveness of modern reactive state, combined with the simplicity of just writing HTML.

---

## The Approach

BaseNative's model is simple:

```
Template (HTML)
    ↓ @basenative/server (Node / Workers)
Rendered HTML + <!--bn:*--> hydration markers
    ↓ @basenative/runtime (browser)
Hydrated DOM with live signal bindings
    ↓ signal updates
Targeted DOM patches (no full re-render)
```

**Server side**: you write HTML with `{{ }}` interpolations and `@if`/`@for`/`@switch` directives. The server renders it to a string. No virtual DOM involved.

**Client side**: `hydrate()` walks the rendered DOM, attaches signal bindings, and sets up reactivity. When a signal changes, only the DOM nodes that depend on it update — no diffing, no reconciliation.

**State**: three primitives — `signal()`, `computed()`, and `effect()` — handle everything. If you've used SolidJS or Preact Signals, the model will be familiar.

```js
import { signal, computed, effect, hydrate } from '@basenative/runtime';

const count = signal(0);
const doubled = computed(() => count() * 2);

effect(() => console.log(`${count()} → ${doubled()}`));

hydrate(document.getElementById('app'), {
  count,
  doubled,
  increment: () => count.set(c => c + 1),
});
```

---

## What's in v1.0

v1.0 ships 23 packages covering the full stack:

### Core

- **`@basenative/runtime`** — signals, computed, effects, hydration, lazy strategies, Web Vitals, error boundaries, plugin system
- **`@basenative/server`** — SSR with `render()`, `renderToStream()`, `renderToReadableStream()`

### Application Layer

- **`@basenative/router`** — SSR-aware routing with params, wildcards, query helpers, guards
- **`@basenative/forms`** — signal-based field state, validators, Zod schema adapter
- **`@basenative/components`** — 15 semantic UI components with CSS custom property theming, light/dark mode, density scales

### Infrastructure

- **`@basenative/auth`** — session management, RBAC, password hashing, OAuth providers
- **`@basenative/db`** — query builder with SQLite, PostgreSQL, and Cloudflare D1 adapters
- **`@basenative/middleware`** — pipeline, CORS, rate-limit, CSRF, structured logging
- **`@basenative/config`** — env loading with type-safe schema validation
- **`@basenative/logger`** — structured JSON logging, multiple transports, child loggers

### Features

- **`@basenative/fetch`** — signal-based resource fetching with SSR preload and cache
- **`@basenative/i18n`** — ICU message formatting, locale detection, `@t` directive
- **`@basenative/realtime`** — SSE and WebSocket with reactive channel management
- **`@basenative/tenant`** — multi-tenant middleware with subdomain/path/header resolvers
- **`@basenative/upload`** — multipart parsing with R2 and S3 storage adapters
- **`@basenative/notify`** — email template rendering with SMTP and SendGrid transports
- **`@basenative/flags`** — feature flags with percentage rollouts and user context evaluation
- **`@basenative/date`** — date utilities, formatting, timezone handling, calendar generation

### Tooling

- **`@basenative/cli`** — `create-basenative` scaffolding, `bn` dev commands
- **`@basenative/fonts`**, **`@basenative/icons`** — font loading and icon system
- **`@basenative/marketplace`**, **`@basenative/visual-builder`** — ecosystem foundation

---

## CSP-Safe by Design

One architectural decision we're proud of: the expression evaluator never calls `eval` or `new Function`.

Every `{{ expression }}` in a template is parsed into an AST and interpreted by a small safe evaluator. It supports a deliberate subset: property access, method calls, arithmetic, comparison, logical operators, ternary, array/object literals. Prototype properties (`__proto__`, `constructor`, `prototype`) are blocked at the access level.

This means you can deploy BaseNative apps with a strict Content Security Policy:

```
Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self'
```

No `'unsafe-eval'` required. The runtime has zero external dependencies, keeping the attack surface minimal.

---

## Test Coverage

v1.0 ships with a comprehensive test suite:

- **773 unit tests** across all 23 packages, run on Node.js 18, 20, and 22
- **84 fuzz tests** for the expression evaluator (garbage input, prototype poison strings, deeply nested access, 10,000-char literals, Proxy contexts, circular references)
- **15 cross-package integration tests** covering the full server → runtime → router → forms pipeline

All tests run with Node.js built-in `node:test` — no test framework dependency.

---

## Getting Started

```bash
# Scaffold a new project
npx create-basenative my-app
cd my-app && npm install && npm run dev

# Or install packages directly
npm install @basenative/runtime @basenative/server
```

See the [Getting Started guide](../getting-started.md) for a walkthrough.

---

## Migration from Other Frameworks

If you're coming from React, Vue, Svelte, or plain DOM manipulation, the [Migration Guide](../migration.md) has side-by-side comparisons. The short version:

| What you had | What you get |
|---|---|
| `useState` + `useEffect` | `signal()` + `effect()` |
| JSX + transpiler | `<template>` elements + plain HTML |
| Virtual DOM diffing | Direct DOM patches via signal subscriptions |
| 50-300KB runtime | < 5KB runtime |
| Build pipeline required | `<script type="module">` is enough |

---

## What's Next

The v1.x roadmap:

- **BaseNative Cloud** — hosted deployment with `bn deploy`
- **Component marketplace** — `bn add <community-package>`
- **Visual builder** — drag-and-drop page editing powered by the runtime
- **Advanced components** — data grid, date picker, command palette, combobox

Contributions are welcome. See [CONTRIBUTING.md](../../CONTRIBUTING.md) for the development setup. Open an issue first for significant changes.

---

*BaseNative is released under the Apache 2.0 license. Source on [GitHub](https://github.com/DuganLabs/basenative).*
