/**
 * Append caller-supplied raw attribute markup to a tag.
 *
 * Returns ' ' + attrs when attrs is non-empty, otherwise '' — so call sites can
 * write `<div${attrsSuffix(attrs)}>` without leaking a stray trailing space.
 * `attrs` is a markup composition point and is inserted verbatim: pass trusted
 * attribute markup only.
 *
 * @param {string} [attrs]
 * @returns {string}
 */
export function attrsSuffix(attrs) {
  return attrs ? ' ' + attrs : '';
}
