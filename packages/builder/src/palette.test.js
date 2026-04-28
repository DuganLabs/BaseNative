import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { createPalette, defaultPalette } from './palette.js';

describe('createPalette', () => {
  test('register requires a type', () => {
    const p = createPalette();
    assert.throws(() => p.register({}));
  });

  test('register fills defaults', () => {
    const p = createPalette();
    const def = p.register({ type: 'foo' });
    assert.equal(def.type, 'foo');
    assert.equal(def.label, 'foo');
    assert.equal(def.category, 'general');
    assert.equal(def.tag, 'foo');
    assert.equal(def.container, false);
    assert.deepEqual(def.props, []);
  });

  test('list, get, byCategory, categories, search', () => {
    const p = createPalette();
    p.register({ type: 'a', category: 'x', label: 'Alpha' });
    p.register({ type: 'b', category: 'x', label: 'Bravo' });
    p.register({ type: 'c', category: 'y', label: 'Cee' });

    assert.equal(p.list().length, 3);
    assert.equal(p.get('a').label, 'Alpha');
    assert.equal(p.get('missing'), null);
    assert.equal(p.byCategory('x').length, 2);
    assert.deepEqual(new Set(p.categories()), new Set(['x', 'y']));
    assert.equal(p.search('alpha').length, 1);
    assert.equal(p.search('').length, 3);
    assert.equal(p.search('zzz').length, 0);
  });

  test('unregister removes a definition', () => {
    const p = createPalette();
    p.register({ type: 'a' });
    assert.equal(p.unregister('a'), true);
    assert.equal(p.get('a'), null);
    assert.equal(p.unregister('missing'), false);
  });
});

describe('defaultPalette', () => {
  test('registers core components', () => {
    const p = defaultPalette();
    assert.ok(p.get('section'));
    assert.ok(p.get('button'));
    assert.ok(p.get('input'));
    assert.ok(p.get('text'));
    assert.ok(p.get('signal-text'));
  });

  test('button is non-container', () => {
    const p = defaultPalette();
    assert.equal(p.get('button').container, false);
  });

  test('section is a container', () => {
    const p = defaultPalette();
    assert.equal(p.get('section').container, true);
  });

  test('input has signal-kind value prop', () => {
    const p = defaultPalette();
    const input = p.get('input');
    const valueProp = input.props.find((x) => x.name === 'value');
    assert.equal(valueProp.kind, 'signal');
  });
});
