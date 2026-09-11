/*
 * Type declarations for @basenative/theme.
 *
 * Every subpath resolves here, matching the shape @basenative/favicon uses:
 * one declaration file covering `.`, `/contrast`, `/audit`, `/css` and
 * `/icons`. `types/exports.test.js` asserts this file and the runtime modules
 * cannot drift apart.
 *
 * The colour vocabulary: a tier-1 ramp step is a literal `#rrggbb`; every tier
 * above it is a `'<ramp>.<step>'` reference, emitted as a `var()` chain. Both
 * are `string` to TypeScript — `validateTheme` is what actually enforces the
 * distinction, because it can see the ramps a given theme declares.
 */

/* ------------------------------------------------------------------ theme */

/** A literal `#rrggbb`, or a `'<ramp>.<step>'` reference into `ramps`. */
export type ColorValue = string;

/** A tier-1 ramp: step name -> literal `#rrggbb`. The only hexes in a theme. */
export type Ramp = Record<string | number, string>;

export type SurfaceKey = 'base' | 'subtle' | 'sunk' | 'raised' | 'inverse';
export type InkKey = 'base' | 'muted' | 'subtle' | 'inverse' | 'link';
export type RoleKey =
  | 'primary'
  | 'primaryHover'
  | 'onPrimary'
  | 'primaryTint'
  | 'border'
  | 'borderStrong'
  | 'borderControl'
  | 'focus'
  | 'focusOnInverse'
  | 'selectedBg'
  | 'selectedInk';

/** A signal family's five channels. `ink` is measured on its own tint AND on the page. */
export type SignalChannel = 'bg' | 'ink' | 'line' | 'solid' | 'onSolid';

/** The five badge/alert variants `@basenative/components` declares. */
export type BadgeSlot = 'default' | 'primary' | 'success' | 'warning' | 'error';

export type SignalFamily = Record<SignalChannel, ColorValue>;

export interface Signals {
  /** Families under the property's own vocabulary. Not limited to five. */
  families: Record<string, SignalFamily>;
  /** Which family drives each of the five declared component variants. */
  slots: Record<BadgeSlot, string>;
}

/** The colour tiers of one scheme — the theme itself, or its `dark` block. */
export interface SchemeBlock {
  surfaces: Record<SurfaceKey, ColorValue>;
  ink: Record<InkKey, ColorValue>;
  roles: Record<RoleKey, ColorValue>;
  signals: Signals;
}

export interface FontTokens {
  sans: string;
  mono: string;
}
export interface RadiusTokens {
  sm: string;
  md: string;
  lg: string;
  xl: string;
  full: string;
}
export interface ControlTokens {
  height: string;
  heightSm: string;
  heightLg: string;
  /** WCAG 2.2 SC 2.5.8 is 24px; raise to `2.75rem` for a gloved field app. */
  tapMin: string;
}
export interface MotionTokens {
  fast: string;
  base: string;
  slow: string;
}
/** Values with no `#rrggbb` form, so never contrast-audited. */
export interface RawTokens {
  zebra: string;
  scrim: string;
}

/**
 * What a property writes. Colour is never defaulted; geometry is.
 *
 * `scheme` has no default on purpose: a theme that does not commit cannot be
 * stopped from being flipped by the reader's OS into a palette it never
 * declared.
 */
export interface ThemeSpec extends SchemeBlock {
  name: string;
  scheme: 'light' | 'dark' | 'dual';
  ramps: Record<string, Ramp>;
  /** Required when `scheme` is `'dual'`, rejected otherwise. */
  dark?: SchemeBlock;
  font?: Partial<FontTokens>;
  radius?: Partial<RadiusTokens>;
  control?: Partial<ControlTokens>;
  motion?: Partial<MotionTokens>;
  raw?: Partial<RawTokens>;
}

/** A validated, geometry-filled, deep-frozen theme. */
export interface Theme extends ThemeSpec {
  font: FontTokens;
  radius: RadiusTokens;
  control: ControlTokens;
  motion: MotionTokens;
  raw: RawTokens;
}

export interface ValidationResult {
  ok: boolean;
  errors: string[];
}

/** Thrown by `defineTheme`. `errors` carries every problem, not just the first. */
export declare class ThemeError extends Error {
  constructor(errors: string[]);
  name: 'ThemeError';
  errors: string[];
}

/**
 * Validates, fills the geometry defaults, and deep-freezes.
 *
 * @throws {ThemeError} listing every structural error and every `var()` chain
 *   that does not terminate in a literal colour.
 */
export declare function defineTheme(spec: ThemeSpec): Theme;

