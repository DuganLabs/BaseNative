/**
 * The CTI+ bridge: one static block that re-points every themeable custom
 * property `@basenative/components` reads at this package's theme names.
 *
 * WHY IT LIVES HERE AND NOT IN `components`. `components` owns components;
 * its generated token sheet is already a complete, neutral default theme and
 * it should stay ignorant that themes exist at all. The cost of putting the
 * bridge here is that this package's name list can fall behind a components
 * release — so that cost is measured rather than assumed: `CTI_BRIDGED` is
 * the list this block actually emits, `UPSTREAM_OWNED` is the list
 * deliberately left to `components`, and `bridge.test.js` reads every
 * stylesheet in `packages/components/src` and fails if a consumed name
 * appears in neither. A components release that adds a themeable token
 * breaks this package's build, in the same CI run, instead of silently
 * going unthemed in six properties.
 *
 * WHY THE SELECTOR LIST IS WHAT IT IS. The generated token sheet activates
 * its dark values at two specificities:
 *
 *     @media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) }   (0,2,0)
 *     :root[data-theme="dark"]                                                   (0,2,0)
 *
 * A bridge at plain `:root` (0,1,0) loses to both, so on an OS-dark machine
 * upstream's dark values would leak past the theme. Both selectors below are
 * (0,2,1) — `html` + `:root` + one attribute — so the bridge wins in every
 * context, and between them they match every possible value of `data-theme`
 * including its absence:
 *
 *     no attribute      -> :not([data-theme="light"])
 *     data-theme=light  -> [data-theme]
 *     data-theme=dark   -> both
 *
 * The theme's own values decide which palette that is. Dark is a mode
 * carried on the same tokens upstream — there is no separate dark name set —
 * so re-pointing a token re-points both of its modes at the theme.
 *
 * WHY IT IS UNLAYERED. Upstream declares its core tokens unlayered, and a
 * layered declaration loses to ANY unlayered one regardless of specificity:
 * the scrim token is unlayered, so a bridge sitting in `@layer tokens` could
 * never re-point it. This block is therefore emitted bare. The theme's own
 * emitted values stay in `@layer tokens`; only the bridge steps out of the
 * layer order.
 */

