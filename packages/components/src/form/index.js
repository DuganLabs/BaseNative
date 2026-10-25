// @ts-check
import { signal, computed } from '@basenative/runtime';
import { raw } from '@basenative/runtime/shared/escape';

export const name = 'form';
export const root = 'form';

/**
 * The form composite: an optional heading, an optional validation
 * summary (a rendered alert, present exactly when the app has errors
 * to report), the fields (rendered field components, through the
 * fieldsHtml slot), and an actions row of rendered buttons. The form
 * owns the shape and the submit moment; field-level errors stay on
 * the fields, and what a submit does is the app's onSubmit.
 *
 * Submit readiness is relational, declared in this sheet: while any
 * control inside the form is :invalid, the actions row dims through
 * its own opacity token — no view-model flag, no per-field wiring.
 *
 * @typedef {object} FormProps
 * @property {string} [name] The form's name, carried on the submit event.
 * @property {string} [heading]
 * @property {string} fieldsHtml Rendered fields (field + control renders).
 * @property {string} [summaryHtml] A rendered alert summarizing errors.
 * @property {string} [actionsHtml] Rendered buttons for the actions row.
 * @property {(event: { name: string }) => void} [onSubmit]
 * @property {string} [variant] A registered variant name.
 */

/** @param {FormProps} props */
export function create(props) {
  if (!props.fieldsHtml) throw new TypeError('form: fieldsHtml is required — render the fields into it');

  const formName = signal(props.name ?? '');
  const heading = signal(props.heading ?? '');
  const fieldsHtml = signal(props.fieldsHtml);
  const summaryHtml = signal(props.summaryHtml ?? '');
  const actionsHtml = signal(props.actionsHtml ?? '');
  const variant = signal(props.variant ?? 'default');
  const submitted = signal(false);
  const hasHeading = computed(() => heading() !== '');
  const hasSummary = computed(() => summaryHtml() !== '');
  const hasActions = computed(() => actionsHtml() !== '');

  /** @param {{ preventDefault?: () => void }} [event] */
  function submit(event) {
    event?.preventDefault?.();
    submitted.set(true);
    props.onSubmit?.({ name: formName() });
  }

  return { formName, heading, fieldsHtml, summaryHtml, actionsHtml, variant, submitted, hasHeading, hasSummary, hasActions, submit, raw };
}

/** @param {import('../registry.js').Registry} registry */
export function registerVariants(registry) {
  registry.registerVariant('form', 'default');
}

export const template = new URL('./index.html', import.meta.url);
export const styles = new URL('./styles.css', import.meta.url);
export const form = { name, root, create, registerVariants, template, styles };
export default form;
