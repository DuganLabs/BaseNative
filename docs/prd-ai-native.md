# PRD — BaseNative as an AI-Native UI Runtime

**Owner:** Warren Dugan / DuganLabs
**Status:** Draft for planning
**Target window:** 6 weeks
**Repo:** `DuganLabs/BaseNative`
**Scope:** repositioning only. For the platform vision see [../PRD.md](../PRD.md); for the meta-library scope see [PRD.md](PRD.md).

---

> **Verified 2026-09-09.** Three figures in §1 were carried over from the README and do not
> match the repo:
>
> | Claim | Actual |
> |---|---|
> | 23 packages | **40** under `packages/` |
> | v1.0 shipped | **nothing is at 1.0 on npm** — 22 packages published one minor behind local, 18 never published |
> | 1,461 tests | **2,595** passing across 36 packages (verified locally, all green) |
>
> The argument in §1 is unaffected (40 packages strengthens the surface-area case), but §3's
> `llms-full.txt` budget and W0.4 are sized against the real numbers, not these.

## 1. Problem

BaseNative is a technically complete web runtime — 23 packages, 1,461 tests, v1.0 shipped — with zero external adopters. It is currently positioned as a lightweight alternative to React/Vue/Svelte. That is a distribution fight it will lose: elegance and bundle size are commodity arguments in a category decided by ecosystem gravity.

One line in the README describes a position nobody else occupies:

> Standard HTML — any LLM reads it in zero shots

Two properties already in the codebase make that more than a slogan:

1. **CSP-safe expression evaluator.** No `eval`, no `new Function`, deliberate expression subset. Model-generated templates structurally cannot execute arbitrary JavaScript.
2. **`render()` accepts a template string at runtime.** No build step means no compile step in the agent loop. A model can emit a template and it renders immediately.

Together: *the only UI runtime where a model can generate interface at inference time, without a build, and without an escape hatch to arbitrary code.* Every production generative-UI system today pre-registers a fixed component set and has the model pick from it. BaseNative can stream arbitrary UI.

**The claim is currently unverifiable.** There is no measurement of whether models actually produce correct BaseNative, no tooling for a model to check itself, and no machine-readable spec. This PRD closes that.

### The falsification already in hand

Read cold, BaseNative's syntax is a hybrid of four ecosystems: `{{ }}` (Vue/Angular), `@for="item of items; track item.id"` (Angular 17, near-verbatim), `:disabled` (Vue), `signal()/computed()/effect()` (Solid/Angular), `<template @if>` (Vue). Familiarity makes it trivially *readable*. It also makes the failure mode **confident regression to the nearest neighbor** — a model under load emits `v-if`, or Angular's `@if (cond) { }` block syntax, or `$state`, and nothing in the toolchain flags it.

Reading ≠ writing. The README conflates them. Everything below exists to separate the two and measure the second.

---

## 2. Goals

| # | Goal | Measured by |
|---|---|---|
| G1 | Make the AI-legibility claim measurable | Published eval suite with per-model scores |
| G2 | Let an agent verify its own BaseNative output | `@basenative/mcp` shipped, agent pass-rate lift measured pre/post |
| G3 | Make the API loadable into one context window | `llms.txt` + `llms-full.txt`, token-budgeted |
| G4 | Convert nearest-neighbor drift into a caught error | Structured validator with `BN_E_*` codes and suggested corrections |
| G5 | Reposition the public surface around generative UI | README, duganlabs.com, basenative.com, one launch essay |
| G6 | Clear the debt that blocks external contribution | 19 open PRs → 0; independent audit of the expression evaluator |

### Non-goals

Explicitly deferred, and cut from the v1.x roadmap for this window:

- BaseNative Cloud / `bn deploy`
- Visual builder
- Component marketplace
- Data grid, combobox, date picker, command palette
- Any new framework feature not required by G1–G6

**Rationale:** 23 packages maintained by one person is already a liability. Repositioning means cutting surface area, not adding it. Every item above is a decade of maintenance signed up for by someone with a full-time job.

---

## 3. Success metrics

**Primary (must hit):**
- Eval suite runs against ≥4 models (Claude, GPT, Gemini, one open-weight) with published pass rates
- Measured pass-rate delta with MCP validation loop enabled vs. disabled — this number *is* the product claim
- `llms-full.txt` under 40k tokens covering 100% of public API surface

**Secondary:**
- 100 GitHub stars (currently 0)
- 3 external issues or discussions opened by non-Dugan humans
- 1 inbound from someone building generative UI

