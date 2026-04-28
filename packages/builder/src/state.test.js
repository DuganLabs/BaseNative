import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { effect } from '@basenative/runtime';
import { createBuilderState } from './state.js';

describe('createBuilderState — basics', () => {
  test('starts empty by default', () => {
    const s = createBuilderState();
    assert.deepEqual(s.tree(), []);
    assert.equal(s.selection(), null);
    assert.equal(s.canUndo(), false);
    assert.equal(s.canRedo(), false);
  });

  test('accepts initial roots', () => {
    const s = createBuilderState({ initial: { type: 'section', children: [{ type: 'text' }] } });
    const tree = s.tree();
    assert.equal(tree.length, 1);
    assert.equal(tree[0].type, 'section');
    assert.equal(tree[0].children[0].type, 'text');
  });

  test('addNode requires a type', () => {
    const s = createBuilderState();
    assert.throws(() => s.addNode(null, {}));
  });

  test('addNode appends a root node', () => {
    const s = createBuilderState();
    const node = s.addNode(null, { type: 'button' });
    assert.equal(s.tree().length, 1);
    assert.equal(s.tree()[0].id, node.id);
    assert.equal(s.tree()[0].type, 'button');
  });

  test('addNode adds to a parent', () => {
    const s = createBuilderState();
    const root = s.addNode(null, { type: 'section' });
    s.addNode(root.id, { type: 'text' });
    assert.equal(s.getNode(root.id).children.length, 1);
    assert.equal(s.getNode(root.id).children[0].type, 'text');
  });

  test('addNode with index inserts at position', () => {
    const s = createBuilderState();
    s.addNode(null, { type: 'a' });
    s.addNode(null, { type: 'b' });
    s.addNode(null, { type: 'c' }, 1);
    assert.deepEqual(s.tree().map((n) => n.type), ['a', 'c', 'b']);
  });

  test('addNode returns null for missing parent', () => {
    const s = createBuilderState();
    const node = s.addNode('nope', { type: 'x' });
    assert.equal(node, null);
  });

  test('removeNode deletes a node and its descendants', () => {
    const s = createBuilderState();
    const root = s.addNode(null, { type: 'section' });
    s.addNode(root.id, { type: 'text' });
    s.removeNode(root.id);
    assert.equal(s.tree().length, 0);
  });

  test('removeNode clears selection if removing selected', () => {
    const s = createBuilderState();
    const node = s.addNode(null, { type: 'button' });
    s.select(node.id);
    s.removeNode(node.id);
    assert.equal(s.selection(), null);
  });

  test('updateProps merges patch', () => {
    const s = createBuilderState();
    const node = s.addNode(null, { type: 'button', props: { text: 'A' } });
    s.updateProps(node.id, { text: 'B', variant: 'primary' });
    assert.equal(s.getNode(node.id).props.text, 'B');
    assert.equal(s.getNode(node.id).props.variant, 'primary');
  });

  test('updateProps with undefined removes a key', () => {
    const s = createBuilderState();
    const node = s.addNode(null, { type: 'button', props: { text: 'X' } });
    s.updateProps(node.id, { text: undefined });
    assert.equal('text' in s.getNode(node.id).props, false);
  });
});

describe('signal bindings', () => {
  test('setBinding stores ref and expr', () => {
    const s = createBuilderState();
    const n = s.addNode(null, { type: 'signal-text' });
    s.setBinding(n.id, 'value', { ref: 'count' });
    assert.deepEqual(s.getNode(n.id).bindings.value, { ref: 'count' });
  });

  test('setBinding rejects invalid refs', () => {
    const s = createBuilderState();
    const n = s.addNode(null, { type: 'input' });
    assert.throws(() => s.setBinding(n.id, 'value', {}));
  });

  test('setBinding(null) removes binding', () => {
    const s = createBuilderState();
    const n = s.addNode(null, { type: 'input' });
    s.setBinding(n.id, 'value', { ref: 'name' });
    s.setBinding(n.id, 'value', null);
    assert.equal('value' in s.getNode(n.id).bindings, false);
  });
});

describe('moveNode', () => {
  test('reparents a node', () => {
    const s = createBuilderState();
    const a = s.addNode(null, { type: 'section' });
    const b = s.addNode(null, { type: 'section' });
    const c = s.addNode(a.id, { type: 'text' });
    s.moveNode(c.id, b.id);
    assert.equal(s.getNode(a.id).children.length, 0);
    assert.equal(s.getNode(b.id).children.length, 1);
    assert.equal(s.getNode(b.id).children[0].id, c.id);
  });

  test('rejects moving a node into its own descendant', () => {
    const s = createBuilderState();
    const root = s.addNode(null, { type: 'section' });
    const child = s.addNode(root.id, { type: 'section' });
    const ok = s.moveNode(root.id, child.id);
    assert.equal(ok, false);
  });

  test('reordering at root with index', () => {
    const s = createBuilderState();
    const a = s.addNode(null, { type: 'a' });
    s.addNode(null, { type: 'b' });
    s.addNode(null, { type: 'c' });
    s.moveNode(a.id, null, 1);
    assert.deepEqual(s.tree().map((n) => n.type), ['b', 'a', 'c']);
  });

  test('moving to end appends', () => {
    const s = createBuilderState();
    const a = s.addNode(null, { type: 'a' });
    s.addNode(null, { type: 'b' });
    s.moveNode(a.id, null);
    assert.deepEqual(s.tree().map((n) => n.type), ['b', 'a']);
  });
});

