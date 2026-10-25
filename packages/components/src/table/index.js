// @ts-check
import { signal, computed } from '@basenative/runtime';
import { raw } from '@basenative/runtime/shared/escape';

export const name = 'table';
export const root = 'table';

/**
 * @typedef {object} TableCell
 * @property {string} text
 * @property {string} [contentHtml] Rendered HTML (a nested component) — takes precedence over text.
 * @property {boolean} [header] Render as the row's <th scope="row">.
 * @property {boolean} [small] Render the content de-emphasised, wrapped in a <small>.
 * @property {string} [current] An aria-current value for the cell (e.g. 'date', 'true').
 *
 * @typedef {object} TableProps
 * @property {string[]} columns Column headings.
 * @property {(string | TableCell)[][]} rows Cells, normalized to TableCell.
 * @property {string} [caption]
 * @property {string} [variant] A registered variant name.
 */

/** @param {TableProps} props */
export function create(props) {
  if (!Array.isArray(props.columns)) throw new TypeError('table: columns is required');
  if (!Array.isArray(props.rows)) throw new TypeError('table: rows is required');

  const columns = signal(props.columns);
  const rows = signal(props.rows.map((row) => row.map((cell) => (
    typeof cell === 'string' ? { text: cell } : cell
  ))));
  const caption = signal(props.caption ?? '');
  const variant = signal(props.variant ?? 'default');
  const hasCaption = computed(() => caption() !== '');

  return { columns, rows, caption, variant, hasCaption, raw };
}

/** @param {import('../registry.js').Registry} registry */
export function registerVariants(registry) {
  registry.registerVariant('table', 'default');
  registry.registerVariant('table', 'striped');
}

export const template = new URL('./index.html', import.meta.url);
export const styles = new URL('./styles.css', import.meta.url);
export const table = { name, root, create, registerVariants, template, styles };
export default table;
