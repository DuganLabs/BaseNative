import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createBuilder } from './builder.js';
import { createBuilderState } from './state.js';
import { createDefaultPalette } from './palette.js';

describe('createBuilder', () => {
  it('exposes state, palette, generate, dispose', () => {
    const builder = createBuilder();
    assert.equal(typeof builder.state, 'object');
    assert.equal(typeof builder.palette, 'object');
    assert.equal(typeof builder.generate, 'function');
    assert.equal(typeof builder.dispose, 'function');
    builder.dispose();
  });

  it('accepts injected state and palette', () => {
    const state = createBuilderState();
    const palette = createDefaultPalette();
    const builder = createBuilder({ state, palette });
    assert.equal(builder.state, state);
    assert.equal(builder.palette, palette);
    builder.dispose();
  });

  it('generate() emits BaseNative source from current state', () => {
    const builder = createBuilder();
    builder.state.addNode({ type: 'heading', props: { text: 'Hi' } });
    const code = builder.generate({ componentName: 'Hello' });
    assert.match(code, /export function Hello\(\)/);
    assert.match(code, /<h2>Hi<\/h2>/);
    builder.dispose();
  });

  it('dispose() runs cleanup without targets', () => {
    const builder = createBuilder();
    assert.doesNotThrow(() => builder.dispose());
  });
});
