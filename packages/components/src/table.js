/**
 * Table component — semantic HTML table with sorting and empty state.
 * Designed for SSR — renders full table markup on the server.
 */
import { escapeAttr, escapeText } from '@basenative/runtime/shared/escape';

/**
 * Renders a data table from columns and rows. Column labels, cell values,
 * caption and emptyMessage are escaped text.
 *
 * @param {object} options
 * @param {Array<{key: string, label: string, sortable?: boolean}>} options.columns
 * @param {Array<object>} options.rows
 * @param {string} [options.emptyMessage] - Message when rows is empty
 * @param {string} [options.caption] - Table caption
 */
export function renderTable(options = {}) {
  const { columns = [], rows = [], emptyMessage = 'No data', caption = '' } = options;

  let html = `<div data-bn="table-container">`;
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
        html += `<td>${value != null ? escapeText(String(value)) : ''}</td>`;
      }
      html += `</tr>`;
    }
  }

  html += `</tbody></table></div>`;
  return html;
}
