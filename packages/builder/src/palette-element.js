import { escapeHtml } from './escape.js';

const TAG = 'bn-builder-palette';

function renderPaletteHTML(palette, query) {
  const q = String(query || '')
    .trim()
    .toLowerCase();
  const categories = palette.categories();
  if (!categories.length) {
    return '<p class="bn-palette__empty">No components registered.</p>';
  }
  const groups = categories
    .map((cat) => {
      const items = palette
        .byCategory(cat)
        .filter((def) => {
          if (!q) return true;
          return (
            def.label.toLowerCase().includes(q) ||
            def.type.toLowerCase().includes(q) ||
            def.category.toLowerCase().includes(q)
          );
        })
        .map((def) => {
          return (
            `<li class="bn-palette__item">` +
            `<button type="button" draggable="true" data-bn="bn-palette-item" data-bn-palette-type="${escapeHtml(def.type)}" class="bn-palette__btn" aria-label="Add ${escapeHtml(def.label)}">` +
            `<span class="bn-palette__label">${escapeHtml(def.label)}</span>` +
            `<span class="bn-palette__type">${escapeHtml(def.type)}</span>` +
            `</button>` +
            `</li>`
          );
        })
        .join('');
      if (!items) return '';
      return (
        `<section class="bn-palette__group" aria-label="${escapeHtml(cat)} components">` +
        `<h3 class="bn-palette__heading">${escapeHtml(cat)}</h3>` +
        `<ul class="bn-palette__list" role="list">${items}</ul>` +
        `</section>`
      );
    })
    .join('');
  return groups || '<p class="bn-palette__empty">No organisms match.</p>';
}

export class BnBuilderPalette extends HTMLElement {
  constructor() {
    super();
    this.palette = null;
  }

  connectedCallback() {
    /* display: contents lives in builder.css */
    this.setAttribute('role', 'toolbar');
    this.setAttribute('aria-label', 'Component palette');
    this._render();
    this._wire();
  }

  attach(palette) {
    this.palette = palette;
    if (this.isConnected) this._render();
  }

  _render() {
    if (!this.palette) return;
    const groups = this.querySelector('[data-bn-palette-groups]');
    if (!groups) {
      this.innerHTML =
        `<div class="bn-palette">` +
        `<search class="bn-palette__search">` +
        `<label class="bn-palette__search-label" for="bn-palette-query">Find</label>` +
        `<input id="bn-palette-query" type="search" class="bn-palette__query" placeholder="Hero, list, window" value="${escapeHtml(this._query || '')}">` +
        `</search>` +
        `<div data-bn-palette-groups>${renderPaletteHTML(this.palette, this._query)}</div>` +
        `</div>`;
      return;
    }
    groups.innerHTML = renderPaletteHTML(this.palette, this._query);
  }

  _wire() {
    if (this._wired) return;
    this._wired = true;

    this.addEventListener('input', (e) => {
      const field = e.target.closest('[data-bn-palette-query], .bn-palette__query');
      if (!field) return;
      this._query = field.value;
      this._render();
    });

    this.addEventListener('dragstart', (e) => {
      const btn = e.target.closest('[data-bn-palette-type]');
      if (!btn) return;
      e.dataTransfer.setData('application/x-bn-component-type', btn.dataset.bnPaletteType);
      e.dataTransfer.effectAllowed = 'copy';
    });

    // Palette items are real buttons: Enter/Space activation arrives as
    // a click, so no keydown shim is needed (or wanted — it double-adds).
    this.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-bn-palette-type]');
      if (!btn) return;
      this._dispatchAdd(btn.dataset.bnPaletteType);
    });
  }

  _dispatchAdd(type) {
    if (!type || !this.palette) return;
    const def = this.palette.get(type);
    if (!def) return;
    this.dispatchEvent(
      new CustomEvent('bn-palette-add', {
        detail: { type, def },
        bubbles: true,
      }),
    );
  }
}

if (typeof customElements !== 'undefined' && !customElements.get(TAG)) {
  customElements.define(TAG, BnBuilderPalette);
}

export { renderPaletteHTML };