/** The bridge, as text. Byte-identical to `src/bridge.css`; `bridge.test.js` enforces that. */
export const BRIDGE_CSS = `/* @basenative/theme — the CTI+ bridge.
   Generated from src/bridge.js; edit that, not this. See the rationale there
   for why both selectors are (0,2,1) and why this block is unlayered. */
html:root[data-theme],
html:root:not([data-theme="light"]) {
  /* Ramps. The accent ramp already aliases the primary ramp upstream, so
     re-pointing primary carries accent with it. */
  --palette-gray-50: var(--palette-theme-neutral-50);
  --palette-gray-100: var(--palette-theme-neutral-100);
  --palette-gray-200: var(--palette-theme-neutral-200);
  --palette-gray-300: var(--palette-theme-neutral-300);
  --palette-gray-400: var(--palette-theme-neutral-400);
  --palette-gray-500: var(--palette-theme-neutral-500);
  --palette-gray-600: var(--palette-theme-neutral-600);
  --palette-gray-700: var(--palette-theme-neutral-700);
  --palette-gray-800: var(--palette-theme-neutral-800);
  --palette-gray-900: var(--palette-theme-neutral-900);
  --palette-gray-950: var(--palette-theme-neutral-950);
  --palette-primary-50: var(--palette-theme-primary-50);
  --palette-primary-100: var(--palette-theme-primary-100);
  --palette-primary-200: var(--palette-theme-primary-200);
  --palette-primary-300: var(--palette-theme-primary-300);
  --palette-primary-400: var(--palette-theme-primary-400);
  --palette-primary-500: var(--palette-theme-primary-500);
  --palette-primary-600: var(--palette-theme-primary-600);
  --palette-primary-700: var(--palette-theme-primary-700);
  --palette-primary-800: var(--palette-theme-primary-800);
  --palette-primary-900: var(--palette-theme-primary-900);

  /* Surfaces. The control and card surfaces take the RAISED surface, not
     the page: on a dark theme a control that shares the page colour
     dissolves into it with nothing but a 1px border left, which is the bug
     the components token sheet documents T4BS and PendingBusiness both
     hitting. */
  --color-surface: var(--color-bkg-theme-surface);
  --color-surface-subtle: var(--color-bkg-theme-surface-subtle);
  --color-surface-muted: var(--color-bkg-theme-surface-sunk);
  --color-surface-inset: var(--color-bkg-theme-surface-sunk);
  --color-surface-raised: var(--color-bkg-theme-surface-raised);
  --color-surface-control: var(--color-bkg-theme-surface-raised);
  --color-surface-card: var(--color-bkg-theme-surface-raised);
  --color-surface-inverse: var(--color-bkg-theme-surface-inverse);

  /* Ink */
  --color-text: var(--color-text-theme-ink);
  --color-text-muted: var(--color-text-theme-ink-muted);
  --color-text-subtle: var(--color-text-theme-ink-subtle);
  --color-text-inverse: var(--color-text-theme-ink-inverse);
  --color-text-link: var(--color-text-theme-ink-link);

  /* Borders and focus. The light border is a decorative hairline and rides
     the theme border; only the control border carries SC 1.4.11. The toggle
     track in its off state takes that same control border. */
  --color-border: var(--color-border-theme);
  --color-border-light: var(--color-border-theme);
  --color-border-strong: var(--color-border-theme-strong);
  --color-border-control: var(--color-border-theme-control);
  --color-bkg-toggle-track-off: var(--color-border-theme-control);
  --color-border-focus: var(--color-border-theme-focus);
  --color-focus-ring: var(--color-border-theme-focus);

  /* Foreground on a filled brand surface. */
  --color-text-on-primary: var(--color-text-theme-on-primary);
  --color-text-on-accent: var(--color-text-theme-on-primary);
  --color-text-on-error: var(--color-text-theme-slot-error-on-solid);

  /* Selection, striping, and the scrim — both scrim names, the surface one
     and the background one, re-point at the theme's scrim. */
  --color-bkg-selected: var(--color-bkg-theme-selected);
  --color-text-selected: var(--color-text-theme-selected);
  --color-bkg-zebra: var(--color-bkg-theme-zebra);
  --color-scrim: var(--color-bkg-theme-scrim);
  --color-bkg-scrim: var(--color-bkg-theme-scrim);

  /* The four signal families, driven by whichever family the theme
     assigned to each slot — info rides the primary slot. A theme names its
     families for its own domain; these names are the component contract.
     The palette steps re-point at the slot's line and solid, and the two
     50 steps that exist upstream re-point at the slot's tint. */
  --color-bkg-info: var(--color-bkg-theme-slot-primary);
  --color-border-info: var(--color-border-theme-slot-primary);
  --color-text-info: var(--color-text-theme-slot-primary);
  --palette-info-500: var(--color-border-theme-slot-primary);
  --palette-info-600: var(--color-bkg-theme-slot-primary-solid);
  --color-bkg-success: var(--color-bkg-theme-slot-success);
  --color-border-success: var(--color-border-theme-slot-success);
  --color-text-success: var(--color-text-theme-slot-success);
  --palette-success-500: var(--color-border-theme-slot-success);
  --palette-success-600: var(--color-bkg-theme-slot-success-solid);
  --palette-success-50: var(--color-bkg-theme-slot-success);
  --color-bkg-warning: var(--color-bkg-theme-slot-warning);
  --color-border-warning: var(--color-border-theme-slot-warning);
  --color-text-warning: var(--color-text-theme-slot-warning);
  --palette-warning-500: var(--color-border-theme-slot-warning);
  --palette-warning-600: var(--color-bkg-theme-slot-warning-solid);
  --palette-warning-50: var(--color-bkg-theme-slot-warning);
  --color-bkg-error: var(--color-bkg-theme-slot-error);
  --color-border-error: var(--color-border-theme-slot-error);
  --color-text-error: var(--color-text-theme-slot-error);
  --color-text-error-fg: var(--color-text-theme-slot-error);
  --palette-error-500: var(--color-border-theme-slot-error);
  --palette-error-600: var(--color-bkg-theme-slot-error-solid);
  --color-bkg-success-badge: var(--color-bkg-theme-slot-success);
  --color-text-success-badge: var(--color-text-theme-slot-success);
  --color-bkg-warning-badge: var(--color-bkg-theme-slot-warning);
  --color-text-warning-badge: var(--color-text-theme-slot-warning);
  --color-bkg-error-badge: var(--color-bkg-theme-slot-error);
  --color-text-error-badge: var(--color-text-theme-slot-error);

  /* Type, geometry, motion. The size ladder, weights, line heights, the
     space scale and the easing curves stay upstream — see UPSTREAM_OWNED.
     The radius rows pin the theme ladder onto upstream's legacy ladder BY
     VALUE: the theme's sm is upstream's xs, its md is the legacy md, its
     lg is upstream's sm, its xl is upstream's lg — the same ladder
     theme.test.js asserts byte-identical defaults against. */
  --font-family-sans: var(--font-family-theme-sans);
  --font-family-code: var(--font-family-theme-mono);
  --size-radius-xs: var(--size-radius-theme-sm);
  --size-radius-legacy-md: var(--size-radius-theme-md);
  --size-radius-sm: var(--size-radius-theme-lg);
  --size-radius-lg: var(--size-radius-theme-xl);
  --size-radius-pill: var(--size-radius-theme-full);
  --size-control-height: var(--size-theme-control-h);
  --size-control-height-sm: var(--size-theme-control-h-sm);
  --size-control-height-lg: var(--size-theme-control-h-lg);
  --size-target-floor: var(--size-theme-tap-min);
  --size-control-indicator: var(--size-theme-control-indicator);
  --motion-fast: var(--motion-theme-fast);
  --motion-base: var(--motion-theme-base);
  --motion-slow: var(--motion-theme-slow);
}
`;

