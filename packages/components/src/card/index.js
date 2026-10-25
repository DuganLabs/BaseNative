// @ts-check
import { signal, computed } from '@basenative/runtime';
import { raw } from '@basenative/runtime/shared/escape';

export const name = 'card';
export const root = 'article';

/**
 * @typedef {object} CardProps
 * @property {string} title
 * @property {string} body
 * @property {string} [variant] A registered variant name.
 * @property {string} [footerHtml] Rendered HTML of the footer actions (trusted: produced by renderComponent).
 */

/** @param {CardProps} props */
export function create(props) {
  if (!props.title) throw new TypeError('card: title is required');

  const title = signal(props.title);
  const body = signal(props.body ?? '');
  const variant = signal(props.variant ?? 'default');
  const footerHtml = signal(props.footerHtml ?? '');
  const hasFooter = computed(() => footerHtml().length > 0);

  return { title, body, variant, footerHtml, hasFooter, raw };
}

/** @param {import('../registry.js').Registry} registry */
export function registerVariants(registry) {
  registry.registerVariant('card', 'default');
  registry.registerVariant('card', 'floating');
}

export const template = new URL('./index.html', import.meta.url);
export const styles = new URL('./styles.css', import.meta.url);
export const card = { name, root, create, registerVariants, template, styles };
export default card;
