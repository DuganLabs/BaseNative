/**
 * The `--bn-*` bridge: one static block that re-points every themeable custom
 * property `@basenative/components` reads at this package's `--bn-theme-*`
 * names.
 *
 * WHY IT LIVES HERE AND NOT IN `components`. `components` owns components;
 * `components/tokens.css` is already a complete, neutral default theme and it
 * should stay ignorant that themes exist at all. The cost of putting the bridge
 * here is that this package's name list can fall behind a components release —
 * so that cost is measured rather than assumed: `BN_BRIDGED` is the list this
 * block actually emits, `UPSTREAM_OWNED` is the list deliberately left to
 * `components`, and `bridge.test.js` reads every stylesheet in
 * `packages/components/src` and fails if a `var(--bn-*)` appears in neither.
 * A components release that adds a themeable token breaks this package's build,
 * in the same CI run, instead of silently going unthemed in six properties.
 *
 * WHY THE SELECTOR LIST IS WHAT IT IS. `components/theme.css` activates its own
 * dark palette at two specificities:
 *
 *     @media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) }   (0,2,0)
 *     [data-theme="dark"]                                                        (0,1,0)
 *
 * A bridge at plain `:root` (0,1,0) loses to the first of those, so on an
 * OS-dark machine upstream's dark values would leak past the theme. Both
 * selectors below are (0,2,1) — `html` + `:root` + one attribute — so the
 * bridge wins in every context, and between them they match every possible
 * value of `data-theme` including its absence:
 *
 *     no attribute      -> :not([data-theme="light"])
 *     data-theme=light  -> [data-theme]
 *     data-theme=dark   -> both
 *
 * The theme's own `--bn-theme-*` values decide which palette that is. Upstream's
 * `--bn-dark-*` layer is therefore fully neutralised: the theme, not the
 * component package, decides what dark means.
 *
 * It is emitted into `@layer tokens` to sit in the declared layer order
 * (`reset, tokens, layout, components, states`) rather than above all of it.
 */

