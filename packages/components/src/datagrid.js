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
 * reachable and activatable by keyboard with no client-side JavaScript.
 * Pair with `initDataGrid()` on the client: it turns that button's `click`
 * into a sort, keeps the select-all checkbox in step with the row
 * checkboxes, and adds arrow-key navigation between cells. Without it the
 * markup is a static table, same as `data-sortable` on Table.
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

const TH = '[data-bn="datagrid-th"]';
const TH_BUTTON = '[data-bn="datagrid-th-button"]';
const TD = '[data-bn="datagrid-td"]';
const ROW = '[data-bn="datagrid-row"]';
const SELECT_ALL = '[data-bn="datagrid-select-all"]';
const ROW_SELECT = '[data-bn="datagrid-row-select"]';
const CELL = '[data-bn="datagrid-th-select"], [data-bn="datagrid-th"], [data-bn="datagrid-td-select"], [data-bn="datagrid-td"]';

function closestFrom(target, selector) {
  return target && typeof target.closest === 'function' ? target.closest(selector) : null;
}

function isCell(el) {
  return Boolean(el) && typeof el.matches === 'function' && el.matches(CELL);
}

function stripArrow(text) {
  return String(text ?? '').replace(/\s*[↑↓]\s*$/, '');
}

/**
 * Client-side: wire a rendered `[data-bn="datagrid"]` wrapper.
 *
 * Sorting — a click on a sortable header's button sorts by that column,
 * ascending first and flipping on the next click: `data-sorted` and
 * `aria-sort` move to that `<th>` (the others lose theirs) and the header
 * text's ↑/↓ follows. With `onSort`, the rows themselves are the caller's
 * job — it receives `{ key, dir }` and re-renders or re-fetches, which is the
 * only correct answer when the grid is paged. Without `onSort`, the rows in
 * the DOM are reordered in place by the cell text of that column, numeric-
 * aware and stable.
 *
 * Selection — the select-all checkbox checks or clears every row checkbox;
 * the row checkboxes keep select-all `checked` when all rows are selected,
 * `indeterminate` when some are, and clear when none are. Every change
 * calls `onSelectionChange(ids)` with the selected `data-row-id`s, and the
 * selected `<tr>`s carry `aria-selected="true"`. The select-all state is
 * reconciled from the rows on init, so a server-rendered partial selection
 * shows as indeterminate.
 *
 * Navigation — every cell gets a roving `tabindex` (0 on the first header
 * cell, -1 elsewhere); ArrowLeft / ArrowRight move along the row, ArrowUp /
 * ArrowDown move along the column, Home / End go to the row's first / last
 * cell and Ctrl+Home / Ctrl+End to the grid's. Arrow keys are left alone
 * inside a `contenteditable` cell (Left / Right) so the caret still moves.
 *
 * Headers, rows and checkboxes are re-queried on every interaction, so rows
 * swapped in after init are picked up. `sort(key, dir)` and `select(ids)`
 * reflect state silently (no callbacks) so a route can stay the source of
 * truth.
 *
 * @param {HTMLElement} wrapper  The [data-bn="datagrid"] element
 * @param {object} [options]
 * @param {(sort: { key: string, dir: 'asc'|'desc' }) => void} [options.onSort]
 * @param {(ids: string[]) => void} [options.onSelectionChange]
 * @returns {{ sort(key: string, dir?: 'asc'|'desc'): boolean, sortState(): { key: string, dir: 'asc'|'desc' } | null, select(ids: Array<string|number>): void, selected(): string[], destroy(): void }}
 */
