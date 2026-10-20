/**
 * @basenative/ios — the iOS platform layer for BaseNative.
 *
 * Phase 1 is the foundation only: the token layer, as data (`./tokens`)
 * and as the stylesheet emitted from it (`./css`, or the generated
 * `tokens.css` subpath for a plain CSS import). The Tier 1 components
 * that consume these tokens — navigation bar, tab bar, grouped list,
 * sheet — are a later phase and live nowhere yet.
 */

export {
  PROVENANCE,
  SYSTEM_COLORS,
  LABEL_COLORS,
  BACKGROUND_COLORS,
  FILL_COLORS,
  SEPARATOR_COLORS,
  LINK_COLOR,
  FONT_FAMILIES,
  TYPE_STYLES,
  GLASS_MATERIALS,
  RADII,
  SPACING,
  SAFE_AREA,
  LAYOUT,
  MOTION,
} from './tokens.js';
export { tokensCss } from './css.js';
