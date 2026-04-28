import { effect } from '@basenative/runtime';
import { ROOT_ID } from './state.js';
import { attachNodeSource, attachDropTarget } from './dnd.js';

function createElement(doc, tag, attrs = {}, text) {
  const el = doc.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value === false || value == null) continue;
    if (key === 'class') el.className = value;
    else if (key.startsWith('data-')) el.setAttribute(key, value);
    else if (key === 'role' || key === 'aria-label' || key === 'tabindex') el.setAttribute(key, value);
    else el.setAttribute(key, value);
  }
  if (text != null) el.textContent = text;
  return el;
}

function buildItem(state, palette, doc, id, depth) {
  const node = state.getNode(id);
  if (!node) return null;
  const def = palette.get(node.type);
  const item = createElement(doc, 'li', {
    role: 'treeitem',
    'data-bn-tree-id': id,
    'aria-level': String(depth + 1),
    class: state.selectedId() === id ? 'bn-tree-item bn-selected' : 'bn-tree-item',
  });

  const row = createElement(doc, 'div', { class: 'bn-tree-row' });

  const label = def?.label || node.type;
  const button = createElement(doc, 'button', {
    type: 'button',
    class: 'bn-tree-label',
    'aria-selected': state.selectedId() === id ? 'true' : 'false',
  }, `${label}`);
  button.addEventListener('click', () => state.select(id));
  row.appendChild(button);

  if (id !== ROOT_ID) {
    const remove = createElement(doc, 'button', {
      type: 'button',
      class: 'bn-tree-remove',
      'aria-label': `Remove ${label}`,
    }, '×');
    remove.addEventListener('click', (event) => {
      event.stopPropagation();
      state.removeNode(id);
    });
    row.appendChild(remove);
    attachNodeSource(item, id);
  }

  attachDropTarget(item, {
    onPaletteDrop({ type }) {
      const def = palette.get(type);
      if (!def) return;
      state.addNode({ type, parentId: id, props: def.defaultProps });
    },
    onNodeDrop({ nodeId }) {
      if (nodeId === id) return;
      state.moveNode(nodeId, { parentId: id });
    },
  });

  item.appendChild(row);

  if (node.children && node.children.length) {
    const childList = createElement(doc, 'ul', { role: 'group', class: 'bn-tree-children' });
    for (const childId of node.children) {
      const child = buildItem(state, palette, doc, childId, depth + 1);
      if (child) childList.appendChild(child);
    }
    item.appendChild(childList);
  }

  return item;
}

export function renderTreeView(state, palette, target) {
  if (!target) throw new Error('renderTreeView: target element required');
  const doc = target.ownerDocument;

  const dispose = effect(() => {
    state.tree();
    state.selectedId();

    target.replaceChildren();
    target.setAttribute('role', 'tree');
    target.classList.add('bn-tree');
    const list = createElement(doc, 'ul', { role: 'group', class: 'bn-tree-root' });
    const root = buildItem(state, palette, doc, ROOT_ID, 0);
    if (root) list.appendChild(root);
    target.appendChild(list);
  });

  return () => dispose.dispose();
}