/** Validates without throwing. Two passes: structural, then chain resolution. */
export declare function validateTheme(spec: unknown): ValidationResult;

export interface EmitOptions {
  /**
   * Flatten a dual theme to one scheme. The audit harness passes this, because
   * `parseCustomProperties` reads a sheet as one flat map and would otherwise
   * blur the two palettes together.
   */
  only?: 'light' | 'dark' | null;
  /** Wrap in `@layer tokens`. Default `true`. */
  layer?: boolean;
  /** Append the `--bn-*` bridge. Default `true`. */
  bridge?: boolean;
}

/** Emits a theme as CSS. */
export declare function emitThemeCss(theme: Theme, options?: EmitOptions): string;
/** @see emitThemeCss — the public name. */
export declare function toCss(theme: Theme, options?: EmitOptions): string;

export declare const PRIMARY_RAMP_STEPS: readonly number[];
export declare const NEUTRAL_RAMP_STEPS: readonly number[];
export declare const SURFACE_KEYS: readonly SurfaceKey[];
export declare const INK_KEYS: readonly InkKey[];
export declare const ROLE_KEYS: readonly RoleKey[];
export declare const SIGNAL_CHANNELS: readonly SignalChannel[];
export declare const BADGE_SLOTS: readonly BadgeSlot[];

export declare const GEOMETRY_DEFAULTS: Readonly<{
  font: Readonly<FontTokens>;
  radius: Readonly<RadiusTokens>;
  control: Readonly<ControlTokens>;
  motion: Readonly<MotionTokens>;
}>;
export declare const RAW_DEFAULTS: Readonly<RawTokens>;

/* Custom-property name builders, so a consumer's own pairing rows and CSS
 * never hand-spell a `--bn-theme-*` name. */

/** `--bn-theme-ramp-primary-600` */
export declare function rampVar(ramp: string, step: string | number): string;
/** `--bn-theme-surface`, `--bn-theme-surface-raised` */
export declare function surfaceVar(key: SurfaceKey): string;
/** `--bn-theme-ink`, `--bn-theme-ink-muted` */
export declare function inkVar(key: InkKey): string;
/** `--bn-theme-primary-hover`, `--bn-theme-border-control` */
export declare function roleVar(key: RoleKey): string;
/** `--bn-theme-signal-good-bg` */
export declare function signalVar(family: string, channel: SignalChannel): string;
/** `--bn-theme-slot-error-ink` — what the static bridge reads. */
export declare function slotVar(slot: BadgeSlot, channel: SignalChannel): string;

/* ----------------------------------------------------------------- bridge */

/** The `--bn-*` bridge as text. Byte-identical to `src/bridge.css`. */
export declare const BRIDGE_CSS: string;
/** Every `--bn-*` name the bridge re-points, derived from the text itself. */
export declare const BN_BRIDGED: readonly string[];
/** `--bn-*` names deliberately left to `@basenative/components`, each with its reason. */
export declare const UPSTREAM_OWNED: Readonly<Record<string, string>>;

export interface BridgeResult {
  ok: boolean;
  /** Consumed `--bn-*` names in neither `BN_BRIDGED` nor `UPSTREAM_OWNED`. */
  unbridged: string[];
}

/** Checks the bridge against the CSS a given `@basenative/components` ships. */
export declare function validateBridge(componentsCss: string): BridgeResult;
/** The bridge as a string, for a consumer adopting one constructed stylesheet. */
export declare function bridgeToBn(): string;

/* --------------------------------------------------- @basenative/theme/contrast */

/** WCAG 2.2 SC 1.4.3 Contrast (Minimum), body text. */
export declare const AA_TEXT: 4.5;
/** SC 1.4.3, large text (>=24px, or >=18.66px bold). */
export declare const AA_LARGE: 3;
/** SC 1.4.11 Non-text Contrast — control boundaries, focus indicators, icons. */
export declare const AA_NONTEXT: 3;

/** Extracts `--name: value` declarations. Later declarations win. */
export declare function parseCustomProperties(css: string): Map<string, string>;

/**
 * Follows `var()` chains to a literal `#rrggbb`.
 *
 * @throws on a dangling reference, a cycle, or a non-literal terminal.
 * @returns an uppercase `#RRGGBB`
 */
export declare function resolveColor(
  name: string,
  props: Map<string, string>,
  seen?: ReadonlySet<string>,
): string;

/** WCAG relative luminance of a `#rrggbb` colour, 0 (black) to 1 (white). */
export declare function relativeLuminance(hex: string): number;

