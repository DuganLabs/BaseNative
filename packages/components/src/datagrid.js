/**
 * Data grid — sortable, filterable, paginated table with virtual scrolling support.
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
    id = `bn-datagrid-${Math.random().toString(36).slice(2)}`,
    attrs = '',
  } = options;

  const total = totalRows ?? rows.length;
  const selectedSet = new Set(selectedRows);

  const headerCells = columns.map(col => {
    const sortable = col.sortable ? ' data-sortable' : '';
    const sorted = sortBy === col.key ? ` data-sorted="${sortDir}"` : '';
    const width = col.width ? ` style="width:${col.width}"` : '';
    const resizable = col.resizable ? ' data-resizable' : '';
    return `<th data-bn="datagrid-th" data-key="${col.key}"${sortable}${sorted}${width}${resizable} scope="col">${col.label}${sortBy === col.key ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ''}</th>`;
  }).join('');

  const selectAllHeader = selectable
    ? `<th data-bn="datagrid-th-select"><input type="checkbox" aria-label="Select all" data-bn="datagrid-select-all"></th>`
    : '';

  const bodyRows = rows.map((row, i) => {
    const rowId = row.id ?? i;
    const cells = columns.map(col => {
      const value = col.render ? col.render(row[col.key], row) : (row[col.key] ?? '');
      const editable = col.editable ? ' contenteditable="true" data-editable' : '';
      return `<td data-bn="datagrid-td" data-key="${col.key}"${editable}>${value}</td>`;
    }).join('');
    const selectCell = selectable
      ? `<td data-bn="datagrid-td-select"><input type="checkbox" ${selectedSet.has(rowId) ? 'checked ' : ''}aria-label="Select row ${rowId}" data-bn="datagrid-row-select" data-row-id="${rowId}"></td>`
      : '';
    return `<tr data-bn="datagrid-row" data-row-id="${rowId}">${selectCell}${cells}</tr>`;
  }).join('');

  const emptyRow = rows.length === 0
    ? `<tr><td colspan="${columns.length + (selectable ? 1 : 0)}" data-bn="datagrid-empty">${emptyMessage}</td></tr>`
    : '';

  return `<div data-bn="datagrid" id="${id}" ${attrs}>
  <div data-bn="datagrid-scroll" role="region" aria-label="${caption || 'Data grid'}" tabindex="0">
    <table data-bn="datagrid-table" role="grid">
      ${caption ? `<caption>${caption}</caption>` : ''}
      <thead><tr>${selectAllHeader}${headerCells}</tr></thead>
      <tbody>${bodyRows || emptyRow}</tbody>
    </table>
  </div>
  <div data-bn="datagrid-footer">
    <span data-bn="datagrid-info">Showing ${Math.min((page - 1) * pageSize + 1, total)}–${Math.min(page * pageSize, total)} of ${total}</span>
  </div>
</div>`;
}
