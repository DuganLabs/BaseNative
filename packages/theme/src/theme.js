/**
 * The theme shape, its validator, and its CSS emitter.
 *
 * A theme is four tiers, in this order, and nothing may skip one:
 *
 *   1. ramps     — literal `#rrggbb` scales. The only place a hex is written.
 *   2. surfaces  — what a thing sits ON: page, subtle, sunk, raised, inverse.
 *      ink       — what is written on it: base, muted, subtle, inverse, link.
 *   3. roles     — what an element IS: primary, border-control, focus, selected.
 *   4. signals   — families ("good", "stalled", "dead") with five channels each,
 *      assigned to the five badge/alert slots `@basenative/components` declares.
 *
 * Tiers 2-4 never carry a hex. They carry `'<ramp>.<step>'` references, which
 * are emitted as `var()` chains and resolved back to a literal by the validator.
 * That is the whole point: a palette change happens in one ramp step and every
 * tier above it moves with it, and `resolveColor` proves the chain terminates.
 *
 * COLOUR IS NEVER DEFAULTED. There is no reference palette in this package, on
 * purpose — see README, "Why there is no default theme". Geometry (radius,
 * control heights, motion, font stacks) IS defaulted, because a radius ladder
 * is ergonomics rather than identity; every default is asserted equal to
 * `@basenative/components`' own value by `theme.test.js`, so the two cannot
 * drift apart silently.
 */

import { parseCustomProperties, resolveColor } from './contrast.js';
import { BRIDGE_CSS } from './bridge.js';

/** Thrown by `defineTheme` when a theme is not valid. Carries every error. */
export class ThemeError extends Error {
  /**
   * @param {string[]} errors
   */
  constructor(errors) {
    super(`Invalid theme:\n  - ${errors.join('\n  - ')}`);
    this.name = 'ThemeError';
    /** @type {string[]} */
    this.errors = errors;
  }
}

/** The ramp every theme must declare, because components read `--bn-color-primary-*`. */
export const PRIMARY_RAMP_STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900];

/** The neutral ramp, one step deeper than primary because components read `gray-950`. */
export const NEUTRAL_RAMP_STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];

/** Tier 2a. `base` is the page; `sunk` is a well; `raised` is a card or a control. */
export const SURFACE_KEYS = ['base', 'subtle', 'sunk', 'raised', 'inverse'];

/** Tier 2b. `inverse` is what is legible on `surfaces.inverse`. */
export const INK_KEYS = ['base', 'muted', 'subtle', 'inverse', 'link'];

/** Tier 3. Every one of these is painted by a component in `@basenative/components`. */
export const ROLE_KEYS = [
  'primary',
  'primaryHover',
  'onPrimary',
  'primaryTint',
  'border',
  'borderStrong',
  'borderControl',
  'focus',
  'focusOnInverse',
  'selectedBg',
  'selectedInk',
];

/**
 * Tier 4 channels.
 *
 *   bg      the tint a badge or alert sits on
 *   ink     text on that tint, and on the page — gated at 4.5:1 against both
 *   line    the family's rule/border on the page — gated at 3:1 (SC 1.4.11)
 *   solid   the filled version (a destructive button, a status bar)
 *   onSolid text on `solid` — gated at 4.5:1
 */
export const SIGNAL_CHANNELS = ['bg', 'ink', 'line', 'solid', 'onSolid'];

/**
 * The five variant slots `renderBadge` and `renderAlert` declare. A theme names
 * its families whatever its domain calls them and then assigns one to each slot;
 * see README, "Signal families vs. the five slots".
 */
export const BADGE_SLOTS = ['default', 'primary', 'success', 'warning', 'error'];

/**
 * Non-colour groups. Defaulted, because a radius ladder is ergonomics and not
 * identity. `theme.test.js` asserts each default is byte-identical to the value
 * `@basenative/components/src/tokens.css` declares, so a change upstream fails
 * this package's build instead of quietly re-styling every property.
 */
