// @ts-check
import { signal, computed } from '@basenative/runtime';
import { raw } from '@basenative/runtime/shared/escape';

export const name = 'field';
export const root = 'section';

/**
 * @typedef {object} FieldProps
 * @property {string} label
 * @property {string} controlId The id of the nested control the label names.
 *   For the `code` variant it is the id of the first digit box.
 * @property {string} [controlHtml] Rendered HTML of the nested control
 *   (trusted: produced by renderComponent). Required except for `code`.
 * @property {string} [variant] `field` (stacked label, the default),
 *   `inline` (label beside the control on wide screens), `drop` (a file
 *   drop zone around a file input) or `code` (one-time code boxes).
 *   `default` is the former name of `field` and still selects it.
 * @property {string} [hint]
 * @property {string} [error]
 * @property {string} [success] A confirmation shown while there is no error.
 * @property {boolean} [required] Mark the label as required (the control
 *   carries its own `required`; the mark is visual, `aria-hidden`).
 * @property {string} [requiredMark] Defaults to `*`.
 * @property {string} [requiredText] The mark's tooltip. Defaults to `required`.
 * @property {boolean} [optional] Mark the label as optional.
 * @property {string} [optionalText] Defaults to `Optional`.
 * @property {string} [prefix] Text before the control (a unit, `$`, `https://`).
 * @property {string} [suffix] Text after the control (`kg`, `.com`).
 * @property {string} [leadingHtml] A rendered icon or button before the control.
 * @property {string} [trailingHtml] A rendered icon or button after the control.
 * @property {boolean} [reveal] A Show toggle for a password control.
 * @property {string} [revealLabel] Defaults to `Show`.
 * @property {boolean} [clearable] A Clear button while the control has a value.
 * @property {string} [clearLabel] Defaults to `Clear`.
 * @property {boolean} [stepper] Decrease and increase buttons around a number control.
 * @property {number} [maxlength] Shows a live `n / max` character count
 *   (pair it with the control's own `maxlength`).
 * @property {string} [value] The control's initial value (for the count,
 *   the Clear button and the code boxes).
 * @property {number} [length] Number of code boxes (`code`; default 6).
 * @property {string} [name] The submitted name of the joined code (`code`).
 * @property {string} [filesText] The drop zone's empty file list text.
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
  const success = signal(props.success ?? '');
  const value = signal(props.value ?? '');
  const prefix = signal(props.prefix ?? '');
  const suffix = signal(props.suffix ?? '');
  const leadingHtml = signal(props.leadingHtml ?? '');
  const trailingHtml = signal(props.trailingHtml ?? '');
  const maxlength = signal(props.maxlength ?? 0);
  const length = signal(props.length ?? 6);
  const name = signal(props.name ?? null);
  const requiredMark = signal(props.requiredMark ?? '*');
  const requiredText = signal(props.requiredText ?? 'required');
  const optionalText = signal(props.optionalText ?? 'Optional');
  const revealLabel = signal(props.revealLabel ?? 'Show');
  const clearLabel = signal(props.clearLabel ?? 'Clear');
  const filesText = signal(props.filesText ?? 'No files selected');
  const decreaseGlyph = signal('\u2212');
  const increaseGlyph = signal('+');

  const isCode = computed(() => variant() === 'code');
  const isDrop = computed(() => variant() === 'drop');
  const isRequired = computed(() => props.required === true);
  const isOptional = computed(() => !isRequired() && props.optional === true);
  const hasError = computed(() => error() !== '');
  const hasHint = computed(() => hint() !== '');
  const showHint = computed(() => !hasError() && hasHint());
  const showSuccess = computed(() => !hasError() && success() !== '');
  const hasPrefix = computed(() => prefix() !== '');
  const hasSuffix = computed(() => suffix() !== '');
  const hasReveal = computed(() => props.reveal === true);
  const hasClear = computed(() => props.clearable === true);
  const hasStepper = computed(() => props.stepper === true);
  const hasCount = computed(() => maxlength() > 0);
  const hasGroup = computed(
    () =>
      isCode() ||
      hasPrefix() ||
      hasSuffix() ||
      leadingHtml() !== '' ||
      trailingHtml() !== '' ||
      hasReveal() ||
      hasClear() ||
      hasStepper(),
  );
  const isEmpty = computed(() => value() === '');
  /* The code boxes are a named group; an affix box is only layout. */
  const groupRole = computed(() => (isCode() ? null : 'none'));
  const labelId = computed(() => (isCode() ? `${controlId()}-label` : null));
  const hintId = computed(() => `${controlId()}-hint`);
  const errorId = computed(() => `${controlId()}-error`);
  const successId = computed(() => `${controlId()}-success`);
  const countId = computed(() => `${controlId()}-count`);
  const filesId = computed(() => `${controlId()}-files`);
  const prefixId = computed(() => `${controlId()}-prefix`);
  const suffixId = computed(() => `${controlId()}-suffix`);
  const countText = computed(() => `${value().length} / ${maxlength()}`);
  const revealName = computed(() => `${revealLabel()} ${label().toLowerCase()}`);
  const clearName = computed(() => `${clearLabel()} ${label().toLowerCase()}`);
  const decreaseName = computed(() => `Decrease ${label().toLowerCase()}`);
  const increaseName = computed(() => `Increase ${label().toLowerCase()}`);
  const digits = computed(() =>
    Array.from({ length: length() }, (_, i) => ({
      id: i === 0 ? controlId() : `${controlId()}-${i + 1}`,
      /* The first box takes the field's label; the rest say where they are. */
      name: i === 0 ? null : `Digit ${i + 1} of ${length()}`,
      autocomplete: i === 0 ? 'one-time-code' : 'off',
      value: value()[i] ?? '',
    })),
  );

  return {
    label,
    controlId,
    controlHtml,
    variant,
    hint,
    error,
    success,
    value,
    prefix,
    suffix,
    leadingHtml,
    trailingHtml,
    name,
    requiredMark,
    requiredText,
    optionalText,
    revealLabel,
    clearLabel,
    filesText,
    decreaseGlyph,
    increaseGlyph,
    isCode,
    isDrop,
    isRequired,
    isOptional,
    hasError,
    hasHint,
    showHint,
    showSuccess,
    hasPrefix,
    hasSuffix,
    hasReveal,
    hasClear,
    hasStepper,
    hasCount,
    hasGroup,
    isEmpty,
    groupRole,
    labelId,
    hintId,
    errorId,
    successId,
    countId,
    filesId,
    prefixId,
    suffixId,
    countText,
    revealName,
    clearName,
    decreaseName,
    increaseName,
    digits,
    raw,
  };
}

