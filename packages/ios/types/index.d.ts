/*
 * Type declarations for @basenative/ios.
 *
 * One declaration file per subpath, each describing exactly what that
 * subpath exports at runtime: `.` -> index.d.ts, `/tokens` ->
 * tokens.d.ts, `/css` -> css.d.ts, `/posture` -> posture.d.ts.
 * `types/exports.test.js` asserts each file and its runtime module
 * cannot drift apart. The `/tokens.css` subpath is a stylesheet and
 * declares nothing.
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
  BREAKPOINTS,
  FOLD,
  MOTION,
} from './tokens.js';
export { tokensCss } from './css.js';
export { POSTURE_MEDIA, postureCss } from './posture.js';

export type {
  SchemeColor,
  TypeStyle,
  GlassAppearance,
  GlassMaterial,
  MotionPreset,
  FoldTokens,
  ProvenanceSource,
} from './tokens.js';
export type { PostureMedia } from './posture.js';
