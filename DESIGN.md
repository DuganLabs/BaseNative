# DESIGN.md — the BaseNative design contract

This file is the contract for every UI change in this repository, by a person
or an agent. The values live in **one token sheet**:

- **`packages/components/src/tokens.css`**, generated from the DTCG sources in
  `packages/components/tokens/*.json` by
  `cd packages/components && node scripts/build-tokens.mjs`. Never edit the CSS
  by hand; `tokens-drift.test.js` fails if it differs from the JSON.

Everything else reads `var(--…)`. `node scripts/ds-lint.js` (rule **DS009**,
part of `nx run-many -t lint` and CI) fails on a raw colour, length or
duration anywhere else.

## Brand intent

BaseNative is an Apple-grade design system written in plain HTML and CSS:

| Pillar               | What backs it                                                                                                                                                                                                                 |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Apple-grade design   | Apple's type ramp, system colours, 44 px targets, spring motion; checked at 320–1440 px, light and dark (`docs/conformance.md`).                                                                                              |
| All in code          | Components are semantic HTML plus one stylesheet. Every value is a token in this repo. No design-tool export is involved.                                                                                                     |
| Open source          | Apache-2.0 (`LICENSE`); the docs site is built from this repo.                                                                                                                                                                |
| Web standards        | Native elements (`<dialog>`, `popover`, `<details>`, forms), cascade layers, container queries, `:has()`. No custom elements and no build step is needed to use it.                                                           |
| AI-safe              | Template expressions are an allowlist (no `eval`, no `new Function`) and text is escaped by default; `@basenative/validate` reports off-system markup, and a lint fails raw values, so an agent's change stays on the system. |
| CLI- and agent-ready | The `bn` CLI (`bn from-jsx`), MCP tools (`validate_template`, `render_preview`), `llms.txt` / `llms-full.txt`, `AGENTS.md` and this file.                                                                                     |

Claims must stay defensible. Say what BaseNative does. Do not say "the only",
and do not disparage other systems.

Voice: short, plain sentences. No internal jargon, and no "known weakness"
copy on public pages.

## Tokens

Token names follow the category-first CTI+ shape (`--{category}-{type}-{item}-{variant}-{state}`),
and **no new prefixes** (`--bn-*` is retired). The sheet holds 2,201 custom
properties. They are emitted in three blocks:

1. **The system** (unlayered `:root`), Apple-style roles (`"system": "trinity"` in the JSON).
2. **Dark**. `@media (prefers-color-scheme: dark)` and `:root[data-theme="dark"]`
   override the colour roles (88 declarations each). `:root[data-theme="light"]` pins light.
3. **Legacy** (`@layer tokens`), the pre-trinity scale (`"system": "legacy"`).
   It is kept for compatibility, and new work should prefer the system names.

| Group (prefix)                                              | Count | Role                                             |
| ----------------------------------------------------------- | ----: | ------------------------------------------------ |
| `--font-*`                                                  |   416 | type ramp, families, weights, per-component type |
| `--spacing-*`                                               |   355 | scale and per-component insets                   |
| `--color-*`                                                 |   349 | semantic colour roles (light + dark)             |
| `--size-*`                                                  |   261 | targets, controls, radii, borders                |
| `--palette-*`                                               |    62 | raw palette, read by roles only                  |
| `--shadow-*`                                                |    33 | elevation and focus                              |
| `--motion-*`                                                |    30 | durations and curves                             |
| `--site-*` + site element tokens                            |   180 | docs-site tokens (`tokens/site.json`)            |
| keyword groups (`--display-*`, `--position-*`, `--flex-*`…) |  ~500 | layout keywords components read                  |

### Type

The system font comes first: `--font-family-text` (SF Pro Text stack),
`--font-family-display`, `--font-family-mono`. Each step has `-size`,
`-leading`, `-weight` and `-tracking`.

| Step                                 | Size                                  | Use                     |
| ------------------------------------ | ------------------------------------- | ----------------------- |
| `--font-display-*`                   | `clamp(2.25rem, 1.25rem + 3vw, 4rem)` | marketing H1 only       |
| `--font-large-title-*`               | 2.125rem                              | page title              |
| `--font-title-1-*` / `-2-*` / `-3-*` | 1.75 / 1.375 / 1.25rem                | section titles          |
| `--font-headline-*`                  | 1.0625rem, semibold                   | row titles, masthead    |
| `--font-body-*`                      | 1.0625rem                             | running text            |
| `--font-callout-*`                   | 1rem                                  | controls                |
| `--font-subheadline-*`               | 0.9375rem                             | secondary rows          |
| `--font-footnote-*`                  | 0.8125rem                             | meta                    |
| `--font-caption-1-*` / `-2-*`        | 0.75 / 0.6875rem                      | labels, never body copy |

