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
 * @property {(move: { fromColumn: number, fromIndex: number, toColumn: number, toIndex: number }) => void} [onCardMove]
 * @property {string} [variant] A registered variant name.
 */

/** @param {PipelineProps} props */
export function create(props) {
  if (!Array.isArray(props.columns)) throw new TypeError('pipeline: columns is required');

  const columns = signal(props.columns);
  const variant = signal(props.variant ?? 'pipeline');

  /**
   * Move a card — the model half of the legacy pipeline drag-and-drop
   * and keyboard select-then-place paths. `toIndex` is the index the
   * card occupies among the target column's cards after the move
   * (excluding itself), matching the legacy onCardMove convention;
   * the move reports through onCardMove. Returns whether it moved.
   * @param {number} fromColumn @param {number} fromIndex
   * @param {number} toColumn @param {number} toIndex
   */
  function moveCard(fromColumn, fromIndex, toColumn, toIndex) {
    const cols = columns().map((column) => ({ ...column, cardsHtml: [...column.cardsHtml] }));
    const source = cols[fromColumn];
    const target = cols[toColumn];
    if (!source || !target || fromIndex < 0 || fromIndex >= source.cardsHtml.length) return false;
    const [card] = source.cardsHtml.splice(fromIndex, 1);
    const clamped = Math.max(0, Math.min(toIndex, target.cardsHtml.length));
    target.cardsHtml.splice(clamped, 0, card);
    columns.set(cols);
    props.onCardMove?.({ fromColumn, fromIndex, toColumn, toIndex: clamped });
    return true;
  }

  return { columns, variant, moveCard, raw };
}

/** @param {import('../registry.js').Registry} registry */
export function registerVariants(registry) {
  registry.registerVariant('pipeline', 'pipeline');
}

export const template = new URL('./index.html', import.meta.url);
export const styles = new URL('./styles.css', import.meta.url);
export const pipeline = { name, root, create, registerVariants, template, styles };
export default pipeline;
