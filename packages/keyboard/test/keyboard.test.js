// Built with BaseNative — basenative.dev
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  Keyboard,
  renderKeyboard,
  hydrateKeyboard,
  LAYOUTS,
  defineLayout,
  validateLayout,
  normalizeKey,
  keyState,
} from '../src/index.js';

describe('layouts', () => {
  it('exposes all built-in layouts', () => {
    assert.ok(LAYOUTS.qwerty);
    assert.ok(LAYOUTS.alphanumeric);
    assert.ok(LAYOUTS.numpad);
    assert.ok(LAYOUTS.phone);
  });

  it('validates the built-in QWERTY layout', () => {
    assert.equal(validateLayout(LAYOUTS.qwerty), true);
  });

  it('QWERTY has Q, W, ENTER, BACKSPACE keys', () => {
    const keys = LAYOUTS.qwerty.rows.flat().map(k => k.key);
    assert.ok(keys.includes('Q'));
    assert.ok(keys.includes('W'));
    assert.ok(keys.includes('ENTER'));
    assert.ok(keys.includes('BACKSPACE'));
  });

  it('numpad has digits 0-9 plus ENTER and BACKSPACE', () => {
    const keys = LAYOUTS.numpad.rows.flat().map(k => k.key);
    for (let i = 0; i <= 9; i++) {
      assert.ok(keys.includes(String(i)), `missing digit ${i}`);
    }
    assert.ok(keys.includes('ENTER'));
    assert.ok(keys.includes('BACKSPACE'));
  });

  it('normalizeKey lifts strings into char keys', () => {
    const k = normalizeKey('A');
    assert.equal(k.type, 'char');
    assert.equal(k.label, 'A');
    assert.equal(k.key, 'A');
    assert.equal(k.span, 1);
  });

  it('normalizeKey preserves action keys', () => {
    const k = normalizeKey({ type: 'action', label: 'GO', key: 'ENTER', span: 1.5, variant: 'enter' });
    assert.equal(k.type, 'action');
    assert.equal(k.key, 'ENTER');
    assert.equal(k.span, 1.5);
    assert.equal(k.variant, 'enter');
  });

  it('defineLayout normalizes mixed string/object rows', () => {
    const layout = defineLayout([
      ['A', 'B'],
      [{ type: 'action', label: 'GO', key: 'ENTER' }],
    ]);
    assert.equal(layout.rows.length, 2);
    assert.equal(layout.rows[0][0].type, 'char');
    assert.equal(layout.rows[1][0].type, 'action');
  });

  it('defineLayout rejects empty input', () => {
    assert.throws(() => defineLayout([]), /non-empty array/);
    assert.throws(() => defineLayout(null), /non-empty array/);
  });

  it('validateLayout rejects malformed rows', () => {
    assert.throws(() => validateLayout({ rows: [[{ type: 'char', label: 'A' }]] }), /string label and key/);
    assert.throws(() => validateLayout({ rows: [[{ type: 'wat', label: 'x', key: 'x' }]] }), /invalid type/);
  });
});

describe('renderKeyboard', () => {
  it('returns an HTML string with role=region and aria-label', () => {
    const html = renderKeyboard({ layout: 'qwerty' });
    assert.ok(html.startsWith('<div'));
    assert.ok(html.includes('role="region"'));
    assert.ok(html.includes('aria-label="On-screen keyboard"'));
    assert.ok(html.includes('aria-roledescription="virtual keyboard"'));
  });

  it('emits a button for each key', () => {
    const html = renderKeyboard({ layout: 'qwerty' });
    const buttons = html.match(/<button/g) || [];
    const expected = LAYOUTS.qwerty.rows.flat().length;
    assert.equal(buttons.length, expected);
  });

  it('marks the configured primary action key', () => {
    const html = renderKeyboard({ layout: 'qwerty', primary: 'ENTER' });
    assert.ok(html.includes('bn-kb-key--primary'));
  });

  it('escapes user-supplied label text', () => {
    const html = renderKeyboard({ layout: defineLayout([['<script>']]) });
    assert.ok(!html.includes('<script>'));
    assert.ok(html.includes('&lt;script&gt;'));
  });

  it('applies disabled to every button when disabled=true', () => {
    const html = renderKeyboard({ layout: 'numpad', disabled: true });
    const disabledCount = (html.match(/ disabled/g) || []).length;
    const buttonCount = (html.match(/<button/g) || []).length;
    assert.equal(disabledCount, buttonCount);
  });

  it('uses semantic <button type="button"> so it works without JS', () => {
    const html = renderKeyboard({ layout: 'qwerty' });
    assert.ok(html.includes('type="button"'));
  });
});

