// @ts-check
import { signal, computed } from '@basenative/runtime';
import { raw } from '@basenative/runtime/shared/escape';

export const name = 'search-field';
export const root = 'search';

/**
 * The search-field composite: the labelled search control that the
 * combobox and the command palette previously took as caller-rendered
 * HTML, standardized — a visually hidden label, the input component's
 * registered tag on a native search input, a clear button that exists
 * exactly while the field holds text, and an optional caller-rendered
 * submit button. One telemetry shape out: onSearch carries the query
 * when the search is submitted (Enter or the app's submit wiring),
 * onClear when the field is emptied by its clear button.
 *
 * @typedef {object} SearchFieldProps
 * @property {string} label Accessible label (visually hidden).
 * @property {string} controlId The input's id; the label points at it.
 * @property {string} [name] The control's name, carried on the events.
 * @property {string} [value] The initial query.
 * @property {string} [clearLabel] Default "Clear".
 * @property {string} [placeholder] Hint text shown while the field is empty.
 * @property {string} [submitHtml] A rendered submit button.
 * @property {(event: { name: string, value: string }) => void} [onSearch]
 * @property {(event: { name: string }) => void} [onClear]
 * @property {string} [variant] A registered variant name.
 */

/** @param {SearchFieldProps} props */
export function create(props) {
  if (!props.label) throw new TypeError('search-field: label is required');
  if (!props.controlId) throw new TypeError('search-field: controlId is required');

  const label = signal(props.label);
  const controlId = signal(props.controlId);
  const groupName = signal(props.name ?? '');
  const value = signal(props.value ?? '');
  const clearLabel = signal(props.clearLabel ?? 'Clear');
  // false omits the attribute: no empty placeholder on a field without one.
  const placeholder = signal(props.placeholder || false);
  const submitHtml = signal(props.submitHtml ?? '');
  const inputVariant = signal('default');
  const variant = signal(props.variant ?? 'default');
  const hasValue = computed(() => value() !== '');
  const hasSubmit = computed(() => submitHtml() !== '');

  /** @param {{ target: { value: string } }} event */
  function update(event) {
    value.set(event.target.value);
  }

  function clear() {
    if (value() === '') return;
    value.set('');
    props.onClear?.({ name: groupName() });
  }

  function submit() {
    props.onSearch?.({ name: groupName(), value: value() });
  }

  /** @param {{ key: string, preventDefault?: () => void }} event */
  function keydown(event) {
    if (event.key !== 'Enter') return;
    event.preventDefault?.();
    submit();
  }

  return { label, controlId, groupName, value, clearLabel, placeholder, submitHtml, inputVariant, variant, hasValue, hasSubmit, update, clear, submit, keydown, raw };
}

/** @param {import('../registry.js').Registry} registry */
export function registerVariants(registry) {
  registry.registerVariant('search-field', 'default');
}

export const template = new URL('./index.html', import.meta.url);
export const styles = new URL('./styles.css', import.meta.url);
export const searchField = { name, root, create, registerVariants, template, styles };
export default searchField;
