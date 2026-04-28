import { effect } from '@basenative/runtime';
import { renderInspector } from './inspector.js';

const TAG = 'bn-builder-inspector';

function coerce(prop, raw) {
  if (prop.kind === 'number') {
    if (raw === '' || raw == null) return undefined;
    const n = Number(raw);
    return Number.isNaN(n) ? undefined : n;
  }
  if (prop.kind === 'boolean') {
    return Boolean(raw);
  }
  return raw === '' ? undefined : raw;
}

export class BnBuilderInspector extends HTMLElement {
  constructor() {
    super();
    this.state = null;
    this.palette = null;
    this._effect = null;
  }

  connectedCallback() {
    this.style.display = 'contents';
    this._wire();
    this._render();
    if (this.state && !this._effect) {
      this._bindEffect();
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
      this._bindEffect();
    }
  }

  _bindEffect() {
    this._effect = effect(() => {
      this.state.tree();
      this.state.selection();
      this._render();
    });
  }

  _render() {
    if (!this.state || !this.palette) {
      this.innerHTML = '';
      return;
    }
    this.innerHTML = renderInspector(this.state, this.palette);
  }

  _wire() {
    this.addEventListener('input', (e) => this._handleChange(e));
    this.addEventListener('change', (e) => this._handleChange(e));
    this.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-bn-action]');
      if (!btn || !this.state) return;
      const action = btn.dataset.bnAction;
      const id = btn.dataset.bnNode;
      if (action === 'remove') this.state.removeNode(id);
      else if (action === 'duplicate') this.state.duplicateNode(id);
    });
  }

  _handleChange(e) {
    const target = e.target.closest('[data-bn-prop]');
    if (!target || !this.state || !this.palette) return;
    const propName = target.dataset.bnProp;
    const nodeId = target.dataset.bnNode;
    const node = this.state.getNode(nodeId);
    if (!node) return;
    const def = this.palette.get(node.type);
    if (!def) return;
    const prop = def.props.find((p) => p.name === propName);
    if (!prop) return;

    if (target.dataset.bnBinding === 'true') {
      const ref = target.value.trim();
      this.state.setBinding(nodeId, propName, ref ? { ref } : null);
      return;
    }

    const raw = target.type === 'checkbox' ? target.checked : target.value;
    const value = coerce(prop, raw);
    this.state.updateProps(nodeId, { [propName]: value });
  }
}

if (typeof customElements !== 'undefined' && !customElements.get(TAG)) {
  customElements.define(TAG, BnBuilderInspector);
}
