// Built with BaseNative — basenative.dev

import type { VNode } from './scene.js';
import type { RenderOptions } from './index.js';

export { defaultPreset, articlePreset, scoreCardPreset, presets } from './presets.js';
export {
  box,
  text,
  tile,
  tileGrid,
  parseGrid,
  theme,
  defaultTheme,
  el,
} from './scene.js';
export { pngHeaders } from './index.js';

/**
 * Render a satori vh-tree. Only available from `@basenative/og-image/satori`,
 * which requires the optional `satori` peer dependency and **throws on
 * Cloudflare Workers** — use `renderCard`/`renderSvg` there.
 */
export function renderPng(
  scene: VNode,
  env?: Record<string, unknown>,
  opts?: RenderOptions & { height?: number },
): Promise<Uint8Array>;
