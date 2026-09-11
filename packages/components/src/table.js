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
 * An unknown `align` is ignored rather than emitted: `data-align="middle"`
 * matches no rule in the stylesheet, so it would render as silent nothing.
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
 * One body or footer cell: the column's `render` hook when it has one (an HTML
 * slot), otherwise the escaped value; a nullish result renders empty. Carries
 * whatever the column says about its cells — alignment, `data-label` when
 * `labelCells` is on, and `cellAttrs` — so a footer cell is marked up exactly
 * like the body cells it sums.
 *
 * @param {'th'|'td'} tag
 * @param {{key: string, label?: string, render?: Function, cellAttrs?: string | Function}} col
 * @param {object} row
 * @param {{labelCells?: boolean, scope?: string}} [opts]
 * @returns {string}
 */
function renderCell(tag, col, row, { labelCells = false, scope = '' } = {}) {
  const value = row[col.key];
  const cell =
    typeof col.render === 'function'
      ? col.render(value, row)
      : value != null
        ? escapeText(String(value))
        : '';
  const label = labelCells && col.label ? ` data-label="${escapeAttr(col.label)}"` : '';
  const extra = typeof col.cellAttrs === 'function' ? col.cellAttrs(value, row) : col.cellAttrs;
  return `<${tag}${scope}${label}${columnAttrs(col)}${attrsSuffix(extra)}>${cell ?? ''}</${tag}>`;
}

/**
 * Renders a data table from columns and rows. Column labels, cell values,
 * caption and emptyMessage are escaped text. A column may give a
 * `render(value, row)` hook whose result fills the cell instead of the
 * escaped value — an HTML slot: not escaped; escape any data you interpolate.
 *
 * A column can also say how its cells are *set*, not just what they contain:
 *
 *   - `align` ('start' | 'center' | 'end') and `numeric` emit `data-align` /
 *     `data-numeric`. `numeric` implies end alignment plus tabular lining
 *     figures; an explicit `align` wins. Both land on the `<th>` as well as on
 *     every cell, so a right-aligned money column can never end up under a
 *     left-aligned heading — the most common data-table defect.
 *   - `column.cellAttrs` appends raw attribute markup to that column's cells
 *     (a test hook, an `aria-*`). Pass a function to vary it per row.
 *
 * `labelCells` stamps `data-label="<column label>"` on every body and footer
 * cell. That is what a responsive stacked table needs: hide the `<thead>`
 * under a container query and render each cell's own heading from
 * `content: attr(data-label)`. It stays opt-in so the default markup is
 * unchanged; `<thead>` is never removed, so the accessibility tree is
 * identical at every width and the transform is purely presentational.
 *
 * `column.srLabel` gives an accessible name to a column with no visible
 * label — a row-actions column, typically. Without it the header renders as
 * a bare `<th scope="col"></th>`, which axe flags as an empty table header.
 *
 * `footer` renders a `<tfoot>`: give one row object per footer row, read with
 * the same column keys and the same `render` / `cellAttrs` hooks as the body.
 * The first cell of each footer row is a `<th scope="row">` so a totals row is
 * announced as a row heading rather than as data.
 *
 * @param {object} options
 * @param {Array<{key: string, label: string, srLabel?: string, sortable?: boolean, align?: 'start'|'center'|'end', numeric?: boolean, render?: (value: unknown, row: object) => string, cellAttrs?: string | ((value: unknown, row: object) => string)}>} options.columns
 * @param {Array<object>} options.rows
 * @param {Array<object>} [options.footer] - Footer rows (totals, subtotals)
 * @param {string} [options.emptyMessage] - Message when rows is empty
 * @param {string} [options.emptyContent] - HTML slot used instead of emptyMessage; not escaped
 * @param {string} [options.caption] - Table caption
 * @param {boolean} [options.labelCells] - Stamp `data-label` on every body and footer cell
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
    html += `<th scope="col"${sortAttr}${columnAttrs(col)}>${heading}</th>`;
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
        html += renderCell('td', col, row, { labelCells });
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
        html += i === 0
          ? renderCell('th', col, row, { labelCells, scope: ' scope="row"' })
          : renderCell('td', col, row, { labelCells });
      });
      html += `</tr>`;
    }
    html += `</tfoot>`;
  }

  html += `</table></div>`;
  return html;
}
