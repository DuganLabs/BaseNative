---
name: ds-guard
description: "Fires before any new UI is written in this repo. Answers exactly one question from the generated component index: which existing BaseNative component covers this, or why nothing does. Trigger before writing any render* function, any data-bn markup, any template, or any custom element — including inside examples/ and tests. Do NOT trigger for retrofitting existing code (that is ds-extract, invoked by name) or for design-system health checks (that is ds-drift)."
---

# ds-guard

One job. Before any new UI is written, state **which existing component covers this**, or **why nothing does**. Then get out of the way.

This skill runs constantly. It must cost almost nothing. If you are writing more than three lines of output, you are doing it wrong.

## The index is the only source

Read `.agents/component-index.json` — or its token-budgeted markdown form, `.agents/component-index.md`, which is preferred when present because it is cheaper to load.

Per component the index carries:

| Field | Use |
|---|---|
| `name` | The exported `render*` function or custom-element tag |
| `package` | The `@basenative/*` package to import from |
| `purpose` | One line. Match the request against this. |
| `allowedVariants` | The only values any style axis may receive |
| `useInsteadOf` | The hand-rolled pattern this component replaces |

**Do not search the codebase live.** No Grep, no Glob, no reading `packages/*/src`. The index is generated from source in the same pass as `llms-full.txt` and CI fails when it is stale, so it is current by construction. Live search is slower, less complete, and re-derives what the index already states.

If the index is **missing or stale**: say so in one line and stop. Do not fall back to live search, and do not guess — a wrong "nothing covers this" is how duplicate components get written.

## Output: two verdicts, nothing else

**Covered** — name the component, its package, and the variants it allows:

> ds-guard: `renderBadge` (`@basenative/components`) covers this. Allowed `variant`: `default` | `primary` | `success` | `warning` | `error`. Use it instead of a hand-rolled status span.

**Not covered** — say so, name the closest thing and why it does not fit:

> ds-guard: nothing in the index covers a split-button. Closest is `renderDropdownMenu`, which has no primary-action half. Building inline.

That is the whole output. No report, no table, no severity ratings.

## Rules that make the verdict correct

- **Only pass a variant the index lists.** An unlisted value does not error — it renders with the base rule and no styling, silently. That is a live defect class in this repo, not a hypothetical: `renderBadge` is passed `neutral` in production and two badges render unstyled.
- **If covered, call the render function.** Do not reproduce its `data-bn` markup by hand. Hand-rolled duplicates of a component's markup are the exact defect the repo's usage scanner was built to catch, and the only one found outside tests and demos.
- **If not covered and the pattern will repeat 3+ times**, a new shared component is warranted — but ds-guard does not create it, and neither should you inline. Say so and hand back. Creation follows `CONTRIBUTING.md` § "Adding a New Component". Note that **there is no Nx generator in this workspace** (no `generators.json`, no `@nx/*` plugins, no `plugins` array in `nx.json`) — `nx g` will not scaffold a component here, so do not reach for it and do not improvise a layout.
- **If not covered and it will not repeat**, build it inline and build it cleanly, so it is cheap to extract later.

## When you do write the markup

BaseNative is its own runtime. Components are `render*` functions returning HTML
strings; there is no JSX, no VDOM, no `class` attribute in component output, and no
utility CSS. Style through `data-bn` contracts and `--bn-*` custom properties.

Control flow is an attribute on a `<template>` element — `<template @if="x">`,
`<template @for="item of items(); track item.id">`. On any other element `@name`
silently registers an **event listener** instead, which is the repo's documented
number-one failure mode (`BN_E_CONTROL_FLOW_ON_ELEMENT`). The authoritative directive
list is `packages/mcp/src/directives.js`.

## Hard limits

- **Never** edit `nx.json` or `package.json`. Nx owns task running here.
- **Never** create, move or modify a component. ds-guard reports; it does not act.
- **Never** invoke `ds-extract` or `ds-drift`, and never suggest running them as the next step. Retrofit is `ds-extract`, invoked by name by a human. Health is `ds-drift`, on demand and in CI. They do not chain.
- **Never** generate eval fixtures, corpora or assertions. Those are hand-authored by the owner.
