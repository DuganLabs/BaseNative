import { effect } from '@basenative/runtime';
import { createBuilderState } from './state.js';
import { defaultPalette } from './palette.js';
import { generateBaseNative } from './codegen.js';
import { BnBuilderCanvas } from './canvas-element.js';
import { BnBuilderPalette } from './palette-element.js';
import { BnBuilderTree } from './tree-element.js';
import { BnBuilderInspector } from './inspector-element.js';

const TAG = 'bn-builder';

const LAYOUT_HTML = `
<section class="bn-builder" data-bn="bn-window">
  <header class="bn-builder__toolbar" data-bn="bn-window-titlebar">
    <p class="bn-builder__traffic" aria-hidden="true"><i></i><i></i><i></i></p>
    <h2 class="bn-builder__title">Builder</h2>
    <nav aria-label="Builder actions">
      <button type="button" data-bn="bn-builder-action" data-bn-builder-action="undo" class="bn-builder__btn" title="Undo (Ctrl+Z)">Undo</button>
      <button type="button" data-bn="bn-builder-action" data-bn-builder-action="redo" class="bn-builder__btn" title="Redo (Ctrl+Shift+Z)">Redo</button>
      <button type="button" data-bn="bn-builder-action" data-bn-builder-action="clear" class="bn-builder__btn" title="Remove every component from the canvas">Clear</button>
      <button type="button" data-bn="bn-builder-action" data-bn-builder-action="export" class="bn-builder__btn" title="Render the canvas as BaseNative source">Export Code</button>
    </nav>
  </header>
  <section class="bn-builder__body" data-bn="bn-window-body">
    <div class="bn-builder__panes">
      <div class="bn-builder__sidebar">
        <aside class="bn-builder__pane bn-builder__pane--palette" data-bn="bn-sidebar" aria-label="Component palette">
          <h2 class="bn-builder__heading">Components</h2>
          <bn-builder-palette></bn-builder-palette>
        </aside>
        <aside class="bn-builder__pane bn-builder__pane--layers" aria-label="Layers">
          <h2 class="bn-builder__heading">Layers</h2>
          <bn-builder-tree></bn-builder-tree>
        </aside>
      </div>
      <section class="bn-builder__pane bn-builder__pane--canvas" aria-label="Canvas">
        <h2 class="bn-builder__heading">Canvas</h2>
        <bn-builder-canvas></bn-builder-canvas>
      </section>
      <aside class="bn-builder__pane bn-builder__pane--inspector" data-bn="bn-inspector" aria-label="Inspector">
        <h2 class="bn-builder__heading">Inspector</h2>
        <bn-builder-inspector></bn-builder-inspector>
      </aside>
    </div>
  </section>
</section>`;

export class BnBuilder extends HTMLElement {
  constructor() {
    super();
    this.state = null;
    this.palette = null;
  }

  connectedCallback() {
    this.style.display = 'contents';
    this.setAttribute('role', 'application');
    this.setAttribute('aria-label', 'BaseNative visual builder');

    if (!this.state) this.state = createBuilderState();
    if (!this.palette) this.palette = defaultPalette();

    if (!this._mounted) {
      this.innerHTML = LAYOUT_HTML;
      this._mounted = true;
    }

    const palette = this.querySelector('bn-builder-palette');
    const canvas = this.querySelector('bn-builder-canvas');
    const tree = this.querySelector('bn-builder-tree');
    const inspector = this.querySelector('bn-builder-inspector');

    if (palette && palette.attach) palette.attach(this.palette);
    if (canvas && canvas.attach) canvas.attach(this.state, this.palette);
    if (tree && tree.attach) tree.attach(this.state);
    if (inspector && inspector.attach) inspector.attach(this.state, this.palette);

    this._wireToolbar();
    this._wirePaletteAdd();
    this._wireToolbarState();
    this._centerOnViewport();
    if (!this._onResize) {
      this._onResize = () => this._centerOnViewport();
      window.addEventListener('resize', this._onResize);
    }
  }

