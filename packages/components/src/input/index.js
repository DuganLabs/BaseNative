// @ts-check
import { signal } from '@basenative/runtime';

export const name = 'input';
export const root = 'input';

/**
 * @typedef {object} InputProps
 * @property {string} [value]
 * @property {string} [id] The control id a field's label points at.
 * @property {string} [variant] A registered variant name.
 * @property {string} [type]
 * @property {boolean} [disabled]
 * @property {boolean} [invalid]
 * @property {string} [name]
 * @property {string} [placeholder]
 * @property {string} [autocomplete]
 * @property {string} [inputmode]
 * @property {boolean} [required] Constraint validation: the field reports a missing value.
 * @property {boolean} [readonly]
 * @property {string} [pattern]
 * @property {string | number} [min]
 * @property {string | number} [max]
 * @property {string | number} [step]
 * @property {number} [minlength]
 * @property {number} [maxlength]
 * @property {string} [title] Describes the pattern; the field reports it when the value does not match.
 */

/** @param {InputProps} props */
export function create(props = {}) {
  const value = signal(props.value ?? '');
  const controlId = signal(props.id ?? '');
  const variant = signal(props.variant ?? 'default');
  const type = signal(props.type ?? 'text');
  const disabled = signal(props.disabled ?? false);
  const isInvalid = signal(props.invalid ?? false);
  /* Constraint attributes: absent (null) unless the caller sets them,
     so the browser's own validity drives the field's report. */
  const attr = (v) => signal(v ?? null);
  const name = attr(props.name);
  const placeholder = attr(props.placeholder);
  const autocomplete = attr(props.autocomplete);
  const inputmode = attr(props.inputmode);
  const required = signal(props.required ?? false);
  const readonly = signal(props.readonly ?? false);
  const pattern = attr(props.pattern);
  const min = attr(props.min);
  const max = attr(props.max);
  const step = attr(props.step);
  const minlength = attr(props.minlength);
  const maxlength = attr(props.maxlength);
  const title = attr(props.title);

  /** @param {{ target: { value: string } }} event */
  function update(event) {
    value.set(event.target.value);
  }

  return {
    value,
    controlId,
    variant,
    type,
    disabled,
    isInvalid,
    name,
    placeholder,
    autocomplete,
    inputmode,
    required,
    readonly,
    pattern,
    min,
    max,
    step,
    minlength,
    maxlength,
    title,
    update,
  };
}

/** @param {import('../registry.js').Registry} registry */
export function registerVariants(registry) {
  registry.registerVariant('input', 'default');
}

export const template = new URL('./index.html', import.meta.url);
export const styles = new URL('./styles.css', import.meta.url);
export const input = { name, root, create, registerVariants, template, styles };
export default input;
