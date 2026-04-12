import { createCanvas } from './canvas.js';
import { renderNode } from './renderer.js';

/**
 * <bn-canvas> Web Component
 *
 * Orchestrates the visual builder's drag-and-drop interface.
 * Uses display: contents on :host to respect BaseNative layout constraints.
 *
 * Attributes:
 *   width - Canvas width (default: 1024)
 *   height - Canvas height (default: 768)
 *   grid-size - Snap grid size in pixels (default: 8)
 *   mode - 'edit' | 'preview' (default: 'edit')
 *
 * Events:
 *   bn-canvas-add    - Fired when a node is added
 *   bn-canvas-remove - Fired when a node is removed
 *   bn-canvas-move   - Fired when a node is moved
 *   bn-canvas-select - Fired when a node is selected
 *   bn-canvas-change - Fired on any state change
 */
export class BnCanvas extends HTMLElement {
  static get observedAttributes() {
    return ['width', 'height', 'grid-size', 'mode'];
  }

  constructor() {
    super();
    this._canvas = null;
    this._componentMap = {};
    this._selectedId = null;
    this._dragState = null;
    this._unsubscribe = null;
  }

  connectedCallback() {
    // display: contents — host does not affect layout
    this.style.display = 'contents';

    this._canvas = createCanvas({
      width: parseInt(this.getAttribute('width') || '1024', 10),
      height: parseInt(this.getAttribute('height') || '768', 10),
      gridSize: parseInt(this.getAttribute('grid-size') || '8', 10),
    });

    this._unsubscribe = this._canvas.subscribe((event, data) => {
      this.dispatchEvent(new CustomEvent(`bn-canvas-${event}`, { detail: data, bubbles: true }));
      this.dispatchEvent(new CustomEvent('bn-canvas-change', { detail: { event, data }, bubbles: true }));
      this._render();
    });

    this._setupDOM();
    this._render();
    this._attachDragListeners();
  }

  disconnectedCallback() {
    if (this._unsubscribe) {
      this._unsubscribe();
      this._unsubscribe = null;
    }
  }

  attributeChangedCallback(name, oldVal, newVal) {
    if (!this._canvas) return;
    // Re-create canvas with new dimensions if changed
    if (['width', 'height', 'grid-size'].includes(name)) {
      const surface = this.querySelector('[data-bn-canvas-surface]');
      if (surface) {
        if (name === 'width') surface.style.width = `${newVal}px`;
        if (name === 'height') surface.style.height = `${newVal}px`;
      }
    }
  }

  /** Register component types for rendering */
  registerComponents(componentMap) {
    this._componentMap = { ...this._componentMap, ...componentMap };
    this._render();
  }

  /** Get the underlying canvas state */
  get canvas() {
    return this._canvas;
  }

  /** Get the currently selected node ID */
  get selectedId() {
    return this._selectedId;
  }

  _setupDOM() {
    const w = this._canvas.width;
    const h = this._canvas.height;
    const mode = this.getAttribute('mode') || 'edit';

    this.innerHTML = `
      <div data-bn-canvas-container style="position:relative;overflow:auto;border:1px solid var(--border,hsl(220 15% 22%));border-radius:0.5rem;background:var(--surface-1,hsl(220 20% 10%))">
        <div data-bn-canvas-surface style="position:relative;width:${w}px;height:${h}px;background-image:radial-gradient(circle,var(--border,hsl(220 15% 22%)) 1px,transparent 1px);background-size:${this._canvas.gridSize}px ${this._canvas.gridSize}px">
          <div data-bn-canvas-nodes></div>
          ${mode === 'edit' ? '<div data-bn-canvas-selection style="position:absolute;pointer-events:none;border:2px solid var(--accent,hsl(210 100% 60%));border-radius:4px;display:none;z-index:10"></div>' : ''}
        </div>
      </div>`;
  }

