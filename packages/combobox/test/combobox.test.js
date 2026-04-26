// Built with BaseNative — basenative.dev
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  Combobox,
  renderCombobox,
  hydrateCombobox,
  normalizeOption,
  defaultFilter,
  prefixFilter,
  fuzzyFilter,
} from '../src/index.js';

// ── normalizeOption ─────────────────────────────────────────
describe('normalizeOption', () => {
  it('lifts strings into { value, label }', () => {
    const o = normalizeOption('Apple');
    assert.equal(o.value, 'Apple');
    assert.equal(o.label, 'Apple');
  });

  it('preserves explicit value/label/hint', () => {
    const o = normalizeOption({ value: 'a', label: 'Apple', hint: 'A' });
    assert.equal(o.value, 'a');
    assert.equal(o.label, 'Apple');
    assert.equal(o.hint, 'A');
  });

  it('falls back label -> value', () => {
    const o = normalizeOption({ value: 'apple' });
    assert.equal(o.label, 'apple');
  });

  it('returns null for nullish input', () => {
    assert.equal(normalizeOption(null), null);
    assert.equal(normalizeOption(undefined), null);
  });
});

// ── filter strategies ──────────────────────────────────────
describe('defaultFilter', () => {
  const opts = [
    { value: 'apple', label: 'Apple' },
    { value: 'banana', label: 'Banana', hint: 'fruit' },
    { value: 'cherry', label: 'Cherry' },
  ];

  it('matches everything for empty query', () => {
    for (const o of opts) assert.equal(defaultFilter(o, ''), true);
  });

  it('case-insensitive substring against label', () => {
    assert.equal(defaultFilter(opts[0], 'app'), true);
    assert.equal(defaultFilter(opts[0], 'APP'), true);
    assert.equal(defaultFilter(opts[0], 'xyz'), false);
  });

  it('also searches value and hint', () => {
    assert.equal(defaultFilter(opts[1], 'fruit'), true);
    assert.equal(defaultFilter(opts[1], 'banana'), true);
  });
});

describe('prefixFilter', () => {
  it('matches only label prefix', () => {
    const o = { value: 'a', label: 'Apple' };
    assert.equal(prefixFilter(o, 'app'), true);
    assert.equal(prefixFilter(o, 'ple'), false);
  });
});

describe('fuzzyFilter', () => {
  it('matches in-order subsequence on label', () => {
    const o = { value: 'a', label: 'Apple' };
    assert.equal(fuzzyFilter(o, 'apl'), true);
    assert.equal(fuzzyFilter(o, 'aple'), true);
    assert.equal(fuzzyFilter(o, 'lpa'), false);
  });
});

// ── renderCombobox SSR shape ───────────────────────────────
describe('renderCombobox', () => {
  it('returns markup with role=combobox + aria-expanded', () => {
    const html = renderCombobox({ id: 'cb1', options: ['A', 'B'] });
    assert.ok(html.includes('role="combobox"'));
    assert.ok(html.includes('aria-expanded="false"'));
    assert.ok(html.includes('aria-haspopup="listbox"'));
  });

  it('emits an input wired to a listbox via aria-controls', () => {
    const html = renderCombobox({ id: 'cb1' });
    assert.ok(html.includes('aria-controls="cb1-listbox"'));
    assert.ok(html.includes('aria-autocomplete="list"'));
  });

  it('listbox is hidden in the SSR snapshot (no layout shift)', () => {
    const html = renderCombobox({ id: 'cb1' });
    // The listbox tag is present but `hidden`.
    assert.ok(/data-bn="cb-listbox"[^>]*hidden/.test(html));
  });

  it('renders a no-JS datalist fallback with all options', () => {
    const html = renderCombobox({ id: 'cb1', options: ['Apple', 'Banana'] });
    assert.ok(html.includes('<datalist id="cb1-datalist">'));
    assert.ok(html.includes('<option value="Apple">'));
  });

  it('escapes user-supplied option labels', () => {
    const html = renderCombobox({ options: ['<script>'] });
    assert.ok(!html.includes('<script>Banana')); // sanity: not collapsed
    assert.ok(html.includes('&lt;script&gt;'));
  });

  it('honors `name` attribute on the input', () => {
    const html = renderCombobox({ id: 'cb1', name: 'category' });
    assert.ok(html.includes('name="category"'));
  });

  it('uses inputmode="text" + autocomplete=off', () => {
    const html = renderCombobox({ id: 'cb1' });
    assert.ok(html.includes('inputmode="text"'));
    assert.ok(html.includes('autocomplete="off"'));
  });

  it('mounts a polite live region for SR announcements', () => {
    const html = renderCombobox({ id: 'cb1' });
    assert.ok(html.includes('aria-live="polite"'));
  });

  it('supports controlled-value reading from a signal accessor', () => {
    const html = renderCombobox({
      id: 'cb1',
      value: () => 'preset',
    });
    assert.ok(html.includes('value="preset"'));
  });
});

