# BaseNative — Product Requirements Document

> **Platform vision** — the spec-first charter covering both the web runtime and the 48V DC
> power track. Sibling documents: [docs/PRD.md](docs/PRD.md) (meta-library scope) and
> [docs/prd-ai-native.md](docs/prd-ai-native.md) (AI-native repositioning). **Which of the
> three governs overall scope is an open owner decision** — see
> `duganlabs-survey/99-open-questions.md` item 1; this file only corrects what the code
> proves wrong within its own scope.
>
> _Last verified against the code: 2026-09-11._

## Vision

BaseNative is an open specifications project that defines how native web primitives should work — and then builds the reference implementations. The web runtime track delivers a signal-based reactivity layer over native `<template>` elements in ~120 lines with zero build step. The power track specifies 48V DC residential bus architecture and USB-C device power standards. Long-term, BaseNative builds reference hardware on its own specs and feeds into Greenput OS as the runtime substrate. Everything is public, spec-first, and designed to be the ground truth that AI agents and humans read the same way.

## Problem

Modern web development is buried under abstraction layers that obscure what the browser already provides. Frameworks ship hundreds of kilobytes of runtime to do what semantic HTML, CSS cascade layers, and a thin reactivity primitive could handle natively. The result: bloated bundles, fragile build pipelines, namespace theater (`app-header`, `app-footer`), and markup that no LLM can reliably parse without framework-specific context. On the hardware side, residential power is still 120/240V AC routed through breaker panels designed in the 1950s, while every device internally converts to DC anyway.

## Users

- **Web developers** who want semantic HTML as their component model with zero framework lock-in
- **AI agents and LLMs** that need W3C-standard markup as immutable ground truth for zero-shot comprehension
- **Hardware designers** adopting 48V DC bus architecture for residential and device applications
- **DuganLabs projects** (Greenput, PendingBusiness) that build on BaseNative as their runtime foundation

## Core Principles

1. **No namespace theater** — Semantic HTML attributes only. W3C primitives are the component model. An LLM should comprehend any BaseNative template in zero shots.
2. **Zero inline styles** — All CSS lives in cascade layers. No `style=""`, no CSS-in-JS, no utility classes.
3. **`display: contents` on host elements** — Flatten the render tree. Wrappers must not affect layout.
4. **Trinity Standard** — State, logic, and template fuse in one file. No splitting a component across three files.
5. **Spec-first** — Every feature starts as a specification. Code is the reference implementation of the spec.
6. **No build step** — The runtime works in a `<script type="module">` tag. ESBuild is optional for production bundling, never required for development.

## Architecture Overview

**Monorepo**: Nx + pnpm workspace with **43** packages under `@basenative/*` (40 publishable, 3 private — see `docs/package-inventory.md`, generated, for the current authoritative count).

**Core packages**:
- `@basenative/runtime` — `signal()`, `computed()`, `effect()`, `hydrate()`. Zero production dependencies.
- `@basenative/server` — `render()` and `stream()` for SSR via `node-html-parser`. Emits hydration markers.
- `@basenative/router` — SSR-aware path routing with named params and wildcards.
- `@basenative/forms` — Signal-based form state with dirty/touched tracking and schema adapters.
- `@basenative/components` — 15 semantic UI components with CSS custom property theming and density scales.
- `@basenative/cli` — `bn` / `create-basenative` scaffolding commands.
- `@basenative/auth` — Authentication and RBAC middleware.

**Template processing pipeline**:
- Server: Parse HTML → interpolate `{{ }}` → evaluate `@if`/`@for`/`@switch` directives → emit with hydration markers.
- Client: Hydrate with context → track signal dependencies → re-render on mutation.
- CSP-safe: Custom expression evaluator (no `eval`, no `new Function`).

**Control flow directives**: `@if`, `@else`, `@for`, `@empty`, `@switch`, `@case`, `@default` — Angular-inspired syntax over native `<template>` elements with keyed reconciliation.

**Additional packages**: `db`, `fetch`, `config`, `logger`, `middleware`, `i18n`, `notify`, `realtime`, `upload`, `tenant`, `icons`, `fonts`, `flags`, `date`, `marketplace`, `visual-builder`.

**Build**: ESBuild for production bundles. Playwright for E2E. Changesets for versioning. GitHub Actions CI/CD.

## Milestones

