/**
 * The iOS foundation tokens, as data.
 *
 * One file, six groups, in the order `css.js` emits them: colours, type,
 * glass, layout, fold, motion. Colours carry a `{ light, dark }` pair and
 * nothing else in the file carries a scheme — geometry, type metrics and
 * springs are the same on both appearances, exactly as they are on the
 * platform.
 *
 * Every value here is an original transcription of a published iOS design
 * value or an estimate made where Apple publishes no web equivalent. Which
 * is which is not a matter of taste: `PROVENANCE` below says, per group,
 * and the README's "Tokens provenance" section is the human-readable copy.
 * When the owner duplicates Apple's iOS 27 Figma kit (Step 0 of the fork
 * scope), the `estimate` groups get refined against the kit's own styles;
 * the `documented` groups should already agree with it.
 *
 * Units. Type sizes and leading are stored as the points Apple publishes
 * and converted at emission time (rem sizes, unitless leading ratios), so
 * this file reads like the HIG table it came from. Tracking is stored in
 * em. Blur is stored in px, saturation in percent — the units CSS wants.
 */

/**
 * Where each group's values came from.
 *
 *   documented — Apple publishes the value (developer documentation for
 *     the system colours; the HIG typography and layout tables).
 *   estimate   — Apple publishes no equivalent a stylesheet can carry
 *     (Liquid Glass is a rendered material, not a blur radius; UIKit
 *     springs are response/damping pairs, not cubic-beziers). The value
 *     is our approximation, marked so a Figma pass can replace it.
 */
export const PROVENANCE = Object.freeze({
  systemColors: 'documented',
  labelColors: 'documented',
  backgroundColors: 'documented',
  fillColors: 'documented',
  separatorColors: 'documented',
  linkColor: 'documented',
  typeMetrics: 'documented',
  typeTracking: 'estimate',
  fontFamilies: 'documented',
  glass: 'estimate',
  radii: 'estimate',
  spacing: 'documented',
  layout: 'estimate',
  breakpoints: 'estimate',
  fold: 'documented',
  motion: 'estimate',
});

/* ------------------------------------------------------------------ colours */

/**
 * The system colour palette. The hexes are Apple's published sRGB values
 * for `UIColor.systemBlue` and family, light and dark appearance.
 * `teal` and `cyan` converge on the same dark value on the platform too.
 */
export const SYSTEM_COLORS = Object.freeze({
  blue: { light: '#007aff', dark: '#0a84ff' },
  green: { light: '#34c759', dark: '#30d158' },
  indigo: { light: '#5856d6', dark: '#5e5ce6' },
  orange: { light: '#ff9500', dark: '#ff9f0a' },
  pink: { light: '#ff2d55', dark: '#ff375f' },
  purple: { light: '#af52de', dark: '#bf5af2' },
  red: { light: '#ff3b30', dark: '#ff453a' },
  teal: { light: '#5ac8fa', dark: '#64d2ff' },
  yellow: { light: '#ffcc00', dark: '#ffd60a' },
  mint: { light: '#00c7be', dark: '#66d4cf' },
  cyan: { light: '#32ade6', dark: '#64d2ff' },
  brown: { light: '#a2845e', dark: '#ac8e68' },
  gray: { light: '#8e8e93', dark: '#8e8e93' },
  gray2: { light: '#aeaeb2', dark: '#636366' },
  gray3: { light: '#c7c7cc', dark: '#48484a' },
  gray4: { light: '#d1d1d6', dark: '#3a3a3c' },
  gray5: { light: '#e5e5ea', dark: '#2c2c2e' },
  gray6: { light: '#f2f2f7', dark: '#1c1c1e' },
});

/**
 * Text colours, most to least prominent. The secondary steps are alpha
 * colours on the platform, not greys — they composite over whatever is
 * behind the text, which is why they are `rgb()` with an alpha channel.
 * `placeholder` is the tertiary step, as `UITextField` renders it.
 */