### Colour roles

Read roles, never palette steps.

| Role                                                          | Light                                               | Dark                        |
| ------------------------------------------------------------- | --------------------------------------------------- | --------------------------- |
| `--color-text-label`                                          | #000                                                | #fff                        |
| `--color-text-label-2`                                        | #545458                                             | #d1d1d6                     |
| `--color-text-label-3`                                        | #5c5c61                                             | #aeaeb2                     |
| `--color-background` / `-2`                                   | #fff / #f2f2f7                                      | #000 / #1c1c1e              |
| `--color-tint` (fills, rings)                                 | #e8920a                                             | #e8920a                     |
| `--color-tint-strong` (tint as **text**)                      | #8f5804                                             | #ffb340                     |
| `--color-text-on-tint`                                        | #0c0b09                                             | #0c0b09                     |
| `--color-danger-strong` / `success-strong` / `warning-strong` | #c80013 / #1c7230 / #8f5100                         | #ff6961 / #30d158 / #ff9f0a |
| `--color-fill` / `-2` / `-3`                                  | rgb(120 120 128 / .2 / .16), rgb(118 118 128 / .12) | doubled alpha               |
| `--color-border-separator`                                    | rgb(60 60 67 / .29)                                 | rgb(84 84 88 / .6)          |
| `--color-scrim`                                               | rgb(0 0 0 / .4)                                     | rgb(0 0 0 / .55)            |

Rules:

- Tint is never a text colour. Use `--color-tint-strong`; site-composition
  enforces it.
- Text contrast must be at least 4.5:1 in both modes.

### Spacing

The scale is `--spacing-1` 0.25rem, `-2` 0.5, `-3` 0.75, `-4` 1, `-5` 1.25,
`-6` 1.5, `-7` 2, `-8` 2.5, `-12` 3, `-16` 4 and `-20` 5rem, plus
`--spacing-half` 0.125rem. Page gutters are `--spacing-margin` (1rem) and
`--spacing-margin-wide` (1.25rem).

Rules:

- Gaps between separate things are 16 px (`--spacing-4`) or more.
- Use the safe-area tokens (`--spacing-safe-*`) at the screen edges.

### Size, radii, borders

- Tap target: `--size-target-min` (2.75rem = 44 px) on every interactive element.
- Control height: `--size-control` (2.75rem).
- Hairline: `--size-hairline` (0.5px). Also `--size-1px`. The focus outline is
  `--size-border-thick` (2px).
- Radii are read by role. Each role maps to a scale step:

  | Role                      | Scale step                  |
  | ------------------------- | --------------------------- |
  | `--size-radius-control`   | `--size-radius-md` 0.625rem |
  | `--size-radius-container` | `--size-radius-xl` 1rem     |
  | `--size-radius-sheet`     | `--size-radius-2xl` 1.25rem |
  | `--size-radius-pill`      | pill                        |

### Shadows

- `--shadow-raised` `0 8px 24px rgb(0 0 0 / .08)`: cards.
- `--shadow-float` `0 12px 32px rgb(0 0 0 / .12)`: popovers, menus, toasts.
- `--shadow-focus-ring`: a 2px background gap plus a 4px tint ring.

Dark mode leans on fills and separators more than shadows.

### Motion

| Token                      | Duration and curve               | Use                |
| -------------------------- | -------------------------------- | ------------------ |
| `--motion-spring-*`        | 550ms, cubic-bezier(.32,.72,0,1) | sheets             |
| `--motion-spring-stiff-*`  | 380ms                            | controls           |
| `--motion-spring-bouncy-*` | 700ms                            | delight, sparingly |
| `--motion-fade-*`          | 250ms                            | opacity            |

`prefers-reduced-motion: reduce` collapses all of them; the sheet does it, not
each component.

## Component rules

- Use the native element first: `<button>`, `<dialog>`, `<details>`, `popover`,
  `<input>`, `<select>`. ARIA only fills gaps.
