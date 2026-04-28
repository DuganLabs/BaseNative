import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createPalette, createDefaultPalette, BUILTIN_DEFINITIONS } from './palette.js';

describe('createPalette', () => {
  it('starts empty', () => {
    const p = createPalette();
    assert.deepEqual(p.list(), []);
  });

  it('register requires a type', () => {
    const p = createPalette();
    assert.throws(() => p.register({}), /type/);
  });

  it('register applies sensible defaults', () => {
    const p = createPalette();
    const def = p.register({ type: 'foo' });
    assert.equal(def.label, 'foo');
    assert.equal(def.category, 'general');
    assert.equal(def.tag, 'foo');
    assert.equal(def.container, true);
    assert.deepEqual(def.defaultProps, {});
  });

  it('get / has / unregister round-trip', () => {
    const p = createPalette();
    p.register({ type: 'foo' });
    assert.equal(p.has('foo'), true);
    assert.ok(p.get('foo'));
    assert.equal(p.unregister('foo'), true);
    assert.equal(p.has('foo'), false);
    assert.equal(p.get('foo'), null);
  });

  it('search matches type, label, category', () => {
    const p = createPalette();
    p.register({ type: 'btn', label: 'Action button', category: 'controls' });
    assert.equal(p.search('btn').length, 1);
    assert.equal(p.search('action').length, 1);
    assert.equal(p.search('controls').length, 1);
    assert.equal(p.search('zzz').length, 0);
  });

  it('categories groups by category', () => {
    const p = createPalette();
    p.register({ type: 'a', category: 'x' });
    p.register({ type: 'b', category: 'x' });
    p.register({ type: 'c', category: 'y' });
    const map = p.categories();
    assert.equal(map.get('x').length, 2);
    assert.equal(map.get('y').length, 1);
  });
});

describe('createDefaultPalette', () => {
  it('contains all builtins', () => {
    const p = createDefaultPalette();
    assert.equal(p.list().length, BUILTIN_DEFINITIONS.length);
  });

  it('has core building blocks', () => {
    const p = createDefaultPalette();
    for (const type of ['main', 'section', 'heading', 'paragraph', 'button', 'input', 'form']) {
      assert.ok(p.has(type), `missing ${type}`);
    }
  });

  it('button is non-container with click event', () => {
    const p = createDefaultPalette();
    const def = p.get('button');
    assert.equal(def.container, false);
    assert.ok(def.inspectableEvents.includes('click'));
  });

  it('input is self-closing with value binding', () => {
    const p = createDefaultPalette();
    const def = p.get('input');
    assert.equal(def.selfClosing, true);
    assert.ok(def.inspectableBindings.includes('value'));
  });
});