export const GEOMETRY_DEFAULTS = Object.freeze({
  font: Object.freeze({
    sans: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
    mono: "ui-monospace, 'Cascadia Code', 'Fira Code', monospace",
  }),
  radius: Object.freeze({
    sm: '0.25rem',
    md: '0.375rem',
    lg: '0.5rem',
    xl: '0.75rem',
    full: '9999px',
  }),
  control: Object.freeze({
    height: '2.5rem',
    heightSm: '2rem',
    heightLg: '3rem',
    // WCAG 2.2 SC 2.5.8 Target Size (Minimum) is 24px. Raise this to 2.75rem
    // for a field app used with gloves; that is SC 2.5.5 (AAA) territory and a
    // per-property call, not a default this package makes for everyone.
    tapMin: '1.5rem',
  }),
  motion: Object.freeze({
    fast: '150ms ease',
    base: '200ms ease',
    slow: '300ms ease',
  }),
});

/**
 * Roles whose value is a raw CSS colour expression rather than a ramp reference
 * — translucency, which has no `#rrggbb` form and so cannot be contrast-checked.
 * Defaulted, overridable, never audited.
 */
export const RAW_DEFAULTS = Object.freeze({
  // A zebra stripe that reads as "lighten" on dark and "darken" on light cannot
  // be one value. Rather than guess, a theme opts in; the default is no stripe.
  zebra: 'transparent',
  scrim: 'rgb(0 0 0 / 0.4)',
});

/* ------------------------------------------------------------------ names */

/** camelCase -> kebab-case, for deriving a custom-property name from a key. */
function kebab(key) {
  return key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
}

/** `--bn-theme-ramp-primary-600` */
export function rampVar(ramp, step) {
  return `--bn-theme-ramp-${ramp}-${step}`;
}

/** `--bn-theme-surface`, `--bn-theme-surface-raised` */
export function surfaceVar(key) {
  return key === 'base' ? '--bn-theme-surface' : `--bn-theme-surface-${kebab(key)}`;
}

/** `--bn-theme-ink`, `--bn-theme-ink-muted` */
export function inkVar(key) {
  return key === 'base' ? '--bn-theme-ink' : `--bn-theme-ink-${kebab(key)}`;
}

/** `--bn-theme-primary-hover`, `--bn-theme-border-control` */
export function roleVar(key) {
  return `--bn-theme-${kebab(key)}`;
}

/** `--bn-theme-signal-good-bg` */
export function signalVar(family, channel) {
  return `--bn-theme-signal-${family}-${kebab(channel)}`;
}

/** `--bn-theme-slot-error-ink` — what the bridge reads, so the bridge can be static. */
export function slotVar(slot, channel) {
  return `--bn-theme-slot-${slot}-${kebab(channel)}`;
}

/* -------------------------------------------------------------- validate */

const HEX = /^#[0-9a-f]{6}$/i;
const REF = /^([a-z][a-z0-9]*(?:-[a-z0-9]+)*)\.([a-z0-9]+)$/i;
const NAME = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;