describe('duplicateNode', () => {
  test('clones a node with new ids', () => {
    const s = createBuilderState();
    const root = s.addNode(null, { type: 'section' });
    s.addNode(root.id, { type: 'text', props: { text: 'Hi' } });
    const dup = s.duplicateNode(root.id);
    assert.equal(s.tree().length, 2);
    assert.notEqual(dup.id, root.id);
    assert.notEqual(dup.children[0].id, s.getNode(root.id).children[0].id);
    assert.equal(dup.children[0].props.text, 'Hi');
  });

  test('inserts duplicate after the original', () => {
    const s = createBuilderState();
    const a = s.addNode(null, { type: 'a' });
    s.addNode(null, { type: 'b' });
    s.duplicateNode(a.id);
    assert.equal(s.tree()[1].type, 'a');
    assert.equal(s.tree()[2].type, 'b');
  });
});

describe('undo/redo', () => {
  test('undoes addNode', () => {
    const s = createBuilderState();
    s.addNode(null, { type: 'button' });
    assert.equal(s.tree().length, 1);
    s.undo();
    assert.equal(s.tree().length, 0);
    assert.equal(s.canRedo(), true);
  });

  test('redoes addNode', () => {
    const s = createBuilderState();
    s.addNode(null, { type: 'button' });
    s.undo();
    s.redo();
    assert.equal(s.tree().length, 1);
  });

  test('undoes removeNode', () => {
    const s = createBuilderState();
    const node = s.addNode(null, { type: 'button' });
    s.removeNode(node.id);
    s.undo();
    assert.equal(s.tree().length, 1);
  });

  test('undoes updateProps', () => {
    const s = createBuilderState();
    const n = s.addNode(null, { type: 'button', props: { text: 'A' } });
    s.updateProps(n.id, { text: 'B' });
    s.undo();
    assert.equal(s.getNode(n.id).props.text, 'A');
  });

  test('new action clears redo stack', () => {
    const s = createBuilderState();
    s.addNode(null, { type: 'a' });
    s.undo();
    assert.equal(s.canRedo(), true);
    s.addNode(null, { type: 'b' });
    assert.equal(s.canRedo(), false);
  });

  test('respects maxHistory', () => {
    const s = createBuilderState({ maxHistory: 3 });
    for (let i = 0; i < 5; i++) s.addNode(null, { type: `t${i}` });
    let depth = 0;
    while (s.undo()) depth++;
    assert.equal(depth, 3);
  });
});

describe('signal reactivity', () => {
  test('tree() updates trigger effects', () => {
    const s = createBuilderState();
    let runs = 0;
    let lastLen = -1;
    const e = effect(() => {
      runs += 1;
      lastLen = s.tree().length;
    });
    assert.equal(runs, 1);
    s.addNode(null, { type: 'a' });
    assert.equal(runs, 2);
    assert.equal(lastLen, 1);
    s.addNode(null, { type: 'b' });
    assert.equal(runs, 3);
    assert.equal(lastLen, 2);
    e.dispose();
  });

  test('selection() updates trigger effects', () => {
    const s = createBuilderState();
    const n = s.addNode(null, { type: 'a' });
    let runs = 0;
    const e = effect(() => {
      s.selection();
      runs += 1;
    });
    assert.equal(runs, 1);
    s.select(n.id);
    assert.equal(runs, 2);
    s.select(n.id);
    assert.equal(runs, 2, 'no-op select should not re-run');
    e.dispose();
  });
});

describe('subscribe', () => {
  test('emits add/remove/select events', () => {
    const s = createBuilderState();
    const events = [];
    s.subscribe((e) => events.push(e.type));
    const n = s.addNode(null, { type: 'a' });
    s.select(n.id);
    s.removeNode(n.id);
    assert.deepEqual(events, ['add', 'select', 'remove']);
  });

  test('unsubscribe stops events', () => {
    const s = createBuilderState();
    const events = [];
    const off = s.subscribe((e) => events.push(e));
    s.addNode(null, { type: 'a' });
    off();
    s.addNode(null, { type: 'b' });
    assert.equal(events.length, 1);
  });
});

describe('toJSON / fromJSON', () => {
  test('round-trips a tree', () => {
    const a = createBuilderState();
    const root = a.addNode(null, { type: 'section', props: { class: 'hero' } });
    a.addNode(root.id, { type: 'heading', props: { text: 'Hi', level: 'h1' } });
    const json = a.toJSON();

    const b = createBuilderState();
    b.fromJSON(json);
    assert.equal(b.tree().length, 1);
    assert.equal(b.tree()[0].type, 'section');
    assert.equal(b.tree()[0].children[0].props.text, 'Hi');
  });

  test('fromJSON resets history and selection', () => {
    const s = createBuilderState();
    s.addNode(null, { type: 'a' });
    s.select(s.tree()[0].id);
    s.fromJSON(JSON.stringify({ version: '0.1.0', tree: [] }));
    assert.equal(s.tree().length, 0);
    assert.equal(s.selection(), null);
    assert.equal(s.canUndo(), false);
  });
});

describe('getPath', () => {
  test('returns path of ids from root to target', () => {
    const s = createBuilderState();
    const root = s.addNode(null, { type: 'section' });
    const mid = s.addNode(root.id, { type: 'div' });
    const leaf = s.addNode(mid.id, { type: 'text' });
    assert.deepEqual(s.getPath(leaf.id), [root.id, mid.id, leaf.id]);
  });

  test('empty array for missing node', () => {
    const s = createBuilderState();
    assert.deepEqual(s.getPath('nope'), []);
  });
});
