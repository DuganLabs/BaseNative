import { escapeHtml } from './escape.js';

const VOID_ELEMENTS = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr',
]);

function tagFor(node, def) {
  if (node.type === 'heading' && typeof node.props.level === 'string') return node.props.level;
  if (def?.tag) return def.tag;
  return node.type;
}

export function renderNodeToElement(doc, node, palette) {
  const def = palette.get(node.type);
  const tag = tagFor(node, def);
  const isVoid = VOID_ELEMENTS.has(tag);

  const el = doc.createElement(tag);
  el.dataset.bnNode = node.id;
  el.dataset.bnType = node.type;

  if (def?.role && !node.props.role) {
    el.setAttribute('role', def.role);
  }

  for (const key of Object.keys(node.props)) {
    if (key === 'text' || key === 'level') continue;
    const value = node.props[key];
    if (value === false || value == null) continue;
    if (value === true) el.setAttribute(key, '');
    else el.setAttribute(key, String(value));
  }

  if (typeof node.props.text === 'string' && (!node.children || node.children.length === 0) && !isVoid) {
    el.textContent = node.props.text;
  }

  if (node.bindings && node.bindings.text) {
    el.textContent = `{{ ${node.bindings.text.expr || `${node.bindings.text.ref}()`} }}`;
  }

  if (!isVoid && node.children && node.children.length > 0) {
    el.textContent = '';
    for (const child of node.children) {
      const childEl = renderNodeToElement(doc, child, palette);
      el.appendChild(childEl);
    }
  }

  return el;
}

export function renderEmptyPlaceholder(doc, message) {
  const el = doc.createElement('div');
  el.className = 'bn-builder__empty';
  el.setAttribute('role', 'note');
  el.innerHTML = `<p>${escapeHtml(message)}</p>`;
  return el;
}
