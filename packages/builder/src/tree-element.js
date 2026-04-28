import { effect } from '@basenative/runtime';
import { renderTreeView } from './tree-view.js';

const TAG = 'bn-builder-tree';

export class BnBuilderTree extends HTMLElement {
  constructor() {
    super();
    this.state = null;
    this._effect = null;
  }

  connectedCallback() {
    this.style.display = 'contents';
    this._wire();
    this._render();
    if (this.state && !this._effect) {
      this._effect = effect(() => {
        this.state.tree();
        this.state.selection();
        this.state.hover();
        this._render();
      });
    }
  }

  disconnectedCallback() {
    if (this._effect) {
      this._effect.dispose();
      this._effect = null;
    }
  }

  attach(state) {
    this.state = state;
    if (this.isConnected) {
      if (this._effect) this._effect.dispose();
      this._effect = effect(() => {
        state.tree();
        state.selection();
        state.hover();
        this._render();
      });
    }
  }

  _render() {
    if (!this.state) {
      this.innerHTML = '';
      return;
    }
    this.innerHTML = renderTreeView(this.state);
  }

  _wire() {
    this.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-bn-tree-select]');
      if (!btn || !this.state) return;
      this.state.select(btn.dataset.bnTreeSelect);
    });
    this.addEventListener('mouseover', (e) => {
      const item = e.target.closest('[data-bn-tree-id]');
      if (item && this.state) this.state.hoverNode(item.dataset.bnTreeId);
    });
    this.addEventListener('mouseleave', () => {
      if (this.state) this.state.hoverNode(null);
    });
  }
}

if (typeof customElements !== 'undefined' && !customElements.get(TAG)) {
  customElements.define(TAG, BnBuilderTree);
}
