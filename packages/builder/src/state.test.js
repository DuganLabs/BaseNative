import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { effect } from '@basenative/runtime';
import { createBuilderState, ROOT_ID } from './state.js';

describe('createBuilderState - tree mutations', () => {
  it('starts with a single root <main> node', () => {
    const state = createBuilderState();
    const root = state.getRoot();
    assert.equal(root.id, ROOT_ID);
    assert.equal(root.type, 'main');
    assert.deepEqual(root.children, []);
  });

  it('adds a child to root and links parentId', () => {
    const state = createBuilderState();
    const id = state.addNode({ type: 'section' });
    assert.ok(id);
    const node = state.getNode(id);
    assert.equal(node.parentId, ROOT_ID);
    assert.deepEqual(state.getRoot().children, [id]);
  });

  it('adds nested children at a specific index', () => {
    const state = createBuilderState();
    const a = state.addNode({ type: 'section' });
    const b = state.addNode({ type: 'section' });
    const c = state.addNode({ type: 'section', index: 1 });
    assert.deepEqual(state.getRoot().children, [a, c, b]);
  });

  it('removeNode deletes node and all descendants', () => {
    const state = createBuilderState();
    const section = state.addNode({ type: 'section' });
    const button = state.addNode({ type: 'button', parentId: section });
    const text = state.addNode({ type: 'paragraph', parentId: section });
    assert.equal(state.removeNode(section), true);
    assert.equal(state.getNode(section), null);
    assert.equal(state.getNode(button), null);
    assert.equal(state.getNode(text), null);
    assert.deepEqual(state.getRoot().children, []);
  });

  it('removeNode rejects root deletion', () => {
    const state = createBuilderState();
    assert.equal(state.removeNode(ROOT_ID), false);
    assert.ok(state.getRoot());
  });

  it('moveNode reparents and reorders', () => {
    const state = createBuilderState();
    const section = state.addNode({ type: 'section' });
    const button = state.addNode({ type: 'button' });
    state.moveNode(button, { parentId: section, index: 0 });
    assert.deepEqual(state.getNode(section).children, [button]);
    assert.deepEqual(state.getRoot().children, [section]);
    assert.equal(state.getNode(button).parentId, section);
  });

  it('moveNode prevents cycles (descendant cannot become parent)', () => {
    const state = createBuilderState();
    const outer = state.addNode({ type: 'section' });
    const inner = state.addNode({ type: 'section', parentId: outer });
    assert.equal(state.moveNode(outer, { parentId: inner }), false);
    assert.equal(state.getNode(outer).parentId, ROOT_ID);
  });

  it('updateProps merges and removes undefined keys', () => {
    const state = createBuilderState();
    const id = state.addNode({ type: 'button', props: { text: 'Hi', type: 'button' } });
    state.updateProps(id, { text: 'Hello' });
    assert.equal(state.getNode(id).props.text, 'Hello');
    state.updateProps(id, { type: undefined });
    assert.equal(state.getNode(id).props.type, undefined);
    assert.equal('type' in state.getNode(id).props, false);
  });

  it('updateBindings stores signal name and clears with empty string', () => {
    const state = createBuilderState();
    const id = state.addNode({ type: 'input' });
    state.updateBindings(id, { value: 'username' });
    assert.equal(state.getNode(id).bindings.value, 'username');
    state.updateBindings(id, { value: '' });
    assert.equal('value' in state.getNode(id).bindings, false);
  });

  it('updateEvents stores event handler expression', () => {
    const state = createBuilderState();
    const id = state.addNode({ type: 'button' });
    state.updateEvents(id, { click: 'count.set(count() + 1)' });
    assert.equal(state.getNode(id).events.click, 'count.set(count() + 1)');
  });
});

describe('createBuilderState - selection', () => {
  it('selects an existing node', () => {
    const state = createBuilderState();
    const id = state.addNode({ type: 'button' });
    assert.equal(state.select(id), true);
    assert.equal(state.selectedId(), id);
    assert.equal(state.selectedNode().id, id);
  });

  it('rejects selection of unknown id', () => {
    const state = createBuilderState();
    assert.equal(state.select('does-not-exist'), false);
    assert.equal(state.selectedId(), null);
  });

  it('clears selection on null', () => {
    const state = createBuilderState();
    const id = state.addNode({ type: 'button' });
    state.select(id);
    state.select(null);
    assert.equal(state.selectedId(), null);
    assert.equal(state.selectedNode(), null);
  });

  it('clears selection when selected node is removed', () => {
    const state = createBuilderState();
    const id = state.addNode({ type: 'button' });
    state.select(id);
    state.removeNode(id);
    assert.equal(state.selectedId(), null);
  });
});

describe('createBuilderState - undo/redo', () => {
  it('undoes addNode', () => {
    const state = createBuilderState();
    const id = state.addNode({ type: 'button' });
    assert.equal(state.canUndo(), true);
    state.undo();
    assert.equal(state.getNode(id), null);
    assert.equal(state.canRedo(), true);
  });

  it('redoes addNode', () => {
    const state = createBuilderState();
    const id = state.addNode({ type: 'button' });
    state.undo();
    state.redo();
    assert.ok(state.getNode(id));
  });

  it('undo restores deleted subtree', () => {
    const state = createBuilderState();
    const section = state.addNode({ type: 'section' });
    const button = state.addNode({ type: 'button', parentId: section });
    state.removeNode(section);
    state.undo();
    assert.ok(state.getNode(section));
    assert.ok(state.getNode(button));
  });

  it('new mutation clears redo stack', () => {
    const state = createBuilderState();
    state.addNode({ type: 'button' });
    state.undo();
    assert.equal(state.canRedo(), true);
    state.addNode({ type: 'paragraph' });
    assert.equal(state.canRedo(), false);
  });

  it('returns false when no history available', () => {
    const state = createBuilderState();
    assert.equal(state.undo(), false);
    assert.equal(state.redo(), false);
  });
});

describe('createBuilderState - reactive signals', () => {
  it('tree() triggers effect on mutation', () => {
    const state = createBuilderState();
    let runs = 0;
    effect(() => {
      state.tree();
      runs++;
    });
    assert.equal(runs, 1);
    state.addNode({ type: 'button' });
    assert.equal(runs, 2);
  });

  it('selectedId() triggers effect on selection change', () => {
    const state = createBuilderState();
    const id = state.addNode({ type: 'button' });
    let lastSeen = 'initial';
    effect(() => {
      lastSeen = state.selectedId();
    });
    state.select(id);
    assert.equal(lastSeen, id);
  });
});

describe('createBuilderState - JSON round-trip', () => {
  it('toJSON / fromJSON preserves structure', () => {
    const state = createBuilderState();
    const section = state.addNode({ type: 'section' });
    state.addNode({ type: 'button', parentId: section, props: { text: 'Go' } });

    const dump = state.toJSON();
    const fresh = createBuilderState();
    fresh.fromJSON(dump);

    const original = JSON.parse(state.toJSON());
    const restored = JSON.parse(fresh.toJSON());
    assert.deepEqual(restored.nodes, original.nodes);
  });

  it('fromJSON throws on invalid input', () => {
    const state = createBuilderState();
    assert.throws(() => state.fromJSON('{}'));
    assert.throws(() => state.fromJSON({ nodes: [] }));
  });

  it('fromJSON registers as undoable change', () => {
    const state = createBuilderState();
    state.addNode({ type: 'button' });
    const snapshot = state.toJSON();
    const fresh = createBuilderState();
    fresh.fromJSON(snapshot);
    assert.equal(fresh.canUndo(), true);
  });
});
