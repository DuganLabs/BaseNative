// @ts-check
import { signal } from '@basenative/runtime';
import { raw } from '@basenative/runtime/shared/escape';

export const name = 'choice-group';
export const root = 'fieldset';

/**
 * The choice paradigm, one level up from the primitives: a button is
 * act-once, a radio group is choose-one, a checkbox group is choose-many.
 * This composite is the group half of that paradigm — fieldset semantics,
 * a label per option, a native input whose type is bound data — and it
 * composes over ANY presentational substrate: each option's content is a
 * rendered component (a card today; a row, a tile, anything tomorrow)
 * nested through raw(). The group never copies substrate markup and never
 * styles inside it; a substrate that wants a selected appearance declares
 * it in its own sheet, relationally (see card's label:has(…) rules).
 *
 * Layout: the control is NOTCHED into the substrate, not parked beside
 * it — the group positions the input absolutely at the substrate's
 * top-inline corner (space-5 in, aligned to the first line), and the
 * substrate reserves that notch in its own contract rules (card widens
 * its inline-start padding by control + gap). A substrate that reserves
 * no notch simply gets the control overlaid at its corner.
 *
 * Telemetry: every change, either mode, reaches the app as ONE event
 * shape through onChange — { name, mode, values, changed, selected } —
 * so instrumentation is written once, against the group, and never cares
 * what the options are made of.
 *
 * @typedef {object} ChoiceOption
 * @property {string} value
 * @property {string} contentHtml Rendered HTML of the option's substrate.
 *
 * @typedef {object} ChoiceChange
 * @property {string} name
 * @property {string} mode "radio" (choose one) or "checkbox" (choose many).
 * @property {string[]} values All selected values after the change.
 * @property {string} changed The option value that changed.
 * @property {boolean} selected Whether it is now selected.
 *
 * @typedef {object} ChoiceGroupProps
 * @property {string} legend
 * @property {string} name The shared input name for the group.
 * @property {"radio" | "checkbox"} [type] Choose-one or choose-many. Default "radio".
 * @property {ChoiceOption[]} options
 * @property {string} [value] Radio mode: the initially selected value.
 * @property {string[]} [values] Checkbox mode: the initially selected values.
 * @property {string} [variant] The registration tag; defaults to "choice-group"
 *   (the plain radio group owns fieldset "default").
 * @property {(change: ChoiceChange) => void} [onChange]
 */

/** @param {ChoiceGroupProps} props */
export function create(props) {
  if (!props.legend) throw new TypeError('choice-group: legend is required');
  if (!props.name) throw new TypeError('choice-group: name is required');
  if (!Array.isArray(props.options) || props.options.length === 0) {
    throw new TypeError('choice-group: options must be a non-empty array');
  }
  for (const option of props.options) {
    if (!option.contentHtml) throw new TypeError('choice-group: every option needs contentHtml — render its substrate component');
  }

  const legend = signal(props.legend);
  const groupName = signal(props.name);
  const inputType = signal(props.type ?? 'radio');
  const options = signal(props.options);
  const variant = signal(props.variant ?? 'choice-group');
  const values = signal(
    props.values ?? (props.value !== undefined ? [props.value] : inputType() === 'radio' ? [props.options[0].value] : []),
  );

  /** @param {ChoiceOption} option */
  function isChecked(option) {
    return values().includes(option.value);
  }

  /**
   * @param {ChoiceOption} option
   * @param {{ target: { checked: boolean } }} event
   */
  function change(option, event) {
    const selected = inputType() === 'radio' ? true : event.target.checked;
    values.set(
      inputType() === 'radio'
        ? [option.value]
        : selected
          ? [...values(), option.value]
          : values().filter((v) => v !== option.value),
    );
    props.onChange?.({
      name: groupName(),
      mode: inputType(),
      values: [...values()],
      changed: option.value,
      selected,
    });
  }

  return { legend, groupName, inputType, options, variant, values, isChecked, change, raw };
}

/** @param {import('../registry.js').Registry} registry */
export function registerVariants(registry) {
  registry.registerVariant('choice-group', 'choice-group');
}

export const template = new URL('./index.html', import.meta.url);
export const styles = new URL('./styles.css', import.meta.url);
export const choiceGroup = { name, root, create, registerVariants, template, styles };
export default choiceGroup;