### Phase 1 — Web Runtime Foundation (Complete)
- Signal primitives with dependency tracking
- Server-side rendering with streaming support
- Client-side hydration with diagnostic API
- 15 semantic components with design token theming
- CLI scaffolding tool
- Express reference example

### Phase 2 — Production Readiness (✅ complete)
Every item below shipped; this phase is done, not current:
- Router with SSR-aware path matching (`@basenative/router`)
- Forms with validation and schema adapters (`@basenative/forms`)
- Auth and RBAC middleware (`@basenative/auth`, `@basenative/auth-webauthn`)
- i18n, realtime, and notification packages (`@basenative/i18n`, `@basenative/realtime`, `@basenative/notify`)
- E2E test coverage with Playwright
- Publishing pipeline via Changesets — corrected: publishes to **GitHub Packages**
  (`.github/workflows/release.yml` sets `registry-url: https://npm.pkg.github.com`), not
  npmjs.org; see `docs/releasing.md`.
- **Baseline Component Expansion** — done: `packages/components/src/{datagrid,dialog,
  layout-grid}.js`. Modals use the native `<dialog>` element (`showModal()`), which gives
  focus trapping for free rather than custom JS — consistent with the "no namespace
  theater" principle above.
- **SSR Streaming Enhancements** — partially done: `@defer` sections stream after the main
  content via script injection (`packages/server/src/{render,stream}.js`,
  `renderToStream`/`renderToReadableStream`). This is not true incremental/out-of-order
  streaming — `renderToStream` still renders the full output synchronously before chunking
  it to the wire (see `docs/limitations.md`).

### Phase 3 — Ecosystem (✅ complete, registry question still open)
- Visual builder for no-code template composition — shipped (`@basenative/visual-builder`,
  `@basenative/builder`).
- Marketplace for community components — the registry infrastructure is shipped
  (`@basenative/marketplace`); no third-party/community packages have been published to it
  yet, so "for community components" is aspirational within a real package.
- Feature flags infrastructure — shipped (`@basenative/flags`, KV-backed providers).
- Plugin system for runtime extensions — shipped: `registerPlugin()`
  (`packages/runtime/src/signals.js`) and the directive registry
  (`registerDirective()`/`packages/runtime/src/shared/directives.js`), consumed by
  `@basenative/flags` and `@basenative/i18n`'s own directives.
- Comprehensive documentation site — not done. The Express example remains the
  docs/showcase surface; a dedicated docs site is unbuilt (see `docs/PRD.md` §7's original
  open question, and `duganlabs-survey/99-open-questions.md` item 6).

### Phase 4 — Power Specifications (3-5 year)
- 48V DC primary bus specification for residential architecture
- USB-C device power delivery standards
- Reference hardware designs on BaseNative specs
- Integration pathway to Greenput OS hardware substrate

### Phase 5 — Reference Hardware (5-10 year)
- Manufacture reference devices on BaseNative power specs
- Greenput OS running on BaseNative hardware
- Vertical integration: spec → runtime → hardware → operating system

## Success Metrics

- **Token reduction**: ~70% fewer tokens vs equivalent React/Angular markup for identical UI
- **Bundle size**: Runtime under 10KB gzipped (measured 9.2KB) with zero production dependencies
- **Zero-shot LLM comprehension**: Any BaseNative template parseable by an LLM without framework-specific training
- **Adoption**: npm download growth, GitHub stars, community component contributions
- **Spec compliance**: W3C primitives as the only API surface — no proprietary abstractions

## Out of Scope

- Building a full-stack framework (BaseNative is a runtime and spec, not a framework)
- Package manager or registry (uses npm)
- Competing with Angular/React/Vue on feature surface area
- Commercial licensing or SaaS revenue (BaseNative is permanently open source)
- Consumer hardware products (BaseNative publishes specs; partners manufacture)

## Open Questions

1. **Power spec governance** — Who reviews and ratifies 48V DC and USB-C specs? Standards body partnership or independent publication?
2. **Visual builder scope** — Does the visual builder ship as a standalone app or as a package consumed by other DuganLabs products?
3. **Marketplace curation** — What quality bar applies to community components in the marketplace?
4. **Hardware timeline** — When does reference hardware R&D begin, and does it require external funding or partnerships?
5. **Greenput dependency boundary** — Which BaseNative packages does Greenput consume today, and which should it wait for?
