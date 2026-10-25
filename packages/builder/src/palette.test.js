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

  test('catalogue organisms carry the catalog contract, the rest keep the legacy kit', () => {
    const p = defaultPalette();
    // Organisms with a Holy Trinity counterpart emit that component's
    // markup: a catalog name, a root variant, no data-bn token, and a
    // preview shaped like the component's rendered output.
    const catalog = {
      hero: 'hero',
      list: 'list-group',
      sidebar: 'sidebar',
      toolbar: 'toolbar',
      alert: 'alert',
      'empty-state': 'empty-state',
      'form-organism': 'form',
      'menu-organism': 'dropdown-menu',
      'search-field': 'search-field',
    };
    for (const [type, name] of Object.entries(catalog)) {
      const def = p.get(type);
      assert.ok(def, type);
      assert.equal(def.category, 'organisms', type);
      assert.equal(def.catalog, name, type);
      assert.equal(def.bn, undefined, type);
      assert.ok(def.variant, `${type} stamps a root variant`);
      assert.doesNotMatch(def.preview({ text: 'X' }), /data-bn/, type);
    }
    assert.match(p.get('hero').preview({ text: 'Notes' }), /<figcaption><p>Organism<\/p><h1>Notes<\/h1>/);
    assert.match(p.get('list').preview({ text: 'Inbox' }), /<li>Inbox<\/li><li>Drafts<\/li>/);
    assert.match(
      p.get('sidebar').preview({ text: 'Library' }),
      /<nav aria-label="Sidebar"><section><h2>Library<\/h2>/,
    );
    // Organisms with no catalog counterpart keep the legacy kit contract.
    for (const type of ['window', 'sheet', 'inspector', 'nav-bar', 'metric', 'card-grid', 'scrollbar', 'refraction']) {
      const def = p.get(type);
      assert.ok(def, type);
      assert.equal(def.category, 'organisms', type);
      assert.match(def.bn, /^bn-/, type);
      assert.equal(def.catalog, undefined, type);
    }
    assert.match(p.get('refraction').preview({ text: 'Glass' }), /<figcaption>Glass<\/figcaption>/);
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

describe('component attribute contract (catalog / bn / dataProps)', () => {
  test('register normalises bn, catalog and the prop-serialisation lists', () => {
    const p = createPalette();
    const plain = p.register({ type: 'foo' });
    assert.equal(plain.bn, undefined);
    assert.equal(plain.catalog, undefined);
    assert.deepEqual(plain.dataProps, []);
    assert.deepEqual(plain.variantProps, []);
    const props = ['variant'];
    const def = p.register({ type: 'bar', bn: 'bar', dataProps: props });
    assert.equal(def.bn, 'bar');
    assert.deepEqual(def.dataProps, ['variant']);
    assert.notEqual(def.dataProps, props, 'dataProps is copied, not shared');
    const cat = p.register({ type: 'baz', catalog: 'button', variantProps: props });
    assert.equal(cat.catalog, 'button');
    assert.deepEqual(cat.variantProps, ['variant']);
    assert.notEqual(cat.variantProps, props, 'variantProps is copied, not shared');
  });

  test('the button declares the catalog contract, not the legacy token', () => {
    const def = defaultPalette().get('button');
    assert.equal(def.catalog, 'button');
    assert.equal(def.bn, undefined);
    assert.deepEqual(def.dataProps, []);
    assert.deepEqual(def.variantProps, ['variant']);
    assert.equal(def.defaults.variant, 'primary');
    // The catalog button has no size axis; the palette no longer offers one.
    assert.equal(def.props.some((p) => p.name === 'size'), false);
    const variant = def.props.find((p) => p.name === 'variant');
    assert.deepEqual(variant.options, ['default', 'primary', 'ghost', 'destructive']);
  });

  test('every dataProp and variantProp is a declared prop with a default', () => {
    // A serialised prop that is not in the schema cannot be edited in the
    // inspector, and one without a default exports nothing — either way the
    // contract the palette promises is not what the export carries.
    for (const def of defaultPalette().list()) {
      for (const name of [...def.dataProps, ...def.variantProps]) {
        assert.ok(
          def.props.some((p) => p.name === name),
          `${def.type}: serialised prop "${name}" is not in props`,
        );
        assert.ok(name in def.defaults, `${def.type}: serialised prop "${name}" has no default`);
      }
    }
  });

  test('the form controls that have a catalog counterpart carry its catalog name', () => {
    const palette = defaultPalette();
    assert.equal(palette.get('input').catalog, 'input');
    assert.equal(palette.get('input').variant, 'default');
    assert.equal(palette.get('textarea').catalog, 'textarea');
    assert.equal(palette.get('textarea').variant, 'default');
    assert.equal(palette.get('checkbox').catalog, 'checkbox');
    assert.equal(palette.get('checkbox').tag, 'label');
    assert.equal(palette.get('link').catalog, 'button');
    for (const type of ['input', 'textarea', 'checkbox', 'link']) {
      assert.equal(palette.get(type).bn, undefined, `${type} no longer stamps data-bn`);
    }
    for (const type of [
      'section',
      'stack',
      'grid',
      'heading',
      'text',
      'label',
      'form',
      'image',
      'signal-text',
    ]) {
      assert.equal(
        palette.get(type).bn,
        undefined,
        `${type} has no legacy @basenative/components render function`,
      );
      assert.equal(
        palette.get(type).catalog,
        undefined,
        `${type} has no catalog component of its own`,
      );
    }
  });
});
