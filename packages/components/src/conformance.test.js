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
  if (v === '0') return 0;
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

/* A token's final keyword, following var() references. */
const keyword = (name) => {
  const m = tokens.match(new RegExp(`--${name}:\\s*([^;]+);`));
  assert.ok(m, `token --${name} is defined`);
  const ref = m[1].trim().match(/^var\(--([\w-]+)\)$/);
  return ref ? keyword(ref[1]) : m[1].trim();
};

describe('conformance — table text (the /ai "From" column broke mid-word)', () => {
  const table = rules(read('table/styles.css'));

  it('a column cell wraps between words; code wraps at its marked parts', () => {
    // A restacked cell spans the container, so anywhere there only splits
    // a token longer than the whole line; in a column it shrank the
    // column below its longest word.
    assert.equal(keyword('overflow-wrap-table-cell'), 'break-word');
    const code = table.find((r) => /& td code/.test(r.selector));
    assert.ok(code, 'table styles code inside a cell');
    assert.match(code.body, /overflow-wrap:\s*var\(--overflow-wrap-table-cell-code\)/);
    // Code wraps break-word, not anywhere: anywhere let a column shrink
    // below an identifier part, so on CI's wider mono @basenative/hmr broke
    // mid-name. The <wbr> at each part sets the column's min-content.
    assert.equal(keyword('overflow-wrap-table-cell-code'), 'break-word');
  });

  it('a column heading holds one line', () => {
    const head = table.find((r) => r.selector === '& > thead th');
    assert.ok(head, 'table styles its column headings');
    assert.match(head.body, /white-space:\s*var\(--white-space-table-head\)/);
    assert.equal(keyword('white-space-table-head'), 'nowrap');
  });
});

/* The full body of the top-level rule whose selector is `selector`,
   nested rules included, comments removed. */
const block = (css, selector) => {
  const text = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const start = text.indexOf(`${selector} {`);
  if (start < 0) return null;
  let depth = 0;
  for (let i = text.indexOf('{', start); i < text.length; i++) {
    if (text[i] === '{') depth++;
    else if (text[i] === '}' && --depth === 0) return text.slice(text.indexOf('{', start) + 1, i);
  }
  return null;
};

describe('conformance — the datagrid sort header (chevron under the label, a fill on the sorted column)', () => {
  const css = read('datagrid/styles.css');
  const head = block(css, 'table[variant="datagrid"] > thead th[aria-sort]');

  it('the sorted header paints no fill of its own; the chevron marks the sort', () => {
    assert.ok(head, 'datagrid styles the sort header');
    assert.doesNotMatch(head, /background/);
    assert.doesNotMatch(tokens, /--color-bkg-datagrid-sorted:/);
  });

  it('the chevron is inline after the label, on one line with it', () => {
    assert.match(head, /white-space:\s*var\(--white-space-datagrid-sort-head\)/);
    assert.equal(keyword('white-space-datagrid-sort-head'), 'nowrap');
    const icon = block(head, '  & > svg') ?? block(head, '& > svg');
    assert.ok(icon, 'datagrid styles the sort chevron');
    assert.match(icon, /display:\s*var\(--display-datagrid-sort-icon\)/);
    assert.match(keyword('display-datagrid-sort-icon'), /^inline/);
    assert.equal(keyword('vertical-align-datagrid-sort-icon'), 'middle');
  });
});