/** The bridge, as text. Byte-identical to `src/bridge.css`; `bridge.test.js` enforces that. */
export const BRIDGE_CSS = `@layer tokens {
  /* @basenative/theme — the --bn-* bridge.
     Generated from src/bridge.js; edit that, not this. See the rationale there
     for why both selectors are (0,2,1) and why this block lives in @layer tokens. */
  html:root[data-theme],
  html:root:not([data-theme="light"]) {
    /* Ramps. --bn-color-accent-* already aliases --bn-color-primary-* upstream,
       so re-pointing primary carries accent with it. */
    --bn-color-gray-50: var(--bn-theme-ramp-neutral-50);
    --bn-color-gray-100: var(--bn-theme-ramp-neutral-100);
    --bn-color-gray-200: var(--bn-theme-ramp-neutral-200);
    --bn-color-gray-300: var(--bn-theme-ramp-neutral-300);
    --bn-color-gray-400: var(--bn-theme-ramp-neutral-400);
    --bn-color-gray-500: var(--bn-theme-ramp-neutral-500);
    --bn-color-gray-600: var(--bn-theme-ramp-neutral-600);
    --bn-color-gray-700: var(--bn-theme-ramp-neutral-700);
    --bn-color-gray-800: var(--bn-theme-ramp-neutral-800);
    --bn-color-gray-900: var(--bn-theme-ramp-neutral-900);
    --bn-color-gray-950: var(--bn-theme-ramp-neutral-950);
    --bn-color-primary-50: var(--bn-theme-ramp-primary-50);
    --bn-color-primary-100: var(--bn-theme-ramp-primary-100);
    --bn-color-primary-200: var(--bn-theme-ramp-primary-200);
    --bn-color-primary-300: var(--bn-theme-ramp-primary-300);
    --bn-color-primary-400: var(--bn-theme-ramp-primary-400);
    --bn-color-primary-500: var(--bn-theme-ramp-primary-500);
    --bn-color-primary-600: var(--bn-theme-ramp-primary-600);
    --bn-color-primary-700: var(--bn-theme-ramp-primary-700);
    --bn-color-primary-800: var(--bn-theme-ramp-primary-800);
    --bn-color-primary-900: var(--bn-theme-ramp-primary-900);

    /* Surfaces. -control and -card take the RAISED surface, not the page: on a
       dark theme a control that shares the page colour dissolves into it with
       nothing but a 1px border left, which is the bug components/tokens.css
       documents T4BS and PendingBusiness both hitting. */
    --bn-color-surface: var(--bn-theme-surface);
    --bn-color-surface-subtle: var(--bn-theme-surface-subtle);
    --bn-color-surface-muted: var(--bn-theme-surface-sunk);
    --bn-color-surface-inset: var(--bn-theme-surface-sunk);
    --bn-color-surface-raised: var(--bn-theme-surface-raised);
    --bn-color-surface-control: var(--bn-theme-surface-raised);
    --bn-color-surface-card: var(--bn-theme-surface-raised);
    --bn-color-surface-inverse: var(--bn-theme-surface-inverse);

    /* Ink */
    --bn-color-text: var(--bn-theme-ink);
    --bn-color-text-muted: var(--bn-theme-ink-muted);
    --bn-color-text-subtle: var(--bn-theme-ink-subtle);
    --bn-color-text-inverse: var(--bn-theme-ink-inverse);
    --bn-color-text-link: var(--bn-theme-ink-link);

    /* Borders and focus. --bn-color-border-light is a decorative hairline and
       rides --bn-theme-border; only -border-control carries SC 1.4.11. */
    --bn-color-border: var(--bn-theme-border);
    --bn-color-border-light: var(--bn-theme-border);
    --bn-color-border-strong: var(--bn-theme-border-strong);
    --bn-color-border-control: var(--bn-theme-border-control);
    --bn-color-toggle-track-off: var(--bn-theme-border-control);
    --bn-color-border-focus: var(--bn-theme-focus);
    --bn-focus-ring-color: var(--bn-theme-focus);

    /* Foreground on a filled brand surface. The toggle knob rides the primary
       track when ON, so it takes the same foreground. */
    --bn-color-on-primary: var(--bn-theme-on-primary);
    --bn-color-on-accent: var(--bn-theme-on-primary);
    --bn-color-toggle-knob: var(--bn-theme-on-primary);
    --bn-color-on-error: var(--bn-theme-slot-error-on-solid);

    /* Selection */
    --bn-color-selected-bg: var(--bn-theme-selected-bg);
    --bn-color-selected-text: var(--bn-theme-selected-ink);
    --bn-color-zebra: var(--bn-theme-zebra);

    /* The five declared badge/alert variants, driven by whichever signal family
       the theme assigned to each slot. A theme names its families for its own
       domain; these five names are the component contract. */
    --bn-color-info-bg: var(--bn-theme-slot-primary-bg);
    --bn-color-info-border: var(--bn-theme-slot-primary-line);
    --bn-color-info-text: var(--bn-theme-slot-primary-ink);
    --bn-color-info-500: var(--bn-theme-slot-primary-line);
    --bn-color-info-600: var(--bn-theme-slot-primary-solid);
    --bn-color-success-bg: var(--bn-theme-slot-success-bg);
    --bn-color-success-50: var(--bn-theme-slot-success-bg);
    --bn-color-success-border: var(--bn-theme-slot-success-line);
    --bn-color-success-text: var(--bn-theme-slot-success-ink);
    --bn-color-success-500: var(--bn-theme-slot-success-line);
    --bn-color-success-600: var(--bn-theme-slot-success-solid);
    --bn-color-warning-bg: var(--bn-theme-slot-warning-bg);
    --bn-color-warning-50: var(--bn-theme-slot-warning-bg);
    --bn-color-warning-border: var(--bn-theme-slot-warning-line);
    --bn-color-warning-text: var(--bn-theme-slot-warning-ink);
    --bn-color-warning-500: var(--bn-theme-slot-warning-line);
    --bn-color-warning-600: var(--bn-theme-slot-warning-solid);
    --bn-color-error-bg: var(--bn-theme-slot-error-bg);
    --bn-color-error-border: var(--bn-theme-slot-error-line);
    --bn-color-error-text: var(--bn-theme-slot-error-ink);
    --bn-color-error-fg: var(--bn-theme-slot-error-ink);
    --bn-color-error-500: var(--bn-theme-slot-error-line);
    --bn-color-error-600: var(--bn-theme-slot-error-solid);
    --bn-color-success-badge-bg: var(--bn-theme-slot-success-bg);
    --bn-color-success-badge-text: var(--bn-theme-slot-success-ink);
    --bn-color-warning-badge-bg: var(--bn-theme-slot-warning-bg);
    --bn-color-warning-badge-text: var(--bn-theme-slot-warning-ink);
    --bn-color-error-badge-bg: var(--bn-theme-slot-error-bg);
    --bn-color-error-badge-text: var(--bn-theme-slot-error-ink);

    /* Type, geometry, motion. The size ladder, weights, line heights, the space
       scale and the easing curves stay upstream — see UPSTREAM_OWNED. */
    --bn-font-family: var(--bn-theme-font-sans);
    --bn-font-mono: var(--bn-theme-font-mono);
    --bn-radius-sm: var(--bn-theme-radius-sm);
    --bn-radius-md: var(--bn-theme-radius-md);
    --bn-radius-lg: var(--bn-theme-radius-lg);
    --bn-radius-xl: var(--bn-theme-radius-xl);
    --bn-radius-full: var(--bn-theme-radius-full);
    --bn-control-height: var(--bn-theme-control-h);
    --bn-control-height-sm: var(--bn-theme-control-h-sm);
    --bn-control-height-lg: var(--bn-theme-control-h-lg);
    --bn-target-size-min: var(--bn-theme-tap-min);
    --bn-control-indicator-size: var(--bn-theme-control-indicator);
    --bn-transition-fast: var(--bn-theme-motion-fast);
    --bn-transition-normal: var(--bn-theme-motion-base);
    --bn-transition-slow: var(--bn-theme-motion-slow);
    --bn-scrim: var(--bn-theme-scrim);
  }
}
`;

