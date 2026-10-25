// @ts-check
/* Holy Trinity pilot tests: the rules are enforced mechanically, variants
   register and generate, and the pilot trio renders semantic HTML. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { createRegistry, validateTemplate, validateCss } from './registry.js';
import { loadRegistry, renderComponent, assembleStyles } from './loader.js';
import { render } from '../../server/src/render.js';

const PILOT = [
  'button', 'input', 'field', 'dialog',
  'badge', 'checkbox', 'toggle', 'radio', 'textarea', 'select',
  'alert', 'progress', 'card', 'choice-group',
  'avatar', 'accordion', 'breadcrumb', 'pagination', 'list-group',
  'combobox', 'multiselect',
  'drawer', 'dropdown-menu', 'command-palette', 'tooltip', 'toast',
  'table', 'datagrid', 'tree', 'virtualizer', 'calendar', 'pipeline',
  'theme-toggle',
  'form', 'search-field', 'segmented-control', 'stepper',
  'tabs', 'empty-state', 'toolbar', 'rating',
  'hero', 'sidebar', 'app-bar', 'site-footer', 'app-shell',
  'code-block',
];

test('each pilot component directory holds exactly the three files', async () => {
  for (const name of PILOT) {
    const files = (await readdir(new URL(`./${name}/`, import.meta.url))).sort();
    assert.deepEqual(files, ['index.html', 'index.js', 'styles.css'], name);
  }
});

test('registration rejects rule-breaking components', () => {
  const registry = createRegistry();
  assert.throws(
    () => registry.registerComponent({ name: 'box', root: 'div', create: () => ({}) }),
    /not a semantic root/,
  );
  registry.registerComponent({ name: 'button', root: 'button', create: () => ({}) });
  assert.throws(() => registry.resolveVariant('button', 'nope'), /is not registered/);
  assert.throws(() => validateTemplate('<p>literal</p>'), /literal text/);
  assert.throws(() => validateTemplate('<p class="x">{{ a() }}</p>'), /class attributes/);
  assert.throws(() => validateCss('button { color: red; }'), /not token-only/);
});

test('a consumer variant registers by name — JS carries no style values', async () => {
  const registry = await loadRegistry();
  registry.registerVariant('button', 'brand');
  assert.equal(registry.resolveVariant('button', 'brand'), 'brand');
  assert.ok(registry.listVariants('button').includes('brand'));
  // The rule itself is CSS, authored in a sheet — the registry never sees it.
});

test('the registry loads the whole pilot', async () => {
  const registry = await loadRegistry();
  assert.deepEqual([...registry.listComponents()].sort(), [...PILOT].sort());
  assert.deepEqual(registry.listVariants('button').sort(), ['default', 'destructive', 'ghost', 'primary']);
});

test('button renders a semantic button carrying its registration tag', async () => {
  const registry = await loadRegistry();
  const { html } = renderComponent(registry, render, 'button', { label: 'Save changes', variant: 'primary' });
  assert.match(html, /<button variant="primary" type="button">Save changes<\/button>/);
  assert.doesNotMatch(html, /class=|data-/);
  const disabled = renderComponent(registry, render, 'button', { label: 'Working', disabled: true }).html;
  assert.match(disabled, /disabled/);
  assert.match(disabled, /variant="default"/);
});

test('component styles never select a bare element — vanilla elements stay untouched', async () => {
  const registry = await loadRegistry();
  for (const name of PILOT) {
    const { styles, root } = registry.getComponent(name);
    assert.match(styles, new RegExp(`${root}\\[variant`), name);
    assert.doesNotMatch(styles, new RegExp(`(^|\\n)${root} \\{`), name);
  }
  const css = await assembleStyles(registry, PILOT);
  assert.match(css, /--color-bkg-button: var\(--color-fill-2\);/);
  assert.match(css, /button\[variant="ghost"\]/);
});

test('field composes a labelled input and swaps hint for error', async () => {
  const registry = await loadRegistry();
  const okInput = renderComponent(registry, render, 'input', { id: 'email', value: '' }).html;
  const ok = renderComponent(registry, render, 'field', {
    label: 'Email', controlId: 'email', controlHtml: okInput, hint: 'We only email about your jobs.',
  }).html;
  assert.match(ok, /<label for="email">Email<\/label>/);
  assert.match(ok, /<input variant="default" id="email"/);
  assert.match(ok, /We only email about your jobs\./);
  const badInput = renderComponent(registry, render, 'input', { id: 'email2', value: 'nope', invalid: true }).html;
  assert.match(badInput, /aria-invalid="true"/);
  const bad = renderComponent(registry, render, 'field', {
    label: 'Email', controlId: 'email2', controlHtml: badInput,
    hint: 'We only email about your jobs.', error: 'Enter a valid email address.',
  }).html;
  assert.match(bad, /Enter a valid email address\./);
  assert.doesNotMatch(bad, /We only email about your jobs\./);
});

test('dialog composes nested buttons and its destructive variant re-points them', async () => {  const registry = await loadRegistry();
  const close = renderComponent(registry, render, 'button', { label: 'Close', variant: 'ghost' }).html;
  const cancel = renderComponent(registry, render, 'button', { label: 'Cancel', variant: 'ghost' }).html;
  const confirm = renderComponent(registry, render, 'button', { label: 'Delete lead' }).html;
  const { html } = renderComponent(registry, render, 'dialog', {
    title: 'Delete this lead?', body: 'This cannot be undone.',
    variant: 'destructive', closeHtml: close, footerHtml: cancel + confirm,
  });
  assert.match(html, /<dialog variant="destructive" aria-label="Delete this lead\?">/);
  assert.match(html, /<h2>Delete this lead\?<\/h2>/);
  assert.match(html, /<button variant="default" type="button">Delete lead<\/button>/);
  const dialogStyles = await readFile(new URL('./dialog/styles.css', import.meta.url), 'utf8');
  assert.match(dialogStyles, /dialog\[variant="destructive"\] \{\n {2}--color-bkg-button: var\(--color-danger\);/);
});

test('the token system carries the Apple foundation, extended for the catalog', async () => {
  const tokensCss = await readFile(new URL('./tokens.css', import.meta.url), 'utf8');
  for (const marker of [
    '--color-text-label-2:', '--color-background-grouped:', '--color-fill-2:', '--color-border-separator:', '--color-tint:',
    '--font-large-title-size:', '--font-body-tracking:', '--font-caption-2-leading:',
    '--size-radius-sheet:', '--material-regular-blur:', '--material-thick-saturate:',
    '--motion-spring-curve:', '--motion-spring-bouncy-duration:', '--spacing-safe-top:',
    '@media (prefers-color-scheme: dark)', '@media (prefers-reduced-motion: reduce)',
  ]) {
    assert.ok(tokensCss.includes(marker), `tokens.css is missing ${marker}`);
  }
});

test('component tokens live in the DTCG source and the generated token sheet — never in styles.css', async () => {
  const tokensCss = await readFile(new URL('./tokens.css', import.meta.url), 'utf8');
  const registry = await loadRegistry();
  for (const name of PILOT) {
    const { styles } = registry.getComponent(name);
    assert.doesNotMatch(styles, /^:root \{/m, `${name}: styles.css defines no tokens; they live in tokens/components/${name}.json`);
    const source = JSON.parse(await readFile(new URL(`../tokens/components/${name}.json`, import.meta.url), 'utf8'));
    const names = Object.keys(source);
    assert.ok(names.length > 0, `${name}: the DTCG source declares no tokens for it`);
    for (const tokenName of names) {
      assert.ok(tokensCss.includes(`--${tokenName}:`), `generated tokens.css is missing --${tokenName}`);
    }
  }
  assert.match(tokensCss, /\n {2}--color-text-field-label:/);
  assert.match(tokensCss, /\n {2}--color-bkg-dialog-backdrop:/);
});

test('every token name follows the CTI+ grammar — category first, no prefixes, no underscores', async () => {
  const tokensCss = await readFile(new URL('./tokens.css', import.meta.url), 'utf8');
  const leaves = new Map();
  const collect = async (dir) => {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const url = new URL(`${entry.name}${entry.isDirectory() ? '/' : ''}`, dir);
      if (entry.isDirectory()) await collect(url);
      else if (entry.name.endsWith('.json')) {
        const tree = JSON.parse(await readFile(url, 'utf8'));
        for (const [name, leaf] of Object.entries(tree)) leaves.set(name, leaf.$extensions['com.basenative'].taxonomy);
      }
    }
  };
  await collect(new URL('../tokens/', import.meta.url));
  assert.ok(leaves.size > 1000, 'the DTCG source should carry the whole token system');
  for (const [name, taxonomy] of leaves) {
    assert.ok(!name.includes('_'), `--${name}: underscores are not part of the taxonomy`);
    assert.ok(!name.startsWith('bn-'), `--${name}: no domain prefix`);
    // The recorded taxonomy must rebuild the name exactly, segment by
    // segment, in CTI+ order: Category–Type–Item–Variant–Subitem–State.
    const rebuilt = [taxonomy.category, taxonomy.type, taxonomy.item, taxonomy.variant, taxonomy.subitem, taxonomy.state, taxonomy.context]
      .filter(Boolean).join('-');
    assert.equal(name, rebuilt, `--${name}: taxonomy metadata does not reconstruct the name`);
    assert.ok(tokensCss.includes(`--${name}:`), `generated tokens.css is missing --${name}`);
  }
  // And the generated sheet defines nothing the source does not carry.
  for (const match of tokensCss.matchAll(/^\s*(--[\w-]+)\s*:/gm)) {
    assert.ok(leaves.has(match[1].slice(2)), `tokens.css defines ${match[1]} with no DTCG source`);
  }
});

test('component selectors name their registered variants exactly — never bare [variant] presence', async () => {
  const registry = await loadRegistry();
  for (const name of PILOT) {
    const { root } = registry.getComponent(name);
    const styles = await readFile(new URL(`${name}/styles.css`, import.meta.url), 'utf8');
    assert.doesNotMatch(styles, new RegExp(`${root}\\[variant\\]`), `${name}: bare [variant] presence selector would claim every component sharing the <${root}> element`);
    for (const variant of registry.listVariants(name)) {
      assert.match(styles, new RegExp(`${root}\\[variant="${variant}"\\]`), `${name}: styles must cover registered variant "${variant}"`);
    }
  }
});

test('the registry refuses a (root element, variant) collision across components', () => {
  const registry = createRegistry();
  registry.registerComponent({ name: 'one', root: 'aside', create: () => ({}) });
  registry.registerVariant('one', 'info');
  registry.registerComponent({ name: 'two', root: 'aside', create: () => ({}) });
  assert.throws(() => registry.registerVariant('two', 'info'), /already registered by "one"/);
  registry.registerVariant('two', 'notice');
  assert.deepEqual(registry.listVariants('two'), ['notice']);
});

test('badge renders a small carrying its tone variant', async () => {
  const registry = await loadRegistry();
  const { html } = renderComponent(registry, render, 'badge', { label: 'Paid', variant: 'success' });
  assert.match(html, /<small variant="success">Paid<\/small>/);
  const badgeCss = await readFile(new URL('badge/styles.css', import.meta.url), 'utf8');
  assert.match(badgeCss, /small\[variant="danger"\] \{\n {2}--color-bkg-badge: var\(--color-danger-fill\);/);
});

test('checkbox and toggle register distinct tags on the shared input element', async () => {
  const registry = await loadRegistry();
  const box = renderComponent(registry, render, 'checkbox', { label: 'Licensed & insured', checked: true }).html;
  assert.match(box, /<input variant="checkbox" type="checkbox" checked/);
  assert.match(box, /Licensed &amp; insured/);
  const sw = renderComponent(registry, render, 'toggle', { label: 'Auto-book', checked: true }).html;
  assert.match(sw, /<input variant="switch" type="checkbox" role="switch" checked/);
});

test('radio renders a fieldset of options with the selected one checked', async () => {
  const registry = await loadRegistry();
  const { html } = renderComponent(registry, render, 'radio', {
    legend: 'Arrival window', name: 'window', value: 'pm',
    options: [
      { value: 'am', label: 'Morning' },
      { value: 'pm', label: 'Afternoon' },
      { value: 'eve', label: 'Evening' },
    ],
  });
  assert.match(html, /<fieldset variant="default">/);
  assert.match(html, /<legend>Arrival window<\/legend>/);
  assert.equal((html.match(/<label>/g) ?? []).length, 3);
  assert.match(html, /<input type="radio" name="window" value="pm" checked="true">/);
  assert.doesNotMatch(html, /value="am" checked/);
});

test('select defaults to a positioned popover — a trigger button and its listbox', async () => {
  const registry = await loadRegistry();
  const options = [
    { value: 'electrical', label: 'Electrical' },
    { value: 'hvac', label: 'HVAC' },
  ];
  const closed = renderComponent(registry, render, 'select', { id: 'trade', value: 'hvac', label: 'Trade', options }).html;
  assert.match(closed, /<section variant="select">/);
  assert.match(closed, /<button type="button" id="trade" aria-haspopup="listbox" aria-expanded="false" aria-controls="trade-listbox">HVAC</);
  assert.doesNotMatch(closed, /role="listbox"/);
  assert.doesNotMatch(closed, /<select/);

  const { html, viewModel } = renderComponent(registry, render, 'select', { id: 'trade', value: 'hvac', label: 'Trade', open: true, options });
  assert.match(html, /<ul role="listbox" id="trade-listbox" aria-label="Trade">/);
  assert.match(html, /<li role="option" id="trade-option-hvac" aria-selected="true">HVAC<\/li>/);
  assert.match(html, /<li role="option" id="trade-option-electrical" aria-selected="false">Electrical<\/li>/);

  let chosen = '';
  const vm = renderComponent(registry, render, 'select', { options, onChoose: (v) => { chosen = v; } }).viewModel;
  vm.toggle();
  assert.equal(vm.open(), true);
  vm.choose({ value: 'electrical', label: 'Electrical' });
  assert.equal(vm.value(), 'electrical');
  assert.equal(vm.open(), false);
  assert.equal(chosen, 'electrical');
  assert.equal(viewModel.expandedAttr(), 'true');
});

test('select native variant renders the platform element and its options', async () => {
  const registry = await loadRegistry();
  const { html } = renderComponent(registry, render, 'select', {
    id: 'trade', value: 'hvac', variant: 'native',
    options: [
      { value: 'electrical', label: 'Electrical' },
      { value: 'hvac', label: 'HVAC' },
    ],
  });
  assert.match(html, /<section variant="native">/);
  assert.match(html, /<select id="trade"/);
  assert.match(html, /<option value="hvac" selected="true">HVAC<\/option>/);
  assert.match(html, /<option value="electrical">Electrical<\/option>/);
  assert.doesNotMatch(html, /aria-haspopup/);
});

test('textarea renders its value as content so SSR shows it before hydration', async () => {
  const registry = await loadRegistry();
  const { html } = renderComponent(registry, render, 'textarea', { id: 'notes', rows: 3, value: 'Gate code 4211.' });
  assert.match(html, /<textarea variant="default" id="notes" rows="3"[^>]*>Gate code 4211\.<\/textarea>/);
});

test('alert picks its ARIA role from the variant', async () => {
  const registry = await loadRegistry();
  const info = renderComponent(registry, render, 'alert', { title: 'Heads up', body: 'Two crews are out today.' }).html;
  assert.match(info, /<aside variant="info" role="status">/);
  const danger = renderComponent(registry, render, 'alert', { title: 'Payment failed', body: 'Card declined.', variant: 'danger' }).html;
  assert.match(danger, /<aside variant="danger" role="alert">/);
});

test('progress renders a value, or no value when indeterminate', async () => {
  const registry = await loadRegistry();
  const bar = renderComponent(registry, render, 'progress', { value: 60 }).html;
  assert.match(bar, /<progress variant="default" value="60" max="100"><\/progress>/);
  const spin = renderComponent(registry, render, 'progress', {}).html;
  assert.match(spin, /<progress variant="default" max="100"><\/progress>/);
  assert.doesNotMatch(spin, /value=/);
});

test('table renders an HTML cell raw and a text cell escaped', async () => {
  const registry = await loadRegistry();
  const badge = renderComponent(registry, render, 'badge', { label: 'Fixed', variant: 'success' }).html;
  const { html } = renderComponent(registry, render, 'table', {
    columns: ['Point', 'Status'],
    rows: [
      [{ text: 'A < b', header: true }, { contentHtml: badge }],
    ],
  });
  assert.ok(html.includes('A &lt; b'), 'text cells stay escaped');
  assert.ok(html.includes('<small variant="success">Fixed</small>'), 'HTML cells render as markup');
});

test('card composes a footer of buttons', async () => {
  const registry = await loadRegistry();
  const open = renderComponent(registry, render, 'button', { label: 'Open job', variant: 'primary' }).html;
  const { html } = renderComponent(registry, render, 'card', {
    title: 'Panel upgrade', body: '200A service, permit pulled.', footerHtml: open,
  });
  assert.match(html, /<article variant="default">/);
  assert.match(html, /<h3>Panel upgrade<\/h3>/);
  assert.match(html, /<button variant="primary" type="button">Open job<\/button>/);
});

test('choice-group runs choose-one over the card substrate', async () => {
  const registry = await loadRegistry();
  const cardFor = (title, body) => renderComponent(registry, render, 'card', { title, body }).html;
  const { html } = renderComponent(registry, render, 'choice-group', {
    legend: 'Pick a plan', name: 'plan', value: 'schedule',
    options: [
      { value: 'leads', contentHtml: cardFor('Pay per lead', 'Flat price per delivered lead.') },
      { value: 'schedule', contentHtml: cardFor('Leads + scheduling', 'Auto-booking in your windows.') },
    ],
  });
  assert.match(html, /<fieldset variant="choice-group">/);
  assert.match(html, /<legend>Pick a plan<\/legend>/);
  assert.equal((html.match(/<article variant="default">/g) ?? []).length, 2);
  assert.match(html, /<input type="radio" name="plan" value="schedule" checked="true">/);
  // The substrate owns its selected look: the rule lives in card's sheet, not the group's.
  const cardStyles = await readFile(new URL('card/styles.css', import.meta.url), 'utf8');
  assert.match(cardStyles, /label:has\(> input:checked\) > article\[variant="default"\][^{]*\{\s+--color-border-card: var\(--color-tint\);/);
  const groupStyles = await readFile(new URL('choice-group/styles.css', import.meta.url), 'utf8');
  assert.doesNotMatch(groupStyles, /--card-/);
  // The notch: the group positions the control inside the substrate's corner…
  assert.match(groupStyles, /position: var\(--position-choice-group-control\);/);
  assert.match(groupStyles, /inset-inline-start: var\(--spacing-choice-group-control-inset-inline-start\);/);
  // …and the substrate reserves it, in the substrate's own sheet.
  assert.match(cardStyles, /label:has\(> input\) > article\[variant="default"\][^{]*\{\s+--spacing-card-padding-inline-start:/);
});

test('choice-group in checkbox mode reports one telemetry event shape', async () => {
  const registry = await loadRegistry();
  const events = [];
  const vm = registry.getComponent('choice-group').create({
    legend: 'Add-ons', name: 'addons', type: 'checkbox',
    options: [
      { value: 'permit', contentHtml: '<article></article>' },
      { value: 'surge', contentHtml: '<article></article>' },
    ],
    values: ['permit'],
    onChange: (change) => events.push(change),
  });
  assert.equal(vm.isChecked(vm.options()[0]), true);
  assert.equal(vm.isChecked(vm.options()[1]), false);
  vm.change(vm.options()[1], { target: { checked: true } });
  vm.change(vm.options()[0], { target: { checked: false } });
  assert.deepEqual(events, [
    { name: 'addons', mode: 'checkbox', values: ['permit', 'surge'], changed: 'surge', selected: true },
    { name: 'addons', mode: 'checkbox', values: ['surge'], changed: 'permit', selected: false },
  ]);
});

test('card renders its footer only when footer HTML is given', async () => {
  const registry = await loadRegistry();
  const bare = renderComponent(registry, render, 'card', { title: 'T', body: 'B' }).html;
  assert.doesNotMatch(bare, /<footer>/);
});

test('hero renders a figure whose figcaption carries eyebrow, title, lede and actions', async () => {
  const registry = await loadRegistry();
  const { html } = renderComponent(registry, render, 'hero', {
    eyebrow: 'Compare',
    title: 'How it compares',
    lede: 'An honest look.',
    actionsHtml: '<button variant="primary" type="button">Try it</button>',
  });
  assert.match(html, /<figure variant="stacked">/);
  assert.match(html, /<figcaption>/);
  assert.match(html, /<p>Compare<\/p>/);
  assert.match(html, /<h1>\s*How it compares\s*<\/h1>/);
  assert.match(html, /<p>An honest look\.<\/p>/);
  assert.match(html, /<nav aria-label="Primary">/);
  assert.doesNotMatch(html, /<img/);
  assert.doesNotMatch(html, /class=|data-/);
});

test('hero overlay renders its media and an h2 when asked', async () => {
  const registry = await loadRegistry();
  const { html } = renderComponent(registry, render, 'hero', {
    variant: 'overlay',
    headingLevel: 'h2',
    title: 'On the water',
    mediaSrc: '/hero.jpg',
    mediaAlt: 'A boat at dawn',
  });
  assert.match(html, /<figure variant="overlay">/);
  assert.match(html, /<img src="\/hero\.jpg" alt="A boat at dawn">/);
  assert.match(html, /<h2>\s*On the water\s*<\/h2>/);
});

test('sidebar renders grouped destinations with the current one marked', async () => {
  const registry = await loadRegistry();
  const { html } = renderComponent(registry, render, 'sidebar', {
    label: 'Site',
    sections: [
      { label: 'Start', items: [
        { label: 'Home', href: '/' },
        { label: 'Compare', href: '/compare', current: true },
      ] },
      { items: [{ label: 'Docs', href: '/docs' }] },
    ],
  });
  assert.match(html, /<aside variant="sidebar">/);
  assert.match(html, /<nav aria-label="Site">/);
  assert.match(html, /<h2>Start<\/h2>/);
  assert.match(html, /<a href="\/compare" aria-current="page">\s*Compare\s*<\/a>/);
  assert.doesNotMatch(html, /<a href="\/" aria-current/);
  assert.doesNotMatch(html, /class=|data-/);
});

test('app-bar rides the first destinations and overflows the rest behind More', async () => {
  const registry = await loadRegistry();
  const items = ['Home', 'Compare', 'Components', 'Docs', 'AI', 'Tasks']
    .map((label) => ({ label, href: `/${label.toLowerCase()}` }));
  items[5].current = true;
  const { html } = renderComponent(registry, render, 'app-bar', { items, barLimit: 4 });
  assert.match(html, /<nav variant="app-bar" aria-label="Primary">/);
  assert.match(html, /<button type="button" id="app-bar-more-btn" popovertarget="app-bar-more" aria-haspopup="menu" aria-current="page">/);
  assert.match(html, /<menu id="app-bar-more" popover="auto" aria-label="More">/);
  assert.match(html, /<a href="\/tasks" aria-current="page">Tasks<\/a>/);
  assert.doesNotMatch(html, /class=|data-/);
});

test('site-footer renders its groups as nav columns', async () => {
  const registry = await loadRegistry();
  const { html } = renderComponent(registry, render, 'site-footer', {
    groups: [
      { label: 'Product', links: [{ label: 'Components', href: '/components' }, { label: 'Docs', href: '/docs' }] },
      { label: 'Project', links: [{ label: 'Roadmap', href: '/roadmap' }] },
    ],
    noteHtml: '<p>Built with BaseNative.</p>',
  });
  assert.match(html, /<footer variant="default">/);
  assert.match(html, /<nav aria-label="Product">/);
  assert.match(html, /<p>Product<\/p>/);
  assert.match(html, /<a href="\/roadmap">Roadmap<\/a>/);
  assert.match(html, /<p>Built with BaseNative\.<\/p>/);
  assert.doesNotMatch(html, /class=|data-/);
});

test('app-shell composes sidebar, main and app bar around the content', async () => {
  const registry = await loadRegistry();
  const { html } = renderComponent(registry, render, 'app-shell', {
    sidebarHtml: '<aside variant="sidebar"><nav aria-label="Sidebar"></nav></aside>',
    appBarHtml: '<nav variant="app-bar" aria-label="Primary"></nav>',
    contentHtml: '<p>Body</p>',
  });
  assert.match(html, /<main variant="default">\s*<p>Body<\/p>\s*<\/main>/);
  assert.ok(html.indexOf('<aside') < html.indexOf('<main'), 'sidebar precedes main');
  assert.ok(html.indexOf('</main>') < html.indexOf('variant="app-bar"'), 'app bar follows main');
});

test('button with an href renders a link carrying the variant', async () => {
  const registry = await loadRegistry();
  const { html } = renderComponent(registry, render, 'button', { label: 'Read the docs', variant: 'primary', href: '/docs' });
  assert.match(html, /<a variant="primary" href="\/docs">Read the docs<\/a>/);
  assert.doesNotMatch(html, /<button/);
  const off = renderComponent(registry, render, 'button', { label: 'Later', href: '/later', disabled: true }).html;
  assert.match(off, /<a variant="default" aria-disabled="true">Later<\/a>/);
  assert.doesNotMatch(off, /href=/);
});

test('hero renders afterHtml at the close of its figcaption', async () => {
  const registry = await loadRegistry();
  const { html } = renderComponent(registry, render, 'hero', {
    title: 'Button',
    afterHtml: '<dl><div><dt>Element</dt><dd><code>&lt;button&gt;</code></dd></div></dl>',
  });
  assert.match(html, /<dl><div><dt>Element<\/dt>/);
  assert.ok(html.indexOf('<dl>') > html.indexOf('</h1>'), 'after content follows the title');
});
