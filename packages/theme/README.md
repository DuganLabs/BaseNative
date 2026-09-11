# @basenative/theme

The theme layer that drives `@basenative/components`.

**One library, many themes.** Every DuganLabs property keeps its own identity and
stops re-solving contrast, token tiers, icon grids and CSS minification from
scratch. This package ships the machinery, not the look — there is no palette in
here and there is not going to be one.

Zero production dependencies. Hand-written JS, hand-written types, `node --test`.

```
@basenative/theme            defineTheme, validateTheme, ThemeError, toCss, bridgeToBn
@basenative/theme/contrast   relativeLuminance, contrastRatio, parseCustomProperties,
                             resolveColor, AA_TEXT, AA_LARGE, AA_NONTEXT
@basenative/theme/audit      auditPairings, assertPairings, defaultPairings,
                             assertThemeContrast, ContrastError
@basenative/theme/css        minifyCss
@basenative/theme/icons      defineIconSet, renderIcon, validateIconSet, IconSetError
@basenative/theme/bridge.css the --bn-* bridge, as a stylesheet
```

---

## Starting a new property

### 1. What you define

A theme is four tiers. Nothing may skip one, and only tier 1 contains a hex.

| Tier | You write | Example |
| --- | --- | --- |
| 1. `ramps` | literal `#rrggbb` scales | `neutral`, `primary`, plus whatever hues your signals need |
| 2. `surfaces` / `ink` | what a thing sits **on**, and what is written on it | `surfaces.sunk: 'neutral.100'` |
| 3. `roles` | what an element **is** | `roles.borderControl: 'neutral.500'` |
| 4. `signals` | families in **your** vocabulary, assigned to the five component slots | `families.stalled`, `slots.warning: 'stalled'` |

Tiers 2-4 never carry a hex. They carry `'<ramp>.<step>'`, which is emitted as a
`var()` chain and resolved back to a literal by the validator. Change one ramp
step and everything above it moves.

Two ramps are mandatory, because `@basenative/components` reads them directly:
`primary` (steps 50-900) and `neutral` (steps 50-950).

### 2. Write the theme

This is the starter. It is `@basenative/components`' own default palette
expressed as a theme — a translation, not a new look, so forking it and swapping
the two ramps is the first thing you do. It is not exported from this package
on purpose (see *Why there is no default theme*); copy it.

