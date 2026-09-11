import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { IconSetError, defineIconSet, renderIcon, validateIconSet } from './icons.js';

const ICONS = {
  activity: '<path d="M3 12h4l3 7 4-14 3 7h4"/>',
  check: '<path d="m4.5 12.5 5 5 10-11"/>',
  'chevron-right': '<path d="M9.5 5 16 12l-6.5 7"/>',
};

const set = defineIconSet({ icons: ICONS });

describe('defineIconSet', () => {
  test('declares the grid and the stroke weight once, with BaseNative defaults', () => {
    assert.equal(set.grid, 24);
    assert.equal(set.strokeWidth, 1.75);
    assert.equal(set.linecap, 'round');
    assert.deepEqual(set.names, ['activity', 'check', 'chevron-right']);
  });

  test('freezes the set so a caller cannot slip an icon in past validation', () => {
    assert.throws(() => {
      set.icons.rogue = '<path d="M0 0"/>';
    }, TypeError);
  });

  test('accepts a set on its own grid at its own weight', () => {
    const wide = defineIconSet({ grid: 32, strokeWidth: 2, icons: ICONS });
    assert.match(renderIcon(wide, 'check'), /viewBox="0 0 32 32"/);
    assert.match(renderIcon(wide, 'check'), /stroke-width="2"/);
  });
});

describe('validateIconSet — the invariants that make a row read as a set', () => {
  const rejects = (body, needle) => {
    const { ok, errors } = validateIconSet({ grid: 24, strokeWidth: 1.75, icons: { x: body } });
    assert.equal(ok, false, `expected "${body}" to be rejected`);
    assert.ok(
      errors.some((e) => e.includes(needle)),
      `expected an error mentioning "${needle}", got:\n  ${errors.join('\n  ')}`,
    );
  };

  test('refuses a fill, because a filled icon reads heavier than its neighbours', () => {
    rejects('<circle cx="12" cy="12" r="6" fill="#2563eb"/>', 'a fill');
  });

  test('refuses a literal colour anywhere in the body', () => {
    rejects('<path d="M3 12h4" stroke-opacity="1"/><path d="M0 0" opacity=".5" data-c="#fff"/>', 'a literal colour');
  });

  test('refuses a baked-in stroke colour', () => {
    rejects('<path d="M3 12h4" stroke="red"/>', 'a baked-in stroke colour');
  });

  test('refuses a per-icon stroke width', () => {
    rejects('<path d="M3 12h4" stroke-width="3"/>', 'its own stroke-width');
  });

  test('refuses an inline style, per BaseNative axiom 2', () => {
    rejects('<path d="M3 12h4" style="stroke:red"/>', 'axiom 2');
  });

  test('refuses its own viewBox', () => {
    rejects('<path viewBox="0 0 16 16" d="M3 12h4"/>', 'its own viewBox');
  });

  test('refuses a nested svg', () => {
    rejects('<svg viewBox="0 0 24 24"><path d="M3 12h4"/></svg>', 'a nested <svg>');
  });

  /*
   * Self-sizing is a property of the OUTER <svg>, which renderIcon writes and a
   * body does not have. Inside a body, width/height are ordinary geometry — and
   * a rule against them made the set unable to express the set this discipline
   * was extracted from, where jobs, reports and inventory are all rects.
   */
  test('accepts width/height as inner-shape geometry', () => {
    const set = defineIconSet({
      icons: {
        jobs: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4"/>',
        reports: '<path d="M4 20V5M4 20h16"/><rect x="7" y="12" width="3" height="5"/>',
      },
    });
    assert.deepEqual(set.names, ['jobs', 'reports']);
    // And the rendered icon still takes its size from renderIcon, not the body.
    assert.match(renderIcon(set, 'jobs'), /^<svg viewBox="0 0 24 24" width="1em" height="1em"/);
  });

  test('accepts fill="none", which is how a stroked shape is drawn', () => {
    const { ok } = validateIconSet({
      grid: 24,
      strokeWidth: 1.75,
      icons: { x: '<path fill="none" d="M3 12h4"/>' },
    });
    assert.equal(ok, true);
  });

  test('refuses an empty body, a non-kebab name, an empty set and a bad grid', () => {
    rejects('   ', 'has an empty body');
    assert.equal(validateIconSet({ grid: 24, strokeWidth: 1.75, icons: { Foo: '<path/>' } }).ok, false);
    assert.equal(validateIconSet({ grid: 24, strokeWidth: 1.75, icons: {} }).ok, false);
    assert.equal(validateIconSet({ grid: 0, strokeWidth: 1.75, icons: ICONS }).ok, false);
    assert.equal(validateIconSet({ grid: 24, strokeWidth: -1, icons: ICONS }).ok, false);
  });

  test('defineIconSet throws an IconSetError carrying every reason', () => {
    try {
      defineIconSet({ icons: { a: '<path fill="#fff" stroke-width="3" d="M0 0"/>' } });
      assert.fail('expected an IconSetError');
    } catch (err) {
      assert.ok(err instanceof IconSetError);
      assert.ok(err.errors.length >= 2, err.errors.join('; '));
    }
  });
});

describe('renderIcon', () => {
  test('draws every icon on the set s grid at the set s weight', () => {
    for (const name of set.names) {
      const svg = renderIcon(set, name);
      assert.match(svg, /viewBox="0 0 24 24"/, name);
      assert.match(svg, /stroke-width="1\.75"/, name);
      assert.match(svg, /stroke="currentColor"/, name);
      assert.match(svg, /fill="none"/, name);
      assert.match(svg, /stroke-linecap="round"/, name);
      assert.equal(svg.includes('fill="#'), false, name);
    }
  });

  test('is decoration by default — an icon beside its own label is not read twice', () => {
    assert.match(renderIcon(set, 'check'), /aria-hidden="true"/);
    assert.equal(renderIcon(set, 'check').includes('role="img"'), false);
  });

  test('becomes its own label when given a title', () => {
    const svg = renderIcon(set, 'check', { title: 'Verified' });
    assert.match(svg, /role="img" aria-label="Verified"/);
    assert.equal(svg.includes('aria-hidden'), false);
  });

  test('escapes a title rather than letting it close the tag', () => {
    const svg = renderIcon(set, 'check', { title: '"><script>x</script>' });
    assert.equal(svg.includes('<script>'), false);
    assert.match(svg, /aria-label="&quot;&gt;&lt;script&gt;/);
  });

  test('tracks the type it sits in by default, and takes an explicit size', () => {
    assert.match(renderIcon(set, 'check'), /width="1em" height="1em"/);
    assert.match(renderIcon(set, 'check', { size: '1.5rem' }), /width="1\.5rem"/);
  });

  test('names the icons it does have when asked for one it does not', () => {
    assert.throws(() => renderIcon(set, 'nope'), (err) => {
      assert.ok(err instanceof IconSetError);
      assert.match(err.message, /have: activity, check, chevron-right/);
      return true;
    });
  });
});
