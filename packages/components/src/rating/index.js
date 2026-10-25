// @ts-check
import { signal } from '@basenative/runtime';
import { raw } from '@basenative/runtime/shared/escape';

export const name = 'rating';
export const root = 'fieldset';

/**
 * The rating input: the choice paradigm over a star substrate — a
 * radio group whose options are one caller-rendered star mark
 * (starHtml, drawn with currentColor) repeated per step. The sheet
 * lights the chosen range relationally, through :has rules keyed to
 * each step, so the document order stays the value order and no
 * script ever paints a star. Changes reach the app as the catalog's
 * one choice telemetry shape, mode "rating". The scale is one to
 * five — the authored range rules cover five steps.
 *
 * @typedef {object} RatingProps
 * @property {string} legend Visually hidden; names the group.
 * @property {string} name The shared input name, carried on the event.
 * @property {string} starHtml The rendered star mark, filled with currentColor.
 * @property {number} [value] The initially chosen rating.
 * @property {number} [max] Steps on the scale, one to five. Default 5.
 * @property {(change: { name: string, mode: string, values: number[], changed: number, selected: boolean }) => void} [onChange]
 * @property {string} [variant] A registered variant name.
 */

/** @param {RatingProps} props */
export function create(props) {
  if (!props.legend) throw new TypeError('rating: legend is required');
  if (!props.name) throw new TypeError('rating: name is required');
  if (!props.starHtml) throw new TypeError('rating: starHtml is required — render the star mark into it');
  const max = props.max ?? 5;
  if (!Number.isInteger(max) || max < 1 || max > 5) {
    throw new TypeError('rating: max must be an integer from one to five — the range rules are authored for five steps');
  }

  const legend = signal(props.legend);
  const groupName = signal(props.name);
  const starHtml = signal(props.starHtml);
  const variant = signal(props.variant ?? 'rating');
  const inputVariant = signal('default');
  const options = signal(
    Array.from({ length: max }, (_, index) => {
      const value = index + 1;
      return { value: String(value), numeric: value, label: value + (value === 1 ? ' star' : ' stars') };
    }),
  );
  const selected = signal(props.value !== undefined ? String(props.value) : '');

  /** @param {{ value: string }} option */
  function isChecked(option) {
    return option.value === selected();
  }

  /** @param {{ value: string, numeric: number }} option */
  function change(option) {
    if (option.value === selected()) return;
    selected.set(option.value);
    props.onChange?.({
      name: groupName(),
      mode: 'rating',
      values: [option.numeric],
      changed: option.numeric,
      selected: true,
    });
  }

  return { legend, groupName, starHtml, variant, inputVariant, options, selected, isChecked, change, raw };
}

/** @param {import('../registry.js').Registry} registry */
export function registerVariants(registry) {
  registry.registerVariant('rating', 'rating');
}

export const template = new URL('./index.html', import.meta.url);
export const styles = new URL('./styles.css', import.meta.url);
export const rating = { name, root, create, registerVariants, template, styles };
export default rating;
