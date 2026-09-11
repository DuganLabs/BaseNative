/**
 * `@basenative/theme` — the theme layer that drives `@basenative/components`.
 *
 * One library, many themes. Every DuganLabs property keeps its own identity and
 * stops re-solving contrast, token tiers, icon grids and CSS minification from
 * scratch. There is no palette in this package and there is not going to be
 * one; see README, "Why there is no default theme".
 *
 * Subpaths:
 *   @basenative/theme            the theme shape, its validator, its emitter
 *   @basenative/theme/contrast   WCAG maths and the var() chain resolver
 *   @basenative/theme/audit      the pairing harness that fails the build
 *   @basenative/theme/css        minifyCss
 *   @basenative/theme/icons      one grid, one stroke, enforced
 *   @basenative/theme/bridge.css the --bn-* bridge, as a stylesheet
 */

export {
  defineTheme,
  validateTheme,
  ThemeError,
  toCss,
  emitThemeCss,
  BADGE_SLOTS,
  INK_KEYS,
  NEUTRAL_RAMP_STEPS,
  PRIMARY_RAMP_STEPS,
  ROLE_KEYS,
  SIGNAL_CHANNELS,
  SURFACE_KEYS,
  GEOMETRY_DEFAULTS,
  RAW_DEFAULTS,
  rampVar,
  surfaceVar,
  inkVar,
  roleVar,
  signalVar,
  slotVar,
} from './theme.js';

export { BRIDGE_CSS, BN_BRIDGED, UPSTREAM_OWNED, bridgeToBn, validateBridge } from './bridge.js';
