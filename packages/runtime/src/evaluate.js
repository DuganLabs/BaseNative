import { evaluateExpression } from './shared/expression.js';
import { raw, isRaw, unwrapRaw, escapeText } from './shared/escape.js';

export function evaluate(expr, ctx, options) {
  return evaluateExpression(expr, ctx, options);
}

/**
 * Substitute every `{{ }}` in `text`.
 *
 * Returns a plain string in the ordinary case, which callers assign to
 * `textContent` — inherently safe, since textContent never parses HTML.
 *
 * If any substitution is a raw() value the result is raw-marked instead, and the
 * caller assigns it to innerHTML to match what the server emitted. In that case the
 * literal template text and every non-raw substitution are escaped, so opting one
 * value into raw does not silently make its neighbours raw too.
 */
export function interpolate(text, ctx, options) {
  const parts = [];
  let sawRaw = false;
  let last = 0;
  const re = /\{\{\s*(.+?)\s*\}\}/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    parts.push({ literal: text.slice(last, m.index) });
    const val = evaluate(m[1], ctx, options);
    if (isRaw(val)) sawRaw = true;
    parts.push({ value: val });
    last = m.index + m[0].length;
  }
  parts.push({ literal: text.slice(last) });

  if (!sawRaw) {
    return parts
      .map((p) => ('literal' in p ? p.literal : p.value != null ? String(p.value) : ''))
      .join('');
  }

  return raw(
    parts
      .map((p) => {
        if ('literal' in p) return escapeText(p.literal);
        if (p.value == null) return '';
        return isRaw(p.value) ? unwrapRaw(p.value) : escapeText(p.value);
      })
      .join('')
  );
}
