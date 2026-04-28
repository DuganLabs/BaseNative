import { escapeHtml } from './escape.js';

function renderRow(node, depth, selectedId, hoverId) {
  const selected = node.id === selectedId;
  const hovered = node.id === hoverId;
  const classes = ['bn-tree__row'];
  if (selected) classes.push('bn-tree__row--selected');
  if (hovered) classes.push('bn-tree__row--hover');

  const indent = '  '.repeat(depth);
  const summary = node.props && typeof node.props.text === 'string' ? ` — ${escapeHtml(node.props.text)}` : '';
  const ariaSelected = selected ? ' aria-selected="true"' : '';
  const expanded = node.children && node.children.length > 0 ? ' aria-expanded="true"' : '';

  return `${indent}<li role="treeitem"${ariaSelected}${expanded} data-bn-tree-id="${escapeHtml(node.id)}" class="${classes.join(' ')}">`
    + `<button type="button" data-bn-tree-select="${escapeHtml(node.id)}" class="bn-tree__label">`
    + `<span class="bn-tree__type">${escapeHtml(node.type)}</span>`
    + `<span class="bn-tree__summary">${summary}</span>`
    + `</button>`;
}

function renderChildren(children, depth, selectedId, hoverId) {
  if (!children || children.length === 0) return '';
  const indent = '  '.repeat(depth);
  const inner = children.map((c) => renderSubtree(c, depth + 1, selectedId, hoverId)).join('\n');
  return `\n${indent}<ul role="group" class="bn-tree__children">\n${inner}\n${indent}</ul>`;
}

function renderSubtree(node, depth, selectedId, hoverId) {
  const indent = '  '.repeat(depth);
  return `${renderRow(node, depth, selectedId, hoverId)}${renderChildren(node.children, depth, selectedId, hoverId)}\n${indent}</li>`;
}

export function renderTreeView(state) {
  const tree = state.tree.peek ? state.tree.peek() : state.tree();
  const selectedId = state.selection.peek ? state.selection.peek() : state.selection();
  const hoverId = state.hover.peek ? state.hover.peek() : state.hover();

  if (!tree.length) {
    return '<div class="bn-tree bn-tree--empty" role="tree" aria-label="Component tree">'
      + '<p class="bn-tree__empty">No components yet. Drag from the palette.</p>'
      + '</div>';
  }

  const items = tree.map((root) => renderSubtree(root, 1, selectedId, hoverId)).join('\n');
  return `<ul role="tree" aria-label="Component tree" class="bn-tree">\n${items}\n</ul>`;
}
