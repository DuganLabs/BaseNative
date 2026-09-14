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

describe('component attribute contract (bn / dataProps)', () => {
  test('register normalises bn and dataProps', () => {
    const p = createPalette();
    const plain = p.register({ type: 'foo' });
    assert.equal(plain.bn, undefined);
    assert.deepEqual(plain.dataProps, []);
    const props = ['variant'];
    const def = p.register({ type: 'bar', bn: 'bar', dataProps: props });
    assert.equal(def.bn, 'bar');
    assert.deepEqual(def.dataProps, ['variant']);
    assert.notEqual(def.dataProps, props, 'dataProps is copied, not shared');
  });

  test('the button declares the token and data props renderButton emits', () => {
    const def = defaultPalette().get('button');
    assert.equal(def.bn, 'button');
    assert.deepEqual([...def.dataProps].sort(), ['size', 'variant']);
    assert.equal(def.defaults.variant, 'primary');
    assert.equal(def.defaults.size, 'default');
  });

  test('every dataProp is a declared prop with a default', () => {
    // A dataProp that is not in the schema cannot be edited in the inspector,
    // and one without a default exports nothing — either way the contract
    // the palette promises is not what the export carries.
    for (const def of defaultPalette().list()) {
      for (const name of def.dataProps) {
        assert.ok(def.props.some((p) => p.name === name), `${def.type}: dataProp "${name}" is not in props`);
        assert.ok(name in def.defaults, `${def.type}: dataProp "${name}" has no default`);
      }
    }
  });

  test('the form controls that have a component counterpart carry its data-bn token', () => {
    const palette = defaultPalette();
    assert.equal(palette.get('input').bn, 'input');
    assert.equal(palette.get('textarea').bn, 'textarea');
    assert.equal(palette.get('checkbox').bn, 'checkbox');
    for (const type of ['section', 'stack', 'grid', 'heading', 'text', 'label', 'form', 'link', 'image', 'signal-text']) {
      assert.equal(palette.get(type).bn, undefined, `${type} has no @basenative/components render function`);
    }
  });
});