describe('Combobox factory', () => {
  it('returns html + hydrate function', () => {
    const cb = Combobox({ options: ['A'] });
    assert.equal(typeof cb.html, 'string');
    assert.equal(typeof cb.hydrate, 'function');
  });
});

// ── Minimal DOM stub mimicking the keyboard test pattern ───
function fakeEl(tag, attrs = {}) {
  const _attrs = { ...attrs };
  const _classes = new Set();
  const _children = [];
  const _listeners = {};
  let _innerHTML = '';
  let _hidden = 'hidden' in _attrs;
  let _value = _attrs.value || '';
  const el = {
    nodeType: 1,
    tagName: tag.toUpperCase(),
    _attrs,
    _children,
    parent: null,
    get id() { return _attrs.id || ''; },
    setAttribute(k, v) {
      if (k === 'hidden') _hidden = true;
      _attrs[k] = String(v);
    },
    getAttribute(k) {
      if (k === 'hidden') return _hidden ? '' : null;
      return _attrs[k] != null ? _attrs[k] : null;
    },
    removeAttribute(k) {
      if (k === 'hidden') _hidden = false;
      delete _attrs[k];
    },
    hasAttribute(k) {
      if (k === 'hidden') return _hidden;
      return Object.prototype.hasOwnProperty.call(_attrs, k);
    },
    classList: {
      add: (...c) => c.forEach(x => _classes.add(x)),
      remove: (...c) => c.forEach(x => _classes.delete(x)),
      contains: (c) => _classes.has(c),
    },
    addEventListener(name, fn) { (_listeners[name] ||= []).push(fn); },
    removeEventListener(name, fn) {
      _listeners[name] = (_listeners[name] || []).filter(f => f !== fn);
    },
    dispatchEvent(name, evt) {
      for (const fn of _listeners[name] || []) fn(evt);
    },
    _fire(name, evt) { return el.dispatchEvent(name, evt); },
    appendChild(c) { c.parent = el; _children.push(c); return c; },
    contains(other) {
      if (!other) return false;
      let cur = other;
      while (cur) { if (cur === el) return true; cur = cur.parent; }
      return false;
    },
    focus() { el._focused = true; },
    scrollIntoView() { /* noop */ },
    closest(sel) {
      let cur = el;
      while (cur) {
        if (matchesSel(cur, sel)) return cur;
        cur = cur.parent;
      }
      return null;
    },
    set innerHTML(v) {
      _innerHTML = String(v);
      // Rebuild "child" options list when innerHTML changes — we only
      // need to model what the combobox queries (cb-option items).
      _children.length = 0;
      const re = /<li[^>]*data-bn="cb-option"[^>]*>/g;
      let m;
      while ((m = re.exec(_innerHTML))) {
        const tag = m[0];
        const idMatch = /\sid="([^"]+)"/.exec(tag);
        const idxMatch = /data-index="(\d+)"/.exec(tag);
        const valMatch = /data-value="([^"]*)"/.exec(tag);
        const createMatch = /data-bn-cb-create="true"/.test(tag);
        const child = fakeEl('li', {
          id: idMatch ? idMatch[1] : '',
          'data-bn': 'cb-option',
          'data-index': idxMatch ? idxMatch[1] : '0',
          'data-value': valMatch ? valMatch[1] : '',
          ...(createMatch ? { 'data-bn-cb-create': 'true' } : {}),
        });
        _children.push(child);
        child.parent = el;
      }
    },
    get innerHTML() { return _innerHTML; },
    set textContent(v) { _innerHTML = String(v); },
    get textContent() { return _innerHTML; },
    set value(v) { _value = String(v); },
    get value() { return _value; },
    querySelector(sel) {
      // Tiny matcher for the few selectors the combobox actually uses.
      return findOne(el, sel);
    },
    querySelectorAll(sel) {
      return findAll(el, sel);
    },
  };
  return el;
}

function attrEq(el, key, val) {
  return el._attrs && el._attrs[key] === val;
}

function matchesSel(el, sel) {
  // Supports `[data-bn="x"]` and combinations of those used in src.
  const m = /^\[data-bn="([^"]+)"\]$/.exec(sel);
  if (m) return attrEq(el, 'data-bn', m[1]);
  return false;
}

function findOne(root, sel) {
  for (const c of root._children) {
    if (matchesSel(c, sel)) return c;
    const r = findOne(c, sel);
    if (r) return r;
  }
  return null;
}

function findAll(root, sel) {
  const out = [];
  function walk(n) {
    for (const c of n._children) {
      if (matchesSel(c, sel)) out.push(c);
      walk(c);
    }
  }
  walk(root);
  return out;
}