```js
import { defineTheme } from '@basenative/theme';

export const theme = defineTheme({
  name: 'starter',
  scheme: 'light',

  // Tier 1 — the only hexes in the file.
  ramps: {
    neutral: {
      50: '#fafafa',
      100: '#f4f4f5',
      200: '#e4e4e7',
      300: '#d4d4d8',
      400: '#a1a1aa',
      500: '#71717a',
      600: '#52525b',
      700: '#3f3f46',
      800: '#27272a',
      900: '#18181b',
      950: '#09090b',
    },
    primary: {
      50: '#eff6ff',
      100: '#dbeafe',
      200: '#bfdbfe',
      300: '#93c5fd',
      400: '#60a5fa',
      500: '#3b82f6',
      600: '#2563eb',
      700: '#1d4ed8',
      800: '#1e40af',
      900: '#1e3a8a',
    },
    success: { 100: '#dcfce7', 600: '#16a34a', 700: '#15803d', 800: '#166534' },
    warning: { 100: '#fef3c7', 600: '#d97706', 700: '#b45309', 800: '#92400e' },
    danger: { 100: '#fee2e2', 500: '#ef4444', 600: '#dc2626', 800: '#991b1b' },
    paper: { white: '#ffffff' },
  },

  // Tier 2 — surfaces, and the ink that goes on them.
  surfaces: {
    base: 'paper.white',
    subtle: 'neutral.50',
    sunk: 'neutral.100',
    raised: 'paper.white',
    inverse: 'neutral.900',
  },
  ink: {
    base: 'neutral.900',
    // Upstream's muted ink is gray-500, which is 4.40:1 on the gray-100 sunk
    // surface. The harness refused it; one step darker clears at 7.03:1.
    muted: 'neutral.600',
    subtle: 'neutral.600',
    inverse: 'paper.white',
    link: 'primary.600',
  },

  // Tier 3 — roles. Every one of these is painted by a component.
  roles: {
    primary: 'primary.600',
    primaryHover: 'primary.700',
    onPrimary: 'paper.white',
    primaryTint: 'primary.50',
    border: 'neutral.300',
    borderStrong: 'neutral.400',
    borderControl: 'neutral.500',
    focus: 'primary.500',
    focusOnInverse: 'primary.300',
    selectedBg: 'primary.50',
    selectedInk: 'primary.700',
  },

  // Tier 4 — signal families, then the five slots they drive.
  signals: {
    families: {
      neutral: { bg: 'neutral.300', ink: 'neutral.900', line: 'neutral.500', solid: 'neutral.600', onSolid: 'paper.white' },
      info: { bg: 'primary.100', ink: 'primary.800', line: 'primary.500', solid: 'primary.600', onSolid: 'paper.white' },
      success: { bg: 'success.100', ink: 'success.800', line: 'success.600', solid: 'success.700', onSolid: 'paper.white' },
      warning: { bg: 'warning.100', ink: 'warning.800', line: 'warning.600', solid: 'warning.700', onSolid: 'paper.white' },
      danger: { bg: 'danger.100', ink: 'danger.800', line: 'danger.500', solid: 'danger.600', onSolid: 'paper.white' },
    },
    slots: {
      default: 'neutral',
      primary: 'info',
      success: 'success',
      warning: 'warning',
      error: 'danger',
    },
  },
});
```

Geometry is optional and defaulted — `font`, `radius`, `control`, `motion`. The
defaults are `@basenative/components`' own values, asserted byte-identical by
this package's tests, so a change upstream fails a build rather than quietly
restyling six properties. A field app raises the tap target:

```js
control: { tapMin: '2.75rem' },   // 44px — WCAG 2.2 SC 2.5.5, for gloves
```

### 3. Serve it

```js
import { toCss } from '@basenative/theme';
import { minifyCss } from '@basenative/theme/css';
import { theme } from './theme.js';

// Emits @layer tokens { … } plus the --bn-* bridge. Comments carry the
// rationale for whoever opens the file; strip them at the point of serving.
export const THEME_CSS = minifyCss(toCss(theme));
```

Load order, matching the declared layer order
(`@layer reset, tokens, layout, components, states`):

```html
<link rel="stylesheet" href="/@basenative/components/css">
<style>/* THEME_CSS */</style>
```

`toCss` appends the bridge by default. If you would rather link it,
`toCss(theme, { bridge: false })` plus `@basenative/theme/bridge.css`.

### 4. Gate it

One line, in your own test file:

```js
import { test } from 'node:test';
import { assertThemeContrast } from '@basenative/theme/audit';
import { theme } from '../src/theme.js';

test('every shipped colour pairing clears WCAG AA', () => {
  assertThemeContrast(theme);
});
```

`assertThemeContrast` writes the pairing table from your theme's own shape — 55
rows for the starter — measures real relative luminance, and throws listing
every failing row with its actual ratio. It runs once per scheme your theme
renders in, so a dual theme is measured twice.

Add rows for anything you paint that this package cannot know about:

```js
import { assertPairings, defaultPairings, AA_NONTEXT } from '@basenative/theme/audit';
import { toCss } from '@basenative/theme';

assertPairings(toCss(theme, { only: 'light', bridge: false }), [
  ...defaultPairings(theme),
  ['logo on the header band', '--bn-theme-signal-info-line', '--bn-theme-surface-inverse', AA_NONTEXT],
]);
```

---

## What CI will fail on

