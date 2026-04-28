import { attachPaletteSource } from './dnd.js';

function createElement(doc, tag, attrs = {}, text) {
  const el = doc.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value === false || value == null) continue;
    if (key === 'class') el.className = value;
    else el.setAttribute(key, value);
  }
  if (text != null) el.textContent = text;
  return el;
}

export function renderPalette(palette, target, options = {}) {
  if (!target) throw new Error('renderPalette: target element required');
  const doc = target.ownerDocument;

  const renderList = () => {
    target.replaceChildren();
    target.classList.add('bn-palette');
    target.setAttribute('role', 'listbox');
    target.setAttribute('aria-label', 'Component palette');

    const categories = palette.categories();
    for (const [category, defs] of categories) {
      const group = createElement(doc, 'section', {
        class: 'bn-palette-group',
        'aria-label': category,
      });
      group.appendChild(createElement(doc, 'h4', { class: 'bn-palette-heading' }, category));

      const list = createElement(doc, 'ul', { class: 'bn-palette-list', role: 'group' });
      for (const def of defs) {
        const item = createElement(doc, 'li', {
          class: 'bn-palette-item',
          role: 'option',
          'data-bn-palette-type': def.type,
          tabindex: '0',
        }, def.label);
        attachPaletteSource(item, def.type);
        if (options.onSelect) {
          item.addEventListener('click', () => options.onSelect(def.type));
        }
        list.appendChild(item);
      }
      group.appendChild(list);
      target.appendChild(group);
    }
  };

  renderList();
  return () => target.replaceChildren();
}
