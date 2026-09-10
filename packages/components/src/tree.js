/**
 * Tree view — expandable hierarchical tree.
 */
import { escapeAttr, escapeText } from '@basenative/runtime/shared/escape';
import { nextId } from './ids.js';
import { attrsSuffix } from './internal/attrs.js';
import { ariaExpanded, renderNodes } from './internal/tree.js';

/**
 * Tree view — expandable hierarchical tree.
 *
 * Node labels are escaped text; a node's `icon` is an HTML slot: not escaped;
 * pass trusted markup only. Leaf nodes carry no aria-expanded attribute.
 *
 * @param {object} [options]
 * @param {Array<{id?: string, label: string, icon?: string, children?: Array<object>}>} [options.items]
 * @param {Set<string>} [options.expanded]  Node ids that are expanded
 * @param {string} [options.selected]       Selected node id
 * @param {string} [options.id]             Defaults to nextId('tree')
 * @param {string} [options.attrs]          Raw attribute markup appended to the <ul>; not escaped
 * @returns {string}
 */
export function renderTree(options = {}) {
  const {
    items = [],
    expanded = new Set(),
    selected,
    id = nextId('tree'),
    attrs = '',
  } = options;

  const itemsHtml = renderNodes(items, {
    getId: node => node.id ?? node.label,
    expanded,
    render({ node, nodeId, hasChildren, isExpanded, level, children }) {
      const isSelected = selected === nodeId;
      const icon = node.icon ?? '';

      let html = `<li data-bn="tree-item" role="treeitem"${ariaExpanded(hasChildren, isExpanded)} aria-selected="${isSelected}" data-node-id="${escapeAttr(nodeId)}" data-level="${level}">`;
      html += `<div data-bn="tree-item-content"${isSelected ? ' data-selected' : ''}>`;
      if (hasChildren) {
        html += `<button data-bn="tree-toggle" aria-label="${isExpanded ? 'Collapse' : 'Expand'}" type="button">${isExpanded ? '▾' : '▸'}</button>`;
      } else {
        html += `<span data-bn="tree-indent"></span>`;
      }
      if (icon) html += `<span data-bn="tree-icon">${icon}</span>`;
      html += `<span data-bn="tree-label">${escapeText(node.label ?? '')}</span>`;
      html += `</div>`;

      if (isExpanded) {
        html += `<ul data-bn="tree-children" role="group">${children}</ul>`;
      }

      html += `</li>`;
      return html;
    },
  });

  return `<ul data-bn="tree" id="${escapeAttr(id)}" role="tree"${attrsSuffix(attrs)}>${itemsHtml}</ul>`;
}

/**
 * TreeGrid — tree structure combined with table columns.
 *
 * Column labels and cell values are escaped text. Leaf rows carry no
 * aria-expanded attribute.
 *
 * @param {object} [options]
 * @param {Array<{key: string, label: string}>} [options.columns]
 * @param {Array<object>} [options.items]   Rows keyed by column key, with optional `id` and `children`
 * @param {Set<string>} [options.expanded]  Node ids that are expanded
 * @param {string} [options.id]             Defaults to nextId('treegrid')
 * @param {string} [options.attrs]          Raw attribute markup appended to the <table>; not escaped
 * @returns {string}
 */
export function renderTreeGrid(options = {}) {
  const {
    columns = [],
    items = [],
    expanded = new Set(),
    id = nextId('treegrid'),
    attrs = '',
  } = options;

  const headerCells = columns.map(col => `<th scope="col">${escapeText(col.label ?? '')}</th>`).join('');

  const bodyHtml = renderNodes(items, {
    getId: node => node.id ?? node[columns[0]?.key],
    expanded,
    render({ node, nodeId, hasChildren, isExpanded, level, children }) {
      const indent = '  '.repeat(level);
      const toggle = hasChildren ? (isExpanded ? '▾ ' : '▸ ') : '  ';

      const cells = columns.map((col, i) => {
        const value = escapeText(node[col.key] ?? '');
        const prefix = i === 0 ? `<span data-level="${level}">${indent}${toggle}</span>` : '';
        return `<td>${prefix}${value}</td>`;
      }).join('');

      return `<tr data-bn="treegrid-row" data-node-id="${escapeAttr(nodeId)}" aria-level="${level + 1}"${ariaExpanded(hasChildren, isExpanded)} role="row">${cells}</tr>${children}`;
    },
  });

  return `<table data-bn="treegrid" id="${escapeAttr(id)}" role="treegrid"${attrsSuffix(attrs)}>
  <thead><tr>${headerCells}</tr></thead>
  <tbody>${bodyHtml}</tbody>
</table>`;
}