describe('conformance — fields hold block controls (a <p> root split the select demo)', () => {
  /* Elements whose content model is phrasing only. A component whose
   * root is one of these cannot nest a block control: the parser closes
   * it at the first <section>, and the label is left behind. */
  const PHRASING_ONLY = new Set([
    'p',
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'label',
    'button',
    'legend',
    'summary',
    'pre',
    'span',
  ]);
  const VOID = new Set([
    'area',
    'br',
    'col',
    'embed',
    'hr',
    'img',
    'input',
    'link',
    'meta',
    'source',
    'track',
    'wbr',
    'template',
  ]);
  /* Slots that take phrasing by contract: an icon, a heading's title,
   * a rating star. Every other slot takes a control or a block. */
  const PHRASING_SLOT = /(icon|title|star)Html$/i;
  /* The element that directly encloses each block slot. */
  const slotHosts = (html) => {
    const hosts = [];
    const stack = [];
    const re = /<\/?([a-z][a-z0-9]*)\b[^>]*?(\/?)>|\{\{\s*raw\((\w+Html)\(\)\)\s*\}\}/g;
    let m;
    while ((m = re.exec(html))) {
      if (m[3]) {
        if (!PHRASING_SLOT.test(m[3])) hosts.push(stack[stack.length - 1] ?? '(root)');
      } else if (VOID.has(m[1]) || m[2]) continue;
      else if (m[0][1] === '/') stack.pop();
      else stack.push(m[1]);
    }
    return hosts;
  };
  const templates = readdirSync(SRC, { withFileTypes: true })
    .filter((d) => d.isDirectory() && existsSync(join(SRC, d.name, 'index.html')))
    .map((d) => [d.name, read(`${d.name}/index.html`)]);

  it('every slot that takes rendered HTML sits in flow content', () => {
    const field = slotHosts(read('field/index.html'));
    assert.ok(field.length > 0, 'field nests its control');
    for (const [n, html] of templates) {
      for (const host of slotHosts(html))
        assert.ok(
          !PHRASING_ONLY.has(host),
          `${n}: a rendered-HTML slot inside <${host}> cannot hold a block control`,
        );
    }
  });

  it('the field stylesheet keys on its flow root', () => {
    const css = read('field/styles.css');
    assert.match(css, /^section\[variant="field"\] \{/m);
    assert.doesNotMatch(css, /^p\[variant=/m);
  });
});

describe('conformance — the catalog select owns its chevron (the site sheet pushed it under the box)', () => {
  const site = readFileSync(
    join(SRC, '..', '..', '..', 'examples', 'express', 'public', 'styles.css'),
    'utf8',
  );
  it("the native select carries a variant, so the site's bare-select rules skip it", () => {
    assert.match(read('select/index.html'), /<select variant="native"/);
    const selectors = rules(site)
      .map((r) => r.selector)
      .filter((sel) => /(^|[\s,])select:not\(\[data-bn\]/.test(sel));
    assert.ok(selectors.length > 0, 'the site styles bare selects');
    for (const sel of selectors)
      assert.match(sel, /:not\(\[variant\]\)/, `${sel} must skip a catalog select`);
  });
});

describe('conformance — playground panes (three editors squeezed to 149px at 768)', () => {
  const sheet = readFileSync(
    join(SRC, '..', '..', '..', 'examples', 'express', 'public', 'playground.css'),
    'utf8',
  ).replace(/\/\*[\s\S]*?\*\//g, '');
  it('the panels go three-up from a container query, not a viewport query', () => {
    assert.match(
      sheet,
      /section\[aria-label='Playground workspace'\]\s*\{[^}]*container:\s*playground-workspace\s*\/\s*inline-size/,
    );
    const media = sheet.match(/@media[^{]*\{[\s\S]*?\n\}/g) || [];
    for (const block of media)
      assert.doesNotMatch(block, /repeat\(3/, 'a viewport query sets three columns');
    const three = sheet.match(
      /@container playground-workspace \(min-width: (\d+)px\)\s*\{[\s\S]*?repeat\(3, minmax\((\d+)px, 1fr\)\)/,
    );
    assert.ok(three, 'a container query sets the three columns');
    assert.ok(Number(three[2]) >= 360, 'each column gets at least 360px');
    assert.ok(
      Number(three[1]) >= 3 * 360 + 2 * 16,
      'the query waits for three 360px panels and their gaps',
    );
  });
});

describe('conformance — surfaces own their spacing (a 16px band under every preview)', () => {
  const site = readFileSync(
    join(SRC, '..', '..', '..', 'examples', 'express', 'public', 'styles.css'),
    'utf8',
  ).replace(/\/\*[\s\S]*?\*\//g, '');
  const block = (re) => {
    const m = site.match(re);
    assert.ok(m, `no block for ${re}`);
    return m[1];
  };
  it('the hero caption is spaced by its gap alone', () => {
    assert.equal(px('spacing-hero-actions-margin-block-start'), 0);
  });
  it('the preview tray carries no outward margin into its figure', () => {
    assert.match(block(/& > output \{([^}]*)\}/), /\bmargin:\s*0\b/);
  });
  it('items in the hero caption grid carry no block margin', () => {
    assert.doesNotMatch(
      block(/figure\[variant='stacked'\] > figcaption > dl \{([^}]*)\}/),
      /margin-block/,
    );
    assert.doesNotMatch(block(/\[data-bn-hero-demo\] \{([^}]*)\}/), /margin-block/);
  });
  it('the site spaces only its own bare fieldsets, not catalog ones', () => {
    for (const m of site.matchAll(/([^{}]*)label \+ label\s*\{/g))
      assert.match(m[1], /fieldset:not\(\[variant\]\) > $/, `unscoped: ${m[1].trim()}`);
  });
});

describe('conformance — check controls keep their size; the row is the 44px target', () => {
  const sheet = (name) => readFileSync(new URL(`./${name}/styles.css`, import.meta.url), 'utf8');
  it('the checkbox label holds the touch minimum', () => {
    assert.ok(px('size-checkbox-min-block') >= 44);
    assert.match(sheet('checkbox'), /min-block-size:\s*var\(--size-checkbox-min-block\)/);
  });
  it('each radio option row holds the touch minimum', () => {
    assert.ok(px('size-radio-option-min-block') >= 44);
    assert.match(sheet('radio'), /min-block-size:\s*var\(--size-radio-option-min-block\)/);
  });
});

describe('conformance — nothing paints over text or the tab bar', () => {
  const sheet = (name) => readFileSync(new URL(`./${name}/styles.css`, import.meta.url), 'utf8');
  it('the alert dismiss control takes a grid column, not an overlay', () => {
    assert.match(tokens, /--position-alert-dismiss:\s*var\(--position-static\)/);
    assert.match(sheet('alert'), /grid-column:\s*var\(--grid-column-alert-dismiss\)/);
    assert.doesNotMatch(sheet('alert'), /inset-inline-end/);
  });
  it('the fixed app bar sits on the chrome layer, above raised content', () => {
    assert.match(sheet('app-bar'), /z-index:\s*var\(--layer-app-bar\)/);
    const layer = (n) => Number(tokens.match(new RegExp(`--layer-${n}:\\s*(\\d+);`))?.[1]);
    assert.ok(layer('chrome') > layer('raised'), 'chrome above raised');
  });
});

describe('conformance — tint and status text hold AA in light mode', () => {
  const sheet = (name) => readFileSync(new URL(`./${name}/styles.css`, import.meta.url), 'utf8');
  const light = tokens.slice(0, tokens.indexOf('@media'));
  const hex = (name) => {
    const m = light.match(new RegExp(`--${name}:\\s*#([0-9a-f]{6});`, 'i'));
    assert.ok(m, `--${name} is a hex literal`);
    return [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16));
  };
  const fill = (name) => {
    const m = light.match(new RegExp(`--${name}:\\s*rgb\\((\\d+) (\\d+) (\\d+) / ([\\d.]+)\\);`));
    assert.ok(m, `--${name} is an rgb/alpha literal`);
    return { c: [m[1], m[2], m[3]].map(Number), a: Number(m[4]) };
  };
  const lin = (v) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  const lum = (c) => 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2]);
  const ratio = (a, b) => {
    const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
    return (x + 0.05) / (y + 0.05);
  };
  const grouped = [242, 242, 247];
  it('each -strong text color holds 4.5 on its own fill over the grouped surface', () => {
    for (const k of ['tint', 'danger', 'success', 'warning']) {
      const f = fill(`color-${k}-fill`);
      const bg = f.c.map((v, i) => v * f.a + grouped[i] * (1 - f.a));
      const r = ratio(hex(`color-${k}-strong`), bg);
      assert.ok(r >= 4.5, `--color-${k}-strong on its fill: ${r.toFixed(2)}`);
    }
  });
  it('white holds 4.5 on the destructive button, in both schemes', () => {
    assert.match(sheet('button'), /--color-bkg-button: var\(--color-danger-solid\)/);
    for (const v of tokens.matchAll(/--color-danger-solid(?:-pressed)?:\s*#([0-9a-f]{6});/gi)) {
      const c = [0, 2, 4].map((i) => parseInt(v[1].slice(i, i + 2), 16));
      assert.ok(ratio([255, 255, 255], c) >= 4.5, `white on #${v[1]}`);
    }
  });
  it('the ghost button and the info badge paint text in the strong tint, never the fill tint', () => {
    assert.match(
      sheet('button'),
      /variant="ghost"\][^}]*--color-text-button: var\(--color-tint-strong\)/s,
    );
    assert.doesNotMatch(sheet('badge'), /--color-text-badge: var\(--color-tint\);/);
  });
});

describe('conformance — every control is a 44px target (pagination, breadcrumb, tabs, menus, tree rows under 44)', () => {
  const sheet = (name) => readFileSync(new URL(`./${name}/styles.css`, import.meta.url), 'utf8');
  it('the shared target minimum is 44px', () => {
    assert.match(tokens, /--size-target-min:\s*2\.75rem;|--size-target-min:\s*44px;/);
  });
  it('link and item controls reserve the target minimum', () => {
    const cases = {
      pagination: /min-inline-size: var\(--size-target-min\)/,
      breadcrumb: /min-inline-size: var\(--size-target-min\)/,
      'site-footer': /min-inline-size: var\(--size-target-min\)/,
      'dropdown-menu': /min-block-size: var\(--size-target-min\)/,
      tabs: /min-inline-size: var\(--size-target-min\)/,
      'list-group': /min-block-size: var\(--size-target-min\)/,
      'app-bar': /min-block-size: var\(--size-target-min\)/,
    };
    for (const [name, re] of Object.entries(cases)) assert.match(sheet(name), re, name);
  });
  it('app-bar items are never narrower than a target, at any width', () => {
    assert.match(tokens, /--size-app-bar-item-min-inline: var\(--size-target-min\);/);
  });
  it('tree toggles are targets and a leaf row is as tall as one, its text on the toggle label edge', () => {
    const tree = sheet('tree');
    assert.match(tree, /--size-button-block: var\(--size-target-min\);/);
    assert.match(
      tree,
      /--spacing-tree-leaf-padding-inline-start: calc\(var\(--spacing-tree-item-padding-inline\) \+ var\(--spacing-button-padding-inline\) \+ var\(--size-border-button\)\);/,
    );
  });
  it('a narrow pagination keeps one row: far pages step out in a container query', () => {
    const p = sheet('pagination');
    assert.match(p, /@container \(max-width: 28rem\)/);
    assert.match(p, /display: var\(--display-pagination-item-compact\)/);
    assert.match(tokens, /--display-pagination-item-compact: var\(--display-none\);/);
  });
});
