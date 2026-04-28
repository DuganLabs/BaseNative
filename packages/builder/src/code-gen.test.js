import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createBuilderState } from './state.js';
import { createDefaultPalette } from './palette.js';
import {
  generateComponent,
  generateMarkup,
  escapeHTML,
  escapeAttr,
  isValidIdentifier,
} from './code-gen.js';

describe('escape helpers', () => {
  it('escapeHTML encodes &, <, >', () => {
    assert.equal(escapeHTML('<a & b>'), '&lt;a &amp; b&gt;');
  });

  it('escapeAttr encodes quotes', () => {
    assert.equal(escapeAttr('a"b'), 'a&quot;b');
  });

  it('isValidIdentifier accepts JS identifiers', () => {
    assert.equal(isValidIdentifier('foo'), true);
    assert.equal(isValidIdentifier('_x1'), true);
    assert.equal(isValidIdentifier('1abc'), false);
    assert.equal(isValidIdentifier('a-b'), false);
    assert.equal(isValidIdentifier(''), false);
  });
});

describe('generateMarkup', () => {
  it('emits <main></main> for empty root', () => {
    const state = createBuilderState();
    const palette = createDefaultPalette();
    const out = generateMarkup(state, palette);
    assert.equal(out, '<main></main>');
  });

  it('renders nested children with text content', () => {
    const state = createBuilderState();
    const palette = createDefaultPalette();
    state.addNode({ type: 'heading', props: { text: 'Hi' } });
    const out = generateMarkup(state, palette);
    assert.match(out, /<main>/);
    assert.match(out, /<h2>Hi<\/h2>/);
  });

  it('renders self-closing void inputs without closing tag', () => {
    const state = createBuilderState();
    const palette = createDefaultPalette();
    state.addNode({ type: 'input', props: { type: 'text', name: 'email' } });
    const out = generateMarkup(state, palette);
    assert.match(out, /<input[^/]*type="text"[^>]*name="email"[^>]*>/);
    assert.equal(/<\/input>/.test(out), false);
  });

  it('renders signal bindings as {{ expr() }}', () => {
    const state = createBuilderState();
    const palette = createDefaultPalette();
    const id = state.addNode({ type: 'input' });
    state.updateBindings(id, { value: 'username' });
    const out = generateMarkup(state, palette);
    assert.match(out, /value="\{\{ username\(\) \}\}"/);
  });

  it('renders event handlers as @event="..."', () => {
    const state = createBuilderState();
    const palette = createDefaultPalette();
    const id = state.addNode({ type: 'button', props: { text: 'Click' } });
    state.updateEvents(id, { click: 'count.set(count() + 1)' });
    const out = generateMarkup(state, palette);
    assert.match(out, /@click="count\.set\(count\(\) \+ 1\)"/);
  });

  it('escapes special characters in text and attributes', () => {
    const state = createBuilderState();
    const palette = createDefaultPalette();
    state.addNode({ type: 'paragraph', props: { text: '<script>alert(1)</script>' } });
    state.addNode({ type: 'paragraph', props: { class: 'a"b' } });
    const out = generateMarkup(state, palette);
    assert.match(out, /&lt;script&gt;/);
    assert.match(out, /class="a&quot;b"/);
  });

  it('preserves child ordering', () => {
    const state = createBuilderState();
    const palette = createDefaultPalette();
    state.addNode({ type: 'heading', props: { text: 'A' } });
    state.addNode({ type: 'heading', props: { text: 'B' } });
    const out = generateMarkup(state, palette);
    const aIdx = out.indexOf('A');
    const bIdx = out.indexOf('B');
    assert.ok(aIdx > -1 && bIdx > aIdx);
  });
});

describe('generateComponent', () => {
  it('produces a valid module string for empty tree', () => {
    const state = createBuilderState();
    const palette = createDefaultPalette();
    const out = generateComponent(state, palette);
    assert.match(out, /export function BuiltComponent\(\)/);
    assert.match(out, /return `/);
    assert.match(out, /<main><\/main>/);
  });

  it('imports signal when bindings exist', () => {
    const state = createBuilderState();
    const palette = createDefaultPalette();
    const id = state.addNode({ type: 'input' });
    state.updateBindings(id, { value: 'username' });
    const out = generateComponent(state, palette);
    assert.match(out, /import \{ signal \} from '@basenative\/runtime'/);
    assert.match(out, /const username = signal\(""\)/);
  });

  it('omits signal import when no bindings', () => {
    const state = createBuilderState();
    const palette = createDefaultPalette();
    state.addNode({ type: 'paragraph', props: { text: 'Hello' } });
    const out = generateComponent(state, palette);
    assert.equal(out.includes("from '@basenative/runtime'"), false);
  });

  it('honors custom componentName', () => {
    const state = createBuilderState();
    const palette = createDefaultPalette();
    const out = generateComponent(state, palette, { componentName: 'MyView' });
    assert.match(out, /export function MyView\(\)/);
  });

  it('rejects invalid component names', () => {
    const state = createBuilderState();
    const palette = createDefaultPalette();
    assert.throws(() => generateComponent(state, palette, { componentName: '1bad' }));
    assert.throws(() => generateComponent(state, palette, { componentName: 'has-dash' }));
  });

  it('escapes backticks and ${} in template output', () => {
    const state = createBuilderState();
    const palette = createDefaultPalette();
    state.addNode({ type: 'paragraph', props: { text: '`${evil}`' } });
    const out = generateComponent(state, palette);
    assert.match(out, /\\\$\{evil\}/, 'expected ${...} to be escaped with backslash');
    assert.match(out, /\\`/, 'expected raw backticks to be escaped');
  });

  it('skips invalid binding identifiers when collecting signals', () => {
    const state = createBuilderState();
    const palette = createDefaultPalette();
    const id = state.addNode({ type: 'input' });
    state.updateBindings(id, { value: '1invalid' });
    const out = generateComponent(state, palette);
    assert.equal(out.includes('const 1invalid'), false);
    assert.equal(out.includes("from '@basenative/runtime'"), false);
  });
});
