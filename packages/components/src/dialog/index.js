// @ts-check
import { signal } from '@basenative/runtime';
import { raw } from '@basenative/runtime/shared/escape';

export const name = 'dialog';
export const root = 'dialog';

/**
 * @typedef {object} DialogProps
 * @property {string} title
 * @property {string} body
 * @property {string} [variant] A registered variant name.
 * @property {string} [closeHtml] Rendered HTML of the header close control (trusted: produced by renderComponent).
 * @property {string} [footerHtml] Rendered HTML of the footer actions (trusted: produced by renderComponent).
 */

/** @param {DialogProps} props */
export function create(props) {
  if (!props.title) throw new TypeError('dialog: title is required');

  const title = signal(props.title);
  const body = signal(props.body ?? '');
  const variant = signal(props.variant ?? 'default');
  const closeHtml = signal(props.closeHtml ?? '');
  const footerHtml = signal(props.footerHtml ?? '');

  return { title, body, variant, closeHtml, footerHtml, raw };
}

/** @param {import('../registry.js').Registry} registry */
export function registerVariants(registry) {
  registry.registerVariant('dialog', 'default', {});
  registry.registerVariant('dialog', 'destructive', {
    '--button-background-color': 'var(--color-danger)',
    '--button-background-color--hover': 'var(--color-danger-hover)',
    '--button-border-color': 'var(--color-danger)',
    '--button-color': 'var(--color-on-danger)',
  });
}

export const template = new URL('./index.html', import.meta.url);
export const styles = new URL('./styles.css', import.meta.url);
export const dialog = { name, root, create, registerVariants, template, styles };
export default dialog;
