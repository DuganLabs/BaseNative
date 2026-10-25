// @ts-check
/* Holy Trinity pilot tests: the rules are enforced mechanically, variants
   register and generate, and the pilot trio renders semantic HTML. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdir } from 'node:fs/promises';
import { createRegistry, validateTemplate, validateCss } from './registry.js';
import { loadRegistry, renderComponent, assembleStyles } from './loader.js';
import { render } from '../../server/src/render.js';

const PILOT = ['button', 'input', 'field', 'dialog'];

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
    () => registry.registerVariant('button', 'brand', { color: 'var(--color-danger)' }),
    /does not match the token taxonomy/,
  );
  assert.throws(() => registry.resolveVariant('button', 'nope'), /is not registered/);
  assert.throws(() => validateTemplate('<p>literal</p>'), /literal text/);
  assert.throws(() => validateTemplate('<p class="x">{{ a() }}</p>'), /class attributes/);
  assert.throws(() => validateCss('button { color: red; }'), /not token-only/);
});

test('a consumer variant registers and generates a scoped rule', async () => {
  const registry = await loadRegistry();
  registry.registerVariant('button', 'brand', { '--button-background-color': 'var(--color-danger)' });
  assert.deepEqual(registry.resolveVariant('button', 'brand'), {
    '--button-background-color': 'var(--color-danger)',
  });
  assert.match(registry.variantsCss(), /button\[variant="brand"\] \{\n {2}--button-background-color: var\(--color-danger\);\n\}/);
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
    assert.match(styles, new RegExp(`${root}\\[variant\\]`), name);
    assert.doesNotMatch(styles, new RegExp(`(^|\\n)${root} \\{`), name);
  }
  const css = await assembleStyles(registry, PILOT);
  assert.match(css, /--button-background-color: var\(--color-surface\);/);
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

test('dialog composes nested buttons and its destructive variant re-points them', async () => {
  const registry = await loadRegistry();
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
  assert.match(registry.variantsCss(), /dialog\[variant="destructive"\] \{\n {2}--button-background-color: var\(--color-danger\);/);
});