- Variants are attributes (`variant="…"`, `size="…"`) declared by the
  component sheet. Site CSS never paints a `[variant=…]` selector. Fix the
  component or the token instead.
- Fix things at the shared component or token level, not per page.
- Every finding gets a fail-before test and a `docs/conformance.md` row.
- Icons are centred within ±2 px in their target. There are no mid-word breaks,
  and code never wraps.
- Layout follows the column (container queries), not the viewport, wherever a
  sidebar can take width.
- Check 320, 393, 768, 1024, 1100, 1280 and 1440 px, light and dark, with
  overlays open.
- New site CSS goes inside `@layer components`.

## For agents

Before **any** UI change:

1. Read this file and `packages/components/src/tokens.css` (or the JSON in
   `packages/components/tokens/`).
2. Use tokens only. Never hard-code a colour, length, radius, shadow or
   duration. If no token fits, add one to the right `tokens/*.json` with an
   existing prefix, rebuild the sheet, and say so in the PR.
3. Do not rename tokens. If two names or values disagree, list them in the PR
   and leave them be (see the variants below).
4. Run `node scripts/ds-lint.js`. DS009 fails any raw value outside the token
   sheet. Existing debt is counted in `design-system.baseline.json`, which may
   only shrink. Re-record it with `--update-baseline` only after removing debt.
   The escape hatch is `/* bn-allow: DS009 — reason */` on the line, and it is
   reviewed.
5. Verify in a browser at the widths above, light and dark. Never code blind.

## Naming variants on record

These names or values disagree. Nothing has been renamed. Where the
consolidation had to pick, the value that was already **live** (computed in
the browser) won, so the rendered site did not change. A computed-style diff
of every custom property on 4 routes × 2 modes showed 0 changes.

| Variant                           | Values and where                                                                                                                                         | Decision                                                  |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| `--radius-sm/md/lg/pill`          | site `styles.css`: 0.25/0.5/0.75/1rem (dead: overridden). Token sheet: control 0.625 / container 1 / container 1rem / 9999px (live)                      | kept the token sheet; dead site copies removed            |
| `--space-xs…3xl` vs `--spacing-*` | site literals vs aliases of `--spacing-*` (same values)                                                                                                  | kept the aliases                                          |
| `--font-serif`, `--font-mono`     | site `expanded` / `ultra-condensed` (dead) vs `normal` (live)                                                                                            | kept `normal`                                             |
| `--shadow-btn`                    | site tint glow (dead) vs `var(--shadow-raised)` (live)                                                                                                   | kept live                                                 |
| `--size-text-max`                 | token sheet 65ch vs site 52ch (site wins on the site)                                                                                                    | **open**: site override kept                              |
| `--size-control-height(-sm/-lg)`  | legacy 2.5/2/3rem vs `components.css` 2.75/2.25/3.25rem vs `--size-control` 2.75rem                                                                      | **open**                                                  |
| radius scales                     | legacy `--size-radius-sm` 0.5 / `-lg` 0.75rem vs system `-md` 0.625 / `-xl` 1rem; `--radius-sm` → 0.625rem while `--size-radius-sm` is 0.5rem            | **open**                                                  |
| font families                     | `--font-family-text` (SF stack), `--font-family-sans` (system-ui/Segoe), `--font-family` ('BaseNative', site), `--font-family-playground-sans` / `-mono` | **open**                                                  |
| durations                         | `--motion-*` 250–700ms; legacy `--motion-fast/base/slow` 150/200/300ms; site `--duration-fast/med/slow` 0.15/0.3/0.5s                                    | **open**                                                  |
| tracking                          | `--font-*-tracking` ramp vs site `--letter-spacing-tight/wide/wider`                                                                                     | masthead moved from -0.01em to `--font-headline-tracking` |
| background roles                  | `--color-bkg-*` (legacy) vs `--color-background-*`                                                                                                       | **open**                                                  |
| danger                            | `--color-danger-strong` and `--color-danger-solid` are both #c80013                                                                                      | **open**                                                  |
| legacy palette                    | `--palette-primary-*` (blue, #2563eb) vs `--color-tint` (#e8920a)                                                                                        | **open**                                                  |
| focus                             | `--shadow-input` (3px glow) vs `--shadow-focus-ring` (2+4px)                                                                                             | **open**                                                  |
