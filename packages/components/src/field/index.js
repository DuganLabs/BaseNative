// @ts-check
import { signal, computed } from '@basenative/runtime';
import { raw } from '@basenative/runtime/shared/escape';

export const name = 'field';
export const root = 'p';

/**
 * @typedef {object} FieldProps
 * @property {string} label
 * @property {string} controlId The id of the nested control the label names.
 * @property {string} controlHtml Rendered HTML of the nested control (trusted: produced by renderComponent).
 * @property {string} [variant] A registered variant name.
 * @property {string} [hint]
 * @property {string} [error]
 */

/** @param {FieldProps} props */
export function create(props) {
  if (!props.label) throw new TypeError('field: label is required');
  if (!props.controlId) throw new TypeError('field: controlId is required');

  const label = signal(props.label);
  const controlId = signal(props.controlId);
  const controlHtml = signal(props.controlHtml ?? '');
  const variant = signal(props.variant ?? 'default');
  const hint = signal(props.hint ?? '');
  const error = signal(props.error ?? '');
  const hasError = computed(() => error() !== '');
  const showHint = computed(() => !hasError() && hint() !== '');

  return { label, controlId, controlHtml, variant, hint, error, hasError, showHint, raw };
}

/** @param {import('../registry.js').Registry} registry */
export function registerVariants(registry) {
  registry.registerVariant('field', 'default', {});
}

export const template = new URL('./index.html', import.meta.url);
export const styles = new URL('./styles.css', import.meta.url);
export const field = { name, root, create, registerVariants, template, styles };
export default field;
