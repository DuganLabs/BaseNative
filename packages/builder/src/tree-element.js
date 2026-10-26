import { effect } from '@basenative/runtime';
import { renderTreeView } from './tree-view.js';

const TAG = 'bn-builder-tree';

export class BnBuilderTree extends HTMLElement {
  constructor() {
    super();
    this.state = null;
    this._effect = null;
    this._collapsed = new Set();
    this._lastSelection = undefined;
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
    this.innerHTML = renderTreeView(this.state, { collapsed: this._collapsed });
    // When the selection changes anywhere else (canvas click, undo,
    // inspector), keep the selected row visible in the Layers pane:
    // reveal it through any collapsed ancestors, then scroll it in.
    const selectedId = this.state.selection.peek
      ? this.state.selection.peek()
      : this.state.selection();
    if (selectedId !== this._lastSelection) {
      this._lastSelection = selectedId;
      if (selectedId) {
        let row = this.querySelector(`[data-bn-tree-id="${selectedId}"]`);
        if (!row && typeof this.state.getPath === 'function') {
          let revealed = false;
          for (const ancestorId of this.state.getPath(selectedId).slice(0, -1)) {
            if (this._collapsed.delete(ancestorId)) revealed = true;
          }
          if (revealed) {
            this.innerHTML = renderTreeView(this.state, { collapsed: this._collapsed });
            row = this.querySelector(`[data-bn-tree-id="${selectedId}"]`);
          }
        }
        if (row && typeof row.scrollIntoView === 'function') {
          row.scrollIntoView({ block: 'nearest' });
        }
      }
    }
  }

  _wire() {
    this.addEventListener('click', (e) => {
      const toggle = e.target.closest('[data-bn-tree-toggle]');
      if (toggle && this.state) {
        const id = toggle.dataset.bnTreeToggle;
        if (this._collapsed.has(id)) this._collapsed.delete(id);
        else this._collapsed.add(id);
        this._render();
        return;
      }
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
