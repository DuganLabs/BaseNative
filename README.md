# BaseNative

**An Apple-grade design system in plain HTML & CSS.**

BaseNative is an open-source design system kit that ships as code, not as a
drawing file: 47 accessible components on real HTML elements, in light and dark,
from a 320px phone to a desktop, on a signal runtime under 10 KB gzip with zero
dependencies in core.

- **Apple-grade design.** One type scale, light and dark, 44px touch targets.
  [Browse the components](https://basenative.com/components).
- **All in code.** Platform design kits are files you rebuild by hand; every
  BaseNative component is a template, a token sheet and a view model you install.
- **Open source.** Apache-2.0, published on npm.
- **Web standards.** `<button>`, `<dialog>`, `<details>`, `<table>` and the popover
  API. No build step, no virtual DOM.
- **AI-safe.** Templates are data the runtime never evals, so generated UI runs
  under a strict CSP.
- **Agent-ready.** `npx -p @basenative/cli bn create my-app`, an MCP server
  (`@basenative/mcp`) and [llms.txt](https://basenative.com/llms.txt) put it in an
  agent's loop. See [basenative.com/ai](https://basenative.com/ai).

```sh
npm install @basenative/runtime @basenative/components
```

[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](https://nodejs.org)
[![Tests](https://github.com/DuganLabs/basenative/actions/workflows/ci.yml/badge.svg)](https://github.com/DuganLabs/basenative/actions/workflows/ci.yml)

---

## Built for generated UI

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

`@basenative/*` publishes to **npmjs.org**. No token and no `.npmrc`.

```bash
npm install @basenative/runtime @basenative/server
```

> The `0.2.x`/`0.3.x` builds are the old pre-1.0 line, not the current release.
> [docs/package-inventory.md](docs/package-inventory.md) records what is published.
> [docs/CONSUMING-FROM-GH-PACKAGES.md](docs/CONSUMING-FROM-GH-PACKAGES.md) describes
> the retired GitHub Packages setup and is out of date.

**Server (Node.js / Cloudflare Workers):**

```js
import { render } from '@basenative/server';

const html = render(
  `
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
`,
  { title: 'Dashboard', user: { name: 'Alice' }, items },
);
```

**Client (browser):**

```js
import { signal, computed, effect, hydrate } from '@basenative/runtime';

const count = signal(0);
const doubled = computed(() => count() * 2);

effect(() => console.log(`${count()} → ${doubled()}`));

hydrate(document.getElementById('app'), { count, doubled });
```

### For a model about to write UI

Read [docs/llm/START.md](docs/llm/START.md) first (deployed as `/llms-start.txt`). The honest scorecard of weaknesses is [/ai](https://basenative.com/ai). A single file with no build is [examples/cdn/index.html](examples/cdn/index.html), loading `@basenative/runtime@2` from jsDelivr. `AGENTS.md` restates the rules that keep a first draft valid.

---

## Packages

| Package                                                   | Description                                                                                                                           |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| [`@basenative/runtime`](packages/runtime)                 | Signals, computed, effects, hydration, lazy loading, Web Vitals                                                                       |
| [`@basenative/server`](packages/server)                   | SSR — render(), streaming, hydration markers                                                                                          |
| [`@basenative/router`](packages/router)                   | SSR-aware routing with params, wildcards, query helpers                                                                               |
| [`@basenative/forms`](packages/forms)                     | Signal-based field state, validators, Zod adapter                                                                                     |
| [`@basenative/components`](packages/components)           | 15 semantic UI components with design token theming                                                                                   |
| [`@basenative/auth`](packages/auth)                       | Session management, RBAC, password hashing, OAuth providers                                                                           |
| [`@basenative/db`](packages/db)                           | Query builder + SQLite/PostgreSQL/D1 adapters                                                                                         |
| [`@basenative/hmr`](packages/hmr)                         | Dev-only hot module replacement — patches the DOM, keeps focus and caret                                                              |
| [`@basenative/middleware`](packages/middleware)           | Pipeline, CORS, rate-limit, CSRF — Hono/Fastify/CF Workers adapters                                                                   |
| [`@basenative/config`](packages/config)                   | Env loading, type-safe schema validation                                                                                              |
| [`@basenative/logger`](packages/logger)                   | Structured logging, multiple transports, child loggers                                                                                |
| [`@basenative/fetch`](packages/fetch)                     | Signal-based resource fetching with SSR preload and cache                                                                             |
| [`@basenative/i18n`](packages/i18n)                       | ICU message formatting, locale detection, `@t` directive                                                                              |
| [`@basenative/realtime`](packages/realtime)               | SSE + WebSocket with reactive channel management                                                                                      |
| [`@basenative/tenant`](packages/tenant)                   | Multi-tenant middleware — subdomain, path, header resolvers                                                                           |
| [`@basenative/upload`](packages/upload)                   | Multipart upload with R2/S3 storage adapters                                                                                          |
| [`@basenative/notify`](packages/notify)                   | Email templates + SMTP/SendGrid transports                                                                                            |
| [`@basenative/flags`](packages/flags)                     | Feature flags with percentage rollouts and user context                                                                               |
| [`@basenative/date`](packages/date)                       | Date utilities, formatting, calendar generation                                                                                       |
| [`@basenative/cli`](packages/cli)                         | `create-basenative` scaffolding and `bn` dev commands                                                                                 |
| [`@basenative/fonts`](packages/fonts)                     | Font loading utilities                                                                                                                |
| [`@basenative/icons`](packages/icons)                     | Icon system                                                                                                                           |
| [`@basenative/marketplace`](packages/marketplace)         | Component registry (infrastructure; no third-party packages published yet)                                                            |
| [`@basenative/visual-builder`](packages/visual-builder)   | No-code template builder                                                                                                              |
| [`@basenative/validate`](packages/validate)               | Structured template diagnostics a model can repair from                                                                               |
| [`@basenative/mcp`](packages/mcp)                         | MCP server — validate, render, directive reference, scaffolding                                                                       |
| [`@basenative/evals`](packages/evals)                     | Eval harness measuring model output correctness (private)                                                                             |
| [`@basenative/admin`](packages/admin)                     | Protected-route helpers, RBAC primitives, audit-log middleware, queue-review UI                                                       |
| [`@basenative/auth-webauthn`](packages/auth-webauthn)     | WebAuthn (passkey) adapter for `@basenative/auth` — server, client, Workers/Pages handlers                                            |
| [`@basenative/builder`](packages/builder)                 | Signal-based drag-and-drop layout builder that emits BaseNative template code                                                         |
| [`@basenative/claude-config`](packages/claude-config)     | Bundled Claude Code subagents, skills, and settings for DuganLabs/BaseNative projects                                                 |
| [`@basenative/combobox`](packages/combobox)               | Accessible combobox — typeahead filtering + create-new-entry, WAI-ARIA combobox pattern                                               |
| [`@basenative/doppler`](packages/doppler)                 | Thin DX layer around Doppler — local-dev wrapper, CI helper, project bootstrap                                                        |
| [`@basenative/eslint-config`](packages/eslint-config)     | Shared ESLint flat-config for DuganLabs projects                                                                                      |
| [`@basenative/favicon`](packages/favicon)                 | SVG-first favicon generator + manifest/link-tag primitives                                                                            |
| [`@basenative/integrations`](packages/integrations)       | Headless third-party integration wrappers                                                                                             |
| [`@basenative/keyboard`](packages/keyboard)               | Accessible mobile-first on-screen virtual keyboard, signal-driven key state                                                           |
| [`@basenative/markdown`](packages/markdown)               | Zero-dependency ES module markdown parser + SSR-safe HTML renderer                                                                    |
| [`@basenative/og-image`](packages/og-image)               | Worker-runtime OG/social share PNG renderer — satori + resvg-wasm                                                                     |
| [`@basenative/persist`](packages/persist)                 | Signal-driven local persistence with TTL, conflict resolution, server rehydrate                                                       |
| [`@basenative/share`](packages/share)                     | Native Web Share + clipboard fallback, share-card mint client+server                                                                  |
| [`@basenative/station`](packages/station)                 | Queue-driven local-inference primitive — vLLM/Workers AI job runner                                                                   |
| [`@basenative/theme`](packages/theme)                     | The theme layer behind `components` — token tiers, a WCAG contrast harness that fails the build, icon discipline, the `--bn-*` bridge |
| [`@basenative/tsconfig`](packages/tsconfig)               | Shared base tsconfigs for DuganLabs projects                                                                                          |
| [`@basenative/wrangler-preset`](packages/wrangler-preset) | Pinned Wrangler version + typed `wrangler.toml` fragment generator                                                                    |

47 packages total (47 publishable, 0 private) — see
[docs/package-inventory.md](docs/package-inventory.md) for the generated, always-current
list with exact versions and publish state.

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
<input :disabled="!canEdit" :class="isActive ? 'active' : ''" />
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

| Example                                                      | Description                               |
| ------------------------------------------------------------ | ----------------------------------------- |
| [`examples/express`](examples/express)                       | Full Express app with components showcase |
| [`examples/cloudflare-workers`](examples/cloudflare-workers) | Cloudflare Workers with SSR + routing     |
| [`examples/node`](examples/node)                             | Standalone Node.js HTTP server            |
| [`examples/enterprise`](examples/enterprise)                 | Auth + DB + middleware stack              |
| [`examples/enterprise-v2`](examples/enterprise-v2)           | Multi-tenant enterprise patterns          |

---

## Documentation

| Guide                                                                                        | Description                                                                                                                                                                                               |
| -------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Getting Started](docs/getting-started.md)                                                   | Install, first component, routing, SSR                                                                                                                                                                    |
| [Building a Todo App](docs/guides/todo-app.md)                                               | End-to-end tutorial: SSR + signals + forms + flags                                                                                                                                                        |
| [API Reference](docs/api/)                                                                   | Full API docs — one page per package (47 packages; see [docs/package-inventory.md](docs/package-inventory.md))                                                                                            |
| [Migration Guide](docs/migration.md)                                                         | Moving from React, Vue, Svelte, or vanilla JS                                                                                                                                                             |
| [Accessibility](docs/accessibility.md)                                                       | ARIA, keyboard nav, screen reader support                                                                                                                                                                 |
| [Browser Support](docs/browser-support.md)                                                   | Supported browsers and polyfill guidance                                                                                                                                                                  |
| [Roadmap](docs/roadmap.md)                                                                   | Upcoming features and milestones                                                                                                                                                                          |
| [Release Process](docs/releasing.md)                                                         | How versions are cut and published                                                                                                                                                                        |
| [Package Inventory](docs/package-inventory.md)                                               | Generated, always-current package/version/publish-state list                                                                                                                                              |
| [PRD.md](PRD.md), [docs/PRD.md](docs/PRD.md), [docs/prd-ai-native.md](docs/prd-ai-native.md) | Three coexisting PRDs (platform vision / meta-library / AI-native repositioning); each states its own scope and cross-links the others, but which governs overall project scope is an open owner decision |

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Contributions welcome — open an issue first for significant changes. Built on conventional commits with Changesets for versioning.

## Security

See [SECURITY.md](SECURITY.md) for the security policy and how to report vulnerabilities.

## Bundle size

Measured by `scripts/bundle-size.js`, enforced in CI:

| Package               | Budget |
| --------------------- | ------ |
| `@basenative/runtime` | 10KB   |
| `@basenative/server`  | 16KB   |

The gzipped figure is whatever `node scripts/bundle-size.js` prints. Do not
copy it into this table — a copied figure goes stale, and `/compare` already
reads the measurement.

Zero production dependencies in the runtime.

This is a supporting fact, not the argument. Bundle size is a fight with Svelte
that BaseNative does not need to win — the CSP sandbox and runtime string rendering
are the reasons to use it.

---

## License

Apache 2.0 — see [LICENSE](LICENSE).

---

_Last verified against the code: 2026-09-11._