| Failure | Thrown by | What it means |
| --- | --- | --- |
| `scheme is "undefined"` | `defineTheme` | You did not commit to light, dark or dual. See below — this one is not optional. |
| `theme.roles is missing` | `defineTheme` | A tier was skipped. All four are required. |
| `theme.ink.link references "brand.600", which the theme does not declare` | `defineTheme` | A dangling reference. |
| `ramps.primary.600 is "var(--x)" — a ramp step must be a literal` | `defineTheme` | A chain that never terminates in a colour. |
| `theme.signals.slots.warning is unassigned` | `defineTheme` | `renderBadge({ variant: 'warning' })` would have had no colours. |
| `muted text on sunk surface: … is 4.40:1, below 4.5:1` | `assertThemeContrast` | A real WCAG miss, with the real number. |
| a `--bn-*` name in neither `BN_BRIDGED` nor `UPSTREAM_OWNED` | this package's own `bridge.test.js` | `@basenative/components` grew a themeable token and the bridge has not caught up. |

---

## The four decisions behind this package

### Why there is no default theme

A reference theme in the exports becomes the de-facto org look, which is the
exact opposite of the point. So there isn't one. The starter above is a
**document**, not an import: forking it is an act of authorship. It is kept
honest by `readme.test.js`, which parses this file, runs `defineTheme` on the
block, and asserts its `neutral` and `primary` ramps are byte-identical to
`@basenative/components/src/tokens.css`. The docs cannot drift from the code and
the starter cannot quietly become a brand.

Colour is never defaulted. Geometry is — a radius ladder is ergonomics, not
identity.

### Signal families vs. the five slots

`@basenative/components` declares exactly five badge/alert variants:
`default | primary | success | warning | error`. Real domains do not have five
statuses called that. Greenput's are `idle | move | good | dead`; a warehouse
app's might be `receiving | staged | short | damaged`.

So a theme declares **families under its own names**, then **assigns** one to
each of the five slots:

```js
signals: {
  families: {
    idle: { … }, move: { … }, good: { … }, dead: { … },
  },
  slots: { default: 'idle', primary: 'idle', success: 'good', warning: 'move', error: 'dead' },
}
```

Families are not limited to five and two slots may share one. Every family gets
its own `--bn-theme-signal-<name>-*` properties for your own CSS, and — this is
the part that matters — **every family gets contrast rows whether or not it is
assigned to a slot**. There is no way to add a status colour that is never
measured.

Each family carries five channels: `bg` (the tint a badge sits on), `ink` (text
on that tint *and* on the page), `line` (the family's rule, gated at 3:1 for SC
1.4.11), `solid` (the filled version) and `onSolid` (text on the fill).

