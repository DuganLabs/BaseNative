import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { createBuilderState } from './state.js';
import { renderTreeView } from './tree-view.js';

describe('renderTreeView', () => {
  test('shows empty state', () => {
    const s = createBuilderState();
    const html = renderTreeView(s);
    assert.ok(html.includes('bn-tree--empty'));
    assert.ok(html.includes('No components yet'));
  });

  test('renders a tree with role=tree and aria-label', () => {
    const s = createBuilderState();
    s.addNode(null, { type: 'button' });
    const html = renderTreeView(s);
    assert.ok(html.includes('role="tree"'));
    assert.ok(html.includes('aria-label="Component tree"'));
  });

  test('renders nested children inside group', () => {
    const s = createBuilderState();
    const root = s.addNode(null, { type: 'section' });
    s.addNode(root.id, { type: 'text' });
    const html = renderTreeView(s);
    assert.ok(html.includes('role="treeitem"'));
    assert.ok(html.includes('role="group"'));
    assert.ok(html.includes('aria-expanded="true"'));
  });

  test('marks selected node with aria-selected', () => {
    const s = createBuilderState();
    const node = s.addNode(null, { type: 'button' });
    s.select(node.id);
    const html = renderTreeView(s);
    assert.ok(html.includes('aria-selected="true"'));
    assert.ok(html.includes('bn-tree__row--selected'));
  });

  test('escapes node text in summary', () => {
    const s = createBuilderState();
    s.addNode(null, { type: 'text', props: { text: '<bad>' } });
    const html = renderTreeView(s);
    assert.ok(html.includes('&lt;bad&gt;'));
    assert.ok(!html.includes('<bad>'));
  });
});