/** @param {import('../registry.js').Registry} registry */
export function registerVariants(registry) {
  registry.registerVariant('field', 'field');
  registry.registerVariant('field', 'inline');
  registry.registerVariant('field', 'drop');
  registry.registerVariant('field', 'code');
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

const FIELD =
  'section:is([variant="field"], [variant="inline"], [variant="drop"], [variant="code"])';
const CONTROL = 'input, textarea, select';
const CODE = 'section[variant="code"]';
const bound = new WeakSet();
let uid = 0;

/** @param {EventTarget | null} target */
function controlOf(target) {
  if (!(target instanceof Element) || !target.matches(CONTROL)) return null;
  const field = target.closest(FIELD);
  /* Code boxes are one value split across inputs: no per-box report. */
  if (!field || field.matches(CODE)) return null;
  return /** @type {HTMLInputElement} */ (target);
}

/** @param {Element} field */
function hintOf(field) {
  return field.querySelector(':scope > small:not([id$="-count"])');
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
  for (const note of field.querySelectorAll(
    ':scope > fieldset > small, :scope > :is(output, small)',
  )) {
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
  let error = field.querySelector(':scope > output[id$="-error"]');
  const success = /** @type {HTMLElement | null} */ (
    field.querySelector(':scope > output[id$="-success"]')
  );
  const hint = hintOf(field);
  if (success) success.hidden = !valid;
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
      field.insertBefore(error, hint ?? field.querySelector(':scope > small') ?? null);
    }
    error.textContent =
      (control.validity.patternMismatch && control.title) || control.validationMessage;
    if (hint) /** @type {HTMLElement} */ (hint).hidden = true;
  }
  describe(control);
  return valid;
}

/**
 * Sync a field's live parts to its control's value: the character
 * count, the Clear button, the stepper's bounds, the drop zone's file
 * list and (where CSS `field-sizing` is missing) a textarea's height.
 * @param {HTMLInputElement} control
 */
function sync(control) {
  const field = control.closest(FIELD);
  if (!field) return;
  const count = field.querySelector(':scope > small[id$="-count"]');
  if (count) {
    const max =
      control.maxLength > 0 ? control.maxLength : Number(count.textContent?.split('/')[1]);
    count.textContent = `${control.value.length} / ${max}`;
  }
  const clear = /** @type {HTMLButtonElement | null} */ (
    field.querySelector(':scope > fieldset > button[value="clear"]')
  );
  if (clear) clear.hidden = control.value === '';
  const down = /** @type {HTMLButtonElement | null} */ (
    field.querySelector(':scope > fieldset > button[value="down"]')
  );
  const up = /** @type {HTMLButtonElement | null} */ (
    field.querySelector(':scope > fieldset > button[value="up"]')
  );
  if (down || up) {
    const n = control.valueAsNumber;
    if (down) down.disabled = control.disabled || (control.min !== '' && n <= Number(control.min));
    if (up) up.disabled = control.disabled || (control.max !== '' && n >= Number(control.max));
  }
  const files = field.querySelector(':scope > output[id$="-files"]');
  if (files && control.type === 'file' && control.files?.length) {
    files.textContent = [...control.files].map((f) => f.name).join(', ');
  }
  if (
    control.localName === 'textarea' &&
    typeof CSS !== 'undefined' &&
    !CSS.supports('field-sizing', 'content')
  ) {
    control.style.blockSize = 'auto';
    control.style.blockSize = `${control.scrollHeight + control.offsetHeight - control.clientHeight}px`;
  }
}

