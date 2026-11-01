// @ts-check
import { signal, computed } from '@basenative/runtime';
import { raw } from '@basenative/runtime/shared/escape';

export const name = 'field';
export const root = 'section';

/**
 * @typedef {object} FieldProps
 * @property {string} label
 * @property {string} controlId The id of the nested control the label names.
 * @property {string} controlHtml Rendered HTML of the nested control (trusted: produced by renderComponent).
 * @property {string} [variant] A registered variant name. `default` is the
 *   former name of `field` and still selects it.
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
  const variant = signal(!props.variant || props.variant === 'default' ? 'field' : props.variant);
  const hint = signal(props.hint ?? '');
  const error = signal(props.error ?? '');
  const hasError = computed(() => error() !== '');
  const hasHint = computed(() => hint() !== '');
  const showHint = computed(() => !hasError() && hasHint());
  const hintId = computed(() => `${controlId()}-hint`);
  const errorId = computed(() => `${controlId()}-error`);

  return {
    label,
    controlId,
    controlHtml,
    variant,
    hint,
    error,
    hasError,
    hasHint,
    showHint,
    hintId,
    errorId,
    raw,
  };
}

/** @param {import('../registry.js').Registry} registry */
export function registerVariants(registry) {
  registry.registerVariant('field', 'field');
}

/**
 * The field's live report. A field nests a server-rendered control, so
 * its validation runs as one delegated behaviour over a root (the
 * document by default) rather than through each control's view model:
 *
 * - The browser's constraint validation is the source of truth:
 *   required, type (email, url, number), pattern, min/max, step and
 *   minlength/maxlength. On a pattern mismatch the control's `title`
 *   (the HTML convention for describing a pattern) is the message.
 * - A control reports once the person has edited it and left it, and
 *   from then on re-reports on every input, so the error clears the
 *   moment the value is valid. A form submit reports every field and
 *   focuses the first invalid control.
 * - Reporting sets `aria-invalid` on the control, shows the error as
 *   the field's `<output>` (a status) in place of its `<small>` hint, and
 *   points `aria-describedby` at whichever message is showing.
 */

const FIELD = 'section[variant="field"]';
const CONTROL = 'input, textarea, select';
const bound = new WeakSet();
let uid = 0;

/** @param {EventTarget | null} target */
function controlOf(target) {
  if (!(target instanceof Element) || !target.matches(CONTROL)) return null;
  const field = target.closest(FIELD);
  if (!field) return null;
  return /** @type {HTMLInputElement} */ (target);
}

/** @param {Element} field */
function hintOf(field) {
  return field.querySelector(':scope > small');
}

/** @param {HTMLInputElement} control */
function idFor(control) {
  if (!control.id) control.id = `bn-field-${++uid}`;
  return control.id;
}

/** @param {HTMLInputElement} control */
function describe(control) {
  const field = /** @type {Element} */ (control.closest(FIELD));
  const ids = [];
  for (const note of field.querySelectorAll(':scope > :is(output, small)')) {
    if (/** @type {HTMLElement} */ (note).hidden) continue;
    if (!note.id) note.id = `${idFor(control)}-${note.localName === 'output' ? 'error' : 'hint'}`;
    ids.push(note.id);
  }
  if (ids.length) control.setAttribute('aria-describedby', ids.join(' '));
  else control.removeAttribute('aria-describedby');
}

/** @param {HTMLInputElement} control */
export function reportField(control) {
  const field = control.closest(FIELD);
  if (!field) return true;
  const valid = control.validity.valid;
  let error = field.querySelector(':scope > output');
  const hint = hintOf(field);
  if (valid) {
    control.removeAttribute('aria-invalid');
    error?.remove();
    if (hint) /** @type {HTMLElement} */ (hint).hidden = false;
  } else {
    control.setAttribute('aria-invalid', 'true');
    if (!error) {
      error = document.createElement('output');
      error.id = `${idFor(control)}-error`;
      error.setAttribute('for', idFor(control));
      field.insertBefore(error, hint ?? null);
    }
    error.textContent =
      (control.validity.patternMismatch && control.title) || control.validationMessage;
    if (hint) /** @type {HTMLElement} */ (hint).hidden = true;
  }
  describe(control);
  return valid;
}

/**
 * Bind the field report under a root. Idempotent per root.
 * @param {Document | Element} [root]
 */
export function bindFieldValidation(root = document) {
  if (bound.has(root)) return;
  bound.add(root);
  const dirty = new WeakSet();
  const touched = new WeakSet();

  for (const control of root.querySelectorAll(`${FIELD} > :is(${CONTROL})`)) {
    describe(/** @type {HTMLInputElement} */ (control));
    /* A server-rendered error is already a report: keep it live. */
    if (control.getAttribute('aria-invalid') === 'true') touched.add(control);
  }
  /* With the behaviour bound, the fields report — not the browser's
     bubble. Without script, native validation still guards submit. */
  for (const form of root.querySelectorAll('form')) {
    if (form.querySelector(FIELD)) form.noValidate = true;
  }

  root.addEventListener('input', (event) => {
    const control = controlOf(event.target);
    if (!control) return;
    dirty.add(control);
    if (touched.has(control)) reportField(control);
  });
  root.addEventListener('change', (event) => {
    const control = controlOf(event.target);
    if (control && touched.has(control)) reportField(control);
  });
  root.addEventListener(
    'focusout',
    (event) => {
      const control = controlOf(event.target);
      if (!control || !dirty.has(control)) return;
      touched.add(control);
      reportField(control);
    },
    true,
  );
  root.addEventListener(
    'invalid',
    (event) => {
      const control = controlOf(event.target);
      if (!control) return;
      event.preventDefault();
      touched.add(control);
      reportField(control);
    },
    true,
  );
  root.addEventListener(
    'submit',
    (event) => {
      const form = event.target;
      if (!(form instanceof HTMLFormElement) || !form.querySelector(FIELD)) return;
      if (form.checkValidity()) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      const first = /** @type {HTMLElement | null} */ (
        form.querySelector(`${FIELD} :is(${CONTROL}):invalid`)
      );
      first?.focus();
    },
    true,
  );
}

export const template = new URL('./index.html', import.meta.url);
export const styles = new URL('./styles.css', import.meta.url);
export const field = { name, root, create, registerVariants, template, styles };
export default field;
