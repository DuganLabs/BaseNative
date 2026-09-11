---
name: ds-drift
description: "Use this when the user asks for design-system health on demand — \"check for drift\", \"is the design system consistent\", \"audit our tokens\", \"are our component APIs consistent\", \"audit our naming\", \"plan a deprecation\", \"write a codemod for this rename\". Runs on demand and in CI, never mid-task, and never as a follow-up to writing UI. Tiers every finding by evidence, classification, severity and confidence before reporting it. Never generates eval fixtures and never edits nx.json or package.json."
---

# ds-drift

Ongoing design-system health. Runs **on demand** and **in CI**. It does **not** run
mid-task, it is never triggered by having just written UI, and it never chains from
`ds-guard` or `ds-extract`.

## Five checks — load one reference, not all five

| Check | Reference | Use it for |
|---|---|---|
| Drift detection | `references/drift-detection.md` | Raw values where tokens exist, contracts with no CSS rule, local re-implementations, foreign template syntax |
| Naming audit | `references/naming-audit.md` | `data-bn` contract names, `--bn-*` token names, tier consistency |
| Component API validator | `references/component-api-validator.md` | Option-key consistency across `render*` functions, style-axis contracts, breaking changes |
| Deprecation process | `references/deprecation-process.md` | Retiring a component, contract or token with a migration path |
| Codemod generator | `references/codemod-generator.md` | Mechanical repo-wide substitutions |

Read only the reference the request needs.

---

## Evidence discipline — this applies to every check

This is the part of this skill that is actually worth having. The last full audit of
this repo started from 728 usage records, 357 candidate duplicate pairs and 165
"hardcoded design values", and found that **almost none of it was actionable**. A
finding is promoted only if it passes the gate that applies to it. Everything else is
**counted and suppressed, never silently dropped**.

### Gate 1 — Tier. Evidence of adoption must come from code that ships.

`scripts/component-usage.js` emits `isTest` and nothing else. Derive the rest:

| Tier | How to identify | Adoption evidence? |
|---|---|---|
| `test` | `isTest: true`, `*.test.js`, `*.spec.ts`, `packages/*/test/`, `tests/` | No |
| `demo` | `examples/**` | No |
| `build-artifact` | `examples/express/public/basenative.js`, `examples/express/public/builder.js`, consumer `dist/` or `dist-worker/` | No |
| `prod-internal` | BaseNative package source | **Yes** |
| `prod-consumer` | consumer-repo application source | **Yes** |

At the last run that was 498 test / 181 demo / 8 build-artifact / 41 real — **5.6%**.
`usageCounts.total` is the single most misleading number available here. **Never report
it.** A component reporting 45 usages of which 43 are its own tests has one real call
site, and every conclusion must rest on that one.

### Gate 2 — Contract, not coincidence.

Two things are only near-duplicates when a BaseNative contract says so: a shared
`data-bn` name, an identical exported name, or at least 55% overlap of destructured
option keys. A shared HTML tag name is not evidence, and "both take a parameter called
`options`" is not evidence — every render function takes `options` and most emit a
`div`. Those two signals alone generated 356 of 357 candidate pairs; exactly one
survived.

### Gate 3 — A primitive, and not the token itself.

A "hardcoded design value" must be a single normalised primitive (a hex colour, or a
number carrying `px`/`rem`/`em`), in a real CSS declaration **after comments are
stripped**, and must not be the `--bn-*` declaration that *defines* the token it would
be replaced by. 125 of the last run's 165 rows were comment prose or half-parsed CSS
fragments, and two were token definitions reported as violations of themselves.

Strip comments before counting. The previous tooling did not, and undercounted the
real occurrences by roughly 8x.

### Gate 4 — Reachability, before asserting anything is dead.

"Dead" is a claim about every shape the scanner **cannot** see:

- It requires an `import { X }` statement in the same file before counting a call, so
  same-file use registers zero. This alone made `renderPaletteHTML` look dead.
- It walks only `.js/.mjs/.cjs/.ts/.jsx/.tsx`. There are 28 `.html` files in this repo
  carrying 97 `data-bn` attributes that it never reads. Custom elements are worst hit,
  because HTML is where they are normally written.
- A `${…}` hole splits a template literal, so a dynamically built contract name never
  resolves.
- It attributes a custom element to whichever file last called `customElements.define`
  — and `builder-element.js` re-registers four elements their own files already did.

Anything reachable through one of those shapes is **downgraded, not asserted dead**.
"Not adopted yet" is not "dead": 40 of 61 components have no production usage, and that
is an adoption fact, not a deletion list.

### Suppressed is counted, not deleted

