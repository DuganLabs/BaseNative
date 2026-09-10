/**
 * Avatar — user avatar with image, initials, or icon fallback.
 */
import { escapeAttr, escapeText } from '@basenative/runtime/shared/escape';
import { attrsSuffix } from './internal/attrs.js';

/**
 * Avatar — user avatar with image, initials, or icon fallback.
 *
 * With `src` the <img alt> carries the accessible name and the wrapper has no
 * role, so screen readers announce it once. Without `src` the wrapper is
 * role="img" with an aria-label and shows escaped initials.
 *
 * @param {object} [options]
 * @param {string} [options.src]
 * @param {string} [options.alt]
 * @param {string} [options.name]  Escaped text; also the source of the initials
 * @param {string} [options.size='default']
 * @param {string} [options.shape='circle']
 * @param {string} [options.attrs]  Raw attribute markup appended to the wrapper; not escaped
 * @returns {string}
 */
export function renderAvatar(options = {}) {
  const {
    src,
    alt = '',
    name,
    size = 'default',
    shape = 'circle',
    attrs = '',
  } = options;

  function getInitials(name) {
    if (!name) return '?';
    return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  }

  const wrapperStart = `<span data-bn="avatar" data-size="${escapeAttr(size)}" data-shape="${escapeAttr(shape)}"`;

  if (src) {
    return `${wrapperStart}${attrsSuffix(attrs)}><img src="${escapeAttr(src)}" alt="${escapeAttr(alt || name || '')}" data-bn="avatar-img"></span>`;
  }

  return `${wrapperStart} role="img" aria-label="${escapeAttr(alt || name || 'Avatar')}"${attrsSuffix(attrs)}><span data-bn="avatar-initials">${escapeText(getInitials(name))}</span></span>`;
}