function buildRoot() {
  const root = fakeEl('div', { id: 'cb1', 'data-bn': 'combobox' });
  const field = fakeEl('div', { 'data-bn': 'cb-field' });
  const input = fakeEl('input', { 'data-bn': 'cb-input', id: 'cb1-input' });
  const toggle = fakeEl('button', { 'data-bn': 'cb-toggle' });
  const listbox = fakeEl('ul', { 'data-bn': 'cb-listbox', id: 'cb1-listbox', hidden: '' });
  const live = fakeEl('span', { 'data-bn': 'cb-live' });
  field.appendChild(input);
  field.appendChild(toggle);
  root.appendChild(field);
  root.appendChild(listbox);
  root.appendChild(live);
  return { root, input, toggle, listbox, live };
}

// ── Hydration & behavior ───────────────────────────────────
describe('hydrateCombobox — open / filter / commit', () => {
  it('opens the listbox on focus and renders options', () => {
    const { root, input, listbox } = buildRoot();
    const handle = hydrateCombobox(root, {
      options: ['Apple', 'Banana', 'Cherry'],
    });
    assert.ok(listbox.hasAttribute('hidden'));

    input._fire('focus', { target: input });

    assert.ok(!listbox.hasAttribute('hidden'));
    assert.equal(root.getAttribute('aria-expanded'), 'true');
    assert.equal(input.getAttribute('aria-expanded'), 'true');
    const visible = handle._getVisible();
    assert.equal(visible.length, 3);
    handle.destroy();
  });

  it('filters by current input value when the user types', () => {
    const { root, input } = buildRoot();
    const handle = hydrateCombobox(root, {
      options: ['Apple', 'Banana', 'Cherry'],
    });
    input._fire('focus', {});
    input.value = 'an';
    input._fire('input', { target: input });
    const visible = handle._getVisible();
    // 'Banana' contains 'an', 'Apple' / 'Cherry' do not.
    assert.equal(visible.length, 1);
    assert.equal(visible[0].option.label, 'Banana');
    handle.destroy();
  });

  it('clicking an option fires onChange and closes', () => {
    const { root, input, listbox } = buildRoot();
    const events = [];
    const handle = hydrateCombobox(root, {
      options: ['Apple', 'Banana'],
      onChange: (v) => events.push(v),
    });
    input._fire('focus', {});
    const items = listbox._children;
    assert.ok(items.length >= 2);

    const target = items[1];
    listbox._fire('click', { target });

    assert.deepEqual(events, ['Banana']);
    assert.ok(listbox.hasAttribute('hidden'));
    assert.equal(input.value, 'Banana');
    handle.destroy();
  });

  it('ArrowDown opens + activates first; Enter commits', () => {
    const { root, input } = buildRoot();
    const events = [];
    const handle = hydrateCombobox(root, {
      options: ['Apple', 'Banana'],
      onChange: (v) => events.push(v),
    });

    input._fire('keydown', {
      key: 'ArrowDown', preventDefault() {},
    });
    // Visible options + active 0
    assert.equal(handle._getVisible()[0].option.value, 'Apple');

    input._fire('keydown', {
      key: 'Enter', preventDefault() {},
    });
    assert.deepEqual(events, ['Apple']);
    handle.destroy();
  });

  it('Escape closes without committing', () => {
    const { root, input, listbox } = buildRoot();
    const events = [];
    const handle = hydrateCombobox(root, {
      options: ['Apple'],
      onChange: (v) => events.push(v),
    });
    input._fire('focus', {});
    input._fire('keydown', { key: 'ArrowDown', preventDefault() {} });
    input._fire('keydown', { key: 'Escape', preventDefault() {} });
    assert.ok(listbox.hasAttribute('hidden'));
    assert.deepEqual(events, []);
    handle.destroy();
  });

  it('Home / End jump to first / last', () => {
    const { root, input } = buildRoot();
    const events = [];
    const handle = hydrateCombobox(root, {
      options: ['A', 'B', 'C', 'D'],
      onChange: (v) => events.push(v),
    });
    input._fire('focus', {});
    input._fire('keydown', { key: 'End', preventDefault() {} });
    input._fire('keydown', { key: 'Enter', preventDefault() {} });
    assert.deepEqual(events, ['D']);
    handle.destroy();
  });
});

