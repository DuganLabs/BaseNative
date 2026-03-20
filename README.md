# BaseNative

BaseNative is a semantic HTML application runtime for server-rendered interfaces.
It combines:

- signal-based reactivity
- native `<template>` control flow
- server rendering with streaming support
- client-side template hydration
- a CSP-safe expression interpreter
- a complete component library with design tokens

## Packages

| Package | Description |
|---------|-------------|
| `@basenative/runtime` | Core reactivity, template hydration, diagnostics, devtools, error boundaries |
| `@basenative/server` | Server-side rendering with optional streaming |
| `@basenative/router` | SSR-aware client + server routing with params, wildcards, and query helpers |
| `@basenative/forms` | Signal-based field state, validation, and form management |
| `@basenative/components` | 15 semantic UI components with design tokens and theming |

## Quick Start

```bash
pnpm add @basenative/runtime @basenative/server
```

```js
import { render } from '@basenative/server';

const html = render('<h1>{{ title }}</h1>', { title: 'Hello World' });
```

```js
import { signal, hydrate } from '@basenative/runtime';

const count = signal(0);
hydrate(document.body, {
  count,
  increment() { count.set(c => c + 1); },
});
```

See [docs/getting-started.md](docs/getting-started.md) for a complete walkthrough.

## Current Status

### Runtime
- `@if`, `@else`, `@for`, `@empty`, `@switch`, `@case`, `@default`
- keyed `@for ... track ...` reconciliation
- signal, computed, and effect primitives
- CSP-safe expression interpreter (no eval, no new Function)
- browser feature detection (dialog, popover, anchor positioning, base-select)
- hydration diagnostics and mismatch reporting
- devtools hooks (`window.__BASENATIVE_DEVTOOLS__`)
- error boundary system

### Server
- HTML template rendering with expression evaluation
- hydratable SSR markers for diagnostics
- streaming support (Node streams and Web ReadableStream)

### Router
- Path patterns with named params (`:id`) and wildcards (`*path`)
- Nested route support
- SSR-aware route resolution
- Client-side History API navigation
- Query string utilities
- Link interception for SPA navigation

### Forms
- Signal-based field state (value, touched, dirty, errors)
- Built-in validators (required, minLength, maxLength, pattern, email, min, max)
- Schema adapter interface (Zod adapter included)
- Form-level validity, submission, and server error handling

### Components
Button, Input, Textarea, Checkbox, Radio, Toggle/Switch, Select, Alert, Toast, Table, Pagination, Badge, Card, Progress/Spinner, Skeleton

### Design System
- CSS custom properties for color, spacing, typography, radius, shadows
- Light/dark mode (prefers-color-scheme + data-theme override)
- Density scales (compact, default, spacious)

## Expression Model

BaseNative uses a CSP-safe expression interpreter. The runtime supports a deliberate safe subset:

- property access
- function and method calls
- literals, arrays, and plain objects
- arithmetic, comparison, logical, and conditional operators

It does **not** execute arbitrary JavaScript. Move complex logic into named functions.

## Browser Support

BaseNative targets **current evergreen Chrome, Edge, Firefox, and Safari**.

See [docs/browser-support.md](docs/browser-support.md) for the support policy.

## Development

This repository is an Nx + pnpm workspace.

```bash
pnpm install              # Install dependencies
pnpm exec nx run-many --target=test  # Run all tests
pnpm exec nx run-many --target=lint  # Lint all packages
pnpm start                # Start example app
node scripts/bundle-size.js  # Check bundle sizes
```

## Documentation

- [Getting Started](docs/getting-started.md)
- [API Reference](docs/api/)
- [Accessibility](docs/accessibility.md)
- [Roadmap](docs/roadmap.md)
- [Limitations](docs/limitations.md)
- [Migration Guide](docs/migration.md)
- [Release Process](docs/releasing.md)
- [Browser Support](docs/browser-support.md)
- [Contributing](CONTRIBUTING.md)
- [Security](SECURITY.md)

## License

Apache 2.0 — see [LICENSE](LICENSE).
