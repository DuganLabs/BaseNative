// Built with BaseNative — basenative.dev

import type { FaviconSpec } from './render.js';

export type Preset = FaviconSpec & {
  name: string;
  displayName: string;
  description: string;
  themeColor: string;
};

export const tabs: Preset;
export const basenative: Preset;
export const duganlabs: Preset;
export const pendingbusiness: Preset;
export const greenput: Preset;
export const warrendugan: Preset;
export const ralphStation: Preset;
export const warrenSys: Preset;
/** Full preset map keyed by name. */
export const presets: Record<string, Preset>;
/** Ordered preset list. */
export const presetList: Preset[];
