// @ts-check
import { signal, computed } from '@basenative/runtime';
import { raw } from '@basenative/runtime/shared/escape';

export const name = 'alert';
export const root = 'aside';

/**
 * @typedef {object} AlertProps
 * @property {string} title
 * @property {string} body
 * @property {string} [dismissHtml] A rendered dismiss button (usually a ghost
 *   button); when present the alert is dismissible and reserves room for it.
 * @property {string} [variant] info (default), success, warning, or danger.
 *   The variant also picks the ARIA role: danger announces as "alert",
 *   the rest as "status" — semantics follow the registered variant.
 */

/** @param {AlertProps} props */
export function create(props) {
  if (!props.title) throw new TypeError('alert: title is required');

  const title = signal(props.title);
  const body = signal(props.body ?? '');
  const variant = signal(props.variant ?? 'info');
  const role = computed(() => (variant() === 'danger' ? 'alert' : 'status'));
  const dismissHtml = signal(props.dismissHtml ?? '');
  const hasDismiss = computed(() => dismissHtml() !== '');

  /* Dismissal: the dismiss control is caller-rendered HTML, so its
     click is delegated at the aside — a click on the button takes
     the alert out of the document. The element is resolved from the
     event (the dialog behavior's pattern); on the server this
     no-ops, as every client-only entry point does. */
  /** @param {MouseEvent} event */
  function dismiss(event) {
    if (!(event.target)?.closest?.('button')) return;
    const aside = (event.currentTarget ?? event.target)?.closest?.('aside');
    aside?.remove();
  }

  return { title, body, variant, role, dismissHtml, hasDismiss, dismiss, raw };
}

/** @param {import('../registry.js').Registry} registry */
export function registerVariants(registry) {
  registry.registerVariant('alert', 'info');
  registry.registerVariant('alert', 'success');
  registry.registerVariant('alert', 'warning');
  registry.registerVariant('alert', 'danger');
}

export const template = new URL('./index.html', import.meta.url);
export const styles = new URL('./styles.css', import.meta.url);
export const alert = { name, root, create, registerVariants, template, styles };
export default alert;
