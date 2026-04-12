/**
 * renderLayoutGrid - A drag-and-drop CSS grid layout component.
 * Designed to hook into @basenative/visual-builder's canvas state.
 *
 * @param {object} options
 * @param {number} [options.columns=12] - Grid columns
 * @param {number} [options.gap='1rem'] - Gap between cells
 * @param {string} [options.minCellHeight='4rem'] - Minimum cell height
 * @param {Array<{id: string, label?: string, content?: string, colSpan?: number, rowSpan?: number}>} [options.cells] - Grid cells
 * @param {string} [options.id] - Unique ID for the grid
 * @param {boolean} [options.editable=false] - Whether cells are draggable/resizable
 * @returns {string} HTML string
 */
export function renderLayoutGrid(options = {}) {
  const {
    columns = 12,
    gap = '1rem',
    minCellHeight = '4rem',
    cells = [],
    id = 'layout-grid',
    editable = false,
  } = options;

  const cellsHtml = cells.map((cell, i) => {
    const span = cell.colSpan || 1;
    const rowSpan = cell.rowSpan || 1;
    const style = `grid-column: span ${span}; grid-row: span ${rowSpan}; min-height: ${minCellHeight}`;
    const draggable = editable ? ' draggable="true"' : '';
    const content = cell.content || cell.label || `Cell ${i + 1}`;
    return `<div data-bn="layout-cell" data-cell-id="${esc(cell.id || `cell-${i}`)}" style="${style}"${draggable}>${content}</div>`;
  }).join('\n');

  return `<div data-bn="layout-grid" id="${esc(id)}" style="display:grid;grid-template-columns:repeat(${columns},1fr);gap:${gap}">
${cellsHtml}
</div>`;
}

/**
 * CSS for layout grid components.
 * @returns {string}
 */
export function layoutGridStyles() {
  return `
[data-bn="layout-grid"] {
  min-height: 8rem;
  border: 1px dashed var(--border, hsl(220 15% 22%));
  border-radius: var(--radius-lg, 0.75rem);
  padding: 0.5rem;
}
[data-bn="layout-cell"] {
  background: var(--surface-2, hsl(220 15% 14%));
  border: 1px solid var(--border, hsl(220 15% 22%));
  border-radius: var(--radius-md, 0.5rem);
  padding: 0.75rem;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.875rem;
  color: var(--text-secondary, hsl(220 10% 55%));
  transition: border-color 150ms ease, box-shadow 150ms ease;
}
[data-bn="layout-cell"]:hover {
  border-color: var(--accent, hsl(210 100% 60%));
}
[data-bn="layout-cell"][draggable="true"] {
  cursor: grab;
}
[data-bn="layout-cell"][draggable="true"]:active {
  cursor: grabbing;
  opacity: 0.7;
}
[data-bn="layout-cell"].drop-target {
  border-color: var(--accent, hsl(210 100% 60%));
  box-shadow: inset 0 0 0 2px var(--accent, hsl(210 100% 60%));
}`;
}

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
