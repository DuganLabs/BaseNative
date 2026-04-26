# BaseNative — Product Requirements Document

> Status: **draft** · Owner: Warren Dugan · Last updated: 2026-04-26

## 1. Overview

**BaseNative** is a signal-based web runtime + the meta library for DuganLabs. It's open-source so the org gets infrastructure freebies (free CI minutes, free Cloudflare Pages, free npm publishes). It's also where every shared pattern across DuganLabs projects lives — auth, OG image rendering, virtual keyboard, admin tooling, shared lint/tsconfig, CLI scaffolding (`bn`), Claude Code agents/skills.

Every DuganLabs project consumes BaseNative. When a new shared concern emerges, it goes into BaseNative first, then gets adopted everywhere.

### One-line pitch
"Zero-build, signal-based web runtime, plus everything DuganLabs needs to ship a polished product."

## 2. Goals

1. **Lightweight runtime.** <5KB gzipped signal core. No build step required.
2. **Useful primitives.** Auth, components, router, DB, forms, realtime, OG images, virtual keyboard, admin, persist, share — everything a serious app needs without re-rolling.
3. **CLI-first.** `bn` is the front door. `bn create`, `bn prd`, `bn speckit`, `bn deploy`, `bn doctor`.
4. **Open-source by default.** All packages Apache-2.0. Visible repo. Contribution-friendly.
5. **The meta-repo.** Patterns, eslint configs, tsconfigs, GH Actions templates, Claude Code agents — DuganLabs projects extend from here.

## Non-goals

- Replace React/Vue/Svelte for everyone. BaseNative is for DuganLabs and aligned-philosophy adopters.
- Be a framework with opinions on every decision. We pick a few opinions; the rest is composable.

## 3. Users

### Primary
- DuganLabs project authors (Warren today; future collaborators tomorrow).

### Secondary
- External developers who like the philosophy: signals, semantic HTML, edge-first, minimal deps.

## 4. Key flows

### 4.1 Bootstrap a new project
1. `bn create my-app --template webapp`
2. Project gets eslint config, tsconfig, deploy.yml, sample `wrangler.toml`, BaseNative deps wired.
3. `cd my-app && bn prd init` scaffolds `docs/PRD.md`.
4. Push to GH; auto-deploy via reusable workflow from `DuganLabs/.github`.

### 4.2 Add a feature spec-first
1. `bn speckit init`
2. `bn speckit spec my-feature` — write spec
3. `bn speckit plan` — plan derived from spec
4. `bn speckit tasks` — tasks emit to `.bn/tasks.json`
5. `bn gh sync` — pushes tasks to GH issues

### 4.3 Adopt a new BaseNative package
1. `pnpm add @basenative/<package>`
2. Read its README; follow setup
3. CHANGELOG entries are user-visible release notes per Changesets.

## 5. Data model

N/A — runtime + library.

## 6. Design principles

- **Signals over re-renders.** Reactivity is the runtime, not a hook.
- **Semantic HTML defaults.** `<button>`, `<input>`, `<details>` — not `<div>` everywhere.
- **Edge-first.** Cloudflare Workers / Pages Functions runtime is canonical.
- **Zero hidden cost.** Nothing pulls in heavy transitives. Each package declares its peer deps clearly.
- **Tree-shakeable.** Subpath exports for everything.
- **Easter egg.** Every consumer gets a discreet `<meta name="generator" content="BaseNative">` and a banner comment in source.

## 7. Architecture

- pnpm workspace + Nx
- ~30 packages under `packages/*`
- Tests: Node `--test` runner + Playwright e2e
- CI/CD: lint + test + bundle-size on every PR
- Release: Changesets

## 8. Milestones

### M0 — Foundation (✅ shipped)
- Runtime, server, router, components, forms, fetch
- Auth, db, middleware, upload, tenant, flags, notify, i18n, date
- Visual builder, marketplace, integrations, realtime, logger, markdown
- CLI, fonts, icons, config

### M1 — Shared configs (✅ shipped)
- `@basenative/eslint-config`
- `@basenative/tsconfig`

### M2 — Game / app showcase suite (in progress)
- `@basenative/og-image` (✅ scaffolded)
- `@basenative/keyboard` (✅ scaffolded)
- `@basenative/auth-webauthn`
- `@basenative/admin`
- `@basenative/persist`
- `@basenative/share`
- `@basenative/wrangler-preset`
- `@basenative/doppler`
- `@basenative/claude-config`
- `bn` CLI overhaul: `create`, `prd`, `speckit`, `gh`, `nx`, `dev`, `deploy`, `doctor`

### M3 — Adoption sweep
- t4bs migrates fully onto BaseNative (the reference consumer)
- Other DuganLabs projects extend `eslint-config` + `tsconfig`
- All consume `@basenative/wrangler-preset` for deploys

### M4 — v1.0
- Stabilize public APIs
- Comprehensive docs site
- Public launch + blog post

## 9. Open questions

- Publish to npm under `@basenative/*` (current) or also mirror to JSR?
- A docs site — Astro? Vitepress? Or self-host on BaseNative SSR (eat-our-own-dog-food)?
- Marketplace package — keep dormant or invest after v1?

## 10. Glossary

- **bn** — the BaseNative CLI binary.
- **Easter egg** — the discreet `<meta name="generator">` tag and source banner that anything BaseNative-built carries.
- **Showcase** — t4bs.com, the public reference consumer.