/**
 * Every `--bn-*` name the bridge re-points. Derived from the text above so the
 * two cannot disagree.
 *
 * @type {readonly string[]}
 */
export const BN_BRIDGED = Object.freeze(
  [...BRIDGE_CSS.matchAll(/^\s*(--bn-[a-z0-9-]+)\s*:/gm)].map((m) => m[1]).sort(),
);

/**
 * `--bn-*` names `@basenative/components` reads that this bridge deliberately
 * does NOT touch, with the reason. `bridge.test.js` treats anything outside
 * these two lists as drift.
 *
 * @type {Readonly<Record<string, string>>}
 */
export const UPSTREAM_OWNED = Object.freeze({
  '--bn-color-white': 'a literal, not a theme decision',
  '--bn-color-black': 'a literal, not a theme decision',
  '--bn-color-accent-600': 'aliases --bn-color-primary-600 upstream; bridging primary carries it',
  '--bn-focus-ring': 'composed upstream from --bn-color-surface and --bn-color-border-focus, both bridged',
  '--bn-border-width': 'structural, not identity',
  '--bn-border-width-thick': 'structural, not identity',
  '--bn-size-content-max': 'layout measure — an app decision, not a palette one',
  '--bn-size-text-max': 'layout measure — an app decision, not a palette one',
  '--bn-font-size-xs': 'type scale — see README, "What the bridge leaves alone"',
  '--bn-font-size-sm': 'type scale',
  '--bn-font-size-base': 'type scale',
  '--bn-font-size-lg': 'type scale',
  '--bn-font-size-xl': 'type scale',
  '--bn-font-size-2xl': 'type scale',
  '--bn-font-size-3xl': 'type scale',
  '--bn-font-size-4xl': 'type scale',
  '--bn-font-size-component': 'derived from the type scale by the density attribute',
  '--bn-font-weight-normal': 'type scale',
  '--bn-font-weight-medium': 'type scale',
  '--bn-font-weight-semibold': 'type scale',
  '--bn-font-weight-bold': 'type scale',
  '--bn-line-height-tight': 'type scale',
  '--bn-line-height-snug': 'type scale',
  '--bn-line-height-normal': 'type scale',
  '--bn-line-height-relaxed': 'type scale',
  '--bn-letter-spacing-tight': 'type scale',
  '--bn-letter-spacing-normal': 'type scale',
  '--bn-letter-spacing-wide': 'type scale',
  '--bn-space-0': 'space ladder — a 4px grid is not identity; override it in app CSS',
  '--bn-space-half': 'space ladder',
  '--bn-space-1': 'space ladder',
  '--bn-space-2': 'space ladder',
  '--bn-space-3': 'space ladder',
  '--bn-space-4': 'space ladder',
  '--bn-space-5': 'space ladder',
  '--bn-space-6': 'space ladder',
  '--bn-space-8': 'space ladder',
  '--bn-space-10': 'space ladder',
  '--bn-space-12': 'space ladder',
  '--bn-space-16': 'space ladder',
  '--bn-space-component-x': 'derived from the space ladder by the density attribute',
  '--bn-space-component-y': 'derived from the space ladder by the density attribute',
  '--bn-radius-control': 'aliases --bn-radius-md upstream',
  '--bn-radius-indicator':
    'derived upstream from --bn-radius-control, which aliases the bridged --bn-radius-md',
  '--bn-color-control-selected':
    'aliases --bn-color-accent-600 upstream; bridging primary carries it',
  '--bn-color-on-control-selected': 'aliases --bn-color-on-accent, which is bridged',
  '--bn-color-border-control-hover':
    'composed upstream from --bn-color-border-control and --bn-color-text, both bridged',
  '--bn-toggle-track-inline-size':
    'derived upstream from --bn-control-indicator-size, which is bridged',
  '--bn-toggle-track-block-size':
    'derived upstream from --bn-control-indicator-size, which is bridged',
  '--bn-toggle-knob-size':
    'derived upstream from --bn-control-indicator-size, which is bridged',
  '--bn-toggle-knob-inset': 'structural, not identity',
  '--bn-radius-container': 'aliases --bn-radius-lg upstream',
  '--bn-radius-modal': 'aliases --bn-radius-xl upstream',
  '--bn-shadow-sm': 'elevation is a neutral alpha ramp, not a palette',
  '--bn-shadow-md': 'elevation',
  '--bn-shadow-lg': 'elevation',
  '--bn-shadow-modal': 'aliases --bn-shadow-lg upstream',
  '--bn-motion-fast': 'aliases --bn-transition-fast upstream',
  '--bn-motion-base': 'aliases --bn-transition-normal upstream',
  '--bn-motion-slow': 'aliases --bn-transition-slow upstream',
  '--bn-ease-out-expo': 'easing curve',
  '--bn-ease-spring': 'easing curve',
  '--bn-ease-out-back': 'easing curve',
  '--bn-z-dropdown': 'stacking order',
  '--bn-z-modal': 'stacking order',
  '--bn-z-toast': 'stacking order',
  '--bn-calendar-cols': 'per-instance geometry knob',
  '--bn-calendar-hours': 'per-instance geometry knob',
  '--bn-calendar-event-color': 'derived upstream from bridged colour tokens',
  '--bn-calendar-event-bg': 'derived upstream from bridged colour tokens',
  '--bn-calendar-today-bg': 'derived upstream from bridged colour tokens',
  '--bn-calendar-today-header-bg': 'derived upstream from bridged colour tokens',
  '--bn-calendar-today-text': 'derived upstream from bridged colour tokens',
  '--bn-pipeline-status-color': 'set per data-status from bridged colour tokens',
});

/**
 * Compares the bridge against the CSS a version of `@basenative/components`
 * actually ships.
 *
 * `--bn-dark-*` is skipped wholesale: it is upstream's own dark palette, which
 * the bridge overrides by construction, so a theme never needs to re-point it.
 *
 * @param {string} componentsCss  the concatenated stylesheets to check
 * @returns {{ ok: boolean, unbridged: string[] }}
 */
export function validateBridge(componentsCss) {
  const consumed = new Set(
    [...componentsCss.matchAll(/var\(\s*(--bn-[a-z0-9-]+)/g)].map((m) => m[1]),
  );
  const bridged = new Set(BN_BRIDGED);
  const unbridged = [...consumed]
    .filter(
      (name) =>
        !bridged.has(name) &&
        !Object.prototype.hasOwnProperty.call(UPSTREAM_OWNED, name) &&
        !name.startsWith('--bn-dark-') &&
        !name.startsWith('--bn-theme-'),
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
export function bridgeToBn() {
  return BRIDGE_CSS;
}
