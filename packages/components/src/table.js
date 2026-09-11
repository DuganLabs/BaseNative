/**
 * Table component — semantic HTML table with sorting and empty state.
 * Designed for SSR — renders full table markup on the server.
 */
import { escapeAttr, escapeText } from '@basenative/runtime/shared/escape';
import { attrsSuffix } from './internal/attrs.js';

/**
 * Renders a data table from columns and rows. Column labels, cell values,
 * caption and emptyMessage are escaped text. A column may give a
 * `render(value, row)` hook whose result fills the cell instead of the
 * escaped value — an HTML slot: not escaped; escape any data you interpolate.
 *
 * Two hooks exist for the `<td>` itself, because a real table needs to say
 * something about its cells and not just their contents:
 *
 *   - `labelCells` stamps `data-label="<column label>"` on every body cell.
 *     That is what a responsive stacked table needs: hide the `<thead>` under
 *     a container query and render each cell's own heading from
 *     `content: attr(data-label)`. Without it, every consumer wanting that
 *     layout has to build its rows by hand.
 *   - `column.cellAttrs` appends raw attribute markup to that column's cells
 *     (`data-bn="num"` for numeric alignment, a test hook, an `aria-*`).
 *     Pass a function to vary it per row.
 *
 * `column.srLabel` gives an accessible name to a column with no visible
 * label — a row-actions column, typically. Without it the header renders as
 * a bare `<th scope="col"></th>`, which axe flags as an empty table header.
 *
 * @param {object} options
 * @param {Array<{key: string, label: string, srLabel?: string, sortable?: boolean, render?: (value: unknown, row: object) => string, cellAttrs?: string | ((value: unknown, row: object) => string)}>} options.columns
 * @param {Array<object>} options.rows
 * @param {string} [options.emptyMessage] - Message when rows is empty
 * @param {string} [options.caption] - Table caption
 * @param {boolean} [options.labelCells] - Stamp `data-label` on every body cell
 * @param {string} [options.attrs] - Raw attribute markup appended to the container; not escaped
 */
export function renderTable(options = {}) {
  const {
    columns = [],
    rows = [],
    emptyMessage = 'No data',
    caption = '',
    labelCells = false,
    attrs = '',
  } = options;

  let html = `<div data-bn="table-container"${attrsSuffix(attrs)}>`;
  html += `<table data-bn="table">`;
  if (caption) {
    html += `<caption>${escapeText(caption)}</caption>`;
  }
  html += `<thead><tr>`;
  for (const col of columns) {
    const sortAttr = col.sortable ? ' data-sortable' : '';
    const heading = col.label
      ? escapeText(col.label)
      : col.srLabel
        ? `<span data-bn="sr-only">${escapeText(col.srLabel)}</span>`
        : '';
    html += `<th scope="col"${sortAttr}>${heading}</th>`;
  }
  html += `</tr></thead>`;
  html += `<tbody>`;

  if (rows.length === 0) {
    html += `<tr><td colspan="${escapeAttr(columns.length)}" data-bn="table-empty">${escapeText(emptyMessage)}</td></tr>`;
  } else {
    for (const row of rows) {
      html += `<tr>`;
      for (const col of columns) {
        const value = row[col.key];
        const cell = typeof col.render === 'function'
          ? col.render(value, row)
          : value != null ? escapeText(String(value)) : '';
        const label = labelCells && col.label ? ` data-label="${escapeAttr(col.label)}"` : '';
        const extra = typeof col.cellAttrs === 'function' ? col.cellAttrs(value, row) : col.cellAttrs;
        html += `<td${label}${attrsSuffix(extra)}>${cell ?? ''}</td>`;
      }
      html += `</tr>`;
    }
  }

  html += `</tbody></table></div>`;
  return html;
}
