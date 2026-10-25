import { escapeHtml } from './escape.js';

const VOID_ELEMENTS = new Set([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'param',
  'source',
  'track',
  'wbr',
]);

function attrName(key) {
  return key.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
}

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

  // Same attribute contract as codegen.js, so the canvas preview is styled by
  // the same rules as the exported markup. Catalog components address their
  // root by variant, never data-bn; the legacy kit defs still stamp data-bn.
  if (def?.catalog && def?.variant) {
    el.setAttribute('variant', def.variant);
  }
  if (def?.bn && node.props['data-bn'] == null) {
    el.setAttribute('data-bn', def.bn);
  }

  const skipAttrs = new Set(
    (def?.props || []).filter((p) => p.attr === false).map((p) => p.name),
  );
  for (const key of Object.keys(node.props)) {
    if (key === 'text' || key === 'level') continue;
    if (skipAttrs.has(key)) continue;
    const value = node.props[key];
    if (value === false || value == null) continue;
    const name = def?.dataProps?.includes(key) ? `data-${attrName(key)}` : key;
    if (value === true) el.setAttribute(name, '');
    else el.setAttribute(name, String(value));
  }

  if (node.bindings && node.bindings.text) {
    el.textContent = `{{ ${node.bindings.text.expr || `${node.bindings.text.ref}()`} }}`;
  } else if (!isVoid && node.children && node.children.length > 0) {
    for (const child of node.children) {
      el.appendChild(renderNodeToElement(doc, child, palette));
    }
  } else if (typeof def?.preview === 'function') {
    el.innerHTML = def.preview(node.props || {});
  } else if (typeof node.props.text === 'string' && !isVoid) {
    el.textContent = node.props.text;
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