export const LABEL_COLORS = Object.freeze({
  label: { light: '#000000', dark: '#ffffff' },
  secondary: { light: 'rgb(60 60 67 / 0.6)', dark: 'rgb(235 235 245 / 0.6)' },
  tertiary: { light: 'rgb(60 60 67 / 0.3)', dark: 'rgb(235 235 245 / 0.3)' },
  quaternary: { light: 'rgb(60 60 67 / 0.18)', dark: 'rgb(235 235 245 / 0.16)' },
  placeholder: { light: 'rgb(60 60 67 / 0.3)', dark: 'rgb(235 235 245 / 0.3)' },
});

/**
 * What a view sits on. The grouped steps are the settings-style
 * backgrounds: a grouped page is never the tertiary step's colour.
 */
export const BACKGROUND_COLORS = Object.freeze({
  base: { light: '#ffffff', dark: '#000000' },
  secondary: { light: '#f2f2f7', dark: '#1c1c1e' },
  tertiary: { light: '#ffffff', dark: '#2c2c2e' },
  grouped: { light: '#f2f2f7', dark: '#000000' },
  groupedSecondary: { light: '#ffffff', dark: '#1c1c1e' },
  groupedTertiary: { light: '#f2f2f7', dark: '#2c2c2e' },
});

/** Translucent greys for controls and wells, strongest first. */
export const FILL_COLORS = Object.freeze({
  base: { light: 'rgb(120 120 128 / 0.2)', dark: 'rgb(120 120 128 / 0.36)' },
  secondary: { light: 'rgb(120 120 128 / 0.16)', dark: 'rgb(120 120 128 / 0.32)' },
  tertiary: { light: 'rgb(118 118 128 / 0.12)', dark: 'rgb(118 118 128 / 0.24)' },
  quaternary: { light: 'rgb(116 116 128 / 0.08)', dark: 'rgb(118 118 128 / 0.18)' },
});

/** Hairline rules. `separator` composites; `opaque` is its solid twin. */
export const SEPARATOR_COLORS = Object.freeze({
  separator: { light: 'rgb(60 60 67 / 0.29)', dark: 'rgb(84 84 88 / 0.6)' },
  opaque: { light: '#c6c6c8', dark: '#38383a' },
});

/** The link colour — the system blue, named for the role it plays. */
export const LINK_COLOR = Object.freeze({ light: '#007aff', dark: '#0a84ff' });

/* --------------------------------------------------------------------- type */

/**
 * The font stacks. `-apple-system` resolves to SF Pro on Apple hardware;
 * the named families are what the platform asks for explicitly. The
 * display face is used at 20pt and up, the text face below that — each
 * type style below says which of the two it takes.
 */
export const FONT_FAMILIES = Object.freeze({
  text: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', system-ui, sans-serif",
  display:
    "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', system-ui, sans-serif",
});

/**
 * The eleven Dynamic Type text styles at the default (Large) size:
 * `size` and `leading` in points from the HIG typography table,
 * `weight` the style's own weight, `tracking` in em.
 *
 * Two honest notes. `headline` is the only semibold style — that is the
 * platform, not a preference. And `largeTitle` is regular here because
 * the text style is regular; the bold large title in a navigation bar is
 * the style's emphasised variant, which belongs to the component layer,
 * not to this table.
 */
export const TYPE_STYLES = Object.freeze({
  largeTitle: { size: 34, leading: 41, weight: 400, tracking: -0.015, family: 'display' },
  title1: { size: 28, leading: 34, weight: 400, tracking: -0.012, family: 'display' },
  title2: { size: 22, leading: 28, weight: 400, tracking: -0.008, family: 'display' },
  title3: { size: 20, leading: 25, weight: 400, tracking: -0.006, family: 'display' },
  headline: { size: 17, leading: 22, weight: 600, tracking: -0.002, family: 'text' },
  body: { size: 17, leading: 22, weight: 400, tracking: -0.002, family: 'text' },
  callout: { size: 16, leading: 21, weight: 400, tracking: -0.001, family: 'text' },
  subheadline: { size: 15, leading: 20, weight: 400, tracking: 0, family: 'text' },
  footnote: { size: 13, leading: 18, weight: 400, tracking: 0.004, family: 'text' },
  caption1: { size: 12, leading: 16, weight: 400, tracking: 0.008, family: 'text' },
  caption2: { size: 11, leading: 13, weight: 400, tracking: 0.011, family: 'text' },
});

/* -------------------------------------------------------------------- glass */

