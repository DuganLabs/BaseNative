/**
 * Kit data and the derived increased-contrast palette.
 * `kit` is the vendored Apple 27 extract. Do not edit src/kit.js;
 * change data/tokens.json and run `node generate.js`.
 */
import { kit } from './kit.js';

export { colorSlug, derivePalette, contrastRatio } from './contrast.js';
export { FONT_STACK } from './emit.js';
export { kit };

export const PROVENANCE = {
  color: 'kit',
  typography: 'kit',
  dimensions: 'kit',
  controlSizes: 'kit',
  liquidGlass: 'kit',
  liquidGlassBlur: 'mapped',
  materials: 'kit',
  materialBlur: 'unread',
  increasedContrast: 'derived',
  motion: 'absent',
  shadows: 'per-component',
};
