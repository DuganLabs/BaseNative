// @ts-check
import { signal, computed } from '@basenative/runtime';
import { raw } from '@basenative/runtime/shared/escape';

export const name = 'datagrid';
export const root = 'table';

/**
 * A table whose cells and controls are components: header sort is a
 * caller-rendered button nested in the <th> (the th carries
 * aria-sort), selection is a caller-rendered checkbox in the first
 * cell, and a cell's content is rendered HTML — an editor control
 * where the grid is editable, plain formatted text elsewhere. The
 * grid owns the table semantics; the controls keep their own
 * directories.
 *
 * @typedef {object} DatagridColumn
 * @property {string} key
 * @property {string} label
 * @property {string} [sort] ascending | descending — sets aria-sort.
 * @property {string} [sortHtml] The rendered sort button (defaults to the label).
 *
 * @typedef {object} DatagridRow
 * @property {string[]} cells Rendered cell HTML, one per column.
 * @property {string} [selectHtml] The rendered selection checkbox.
 *
 * @typedef {object} DatagridProps
 * @property {DatagridColumn[]} columns
 * @property {DatagridRow[]} rows
 * @property {string} [caption]
 * @property {boolean} [selectable] Renders the selection column.
 * @property {string} [selectAllHtml] The rendered header selection checkbox.
 * @property {string} [variant] A registered variant name.
 */

/** @param {DatagridProps} props */
export function create(props) {
  if (!Array.isArray(props.columns)) throw new TypeError('datagrid: columns is required');
  if (!Array.isArray(props.rows)) throw new TypeError('datagrid: rows is required');

  const columns = signal(props.columns.map((column) => ({
    ...column,
    sortHtml: column.sortHtml ?? column.label,
  })));
  const rows = signal(props.rows);
  const caption = signal(props.caption ?? '');
  const selectable = signal(props.selectable ?? false);
  const selectAllHtml = signal(props.selectAllHtml ?? '');
  const variant = signal(props.variant ?? 'datagrid');
  const hasCaption = computed(() => caption() !== '');

  return { columns, rows, caption, selectable, selectAllHtml, variant, hasCaption, raw };
}

/** @param {import('../registry.js').Registry} registry */
export function registerVariants(registry) {
  registry.registerVariant('datagrid', 'datagrid');
}

export const template = new URL('./index.html', import.meta.url);
export const styles = new URL('./styles.css', import.meta.url);
export const datagrid = { name, root, create, registerVariants, template, styles };
export default datagrid;
