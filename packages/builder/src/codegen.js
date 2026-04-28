import { escapeHtml, escapeAttr, isValidIdentifier } from './escape.js';

const VOID_ELEMENTS = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr',
]);

const ATTR_PROPS = new Set([
  'class', 'id', 'name', 'href', 'src', 'alt', 'placeholder', 'action', 'method', 'target',
  'aria-label', 'aria-labelledby', 'aria-describedby', 'role', 'rows', 'cols', 'width', 'height',
  'min', 'max', 'step', 'maxlength', 'minlength', 'pattern', 'autocomplete', 'for',
]);

const BOOL_ATTRS = new Set(['disabled', 'required', 'readonly', 'checked', 'selected', 'multiple', 'autofocus', 'hidden']);

function attrName(key) {
  return key.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
}

function renderAttr(key, value) {
  if (value === false || value == null) return '';
  if (value === true) return ` ${attrName(key)}`;
  return ` ${attrName(key)}="${escapeAttr(value)}"`;
}

function renderBoundAttr(key, binding) {
  if (!isValidIdentifier(binding.ref)) {
    throw new Error(`Invalid signal ref "${binding.ref}" — must be a JavaScript identifier`);
  }
  const expr = binding.expr || `${binding.ref}()`;
  return ` :${attrName(key)}="${escapeAttr(expr)}"`;
}

function defaultTagFor(node, def) {
  if (node.type === 'heading' && typeof node.props.level === 'string') return node.props.level;
  if (def?.tag) return def.tag;
  return node.type;
}

function renderText(node) {
  if (node.bindings && node.bindings.text) {
    const b = node.bindings.text;
    if (!isValidIdentifier(b.ref)) {
      throw new Error(`Invalid signal ref "${b.ref}"`);
    }
    return `{{ ${b.expr || `${b.ref}()`} }}`;
  }
  if (typeof node.props.text === 'string') return escapeHtml(node.props.text);
  return '';
}

function renderNode(node, palette, depth, indent) {
  const def = palette ? palette.get(node.type) : null;
  const tag = defaultTagFor(node, def);
  const isVoid = VOID_ELEMENTS.has(tag);
  const isContainer = def ? def.container : !isVoid;
  const pad = indent.repeat(depth);

  let attrs = '';

  if (def && def.role && !node.props.role) {
    attrs += renderAttr('role', def.role);
  }

  for (const key of Object.keys(node.props)) {
    if (key === 'text' || key === 'children' || key === 'level') continue;
    if (node.bindings && node.bindings[key]) continue;
    const value = node.props[key];
    if (BOOL_ATTRS.has(key)) {
      if (value) attrs += ` ${attrName(key)}`;
    } else if (ATTR_PROPS.has(key) || /^data-/.test(key)) {
      attrs += renderAttr(key, value);
    } else if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      attrs += renderAttr(key, value);
    }
  }

  if (node.bindings) {
    for (const key of Object.keys(node.bindings)) {
      if (key === 'text' || key === 'value' || key === 'checked') continue;
      attrs += renderBoundAttr(key, node.bindings[key]);
    }
  }

  if (node.bindings?.value && (tag === 'input' || tag === 'textarea' || tag === 'select')) {
    const b = node.bindings.value;
    if (!isValidIdentifier(b.ref)) throw new Error(`Invalid signal ref "${b.ref}"`);
    attrs += ` @bind="${escapeAttr(b.ref)}"`;
  }

  if (node.bindings?.checked && tag === 'input') {
    const b = node.bindings.checked;
    if (!isValidIdentifier(b.ref)) throw new Error(`Invalid signal ref "${b.ref}"`);
    attrs += ` @bind="${escapeAttr(b.ref)}"`;
  }

  if (isVoid) {
    return `${pad}<${tag}${attrs} />`;
  }

  const open = `<${tag}${attrs}>`;
  const close = `</${tag}>`;

  if (node.children && node.children.length > 0) {
    const childLines = node.children.map((c) => renderNode(c, palette, depth + 1, indent));
    return `${pad}${open}\n${childLines.join('\n')}\n${pad}${close}`;
  }

  if (!isContainer || node.props.text != null || node.bindings?.text) {
    const text = renderText(node);
    if (text) return `${pad}${open}${text}${close}`;
  }

  if (node.type === 'label' && typeof node.props.text === 'string') {
    return `${pad}${open}${escapeHtml(node.props.text)}${close}`;
  }

  return `${pad}${open}${close}`;
}

function renderSignalDeclarations(signals, indent) {
  if (!signals || Object.keys(signals).length === 0) return '';
  const lines = ['<script type="module">', `${indent}import { signal } from '@basenative/runtime';`, ''];
  for (const name of Object.keys(signals)) {
    if (!isValidIdentifier(name)) {
      throw new Error(`Invalid signal name "${name}"`);
    }
    const value = signals[name];
    lines.push(`${indent}const ${name} = signal(${JSON.stringify(value)});`);
  }
  lines.push('</script>');
  return lines.join('\n') + '\n';
}

export function generateBaseNative(state, options = {}) {
  const { indent = '  ', document: asDocument = false, title = 'BaseNative Page', signals, palette } = options;
  const tree = state.tree.peek ? state.tree.peek() : state.tree();

  const body = tree.map((node) => renderNode(node, palette || null, 0, indent)).join('\n');
  const script = renderSignalDeclarations(signals, indent);

  if (!asDocument) {
    return script ? `${script}${body}` : body;
  }

  return [
    '<!DOCTYPE html>',
    '<html lang="en">',
    '<head>',
    `${indent}<meta charset="UTF-8">`,
    `${indent}<meta name="viewport" content="width=device-width, initial-scale=1.0">`,
    `${indent}<title>${escapeHtml(title)}</title>`,
    '</head>',
    '<body>',
    script ? script.trimEnd() : '',
    body,
    '</body>',
    '</html>',
  ].filter(Boolean).join('\n');
}