describe('Keyboard factory', () => {
  it('returns html and a hydrate function', () => {
    const kb = Keyboard({ layout: 'qwerty' });
    assert.equal(typeof kb.html, 'string');
    assert.equal(typeof kb.hydrate, 'function');
  });
});

describe('keyState', () => {
  it('reads a single letter from a state-map getter', () => {
    let m = { A: 'green', B: 'yellow' };
    const a = keyState(() => m, 'A');
    const c = keyState(() => m, 'C');
    assert.equal(a(), 'green');
    assert.equal(c(), undefined);
    m = { A: 'absent' };
    assert.equal(a(), 'absent');
  });

  it('reads a single letter from a static state map', () => {
    const a = keyState({ A: 'green' }, 'A');
    assert.equal(a(), 'green');
  });
});

// ── Minimal DOM stub so we can exercise hydrateKeyboard without jsdom ──
function fakeButton(opts) {
  return {
    nodeType: 1,
    disabled: false,
    dataset: { ...opts.dataset },
    classList: {
      _set: new Set(),
      add(...c) { for (const x of c) this._set.add(x); },
      remove(...c) { for (const x of c) this._set.delete(x); },
      contains(c) { return this._set.has(c); },
    },
  };
}

function fakeRoot(buttons) {
  const listeners = {};
  return {
    nodeType: 1,
    _attrs: {},
    setAttribute(k, v) { this._attrs[k] = v; },
    getAttribute(k) { return this._attrs[k] || null; },
    addEventListener(name, fn) { (listeners[name] ||= []).push(fn); },
    removeEventListener(name, fn) {
      listeners[name] = (listeners[name] || []).filter(f => f !== fn);
    },
    querySelectorAll(_sel) { return buttons; },
    _fire(name, evt) {
      for (const fn of listeners[name] || []) fn(evt);
    },
  };
}

describe('hydrateKeyboard dispatch', () => {
  it('fires onKey for char-type buttons and onAction for actions', () => {
    const a = fakeButton({ dataset: { kbType: 'char', kbKey: 'A', bnKbKey: '' } });
    const ent = fakeButton({ dataset: { kbType: 'action', kbKey: 'ENTER', bnKbKey: '' } });
    const buttons = [a, ent];
    const root = fakeRoot(buttons);

    const events = [];
    const handle = hydrateKeyboard(root, {
      onKey: (k) => events.push(['key', k]),
      onAction: (k) => events.push(['action', k]),
      bindHardware: false,
      haptic: false,
    });

    // Simulate a click event whose target.closest() resolves to our fake button.
    const evt = { target: { closest: () => a } };
    root._fire('click', evt);

    const evt2 = { target: { closest: () => ent } };
    root._fire('click', evt2);

    assert.deepEqual(events, [['key', 'A'], ['action', 'ENTER']]);

    handle.destroy();
  });

  it('applies state classes from a state getter', () => {
    const a = fakeButton({ dataset: { kbType: 'char', kbKey: 'A' } });
    const b = fakeButton({ dataset: { kbType: 'char', kbKey: 'B' } });
    const buttons = [a, b];
    const root = fakeRoot(buttons);

    let stateMap = { A: 'green', B: 'absent' };
    const handle = hydrateKeyboard(root, {
      state: () => stateMap,
      bindHardware: false,
      haptic: false,
    });

    assert.ok(a.classList.contains('bn-kb-key--green'));
    assert.ok(b.classList.contains('bn-kb-key--absent'));

    // refresh() should pick up new state
    stateMap = { A: 'yellow' };
    handle.refresh();
    assert.ok(a.classList.contains('bn-kb-key--yellow'));
    assert.ok(!a.classList.contains('bn-kb-key--green'));
    assert.ok(!b.classList.contains('bn-kb-key--absent'));

    handle.destroy();
  });

  it('reactivity: runtime.effect rerun applies new classes', () => {
    const a = fakeButton({ dataset: { kbType: 'char', kbKey: 'A' } });
    const root = fakeRoot([a]);

    let map = { A: 'green' };
    let effectFn = null;
    const fakeRuntime = {
      effect(fn) { effectFn = fn; fn(); return () => { effectFn = null; }; },
    };

    const handle = hydrateKeyboard(root, {
      state: () => map,
      runtime: fakeRuntime,
      bindHardware: false,
      haptic: false,
    });

    assert.ok(a.classList.contains('bn-kb-key--green'));

    map = { A: 'absent' };
    effectFn(); // simulate signal-driven re-run
    assert.ok(a.classList.contains('bn-kb-key--absent'));
    assert.ok(!a.classList.contains('bn-kb-key--green'));

    handle.destroy();
  });

  it('refuses to hydrate non-elements', () => {
    assert.throws(() => hydrateKeyboard(null), /DOM element/);
  });
});
