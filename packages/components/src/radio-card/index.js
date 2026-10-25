// @ts-check
import { signal } from '@basenative/runtime';
import { raw } from '@basenative/runtime/shared/escape';

export const name = 'radio-card';
export const root = 'fieldset';

/**
 * A composite: a radio group whose options are card components. The card
 * markup is rendered by the caller (renderComponent('card', …)) and nested
 * through raw() — the composite never copies card markup. Selection is
 * expressed by re-pointing the nested card's tokens from the label scope:
 * :checked on the group's input restyles the card beside it, exactly the
 * channel dialog's destructive variant uses on its buttons.
 *
 * @typedef {object} RadioCardOption
 * @property {string} value
 * @property {string} cardHtml Rendered HTML of a card component.
 *
 * @typedef {object} RadioCardProps
 * @property {string} legend
 * @property {string} name The shared input name that makes the group exclusive.
 * @property {RadioCardOption[]} options
 * @property {string} [value] The initially selected option value.
 * @property {string} [variant] The registration tag; defaults to "radio-card" —
 *   the plain radio group already owns fieldset "default", and the registry
 *   refuses to let two components claim one (element, variant) address.
 * @property {(value: string) => void} [onChoose]
 */

/** @param {RadioCardProps} props */
export function create(props) {
  if (!props.legend) throw new TypeError('radio-card: legend is required');
  if (!props.name) throw new TypeError('radio-card: name is required');
  if (!Array.isArray(props.options) || props.options.length === 0) {
    throw new TypeError('radio-card: options must be a non-empty array');
  }
  for (const option of props.options) {
    if (!option.cardHtml) throw new TypeError('radio-card: every option needs cardHtml — render a card component for it');
  }

  const legend = signal(props.legend);
  const groupName = signal(props.name);
  const options = signal(props.options);
  const variant = signal(props.variant ?? 'radio-card');
  const value = signal(props.value ?? props.options[0].value);

  /** @param {RadioCardOption} option */
  function isChecked(option) {
    return option.value === value();
  }

  /** @param {RadioCardOption} option */
  function choose(option) {
    value.set(option.value);
    props.onChoose?.(option.value);
  }

  return { legend, groupName, options, variant, value, isChecked, choose, raw };
}

/** @param {import('../registry.js').Registry} registry */
export function registerVariants(registry) {
  registry.registerVariant('radio-card', 'radio-card', {});
}

export const template = new URL('./index.html', import.meta.url);
export const styles = new URL('./styles.css', import.meta.url);
export const radioCard = { name, root, create, registerVariants, template, styles };
export default radioCard;
