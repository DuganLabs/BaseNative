import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { createBuilderState } from './state.js';
import { defaultPalette } from './palette.js';
import { generateBaseNative } from './codegen.js';

describe('generateBaseNative', () => {
  test('renders empty state as empty string', () => {
    const s = createBuilderState();
    const code = generateBaseNative(s);
    assert.equal(code, '');
  });

  test('renders a heading', () => {
    const s = createBuilderState();
    const palette = defaultPalette();
    s.addNode(null, { type: 'heading', props: { level: 'h1', text: 'Welcome' } });
    const code = generateBaseNative(s, { palette });
    assert.equal(code, '<h1>Welcome</h1>');
  });

  test('escapes HTML in text content', () => {
    const s = createBuilderState();
    const palette = defaultPalette();
    s.addNode(null, { type: 'text', props: { text: '<script>x</script>' } });
    const code = generateBaseNative(s, { palette });
    assert.ok(code.includes('&lt;script&gt;'));
    assert.ok(!code.includes('<script>'));
  });

  test('renders a button with attributes', () => {
    const s = createBuilderState();
    const palette = defaultPalette();
    s.addNode(null, { type: 'button', props: { text: 'Save', type: 'submit', disabled: true } });
    const code = generateBaseNative(s, { palette });
    assert.ok(code.includes('<button'));
    assert.ok(code.includes('type="submit"'));
    assert.ok(code.includes('disabled'));
    assert.ok(code.includes('>Save</button>'));
  });

  test('renders a void element with self-closing slash', () => {
    const s = createBuilderState();
    const palette = defaultPalette();
    s.addNode(null, { type: 'image', props: { src: '/x.png', alt: 'X' } });
    const code = generateBaseNative(s, { palette });
    assert.ok(code.endsWith('/>'));
    assert.ok(code.includes('src="/x.png"'));
    assert.ok(code.includes('alt="X"'));
  });

  test('renders a nested container', () => {
    const s = createBuilderState();
    const palette = defaultPalette();
    const root = s.addNode(null, { type: 'section', props: { class: 'hero' } });
    s.addNode(root.id, { type: 'heading', props: { level: 'h1', text: 'Hi' } });
    s.addNode(root.id, { type: 'text', props: { text: 'World' } });
    const code = generateBaseNative(s, { palette });
    assert.ok(code.startsWith('<section'));
    assert.ok(code.includes('class="hero"'));
    assert.ok(code.includes('role="region"'));
    assert.ok(code.includes('<h1>Hi</h1>'));
    assert.ok(code.includes('<p>World</p>'));
    assert.ok(code.endsWith('</section>'));
  });

  test('renders signal-text binding as {{ }} interpolation', () => {
    const s = createBuilderState();
    const palette = defaultPalette();
    const n = s.addNode(null, { type: 'signal-text' });
    s.setBinding(n.id, 'text', { ref: 'count' });
    const code = generateBaseNative(s, { palette });
    assert.equal(code, '<span>{{ count() }}</span>');
  });

  test('renders custom expr in binding', () => {
    const s = createBuilderState();
    const palette = defaultPalette();
    const n = s.addNode(null, { type: 'signal-text' });
    s.setBinding(n.id, 'text', { ref: 'count', expr: 'count() * 2' });
    const code = generateBaseNative(s, { palette });
    assert.ok(code.includes('{{ count() * 2 }}'));
  });

  test('renders @bind for input value signal', () => {
    const s = createBuilderState();
    const palette = defaultPalette();
    const n = s.addNode(null, { type: 'input', props: { type: 'text' } });
    s.setBinding(n.id, 'value', { ref: 'name' });
    const code = generateBaseNative(s, { palette });
    assert.ok(code.includes('@bind="name"'));
    assert.ok(code.includes('type="text"'));
  });

  test('rejects invalid signal identifiers', () => {
    const s = createBuilderState();
    const palette = defaultPalette();
    const n = s.addNode(null, { type: 'signal-text' });
    s.setBinding(n.id, 'text', { ref: 'bad-ref!' });
    assert.throws(() => generateBaseNative(s, { palette }));
  });

  test('document mode wraps body in HTML shell', () => {
    const s = createBuilderState();
    const palette = defaultPalette();
    s.addNode(null, { type: 'heading', props: { level: 'h1', text: 'Hi' } });
    const code = generateBaseNative(s, { palette, document: true, title: 'Demo' });
    assert.ok(code.includes('<!DOCTYPE html>'));
    assert.ok(code.includes('<title>Demo</title>'));
    assert.ok(code.includes('<h1>Hi</h1>'));
    assert.ok(code.includes('</html>'));
  });

  test('signals option emits import + signal declarations', () => {
    const s = createBuilderState();
    const palette = defaultPalette();
    s.addNode(null, { type: 'signal-text' });
    const code = generateBaseNative(s, { palette, signals: { count: 0, name: 'Ada' } });
    assert.ok(code.includes("import { signal } from '@basenative/runtime'"));
    assert.ok(code.includes('const count = signal(0)'));
    assert.ok(code.includes('const name = signal("Ada")'));
  });

  test('rejects invalid signal names in declarations', () => {
    const s = createBuilderState();
    assert.throws(() => generateBaseNative(s, { signals: { 'bad name': 1 } }));
  });

  test('respects custom indent option', () => {
    const s = createBuilderState();
    const palette = defaultPalette();
    const root = s.addNode(null, { type: 'section' });
    s.addNode(root.id, { type: 'text', props: { text: 'Hi' } });
    const code = generateBaseNative(s, { palette, indent: '\t' });
    assert.ok(code.includes('\t<p>Hi</p>'));
  });
});

