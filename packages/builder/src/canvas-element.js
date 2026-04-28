import { effect } from '@basenative/runtime';
import { renderNodeToElement, renderEmptyPlaceholder } from './dom-render.js';

const CANVAS_TAG = 'bn-builder-canvas';

export class BnBuilderCanvas extends HTMLElement {
  constructor() {
    super();
    this.state = null;
    this.palette = null;
    this._root = null;
    this._effect = null;
    this._dragOverId = null;
  }

  connectedCallback() {
    this.style.display = 'contents';
    this.setAttribute('role', 'application');
    this.setAttribute('aria-label', 'Builder canvas');

    if (!this._root) {
      this._root = document.createElement('div');
      this._root.className = 'bn-builder__canvas-surface';
      this._root.tabIndex = 0;
      this.appendChild(this._root);
    }

    this._wireSurfaceEvents();
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

  attach(state, palette) {
    this.state = state;
    this.palette = palette;
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
    if (!this._root || !this.state || !this.palette) return;
    const tree = this.state.tree();
    this._root.replaceChildren();

    if (tree.length === 0) {
      const empty = renderEmptyPlaceholder(document, 'Drag a component here to start building.');
      empty.dataset.bnDropzone = 'root';
      this._root.appendChild(empty);
      return;
    }

    for (const node of tree) {
      const el = renderNodeToElement(document, node, this.palette);
      this._decorate(el, node);
      this._root.appendChild(el);
    }
  }

  _decorate(el, node) {
    if (this.state.selection() === node.id) {
      el.dataset.bnSelected = 'true';
    } else {
      delete el.dataset.bnSelected;
    }
    if (this.state.hover() === node.id) {
      el.dataset.bnHover = 'true';
    }
    el.setAttribute('draggable', 'true');
    if (node.children) {
      for (let i = 0; i < node.children.length; i++) {
        const childEl = el.querySelector(`[data-bn-node="${node.children[i].id}"]`);
        if (childEl) this._decorate(childEl, node.children[i]);
      }
    }
  }

  _wireSurfaceEvents() {
    if (this._root._bnWired) return;
    this._root._bnWired = true;

    this._root.addEventListener('click', (e) => {
      const el = e.target.closest('[data-bn-node]');
      if (!el) {
        this.state.select(null);
        return;
      }
      e.stopPropagation();
      this.state.select(el.dataset.bnNode);
    });

    this._root.addEventListener('mouseover', (e) => {
      const el = e.target.closest('[data-bn-node]');
      if (el) this.state.hoverNode(el.dataset.bnNode);
    });

    this._root.addEventListener('mouseleave', () => {
      this.state.hoverNode(null);
    });

    this._root.addEventListener('dragstart', (e) => {
      const el = e.target.closest('[data-bn-node]');
      if (!el) return;
      e.dataTransfer.setData('application/x-bn-node-id', el.dataset.bnNode);
      e.dataTransfer.effectAllowed = 'move';
    });

    this._root.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
    });

    this._root.addEventListener('drop', (e) => {
      e.preventDefault();
      const moveId = e.dataTransfer.getData('application/x-bn-node-id');
      const newType = e.dataTransfer.getData('application/x-bn-component-type');
      const target = e.target.closest('[data-bn-node]');
      const targetId = target ? target.dataset.bnNode : null;

      if (newType) {
        const def = this.palette.get(newType);
        if (!def) return;
        const parentId = target && this._isContainer(target) ? targetId : null;
        this.state.addNode(parentId, { type: newType, props: { ...def.defaults } });
        return;
      }

      if (moveId) {
        if (moveId === targetId) return;
        const targetNode = targetId ? this.state.getNode(targetId) : null;
        if (target && targetNode && this._isContainer(target)) {
          this.state.moveNode(moveId, targetId);
        } else if (targetNode) {
          const parent = this.state.getParent(targetId);
          const parentId = parent ? parent.id : null;
          const siblings = parent ? parent.children : this.state.tree();
          const idx = siblings.findIndex((n) => n.id === targetId);
          this.state.moveNode(moveId, parentId, idx + 1);
        } else {
          this.state.moveNode(moveId, null);
        }
      }
    });

    this.addEventListener('keydown', (e) => {
      if (!this.state) return;
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const id = this.state.selection();
        if (id) {
          e.preventDefault();
          this.state.removeNode(id);
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) this.state.redo();
        else this.state.undo();
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        this.state.redo();
      }
    });
  }

  _isContainer(el) {
    if (!el) return false;
    const def = this.palette.get(el.dataset.bnType);
    return def ? def.container : false;
  }
}

if (typeof customElements !== 'undefined' && !customElements.get(CANVAS_TAG)) {
  customElements.define(CANVAS_TAG, BnBuilderCanvas);
}
