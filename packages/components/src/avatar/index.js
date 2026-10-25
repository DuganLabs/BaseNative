// @ts-check
import { signal } from '@basenative/runtime';

import { computed } from '@basenative/runtime';

export const name = 'avatar';
export const root = 'figure';

/**
 * @typedef {object} AvatarProps
 * @property {string} [src] Image URL; when absent the initials render.
 * @property {string} [alt] Image alternative text.
 * @property {string} [initials] Fallback content when there is no image.
 * @property {string} [variant] A registered variant name.
 */

/** @param {AvatarProps} props */
export function create(props) {
  const src = signal(props.src ?? '');
  const alt = signal(props.alt ?? '');
  const initials = signal(props.initials ?? '');
  const variant = signal(props.variant ?? 'default');
  const hasImage = computed(() => src() !== '');

  return { src, alt, initials, variant, hasImage };
}

/** @param {import('../registry.js').Registry} registry */
export function registerVariants(registry) {
  registry.registerVariant('avatar', 'default');
  for (let tone = 0; tone <= 7; tone += 1) registry.registerVariant('avatar', `tone-${tone}`);
}

export const template = new URL('./index.html', import.meta.url);
export const styles = new URL('./styles.css', import.meta.url);
export const avatar = { name, root, create, registerVariants, template, styles };
export default avatar;