/**
 * Liquid Glass, approximated for the web. Apple does not publish blur
 * radii or tint alphas for the material — it is rendered, not specified —
 * so every value in this group is an estimate (see `PROVENANCE`), tuned
 * to read like the platform's four-step material ladder: `ultraThin`,
 * `thin`, `regular`, `thick`, weakest first.
 *
 * A material is five channels: `blur` (px) and `saturate` (percent) build
 * the `backdrop-filter`; per appearance, `tint` is the colour laid over
 * the blurred backdrop, `highlight` is the specular edge (an inset shadow
 * along the top), and `shadow` is what the sheet casts on what is under
 * it. The channels are tokens separately because Tier 1 components mix
 * them — a tab bar wants all five; a glass button wants the tint without
 * the full shadow.
 */
export const GLASS_MATERIALS = Object.freeze({
  ultraThin: {
    blur: 8,
    saturate: 160,
    light: {
      tint: 'rgb(255 255 255 / 0.35)',
      highlight: 'inset 0 1px 0 rgb(255 255 255 / 0.4)',
      shadow: '0 8px 24px rgb(0 0 0 / 0.08)',
    },
    dark: {
      tint: 'rgb(28 28 30 / 0.35)',
      highlight: 'inset 0 1px 0 rgb(255 255 255 / 0.12)',
      shadow: '0 8px 24px rgb(0 0 0 / 0.35)',
    },
  },
  thin: {
    blur: 12,
    saturate: 170,
    light: {
      tint: 'rgb(255 255 255 / 0.45)',
      highlight: 'inset 0 1px 0 rgb(255 255 255 / 0.45)',
      shadow: '0 10px 28px rgb(0 0 0 / 0.1)',
    },
    dark: {
      tint: 'rgb(28 28 30 / 0.45)',
      highlight: 'inset 0 1px 0 rgb(255 255 255 / 0.15)',
      shadow: '0 10px 28px rgb(0 0 0 / 0.4)',
    },
  },
  regular: {
    blur: 20,
    saturate: 180,
    light: {
      tint: 'rgb(255 255 255 / 0.55)',
      highlight: 'inset 0 1px 0 rgb(255 255 255 / 0.5)',
      shadow: '0 12px 32px rgb(0 0 0 / 0.12)',
    },
    dark: {
      tint: 'rgb(30 30 32 / 0.55)',
      highlight: 'inset 0 1px 0 rgb(255 255 255 / 0.18)',
      shadow: '0 12px 32px rgb(0 0 0 / 0.45)',
    },
  },
  thick: {
    blur: 30,
    saturate: 190,
    light: {
      tint: 'rgb(249 249 249 / 0.78)',
      highlight: 'inset 0 1px 0 rgb(255 255 255 / 0.55)',
      shadow: '0 16px 40px rgb(0 0 0 / 0.16)',
    },
    dark: {
      tint: 'rgb(28 28 30 / 0.78)',
      highlight: 'inset 0 1px 0 rgb(255 255 255 / 0.22)',
      shadow: '0 16px 40px rgb(0 0 0 / 0.5)',
    },
  },
});

/* ------------------------------------------------------------------- layout */

/**
 * Corner radii, smallest first. Estimates: Apple describes the iOS 27
 * radius system as concentric (a child's radius is its parent's minus
 * the inset between them) rather than publishing one ladder, so this
 * scale is the working set the components will consume, to be refined
 * against the Figma kit. `pill` is the full radius a capsule takes.
 */
export const RADII = Object.freeze({
  none: '0',
  xs: '0.25rem',
  sm: '0.5rem',
  md: '0.625rem',
  lg: '0.75rem',
  xl: '1rem',
  xl2: '1.25rem',
  xl3: '1.5rem',
  xl4: '1.75rem',
  pill: '9999px',
});

/** The spacing scale — the 8pt layout grid, with its 4pt half step. */
export const SPACING = Object.freeze({
  1: '0.25rem',
  2: '0.5rem',
  3: '0.75rem',
  4: '1rem',
  5: '1.25rem',
  6: '1.5rem',
  7: '2rem',
  8: '2.5rem',
});

/**
 * The safe-area insets, as the platform reports them. These are the one
 * set of tokens whose values the device itself supplies at runtime.
 */
