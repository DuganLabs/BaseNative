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
 * @property {boolean} [numeric] Stamped by create() for a cell in a numeric
 *   column: the value renders in a <data> element and aligns to the trailing edge.
 * @property {string} [label] The cell's column heading, stamped by create() from
 *   columns — rendered as the cell's key line when the table restacks narrow.
 *   Row-header cells carry no label: the header is the row's own label line.
 *
 * @typedef {object} TableProps
 * @property {string[]} columns Column headings.
 * @property {(string | TableCell)[][]} rows Cells, normalized to TableCell.
 * @property {number[]} [numeric] Indexes of numeric columns (versions, counts,
 *   sizes): their heading and cells align to the trailing edge in tabular figures.
 * @property {string} [caption]
 * @property {string} [variant] A registered variant name.
 */

/** @param {TableProps} props */
export function create(props) {
  if (!Array.isArray(props.columns)) throw new TypeError('table: columns is required');
  if (!Array.isArray(props.rows)) throw new TypeError('table: rows is required');

  const numeric = new Set(Array.isArray(props.numeric) ? props.numeric : []);
  const columns = signal(props.columns.map((text, i) => ({ text, numeric: numeric.has(i) })));
  const rows = signal(props.rows.map((row) => row.map((cell, i) => {
    const base = typeof cell === 'string' ? { text: cell } : cell;
    const normalized = numeric.has(i) && !base.contentHtml ? { ...base, numeric: true } : base;
    if (normalized.header) return normalized;
    const label = props.columns[i];
    return typeof label === 'string' && label !== ''
      ? { ...normalized, label }
      : normalized;
  })));
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