**Deliberately not a metric:** npm downloads. Too lagging for a 6-week window and too easy to game.

---

## 4. Workstreams

### W0 — Debt paydown
*Blocks external contribution. Cheap. Do it first and in parallel with everything.*

| Task | Deliverable | Model |
|---|---|---|
| W0.1 | Triage all 19 open PRs (11 BaseNative, 6 T4BS, 2 .github): classify merge / close / needs-work with one-line rationale each | `haiku` |
| W0.2 | Execute the triage decisions | `sonnet` |
| W0.3 | Adversarial audit of `@basenative/runtime` expression evaluator — sandbox escape, prototype pollution, property-access bypass, method-call abuse | `fable` |
| W0.4 | Confirm npm publication status of all 23 packages; fix or document | `haiku` |

**W0.3 is not optional.** The evaluator is the security boundary for the entire AI-native thesis. If a model-generated template can escape it, the positioning is not just wrong, it is dangerous. It must be audited by a run that did not write it.

**Acceptance:** open PR count = 0. Audit report with findings triaged by severity. Published-package inventory in the repo.

---

### W1 — `@basenative/validate` *(critical path)*
*Everything downstream needs a pass/fail oracle. Build this first.*

Parser-level validation returning machine-actionable structured errors.

```
{
  code: "BN_E_FOREIGN_DIRECTIVE",
  message: "v-if is Vue syntax; BaseNative uses <template @if=\"...\">",
  span: { line: 12, col: 4 },
  suggestion: "<template @if=\"isAdmin\">",
  confidence: "high"
}
```

**Required error classes:**
- `BN_E_FOREIGN_DIRECTIVE` — Vue/Angular/Svelte/Alpine syntax detected, with the BaseNative equivalent. *This is the anti-drift mechanism. Seed it from the specific near-neighbor syntaxes above.*
- `BN_E_UNKNOWN_DIRECTIVE`
- `BN_E_EXPR_UNSUPPORTED` — expression outside the CSP-safe subset, with the "move it into a named function" remedy
- `BN_E_UNBOUND_REF` — interpolation references a key absent from the context object
- `BN_E_MALFORMED_FOR` — `@for` without `track`, wrong separator
- `BN_E_ORPHAN_BRANCH` — `@else`/`@case` without a governing `@if`/`@switch`

**Design principle:** every error must be repairable by a model from the error object alone, with no access to docs. That is the acceptance test.

| Task | Model | Notes |
|---|---|---|
| W1.1 Error taxonomy + severity design | `opus` | Design decision, low volume, high leverage |
| W1.2 Parser + validator implementation | `sonnet` | Bulk implementation |
| W1.3 Foreign-syntax detection rules | `sonnet` | One rule per near-neighbor framework |
| W1.4 Unit tests | `haiku` | Mechanical, high volume |

---

### W2 — `@basenative/evals` *(the flagship artifact)*

The thing that converts marketing into measurement. This is what gets written about.

**Architecture:**
```
prompts/ (human-authored) → model runner (multi-provider) → generated template
    → @basenative/validate  (does it parse?)
    → @basenative/server render()  (does it render?)
    → @basenative/runtime hydrate() (does it hydrate?)
    → behavioral assertions (does it do the thing?)
    → score
```

**Corpus:** 60–100 prompts across five tiers.

| Tier | Content | Count |
|---|---|---|
| T1 | Single directive — interpolation, one `@if` | 20 |
| T2 | Composite — `@for` + `@if` + dynamic attributes | 20 |
| T3 | Stateful — signals, computed, effects, hydration | 20 |
| T4 | Full component — form + validation + submit | 20 |
| T5 | Adversarial — prompts that bait Vue/React habits | 20 |

**T5 is the scientifically interesting tier.** Prompts phrased in React/Vue idiom ("make this conditionally render", "bind the disabled prop") to measure drift rate directly.

**Models under test — must include non-Anthropic.** A leaderboard that only tests Claude is marketing, not evidence. Minimum: Claude Opus 5, Claude Sonnet 5, GPT-class, Gemini-class, one open-weight.

| Task | Model | Notes |
|---|---|---|
| W2.1 Harness architecture | `opus` | |
| W2.2 Multi-provider runner | `sonnet` | Provider abstraction, retries, cost accounting |
| W2.3 Scoring + reporting | `sonnet` | |
| W2.4 Corpus expansion T1–T4 from human-written seeds | `haiku` | See methodology constraint below |
| W2.5 Corpus T5 (adversarial) | `opus` | Requires knowing what the traps are |