export const SAFE_AREA = Object.freeze({
  top: 'env(safe-area-inset-top, 0px)',
  right: 'env(safe-area-inset-right, 0px)',
  bottom: 'env(safe-area-inset-bottom, 0px)',
  left: 'env(safe-area-inset-left, 0px)',
});

/**
 * Layout constants that are not a scale: the standard side margin (16pt,
 * 20pt on wide layouts), the hairline rule width, and the height of the
 * scroll-edge fade zone a bar dissolves into.
 */
export const LAYOUT = Object.freeze({
  margin: '1rem',
  marginWide: '1.25rem',
  hairline: '0.5px',
  scrollEdge: '1.25rem',
});

/* --------------------------------------------------------------------- fold */

/**
 * The size-class boundaries the catalog adapts across, as min-widths in
 * CSS pixels, ascending. One component serves the whole continuum — the
 * scope's ~100px (watch) to 1000px+ (TV/desktop) — and these are the
 * named stops along it, not device detections: a layout asks which class
 * it is in, never which device it is on.
 *
 * The two Duo stops are the foldable's classes. `duoCover` is the
 * 5.4-inch cover display — a wide phone class. `duoInner` is the
 * 7.6-inch inner display's short edge (939px): at or above it, in either
 * orientation, an unfolded Duo is in the room, and the `spanning` media
 * feature (see `posture.js`) says whether the viewport actually crosses
 * the fold. Width alone must never be read as "unfolded" — an iPad is
 * this wide too.
 *
 * Estimates: Apple announces the Duo's physical geometry (5.4in and
 * 7.6in diagonals, a 1878×2670 inner panel at ~430ppi, one ~1.42:1
 * aspect shared by both displays) but publishes no CSS-pixel values, so
 * the stops are derived — the cover at its @3 logical width (≈446px),
 * the inner at its @2 logical size (939×1335). Hardware refines them;
 * the names are the contract.
 */
export const BREAKPOINTS = Object.freeze({
  watch: 100,
  phone: 390,
  duoCover: 446,
  tablet: 768,
  duoInner: 939,
  desktop: 1024,
  wide: 1600,
});

/**
 * The fold's geometry, read from the device at runtime through the CSS
 * viewport-segment environment variables — the one set of tokens whose
 * values the hardware itself supplies, like the safe-area insets.
 *
 * The Duo is a single vertical fold: two segments side by side. Every
 * expression carries a fallback for the screens that are not folded, so
 * the tokens are safe to consume unconditionally: on a flat display the
 * one segment is the whole viewport (`segmentWidth` resolves to 100vw)
 * and the second segment starts off-screen (`secondSegmentLeft`
 * resolves to 100vw), which is exactly the single-pane truth.
 *
 * `creaseSafeMargin` is the working clearance kept between content and
 * the crease — the one estimate in the group, set to the 16pt spacing
 * step until hardware says otherwise.
 */
export const FOLD = Object.freeze({
  segments: 2,
  segmentWidth: 'env(viewport-segment-width 0 0, 100vw)',
  segmentHeight: 'env(viewport-segment-height 0 0, 100vh)',
  secondSegmentLeft: 'env(viewport-segment-left 1 0, 100vw)',
  creaseSafeMargin: '1rem',
});

/* ------------------------------------------------------------------- motion */

/**
 * Motion presets, as duration + curve custom-property pairs and the
 * composed shorthand the emitter derives from them. UIKit springs are
 * response/damping pairs and have no exact `cubic-bezier` form, so these
 * curves are estimates fitted to the springs they are named for:
 * `spring` is the platform default (response ≈ 0.55, damping ≈ 0.85),
 * `springBouncy` the low-damping variant that overshoots, `springStiff`
 * the short response used for small controls, `fade` the plain crossfade.
 */
export const MOTION = Object.freeze({
  spring: { duration: '550ms', timing: 'cubic-bezier(0.32, 0.72, 0, 1)' },
  springBouncy: { duration: '700ms', timing: 'cubic-bezier(0.34, 1.3, 0.32, 1)' },
  springStiff: { duration: '380ms', timing: 'cubic-bezier(0.36, 0.9, 0.24, 1)' },
  fade: { duration: '250ms', timing: 'cubic-bezier(0.25, 0.1, 0.25, 1)' },
});
