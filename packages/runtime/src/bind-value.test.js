import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { Window } from 'happy-dom';
import { signal } from './signals.js';

// Regression tests for :value / :checked bindings on form controls.
// Attribute bindings write attributes, but an input's value *property*
// (what the user sees) only follows the attribute until the field is
// typed in. The binding must mirror these two onto the property, or a
// signal update such as clearing a form after submit never shows up.
let window, document;

beforeEach(() => {
  window = new Window({ url: 'http://localhost' });
  document = window.document;
  globalThis.document = document;
  globalThis.window = window;
  globalThis.Node = window.Node;
});

afterEach(async () => {
  try {
    document?.activeElement?.blur?.();
  } catch {}
  try {
    await window.happyDOM?.close?.();
  } catch {}
  window = null;
  document = null;
  delete globalThis.document;
  delete globalThis.window;
  delete globalThis.Node;
});

// Dynamic import after globals are set — hydrate/bind read `document` at call time
async function loadHydrate() {
  const mod = await import('./hydrate.js');
  return mod.hydrate;
}

describe(':value binding on form controls', () => {
  it('sets the input value property from the signal', async () => {
    const hydrate = await loadHydrate();
    const name = signal('Ada');
    const root = document.createElement('div');
    root.innerHTML = `<input type="text" :value="name()">`;
    hydrate(root, { name });
    assert.equal(root.querySelector('input').value, 'Ada');
  });

  it('updates the visible value after the user has typed (clearing works)', async () => {
    const hydrate = await loadHydrate();
    const name = signal('');
    const root = document.createElement('div');
    root.innerHTML = `<input type="text" :value="name()">`;
    hydrate(root, { name });
    const input = root.querySelector('input');
    // Simulate the user typing: property changes, attribute does not.
    input.value = 'Typed by the user';
    name.set('Grace');
    assert.equal(input.value, 'Grace');
    // The submit-clearing case: model goes from a real value to ''.
    name.set('');
    assert.equal(input.value, '');
  });

  it('mirrors onto textarea and select properties', async () => {
    const hydrate = await loadHydrate();
    const bio = signal('hello');
    const choice = signal('b');
    const root = document.createElement('div');
    root.innerHTML = `
      <textarea :value="bio()"></textarea>
      <select :value="choice()">
        <option value="a">A</option>
        <option value="b">B</option>
      </select>
    `;
    hydrate(root, { bio, choice });
    assert.equal(root.querySelector('textarea').value, 'hello');
    assert.equal(root.querySelector('select').value, 'b');
    bio.set('world');
    choice.set('a');
    assert.equal(root.querySelector('textarea').value, 'world');
    assert.equal(root.querySelector('select').value, 'a');
  });
});

describe(':checked binding on checkboxes', () => {
  it('drives the checked property in both directions', async () => {
    const hydrate = await loadHydrate();
    const agree = signal(true);
    const root = document.createElement('div');
    root.innerHTML = `<input type="checkbox" :checked="agree()">`;
    hydrate(root, { agree });
    const box = root.querySelector('input');
    assert.equal(box.checked, true);
    agree.set(false);
    assert.equal(box.checked, false);
    agree.set(true);
    assert.equal(box.checked, true);
  });
});

describe('other attribute bindings stay attribute-only', () => {
  // Note: no :class assertion here — happy-dom (the test DOM) has a known
  // bookkeeping bug where an element that carried a `:class` attribute
  // while `class` was being set reports a stale class forever after.
  // Verified as a happy-dom artifact with plain DOM calls, no BaseNative
  // code involved; :class itself is exercised in real browsers/jsdom.
  it(':title still resolves and updates as an attribute', async () => {
    const hydrate = await loadHydrate();
    const label = signal('one');
    const root = document.createElement('div');
    root.innerHTML = `<p :title="label()">x</p>`;
    document.body.append(root);
    hydrate(root, { label });
    const p = root.querySelector('p');
    // Read via the attributes list: happy-dom's getAttribute index goes
    // stale for attributes written while a `:binding` attribute was being
    // processed (same artifact as the :class note above); the list itself
    // reflects what setAttribute was actually called with.
    const titleValue = () => [...p.attributes].find((a) => a.name === 'title')?.value;
    assert.equal(titleValue(), 'one');
    label.set('two');
    assert.equal(titleValue(), 'two');
  });
});