> Measured while writing this: white on `--bn-color-success-600` (#16a34a) is
> 3.30:1 and on `--bn-color-warning-600` (#d97706) is 3.19:1, while
> `--bn-color-error-600` is 4.83:1. Upstream only ever paints text on the error
> fill, so it ships nothing broken — but a green "Approve" button built from
> `-600` would. The starter's success and warning solids are one step darker.

### Dark themes: optional, but the commitment is not

`validateTheme` does **not** require a dark tier. It requires `scheme`, and it
is `'light' | 'dark' | 'dual'` with no default.

A single-scheme theme emits **exactly one block, unconditioned** — no media
query, no `data-theme` variants. That is the whole fix for the failure this
package was built after: pendingbusiness.com is a dark site that never set
`data-theme`, so a reader whose OS was in light mode fell through
`@media (prefers-color-scheme: dark)` and got `--bn-color-error-bg: #fef2f2` — a
near-white alert on a near-black page.

With `scheme: 'dark'` there is nothing to fall through. The dark values are
emitted in every context, `color-scheme: dark` is pinned, and the `data-theme`
attribute stops being load-bearing. Shipping that bug now requires declaring
`scheme: 'dual'` and writing a light palette on purpose — at which point the
harness measures it.

A dual theme mirrors upstream's activation model at matching specificity, so its
own dark palette wins, and `validateTheme` refuses a half-themed dark block
whose family list differs from the light one.

### Why the bridge lives here

`components` owns components. Its `tokens.css` is already a complete neutral
default and it should stay ignorant that themes exist. The cost — this package's
name list can fall behind a components release — is **measured, not assumed**:

- `BN_BRIDGED` is the list the bridge emits (92 names today).
- `UPSTREAM_OWNED` is the list deliberately left alone, each with its reason.
- `bridge.test.js` reads every stylesheet in `packages/components/src` and fails
  if a `var(--bn-*)` appears in neither list.

A components release that adds a themeable token breaks this package's build in
the same CI run, instead of silently going unthemed in six properties.
`validateBridge(css)` is exported so a consumer can run the same check against
whatever version it has installed.

**What the bridge leaves alone:** the type scale, font weights, line heights,
the space ladder, shadows, easing curves, z-indices, and per-instance geometry
knobs. Those are app decisions, not palette ones — override them in your own
CSS. Colour, font family, the radius ladder, control heights, the tap-target
minimum and the three motion durations are all bridged.

**How the bridge wins.** `components/theme.css` activates its dark palette at
`:root:not([data-theme="light"])` inside a media query — specificity (0,2,0). A
bridge at plain `:root` (0,1,0) would lose to it, which is how upstream dark
values leak past a theme. Both bridge selectors are (0,2,1):

```css
html:root[data-theme],
html:root:not([data-theme="light"]) { … }
```

Between them they match every value of `data-theme`, including its absence, and
they beat upstream everywhere. Upstream's `--bn-dark-*` layer is therefore fully
neutralised: the theme decides what dark means.

---

## Icons

Not an icon library — the discipline that makes a row of icons read as a set.

```js
import { defineIconSet, renderIcon } from '@basenative/theme/icons';

export const icons = defineIconSet({
  grid: 24,
  strokeWidth: 1.75,
  icons: {
    activity: '<path d="M3 12h4l3 7 4-14 3 7h4"/>',
    check: '<path d="m4.5 12.5 5 5 10-11"/>',
  },
});

renderIcon(icons, 'activity');                      // aria-hidden — it sits beside a label
renderIcon(icons, 'check', { title: 'Verified' });  // role="img" — it IS the label
```

`defineIconSet` throws on anything that breaks the set's evenness: a fill, a
baked-in stroke colour or literal hex, a per-icon `stroke-width`, an inline
style, a nested `<svg>`, its own `viewBox`. One grid, one weight,
`currentColor`, decorative by default.

A body is the *contents* of an `<svg>`, so `width` and `height` inside it are
ordinary geometry and are allowed — `<rect x="3" y="5" width="18" height="16"
rx="2"/>` is a calendar. Self-sizing is a property of the outer element, which
`renderIcon` writes and a body cannot have.

## Contrast, directly

```js
import { contrastRatio, relativeLuminance, AA_TEXT } from '@basenative/theme/contrast';

contrastRatio('#166534', '#dcfce7');  // 6.49
```

`parseCustomProperties(css)` and `resolveColor(name, props)` are the pieces the
audit harness is built from: the resolver follows `var()` chains to a literal
`#rrggbb` and throws on a dangling reference, a cycle, or a non-literal terminal.

`parseCustomProperties` reads a stylesheet as one flat map, so measuring a dual
theme means emitting one scheme at a time — `toCss(theme, { only: 'dark' })`.
`assertThemeContrast` does that for you.

## Lineage

The contrast engine, the pairing harness, `minifyCss` and the icon invariants
were proven in `libs/shared/design` in the Greenput repo, where the pairing
table was hardcoded and fused to the `--gp-*` namespace. Here the table is an
argument, every token name is a parameter, and Greenput's palette, its four
contractor signal families, its webfont and its mark stayed behind, where they
belong.

## License

Apache-2.0