/**
 * Every name the bridge re-points. Derived from the text above so the two
 * cannot disagree.
 *
 * @type {readonly string[]}
 */
export const CTI_BRIDGED = Object.freeze(
  [...BRIDGE_CSS.matchAll(/^\s*(--[a-z0-9-]+)\s*:/gm)].map((m) => m[1]).sort(),
);

/**
 * Names `@basenative/components` reads that this bridge deliberately does
 * NOT touch, with the reason. `bridge.test.js` treats anything outside
 * these two lists as drift.
 *
 * @type {Readonly<Record<string, string>>}
 */
export const UPSTREAM_OWNED = Object.freeze({
  '--color-avatar-tone':
    "per-instance identity colour — set by components from a stable hash of the person's name; identity, not theme",
  '--color-background':
    'trinity-native token with no pre-migration bridge counterpart — upstream-owned; the bridge does not re-point it yet',
  '--color-background-2':
    'trinity-native token with no pre-migration bridge counterpart — upstream-owned; the bridge does not re-point it yet',
  '--color-background-3':
    'trinity-native token with no pre-migration bridge counterpart — upstream-owned; the bridge does not re-point it yet',
  '--color-background-grouped':
    'trinity-native token with no pre-migration bridge counterpart — upstream-owned; the bridge does not re-point it yet',
  '--color-background-grouped-2':
    'trinity-native token with no pre-migration bridge counterpart — upstream-owned; the bridge does not re-point it yet',
  '--color-background-grouped-3':
    'trinity-native token with no pre-migration bridge counterpart — upstream-owned; the bridge does not re-point it yet',
  '--color-bkg-calendar-event': 'derived upstream from bridged colour tokens',
  '--color-bkg-calendar-today': 'derived upstream from bridged colour tokens',
  '--color-bkg-calendar-today-header': 'derived upstream from bridged colour tokens',
  '--color-bkg-control-selected':
    'rides the accent chain upstream, which follows the bridged primary ramp',
  '--color-bkg-material':
    'material — a platform-layer treatment; the app supplies it, not the theme',
  '--color-bkg-toggle-knob-legacy':
    'legacy-sheet token — the legacy toggle keeps its own knob colour while that sheet awaits retirement; not themed',
  '--color-border-control-hover':
    'composed upstream from the bridged border-control and text tokens',
  '--color-border-separator':
    'trinity-native token with no pre-migration bridge counterpart — upstream-owned',
  '--color-border-separator-opaque':
    'trinity-native token with no pre-migration bridge counterpart — upstream-owned',
  '--color-danger':
    'trinity-native token with no pre-migration bridge counterpart — upstream-owned',
  '--color-danger-strong':
    'trinity-native token with no pre-migration bridge counterpart — upstream-owned',
  '--color-fill':
    'trinity-native token with no pre-migration bridge counterpart — upstream-owned; the bridge does not re-point it yet',
  '--color-fill-2':
    'trinity-native token with no pre-migration bridge counterpart — upstream-owned; the bridge does not re-point it yet',
  '--color-fill-3':
    'trinity-native token with no pre-migration bridge counterpart — upstream-owned; the bridge does not re-point it yet',
  '--color-fill-4':
    'trinity-native token with no pre-migration bridge counterpart — upstream-owned; the bridge does not re-point it yet',
  '--color-pipeline-status': 'set per data-status from bridged colour tokens',
  '--color-success':
    'trinity-native token with no pre-migration bridge counterpart — upstream-owned',
  '--color-text-calendar-event': 'derived upstream from bridged colour tokens',
  '--color-text-calendar-today': 'derived upstream from bridged colour tokens',
  '--color-text-label':
    'trinity-native token with no pre-migration bridge counterpart — upstream-owned; the bridge does not re-point it yet',
  '--color-text-label-2':
    'trinity-native token with no pre-migration bridge counterpart — upstream-owned; the bridge does not re-point it yet',
  '--color-text-label-3':
    'trinity-native token with no pre-migration bridge counterpart — upstream-owned; the bridge does not re-point it yet',
  '--color-text-label-4':
    'trinity-native token with no pre-migration bridge counterpart — upstream-owned; the bridge does not re-point it yet',
  '--color-text-label-placeholder':
    'trinity-native token with no pre-migration bridge counterpart — upstream-owned; the bridge does not re-point it yet',
  '--color-text-on-control-selected':
    'rides the accent chain upstream, which follows the bridged primary ramp',
  '--color-text-on-tint':
    'trinity-native token with no pre-migration bridge counterpart — upstream-owned; the bridge does not re-point it yet',
  '--color-text-syntax-attr':
    'syntax highlight colour — the code-block sheet reads it; the bridge does not re-point a vocabulary',
  '--color-text-syntax-binding':
    'syntax highlight colour — the code-block sheet reads it; the bridge does not re-point a vocabulary',
  '--color-text-syntax-comment':
    'syntax highlight colour — the code-block sheet reads it; the bridge does not re-point a vocabulary',
  '--color-text-syntax-directive':
    'syntax highlight colour — the code-block sheet reads it; the bridge does not re-point a vocabulary',
  '--color-text-syntax-function':
    'syntax highlight colour — the code-block sheet reads it; the bridge does not re-point a vocabulary',
  '--color-text-syntax-interpolation':
    'syntax highlight colour — the code-block sheet reads it; the bridge does not re-point a vocabulary',
  '--color-text-syntax-keyword':
    'syntax highlight colour — the code-block sheet reads it; the bridge does not re-point a vocabulary',
  '--color-text-syntax-number':
    'syntax highlight colour — the code-block sheet reads it; the bridge does not re-point a vocabulary',
  '--color-text-syntax-string':
    'syntax highlight colour — the code-block sheet reads it; the bridge does not re-point a vocabulary',
  '--color-text-syntax-tag':
    'syntax highlight colour — the code-block sheet reads it; the bridge does not re-point a vocabulary',
  '--color-text-syntax-token-item':
    'syntax highlight colour — the code-block sheet reads it; the bridge does not re-point a vocabulary',
  '--color-text-syntax-token-state':
    'syntax highlight colour — the code-block sheet reads it; the bridge does not re-point a vocabulary',
  '--color-tint':
    'trinity-native token with no pre-migration bridge counterpart — upstream-owned; the bridge does not re-point it yet',
  '--color-tint-fill':
    'trinity-native token with no pre-migration bridge counterpart — upstream-owned; the bridge does not re-point it yet',
  '--color-tint-strong':
    'trinity-native token with no pre-migration bridge counterpart — upstream-owned; the bridge does not re-point it yet',
  '--color-warning':
    'trinity-native token with no pre-migration bridge counterpart — upstream-owned',
  '--color-warning-strong':
    'trinity-native token with no pre-migration bridge counterpart — upstream-owned',
  '--font-body-family': 'type system — the trinity text styles and stacks stay upstream',
  '--font-body-leading': 'type system — the trinity text styles and stacks stay upstream',
  '--font-body-size': 'type system — the trinity text styles and stacks stay upstream',
  '--font-body-tracking': 'type system — the trinity text styles and stacks stay upstream',
  '--font-body-weight': 'type system — the trinity text styles and stacks stay upstream',
  '--font-callout-family': 'type system — the trinity text styles and stacks stay upstream',
  '--font-callout-leading': 'type system — the trinity text styles and stacks stay upstream',
  '--font-callout-size': 'type system — the trinity text styles and stacks stay upstream',
  '--font-callout-tracking': 'type system — the trinity text styles and stacks stay upstream',
  '--font-callout-weight': 'type system — the trinity text styles and stacks stay upstream',
  '--font-caption-1-family': 'type system — the trinity text styles and stacks stay upstream',
  '--font-caption-1-leading': 'type system — the trinity text styles and stacks stay upstream',
  '--font-caption-1-size': 'type system — the trinity text styles and stacks stay upstream',
  '--font-caption-1-tracking': 'type system — the trinity text styles and stacks stay upstream',
  '--font-caption-2-family': 'type system — the trinity text styles and stacks stay upstream',
  '--font-caption-2-leading': 'type system — the trinity text styles and stacks stay upstream',
  '--font-caption-2-size': 'type system — the trinity text styles and stacks stay upstream',
  '--font-caption-2-tracking': 'type system — the trinity text styles and stacks stay upstream',
  '--font-caption-2-weight': 'type system — the trinity text styles and stacks stay upstream',
  '--font-family-display': 'type system — the trinity text styles and stacks stay upstream',
  '--font-family-mono': 'type system — the trinity text styles and stacks stay upstream',
  '--font-family-text': 'type system — the trinity text styles and stacks stay upstream',
  '--font-footnote-family': 'type system — the trinity text styles and stacks stay upstream',
  '--font-footnote-leading': 'type system — the trinity text styles and stacks stay upstream',
  '--font-footnote-size': 'type system — the trinity text styles and stacks stay upstream',
  '--font-footnote-tracking': 'type system — the trinity text styles and stacks stay upstream',
  '--font-headline-family': 'type system — the trinity text styles and stacks stay upstream',
  '--font-headline-leading': 'type system — the trinity text styles and stacks stay upstream',
  '--font-headline-size': 'type system — the trinity text styles and stacks stay upstream',
  '--font-headline-tracking': 'type system — the trinity text styles and stacks stay upstream',
  '--font-headline-weight': 'type system — the trinity text styles and stacks stay upstream',
  '--font-large-title-leading': 'type system — the trinity text styles and stacks stay upstream',
  '--font-large-title-size': 'type system — the trinity text styles and stacks stay upstream',
  '--font-large-title-tracking': 'type system — the trinity text styles and stacks stay upstream',
  '--font-leading-normal': 'type scale — see README, "What the bridge leaves alone"',
  '--font-leading-relaxed': 'type scale — see README, "What the bridge leaves alone"',
  '--font-leading-snug': 'type scale — see README, "What the bridge leaves alone"',
  '--font-leading-tight': 'type scale — see README, "What the bridge leaves alone"',
  '--font-size-2xl': 'type scale — see README, "What the bridge leaves alone"',
  '--font-size-3xl': 'type scale — see README, "What the bridge leaves alone"',
  '--font-size-4xl': 'type scale — see README, "What the bridge leaves alone"',
  '--font-size-base': 'type scale — see README, "What the bridge leaves alone"',
  '--font-size-component': 'type scale — see README, "What the bridge leaves alone"',
  '--font-size-lg': 'type scale — see README, "What the bridge leaves alone"',
  '--font-size-sm': 'type scale — see README, "What the bridge leaves alone"',
  '--font-size-xl': 'type scale — see README, "What the bridge leaves alone"',
  '--font-size-xs': 'type scale — see README, "What the bridge leaves alone"',
  '--font-subheadline-family': 'type scale — see README, "What the bridge leaves alone"',
  '--font-subheadline-leading': 'type scale — see README, "What the bridge leaves alone"',
  '--font-subheadline-size': 'type scale — see README, "What the bridge leaves alone"',
  '--font-subheadline-tracking': 'type scale — see README, "What the bridge leaves alone"',
  '--font-subheadline-weight': 'type scale — see README, "What the bridge leaves alone"',
  '--font-title-1-family': 'type system — the trinity text styles and stacks stay upstream',
  '--font-title-1-leading': 'type system — the trinity text styles and stacks stay upstream',
  '--font-title-1-size': 'type system — the trinity text styles and stacks stay upstream',
  '--font-title-1-tracking': 'type system — the trinity text styles and stacks stay upstream',
  '--font-title-2-family': 'type system — the trinity text styles and stacks stay upstream',
  '--font-title-2-leading': 'type system — the trinity text styles and stacks stay upstream',
  '--font-title-2-size': 'type system — the trinity text styles and stacks stay upstream',
  '--font-title-2-tracking': 'type system — the trinity text styles and stacks stay upstream',
  '--font-title-3-family': 'type system — the trinity text styles and stacks stay upstream',
  '--font-title-3-leading': 'type system — the trinity text styles and stacks stay upstream',
  '--font-title-3-size': 'type system — the trinity text styles and stacks stay upstream',
  '--font-title-3-tracking': 'type system — the trinity text styles and stacks stay upstream',
  '--font-title-3-weight': 'type system — the trinity text styles and stacks stay upstream',
  '--font-tracking-tight': 'type scale — see README, "What the bridge leaves alone"',
  '--font-tracking-wide': 'type scale — see README, "What the bridge leaves alone"',
  '--font-weight-bold': 'type scale — see README, "What the bridge leaves alone"',
  '--font-weight-medium': 'type scale — see README, "What the bridge leaves alone"',
  '--font-weight-regular': 'type scale — see README, "What the bridge leaves alone"',
  '--font-weight-semibold': 'type scale — see README, "What the bridge leaves alone"',
  '--layer-chrome': 'stacking order',
  '--layer-legacy-dropdown': 'stacking order',
  '--layer-legacy-modal': 'stacking order',
  '--layer-legacy-nav': 'stacking order',
  '--layer-legacy-toast': 'stacking order',
  '--layer-overlay': 'stacking order',
  '--material-backdrop':
    'material — a platform-layer treatment; the app supplies it, not the theme',
  '--motion-ease-out-expo': 'easing curve',
  '--motion-fade-curve': 'easing curve',
  '--motion-fade-duration': 'motion detail beyond the three bridged durations — upstream-owned',
  '--motion-spring-stiff-curve': 'easing curve',
  '--motion-spring-stiff-duration': 'easing curve',
  '--number-calendar-cols': 'per-instance or structural number — not a theme decision',
  '--number-calendar-event-lead': 'per-instance geometry knob, set inline by the calendar renderer',
  '--number-calendar-event-rows': 'per-instance geometry knob, set inline by the calendar renderer',
  '--number-calendar-event-trail':
    'per-instance geometry knob, set inline by the calendar renderer',
  '--number-calendar-hours': 'per-instance or structural number — not a theme decision',
  '--palette-accent-600': 'aliases the primary ramp upstream; bridging primary carries it',
  '--palette-system-blue': 'the system palette — platform-owned upstream, carries its own modes',
  '--palette-system-gray-4': 'the system palette — platform-owned upstream, carries its own modes',
  '--palette-system-green': 'the system palette — platform-owned upstream, carries its own modes',
  '--palette-system-orange': 'the system palette — platform-owned upstream, carries its own modes',
  '--palette-system-red': 'the system palette — platform-owned upstream, carries its own modes',
  '--palette-transparent': 'a literal, not a theme decision',
  '--palette-white': 'a literal, not a theme decision',
  '--radius-lg':
    'site alias of the trinity radius ladder — the bridge re-points the size-radius steps, not these short names',
  '--radius-md':
    'site alias of the trinity radius ladder — the bridge re-points the size-radius steps, not these short names',
  '--radius-sm':
    'site alias of the trinity radius ladder — the bridge re-points the size-radius steps, not these short names',
  '--radius-xl':
    'site alias of the trinity radius ladder — the bridge re-points the size-radius steps, not these short names',
  '--shadow-float': 'elevation is a neutral alpha ramp, not a palette',
  '--shadow-focus': 'elevation is a neutral alpha ramp, not a palette',
  '--shadow-focus-ring': 'elevation is a neutral alpha ramp, not a palette',
  '--shadow-lg': 'elevation is a neutral alpha ramp, not a palette',
  '--shadow-material': 'elevation is a neutral alpha ramp, not a palette',
  '--shadow-md': 'elevation is a neutral alpha ramp, not a palette',
  '--shadow-modal': 'elevation is a neutral alpha ramp, not a palette',
  '--shadow-none': 'elevation is a neutral alpha ramp, not a palette',
  '--shadow-raised': 'elevation is a neutral alpha ramp, not a palette',
  '--shadow-sm': 'elevation is a neutral alpha ramp, not a palette',
  '--size-1px': 'layout measure — an app decision, not a palette one',
  '--size-app-nav-bar': 'layout measure — an app decision, not a palette one',
  '--size-app-nav-visual-inset': 'layout measure — an app decision, not a palette one',
  '--size-border': 'layout measure — an app decision, not a palette one',
  '--size-border-none': 'layout measure — an app decision, not a palette one',
  '--size-border-thick': 'layout measure — an app decision, not a palette one',
  '--size-content-max': 'layout measure — an app decision, not a palette one',
  '--size-control': 'layout measure — an app decision, not a palette one',
  '--size-drawer-max': 'layout measure — an app decision, not a palette one',
  '--size-full': 'layout measure — an app decision, not a palette one',
  '--size-hairline': 'layout measure — an app decision, not a palette one',
  '--size-max-content': 'layout measure — an app decision, not a palette one',
  '--size-menu-min': 'layout measure — an app decision, not a palette one',
  '--size-nav-rail': 'layout measure — an app decision, not a palette one',
  '--size-palette-max': 'layout measure — an app decision, not a palette one',
  '--size-radius-2xl':
    'trinity radius step with no counterpart on the theme ladder, which pins to the legacy steps by value',
  '--size-radius-container':
    'trinity radius step with no counterpart on the theme ladder, which pins to the legacy steps by value',
  '--size-radius-control':
    'trinity radius step with no counterpart on the theme ladder, which pins to the legacy steps by value',
  '--size-radius-indicator':
    'trinity radius step with no counterpart on the theme ladder, which pins to the legacy steps by value',
  '--size-radius-legacy-container':
    'trinity radius step with no counterpart on the theme ladder, which pins to the legacy steps by value',
  '--size-radius-legacy-control':
    'trinity radius step with no counterpart on the theme ladder, which pins to the legacy steps by value',
  '--size-radius-legacy-modal':
    'trinity radius step with no counterpart on the theme ladder, which pins to the legacy steps by value',
  '--size-radius-md':
    'trinity radius step with no counterpart on the theme ladder, which pins to the legacy steps by value',
  '--size-radius-none':
    'trinity radius step with no counterpart on the theme ladder, which pins to the legacy steps by value',
  '--size-radius-sheet':
    'trinity radius step with no counterpart on the theme ladder, which pins to the legacy steps by value',
  '--size-radius-xl':
    'trinity radius step with no counterpart on the theme ladder, which pins to the legacy steps by value',
  '--size-sheet-max': 'layout measure — an app decision, not a palette one',
  '--size-switch-block': 'layout measure — an app decision, not a palette one',
  '--size-switch-inline': 'layout measure — an app decision, not a palette one',
  '--size-target-min': 'layout measure — an app decision, not a palette one',
  '--size-text-max': 'layout measure — an app decision, not a palette one',
  '--size-toggle-knob-legacy': 'layout measure — an app decision, not a palette one',
  '--size-toggle-track-block': 'layout measure — an app decision, not a palette one',
  '--size-toggle-track-inline': 'layout measure — an app decision, not a palette one',
  '--spacing-0': 'space ladder — a grid is not identity; override it in app CSS',
  '--spacing-1': 'space ladder — a grid is not identity; override it in app CSS',
  '--spacing-12': 'space ladder — a grid is not identity; override it in app CSS',
  '--spacing-16': 'space ladder — a grid is not identity; override it in app CSS',
  '--spacing-20': 'space ladder — a grid is not identity; override it in app CSS',
  '--spacing-2': 'space ladder — a grid is not identity; override it in app CSS',
  '--spacing-3': 'space ladder — a grid is not identity; override it in app CSS',
  '--spacing-4': 'space ladder — a grid is not identity; override it in app CSS',
  '--spacing-5': 'space ladder — a grid is not identity; override it in app CSS',
  '--spacing-6': 'space ladder — a grid is not identity; override it in app CSS',
  '--spacing-7': 'space ladder — a grid is not identity; override it in app CSS',
  '--spacing-8': 'space ladder — a grid is not identity; override it in app CSS',
  '--spacing-component-x': 'space ladder — a grid is not identity; override it in app CSS',
  '--spacing-component-y': 'space ladder — a grid is not identity; override it in app CSS',
  '--spacing-half': 'space ladder — a grid is not identity; override it in app CSS',
  '--spacing-margin-auto': 'space ladder — a grid is not identity; override it in app CSS',
  '--spacing-safe-bottom': 'space ladder — a grid is not identity; override it in app CSS',
  '--spacing-safe-right': 'space ladder — a grid is not identity; override it in app CSS',
  '--spacing-toggle-knob-inset-legacy':
    'space ladder — a grid is not identity; override it in app CSS',
});