export function initDataGrid(wrapper, options = {}) {
  const { onSort, onSelectionChange } = options;
  const all = selector => Array.from(wrapper.querySelectorAll(selector));
  const rowBoxes = () => all(ROW_SELECT);

  function sortState() {
    const th = wrapper.querySelector(`${TH}[data-sorted]`);
    return th ? { key: th.getAttribute('data-key'), dir: th.getAttribute('data-sorted') } : null;
  }

  function applySort(th, dir) {
    for (const other of all(TH)) {
      const button = other.querySelector(TH_BUTTON);
      if (other === th) {
        other.setAttribute('data-sorted', dir);
        other.setAttribute('aria-sort', dir === 'asc' ? 'ascending' : 'descending');
        if (button) button.textContent = `${stripArrow(button.textContent)} ${dir === 'asc' ? '↑' : '↓'}`;
      } else {
        other.removeAttribute('data-sorted');
        other.removeAttribute('aria-sort');
        if (button) button.textContent = stripArrow(button.textContent);
      }
    }
  }

  function sortRows(key, dir) {
    const rows = all(ROW);
    const tbody = rows[0]?.parentElement;
    if (!tbody) return;
    const text = row => {
      const cell = Array.from(row.querySelectorAll(TD)).find(td => td.getAttribute('data-key') === key);
      return String(cell?.textContent ?? '').trim();
    };
    const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
    const sign = dir === 'asc' ? 1 : -1;
    const sorted = rows
      .map((row, i) => ({ row, i, text: text(row) }))
      .sort((a, b) => collator.compare(a.text, b.text) * sign || a.i - b.i);
    for (const { row } of sorted) tbody.appendChild(row);
  }

  function sort(key, dir = 'asc', notify = false) {
    const th = all(TH).find(t => t.getAttribute('data-key') === key);
    if (!th) return false;
    applySort(th, dir);
    if (notify && onSort) onSort({ key, dir });
    else if (!onSort) sortRows(key, dir);
    return true;
  }

  function selected() {
    return rowBoxes().filter(box => box.checked).map(box => box.getAttribute('data-row-id'));
  }

  function reflectSelection() {
    const boxes = rowBoxes();
    const count = boxes.filter(box => box.checked).length;
    const master = wrapper.querySelector(SELECT_ALL);
    if (master) {
      master.checked = count > 0 && count === boxes.length;
      master.indeterminate = count > 0 && count < boxes.length;
    }
    for (const box of boxes) {
      const row = closestFrom(box, ROW);
      if (row) row.setAttribute('aria-selected', box.checked ? 'true' : 'false');
    }
  }

  function onClick(e) {
    const button = closestFrom(e.target, TH_BUTTON);
    const th = button ? closestFrom(button, TH) : null;
    if (!th) return;
    sort(th.getAttribute('data-key'), th.getAttribute('data-sorted') === 'asc' ? 'desc' : 'asc', true);
  }

  function onChange(e) {
    const master = closestFrom(e.target, SELECT_ALL);
    if (master) {
      for (const box of rowBoxes()) box.checked = Boolean(master.checked);
    } else if (!closestFrom(e.target, ROW_SELECT)) {
      return;
    }
    reflectSelection();
    if (onSelectionChange) onSelectionChange(selected());
  }

  const rows = () => all('tr').filter(row => Array.from(row.children ?? []).some(isCell));
  const cellsOf = row => Array.from(row.children ?? []).filter(isCell);
  const cellAt = (row, index) => (row ? cellsOf(row)[Math.min(index, cellsOf(row).length - 1)] : undefined);

  function focusCell(cell) {
    for (const row of rows()) for (const c of cellsOf(row)) c.setAttribute('tabindex', c === cell ? '0' : '-1');
    if (typeof cell.focus === 'function') cell.focus();
  }

  function onKeydown(e) {
    const cell = closestFrom(e.target, CELL);
    if (!cell) return;
    const ownControl = closestFrom(e.target, TH_BUTTON) || closestFrom(e.target, SELECT_ALL) || closestFrom(e.target, ROW_SELECT);
    if (e.target !== cell && !ownControl) return;
    const editing = cell.hasAttribute('contenteditable') && (e.key === 'ArrowLeft' || e.key === 'ArrowRight');
    if (editing) return;
    const row = cell.parentElement;
    const list = rows();
    const rowCells = cellsOf(row);
    const r = list.indexOf(row);
    const c = rowCells.indexOf(cell);
    if (r < 0 || c < 0) return;
    let next;
    switch (e.key) {
      case 'ArrowRight': next = rowCells[c + 1]; break;
      case 'ArrowLeft': next = rowCells[c - 1]; break;
      case 'ArrowDown': next = cellAt(list[r + 1], c); break;
      case 'ArrowUp': next = cellAt(list[r - 1], c); break;
      case 'Home': next = e.ctrlKey ? cellAt(list[0], 0) : rowCells[0]; break;
      case 'End': {
        const lastRow = list[list.length - 1];
        next = e.ctrlKey ? cellsOf(lastRow)[cellsOf(lastRow).length - 1] : rowCells[rowCells.length - 1];
        break;
      }
      default: return;
    }
    e.preventDefault();
    if (next) focusCell(next);
  }

  const first = cellAt(rows()[0], 0);
  if (first) for (const row of rows()) for (const c of cellsOf(row)) c.setAttribute('tabindex', c === first ? '0' : '-1');
  reflectSelection();

  wrapper.addEventListener('click', onClick);
  wrapper.addEventListener('change', onChange);
  wrapper.addEventListener('keydown', onKeydown);

  return {
    sort: (key, dir = 'asc') => sort(key, dir),
    sortState,
    select(ids) {
      const wanted = new Set(ids.map(String));
      for (const box of rowBoxes()) box.checked = wanted.has(box.getAttribute('data-row-id'));
      reflectSelection();
    },
    selected,
    destroy() {
      wrapper.removeEventListener('click', onClick);
      wrapper.removeEventListener('change', onChange);
      wrapper.removeEventListener('keydown', onKeydown);
    },
  };
}
