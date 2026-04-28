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
