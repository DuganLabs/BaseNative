// @ts-check
import { signal } from '@basenative/runtime';
import { raw } from '@basenative/runtime/shared/escape';

export const name = 'accordion';
export const root = 'details';

/**
 * @typedef {object} AccordionProps
 * @property {string} summary The always-visible heading line.
 * @property {string} [bodyHtml] Rendered HTML for the disclosure body.
 * @property {boolean} [open] Start expanded.
 * @property {string} [variant] A registered variant name.
 */

/** @param {AccordionProps} props */
export function create(props) {
  if (!props.summary) throw new TypeError('accordion: summary is required');

  const summary = signal(props.summary);
  const bodyHtml = signal(props.bodyHtml ?? '');
  const open = signal(props.open ?? false);
  const variant = signal(props.variant ?? 'default');

  return { summary, bodyHtml, open, variant, raw };
}

/** @param {import('../registry.js').Registry} registry */
export function registerVariants(registry) {
  registry.registerVariant('accordion', 'default');
}

export const template = new URL('./index.html', import.meta.url);
export const styles = new URL('./styles.css', import.meta.url);
export const accordion = { name, root, create, registerVariants, template, styles };
export default accordion;
