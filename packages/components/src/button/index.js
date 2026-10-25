// @ts-check
import { signal, computed } from '@basenative/runtime';

export const name = 'button';
export const root = 'button';

/**
 * @typedef {object} ButtonProps
 * @property {string} label
 * @property {string} [variant] A registered variant name.
 * @property {string} [href] When given, the button renders as a link (an
 *   anchor carrying the variant) — the navigation form of the same
 *   component. A disabled link drops its href and reports
 *   aria-disabled instead.
 * @property {'button' | 'submit' | 'reset'} [type]
 * @property {boolean} [disabled]
 * @property {boolean} [busy]
 * @property {(event: MouseEvent) => void} [onActivate]
 */

/** @param {ButtonProps} props */
export function create(props) {
  if (!props.label) throw new TypeError('button: label is required');

  const label = signal(props.label);
  const variant = signal(props.variant ?? 'default');
  const href = signal(props.href ?? '');
  const type = signal(props.type ?? 'button');
  const disabled = signal(props.disabled ?? false);
  const isBusy = signal(props.busy ?? false);
  const isDisabled = computed(() => disabled() || isBusy());
  const hasHref = computed(() => href() !== '');
  const hrefAttr = computed(() => (isDisabled() ? false : href()));
  const disabledAttr = computed(() => (isDisabled() ? 'true' : false));

  function activate(event) {
    if (isDisabled.peek()) return;
    props.onActivate?.(event);
  }

  return { label, variant, type, disabled, isBusy, isDisabled, hasHref, hrefAttr, disabledAttr, activate };
}

/** @param {import('../registry.js').Registry} registry */
export function registerVariants(registry) {
  registry.registerVariant('button', 'default');
  registry.registerVariant('button', 'primary');
  registry.registerVariant('button', 'ghost');
  registry.registerVariant('button', 'destructive');
}

export const template = new URL('./index.html', import.meta.url);
export const styles = new URL('./styles.css', import.meta.url);
export const button = { name, root, create, registerVariants, template, styles };
export default button;
