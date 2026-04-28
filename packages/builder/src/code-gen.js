import { ROOT_ID } from './state.js';

const VOID_TAGS = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
  'link', 'meta', 'param', 'source', 'track', 'wbr',
]);

const VALID_IDENTIFIER = /^[A-Za-z_$][\w$]*$/;

export function escapeHTML(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function escapeAttr(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;');
}

export function escapeBackticks(value) {
  return String(value).replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');
}

export function isValidIdentifier(name) {
  return typeof name === 'string' && VALID_IDENTIFIER.test(name);
}

function indentLines(text, prefix) {
  return text
    .split('\n')
    .map((line) => (line.length ? prefix + line : line))
    .join('\n');
}

function collectSignals(state, palette) {
  const seen = new Map();
  for (const node of state.tree().values()) {
    const def = palette.get(node.type);
    if (!def) continue;
    for (const [, expr] of Object.entries(node.bindings || {})) {
      const name = String(expr).trim();
      if (!name || !isValidIdentifier(name)) continue;
      if (!seen.has(name)) seen.set(name, { name, initial: '' });
    }
  }
  return Array.from(seen.values());
}

function renderAttrs(node, def) {
  const out = [];
  for (const [key, value] of Object.entries(node.props || {})) {
    if (def?.textProp && key === def.textProp) continue;
    if (value === false || value === null || value === undefined) continue;
    if (value === true) {
      out.push(key);
      continue;
    }
    out.push(`${key}="${escapeAttr(value)}"`);
  }
  for (const [key, expr] of Object.entries(node.bindings || {})) {
    out.push(`${key}="{{ ${expr}() }}"`);
  }
  for (const [event, handler] of Object.entries(node.events || {})) {
    out.push(`@${event}="${escapeAttr(handler)}"`);
  }
  return out.length ? ' ' + out.join(' ') : '';
}

function renderTextContent(node, def) {
  if (def?.textProp && node.props && node.props[def.textProp] != null) {
    return escapeHTML(node.props[def.textProp]);
  }
  return '';
}

function renderNode(state, palette, id, depth) {
  const node = state.getNode(id);
  if (!node) return '';
  const def = palette.get(node.type);
  const tag = def?.tag || node.type;
  const indent = '  '.repeat(depth);
  const attrs = renderAttrs(node, def);

  if (VOID_TAGS.has(tag) || def?.selfClosing) {
    return `${indent}<${tag}${attrs}>`;
  }

  const text = renderTextContent(node, def);
  const childMarkup = (node.children || [])
    .map((childId) => renderNode(state, palette, childId, depth + 1))
    .filter(Boolean)
    .join('\n');

  if (!text && !childMarkup) {
    return `${indent}<${tag}${attrs}></${tag}>`;
  }

  if (text && !childMarkup) {
    return `${indent}<${tag}${attrs}>${text}</${tag}>`;
  }

  const inner = [];
  if (text) inner.push('  '.repeat(depth + 1) + text);
  if (childMarkup) inner.push(childMarkup);
  return `${indent}<${tag}${attrs}>\n${inner.join('\n')}\n${indent}</${tag}>`;
}

export function generateMarkup(state, palette, options = {}) {
  const root = state.getRoot();
  if (!root) return '';
  const baseDepth = options.baseDepth ?? 0;
  return renderNode(state, palette, ROOT_ID, baseDepth);
}

export function generateComponent(state, palette, options = {}) {
  const componentName = options.componentName || 'BuiltComponent';
  if (!isValidIdentifier(componentName)) {
    throw new Error(`generateComponent: invalid component name "${componentName}"`);
  }

  const signals = collectSignals(state, palette);
  const markup = generateMarkup(state, palette, { baseDepth: 2 });
  const escapedMarkup = escapeBackticks(markup);

  const signalImport = signals.length
    ? `import { signal } from '@basenative/runtime';\n\n`
    : '';

  const signalDecls = signals
    .map((s) => `  const ${s.name} = signal(${JSON.stringify(s.initial)});`)
    .join('\n');

  const body = [];
  if (signalDecls) body.push(signalDecls, '');
  body.push('  return `');
  body.push(escapedMarkup);
  body.push('  `;');

  return `${signalImport}export function ${componentName}() {\n${body.join('\n')}\n}\n`;
}

export function generateModule(state, palette, options = {}) {
  return generateComponent(state, palette, options);
}

export { renderNode as renderNodeMarkup, indentLines };
