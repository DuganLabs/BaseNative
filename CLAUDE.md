# CLAUDE.md — BaseNative AI Assistant Guide

## Project Identity

BaseNative is an open specifications project that delivers a signal-based web runtime over native HTML — zero build step, zero production dependencies in the core runtime, ~120 lines for the core primitives. It is the runtime foundation for DuganLabs projects (PendingBusiness, Greenput).

**Monorepo**: Nx + pnpm workspace  
**Package scope**: `@basenative/*`  
**Node.js version**: 22 in CI (`.github/workflows/ci.yml` also runs 20)  
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
├── packages/           # 43 @basenative/* packages (3 private: fonts, evals, icons) — see docs/package-inventory.md
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
│   ├── marketplace/    # Component registry infrastructure (no third-party packages yet)
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
signal(initial); // readable/writable reactive value
computed(fn); // derived signal, lazy with dependency tracking
effect(fn); // auto-tracks reads, re-runs on change, returns cleanup
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

**Always include** the `Co-Authored-By: Claude <model> <noreply@anthropic.com>` trailer for the model in use — the harness states the exact model name at session start; do not hardcode one.

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

1. `@basenative/runtime` must stay under **10KB gzipped** — the budget enforced by
   `scripts/bundle-size.js` in CI. Currently 8.8KB. (The long-standing "<5KB" claim
   was never true against the measured build; the budget has always been 10KB.)
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

## Skills, Subagents, and Delegation

### Installed skill bundles: one, deliberately

Only `nx@nx-claude-plugins` is enabled (registered in `.claude/settings.json`; see the
Nx section below). It costs roughly 590 startup tokens for 7 skills, a ci-monitor
subagent, and the Nx MCP server, and it is enabled because Nx owns task running and
workspace exploration in this repo.

Nothing else is installed — not `superpowers-dev`, `mattpocock`, `builder-skills`, or
`anthropic-agent-skills`. Every installed skill's name and description loads into
context at session start whether or not it fires, so startup context is treated here
as a budget.

Bundles evaluated and rejected, recorded so the decision is not re-litigated:

- **`superpowers-dev`** — best value density available (14 skills, ~538 startup tokens),
  but it is all-or-nothing, and two of its skills rewrite baseline behavior:
  `using-superpowers` demands skill invocation _before any response including clarifying
  questions_, and `brainstorming` declares "You MUST use this before any creative work."
  In a repo where the human hand-authors the eval corpus, a skill that auto-hijacks every
  creative turn is a liability, not a feature.
- **`mattpocock`** — 37 skill descriptions (~1,461 startup tokens) to obtain roughly two
  useful skills; most of the rest assume a configured external issue tracker.

**Do not add a marketplace without deleting something first.** State the startup-token
cost in the PR description.

The `postinstall` hook that used to auto-install the Nx agent skills was removed, and
must not be reintroduced: it refetched an unpinned remote bundle on every install and
kept resurrecting the vendor skill folders deleted in `d03a2a7`, `c31cb33`, and
`1056c02`. The same skills are now declared through the supported plugin mechanism in
`.claude/settings.json`, which is version-controlled, reviewable, and does not run on
every `pnpm install`.

### Precedence — who owns which request

For each request below, exactly one owner acts. Anything in "must not fire" is wrong for
that request even if its description seems to match. "Use the appropriate skill" is not a
rule and does not resolve anything.

