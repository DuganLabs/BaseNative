# Component API validator

Consistency of the `render*` option surface across the library, plus breaking-change
detection. Apply the gates and rating axes from `../SKILL.md`.

## What an API is here

A BaseNative component is a **pure function returning an HTML string**. There are no
props objects, no hooks, no refs, no slots, no children arrays, no TypeScript source.
Every upstream check written for React/Vue/Svelte prop systems is inapplicable and has
been removed; what follows is the equivalent for this stack.

Two signatures are in use, and which one is correct depends on whether the component
has a single primary HTML slot:

```js
render<Name>(content = '', options = {})   // content-first: button, badge, alert
render<Name>(options = {})                 // options-only: card, table, checkbox, input
```

The public surface of one component is therefore:

| Element | Where to read it |
|---|---|
| Signature form | the function declaration |
| Option keys + defaults | the destructure, or the `options.x \|\|` reads |
| Style axes | the `data-<axis>="${…}"` it emits |
| Markup contract | the literal `data-bn="…"` values it emits |
| Escaping policy | which values pass through `escapeAttr` / `escapeText` |
| Documented surface | its `@param` JSDoc and `docs/api/components.md` |

**Read each function's own body.** Do not use a per-file aggregate: `renderProgress`
and `renderSpinner` share `progress.js`, and any file-level attribution gives each of
them the other's contracts. This is a real defect in the existing `ds-definitions.json`
and it is why that file cannot be trusted for this check.

## Check 1: Option-key consistency across components

The same concept must have the same key everywhere. Build the key inventory from all
55 renderers, then look for a concept implemented under more than one name.

Established keys, treat as the convention: `variant`, `size`, `disabled`, `id`,
`label`, `items`, `attrs`, `error`, `helpText`, `position`, `open`, `content`, `text`.

For each inconsistency: name the concept, say which key is dominant, list the
deviations, propose the normalisation. Note that six renderers take **positional**
parameters rather than an options object (`renderAdminQueueList`, `renderAdminUserList`,
`renderInspector`, `renderTreeView`, `renderNodeToElement`, `renderPaletteHTML`) — they
are outside key comparison entirely and must be judged by hand, not silently scored as
having zero overlap.

## Check 2: The two universal contracts

Every renderer is expected to honour both. A deviation is a finding.

**`attrs` passthrough.** Every component accepts `options.attrs`, a raw attribute
string appended via `attrsSuffix(attrs)` from `internal/attrs.js`. A component without
it has no escape hatch and will be copied rather than used.

**Escaping.** Every interpolated value must pass through `escapeAttr` (attribute
position) or `escapeText` (text position), both from
`@basenative/runtime/shared/escape`. The JSDoc must state, per parameter, whether it is
escaped or is an unescaped HTML slot — the library's own idiom is
`HTML slot: not escaped; pass trusted markup only`.

> The helpers are **`escapeText` / `escapeAttr`**. There is no `escapeHtml` on this
> path — `escapeHtml` exists only in `packages/builder/src/escape.js`, a separate local
> module. Do not wire a check to that name.

A component performing **no escaping at all** is Critical regardless of its usage tier.
`packages/date/src/{datepicker,timepicker,daterange}.js` are the known instance:
`name`, `value`, `min`, `max`, `id` go straight into attributes and `label` straight
into element content. Its confidence is high (read from source); its exploitability is
low only because the package currently has zero production call sites, which is a fact
about adoption, not about the defect.

## Check 3: Declared axes vs reachable axes

For each style axis, compare three sets:

1. **Emitted** — values the function can put in the attribute.
2. **Declared** — values with a CSS selector. Parse compound-by-compound so `:is(…)`
   groups and values containing `_` are included.
3. **Passed** — values production call sites actually supply (Gate 1 tiering applies;
   `examples/express/showcase-data.js` deliberately calls every variant once, so
   counting demos makes sprawl invisible by construction).

The finding that matters is **passed but not declared**: it renders unstyled and
silently. Report literal and non-literal arguments separately — a ternary or a lookup
table is not a countable usage, and 8 of 13 production axis arguments in this repo are
dynamic.

The inverse — declared but never passed — is usually **not** a finding. It means the
component is unadopted, not that the variant is wrong. Do not recommend deleting an
unshipped API.

A third case is worse than either: an axis that is **escaped into the DOM and read by
nothing**. `renderCard` accepts `variant`, escapes it into `data-variant`, and no
stylesheet reads it — an API promise with nothing behind it, and a consumer is already
passing it. Either give it rules or stop emitting it.

## Check 4: Breaking-change detection

Compare against the previously published surface. For each component, a change is
breaking if it:

- removes or renames an option key, or a `data-bn` contract, or an axis value with a
  rule;
- changes the signature form (content-first to options-only, or the reverse);
- changes a default;
- changes the escaping status of a parameter — from escaped to slot is a **security**
  break, and is Critical.

`data-bn` renames are public API here, because consumer stylesheets and hand-written
markup both bind to them. Route anything breaking through
`deprecation-process.md`.

Also verify the declared type surface matches: `packages/components/types/index.d.ts`
is hand-maintained, and `types/exports.test.js` asserts it against the runtime exports.
A drifted `.d.ts` is a finding.

## Report

Use the report shape in `../SKILL.md`. Give each finding a classification, severity and
confidence, and rank by `impact x confidence`. Say plainly which components were read
in full and which were sampled.

**Do not generate test cases, fixtures or assertions for any of this.** If a finding
would be settled by a test, name the test that should exist and stop — the corpus is
hand-authored by the owner.
