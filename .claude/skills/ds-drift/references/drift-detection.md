# Drift detection

System-wide sweep for divergence between design-system intent and what actually ships.
Apply the four gates and the three rating axes from `../SKILL.md` to everything below.

Drift is the normal condition of a used design system. The question is never whether it
has drifted — it has — but whether the drift is intentional, how severe it is, and
whether it is compounding.

## Step 1: Scope it

A sweep across "everything" produces a long list with no prioritisation signal. Scope
to a package, a token family, or a contract family. Confirm up front whether any known
intentional divergence should be documented rather than flagged.

## Step 2: Establish the reference

For BaseNative the source of truth is the source, in this order:

1. `packages/components/src/tokens.css` + `theme.css` — the token contract
2. `packages/components/src/components.css` and the other 10 stylesheets — the
   `data-bn` contract that is actually styled
3. `packages/mcp/src/directives.js` — the template language
4. `docs/api/components.md` — the documented option surface

There is **no Figma library, no Storybook and no visual-regression service in this
repo** — verified. Do not ask for one, do not propose comparing against one, and do not
leave a placeholder for one.

## The four dimensions, rewritten for this stack

### 1. Token drift — raw values where a `--bn-*` token exists

Detection is CSS custom properties only. There is no SCSS, no Tailwind and no
CSS-in-JS here, so ignore every heuristic built for those.

Method: read the 11 stylesheets under `packages/*/src/*.css`, **strip comments first**,
take values only from real declarations, and exclude `--bn-*` definitions so a token is
never reported as a violation of itself (Gate 3).

Match a value to a token only when a `--bn-*` property is declared with the
byte-identical value. Then split the result:

- **Unambiguous** — the value maps to exactly one token. `1px` → `--bn-border-width`,
  `0.375rem` → `--bn-radius-md`, `#a1a1aa` → `--bn-color-gray-400`. These are
  mechanical.
- **Ambiguous** — the value maps to several. `1rem` is both `--bn-font-size-base` and
  `--bn-space-4`; only the declaration it sits in says which was meant. `1rem` as a
  `gap` is `--bn-space-4`; as a `font-size` it is `--bn-font-size-base`. **Never sed
  these.** Report them as needing a human read.
- **No token** — the value has no counterpart. That needs a token invented, which is a
  design decision, not a cleanup. Do not present it as a fix.

**The trap:** a hex inside `var(--bn-color-x, #hex)` is a *fallback*, not a loose
value. Substituting the matching token there treats the symptom. Check whether the
referenced token is declared anywhere at all — if it is not, the fallback is the live
value and the real finding is the undeclared token. `packages/builder/src/builder.css`
is exactly this case: 33 fallback sites across 12 token names, 9 of them never
declared, which means the builder ships a palette the theme system cannot reach.

Also flag **local token islands**: `packages/combobox/src/styles.css` declares 24
`--cb-*` tokens and `packages/keyboard/src/styles.css` declares 30 `--kb-*`, neither
deriving from `--bn-*`. And note that JS-embedded CSS is invisible to a `.css` sweep —
`packages/visual-builder/src/bn-canvas.js` builds inline `style="…"` strings with
`hsl()` literals. Say so rather than implying the `.css` count is complete.

### 2. Contract drift — `data-bn` values with no CSS rule

A `data-bn` contract with no matching selector does not error. It renders unstyled,
silently. So does a `data-<axis>` value with no rule.

Method: collect every literal `data-bn="…"` emitted by a `render*` function, and every
`[data-bn="…"]` selector across the 11 stylesheets. Parse selectors
**compound-by-compound**, not by adjacency — an adjacency-only match drops every value
inside an `:is(…)` group and every value containing `_`, which together hide the entire
23-value `pipeline-block` status set and `calendar-event`'s `in_progress`.

Report the contracts with no rule, and separately the **axis values passed but never
declared** — that second list is where real rendering bugs live. Three packages ship no
CSS at all (`date`, `marketplace`, `admin`), so their contracts are unstyled by
construction; report that as one finding, not as N.

