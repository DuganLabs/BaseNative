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
  'alert', 'progress', 'card', 'radio-card',
];

test('each pilot component directory holds exactly the three files', async () => {
  for (const name of PILOT) {
    const files = (await readdir(new URL(`./${name}/`, import.meta.url))).sort();
    assert.deepEqual(files, ['index.html', 'index.js', 'styles.css'], name);
  }
});

test('registration rejects rule-breaking components and variants', () => {
  const registry = createRegistry();
  assert.throws(
    () => registry.registerComponent({ name: 'box', root: 'div', create: () => ({}) }),
    /not a semantic root/,
  );
  registry.registerComponent({ name: 'button', root: 'button', create: () => ({}) });
  assert.throws(
    () => registry.registerVariant('button', 'brand', { '--button-color': '#ff0000' }),
    /only re-point a token/,
  );
  assert.throws(
    () => registry.registerVariant('button', 'brand', { color: 'var(--danger)' }),
    /does not match the token taxonomy/,
  );
  assert.throws(() => registry.resolveVariant('button', 'nope'), /is not registered/);
  assert.throws(() => validateTemplate('<p>literal</p>'), /literal text/);
  assert.throws(() => validateTemplate('<p class="x">{{ a() }}</p>'), /class attributes/);
  assert.throws(() => validateCss('button { color: red; }'), /not token-only/);
});

test('a consumer variant registers and generates a scoped rule', async () => {
  const registry = await loadRegistry();
  registry.registerVariant('button', 'brand', { '--button-background-color': 'var(--danger)' });
  assert.deepEqual(registry.resolveVariant('button', 'brand'), {
    '--button-background-color': 'var(--danger)',
  });
  assert.match(registry.variantsCssFor('button'), /button\[variant="brand"\] \{\n {2}--button-background-color: var\(--danger\);\n\}/);
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
  assert.match(css, /--button-background-color: var\(--fill-2\);/);
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
  assert.match(dialogStyles, /dialog\[variant="destructive"\] \{\n {2}--button-background-color: var\(--danger\);/);
});

test('the token system carries the Apple foundation, extended for the catalog', async () => {
  const tokensCss = await readFile(new URL('./tokens.css', import.meta.url), 'utf8');
  for (const marker of [
    '--label-2:', '--background-grouped:', '--fill-2:', '--separator:', '--tint:',
    '--text-large-title-size:', '--text-body-tracking:', '--text-caption-2-leading:',
    '--radius-sheet:', '--material-regular-blur:', '--material-thick-saturate:',
    '--motion-spring-curve:', '--motion-spring-bouncy-duration:', '--safe-top:',
    '@media (prefers-color-scheme: dark)', '@media (prefers-reduced-motion: reduce)',
  ]) {
    assert.ok(tokensCss.includes(marker), `tokens.css is missing ${marker}`);
  }
});

test('each component declares its own tokens in a :root block atop its styles.css', async () => {
  const tokensCss = await readFile(new URL('./tokens.css', import.meta.url), 'utf8');
  assert.doesNotMatch(tokensCss, /--(button|input|field|dialog)-[a-z-]+:/, 'tokens.css holds only layer-0 primitives');
  const registry = await loadRegistry();
  for (const name of PILOT) {
    const { styles } = registry.getComponent(name);
    assert.match(styles, new RegExp(`^:root \\{\\n {2}--${name}-`), name);
  }
  assert.match(registry.getComponent('field').styles, /\n {2}--field__label-color:/);
  assert.match(registry.getComponent('dialog').styles, /\n {2}--dialog__backdrop-background-color:/);
});

test('variant blocks inside each styles.css are current with the registry (no drift)', async () => {
  const registry = await loadRegistry();
  for (const name of PILOT) {
    const css = await readFile(new URL(`./${name}/styles.css`, import.meta.url), 'utf8');
    assert.equal(registry.spliceVariants(css, name), css, `${name}/styles.css variant block is stale — run scripts/generate-variants.mjs`);
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
  registry.registerVariant('one', 'info', {});
  registry.registerComponent({ name: 'two', root: 'aside', create: () => ({}) });
  assert.throws(() => registry.registerVariant('two', 'info', {}), /already registered by "one"/);
  registry.registerVariant('two', 'notice', {});
  assert.deepEqual(registry.listVariants('two'), ['notice']);
});

test('badge renders a small carrying its tone variant', async () => {
  const registry = await loadRegistry();
  const { html } = renderComponent(registry, render, 'badge', { label: 'Paid', variant: 'success' });
  assert.match(html, /<small variant="success">Paid<\/small>/);
  assert.match(registry.variantsCssFor('badge'), /small\[variant="danger"\] \{\n {2}--badge-background-color: var\(--danger-fill\);/);
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

test('select renders its options with the chosen one selected', async () => {
  const registry = await loadRegistry();
  const { html } = renderComponent(registry, render, 'select', {
    id: 'trade', value: 'hvac',
    options: [
      { value: 'electrical', label: 'Electrical' },
      { value: 'hvac', label: 'HVAC' },
    ],
  });
  assert.match(html, /<select variant="default" id="trade"/);
  assert.match(html, /<option value="hvac" selected="true">HVAC<\/option>/);
  assert.match(html, /<option value="electrical">Electrical<\/option>/);
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

test('radio-card composes cards into a radio group and re-points the chosen card', async () => {
  const registry = await loadRegistry();
  const cardFor = (title, body) => renderComponent(registry, render, 'card', { title, body }).html;
  const { html } = renderComponent(registry, render, 'radio-card', {
    legend: 'Pick a plan', name: 'plan', value: 'schedule',
    options: [
      { value: 'leads', cardHtml: cardFor('Pay per lead', 'Flat price per delivered lead.') },
      { value: 'schedule', cardHtml: cardFor('Leads + scheduling', 'Auto-booking in your windows.') },
    ],
  });
  assert.match(html, /<fieldset variant="radio-card">/);
  assert.match(html, /<legend>Pick a plan<\/legend>/);
  assert.equal((html.match(/<article variant="default">/g) ?? []).length, 2);
  assert.match(html, /<input type="radio" name="plan" value="schedule" checked="true">/);
  const styles = await readFile(new URL('radio-card/styles.css', import.meta.url), 'utf8');
  assert.match(styles, /&:has\(> input:checked\) \{\s+--card-border-color: var\(--tint\);/);
});

test('card renders its footer only when footer HTML is given', async () => {
  const registry = await loadRegistry();
  const bare = renderComponent(registry, render, 'card', { title: 'T', body: 'B' }).html;
  assert.doesNotMatch(bare, /<footer>/);
});