function isPlainObject(v) {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/**
 * Checks one tier-2/3/4 colour value: a literal hex, or `<ramp>.<step>` naming
 * a ramp and a step that exist.
 *
 * @param {unknown} value
 * @param {Record<string, Record<string, string>>} ramps
 * @param {string} where
 * @param {string[]} errors
 */
function checkColorValue(value, ramps, where, errors) {
  if (typeof value !== 'string' || value === '') {
    errors.push(`${where} is missing`);
    return;
  }
  if (HEX.test(value)) return;
  const m = REF.exec(value);
  if (!m) {
    errors.push(
      `${where} is "${value}" — a colour must be a literal #rrggbb or a "<ramp>.<step>" reference`,
    );
    return;
  }
  const [, ramp, step] = m;
  if (!Object.prototype.hasOwnProperty.call(ramps, ramp)) {
    errors.push(`${where} references ramp "${ramp}", which the theme does not declare`);
    return;
  }
  if (!Object.prototype.hasOwnProperty.call(ramps[ramp], step)) {
    errors.push(`${where} references "${ramp}.${step}", but that ramp has no step "${step}"`);
  }
}

/**
 * @param {Record<string, unknown>} tier
 * @param {string[]} keys
 * @param {Record<string, Record<string, string>>} ramps
 * @param {string} where
 * @param {string[]} errors
 */
function checkTier(tier, keys, ramps, where, errors) {
  if (!isPlainObject(tier)) {
    errors.push(`${where} is missing — a theme must declare all four tiers`);
    return;
  }
  for (const key of keys) checkColorValue(tier[key], ramps, `${where}.${key}`, errors);
  for (const key of Object.keys(tier)) {
    if (!keys.includes(key)) errors.push(`${where}.${key} is not a ${where} key`);
  }
}

function checkRamps(ramps, errors) {
  if (!isPlainObject(ramps)) {
    errors.push('ramps is missing — a theme must declare its ramps');
    return {};
  }
  for (const [name, steps] of Object.entries(ramps)) {
    if (!NAME.test(name)) {
      errors.push(`ramps.${name} is not a kebab-case ramp name`);
      continue;
    }
    if (!isPlainObject(steps) || Object.keys(steps).length === 0) {
      errors.push(`ramps.${name} declares no steps`);
      continue;
    }
    for (const [step, value] of Object.entries(steps)) {
      if (typeof value !== 'string' || !HEX.test(value)) {
        errors.push(
          `ramps.${name}.${step} is "${String(value)}" — a ramp step must be a literal #rrggbb, ` +
            'because a ramp is where the chain terminates',
        );
      }
    }
  }
  for (const [required, steps] of [
    ['primary', PRIMARY_RAMP_STEPS],
    ['neutral', NEUTRAL_RAMP_STEPS],
  ]) {
    const ramp = ramps[required];
    if (!isPlainObject(ramp)) {
      errors.push(
        `ramps.${required} is missing — @basenative/components reads ` +
          `--bn-color-${required === 'neutral' ? 'gray' : 'primary'}-* directly, so every theme declares it`,
      );
      continue;
    }
    const missing = steps.filter((s) => !Object.prototype.hasOwnProperty.call(ramp, String(s)));
    if (missing.length) {
      errors.push(`ramps.${required} is missing step(s) ${missing.join(', ')}`);
    }
  }
  return isPlainObject(ramps) ? ramps : {};
}

function checkSignals(signals, ramps, where, errors) {
  if (!isPlainObject(signals)) {
    errors.push(`${where} is missing — a theme must declare its signal families`);
    return;
  }
  const families = signals.families;
  if (!isPlainObject(families) || Object.keys(families).length === 0) {
    errors.push(`${where}.families declares no family`);
    return;
  }
  for (const [name, family] of Object.entries(families)) {
    if (!NAME.test(name)) {
      errors.push(`${where}.families.${name} is not a kebab-case family name`);
      continue;
    }
    if (!isPlainObject(family)) {
      errors.push(`${where}.families.${name} is not an object`);
      continue;
    }
    for (const channel of SIGNAL_CHANNELS) {
      checkColorValue(family[channel], ramps, `${where}.families.${name}.${channel}`, errors);
    }
    for (const channel of Object.keys(family)) {
      if (!SIGNAL_CHANNELS.includes(channel)) {
        errors.push(
          `${where}.families.${name}.${channel} is not a signal channel ` +
            `(${SIGNAL_CHANNELS.join(', ')})`,
        );
      }
    }
  }
  const slots = signals.slots;
  if (!isPlainObject(slots)) {
    errors.push(
      `${where}.slots is missing — a theme must say which family drives each of the five ` +
        `badge/alert variants (${BADGE_SLOTS.join(', ')})`,
    );
    return;
  }
  for (const slot of BADGE_SLOTS) {
    const family = slots[slot];
    if (typeof family !== 'string' || family === '') {
      errors.push(
        `${where}.slots.${slot} is unassigned — renderBadge({ variant: '${slot}' }) would have ` +
          'no colours. Assign one of your families to it, even if two slots share a family.',
      );
      continue;
    }
    if (!Object.prototype.hasOwnProperty.call(families, family)) {
      errors.push(`${where}.slots.${slot} names family "${family}", which the theme does not declare`);
    }
  }
  for (const slot of Object.keys(slots)) {
    if (!BADGE_SLOTS.includes(slot)) {
      errors.push(
        `${where}.slots.${slot} is not a declared variant — @basenative/components declares ` +
          `exactly ${BADGE_SLOTS.join(', ')}. Extra families are fine, extra slots are not.`,
      );
    }
  }
}

/** The colour tiers of a scheme (light, or the `dark` block of a dual theme). */
function checkScheme(block, ramps, where, errors) {
  if (!isPlainObject(block)) {
    errors.push(`${where} is missing`);
    return;
  }
  checkTier(block.surfaces, SURFACE_KEYS, ramps, `${where}.surfaces`, errors);
  checkTier(block.ink, INK_KEYS, ramps, `${where}.ink`, errors);
  checkTier(block.roles, ROLE_KEYS, ramps, `${where}.roles`, errors);
  checkSignals(block.signals, ramps, `${where}.signals`, errors);
}

/**
 * Validates a theme spec without throwing.
 *
 * Runs two passes. The first is structural — tiers present, keys present, values
 * well-formed. The second emits the theme's CSS and pushes every colour name
 * through `resolveColor`, which is what actually proves a `var()` chain
 * terminates in a literal; a reference that type-checks but dangles at runtime
 * fails here.
 *
 * @param {unknown} spec
 * @returns {{ ok: boolean, errors: string[] }}
 */
export function validateTheme(spec) {
  const errors = [];
  if (!isPlainObject(spec)) return { ok: false, errors: ['a theme must be an object'] };

  if (typeof spec.name !== 'string' || !NAME.test(spec.name)) {
    errors.push(`name is "${String(spec.name)}" — a theme needs a kebab-case name`);
  }

  const scheme = spec.scheme;
  if (scheme !== 'light' && scheme !== 'dark' && scheme !== 'dual') {
    errors.push(
      `scheme is "${String(scheme)}" — every theme commits to 'light', 'dark' or 'dual'. ` +
        'There is no default: a theme that does not say cannot be stopped from being ' +
        'flipped by the reader\'s OS into a palette it never declared.',
    );
  }

  const ramps = checkRamps(spec.ramps, errors);
  checkScheme(spec, ramps, 'theme', errors);

  if (scheme === 'dual') {
    if (!isPlainObject(spec.dark)) {
      errors.push("scheme is 'dual' but there is no dark block — declare one, or commit to a single scheme");
    } else {
      checkScheme(spec.dark, ramps, 'theme.dark', errors);
      const lightFamilies = Object.keys(spec.signals?.families ?? {}).sort();
      const darkFamilies = Object.keys(spec.dark.signals?.families ?? {}).sort();
      if (lightFamilies.join() !== darkFamilies.join()) {
        errors.push(
          `theme.dark.signals.families declares [${darkFamilies.join(', ')}] but the light block ` +
            `declares [${lightFamilies.join(', ')}] — a half-themed dark scheme is how a ` +
            'near-white alert ends up on a near-black page',
        );
      }
    }
  } else if (spec.dark !== undefined) {
    errors.push(
      `scheme is '${String(scheme)}' but a dark block is declared. A single-scheme theme emits ` +
        'one palette in every activation context on purpose; a second palette here would ' +
        'never be reached.',
    );
  }

  if (errors.length) return { ok: false, errors };

  // Second pass: prove every chain resolves. This is the check that catches a
  // typo'd reference, a cycle, or a terminal that is not a literal colour.
  for (const only of scheme === 'dual' ? ['light', 'dark'] : [scheme]) {
    const css = emitThemeCss(/** @type {any} */ (spec), { only, layer: false, bridge: false });
    const props = parseCustomProperties(css);
    for (const name of colorVarNames(/** @type {any} */ (spec))) {
      try {
        resolveColor(name, props);
      } catch (err) {
        errors.push(`${only}: ${name} — ${/** @type {Error} */ (err).message}`);
      }
    }
  }

  return { ok: errors.length === 0, errors };
}

/** Every `--bn-theme-*` name that must resolve to a literal colour. */
function colorVarNames(spec) {
  const names = [];
  for (const [ramp, steps] of Object.entries(spec.ramps)) {
    for (const step of Object.keys(steps)) names.push(rampVar(ramp, step));
  }
  for (const key of SURFACE_KEYS) names.push(surfaceVar(key));
  for (const key of INK_KEYS) names.push(inkVar(key));
  for (const key of ROLE_KEYS) names.push(roleVar(key));
  for (const family of Object.keys(spec.signals.families)) {
    for (const channel of SIGNAL_CHANNELS) names.push(signalVar(family, channel));
  }
  for (const slot of BADGE_SLOTS) {
    for (const channel of SIGNAL_CHANNELS) names.push(slotVar(slot, channel));
  }
  return names;
}

/**
 * Validates and freezes a theme, filling the geometry defaults.
 *
 * @param {object} spec
 * @returns {object} the normalised theme
 * @throws {ThemeError}
 */
export function defineTheme(spec) {
  const { ok, errors } = validateTheme(spec);
  if (!ok) throw new ThemeError(errors);

  const merged = {
    ...spec,
    font: { ...GEOMETRY_DEFAULTS.font, ...(spec.font ?? {}) },
    radius: { ...GEOMETRY_DEFAULTS.radius, ...(spec.radius ?? {}) },
    control: { ...GEOMETRY_DEFAULTS.control, ...(spec.control ?? {}) },
    motion: { ...GEOMETRY_DEFAULTS.motion, ...(spec.motion ?? {}) },
    raw: { ...RAW_DEFAULTS, ...(spec.raw ?? {}) },
  };
  return deepFreeze(merged);
}

function deepFreeze(value) {
  if (isPlainObject(value)) {
    for (const key of Object.keys(value)) deepFreeze(value[key]);
    return Object.freeze(value);
  }
  return value;
}

/* ------------------------------------------------------------------ emit */

/** A tier value -> the CSS it is emitted as. */
function cssValue(value) {
  if (HEX.test(value)) return value.toLowerCase();
  const m = REF.exec(value);
  return `var(${rampVar(m[1], m[2])})`;
}

function declarations(block, indent) {
  return block.map(([name, value]) => `${indent}${name}: ${value};`).join('\n');
}

/** The colour declarations for one scheme, in tier order. */
function schemeDeclarations(spec, block) {
  const out = [];
  for (const [ramp, steps] of Object.entries(spec.ramps)) {
    for (const [step, hex] of Object.entries(steps)) out.push([rampVar(ramp, step), hex.toLowerCase()]);
  }
  for (const key of SURFACE_KEYS) out.push([surfaceVar(key), cssValue(block.surfaces[key])]);
  for (const key of INK_KEYS) out.push([inkVar(key), cssValue(block.ink[key])]);
  for (const key of ROLE_KEYS) out.push([roleVar(key), cssValue(block.roles[key])]);
  for (const [family, channels] of Object.entries(block.signals.families)) {
    for (const channel of SIGNAL_CHANNELS) {
      out.push([signalVar(family, channel), cssValue(channels[channel])]);
    }
  }
  for (const slot of BADGE_SLOTS) {
    const family = block.signals.slots[slot];
    for (const channel of SIGNAL_CHANNELS) {
      out.push([slotVar(slot, channel), `var(${signalVar(family, channel)})`]);
    }
  }
  return out;
}

/** Geometry and raw values — one set, shared by both schemes. */
function geometryDeclarations(theme) {
  const font = { ...GEOMETRY_DEFAULTS.font, ...(theme.font ?? {}) };
  const radius = { ...GEOMETRY_DEFAULTS.radius, ...(theme.radius ?? {}) };
  const control = { ...GEOMETRY_DEFAULTS.control, ...(theme.control ?? {}) };
  const motion = { ...GEOMETRY_DEFAULTS.motion, ...(theme.motion ?? {}) };
  const raw = { ...RAW_DEFAULTS, ...(theme.raw ?? {}) };
  return [
    ['--bn-theme-font-sans', font.sans],
    ['--bn-theme-font-mono', font.mono],
    ...Object.entries(radius).map(([k, v]) => [`--bn-theme-radius-${kebab(k)}`, v]),
    ['--bn-theme-control-h', control.height],
    ['--bn-theme-control-h-sm', control.heightSm],
    ['--bn-theme-control-h-lg', control.heightLg],
    ['--bn-theme-tap-min', control.tapMin],
    ['--bn-theme-motion-fast', motion.fast],
    ['--bn-theme-motion-base', motion.base],
    ['--bn-theme-motion-slow', motion.slow],
    ['--bn-theme-zebra', raw.zebra],
    ['--bn-theme-scrim', raw.scrim],
  ];
}

/**
 * The activation contexts a theme emits into.
 *
 * A SINGLE-SCHEME THEME EMITS EXACTLY ONE BLOCK, unconditioned. That is
 * deliberate and it is the whole fix for the failure this package was built
 * after: pendingbusiness.com is a dark site that never set `data-theme`, so a
 * reader whose OS was in light mode fell through `@media (prefers-color-scheme:
 * dark)` and got `--bn-color-error-bg: #fef2f2` — a near-white alert on a
 * near-black page. A theme that says `scheme: 'dark'` here emits its dark values
 * in every context, with no media query to fall through and nothing for the
 * reader's OS to decide. The `data-theme` attribute becomes optional rather
 * than load-bearing.
 *
 * A dual theme mirrors the activation model `@basenative/components/theme.css`
 * uses, at matching specificity, so its own dark palette wins over upstream's.
 */
function activationBlocks(spec, only) {
  const light = schemeDeclarations(spec, spec);
  if (spec.scheme !== 'dual') {
    return [{ selector: ':root', scheme: spec.scheme, decls: light, media: null }];
  }
  const dark = schemeDeclarations(spec, { ...spec, ...spec.dark });
  if (only === 'light') return [{ selector: ':root', scheme: 'light', decls: light, media: null }];
  if (only === 'dark') return [{ selector: ':root', scheme: 'dark', decls: dark, media: null }];
  return [
    { selector: ':root', scheme: 'light', decls: light, media: null },
    {
      selector: ':root:not([data-theme="light"])',
      scheme: 'dark',
      decls: dark,
      media: '(prefers-color-scheme: dark)',
    },
    { selector: ':root[data-theme="dark"]', scheme: 'dark', decls: dark, media: null },
    { selector: ':root[data-theme="light"]', scheme: 'light', decls: light, media: null },
  ];
}

/**
 * Emits a theme as CSS.
 *
 * @param {object} theme
 * @param {object} [options]
 * @param {'light'|'dark'|null} [options.only]  flatten to one scheme — what the
 *   audit harness passes, since `parseCustomProperties` reads a stylesheet as
 *   one flat map and would otherwise blur a dual theme's two palettes together
 * @param {boolean} [options.layer=true]  wrap in `@layer tokens`
 * @param {boolean} [options.bridge=true] append the `--bn-*` bridge
 * @returns {string}
 */
export function emitThemeCss(theme, options = {}) {
  const { only = null, layer = true, bridge = true } = options;

  const chunks = activationBlocks(theme, only).map((block, i) => {
    const decls = [...block.decls];
    if (i === 0) decls.unshift(...geometryDeclarations(theme));
    const body =
      `${block.selector} {\n` +
      `  color-scheme: ${block.scheme};\n` +
      `${declarations(decls, '  ')}\n}`;
    return block.media
      ? `@media ${block.media} {\n${body.replace(/^(?=.)/gm, '  ')}\n}`
      : body;
  });

  const head =
    `/* ${theme.name} — generated by @basenative/theme. ` +
    `scheme: ${theme.scheme}. Do not hand-edit; edit the theme. */`;
  let css = `${head}\n${chunks.join('\n\n')}\n`;
  if (layer) css = `@layer tokens {\n${css.replace(/^(?=.)/gm, '  ')}}\n`;
  if (bridge) css += `\n${BRIDGE_CSS}`;
  return css;
}

/** @see emitThemeCss — the public name. */
export const toCss = emitThemeCss;