| When the request is…                       | Owner                                                                                              | Must NOT fire                                                                                           |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| "review my changes / this PR"              | built-in `/code-review`                                                                            | any third-party code-review skill; `/simplify`                                                          |
| "clean this up", "simplify", "DRY this"    | built-in `/simplify`                                                                               | `/code-review` — it hunts bugs, this is quality-only                                                    |
| "is this safe", "security review"          | built-in `/security-review`                                                                        | `/code-review`                                                                                          |
| "run it", "start the app", "screenshot it" | built-in `/run`                                                                                    | `bn-deploy` — running locally is not deploying                                                          |
| "deploy", "ship to Cloudflare"             | `.claude/commands/bn-deploy.md`                                                                    | `/run`; never auto-fire — deploys are `ask`-gated in `.claude/settings.json`                            |
| "write a PRD"                              | `.claude/agents/prd-author.md` → writes `docs/PRD.md`                                              | `speckit-spec-author`; do not touch `PRD.md` or `docs/prd-ai-native.md`                                 |
| "turn the PRD into issues"                 | `packages/claude-config/skills/prd-driven-issue.md`                                                | `prd-author` — the PRD already exists                                                                   |
| "write a spec"                             | `.claude/commands/bn-spec.md` / `speckit-spec-author`                                              | `prd-author`                                                                                            |
| "add a BaseNative package"                 | `.claude/agents/basenative-package-author.md`                                                      | generic scaffolding; see "No new packages" above                                                        |
| "set up hooks / permissions / settings"    | built-in `update-config` → edit `packages/claude-config/settings/settings.template.json` **first** | editing `.claude/settings.json` alone — it is generated from that template and your change will be lost |
| "write or edit a skill"                    | this section + `packages/claude-config/README.md`                                                  | any external skill-authoring skill                                                                      |
| "update llms.txt / API docs"               | `scripts/llms-txt.js` (regenerate)                                                                 | hand-editing `llms.txt` or `llms-full.txt` — both are generated and CI fails on drift                   |
| "update the package inventory"             | `scripts/package-inventory.js`                                                                     | hand-editing `docs/package-inventory.md` — same reason                                                  |
| anything touching the eval corpus          | **the human owner. No skill, no agent.**                                                           | everything — see below                                                                                  |

### Never delegate — hand-authored artifacts

Eval prompts, reference implementations, test fixtures, and behavioral assertions are
**authored by hand by the repo owner**. No skill and no subagent may generate them, at
any model tier.

Agents may mechanically expand from an existing hand-written seed — varying a parameter
across cases the human already specified. Agents may **not** decide what correct looks
like.

Cheap delegation does not create an exception. A `haiku` subagent deciding what a correct
assertion is commits the same self-consistency failure as an `opus` one, just for less
money: if the model writes the prompt, the reference output, _and_ the assertion, the
eval measures the model against itself and returns a high, meaningless number.

This applies to `packages/evals/prompts/` and `packages/evals/fixtures/` absolutely. If
either appears to be missing a file, **report it — do not generate one.**

### Orchestrator-only files

Subagents must never edit these. Report the needed change upward instead:

- `package.json`, `pnpm-workspace.yaml`, `pnpm-lock.yaml`, `nx.json`
- `CHANGELOG.md`, `.changeset/*`
- `.github/workflows/*`
- `eslint.config.js`, `.prettierrc`

### Module ownership — one owner per module per phase

Two agents must never hold the same directory at once.

| Module               | Owner                                                                      |
| -------------------- | -------------------------------------------------------------------------- |
| `packages/validate/` | validator agent                                                            |
| `packages/evals/`    | eval-harness agent (infrastructure only — never `prompts/` or `fixtures/`) |
| `packages/mcp/`      | mcp agent                                                                  |
| `docs/`, `llms*.txt` | docs agent                                                                 |

### Delegation policy

Delegation has a measured floor of **~25–30k tokens** per subagent just to spin up.
Delegating a task cheaper than that costs more than it saves. Split by what is actually
scarce:

- **Capability-scarce → stays in the main session (`opus`):** architecture and taxonomy
  design, resolving conflicting subagent reports, deciding what "correct BaseNative"
  means, final review before any claim of completion.
- **Token-scarce → delegate:** repository inventory, broad search, docs extraction, log
  and test-output reduction, bounded mechanical edits, high-volume test scaffolding from
  a specified pattern. `sonnet` for bulk implementation, `haiku` for mechanical volume.
- **Highest-stakes correctness → `fable`,** reserved for adversarial review of the
  expression evaluator (it is the security boundary for the whole AI-native thesis, and
  must be audited by a run that did not write it).

Write every delegated prompt as a self-contained handoff packet — assume the subagent has
seen none of the conversation. Include: repo path, exact objective, in-scope files,
explicit out-of-scope, the evidence format to return, verification commands, and stop
conditions. Require a summary back, never full file contents; subagent output lands in
the parent context.

