/* Design-system conformance: stylesheet-level rules, one per defect
 * class found in a browser sweep of basenative.com. Geometry that needs
 * a browser lives in tests/e2e/layout.spec.js; the map from defect to
 * rule to test is docs/conformance.md. These assert the rule is in the
 * component layer, where every page inherits it, rather than patched
 * per page. */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SRC = dirname(fileURLToPath(import.meta.url));
const read = (p) => readFileSync(join(SRC, p), 'utf8');
const tokens = read('tokens.css');
const px = (name) => {
  const m = tokens.match(new RegExp(`--${name}:\\s*([^;]+);`));
  assert.ok(m, `token --${name} is defined`);
  const v = m[1].trim();
  const ref = v.match(/^var\(--([\w-]+)\)$/);
  if (ref) return px(ref[1]);
  const rem = v.match(/^([\d.]+)rem$/);
  if (rem) return Number(rem[1]) * 16;
  const p = v.match(/^([\d.]+)px$/);
  if (p) return Number(p[1]);
  throw new Error(`--${name}: cannot resolve ${v}`);
};
/* Rule bodies keyed by selector text, in source order, comments removed. */
const rules = (css) => {
  const out = [];
  const re = /([^{}]+)\{([^{}]*)\}/g;
  const text = css.replace(/\/\*[\s\S]*?\*\//g, '');
  let m;
  while ((m = re.exec(text)))
    out.push({ selector: m[1].trim().replace(/\s+/g, ' '), body: m[2], at: m.index });
  return out;
};

describe('conformance — the stack primitive (component pages stacked cards with no gap)', () => {
  const shell = rules(read('app-shell/styles.css'));
  const stack = shell.find((r) => r.body.includes('--spacing-app-shell-stack-gap'));

  it('the shell declares one stack rule on the stack gap token', () => {
    assert.ok(stack, 'app-shell has a rule on --spacing-app-shell-stack-gap');
    assert.match(stack.body, /margin-block-start:\s*var\(--spacing-app-shell-stack-gap\)/);
  });

  it('the stack covers every block surface, with or without a variant', () => {
    for (const el of [
      'figure',
      'table',
      'pre',
      'details',
      'article',
      'section',
      'form',
      'dl',
      'iframe',
    ]) {
      assert.match(stack.selector, new RegExp(`[ (,]${el}[,)]`), `${el} is stacked`);
    }
    assert.doesNotMatch(
      stack.selector,
      /figure\[variant\]|table\[variant\]/,
      'a surface is stacked whatever its variant; a plain figure or table is not exempt',
    );
  });

  it('the stack leaves the inside of a component to the component', () => {
    assert.match(stack.selector, /:not\(:where\(\[variant\]\)\)/);
  });

  it('the stack gap is at least 16px', () => {
    assert.ok(px('spacing-app-shell-stack-gap') >= 16);
  });

  it('the stack is a layout-layer default, so a host grid can reset it and a section gap beats it', () => {
    const css = read('app-shell/styles.css').replace(/\/\*[\s\S]*?\*\//g, '');
    const layer = css.match(/@layer layout \{([\s\S]*?)\n\}/);
    assert.ok(layer, 'app-shell declares @layer layout');
    assert.match(
      layer[1],
      /--spacing-app-shell-stack-gap/,
      'the stack rule is inside @layer layout',
    );
    const section = shell.find((r) => r.body.includes('var(--spacing-app-shell-section-gap)'));
    assert.ok(section, 'a section-gap rule exists');
    assert.doesNotMatch(
      layer[1],
      /--spacing-app-shell-section-gap/,
      'the section gap stays unlayered',
    );
    assert.match(
      section.selector,
      /main\[variant="default"\] > article > \* \+ :is\(section, aside\)/,
    );
  });

  it('the section gap is at least three stack gaps, so a section never reads as a stack', () => {
    assert.ok(px('spacing-app-shell-section-gap') >= 3 * px('spacing-app-shell-stack-gap'));
    assert.ok(px('spacing-app-shell-section-gap-rail') >= px('spacing-app-shell-section-gap'));
  });

  it('a component whose root is a block surface leaves its block margin to the host, so the stack can space it', () => {
    const offenders = [];
    for (const dir of readdirSync(SRC, { withFileTypes: true })) {
      if (!dir.isDirectory()) continue;
      const file = join(SRC, dir.name, 'styles.css');
      // An avatar is an inline figure that sits in a row of its peers;
      // it keeps margin 0 so the stack never drops it below them.
      if (!existsSync(file) || dir.name === 'avatar') continue;
      const css = readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
      for (const m of css.matchAll(/^([^\s@}][^{]*)\{([\s\S]*?)^\}/gm)) {
        const roots = m[1].split(',').map((s) => s.trim());
        if (
          !roots.some((r) =>
            /^(figure|table|pre|details|article|section|form|dl|iframe|ul|ol)\[/.test(r),
          )
        )
          continue;
        if (/^ {2}margin(-block(-start|-end)?)?:/m.test(m[2]))
          offenders.push(`${dir.name}: ${m[1].trim()}`);
      }
    }
    assert.deepEqual(
      offenders,
      [],
      'set margin-inline at the root; the block margin is the host stack',
    );
  });
});
