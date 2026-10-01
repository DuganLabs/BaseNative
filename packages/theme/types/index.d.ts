/*
 * Type declarations for @basenative/theme.
 *
 * One declaration file per subpath, each describing exactly what that subpath
 * exports at runtime: `.` -> index.d.ts, `/contrast` -> contrast.d.ts,
 * `/audit` -> audit.d.ts, `/css` -> css.d.ts, `/icons` -> icons.d.ts.
 * `types/exports.test.js` asserts each file and its runtime module cannot
 * drift apart.
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
  /** The checkbox/radio square. The switch derives its track and knob from it. */
  indicator: string;
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
