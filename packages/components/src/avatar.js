/**
 * Avatar — user avatar with image, initials, or icon fallback.
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

  const content = src
    ? `<img src="${src}" alt="${alt || name || ''}" data-bn="avatar-img">`
    : `<span data-bn="avatar-initials">${getInitials(name)}</span>`;

  return `<span data-bn="avatar" data-size="${size}" data-shape="${shape}" role="img" aria-label="${alt || name || 'Avatar'}" ${attrs}>${content}</span>`;
}
