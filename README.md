# BaseNative

BaseNative is a semantic HTML application runtime for server-rendered interfaces.
It combines:

- signal-based reactivity
- native `<template>` control flow
- server rendering
- client-side template hydration
- a CSP-safe expression interpreter

BaseNative is currently a **pilot-stage `v0.x` framework**. It is not positioned as a drop-in Angular or React replacement today. The current work is focused on trust blockers first: security, keyed reconciliation, hydration diagnostics, browser support policy, docs, and release hygiene.

## Current Status

- `@if`, `@else`, `@for`, `@empty`, `@switch`, `@case`, `@default`
- keyed `@for ... track ...` reconciliation in the runtime
- signal, computed, and effect primitives
- SSR via `@basenative/server`
- client-side template hydration via `@basenative/runtime`
- browser feature detection helpers for `dialog`, `popover`, anchor positioning, and `base-select`
- hydratable SSR markers for diagnostics and future hydration work

## What This Repo Is

Best current fit:

- server-rendered internal workflow UIs
- semantic component/system experiments
- low-JS dashboards and CRUD tools
- progressive enhancement on top of standard HTML

Not yet complete:

- router package
- forms package
- validation adapters
- enterprise component catalog
- full SSR DOM reuse hydration
- devtools

## Expression Model

BaseNative no longer uses `new Function(...)` for template expressions or event handlers.

The runtime supports a deliberate safe subset:

- property access
- function and method calls
- literals
- arrays and plain objects
- arithmetic, comparison, logical, and conditional operators

It does **not** aim to execute arbitrary JavaScript source inside templates. If an interaction needs complex logic, move that logic into a named function in your script and call the function from the template.

Good:

```html
<button @click="incrementCount()">Increment</button>
<button @click="deleteTask(task.id)">Delete</button>
<input @input="updateMessage($event.target.value)">
```

Avoid:

```html
<button @click="count.set(c => c + 1)">Increment</button>
<input @keydown="if ($event.key === 'Enter') save()">
```

## Browser Support

BaseNative currently targets **current evergreen Chrome, Edge, Firefox, and Safari**.

Modern platform features are treated as optional enhancements:

- `<dialog>`: native when available
- Popover API: feature-detected
- CSS anchor positioning: feature-detected
- `appearance: base-select`: optional enhancement only

See [docs/browser-support.md](docs/browser-support.md) for the support policy.

## Packages

- `@basenative/runtime`
  Core reactivity, template hydration, diagnostics, and browser feature detection.
- `@basenative/server`
  Server-side rendering for BaseNative templates, plus optional hydratable marker output.

## Development

This repository is an Nx + pnpm workspace. The runtime itself stays small, but the workspace and examples use standard tooling.

See:

- [docs/roadmap.md](docs/roadmap.md)
- [docs/limitations.md](docs/limitations.md)
- [CONTRIBUTING.md](CONTRIBUTING.md)
- [SECURITY.md](SECURITY.md)
