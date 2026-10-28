import { escapeHtml } from './escape.js';

const CHEVRON =
  '<svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">'
  + '<path d="M6 3.5 10.5 8 6 12.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>'
  + '</svg>';

const NO_COLLAPSED = new Set();

function renderRow(node, depth, selectedId, hoverId, collapsed) {
  const selected = node.id === selectedId;
  const hovered = node.id === hoverId;
  const hasChildren = !!(node.children && node.children.length);
  const isCollapsed = hasChildren && collapsed.has(node.id);
  const classes = ['bn-tree__row'];
  if (selected) classes.push('bn-tree__row--selected');
  if (hovered) classes.push('bn-tree__row--hover');
  if (isCollapsed) classes.push('bn-tree__row--collapsed');

  const indent = '  '.repeat(depth);
  const summary = node.props && typeof node.props.text === 'string' ? ` — ${escapeHtml(node.props.text)}` : '';
  const ariaSelected = selected ? ' aria-selected="true"' : '';
  const expanded = hasChildren ? ` aria-expanded="${isCollapsed ? 'false' : 'true'}"` : '';

  // Parents carry a disclosure toggle; leaves carry a same-size spacer
  // so every label starts at the same inline offset.
  const toggle = hasChildren
    ? `<button type="button" data-bn="bn-tree-toggle" data-bn-tree-toggle="${escapeHtml(node.id)}" class="bn-tree__toggle" aria-label="${isCollapsed ? 'Expand' : 'Collapse'} ${escapeHtml(node.type)}">${CHEVRON}</button>`
    : '<span class="bn-tree__toggle" aria-hidden="true"></span>';

  return `${indent}<li role="treeitem"${ariaSelected}${expanded} data-bn-tree-id="${escapeHtml(node.id)}" class="${classes.join(' ')}">`
    + toggle
    + `<button type="button" data-bn="bn-tree-label" data-bn-tree-select="${escapeHtml(node.id)}" class="bn-tree__label">`
    + `<span class="bn-tree__type">${escapeHtml(node.type)}</span>`
    + `<span class="bn-tree__summary">${summary}</span>`
    + `</button>`;
}

function renderChildren(node, depth, selectedId, hoverId, collapsed) {
  const children = node.children;
  if (!children || children.length === 0) return '';
  if (collapsed.has(node.id)) return '';
  const indent = '  '.repeat(depth);
  const inner = children.map((c) => renderSubtree(c, depth + 1, selectedId, hoverId, collapsed)).join('\n');
  return `\n${indent}<ul role="group" class="bn-tree__children">\n${inner}\n${indent}</ul>`;
}

function renderSubtree(node, depth, selectedId, hoverId, collapsed) {
  const indent = '  '.repeat(depth);
  return `${renderRow(node, depth, selectedId, hoverId, collapsed)}${renderChildren(node, depth, selectedId, hoverId, collapsed)}\n${indent}</li>`;
}

export function renderTreeView(state, options = {}) {
  const tree = state.tree.peek ? state.tree.peek() : state.tree();
  const selectedId = state.selection.peek ? state.selection.peek() : state.selection();
  const hoverId = state.hover.peek ? state.hover.peek() : state.hover();
  const collapsed = options.collapsed instanceof Set ? options.collapsed : NO_COLLAPSED;

  if (!tree.length) {
    return '<div class="bn-tree bn-tree--empty" tabindex="0">'
      + '<p class="bn-tree__empty">Nothing on the canvas yet. Add a component and it will show up here.</p>'
      + '</div>';
  }

  const items = tree.map((root) => renderSubtree(root, 1, selectedId, hoverId, collapsed)).join('\n');
  return `<ul role="tree" aria-label="Component tree" class="bn-tree">\n${items}\n</ul>`;
}