  _render() {
    const container = this.querySelector('[data-bn-canvas-nodes]');
    if (!container || !this._canvas) return;

    const nodes = this._canvas.getNodes();
    container.innerHTML = '';

    for (const node of nodes) {
      const wrapper = document.createElement('div');
      wrapper.dataset.bnNodeId = node.id;
      wrapper.style.cssText = `position:absolute;left:${node.position.x}px;top:${node.position.y}px;width:${node.size.width}px;min-height:${node.size.height}px;cursor:move;border-radius:4px;transition:box-shadow 150ms ease`;

      if (this._selectedId === node.id) {
        wrapper.style.boxShadow = '0 0 0 2px var(--accent, hsl(210 100% 60%))';
      }

      // Render node content
      const renderFn = this._componentMap[node.type];
      if (renderFn) {
        wrapper.innerHTML = renderNode(node, this._componentMap);
      } else {
        wrapper.innerHTML = `<div style="padding:0.5rem;background:var(--surface-2,hsl(220 15% 14%));border:1px dashed var(--border,hsl(220 15% 22%));border-radius:4px;font-size:0.75rem;color:var(--text-muted)">${node.type}</div>`;
      }

      wrapper.setAttribute('draggable', 'true');
      container.appendChild(wrapper);
    }

    // Update selection outline
    this._updateSelection();
  }

  _updateSelection() {
    const outline = this.querySelector('[data-bn-canvas-selection]');
    if (!outline) return;

    if (!this._selectedId) {
      outline.style.display = 'none';
      return;
    }

    const node = this._canvas.getNode(this._selectedId);
    if (!node) {
      outline.style.display = 'none';
      return;
    }

    outline.style.display = 'block';
    outline.style.left = `${node.position.x - 2}px`;
    outline.style.top = `${node.position.y - 2}px`;
    outline.style.width = `${node.size.width + 4}px`;
    outline.style.height = `${node.size.height + 4}px`;
  }

  _attachDragListeners() {
    const surface = this.querySelector('[data-bn-canvas-surface]');
    if (!surface) return;

    // Click to select
    surface.addEventListener('pointerdown', (e) => {
      const nodeEl = e.target.closest('[data-bn-node-id]');
      if (nodeEl) {
        const id = nodeEl.dataset.bnNodeId;
        this._selectedId = id;
        this._render();
        this.dispatchEvent(new CustomEvent('bn-canvas-select', { detail: { id }, bubbles: true }));

        // Start drag
        const node = this._canvas.getNode(id);
        if (node) {
          const rect = surface.getBoundingClientRect();
          this._dragState = {
            id,
            startX: e.clientX,
            startY: e.clientY,
            origX: node.position.x,
            origY: node.position.y,
          };
        }
      } else {
        this._selectedId = null;
        this._render();
      }
    });

    // Drag move
    surface.addEventListener('pointermove', (e) => {
      if (!this._dragState) return;
      const dx = e.clientX - this._dragState.startX;
      const dy = e.clientY - this._dragState.startY;
      const gs = this._canvas.gridSize;
      const x = Math.round((this._dragState.origX + dx) / gs) * gs;
      const y = Math.round((this._dragState.origY + dy) / gs) * gs;
      this._canvas.moveNode(this._dragState.id, { x: Math.max(0, x), y: Math.max(0, y) });
    });

    // Drag end
    surface.addEventListener('pointerup', () => {
      this._dragState = null;
    });

    // Drop from palette
    surface.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
    });

    surface.addEventListener('drop', (e) => {
      e.preventDefault();
      const type = e.dataTransfer.getData('text/bn-component-type');
      if (!type) return;

      const rect = surface.getBoundingClientRect();
      const gs = this._canvas.gridSize;
      const x = Math.round((e.clientX - rect.left) / gs) * gs;
      const y = Math.round((e.clientY - rect.top) / gs) * gs;

      const propsJson = e.dataTransfer.getData('text/bn-component-props');
      const props = propsJson ? JSON.parse(propsJson) : {};

      this._canvas.addNode({ type, props, position: { x, y }, size: { width: 200, height: 40 } });
    });

    // Keyboard shortcuts
    this.addEventListener('keydown', (e) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (this._selectedId) {
          this._canvas.removeNode(this._selectedId);
          this._selectedId = null;
        }
      }
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z' && !e.shiftKey) {
          e.preventDefault();
          this._canvas.undo();
        } else if ((e.key === 'z' && e.shiftKey) || e.key === 'y') {
          e.preventDefault();
          this._canvas.redo();
        }
      }
    });
  }
}

// Register element
if (typeof customElements !== 'undefined' && !customElements.get('bn-canvas')) {
  customElements.define('bn-canvas', BnCanvas);
}
