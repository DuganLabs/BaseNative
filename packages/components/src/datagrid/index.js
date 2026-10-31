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
 * Behavior ported from the legacy initDataGrid:
 * - Sort: `sortBy(column)` flips ascending / descending on the sorted
 *   column and moves aria-sort; with `onSort` the caller re-renders
 *   rows, without it the model re-sorts its own rows by the cell
 *   text of that column (numeric-aware, stable).
 * - Selection: `selectedIds` is the model's set; `toggleRow` /
 *   `toggleAll` move it and report through `onSelectionChange`;
 *   `selectAllState` ('all' | 'some' | 'none') drives the header
 *   checkbox's checked / indeterminate rendering, and rows carry
 *   aria-selected from the set.
 * - Navigation: the APG grid pattern — a roving tabindex over every
 *   cell (header row included, present in the server HTML), arrows
 *   move along rows and columns, Home / End go to the row's ends and
 *   Ctrl+Home / Ctrl+End to the grid's. Arrow keys stay with the
 *   caret inside a contenteditable cell.
 *
 * @typedef {object} DatagridColumn
 * @property {string} key
 * @property {string} label
 * @property {string} [sort] ascending | descending — sets aria-sort.
 * @property {string} [sortHtml] The rendered sort button (defaults to the label).
 *
 * @typedef {object} DatagridRow
 * @property {string[]} cells Rendered cell HTML, one per column.
 * @property {string} [id] Selection identity (defaults to the row index).
 * @property {string} [selectHtml] The rendered selection checkbox.
 *
 * @typedef {object} DatagridProps
 * @property {DatagridColumn[]} columns
 * @property {DatagridRow[]} rows
 * @property {string} [caption]
 * @property {boolean} [selectable] Renders the selection column.
 * @property {string[]} [selectedIds] The initially selected row ids.
 * @property {string} [selectAllHtml] The rendered header selection checkbox.
 * @property {(sort: { key: string, dir: 'asc' | 'desc' }) => void} [onSort]
 * @property {(ids: string[]) => void} [onSelectionChange]
 * @property {string} [variant] A registered variant name.
 */

