// @ts-check
import { signal } from '@basenative/runtime';

export const name = 'segmented-control';
export const root = 'fieldset';

/**
 * The segmented control: the theme toggle generalized to any option
 * set. A radio group whose label IS the segment — the choice paradigm
 * with the substrate internal to the composite — presenting a small
 * set of mutually exclusive options as one pill. Changes reach the
 * app as the catalog's one choice telemetry shape, mode "segmented".
 *
 * @typedef {object} SegmentedOption
 * @property {string} value
 * @property {string} label
 *
 * @typedef {object} SegmentedControlProps
 * @property {string} legend Visually hidden; names the group.
 * @property {string} name The shared input name, carried on the event.
 * @property {SegmentedOption[]} options
 * @property {string} [value] The initially selected value.
 * @property {(change: { name: string, mode: string, values: string[], changed: string, selected: boolean }) => void} [onChange]
 * @property {string} [variant] A registered variant name.
 */

/** @param {SegmentedControlProps} props */
export function create(props) {
  if (!props.legend) throw new TypeError('segmented-control: legend is required');
  if (!props.name) throw new TypeError('segmented-control: name is required');
  if (!Array.isArray(props.options) || props.options.length === 0) {
    throw new TypeError('segmented-control: options must be a non-empty array');
  }

  const legend = signal(props.legend);
  const groupName = signal(props.name);
  const options = signal(props.options);
  const variant = signal(props.variant ?? 'segmented-control');
  const inputVariant = signal('default');
  const selected = signal(props.value ?? props.options[0].value);

  /** @param {SegmentedOption} option */
  function isChecked(option) {
    return option.value === selected();
  }

  /** @param {SegmentedOption} option */
  function change(option) {
    if (option.value === selected()) return;
    selected.set(option.value);
    props.onChange?.({
      name: groupName(),
      mode: 'segmented',
      values: [option.value],
      changed: option.value,
      selected: true,
    });
  }

  return { legend, groupName, options, variant, inputVariant, selected, isChecked, change };
}

/** @param {import('../registry.js').Registry} registry */
export function registerVariants(registry) {
  registry.registerVariant('segmented-control', 'segmented-control');
}

export const template = new URL('./index.html', import.meta.url);
export const styles = new URL('./styles.css', import.meta.url);
export const segmentedControl = { name, root, create, registerVariants, template, styles };
export default segmentedControl;