Give every subagent explicit stop conditions. It must stop and report rather than
improvise when: the live code contradicts an assumption in the handoff, a verification
command fails twice, the work needs out-of-scope files, or it cannot produce concrete
evidence for a claim.

**Treat subagent reports as leads, not facts.** Before acting on a high-impact finding,
opening a PR, or telling the user work is done, reopen the cited files and confirm the
line references. Let lighter agents gather signal; keep truth-judgment in the main
session.

### Delegation must stay inside Anthropic's model family

Valid subagent tiers are `opus`, `sonnet`, `haiku`, and `fable` only.

Any skill or workflow that would hand work to a non-Anthropic agent — Codex, Gemini CLI,
Cursor, Aider, Copilot — or that requires a third-party API key or a paid external MCP,
must **fail loudly and stop**. It must not silently fall back to doing the work in-session:
a silent fallback produces work the user believes was independently cross-checked when it
was not. Say plainly that the skill is unavailable and why, then stop.

---

## Nx

Precedence, not documentation. The Nx-managed block at the end of this file is generated by
`nx configure-ai-agents` and will be overwritten; this section is hand-maintained and wins
where the two disagree.

- **Nx owns workspace exploration, task running, and dependency questions.** Use the project
  graph (`nx show projects`, `nx graph`, the `nx-workspace` skill) rather than reading config
  files at random or guessing where a project lives. Nothing in this repo should be inventing
  paths — there are 50 projects and the graph is authoritative.
- **Run tasks through Nx**, not the underlying tool: `nx run`, `nx run-many`, `nx affected`.
  Prefix with the workspace package manager (`pnpm nx …`) so the pinned pnpm is used.
- **Scaffolding: `bn generate` / `bn create`, not `nx g`.** This workspace installs only Nx
  core, whose sole generators are `connect-to-nx-cloud` and `set-up-ai-agents` — neither
  creates a library. The real generator is the `bn` CLI, with templates in
  `packages/cli/templates/{library,webapp,worker,t4bs}`, owned by
  `.claude/agents/basenative-package-author.md`. Adding `@nx/js` purely to satisfy `nx g`
  would impose tsconfig/jest/project.json conventions on a deliberately zero-build, ESM,
  `node:test` repo — do not do it without an explicit decision from the owner. New packages
  are still never hand-scaffolded and never copy-pasted from a sibling.
- **File-protection exception.** Nx tooling (`nx g`, `nx add`, `nx migrate`,
  `nx configure-ai-agents`) may modify `nx.json`, `package.json`, and `pnpm-workspace.yaml`.
  Every other skill and subagent still may not. Any such change must be named in the turn
  summary, never made silently.
- **Generator and migration output is not done until verified** by `nx affected --target=lint`
  plus the affected tests. Treat a clean generator run as unverified until those pass.

## Related Projects

- **PendingBusiness** — Business management app built on BaseNative
- **Greenput** — Input/workflow platform built on BaseNative
- **Greenput OS** — Long-term: BaseNative as hardware runtime substrate

---

## Next Steps / AI Backlog

**UPSTREAM DOGFOODING DIRECTIVE**: You are the foundational framework builder. If a downstream consumer app (Greenput, PendingBusiness, DuganLabs) requires a generically useful primitive (a specialized UI component, an auth flow wrapper, a parsing utility), YOU must build it here as an open-source package first.

You will pull from this list when executing autonomously. It was verified against the code on 2026-09-10; re-verify before starting any item, and remove items here when they ship — a stale backlog steers every autonomous run into rebuilding finished work, which is exactly what the previous version of this section did.

### Shipped — do not rebuild

The five epics that used to live here are done. Where each landed:

| Former item | Lives at |
|---|---|
| `@basenative/markdown` zero-dep parser | `packages/markdown/src/{parser,renderer,markdown}.js` |
| Calendar component | `packages/components/src/calendar.js`, `calendar-state.js` |
| Plaid wrapper + yield optimisation | `packages/integrations/src/{plaid,yield}.js` |
| `effect()` 10k-node benchmark | `benchmarks/effect-dom-nodes.bench.js` |
| `batch()` and diamond-dependency tests | `packages/runtime/src/signals.js`, `diamond.test.js` |
| `@defer` SSR streaming + hydrate link | `packages/server/src/render.js`, `packages/runtime/src/hydrate.js` (`data-bn-defer`) |
| Visual builder, `<bn-canvas>` | `packages/visual-builder/src/`, `packages/builder/src/` |
| Feature flags on KV, `registerPlugin()` | `packages/flags/src/providers/kv.js`, `packages/runtime/src/signals.js` |

