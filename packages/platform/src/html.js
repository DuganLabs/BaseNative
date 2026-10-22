/** Escape text for HTML element content. */
export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/** Escape a quoted attribute value. */
export function escapeAttr(value) {
  return escapeHtml(value).replace(/"/g, '&quot;');
}

/**
 * Render `data-*` / boolean attributes. `class` and `style` are rejected:
 * component output has neither.
 * @param {Record<string, string|number|boolean|null|undefined>} map
 */
export function attrs(map) {
  const parts = [];
  for (const [key, value] of Object.entries(map)) {
    if (key === 'class' || key === 'style') {
      throw new Error(
        `@basenative/platform renderers cannot set ${key}. Style with data-bn and --bn-plat-*.`,
      );
    }
    if (value == null || value === false) continue;
    if (value === true) parts.push(key);
    else parts.push(`${key}="${escapeAttr(value)}"`);
  }
  return parts.join(' ');
}
