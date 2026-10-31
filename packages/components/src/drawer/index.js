// @ts-check
import { signal, computed } from '@basenative/runtime';
import { raw } from '@basenative/runtime/shared/escape';
import { createDialogBehavior } from '../internal/dialog.js';

export const name = 'drawer';
export const root = 'dialog';

/**
 * The drawer's dialog: same skeleton as dialog (header, body,
 * optional footer, caller-rendered close button), anchored to the
 * inline-end edge as a sheet instead of centered. Its own directory
 * and variant name — the registry's (dialog, variant) address stays
 * unique next to dialog's own variants.
 *
 * @typedef {object} DrawerProps
 * @property {string} title
 * @property {string} [body]
 * @property {string} [id] The dialog element's id — lets a host open
 *   it from a trigger outside the drawer.
 * @property {(open: boolean) => void} [onChange]
 * @property {string} [closeHtml] A rendered close button.
 * @property {string} [footerHtml] Rendered footer content.
 * @property {string} [variant] A registered variant name.
 */

/** @param {DrawerProps} props */
export function create(props) {
  if (!props.title) throw new TypeError('drawer: title is required');

  const title = signal(props.title);
  const body = signal(props.body ?? '');
  const closeHtml = signal(props.closeHtml ?? '');
  const footerHtml = signal(props.footerHtml ?? '');
  const variant = signal(props.variant ?? 'drawer');
  const hasFooter = computed(() => footerHtml() !== '');
  const behavior = createDialogBehavior(props);

  return {
    title, body, closeHtml, footerHtml, variant, hasFooter, raw,
    idAttr: behavior.idAttr, show: behavior.show, close: behavior.close,
    isOpen: behavior.isOpen, onBackdropClick: behavior.onBackdropClick, onClick: behavior.onClick, onKeydown: behavior.onKeydown,
  };
}

/** @param {import('../registry.js').Registry} registry */
export function registerVariants(registry) {
  registry.registerVariant('drawer', 'drawer');
}

export const template = new URL('./index.html', import.meta.url);
export const styles = new URL('./styles.css', import.meta.url);
export const drawer = { name, root, create, registerVariants, template, styles };
export default drawer;