An abandoned parallel builder implementation is preserved at tag `archive/feat-visual-builder-2026-04`; it is not a backlog item.

### Open — specified well enough to start without asking

1. **Eval harness: score stateful (T3) cases.** `packages/evals` validates and SSR-renders but never hydrates, so signal/computed/effect behaviour is unscored. Add a `hydrate()` stage under a DOM shim, injected like `render` already is. Infrastructure only — the corpus stays human-authored (see "Never delegate").
2. **Documentation drift**, recorded mechanically in the Gaps section of `llms-full.txt` (regenerate with `scripts/llms-txt.js`): ~30 undocumented `@basenative/components` exports; runtime `devtools`/`debug`/`lazy`/`vitals`/`plugins`/`error-boundary` exports missing from `docs/api/runtime.md`; `createKVProvider` missing from `docs/api/flags.md`.
3. **`@t` and `@feature` are described as template directives** in the `i18n` and `flags` package descriptions but are registered nowhere in source. Either implement them as directives or correct the descriptions — do not leave the claim.
4. **CodeQL backlog on `main`** (79 pre-existing alerts; a PR from `fix/codeql-backlog` is in flight — check it first): `packages/notify/src/email.js` interpolates `{{ }}` into HTML email with no escaping (same class as the SSR fix in `@basenative/server`); `packages/notify/src/transports/smtp.js` sets `rejectUnauthorized: false`; `packages/share/src/server.js` `shortId` has modulo bias; eleven file-system races in `cli`, `claude-config`, `doppler`; path injection in `examples/starter` and `scripts/audit`.
5. **basenative.com dead code**: `PACKAGES` / `renderPackageCards()` / `packageCards` in `examples/express/showcase-data.js` are referenced by no view. Wire `packageCards` into `views/showcase.html` or delete them.
6. **Escaping parity**: `packages/notify` should use `@basenative/runtime/shared/escape` rather than its own regex templating, once item 4 lands.
7. **`.tabnine/agent/skills/`** is a committed third copy of the seven Nx skills now supplied by the `nx@nx-claude-plugins` plugin. Remove once the owner confirms nothing consumes it.

### Needs owner direction — do not guess

- The eval corpus (`packages/evals/prompts/`, `fixtures/`) — PRD W2. Human-authored only.
- The launch essay (PRD W5.4) — blocked on eval results that do not exist yet.
- The registry question: 17 packages have never been published anywhere and none is at 1.0 (`docs/package-inventory.md`). Publish, or mark private, is a per-package product call.

## General Guidelines for working with Nx

- For navigating/exploring the workspace, invoke the `nx-workspace` skill first - it has patterns for querying projects, targets, and dependencies
- When running tasks (for example build, lint, test, e2e, etc.), always prefer running the task through `nx` (i.e. `nx run`, `nx run-many`, `nx affected`) instead of using the underlying tooling directly
- Prefix nx commands with the workspace's package manager (e.g., `pnpm nx build`, `npm exec nx test`) - avoids using globally installed CLI
- You have access to the Nx MCP server and its tools, use them to help the user
- For Nx plugin best practices, check `node_modules/@nx/<plugin>/PLUGIN.md`. Not all plugins have this file - proceed without it if unavailable.
- NEVER guess CLI flags - always check nx_docs or `--help` first when unsure

## Scaffolding & Generators

- For scaffolding tasks (creating apps, libs, project structure, setup), ALWAYS invoke the `nx-generate` skill FIRST before exploring or calling MCP tools

## When to use nx_docs

- USE for: advanced config options, unfamiliar flags, migration guides, plugin configuration, edge cases
- DON'T USE for: basic generator syntax (`nx g @nx/react:app`), standard commands, things you already know
- The `nx-generate` skill handles generator discovery internally - don't call nx_docs just to look up generator syntax

<!-- nx configuration end-->
