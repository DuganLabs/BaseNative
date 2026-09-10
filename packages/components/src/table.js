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
 * @param {object} options
 * @param {Array<{key: string, label: string, sortable?: boolean, render?: (value: unknown, row: object) => string}>} options.columns
 * @param {Array<object>} options.rows
 * @param {string} [options.emptyMessage] - Message when rows is empty
 * @param {string} [options.caption] - Table caption
 * @param {string} [options.attrs] - Raw attribute markup appended to the container; not escaped
 */
export function renderTable(options = {}) {
  const { columns = [], rows = [], emptyMessage = 'No data', caption = '', attrs = '' } = options;

  let html = `<div data-bn="table-container"${attrsSuffix(attrs)}>`;
  html += `<table data-bn="table">`;
  if (caption) {
    html += `<caption>${escapeText(caption)}</caption>`;
  }
  html += `<thead><tr>`;
  for (const col of columns) {
    const sortAttr = col.sortable ? ' data-sortable' : '';
    html += `<th scope="col"${sortAttr}>${escapeText(col.label)}</th>`;
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
        html += `<td>${cell ?? ''}</td>`;
      }
      html += `</tr>`;
    }
  }

  html += `</tbody></table></div>`;
  return html;
}