Every report states how many rows each gate suppressed and why. The raw rows stay in
`.agents/*.json` so any suppression can be checked.

---

## Rate every finding on three axes

**Severity** — `Critical` / `High` / `Medium` / `Low`. Plain words; this repo's house
style uses no emoji. Elevate one level for anything on a critical path (auth, primary
data entry, navigation). A finding that produces a *wrong rendering* outranks any
tidiness finding.

**Classification** — why it drifted, because it determines the response:

| | Meaning | Response |
|---|---|---|
| A | Intentional divergence | Document it as a decision; it may be a contribution |
| B | Version lag | Offer a migration path with an effort estimate |
| C | Accidental drift | Fix it, and fix whatever let it through |
| D | Misunderstanding | Fix the docs that failed to prevent it |
| E | System gap | The system did not have what was needed — route to a design call |

A team whose divergence filled a genuine gap did not do something wrong. Say so.

**Confidence** — `high` / `medium` / `low`, reusing the vocabulary this repo already
has in `packages/validate/src/codes.js` (`CONFIDENCE.HIGH` / `.MEDIUM` / `.LOW`, which
sit alongside `severity` in the diagnostic taxonomy). Do not invent a second scale.

Confidence is derived from the scanner shape involved, not asserted:

- Verified by reading the source it refers to → **high**.
- Rests on the *absence* of something the tooling can see → **medium** at best.
- Rests on the absence of something the tooling structurally cannot see (`.html`,
  same-file use, interpolated contract names) → **low**, and say which blind spot.

**Every report must carry an "Inferred rather than read" section** listing each finding
that was not verified against source. If that section is empty, you did not look.

---

## Where the data comes from

| Source | What it gives |
|---|---|
| `.agents/component-usage.json` | Usage records; regenerate with `cd packages/validate && node ../../scripts/component-usage.js` (node is refused at the repo root) |
| `packages/*/src/*.css` (11 files) | Token definitions and every `[data-bn=…]` rule |
| `packages/components/src/tokens.css`, `theme.css` | Primitive and semantic tiers; the dark palette |
| `packages/mcp/src/directives.js` | The authoritative directive list — `DIRECTIVES`, `PRIMITIVES`, `FORBIDDEN`. Read it; do not restate the language from memory |
| `packages/validate/src/foreign.js` | `FOREIGN_ATTRIBUTES`, each with a concrete rewrite |
| `packages/validate/src/codes.js` | The `severity` + `confidence` taxonomy |
| `packages/validate/src/scan.js` | The real tokenizer — `scanTags`, `scanInterpolations`, `spanAt` |

**Never regex the template language.** If you need to tokenize markup, import from
`@basenative/validate/scan`. Re-approximating that parser is the specific mistake the
scanner work exists to prevent.

---

## Report shape

Open with a headline sentence a colleague would actually say, not a compliance
statement. Then:

1. **Summary** — one paragraph. Is drift controlled or compounding? What is the single
   most important finding?
2. **What to actually do, in order** — a ranked table with the evidence and the effort
   for each row. Rank by `impact x confidence`, not by count.
3. **Findings**, each with location, dimension, classification, severity, confidence
   and a specific action.
4. **Suppressed counts** — rows in, rows suppressed, rows reported, and which gate did
   it.
5. **Root cause patterns** — more actionable than the individual findings, because
   fixing a cause prevents recurrence.
6. **Inferred rather than read** — every unverified claim, flagged.
7. The closing note below.

> **A note on context:** this analysis identifies where implementations differ from the
> system — it cannot always tell why. If any finding flags something your team decided
> deliberately, say so and it will be treated as an accepted divergence rather than a
> defect.

---

## Running in CI

CI today gates on three generated artefacts, all using a `--check` flag implemented
inside the generator rather than a `git diff` (`.github/workflows/ci.yml`, Node 22 leg
only):

```yaml
- run: node scripts/bundle-size.js
- run: node scripts/package-inventory.js --check
- run: node scripts/llms-txt.js --check
```

`.agents/*` has no staleness gate. If a ds-drift check is ever wired into CI, follow
that same `--check` convention. Do not add a CI step as a side effect of running this
skill.

## Never

- **Never generate eval fixtures, corpora or assertions.** Hand-authored by the owner,
  at any model tier, including via a subagent. If a check would benefit from test
  cases, say which and stop.
- Never run mid-task, and never as a follow-up to writing UI.
- Never invoke `ds-guard` or `ds-extract`.
- Never edit `nx.json` or `package.json`.
- Never hand-edit `llms.txt`, `llms-full.txt` or `docs/package-inventory.md` — all
  generated, and CI fails on drift.
- Never report a raw usage total.
