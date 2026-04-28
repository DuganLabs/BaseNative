import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  PALETTE_MIME,
  NODE_MIME,
  attachPaletteSource,
  attachNodeSource,
  attachDropTarget,
  computeInsertionIndex,
  classifyDropPosition,
  readDataTransfer,
} from './dnd.js';

class FakeDataTransfer {
  constructor() {
    this._data = new Map();
    this.types = [];
    this.effectAllowed = 'none';
    this.dropEffect = 'none';
  }
  setData(type, value) {
    this._data.set(type, String(value));
    if (!this.types.includes(type)) this.types.push(type);
  }
  getData(type) {
    return this._data.get(type) || '';
  }
}

class FakeEvent {
  constructor(type, init = {}) {
    this.type = type;
    this.dataTransfer = init.dataTransfer || new FakeDataTransfer();
    this.defaultPrevented = false;
    this.propagationStopped = false;
  }
  preventDefault() {
    this.defaultPrevented = true;
  }
  stopPropagation() {
    this.propagationStopped = true;
  }
}

class FakeClassList {
  constructor() {
    this._set = new Set();
  }
  add(c) {
    this._set.add(c);
  }
  remove(c) {
    this._set.delete(c);
  }
  contains(c) {
    return this._set.has(c);
  }
}

class FakeElement {
  constructor() {
    this.attrs = new Map();
    this.dataset = {};
    this.classList = new FakeClassList();
    this.handlers = new Map();
  }
  setAttribute(key, value) {
    this.attrs.set(key, String(value));
  }
  getAttribute(key) {
    return this.attrs.has(key) ? this.attrs.get(key) : null;
  }
  addEventListener(type, fn) {
    if (!this.handlers.has(type)) this.handlers.set(type, new Set());
    this.handlers.get(type).add(fn);
  }
  removeEventListener(type, fn) {
    if (!this.handlers.has(type)) return;
    this.handlers.get(type).delete(fn);
  }
  dispatch(type, event) {
    const fns = this.handlers.get(type);
    if (!fns) return;
    for (const fn of fns) fn(event);
  }
}

describe('attachPaletteSource', () => {
  it('marks element draggable with palette type', () => {
    const el = new FakeElement();
    attachPaletteSource(el, 'button');
    assert.equal(el.getAttribute('draggable'), 'true');
    assert.equal(el.dataset.bnPaletteType, 'button');
  });

  it('writes palette mime on dragstart', () => {
    const el = new FakeElement();
    attachPaletteSource(el, 'heading');
    const event = new FakeEvent('dragstart');
    el.dispatch('dragstart', event);
    assert.equal(event.dataTransfer.getData(PALETTE_MIME), 'heading');
    assert.equal(event.dataTransfer.effectAllowed, 'copy');
  });

  it('returns a disposer that detaches the listener', () => {
    const el = new FakeElement();
    const dispose = attachPaletteSource(el, 'x');
    dispose();
    const event = new FakeEvent('dragstart');
    el.dispatch('dragstart', event);
    assert.equal(event.dataTransfer.getData(PALETTE_MIME), '');
  });
});

describe('attachNodeSource', () => {
  it('writes node mime on dragstart', () => {
    const el = new FakeElement();
    attachNodeSource(el, 'n42');
    const event = new FakeEvent('dragstart');
    el.dispatch('dragstart', event);
    assert.equal(event.dataTransfer.getData(NODE_MIME), 'n42');
    assert.equal(event.dataTransfer.effectAllowed, 'move');
    assert.equal(event.propagationStopped, true);
  });
});

describe('attachDropTarget', () => {
  it('calls preventDefault on dragover for known mime types', () => {
    const el = new FakeElement();
    attachDropTarget(el);
    const dt = new FakeDataTransfer();
    dt.types = [PALETTE_MIME];
    const event = new FakeEvent('dragover', { dataTransfer: dt });
    el.dispatch('dragover', event);
    assert.equal(event.defaultPrevented, true);
    assert.equal(el.classList.contains('bn-drop-active'), true);
  });

  it('ignores dragover for unrelated mime types', () => {
    const el = new FakeElement();
    attachDropTarget(el);
    const dt = new FakeDataTransfer();
    dt.types = ['text/plain'];
    const event = new FakeEvent('dragover', { dataTransfer: dt });
    el.dispatch('dragover', event);
    assert.equal(event.defaultPrevented, false);
  });

  it('routes palette payload to onPaletteDrop', () => {
    const el = new FakeElement();
    let captured = null;
    attachDropTarget(el, {
      onPaletteDrop: (payload) => {
        captured = payload;
      },
    });
    const dt = new FakeDataTransfer();
    dt.setData(PALETTE_MIME, 'button');
    const event = new FakeEvent('drop', { dataTransfer: dt });
    el.dispatch('drop', event);
    assert.equal(captured.type, 'button');
  });

  it('routes node payload to onNodeDrop', () => {
    const el = new FakeElement();
    let captured = null;
    attachDropTarget(el, {
      onNodeDrop: (payload) => {
        captured = payload;
      },
    });
    const dt = new FakeDataTransfer();
    dt.setData(NODE_MIME, 'n5');
    const event = new FakeEvent('drop', { dataTransfer: dt });
    el.dispatch('drop', event);
    assert.equal(captured.nodeId, 'n5');
  });

  it('clears active class on dragleave', () => {
    const el = new FakeElement();
    attachDropTarget(el);
    el.classList.add('bn-drop-active');
    el.dispatch('dragleave', new FakeEvent('dragleave'));
    assert.equal(el.classList.contains('bn-drop-active'), false);
  });
});

describe('computeInsertionIndex', () => {
  it('returns 0 for empty containers', () => {
    assert.equal(computeInsertionIndex({ top: 0, height: 100 }, 50, 0), 0);
  });

  it('inserts at start when above midpoint', () => {
    assert.equal(computeInsertionIndex({ top: 0, height: 100 }, 10, 5), 0);
  });

  it('inserts at end when below midpoint', () => {
    assert.equal(computeInsertionIndex({ top: 0, height: 100 }, 90, 5), 5);
  });
});

describe('classifyDropPosition', () => {
  it('classifies before / inside / after by thirds', () => {
    const rect = { top: 0, bottom: 90, height: 90 };
    assert.equal(classifyDropPosition(rect, 10), 'before');
    assert.equal(classifyDropPosition(rect, 45), 'inside');
    assert.equal(classifyDropPosition(rect, 80), 'after');
  });
});

describe('readDataTransfer', () => {
  it('returns palette type when present', () => {
    const dt = new FakeDataTransfer();
    dt.setData(PALETTE_MIME, 'foo');
    const event = new FakeEvent('drop', { dataTransfer: dt });
    assert.deepEqual(readDataTransfer(event), { type: 'palette', payload: 'foo' });
  });

  it('returns node type when present', () => {
    const dt = new FakeDataTransfer();
    dt.setData(NODE_MIME, 'n9');
    const event = new FakeEvent('drop', { dataTransfer: dt });
    assert.deepEqual(readDataTransfer(event), { type: 'node', payload: 'n9' });
  });

  it('returns null for events without dataTransfer', () => {
    assert.deepEqual(readDataTransfer({}), { type: null, payload: null });
  });
});