  disconnectedCallback() {
    if (this._toolbarEffect) {
      this._toolbarEffect.dispose();
      this._toolbarEffect = null;
      this._toolbarEffectState = null;
    }
    if (this._onResize) {
      window.removeEventListener('resize', this._onResize);
      this._onResize = null;
    }
  }

  // The window breaks out of its (narrow) host column to near-viewport
  // width. The host column is not always viewport-centered (an app
  // shell rail offsets it), so measure the offset and hand it to CSS:
  // the breakout then centers on the viewport, not the column, and
  // never clips off the left edge. The shift is set on the host so the
  // export panel (a sibling in the host view) inherits the same value.
  _centerOnViewport() {
    const host = this.parentElement;
    if (!host) return;
    const rect = host.getBoundingClientRect();
    if (!rect.width) return;
    const shift = window.innerWidth / 2 - (rect.left + rect.width / 2);
    host.style.setProperty('--bn-builder-center-shift', `${Math.round(shift)}px`);
  }

  attach({ state, palette }) {
    if (state) this.state = state;
    if (palette) this.palette = palette;
    if (this.isConnected) this.connectedCallback();
  }

  // Toolbar buttons tell the truth about availability: Undo/Redo dim
  // when their stacks are empty, Clear/Export dim on an empty canvas.
  _wireToolbarState() {
    if (!this.state) return;
    if (this._toolbarEffect) {
      if (this._toolbarEffectState === this.state) return;
      this._toolbarEffect.dispose();
      this._toolbarEffect = null;
    }
    this._toolbarEffectState = this.state;
    const undo = this.querySelector('[data-bn-builder-action="undo"]');
    const redo = this.querySelector('[data-bn-builder-action="redo"]');
    const clear = this.querySelector('[data-bn-builder-action="clear"]');
    const exp = this.querySelector('[data-bn-builder-action="export"]');
    if (!undo || !redo || !clear || !exp) return;
    const state = this.state;
    this._toolbarEffect = effect(() => {
      undo.disabled = !state.canUndo();
      redo.disabled = !state.canRedo();
      const empty = state.tree().length === 0;
      clear.disabled = empty;
      exp.disabled = empty;
    });
  }

  generateCode(options) {
    if (!this.state) return '';
    return generateBaseNative(this.state, { palette: this.palette, ...options });
  }

  _wireToolbar() {
    if (this._toolbarWired) return;
    this._toolbarWired = true;
    this.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-bn-builder-action]');
      if (!btn) return;
      const action = btn.dataset.bnBuilderAction;
      if (action === 'undo') this.state.undo();
      else if (action === 'redo') this.state.redo();
      else if (action === 'clear') this.state.clear();
      else if (action === 'export') {
        const code = this.generateCode();
        this.dispatchEvent(
          new CustomEvent('bn-builder-export', { detail: { code }, bubbles: true }),
        );
      }
    });
  }

  _wirePaletteAdd() {
    if (this._paletteAddWired) return;
    this._paletteAddWired = true;
    this.addEventListener('bn-palette-add', (e) => {
      if (!this.state || !this.palette) return;
      const { type, def } = e.detail || {};
      if (!type) return;
      const resolved = def || this.palette.get(type);
      if (!resolved) return;
      const selectedId = this.state.selection();
      const selectedNode = selectedId ? this.state.getNode(selectedId) : null;
      const selectedDef = selectedNode ? this.palette.get(selectedNode.type) : null;
      const parentId = selectedDef && selectedDef.container ? selectedId : null;
      this.state.addNode(parentId, { type, props: { ...resolved.defaults } });
    });
  }
}

if (typeof customElements !== 'undefined') {
  if (!customElements.get('bn-builder-palette'))
    customElements.define('bn-builder-palette', BnBuilderPalette);
  if (!customElements.get('bn-builder-canvas'))
    customElements.define('bn-builder-canvas', BnBuilderCanvas);
  if (!customElements.get('bn-builder-tree'))
    customElements.define('bn-builder-tree', BnBuilderTree);
  if (!customElements.get('bn-builder-inspector'))
    customElements.define('bn-builder-inspector', BnBuilderInspector);
  if (!customElements.get(TAG)) customElements.define(TAG, BnBuilder);
}
