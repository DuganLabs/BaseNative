// @ts-check
import { signal } from '@basenative/runtime';
import { raw } from '@basenative/runtime/shared/escape';

export const name = 'tooltip';
export const root = 'aside';

/**
 * @typedef {object} TooltipProps
 * @property {string} text The note.
 * @property {string} invokerHtml The rendered invoker (usually a button).
 * @property {string} [variant] A registered variant name.
 */

/** @param {TooltipProps} props */
export function create(props) {
  if (!props.text) throw new TypeError('tooltip: text is required');
  if (!props.invokerHtml) throw new TypeError('tooltip: invokerHtml is required (render the invoker)');

  const text = signal(props.text);
  const invokerHtml = signal(props.invokerHtml);
  const variant = signal(props.variant ?? 'default');

  return { text, invokerHtml, variant, raw };
}

/** @param {import('../registry.js').Registry} registry */
export function registerVariants(registry) {
  registry.registerVariant('tooltip', 'default');
}

export const template = new URL('./index.html', import.meta.url);
export const styles = new URL('./styles.css', import.meta.url);
export const tooltip = { name, root, create, registerVariants, template, styles };
export default tooltip;
