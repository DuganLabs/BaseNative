import { effect } from '@basenative/runtime';
import { ROOT_ID } from './state.js';
import { attachNodeSource, attachDropTarget } from './dnd.js';

const VOID_TAGS = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
  'link', 'meta', 'param', 'source', 'track', 'wbr',
]);

function createElement(doc, tag, attrs = {}) {
  const el = doc.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value === false || value == null) continue;
    if (key === 'class') el.className = value;
    else el.setAttribute(key, value);
  }
  return el;
}

function applyAttrs(el, node, def) {
  for (const [key, value] of Object.entries(node.props || {})) {
    if (def?.textProp && key === def.textProp) continue;
    if (value === false || value == null) continue;
    if (value === true) {
      el.setAttribute(key, '');
      continue;
    }
    el.setAttribute(key, String(value));
  }
}

function buildPreviewNode(state, palette, doc, id) {
  const node = state.getNode(id);
  if (!node) return null;
  const def = palette.get(node.type);
  const tag = def?.tag || node.type;
  const isVoid = VOID_TAGS.has(tag) || def?.selfClosing;

  const el = doc.createElement(tag);
  applyAttrs(el, node, def);

  el.dataset.bnPreviewId = id;
  el.classList.add('bn-preview-node');
  if (state.selectedId() === id) el.classList.add('bn-selected');

  el.addEventListener('click', (event) => {
    event.stopPropagation();
    state.select(id);
  });

  if (id !== ROOT_ID) attachNodeSource(el, id);

  attachDropTarget(el, {
    onPaletteDrop({ type }) {
      const dropDef = palette.get(type);
      if (!dropDef) return;
      const targetParent = def?.container && !isVoid ? id : node.parentId || ROOT_ID;
      state.addNode({
        type,
        parentId: targetParent,
        props: dropDef.defaultProps,
      });
    },
    onNodeDrop({ nodeId }) {
      if (nodeId === id) return;
      const targetParent = def?.container && !isVoid ? id : node.parentId || ROOT_ID;
      state.moveNode(nodeId, { parentId: targetParent });
    },
  });

  if (isVoid) return el;

  if (def?.textProp && node.props[def.textProp] != null && (!node.children || !node.children.length)) {
    el.textContent = String(node.props[def.textProp]);
  }

  for (const childId of node.children || []) {
    const child = buildPreviewNode(state, palette, doc, childId);
    if (child) el.appendChild(child);
  }

  return el;
}

export function renderCanvas(state, palette, target) {
  if (!target) throw new Error('renderCanvas: target element required');
  const doc = target.ownerDocument;

  const dispose = effect(() => {
    state.tree();
    state.selectedId();

    target.replaceChildren();
    target.classList.add('bn-canvas');
    target.setAttribute('role', 'region');
    target.setAttribute('aria-label', 'Component canvas');

    const root = buildPreviewNode(state, palette, doc, ROOT_ID);
    if (root) target.appendChild(root);
  });

  return () => dispose.dispose();
}
