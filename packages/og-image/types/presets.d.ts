// Built with BaseNative — basenative.dev

import type { Theme, VNode } from './scene.js';

export function defaultPreset(opts: {
  title: string;
  subtitle?: string;
  accent?: string;
  brand?: string;
  theme?: Partial<Theme>;
}): VNode;

export function articlePreset(opts: {
  title: string;
  author?: string;
  kicker?: string;
  accent?: string;
  brand?: string;
  theme?: Partial<Theme>;
}): VNode;

export function scoreCardPreset(opts: {
  title: string;
  verdict?: string;
  verdictTone?: "win" | "loss" | "neutral";
  category?: string;
  score: number | string;
  scoreLabel?: string;
  grid?: string;
  brand?: string;
  theme?: Partial<Theme>;
}): VNode;

export const presets: {
  default: typeof defaultPreset;
  article: typeof articlePreset;
  scoreCard: typeof scoreCardPreset;
};