> ### ⚠ Methodology constraint — read this twice
>
> **You must author the T5 prompts and every reference assertion yourself, by hand.**
>
> If Claude writes the prompts, the reference implementations, and the assertions, the eval measures Claude's self-consistency and nothing else. It will produce a beautiful, high, meaningless number. The corpus is the one artifact in this PRD that must not be delegated.
>
> Agents may expand T1–T4 *from your hand-written seeds* — mechanical variation of a human-specified pattern is fine. Agents may not decide what correct looks like.
>
> Same concern applies retroactively to the existing 1,461 tests: `.claude/` and `.tabnine/agent/skills/` in the repo means agent-written tests over agent-written code, which share blind spots. W0.3 is the mitigation for the component where that matters most.

---

### W3 — Machine-readable documentation
*Fully independent. Maximum parallelism.*

| Deliverable | Detail | Model |
|---|---|---|
| `llms.txt` | Index at basenative.com — package list, one line each, link map. <2k tokens | `haiku` |
| `llms-full.txt` | Complete API surface, all 23 packages, every directive with example. Target <40k tokens | `haiku` (extract) → `sonnet` (compress) |
| `CLAUDE.md` rewrite | Repo-root agent instructions: directive reference, forbidden foreign syntax, Trinity Standard | `opus` |

**Constraint:** `llms-full.txt` must be generated from source, not hand-maintained. A doc that drifts from the API is worse than none. Add a CI check that fails if it is stale.

---

### W4 — `@basenative/mcp`
*Depends on W1. The loop-closer.*

MCP server exposing BaseNative to any agent:

| Tool | Purpose |
|---|---|
| `validate_template` | Wraps W1. Returns structured errors. |
| `render_preview` | SSR a template + context, return HTML |
| `list_directives` | Full directive reference, queryable |
| `scaffold_component` | Trinity Standard skeleton |
| `check_expression` | Is this expression inside the CSP-safe subset? |

**This is what turns "a model can write BaseNative" into "a model can write *correct* BaseNative."** Without it, models guess. With it, they check.

| Task | Model |
|---|---|
| W4.1 Tool surface design | `opus` |
| W4.2 Server implementation | `sonnet` |
| W4.3 Integration tests against a live client | `sonnet` |

**Key experiment:** run the W2 eval suite twice — once with MCP available to the generating model, once without. The delta is your headline number and your entire launch narrative.

---

### W5 — Repositioning
*Mostly independent. Ship the SSR fix immediately.*

| Task | Detail | Model |
|---|---|---|
| W5.1 SSR fix | duganlabs.com `/blog` and `/ecosystem` render `Loading…` to non-JS clients. Your own SSR-capable runtime, not server-rendering your own pages. Ship this week. | `sonnet` |
| W5.2 README rewrite | Reorder: CSP sandbox first → runtime string rendering second → eval results third → bundle size last. Bundle size is a fight with Svelte you don't need. | `opus` |
| W5.3 basenative.com | Positioning as generative-UI runtime; eval leaderboard as a live page | `sonnet` |
| W5.4 Launch essay | "The UI layer for code you didn't write." Thesis + eval methodology + results. | `opus` |
| W5.5 Ecosystem page honesty pass | Currently advertises "community packages" with zero community. Remove or reframe. | `haiku` |

---

## 5. Dependency graph

```
W0.1 ─→ W0.2                        (independent, week 1)
W0.3                                (independent, week 1, long-running)
W0.4                                (independent, week 1)
W3.*                                (independent, weeks 1–3)
W5.1                                (independent, week 1 — ship immediately)

W1.1 ─→ W1.2 ─→ W1.3 ─→ W1.4       (CRITICAL PATH, weeks 1–3)
                  │
                  ├──→ W2.* ────┐   (weeks 3–5)
                  └──→ W4.* ────┤   (weeks 3–5)
                                │
                                └──→ W2 eval run w/ and w/o MCP  (week 5)
                                          │
                                          └──→ W5.2–5.4  (week 6)
```

**W1 is the bottleneck.** Both W2 and W4 consume it. Resist the urge to start the eval harness first because it is the more exciting artifact — without an oracle, it scores nothing.

**Corpus authorship runs in the background the entire time.** It is your work, by hand, in the gaps. Start week 1, finish by week 4. If it slips, everything downstream is worthless.

---