/** @param {HTMLInputElement} control */
function emit(control) {
  control.dispatchEvent(new Event('input', { bubbles: true }));
  control.dispatchEvent(new Event('change', { bubbles: true }));
}

/** @param {Element} field */
function codeBoxes(field) {
  return /** @type {HTMLInputElement[]} */ ([
    ...field.querySelectorAll(':scope > fieldset > input:not([type="hidden"])'),
  ]);
}

/** @param {Element} field */
function codeJoin(field) {
  const hidden = /** @type {HTMLInputElement | null} */ (
    field.querySelector(':scope > fieldset > input[type="hidden"]')
  );
  const code = codeBoxes(field)
    .map((box) => box.value)
    .join('');
  if (hidden && hidden.value !== code) {
    hidden.value = code;
    hidden.dispatchEvent(new Event('change', { bubbles: true }));
  }
}

/**
 * A typed digit, a paste or an iOS one-time-code autofill lands in one
 * box; spread its digits forward and move focus on.
 * @param {HTMLInputElement} box
 */
function codeInput(box) {
  const field = /** @type {Element} */ (box.closest(CODE));
  const boxes = codeBoxes(field);
  const digits = box.value.replace(/\D/g, '');
  let at = boxes.indexOf(box);
  if (digits === '') box.value = '';
  for (const digit of digits) {
    if (at >= boxes.length) break;
    boxes[at].value = digit;
    at += 1;
  }
  if (digits !== '') boxes[Math.min(at, boxes.length - 1)].focus();
  codeJoin(field);
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

  for (const control of root.querySelectorAll(
    `${FIELD} > :is(${CONTROL}), ${FIELD} > fieldset > :is(${CONTROL})`,
  )) {
    if (!controlOf(control)) continue;
    describe(/** @type {HTMLInputElement} */ (control));
    sync(/** @type {HTMLInputElement} */ (control));
    /* A server-rendered error is already a report: keep it live. */
    if (control.getAttribute('aria-invalid') === 'true') touched.add(control);
  }
  /* With the behaviour bound, the fields report — not the browser's
     bubble. Without script, native validation still guards submit. */
  for (const form of root.querySelectorAll('form')) {
    if (form.querySelector(FIELD)) form.noValidate = true;
  }

  root.addEventListener('input', (event) => {
    const target = event.target;
    if (target instanceof HTMLInputElement && target.closest(CODE) && target.type !== 'hidden') {
      codeInput(target);
      return;
    }
    const control = controlOf(target);
    if (!control) return;
    dirty.add(control);
    sync(control);
    if (touched.has(control)) reportField(control);
  });
  root.addEventListener('change', (event) => {
    const control = controlOf(event.target);
    if (!control) return;
    sync(control);
    if (touched.has(control)) reportField(control);
  });
  root.addEventListener('click', (event) => {
    const button =
      event.target instanceof Element ? event.target.closest('button[value][aria-controls]') : null;
    if (!button || !button.closest(FIELD)) return;
    const control = /** @type {HTMLInputElement | null} */ (
      button
        .closest(FIELD)
        ?.querySelector(`#${CSS.escape(button.getAttribute('aria-controls') ?? '')}`) ?? null
    );
    if (!control) return;
    const action = /** @type {HTMLButtonElement} */ (button).value;
    if (action === 'reveal') {
      const shown = button.getAttribute('aria-pressed') === 'true';
      control.type = shown ? 'password' : 'text';
      button.setAttribute('aria-pressed', String(!shown));
    } else if (action === 'clear') {
      control.value = '';
      emit(control);
      control.focus();
    } else if (action === 'up' || action === 'down') {
      try {
        if (action === 'up') control.stepUp();
        else control.stepDown();
      } catch {
        return;
      }
      dirty.add(control);
      emit(control);
    }
  });
  root.addEventListener('keydown', (event) => {
    const box = event.target;
    if (!(box instanceof HTMLInputElement) || !box.closest(CODE)) return;
    const key = /** @type {KeyboardEvent} */ (event).key;
    const boxes = codeBoxes(/** @type {Element} */ (box.closest(CODE)));
    const at = boxes.indexOf(box);
    if (key === 'Backspace' && box.value === '' && at > 0) {
      event.preventDefault();
      boxes[at - 1].value = '';
      boxes[at - 1].focus();
      codeJoin(/** @type {Element} */ (box.closest(CODE)));
    } else if (key === 'ArrowLeft' && at > 0) {
      event.preventDefault();
      boxes[at - 1].focus();
    } else if (key === 'ArrowRight' && at < boxes.length - 1) {
      event.preventDefault();
      boxes[at + 1].focus();
    }
  });
  root.addEventListener(
    'focusin',
    (event) => {
      const box = event.target;
      if (box instanceof HTMLInputElement && box.closest(CODE)) box.select();
    },
    true,
  );
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