/**
 * Compares the bridge against the CSS a version of `@basenative/components`
 * actually ships.
 *
 * Component-tier tokens (one file per component in the token source) and
 * keyword tokens are the caller's to pass as `exclude` — `bridge.test.js`
 * computes them from the DTCG source by file, `tokens/components/*.json`
 * plus `tokens/keyword.json` — because which names are component-scoped is
 * a fact about the caller's components version, not about this package.
 * Theme-emitted names never appear in components CSS, so nothing is skipped
 * by prefix any more; the dark values upstream are modes on the same names,
 * not a second name set.
 *
 * @param {string} componentsCss  the concatenated stylesheets to check
 * @param {object} [options]
 * @param {Iterable<string>} [options.exclude]  consumed names to ignore
 * @returns {{ ok: boolean, unbridged: string[] }}
 */
export function validateBridge(componentsCss, { exclude = [] } = {}) {
  const consumed = new Set([...componentsCss.matchAll(/var\(\s*(--[a-z0-9-]+)/g)].map((m) => m[1]));
  const bridged = new Set(CTI_BRIDGED);
  const excluded = new Set(exclude);
  const unbridged = [...consumed]
    .filter(
      (name) =>
        !bridged.has(name) &&
        !Object.prototype.hasOwnProperty.call(UPSTREAM_OWNED, name) &&
        !excluded.has(name),
    )
    .sort();
  return { ok: unbridged.length === 0, unbridged };
}

/**
 * The bridge as a string, for a consumer that adopts one constructed stylesheet
 * rather than linking `@basenative/theme/bridge.css`.
 *
 * @returns {string}
 */
export function bridgeToCti() {
  return BRIDGE_CSS;
}
