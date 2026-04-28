export function escapeHtml(value) {
  const s = value == null ? '' : String(value);
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function escapeAttr(value) {
  return escapeHtml(value);
}

const JS_IDENT = /^[A-Za-z_$][A-Za-z0-9_$]*$/;

export function isValidIdentifier(name) {
  return typeof name === 'string' && JS_IDENT.test(name);
}