/** WCAG contrast ratio between two `#rrggbb` colours, 1 to 21. Order-independent. */
export declare function contrastRatio(foreground: string, background: string): number;

/* ------------------------------------------------------ @basenative/theme/audit */

/** One row of the accessibility contract. */
export interface Pairing {
  /** Human-readable, and what a failure is reported under. */
  label: string;
  /** Foreground custom-property name, e.g. `--bn-theme-ink-muted`. */
  fg: string;
  /** Background custom-property name. */
  bg: string;
  /** The threshold that applies — `AA_TEXT` or `AA_NONTEXT`. */
  min: number;
}

/** The tuple form, as the Greenput table was written. */
export type PairingTuple = readonly [label: string, fg: string, bg: string, min: number];

export type PairingInput = Pairing | PairingTuple;

export interface PairingResult extends Pairing {
  /** The measured ratio, or `0` when the chain did not resolve. */
  ratio: number;
  pass: boolean;
  /** The resolver's message, when a `var()` chain did not resolve. */
  error?: string;
}

/** Thrown by `assertPairings` / `assertThemeContrast`. Carries every failing row. */
export declare class ContrastError extends Error {
  constructor(summary: string, failures: PairingResult[]);
  name: 'ContrastError';
  failures: PairingResult[];
}

/**
 * Measures every pairing against a stylesheet carrying ONE activation context.
 * A row whose chain does not resolve is reported, not thrown, so one typo does
 * not hide the other forty rows.
 */
export declare function auditPairings(
  themeCss: string,
  pairings: readonly PairingInput[],
): PairingResult[];

/** Measures every pairing and throws listing every failure. */
export declare function assertPairings(
  themeCss: string,
  pairings: readonly PairingInput[],
  summary?: string,
): void;

/**
 * The pairings every theme ships by construction, written from the theme's own
 * shape — including a row for every signal family it declares, assigned to a
 * slot or not. Extend it, do not replace it.
 */
export declare function defaultPairings(theme: Theme): Pairing[];

/**
 * `defaultPairings` plus anything extra, measured once per scheme the theme
 * renders in. The one line a property puts in its test file.
 */
export declare function assertThemeContrast(
  theme: Theme,
  extra?: readonly PairingInput[],
): void;

/* ------------------------------------------------------- @basenative/theme/css */

/**
 * Strips comments and leading indentation. Deliberately conservative: it does
 * not touch whitespace inside a selector, a `calc()` or a quoted string.
 */
export declare function minifyCss(css: string): string;

/* ----------------------------------------------------- @basenative/theme/icons */

export interface IconSetSpec {
  /** The viewBox is `0 0 grid grid`. Default `24`. */
  grid?: number;
  /** In grid units, so it scales with the icon. Default `1.75`. */
  strokeWidth?: number;
  linecap?: 'round' | 'butt' | 'square';
  linejoin?: 'round' | 'bevel' | 'miter';
  /** Icon name -> SVG body markup (the contents of an `<svg>`, not one). */
  icons: Record<string, string>;
}

export interface IconSet {
  grid: number;
  strokeWidth: number;
  linecap: string;
  linejoin: string;
  icons: Readonly<Record<string, string>>;
  /** Sorted icon names. */
  names: readonly string[];
}

/** Thrown by `defineIconSet` and by `renderIcon` for an unknown name. */
export declare class IconSetError extends Error {
  constructor(errors: string[]);
  name: 'IconSetError';
  errors: string[];
}

/**
 * Declares an icon set: one grid, one stroke weight, many bodies.
 *
 * @throws {IconSetError} on a fill, a baked-in stroke colour or literal hex, a
 *   per-icon `stroke-width`, an inline style, a nested `<svg>`, or an icon
 *   carrying its own `viewBox`. `width` / `height` on an inner shape are
 *   ordinary geometry and are allowed.
 */
export declare function defineIconSet(spec: IconSetSpec): IconSet;

/** Checks a set's invariants without throwing. */
export declare function validateIconSet(set: Partial<IconSet>): ValidationResult;

export interface RenderIconOptions {
  /**
   * Makes the icon its own label (`role="img"`). Omit whenever it sits beside
   * visible text, which is the common case — then it renders `aria-hidden`.
   */
  title?: string;
  /** A CSS length for width and height. Default `1em`, so it tracks its type. */
  size?: string;
  /** Raw attribute markup appended to the tag. Not escaped. */
  attrs?: string;
}

/** Renders one icon from a set as an `<svg>` string. */
export declare function renderIcon(
  set: IconSet,
  name: string,
  options?: RenderIconOptions,
): string;
