import { createBuilderState } from './state.js';
import { defaultPalette } from './palette.js';
import { generateBaseNative } from './codegen.js';
import { BnBuilderCanvas } from './canvas-element.js';
import { BnBuilderPalette } from './palette-element.js';
import { BnBuilderTree } from './tree-element.js';
import { BnBuilderInspector } from './inspector-element.js';

const TAG = 'bn-builder';

const LAYOUT_HTML = `
<div class="bn-builder">
  <header class="bn-builder__toolbar" role="toolbar" aria-label="Builder actions">
    <button type="button" data-bn-builder-action="undo" class="bn-builder__btn">Undo</button>
    <button type="button" data-bn-builder-action="redo" class="bn-builder__btn">Redo</button>
    <button type="button" data-bn-builder-action="clear" class="bn-builder__btn">Clear</button>
    <button type="button" data-bn-builder-action="export" class="bn-builder__btn">Export Code</button>
  </header>
  <div class="bn-builder__panes">
    <aside class="bn-builder__pane bn-builder__pane--palette" aria-label="Components">
      <bn-builder-palette></bn-builder-palette>
    </aside>
    <main class="bn-builder__pane bn-builder__pane--canvas">
      <bn-builder-canvas></bn-builder-canvas>
    </main>
    <aside class="bn-builder__pane bn-builder__pane--side" aria-label="Inspector and tree">
      <bn-builder-inspector></bn-builder-inspector>
      <bn-builder-tree></bn-builder-tree>
    </aside>
  </div>
</div>`;

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
  }

  attach({ state, palette }) {
    if (state) this.state = state;
    if (palette) this.palette = palette;
    if (this.isConnected) this.connectedCallback();
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
        this.dispatchEvent(new CustomEvent('bn-builder-export', { detail: { code }, bubbles: true }));
      }
    });
    this.addEventListener('bn-palette-add', (e) => {
      const type = e.detail?.type;
      if (!type || !this.state || !this.palette) return;
      const def = this.palette.get(type);
      if (!def) return;
      this.state.addNode(null, { type, props: { ...def.defaults } });
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
  if (!customElements.get('bn-builder-palette')) customElements.define('bn-builder-palette', BnBuilderPalette);
  if (!customElements.get('bn-builder-canvas')) customElements.define('bn-builder-canvas', BnBuilderCanvas);
  if (!customElements.get('bn-builder-tree')) customElements.define('bn-builder-tree', BnBuilderTree);
  if (!customElements.get('bn-builder-inspector')) customElements.define('bn-builder-inspector', BnBuilderInspector);
  if (!customElements.get(TAG)) customElements.define(TAG, BnBuilder);
}
