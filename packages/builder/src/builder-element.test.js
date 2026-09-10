import { describe, test } from 'node:test';
import assert from 'node:assert/strict';

// builder-element.js defines a customElements-based class; shim just enough
// of the DOM surface (EventTarget, which Node provides natively) so the
// module can be imported and its event wiring exercised without a browser.
if (typeof globalThis.HTMLElement === 'undefined') {
  globalThis.HTMLElement = class extends EventTarget {};
}

const { BnBuilder } = await import('./builder-element.js');
const { createBuilderState } = await import('./state.js');
const { defaultPalette } = await import('./palette.js');

function makeWiredBuilder() {
  const el = new BnBuilder();
  el.state = createBuilderState();
  el.palette = defaultPalette();
  // Exercise only the event-wiring methods connectedCallback() calls —
  // no innerHTML/querySelector DOM is needed to reproduce the bug.
  el._wireToolbar();
  el._wirePaletteAdd();
  return el;
}

describe('BnBuilder — bn-palette-add wiring', () => {
  test('a single palette activation adds exactly one node', () => {
    const el = makeWiredBuilder();
    el.dispatchEvent(new CustomEvent('bn-palette-add', { detail: { type: 'button' } }));
    assert.equal(el.state.tree().length, 1);
  });

  test('two activations add exactly two nodes, not four', () => {
    const el = makeWiredBuilder();
    el.dispatchEvent(new CustomEvent('bn-palette-add', { detail: { type: 'button' } }));
    el.dispatchEvent(new CustomEvent('bn-palette-add', { detail: { type: 'button' } }));
    assert.equal(el.state.tree().length, 2);
  });

  test('re-wiring (e.g. a reconnect) does not stack duplicate listeners', () => {
    const el = makeWiredBuilder();
    el._wireToolbar();
    el._wirePaletteAdd();
    el.dispatchEvent(new CustomEvent('bn-palette-add', { detail: { type: 'button' } }));
    assert.equal(el.state.tree().length, 1);
  });
});
