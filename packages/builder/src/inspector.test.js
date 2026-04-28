import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { createBuilderState } from './state.js';
import { defaultPalette } from './palette.js';
import { renderInspector } from './inspector.js';

describe('renderInspector', () => {
  test('shows empty state with no selection', () => {
    const s = createBuilderState();
    const html = renderInspector(s, defaultPalette());
    assert.ok(html.includes('Select a component'));
  });

  test('renders fields for selected node', () => {
    const s = createBuilderState();
    const palette = defaultPalette();
    const node = s.addNode(null, { type: 'button', props: { text: 'Hi', variant: 'primary' } });
    s.select(node.id);
    const html = renderInspector(s, palette);
    assert.ok(html.includes('Button'));
    assert.ok(html.includes('value="Hi"'));
    assert.ok(html.includes('Variant'));
    assert.ok(html.includes('option value="primary" selected'));
  });

  test('renders signal-kind fields with placeholder', () => {
    const s = createBuilderState();
    const palette = defaultPalette();
    const node = s.addNode(null, { type: 'input' });
    s.select(node.id);
    const html = renderInspector(s, palette);
    assert.ok(html.includes('placeholder="signalName"'));
    assert.ok(html.includes('data-bn-binding="true"'));
  });

  test('shows existing binding ref as input value', () => {
    const s = createBuilderState();
    const palette = defaultPalette();
    const node = s.addNode(null, { type: 'input' });
    s.setBinding(node.id, 'value', { ref: 'username' });
    s.select(node.id);
    const html = renderInspector(s, palette);
    assert.ok(html.includes('value="username"'));
  });

  test('renders boolean as checkbox', () => {
    const s = createBuilderState();
    const palette = defaultPalette();
    const node = s.addNode(null, { type: 'button', props: { disabled: true } });
    s.select(node.id);
    const html = renderInspector(s, palette);
    assert.ok(html.includes('type="checkbox"'));
    assert.ok(html.includes('checked'));
  });

  test('renders duplicate and remove actions', () => {
    const s = createBuilderState();
    const node = s.addNode(null, { type: 'button' });
    s.select(node.id);
    const html = renderInspector(s, defaultPalette());
    assert.ok(html.includes('data-bn-action="duplicate"'));
    assert.ok(html.includes('data-bn-action="remove"'));
  });

  test('shows component-not-found when selected id is invalid', () => {
    const s = createBuilderState();
    s.select('ghost');
    const html = renderInspector(s, defaultPalette());
    assert.ok(html.includes('not found'));
  });

  test('handles unknown component type', () => {
    const s = createBuilderState();
    const node = s.addNode(null, { type: 'mystery' });
    s.select(node.id);
    const html = renderInspector(s, defaultPalette());
    assert.ok(html.includes('No editable properties') || html.includes('not found'));
  });
});
