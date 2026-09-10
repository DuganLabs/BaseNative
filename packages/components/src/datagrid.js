/**
 * Data grid — sortable, filterable, paginated table with virtual scrolling support.
 */
import { escapeAttr, escapeText } from '@basenative/runtime/shared/escape';
import { nextId } from './ids.js';
import { attrsSuffix } from './internal/attrs.js';

/**
 * Data grid — sortable, filterable, paginated table with virtual scrolling support.
 *
 * Column labels, raw cell values, caption and emptyMessage are escaped text.
 * A column's `render(value, row)` result is an HTML slot: not escaped; return
 * trusted markup only.
 *
 * A `sortable` column header renders as `<th aria-sort="…"><button
 * type="button" data-bn="datagrid-th-button">…</button></th>` so it is
 * reachable and activatable by keyboard with no client-side JavaScript;
 * wiring that button's `click` to actually re-sort `rows`/`sortBy`/`sortDir`
 * is left to the caller, same as `data-sortable` on Table.
 *
 * @param {object} [options]
 * @param {Array<{key: string, label: string, sortable?: boolean, resizable?: boolean, editable?: boolean, width?: string, render?: (value: unknown, row: object) => string}>} [options.columns]
 * @param {Array<object>} [options.rows]
 * @param {string} [options.sortBy]
 * @param {'asc'|'desc'} [options.sortDir='asc']
 * @param {number} [options.page=1]
 * @param {number} [options.pageSize=50]
 * @param {number} [options.totalRows]
 * @param {boolean} [options.selectable]
 * @param {Array<string|number>} [options.selectedRows]
 * @param {string} [options.emptyMessage='No data']
 * @param {string} [options.caption]
 * @param {string} [options.id]     Defaults to nextId('datagrid')
 * @param {string} [options.attrs]  Raw attribute markup appended to the wrapper; not escaped
 * @returns {string}
 */
export function renderDataGrid(options = {}) {
  const {
    columns = [],
    rows = [],
    sortBy,
    sortDir = 'asc',
    page = 1,
    pageSize = 50,
    totalRows,
    selectable = false,
    selectedRows = [],
    emptyMessage = 'No data',
    caption,
    id = nextId('datagrid'),
    attrs = '',
  } = options;

  const total = totalRows ?? rows.length;
  const selectedSet = new Set(selectedRows);

  const headerCells = columns.map(col => {
    const isSorted = sortBy === col.key;
    const sortable = col.sortable ? ' data-sortable' : '';
    const sorted = isSorted ? ` data-sorted="${escapeAttr(sortDir)}"` : '';
    const ariaSort = isSorted ? ` aria-sort="${sortDir === 'asc' ? 'ascending' : 'descending'}"` : '';
    const width = col.width ? ` style="width:${escapeAttr(col.width)}"` : '';
    const resizable = col.resizable ? ' data-resizable' : '';
    const label = `${escapeText(col.label ?? '')}${isSorted ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ''}`;
    // A sortable header must itself be a focusable, natively activatable
    // element — a `<th>` alone is neither. Wrapping the label in a real
    // `<button>` (the WAI-ARIA APG sortable-column-header pattern) reaches
    // and activates on Tab/Enter/Space with no client-side keydown handler.
    const content = col.sortable
      ? `<button type="button" data-bn="datagrid-th-button">${label}</button>`
      : label;
    return `<th data-bn="datagrid-th" data-key="${escapeAttr(col.key)}"${sortable}${sorted}${ariaSort}${width}${resizable} scope="col">${content}</th>`;
  }).join('');

  const selectAllHeader = selectable
    ? `<th data-bn="datagrid-th-select"><input type="checkbox" aria-label="Select all" data-bn="datagrid-select-all"></th>`
    : '';

  const bodyRows = rows.map((row, i) => {
    const rowId = row.id ?? i;
    const cells = columns.map(col => {
      const value = col.render ? col.render(row[col.key], row) : escapeText(row[col.key] ?? '');
      const editable = col.editable ? ' contenteditable="true" data-editable' : '';
      return `<td data-bn="datagrid-td" data-key="${escapeAttr(col.key)}"${editable}>${value}</td>`;
    }).join('');
    const selectCell = selectable
      ? `<td data-bn="datagrid-td-select"><input type="checkbox" ${selectedSet.has(rowId) ? 'checked ' : ''}aria-label="Select row ${escapeAttr(rowId)}" data-bn="datagrid-row-select" data-row-id="${escapeAttr(rowId)}"></td>`
      : '';
    return `<tr data-bn="datagrid-row" data-row-id="${escapeAttr(rowId)}">${selectCell}${cells}</tr>`;
  }).join('');

  const emptyRow = rows.length === 0
    ? `<tr><td colspan="${columns.length + (selectable ? 1 : 0)}" data-bn="datagrid-empty">${escapeText(emptyMessage)}</td></tr>`
    : '';

  return `<div data-bn="datagrid" id="${escapeAttr(id)}"${attrsSuffix(attrs)}>
  <div data-bn="datagrid-scroll" role="region" aria-label="${escapeAttr(caption || 'Data grid')}" tabindex="0">
    <table data-bn="datagrid-table" role="grid">
      ${caption ? `<caption>${escapeText(caption)}</caption>` : ''}
      <thead><tr>${selectAllHeader}${headerCells}</tr></thead>
      <tbody>${bodyRows || emptyRow}</tbody>
    </table>
  </div>
  <div data-bn="datagrid-footer">
    <span data-bn="datagrid-info">Showing ${Math.min((page - 1) * pageSize + 1, total)}–${Math.min(page * pageSize, total)} of ${total}</span>
  </div>
</div>`;
}
