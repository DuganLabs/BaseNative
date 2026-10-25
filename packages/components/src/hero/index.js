// @ts-check
import { signal, computed } from '@basenative/runtime';
import { raw } from '@basenative/runtime/shared/escape';

export const name = 'hero';
export const root = 'figure';

/**
 * The hero: a presentational figure. The media is the figure's content
 * and the eyebrow, title, lede and actions are its figcaption — the
 * caption of the hero image, or of the space where it would ride.
 * Layout is the variant axis: "stacked" (caption below the media, or
 * alone as a panel when there is none), "overlay" (caption riding the
 * media's lower edge on glass), "split" (caption beside the media).
 * Actions are caller-rendered (the catalog's buttons) inside a nav.
 *
 * @typedef {object} HeroProps
 * @property {string} title The heading text. Escaped.
 * @property {string} [titleHtml] Rendered heading HTML — takes precedence over title.
 * @property {'h1' | 'h2'} [headingLevel] Default "h1".
 * @property {string} [eyebrow] Small line above the title. Escaped.
 * @property {string} [lede] Supporting paragraph. Escaped.
 * @property {string} [ledeHtml] Rendered lede HTML — takes precedence over lede.
 * @property {string} [mediaSrc] Media image source; absent means a caption-only hero.
 * @property {string} [mediaAlt] Media alternative text. Default "".
 * @property {string} [mediaHtml] Rendered media (a picture, a video) — takes precedence over mediaSrc.
 * @property {string} [actionsHtml] Rendered actions (catalog buttons), placed in a nav.
 * @property {string} [afterHtml] Rendered content closing the caption, after
 *   the actions — a meta strip, a footnote line.
 * @property {string} [actionsLabel] Accessible name for the actions nav. Default "Primary".
 * @property {string} [variant] A registered variant name: "stacked", "overlay" or "split".
 */

/** @param {HeroProps} props */
export function create(props) {
  if (!props.title && !props.titleHtml) {
    throw new TypeError('hero: title (or titleHtml) is required');
  }

  const variant = signal(props.variant ?? 'stacked');
  const eyebrow = signal(props.eyebrow ?? '');
  const title = signal(props.title ?? '');
  const titleHtml = signal(props.titleHtml ?? '');
  const lede = signal(props.lede ?? '');
  const ledeHtml = signal(props.ledeHtml ?? '');
  const mediaSrc = signal(props.mediaSrc ?? '');
  const mediaAlt = signal(props.mediaAlt ?? '');
  const mediaHtml = signal(props.mediaHtml ?? '');
  const actionsHtml = signal(props.actionsHtml ?? '');
  const afterHtml = signal(props.afterHtml ?? '');
  const actionsLabel = signal(props.actionsLabel ?? 'Primary');

  const hasMedia = computed(() => mediaHtml() !== '' || mediaSrc() !== '');
  const hasEyebrow = computed(() => eyebrow() !== '');
  const hasLede = computed(() => ledeHtml() !== '' || lede() !== '');
  const hasActions = computed(() => actionsHtml() !== '');
  const hasAfter = computed(() => afterHtml() !== '');
  const isH2 = computed(() => props.headingLevel === 'h2');

  return {
    variant, eyebrow, title, titleHtml, lede, ledeHtml,
    mediaSrc, mediaAlt, mediaHtml, actionsHtml, actionsLabel, afterHtml,
    hasMedia, hasEyebrow, hasLede, hasActions, hasAfter, isH2, raw,
  };
}

/** @param {import('../registry.js').Registry} registry */
export function registerVariants(registry) {
  registry.registerVariant('hero', 'stacked');
  registry.registerVariant('hero', 'overlay');
  registry.registerVariant('hero', 'split');
}

export const template = new URL('./index.html', import.meta.url);
export const styles = new URL('./styles.css', import.meta.url);
export const hero = { name, root, create, registerVariants, template, styles };
export default hero;
