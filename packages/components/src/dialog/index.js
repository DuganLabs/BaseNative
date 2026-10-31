// @ts-check
import { signal } from '@basenative/runtime';
import { raw } from '@basenative/runtime/shared/escape';
import { createDialogBehavior } from '../internal/dialog.js';

export const name = 'dialog';
export const root = 'dialog';

/**
 * A native <dialog>: opened with showModal (focus trap, Escape and
 * focus return are the platform's), dismissed by its close control,
 * Escape, or a backdrop click. The open/close behavior is the shared
 * dialog behavior in internal/dialog.js.
 *
 * @typedef {object} DialogProps
 * @property {string} title
 * @property {string} body
 * @property {string} [id] The dialog element's id — lets a host open
 *   it from a trigger outside the dialog.
 * @property {(open: boolean) => void} [onChange]
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
  const behavior = createDialogBehavior(props);

  return {
    title, body, variant, closeHtml, footerHtml, raw,
    idAttr: behavior.idAttr, show: behavior.show, close: behavior.close,
    isOpen: behavior.isOpen, onBackdropClick: behavior.onBackdropClick,
  };
}

/** @param {import('../registry.js').Registry} registry */
export function registerVariants(registry) {
  registry.registerVariant('dialog', 'default');
  registry.registerVariant('dialog', 'destructive');
}

export const template = new URL('./index.html', import.meta.url);
export const styles = new URL('./styles.css', import.meta.url);
export const dialog = { name, root, create, registerVariants, template, styles };
export default dialog;