## 6. Orchestration plan (Claude Code)

### 6.1 Primitive selection

Claude Code gives you four ways to parallelize. Use them for different things:

| Primitive | Use here | Why |
|---|---|---|
| **Subagents** | Within-phase fan-out where you stay in the conversation | Own context, return a summary, don't flood your window |
| **Agent view** (`claude agents`) | W0.3 audit, W2.4 corpus expansion — long-running, check back later | Auto-worktrees each session; dispatch and walk away |
| **Worktrees** | Any two tasks touching `packages/` | Subagents never edit the same files |
| **`/batch`** | W1.4 test generation, W3 doc extraction | Splits one large change into 5–30 worktree-isolated subagents, each opening a PR |

**Do not use agent teams.** Experimental, disabled by default, and teammates are not worktree-isolated — you would have to partition files manually. Not worth it for a 6-week solo push. Revisit if the dynamic-workflows route proves too rigid.

**Consider dynamic workflows for the W2 eval run only.** Running 100 prompts × 5 models × 2 conditions is exactly the "too big to coordinate one turn at a time, needs cross-checking" case workflows exist for.

### 6.2 Model assignment rationale

| Model | Use for | Why |
|---|---|---|
| `opus` (`claude-opus-5`) | Taxonomy design, MCP tool surface, T5 adversarial prompts, README, launch essay | Low volume, high leverage, expensive to get wrong. Design decisions and prose that carries the positioning. |
| `sonnet` (`claude-sonnet-5`) | All bulk implementation — validator, MCP server, harness, SSR fix | The workhorse. Most of the line-count lives here. |
| `haiku` (`claude-haiku-4-5-20251001`) | PR triage classification, doc extraction, test scaffolding, corpus expansion from seeds | High-volume mechanical work where capability is not the constraint. Running these on Opus is money on fire. |
| `fable` (`claude-fable-5-1`) | W0.3 evaluator security audit — and nothing else | Most capable tier available. Reserve for the single highest-stakes correctness task. Note: safeguards route a minority of sessions to Opus 5; if a run comes back with different framing than expected, that is why. |

Set per-subagent in frontmatter. `model:` accepts the aliases above or full IDs.

### 6.3 Subagent definitions

Write these to `.claude/agents/`:

```yaml
---
name: bn-validator
description: Implements the @basenative/validate parser and error taxonomy. Use for any work in packages/validate. Owns packages/validate/ exclusively.
tools: Read, Write, Edit, Bash, Grep, Glob
model: sonnet
skills:
  - basenative-directives
---
You implement template validation for BaseNative.

Constraints:
- Every error object must be repairable by a model from the error alone, with no doc access. If a model would need to look something up, the error is incomplete.
- Never modify package.json, pnpm-workspace.yaml, nx.json, or CHANGELOG.md — report needed changes to the orchestrator.
- Return a summary of what changed and what remains. Do not return full file contents.
```

```yaml
---
name: bn-eval-harness
description: Builds the multi-provider eval runner and scoring. Use for packages/evals. Never authors prompts or assertions.
tools: Read, Write, Edit, Bash, Grep, Glob
model: sonnet
---
You build eval infrastructure, not eval content.

Hard rule: you never write prompts, reference implementations, or assertions.
Those are human-authored and live in prompts/ and fixtures/ — read them, never write them.
If a prompt or fixture appears missing, report it. Do not generate one.

Return a summary. Do not return generated code in full.
```

```yaml
---
name: bn-auditor
description: Adversarial security review of the CSP-safe expression evaluator. Read-only. Use for W0.3.
tools: Read, Grep, Glob, Bash
model: fable
---
You are attacking the expression evaluator, not defending it.

Assume the author was competent and the obvious holes are closed. Look for:
sandbox escape via property access chains, prototype pollution, method-call
abuse on built-ins, getter side effects, expressions that reach `constructor`.

You have read access only. Produce findings with severity, a concrete
proof-of-concept expression, and a suggested fix. Do not patch anything.
```

```yaml
---
name: bn-docs
description: Extracts API surface into llms.txt and llms-full.txt from source. Use for W3.
tools: Read, Write, Edit, Grep, Glob
model: haiku
---
You extract, you do not invent.

Every line in llms-full.txt must be traceable to a symbol in packages/*/src or
an existing doc in docs/. If something is undocumented, list it in a gaps
section — do not write documentation for behavior you inferred.

Token budget: llms.txt <2k, llms-full.txt <40k. Report actual counts.
```

