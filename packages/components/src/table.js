/**
 * Table component — semantic HTML table with sorting and empty state.
 * Designed for SSR — renders full table markup on the server.
 */
import { escapeAttr, escapeText } from '@basenative/runtime/shared/escape';
import { attrsSuffix } from './internal/attrs.js';

const ALIGNMENTS = new Set(['start', 'center', 'end']);

/**
 * Resolve a column's alignment. `numeric` implies `end` — a money or count
 * column reads against a right edge — but an explicit `align` still wins.
 *
 * @param {{align?: string, numeric?: boolean}} col
 * @returns {string} '' when the column takes the default start alignment
 */
function alignOf(col) {
  if (col.align && ALIGNMENTS.has(col.align)) return col.align === 'start' ? '' : col.align;
  return col.numeric ? 'end' : '';
}

/**
 * Attribute suffix shared by a column's `<th>`, `<td>` and `<tfoot>` cell, so
 * the heading can never drift out of alignment with the column beneath it.
 *
 * @param {{align?: string, numeric?: boolean}} col
 * @returns {string}
 */
function columnAttrs(col) {
  let out = '';
  const align = alignOf(col);
  if (align) out += ` data-align="${escapeAttr(align)}"`;
  if (col.numeric) out += ' data-numeric';
  return out;
}

/**
 * Renders a data table from columns and rows. Column labels, cell values,
 * caption and emptyMessage are escaped text. A column may give a
 * `render(value, row)` hook whose result fills the cell instead of the
 * escaped value — an HTML slot: not escaped; escape any data you interpolate.
 *
 * Columns may declare `align` ('start' | 'center' | 'end') or `numeric`, which
 * implies end-alignment plus tabular lining figures; both the `<th>` and every
 * cell in the column carry the resulting `data-align` / `data-numeric`. Every
 * `<td>` also carries `data-label` with its column's label, so a responsive
 * stacked layout can recover the heading from CSS once `<thead>` is hidden.
 *
 * `footer` renders a `<tfoot>`: give one row object per footer row, read with
 * the same column keys and the same `render` hooks. The first cell of each
 * footer row is a `<th scope="row">` so a totals row is announced as a row
 * heading rather than as data.
 *
 * @param {object} options
 * @param {Array<{key: string, label: string, sortable?: boolean, align?: 'start'|'center'|'end', numeric?: boolean, render?: (value: unknown, row: object) => string}>} options.columns
 * @param {Array<object>} options.rows
 * @param {Array<object>} [options.footer] - Footer rows (totals, subtotals)
 * @param {string} [options.emptyMessage] - Message when rows is empty
 * @param {string} [options.emptyContent] - HTML slot used instead of emptyMessage; not escaped
 * @param {string} [options.caption] - Table caption
 * @param {string} [options.attrs] - Raw attribute markup appended to the container; not escaped
 */
export function renderTable(options = {}) {
  const {
    columns = [],
    rows = [],
    footer = [],
    emptyMessage = 'No data',
    emptyContent = '',
    caption = '',
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
    html += `<th scope="col"${sortAttr}${columnAttrs(col)}>${escapeText(col.label)}</th>`;
  }
  html += `</tr></thead>`;
  html += `<tbody>`;

  if (rows.length === 0) {
    const body = emptyContent || escapeText(emptyMessage);
    html += `<tr><td colspan="${escapeAttr(columns.length)}" data-bn="table-empty">${body}</td></tr>`;
  } else {
    for (const row of rows) {
      html += `<tr>`;
      for (const col of columns) {
        html += `<td data-label="${escapeAttr(col.label)}"${columnAttrs(col)}>${cellOf(col, row)}</td>`;
      }
      html += `</tr>`;
    }
  }

  html += `</tbody>`;

  if (footer.length > 0 && columns.length > 0) {
    html += `<tfoot>`;
    for (const row of footer) {
      html += `<tr>`;
      columns.forEach((col, i) => {
        const tag = i === 0 ? 'th' : 'td';
        const scope = i === 0 ? ' scope="row"' : '';
        html += `<${tag}${scope} data-label="${escapeAttr(col.label)}"${columnAttrs(col)}>${cellOf(col, row)}</${tag}>`;
      });
      html += `</tr>`;
    }
    html += `</tfoot>`;
  }

  html += `</table></div>`;
  return html;
}

/**
 * One cell's inner markup: the column's `render` hook when it has one (an HTML
 * slot), otherwise the escaped value. A nullish result renders an empty cell.
 *
 * @param {{key: string, render?: (value: unknown, row: object) => string}} col
 * @param {object} row
 * @returns {string}
 */
function cellOf(col, row) {
  const value = row[col.key];
  const cell =
    typeof col.render === 'function'
      ? col.render(value, row)
      : value != null
        ? escapeText(String(value))
        : '';
  return cell ?? '';
}
