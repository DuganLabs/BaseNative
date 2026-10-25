// @ts-check
import { signal } from '@basenative/runtime';
import { raw } from '@basenative/runtime/shared/escape';

export const name = 'pipeline';
export const root = 'ol';

/**
 * The board: an ordered list of stage columns, each a titled list of
 * cards (the card component, caller-rendered). GreenPut's
 * quoted → scheduled → completed → paid is this shape.
 *
 * @typedef {object} PipelineColumn
 * @property {string} title
 * @property {string[]} cardsHtml Rendered cards.
 *
 * @typedef {object} PipelineProps
 * @property {PipelineColumn[]} columns
 * @property {string} [variant] A registered variant name.
 */

/** @param {PipelineProps} props */
export function create(props) {
  if (!Array.isArray(props.columns)) throw new TypeError('pipeline: columns is required');

  const columns = signal(props.columns);
  const variant = signal(props.variant ?? 'pipeline');

  return { columns, variant, raw };
}

/** @param {import('../registry.js').Registry} registry */
export function registerVariants(registry) {
  registry.registerVariant('pipeline', 'pipeline');
}

export const template = new URL('./index.html', import.meta.url);
export const styles = new URL('./styles.css', import.meta.url);
export const pipeline = { name, root, create, registerVariants, template, styles };
export default pipeline;