### 6.4 Orchestration rules → add to `CLAUDE.md`

```markdown
## Orchestrator-only files
Subagents must never edit these. Report needed changes upward:
- package.json, pnpm-workspace.yaml, pnpm-lock.yaml, nx.json
- CHANGELOG.md, .changeset/*
- .github/workflows/*
- eslint.config.js, .prettierrc

## Module ownership (one owner per subagent per phase)
- packages/validate/  → bn-validator
- packages/evals/     → bn-eval-harness
- packages/mcp/       → bn-mcp
- docs/, *.txt        → bn-docs

## Never delegate
- prompts/ and fixtures/ in packages/evals — human-authored only
- Any decision about what "correct BaseNative" means

## Invocation protocol
Subagents cannot ask clarifying questions mid-run. Every dispatch must carry:
file scope, success criteria, and what to return. Mandate "return a summary,"
never "return everything" — subagent output lands back in the parent context.
```

### 6.5 Phase schedule

**Phase 0 — Week 1. Fan-out width: 4.**
> "Run four subagents in parallel, each in its own worktree: (1) triage the 19 open PRs and classify each merge/close/needs-work, (2) fix SSR on duganlabs.com /blog and /ecosystem, (3) inventory npm publication status across all 23 packages, (4) design the validator error taxonomy. Each returns a summary only."

Dispatch `bn-auditor` separately via `claude agents` — it is long-running and you should not wait on it.

Meanwhile, by hand: begin the eval corpus.

**Phase 1 — Weeks 2–3. Fan-out width: 3.**
Critical path W1.2 → W1.3 in the main session. `bn-docs` and W1.4 test generation via `/batch` run alongside.

**Phase 2 — Weeks 4–5. Fan-out width: 2.**
W2 and W4 in parallel worktrees. Both consume the now-stable validator. Corpus must be finished before this phase ends.

**Phase 3 — Week 5–6. Serial.**
Eval run (both conditions) → results → README, site, essay. Positioning work is serial by nature and mostly `opus`.

### 6.6 Parallelism cautions

- **Claude is conservative about fan-out by default.** Say "use four subagents, one per task" — not "parallelize this." Be concrete about the number.
- **Every subagent summary lands in your main context.** A wide fan-out of detailed reports fills the window you were trying to protect. Fan out for breadth; keep each mandate narrow.
- **Subagents cannot spawn subagents.** All coordination lives in the main conversation. Do not design a nested plan.
- **Parallel sessions multiply token usage.** Width 4 is a deliberate ceiling here, not a limitation.

---

## 7. Risks

| Risk | Severity | Mitigation |
|---|---|---|
| Corpus is agent-authored; eval measures self-consistency | **Critical** | Hard rule in `bn-eval-harness` prompt. You author prompts and assertions by hand. |
| Evaluator has an escape; sandbox claim is false and dangerous | **Critical** | W0.3, `fable`, read-only, adversarial framing, before any public claim |
| Multi-model eval shows Claude far ahead; leaderboard reads as marketing | High | Publish full methodology and raw outputs. Report the drift rate even where it embarrasses the thesis. |
| Six weeks slips into six months (four products, one person, a day job) | High | Non-goals section is binding. No v1.x roadmap items during this window. |
| Scope creeps back toward the framework fight | Medium | Any task not tracing to G1–G6 is out |
| Existing 1,461 tests have correlated blind spots | Medium | Out of scope beyond W0.3; note as known debt |

---

## 8. Open questions

1. **Are the packages actually published to npm?** Could not verify externally. If not, the eval harness and every install instruction have a prerequisite nobody has done.
2. **Do the `benchmarks/` numbers exist and hold?** If the <5KB claim is measured and reproducible, it is a supporting fact. If it is aspirational, it must come out of the README before the repositioning.
3. **Is T4BS the eval showcase or a distraction?** A live BaseNative app is credibility. A word game is not the demo for generative UI. Consider building one small generative-UI demo — model emits template, renders live — as the launch artifact instead.
4. **Apache 2.0 for the runtime — what about the evals?** If the leaderboard becomes the asset, the corpus licensing matters.
5. **What is the actual weekly hour budget?** Every phase estimate above assumes something. Name the number before you plan against this.

---

## 9. The one-sentence version

Stop selling a framework that happens to be LLM-friendly; ship the eval harness and MCP server that prove BaseNative is the runtime for UI that models write — because the eval suite, not another package, is the only artifact that makes the claim checkable by anyone other than you.
