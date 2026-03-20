/**
 * Tree view — expandable hierarchical tree.
 */
export function renderTree(options = {}) {
  const {
    items = [],
    expanded = new Set(),
    selected,
    id = `bn-tree-${Math.random().toString(36).slice(2)}`,
    attrs = '',
  } = options;

  function renderNode(node, level = 0) {
    const nodeId = node.id ?? node.label;
    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = expanded.has(nodeId);
    const isSelected = selected === nodeId;
    const icon = node.icon ?? '';

    let html = `<li data-bn="tree-item" role="treeitem" aria-expanded="${hasChildren ? isExpanded : undefined}" aria-selected="${isSelected}" data-node-id="${nodeId}" data-level="${level}">`;
    html += `<div data-bn="tree-item-content"${isSelected ? ' data-selected' : ''}>`;
    if (hasChildren) {
      html += `<button data-bn="tree-toggle" aria-label="${isExpanded ? 'Collapse' : 'Expand'}" type="button">${isExpanded ? '▾' : '▸'}</button>`;
    } else {
      html += `<span data-bn="tree-indent"></span>`;
    }
    if (icon) html += `<span data-bn="tree-icon">${icon}</span>`;
    html += `<span data-bn="tree-label">${node.label}</span>`;
    html += `</div>`;

    if (hasChildren && isExpanded) {
      html += `<ul data-bn="tree-children" role="group">`;
      for (const child of node.children) {
        html += renderNode(child, level + 1);
      }
      html += `</ul>`;
    }

    html += `</li>`;
    return html;
  }

  const itemsHtml = items.map(item => renderNode(item)).join('');

  return `<ul data-bn="tree" id="${id}" role="tree" ${attrs}>${itemsHtml}</ul>`;
}

/**
 * TreeGrid — tree structure combined with table columns.
 */
export function renderTreeGrid(options = {}) {
  const {
    columns = [],
    items = [],
    expanded = new Set(),
    id = `bn-treegrid-${Math.random().toString(36).slice(2)}`,
    attrs = '',
  } = options;

  const headerCells = columns.map(col => `<th scope="col">${col.label}</th>`).join('');

  function renderRow(node, level = 0) {
    const nodeId = node.id ?? node[columns[0]?.key];
    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = expanded.has(nodeId);

    const indent = '  '.repeat(level);
    const toggle = hasChildren ? (isExpanded ? '▾ ' : '▸ ') : '  ';

    const cells = columns.map((col, i) => {
      const value = node[col.key] ?? '';
      const prefix = i === 0 ? `<span data-level="${level}">${indent}${toggle}</span>` : '';
      return `<td>${prefix}${value}</td>`;
    }).join('');

    let html = `<tr data-bn="treegrid-row" data-node-id="${nodeId}" aria-level="${level + 1}" aria-expanded="${hasChildren ? isExpanded : undefined}" role="row">${cells}</tr>`;

    if (hasChildren && isExpanded) {
      for (const child of node.children) {
        html += renderRow(child, level + 1);
      }
    }

    return html;
  }

  const bodyHtml = items.map(item => renderRow(item)).join('');

  return `<table data-bn="treegrid" id="${id}" role="treegrid" ${attrs}>
  <thead><tr>${headerCells}</tr></thead>
  <tbody>${bodyHtml}</tbody>
</table>`;
}
