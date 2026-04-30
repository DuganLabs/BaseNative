import { escapeHtml } from './escape.js';

const TAG = 'bn-builder-palette';

function renderPaletteHTML(palette) {
  const categories = palette.categories();
  if (!categories.length) {
    return '<p class="bn-palette__empty">No components registered.</p>';
  }
  return categories.map((cat) => {
    const items = palette.byCategory(cat).map((def) =>
      `<li class="bn-palette__item">`
        + `<button type="button" draggable="true" data-bn-palette-type="${escapeHtml(def.type)}" class="bn-palette__btn">`
        + `<span class="bn-palette__label">${escapeHtml(def.label)}</span>`
        + `<span class="bn-palette__type">${escapeHtml(def.type)}</span>`
        + `</button>`
        + `</li>`
    ).join('');
    return `<section class="bn-palette__group" aria-label="${escapeHtml(cat)} components">`
      + `<h3 class="bn-palette__heading">${escapeHtml(cat)}</h3>`
      + `<ul class="bn-palette__list" role="list">${items}</ul>`
      + `</section>`;
  }).join('');
}

export class BnBuilderPalette extends HTMLElement {
  constructor() {
    super();
    this.palette = null;
  }

  connectedCallback() {
    this.style.display = 'contents';
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
    this.innerHTML = `<div class="bn-palette">${renderPaletteHTML(this.palette)}</div>`;
  }

  _wire() {
    if (this._wired) return;
    this._wired = true;
    this.addEventListener('dragstart', (e) => {
      const btn = e.target.closest('[data-bn-palette-type]');
      if (!btn) return;
      e.dataTransfer.setData('application/x-bn-component-type', btn.dataset.bnPaletteType);
      e.dataTransfer.effectAllowed = 'copy';
    });
    this.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-bn-palette-type]');
      if (!btn) return;
      e.preventDefault();
      this.dispatchEvent(new CustomEvent('bn-palette-add', {
        detail: { type: btn.dataset.bnPaletteType },
        bubbles: true,
      }));
    });
  }
}

if (typeof customElements !== 'undefined' && !customElements.get(TAG)) {
  customElements.define(TAG, BnBuilderPalette);
}

export { renderPaletteHTML };
