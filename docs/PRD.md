# BaseNative — Product Requirements Document

> Status: **draft** · Owner: Warren Dugan · Last updated: 2026-09-11 (milestones + architecture corrected against the code)
>
> **Meta-library scope** — BaseNative as shared infrastructure for DuganLabs projects. This is
> the path `bn prd` and the PRD-driven agents read. Sibling documents: [../PRD.md](../PRD.md)
> (platform vision) and [prd-ai-native.md](prd-ai-native.md) (AI-native repositioning). **Which
> of the three governs overall scope is an open owner decision** — see
> `duganlabs-survey/99-open-questions.md` item 1. This file corrects only what the code proves
> wrong within its own scope; it does not resolve that precedence question.

## 1. Overview

**BaseNative** is a signal-based web runtime + the meta library for DuganLabs. It's open-source so the org gets infrastructure freebies (free CI minutes, free Cloudflare Pages, free npm publishes). It's also where every shared pattern across DuganLabs projects lives — auth, OG image rendering, virtual keyboard, admin tooling, shared lint/tsconfig, CLI scaffolding (`bn`), Claude Code agents/skills.

Every DuganLabs project consumes BaseNative. When a new shared concern emerges, it goes into BaseNative first, then gets adopted everywhere.

### One-line pitch
"Zero-build, signal-based web runtime, plus everything DuganLabs needs to ship a polished product."

## 2. Goals

1. **Lightweight runtime.** 9.2KB gzipped signal core (10KB CI budget). No build step required.
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
- **43** packages under `packages/*` (40 publishable, 3 private — see
  `docs/package-inventory.md`, generated and authoritative for the current count/versions)
- Tests: Node `--test` runner + Playwright e2e
- CI/CD: lint + test + bundle-size on every PR
- Release: Changesets, publishing to **GitHub Packages** (not npmjs.org — see
  `docs/releasing.md`)

## 8. Milestones

### M0 — Foundation (✅ shipped)
- Runtime, server, router, components, forms, fetch
- Auth, db, middleware, upload, tenant, flags, notify, i18n, date
- Visual builder, marketplace, integrations, realtime, logger, markdown
- CLI, fonts, icons, config

### M1 — Shared configs (✅ shipped)
- `@basenative/eslint-config`
- `@basenative/tsconfig`

### M2 — Game / app showcase suite (✅ shipped)
All nine items here are done, not "in progress" — verified in the package inventory and
against t4bs's own dependencies:
- `@basenative/og-image` — published (0.2.1); t4bs evaluated it and deliberately does **not**
  use it (satori's `harfbuzzjs` is incompatible with the Workers runtime — see
  `t4bs/functions/_shared/og.js`'s file header). Package ships; one consumer opted out for a
  documented technical reason.
- `@basenative/keyboard`, `@basenative/auth-webauthn`, `@basenative/admin`, `@basenative/persist`,
  `@basenative/share` — published and live in t4bs's `package.json`/import sites.
- `@basenative/wrangler-preset`, `@basenative/doppler`, `@basenative/claude-config` — published
  (`docs/package-inventory.md`); consumer adoption not verified beyond publication.
- `bn` CLI overhaul — all eight subcommands exist: `packages/cli/src/commands/{create,prd,
  speckit,gh,nx,dev,deploy,doctor}.js`, wired in `packages/cli/src/index.js`.

### M3 — Adoption sweep (✅ shipped, for t4bs)
- t4bs migrates fully onto BaseNative — **done**. BaseNative SSR (`@basenative/server` +
  `@basenative/router` + `@basenative/runtime`) is t4bs's default render path for every route,
  not a `?next=1` opt-in; see `t4bs/CLAUDE.md` and `t4bs/docs/PRD.md` §7-8 (also corrected
  2026-09-11).
- Other DuganLabs projects extending `eslint-config`/`tsconfig`, and adopting
  `@basenative/wrangler-preset` for deploys — not verified in this pass across GreenPut/
  PendingBusiness/warrendugan; treat as still open until checked per-repo.

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

---

_Last verified against the code: 2026-09-11._
