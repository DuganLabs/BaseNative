// @ts-check
import { signal, computed } from '@basenative/runtime';
import { raw } from '@basenative/runtime/shared/escape';

export const name = 'empty-state';
export const root = 'article';

/**
 * The empty state: what a surface says when there is nothing in it
 * yet — an optional rendered media mark (an avatar in the proof), a
 * title, a line of body, and an optional rendered action that starts
 * the flow which fills the surface. Pure composition; the composite
 * owns only the shape and the centered rhythm.
 *
 * @typedef {object} EmptyStateProps
 * @property {string} title
 * @property {string} [body]
 * @property {string} [mediaHtml] A rendered mark, such as an avatar.
 * @property {string} [actionHtml] A rendered action button.
 * @property {string} [variant] A registered variant name.
 */

/** @param {EmptyStateProps} props */
export function create(props) {
  if (!props.title) throw new TypeError('empty-state: title is required');

  const title = signal(props.title);
  const body = signal(props.body ?? '');
  const mediaHtml = signal(props.mediaHtml ?? '');
  const actionHtml = signal(props.actionHtml ?? '');
  const variant = signal(props.variant ?? 'empty-state');
  const hasMedia = computed(() => mediaHtml() !== '');
  const hasBody = computed(() => body() !== '');
  const hasAction = computed(() => actionHtml() !== '');

  return { title, body, mediaHtml, actionHtml, variant, hasMedia, hasBody, hasAction, raw };
}

/** @param {import('../registry.js').Registry} registry */
export function registerVariants(registry) {
  registry.registerVariant('empty-state', 'empty-state');
}

export const template = new URL('./index.html', import.meta.url);
export const styles = new URL('./styles.css', import.meta.url);
export const emptyState = { name, root, create, registerVariants, template, styles };
export default emptyState;