Two related shapes worth checking:

- **The same element with two contracts.** `renderInput`/`renderTextarea`/`renderSelect`
  go through `internal/field.js` and emit a bare `<label for>`; `renderCombobox`,
  `renderMultiselect` and the `date` renderers emit `<label data-bn="label">`, which
  nothing styles. Same element, two contracts, one dead.
- **The same contract from two packages.** `renderCombobox` exists in both
  `@basenative/combobox` and `@basenative/components`, both claiming
  `data-bn="combobox"`, with rules in two stylesheets. Any page loading both gets both
  rule sets on one element. This is Critical: it can produce a wrong rendering.

### 3. API drift — local re-implementation instead of consumption

The BaseNative-specific shape is **hand-rolled `data-bn` markup**: a file that
reproduces a component's markup without importing the renderer. That is what
`scripts/component-usage.js` reports as `kind: "data-bn-markup"` in a file that never
imports the component, and it is the one real duplicate outside tests and demos in the
whole corpus.

When you find one, check whether the component was worth calling — if its contracts
have no CSS rule (dimension 2), the copier would have got an unstyled result either
way, and that is probably *why* they copied. Classification E, not C.

Also check `@basenative/admin`, which diverges wholesale: BEM `class="bn-admin-*"`
across 18 classes with only 2 `data-bn` contracts, where the rest of the library is
`data-bn`-first. One finding, classification A or E — not 18.

### 4. Template drift — foreign syntax and misplaced control flow

Do not hand-write detection for this. Use what exists:

- `packages/validate/src/foreign.js` — `FOREIGN_ATTRIBUTES`, each entry carrying a
  `match` RegExp, the `framework` it came from, and a `rewrite()` producing the exact
  BaseNative replacement. Covers `v-if`, `v-for`, `v-model`, `v-bind:`, `v-on:`,
  `*ngIf`, `{#if}`, `x-for` and more.
- `packages/mcp/src/directives.js` — `FORBIDDEN` lists foreign block syntax with the
  correct form to use instead.
- `packages/validate/src/scan.js` — the real tokenizer.

The highest-value check: **control flow on a non-`<template>` element**. On any other
element `@if` is registered as an *event listener*, so `<div @if="x">` binds an "if"
event and never renders conditionally, with no error at runtime. The repo codes this as
`BN_E_CONTROL_FLOW_ON_ELEMENT`.

**Known instance, already confirmed — do not re-litigate it, and do not treat it as
authoritative corpus:** `examples/starter/src/pages/counter.html` and `todos.html` use
an Angular-17-style block dialect (`@if cond` / `@else-if` / `@endif`, `@for x in xs
track x.id` / `@endfor`) plus Vue's `@submit.prevent`. None of it is implemented —
`grep -rn "@endif\|@endfor\|@else-if" packages/` returns zero, and the server dispatches
only on `<template>` elements. Treat `examples/starter/src/pages/*.html` as
non-authoritative; the real corpus is `examples/express/views/`,
`examples/enterprise-v2/views/` and `examples/configurator/index.html`.

Note also that `@for` uses `of` with an optional `; track expr` — never `in`, never
Vue's `(item, i) in list`.

## Step 3: Classify, rate, report

Apply Classification A–E, Severity and Confidence per `../SKILL.md`, then produce the
report shape defined there. Rank by `impact x confidence`. A finding that produces a
wrong rendering outranks any number of tidiness findings.

Two things this repo's own audit concluded, worth carrying forward as priors:

- The library does **not** have a variant-sprawl problem; it has an **adoption**
  problem. 12 of 19 style axes have zero production usage because the components
  carrying them have zero production usage. Deleting a variant on that basis is
  deleting an unshipped API.
- Eight of thirteen production axis arguments are **dynamic** (`card.status`,
  `statusColors[x] ?? 'neutral'`, ternaries). Any "used N ways" figure computed from
  literals alone is wrong. Report literal and non-literal arguments separately.