/** @param {string} html */
function cellText(html) {
  return String(html ?? '').replace(/<[^>]*>/g, '').trim();
}

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
  const selectedIds = signal(props.selectedIds ?? []);
  const variant = signal(props.variant ?? 'datagrid');
  const hasCaption = computed(() => caption() !== '');
  /* Roving focus over the grid's cells: row 0 is the header row. */
  const focusPos = signal({ r: 0, c: 0 });

  const colOffset = computed(() => (selectable() ? 1 : 0));
  const viewColumns = computed(() => columns().map((column, i) => ({ ...column, c: i + colOffset() })));
  const viewRows = computed(() => rows().map((row, r) => ({
    ...row,
    id: row.id ?? String(r),
    r: r + 1,
    cells: row.cells.map((html, i) => ({ html, r: r + 1, c: i + colOffset() })),
  })));

  const selectAllState = computed(() => {
    const total = rows().length;
    const count = selectedIds().length;
    if (total > 0 && count === total) return 'all';
    if (count > 0) return 'some';
    return 'none';
  });

  /** @param {{ id: string }} row */
  function isRowSelected(row) {
    return selectedIds().includes(row.id) ? 'true' : 'false';
  }

  /** @param {string} id @param {boolean} checked */
  function toggleRow(id, checked) {
    const next = checked
      ? [...new Set([...selectedIds(), id])]
      : selectedIds().filter((item) => item !== id);
    selectedIds.set(next);
    props.onSelectionChange?.(next);
  }

  /** @param {boolean} checked */
  function toggleAll(checked) {
    const next = checked ? viewRows().map((row) => row.id) : [];
    selectedIds.set(next);
    props.onSelectionChange?.(next);
  }

  /** Silent reflection: move the selection without reporting. @param {string[]} ids */
  function select(ids) {
    selectedIds.set([...ids]);
  }

  /**
   * Sort by a column: ascending first, flipping on the next call.
   * @param {DatagridColumn} column
   */
  function sortBy(column) {
    const dir = column.sort === 'ascending' ? 'desc' : 'asc';
    columns.set(columns().map((item) => (item.key === column.key
      ? { ...item, sort: dir === 'asc' ? 'ascending' : 'descending' }
      : { ...item, sort: undefined })));
    if (props.onSort) {
      props.onSort({ key: column.key, dir });
      return;
    }
    const index = columns().findIndex((item) => item.key === column.key);
    const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
    const sign = dir === 'asc' ? 1 : -1;
    rows.set(rows()
      .map((row, i) => ({ row, i, text: cellText(row.cells[index]) }))
      .sort((a, b) => collator.compare(a.text, b.text) * sign || a.i - b.i)
      .map((entry) => entry.row));
  }

  /** @returns {{ key: string, dir: 'asc' | 'desc' } | null} */
  function sortState() {
    const sorted = columns().find((column) => column.sort);
    return sorted ? { key: sorted.key, dir: sorted.sort === 'ascending' ? 'asc' : 'desc' } : null;
  }

  /** @param {{ r: number, c: number }} cell */
  function cellTabIndex(cell) {
    const focus = focusPos();
    return focus.r === cell.r && focus.c === cell.c ? 0 : -1;
  }

  /** @param {DatagridColumn & { c: number }} column */
  function headerTabIndex(column) {
    const focus = focusPos();
    return focus.r === 0 && focus.c === column.c ? 0 : -1;
  }

  /* The selection column's cells sit at grid column 0. */
  function selectAllTabIndex() {
    const focus = focusPos();
    return focus.r === 0 && focus.c === 0 ? 0 : -1;
  }

  /** @param {{ r: number }} row */
  function selectionTabIndex(row) {
    const focus = focusPos();
    return focus.r === row.r && focus.c === 0 ? 0 : -1;
  }

  /**
   * APG grid keys. Coordinates come from the DOM (the event's cell and
   * its position among the table's rows), so they stay correct across
   * re-sorts and re-renders.
   * @param {KeyboardEvent} event
   */
  function onKeydown(event) {
    const cell = (event.target)?.closest?.('th, td');
    if (!cell) return;
    const table = cell.closest('table');
    if (!table) return;
    if (event.target !== cell && !event.target?.closest?.('button, input, select, textarea, a')) return;
    if (cell.hasAttribute('contenteditable') && (event.key === 'ArrowLeft' || event.key === 'ArrowRight')) return;
    const rowEls = [...table.querySelectorAll('tr')];
    const r = rowEls.indexOf(cell.parentElement);
    const cellEls = [...cell.parentElement.children].filter((el) => el.matches('th, td'));
    const c = cellEls.indexOf(cell);
    if (r < 0 || c < 0) return;
    const lastRow = rowEls.length - 1;
    const lastCol = (/** @type {number} */ row) => [...rowEls[row].children].filter((el) => el.matches('th, td')).length - 1;
    let next;
    switch (event.key) {
      case 'ArrowRight': next = { r, c: c + 1 }; break;
      case 'ArrowLeft': next = { r, c: c - 1 }; break;
      case 'ArrowDown': next = { r: r + 1, c }; break;
      case 'ArrowUp': next = { r: r - 1, c }; break;
      case 'Home': next = event.ctrlKey ? { r: 0, c: 0 } : { r, c: 0 }; break;
      case 'End': next = event.ctrlKey ? { r: lastRow, c: lastCol(lastRow) } : { r, c: lastCol(r) }; break;
      default: return;
    }
    if (next.r < 0 || next.r > lastRow || next.c < 0 || next.c > lastCol(next.r)) return;
    event.preventDefault();
    focusPos.set(next);
    const targetRow = rowEls[next.r];
    const target = [...targetRow.children].filter((el) => el.matches('th, td'))[next.c];
    target?.focus();
  }

  return {
    columns, rows, caption, selectable, selectAllHtml, selectedIds, variant, hasCaption,
    viewColumns, viewRows, selectAllState, isRowSelected, toggleRow, toggleAll, select,
    sortBy, sortState, focusPos, cellTabIndex, headerTabIndex, selectAllTabIndex, selectionTabIndex, onKeydown, raw,
  };
}

/** @param {import('../registry.js').Registry} registry */
export function registerVariants(registry) {
  registry.registerVariant('datagrid', 'datagrid');
}

export const template = new URL('./index.html', import.meta.url);
export const styles = new URL('./styles.css', import.meta.url);
export const datagrid = { name, root, create, registerVariants, template, styles };
export default datagrid;