describe('hydrateCombobox — create flow', () => {
  it('shows a "+ Create" entry when allowCreate + non-empty + no exact match', () => {
    const { root, input } = buildRoot();
    const handle = hydrateCombobox(root, {
      options: ['Apple', 'Banana'],
      allowCreate: true,
    });
    input._fire('focus', {});
    input.value = 'Cucumber';
    input._fire('input', { target: input });
    const visible = handle._getVisible();
    // No matches + create row.
    assert.equal(visible.length, 1);
    assert.equal(visible[0].kind, 'create');
    assert.equal(visible[0].query, 'Cucumber');
    handle.destroy();
  });

  it('SUPPRESSES the create entry when query exactly matches an existing label', () => {
    const { root, input } = buildRoot();
    const handle = hydrateCombobox(root, {
      options: ['Apple', 'Banana'],
      allowCreate: true,
    });
    input._fire('focus', {});
    input.value = 'Apple';
    input._fire('input', { target: input });
    const visible = handle._getVisible();
    // Only the matching option, no create row.
    assert.equal(visible.length, 1);
    assert.equal(visible[0].kind, 'opt');
    assert.equal(visible[0].option.label, 'Apple');
    handle.destroy();
  });

  it('exact match suppression is case-insensitive', () => {
    const { root, input } = buildRoot();
    const handle = hydrateCombobox(root, {
      options: ['Apple'],
      allowCreate: true,
    });
    input._fire('focus', {});
    input.value = 'apple';
    input._fire('input', { target: input });
    const visible = handle._getVisible();
    assert.equal(visible.length, 1);
    assert.equal(visible[0].kind, 'opt');
    handle.destroy();
  });

  it('committing the create entry calls onCreate with the typed label and does NOT wipe input', () => {
    const { root, input } = buildRoot();
    const created = [];
    const handle = hydrateCombobox(root, {
      options: ['Apple'],
      allowCreate: true,
      onCreate: (label) => created.push(label),
    });
    input._fire('focus', {});
    input.value = 'Cucumber';
    input._fire('input', { target: input });
    input._fire('keydown', { key: 'ArrowDown', preventDefault() {} });
    input._fire('keydown', { key: 'Enter', preventDefault() {} });
    assert.deepEqual(created, ['Cucumber']);
    assert.equal(input.value, 'Cucumber'); // never wiped
    handle.destroy();
  });

  it('without onCreate, allowCreate falls through to onChange(typed)', () => {
    const { root, input } = buildRoot();
    const changed = [];
    const handle = hydrateCombobox(root, {
      options: ['Apple'],
      allowCreate: true,
      onChange: (v) => changed.push(v),
    });
    input._fire('focus', {});
    input.value = 'Carrot';
    input._fire('input', { target: input });
    input._fire('keydown', { key: 'ArrowDown', preventDefault() {} });
    input._fire('keydown', { key: 'Enter', preventDefault() {} });
    assert.deepEqual(changed, ['Carrot']);
    handle.destroy();
  });

  it('empty query does not show a create entry even with allowCreate', () => {
    const { root, input } = buildRoot();
    const handle = hydrateCombobox(root, {
      options: ['Apple'],
      allowCreate: true,
    });
    input._fire('focus', {});
    const visible = handle._getVisible();
    // Just the existing option, no create row.
    assert.equal(visible.length, 1);
    assert.equal(visible[0].kind, 'opt');
    handle.destroy();
  });

  it('uses the createLabel function for the entry text', () => {
    const { root, input, listbox } = buildRoot();
    const handle = hydrateCombobox(root, {
      options: [],
      allowCreate: true,
      createLabel: (q) => `+ NEW "${q.toUpperCase()}"`,
    });
    input._fire('focus', {});
    input.value = 'foo';
    input._fire('input', { target: input });
    assert.ok(listbox.innerHTML.includes('+ NEW &quot;FOO&quot;'));
    handle.destroy();
  });
});

describe('hydrateCombobox — ARIA wiring on hydrate', () => {
  it('sets role + haspopup + expanded on root and input', () => {
    const { root, input } = buildRoot();
    const handle = hydrateCombobox(root, { options: ['A'] });
    assert.equal(root.getAttribute('role'), 'combobox');
    assert.equal(root.getAttribute('aria-haspopup'), 'listbox');
    assert.equal(root.getAttribute('aria-expanded'), 'false');
    assert.equal(input.getAttribute('aria-autocomplete'), 'list');
    assert.equal(input.getAttribute('aria-controls'), 'cb1-listbox');
    handle.destroy();
  });

  it('updates aria-activedescendant on arrow nav', () => {
    const { root, input } = buildRoot();
    const handle = hydrateCombobox(root, { options: ['Apple', 'Banana'] });
    input._fire('focus', {});
    input._fire('keydown', { key: 'ArrowDown', preventDefault() {} });
    const ad = input.getAttribute('aria-activedescendant');
    assert.ok(ad, 'aria-activedescendant should be set');
    assert.ok(ad.startsWith('cb1-opt-'));
    handle.destroy();
  });
});

describe('hydrateCombobox — error paths', () => {
  it('refuses to hydrate non-elements', () => {
    assert.throws(() => hydrateCombobox(null), /DOM element/);
  });
});