describe('exported markup carries the catalog attribute contract', () => {
  // The trinity sheet is keyed on element + variant; a `data-bn="button"`
  // matches no rule in it, so this is what decides whether an export of a
  // catalog component is styled at all. The pins below compare against the
  // real catalog renders (the loader + the server renderer), so a catalog
  // change that alters a component's output breaks this suite instead of
  // silently drifting the builder away from the design system.
  const normalize = (html) =>
    html.replace(/\s+/g, ' ').replace(/>\s+/g, '>').replace(/\s+</g, '<').trim();

  async function renderCatalog(name, props) {
    const { loadRegistry, renderComponent } = await import('../../components/src/loader.js');
    const { render } = await import('../../server/src/render.js');
    const registry = await loadRegistry();
    return renderComponent(registry, render, name, props).html;
  }

  test('a button built from the palette defaults exports the catalog addressing', () => {
    const s = createBuilderState();
    const palette = defaultPalette();
    s.addNode(null, { type: 'button', props: { ...palette.get('button').defaults } });
    const html = generateBaseNative(s, { palette });
    assert.match(html, /<button variant="primary" type="button">Click me<\/button>/);
    assert.doesNotMatch(html, /data-bn=/);
    assert.doesNotMatch(html, /data-variant=/);
    assert.doesNotMatch(html, /size=/);
  });

  test('the exported button is the real catalog button render', async () => {
    const s = createBuilderState();
    const palette = defaultPalette();
    s.addNode(null, { type: 'button', props: { ...palette.get('button').defaults } });
    const html = generateBaseNative(s, { palette });
    const real = await renderCatalog('button', { label: 'Click me', variant: 'primary' });
    assert.equal(normalize(html), normalize(real));
  });

  test('the exported hero is the real catalog hero render', async () => {
    const s = createBuilderState();
    const palette = defaultPalette();
    s.addNode(null, { type: 'hero', props: { ...palette.get('hero').defaults } });
    const html = generateBaseNative(s, { palette });
    const real = await renderCatalog('hero', {
      eyebrow: 'Organism',
      title: 'Title',
      lede: 'Glass header. Actions sit under the copy.',
    });
    assert.equal(normalize(html), normalize(real));
  });

  test('a user-supplied data-bn prop wins over the palette token, on a legacy def', () => {
    const s = createBuilderState();
    const palette = defaultPalette();
    s.addNode(null, { type: 'window', props: { text: 'Go', 'data-bn': 'custom' } });
    const html = generateBaseNative(s, { palette });
    assert.match(html, /<section data-bn="custom">/);
    assert.doesNotMatch(html, /data-bn="bn-window"/);
  });

  test('input and textarea export their root variant; checkbox its label composition', () => {
    const s = createBuilderState();
    const palette = defaultPalette();
    for (const type of ['input', 'textarea', 'checkbox']) {
      s.addNode(null, { type, props: { ...palette.get(type).defaults } });
    }
    const html = generateBaseNative(s, { palette });
    assert.match(html, /<input variant="default"/);
    assert.match(html, /<textarea variant="default"/);
    assert.match(html, /<label><input variant="checkbox" type="checkbox"> Label<\/label>/);
    assert.doesNotMatch(html, /data-bn=/);
  });

  test('elements with no component counterpart get no data-bn and no variant', () => {
    const s = createBuilderState();
    const palette = defaultPalette();
    s.addNode(null, { type: 'heading', props: { level: 'h1', text: 'Hi' } });
    s.addNode(null, { type: 'text', props: { text: 'Body' } });
    const html = generateBaseNative(s, { palette });
    assert.doesNotMatch(html, /data-bn=/);
    assert.doesNotMatch(html, /variant=/);
  });

  test('a legacy organism still exports its data-bn token', () => {
    const s = createBuilderState();
    const palette = defaultPalette();
    s.addNode(null, { type: 'window', props: { ...palette.get('window').defaults } });
    const html = generateBaseNative(s, { palette });
    assert.match(html, /data-bn="bn-window"/);
  });
});
