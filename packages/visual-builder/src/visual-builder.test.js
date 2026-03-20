import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { createCanvas } from './canvas.js';
import { renderCanvas, renderNode } from './renderer.js';
import { serialize, deserialize, exportToHTML } from './serializer.js';
import { createComponentPalette } from './component-palette.js';

describe('createCanvas', () => {
  test('creates canvas with default options', () => {
    const canvas = createCanvas();
    assert.equal(canvas.width, 1024);
    assert.equal(canvas.height, 768);
    assert.equal(canvas.gridSize, 8);
    assert.deepEqual(canvas.getNodes(), []);
  });

  test('creates canvas with custom options', () => {
    const canvas = createCanvas({ width: 1920, height: 1080, gridSize: 16 });
    assert.equal(canvas.width, 1920);
    assert.equal(canvas.height, 1080);
    assert.equal(canvas.gridSize, 16);
  });

  test('addNode adds a node and returns it with defaults', () => {
    const canvas = createCanvas();
    const node = canvas.addNode({ type: 'button', props: { label: 'Click' } });
    assert.equal(node.type, 'button');
    assert.deepEqual(node.props, { label: 'Click' });
    assert.ok(node.id);
    assert.deepEqual(node.position, { x: 0, y: 0 });
    assert.deepEqual(node.size, { width: 100, height: 40 });
    assert.equal(canvas.getNodes().length, 1);
  });

  test('removeNode removes a node by ID', () => {
    const canvas = createCanvas();
    const node = canvas.addNode({ type: 'button' });
    assert.equal(canvas.getNodes().length, 1);
    const removed = canvas.removeNode(node.id);
    assert.equal(removed, true);
    assert.equal(canvas.getNodes().length, 0);
  });

  test('removeNode returns false for non-existent ID', () => {
    const canvas = createCanvas();
    assert.equal(canvas.removeNode('nope'), false);
  });

  test('moveNode updates position', () => {
    const canvas = createCanvas();
    const node = canvas.addNode({ type: 'box' });
    canvas.moveNode(node.id, { x: 100, y: 200 });
    assert.deepEqual(canvas.getNode(node.id).position, { x: 100, y: 200 });
  });

  test('moveNode returns false for non-existent ID', () => {
    const canvas = createCanvas();
    assert.equal(canvas.moveNode('nope', { x: 0, y: 0 }), false);
  });

  test('resizeNode updates size', () => {
    const canvas = createCanvas();
    const node = canvas.addNode({ type: 'box' });
    canvas.resizeNode(node.id, { width: 300, height: 150 });
    assert.deepEqual(canvas.getNode(node.id).size, { width: 300, height: 150 });
  });

  test('resizeNode returns false for non-existent ID', () => {
    const canvas = createCanvas();
    assert.equal(canvas.resizeNode('nope', { width: 1, height: 1 }), false);
  });

  test('getNode returns null for non-existent ID', () => {
    const canvas = createCanvas();
    assert.equal(canvas.getNode('missing'), null);
  });

  test('clear removes all nodes', () => {
    const canvas = createCanvas();
    canvas.addNode({ type: 'a' });
    canvas.addNode({ type: 'b' });
    assert.equal(canvas.getNodes().length, 2);
    canvas.clear();
    assert.equal(canvas.getNodes().length, 0);
  });
});

describe('getTree', () => {
  test('builds parent-child hierarchy', () => {
    const canvas = createCanvas();
    const parent = canvas.addNode({ type: 'container', id: 'parent' });
    canvas.addNode({ type: 'button', id: 'child1', parentId: 'parent' });
    canvas.addNode({ type: 'text', id: 'child2', parentId: 'parent' });

    const tree = canvas.getTree();
    assert.equal(tree.length, 1);
    assert.equal(tree[0].id, 'parent');
    assert.equal(tree[0].children.length, 2);
    assert.equal(tree[0].children[0].id, 'child1');
    assert.equal(tree[0].children[1].id, 'child2');
  });

  test('handles multiple root nodes', () => {
    const canvas = createCanvas();
    canvas.addNode({ type: 'a', id: 'r1' });
    canvas.addNode({ type: 'b', id: 'r2' });
    const tree = canvas.getTree();
    assert.equal(tree.length, 2);
  });

  test('handles nested children', () => {
    const canvas = createCanvas();
    canvas.addNode({ type: 'root', id: 'root' });
    canvas.addNode({ type: 'mid', id: 'mid', parentId: 'root' });
    canvas.addNode({ type: 'leaf', id: 'leaf', parentId: 'mid' });

    const tree = canvas.getTree();
    assert.equal(tree.length, 1);
    assert.equal(tree[0].children[0].id, 'mid');
    assert.equal(tree[0].children[0].children[0].id, 'leaf');
  });
});

describe('undo/redo', () => {
  test('canUndo/canRedo reflect state', () => {
    const canvas = createCanvas();
    assert.equal(canvas.canUndo(), false);
    assert.equal(canvas.canRedo(), false);

    canvas.addNode({ type: 'box' });
    assert.equal(canvas.canUndo(), true);
    assert.equal(canvas.canRedo(), false);
  });

  test('undo reverses addNode', () => {
    const canvas = createCanvas();
    canvas.addNode({ type: 'box' });
    assert.equal(canvas.getNodes().length, 1);

    canvas.undo();
    assert.equal(canvas.getNodes().length, 0);
    assert.equal(canvas.canRedo(), true);
  });

  test('redo re-applies addNode', () => {
    const canvas = createCanvas();
    const node = canvas.addNode({ type: 'box' });
    canvas.undo();
    assert.equal(canvas.getNodes().length, 0);

    canvas.redo();
    assert.equal(canvas.getNodes().length, 1);
    assert.equal(canvas.getNode(node.id).type, 'box');
  });

  test('undo reverses moveNode', () => {
    const canvas = createCanvas();
    const node = canvas.addNode({ type: 'box', position: { x: 10, y: 20 } });
    canvas.moveNode(node.id, { x: 100, y: 200 });
    assert.deepEqual(canvas.getNode(node.id).position, { x: 100, y: 200 });

    canvas.undo();
    assert.deepEqual(canvas.getNode(node.id).position, { x: 10, y: 20 });
  });

  test('undo reverses removeNode', () => {
    const canvas = createCanvas();
    const node = canvas.addNode({ type: 'box' });
    canvas.removeNode(node.id);
    assert.equal(canvas.getNodes().length, 0);

    canvas.undo();
    assert.equal(canvas.getNodes().length, 1);
  });

  test('undo reverses resizeNode', () => {
    const canvas = createCanvas();
    const node = canvas.addNode({ type: 'box', size: { width: 100, height: 50 } });
    canvas.resizeNode(node.id, { width: 300, height: 200 });

    canvas.undo();
    assert.deepEqual(canvas.getNode(node.id).size, { width: 100, height: 50 });
  });

  test('undo reverses clear', () => {
    const canvas = createCanvas();
    canvas.addNode({ type: 'a' });
    canvas.addNode({ type: 'b' });
    canvas.clear();
    assert.equal(canvas.getNodes().length, 0);

    canvas.undo();
    assert.equal(canvas.getNodes().length, 2);
  });

  test('new action clears redo stack', () => {
    const canvas = createCanvas();
    canvas.addNode({ type: 'a' });
    canvas.undo();
    assert.equal(canvas.canRedo(), true);

    canvas.addNode({ type: 'b' });
    assert.equal(canvas.canRedo(), false);
  });

  test('undo returns false when nothing to undo', () => {
    const canvas = createCanvas();
    assert.equal(canvas.undo(), false);
  });

  test('redo returns false when nothing to redo', () => {
    const canvas = createCanvas();
    assert.equal(canvas.redo(), false);
  });
});

describe('subscribe', () => {
  test('fires callback on add', () => {
    const canvas = createCanvas();
    const events = [];
    canvas.subscribe((event, data) => events.push({ event, data }));

    canvas.addNode({ type: 'button' });
    assert.equal(events.length, 1);
    assert.equal(events[0].event, 'add');
    assert.equal(events[0].data.type, 'button');
  });

  test('fires callback on remove', () => {
    const canvas = createCanvas();
    const node = canvas.addNode({ type: 'button' });
    const events = [];
    canvas.subscribe((event, data) => events.push({ event, data }));

    canvas.removeNode(node.id);
    assert.equal(events.length, 1);
    assert.equal(events[0].event, 'remove');
  });

  test('fires callback on move', () => {
    const canvas = createCanvas();
    const node = canvas.addNode({ type: 'button' });
    const events = [];
    canvas.subscribe((event, data) => events.push({ event, data }));

    canvas.moveNode(node.id, { x: 50, y: 50 });
    assert.equal(events[0].event, 'move');
  });

  test('unsubscribe stops notifications', () => {
    const canvas = createCanvas();
    const events = [];
    const unsub = canvas.subscribe((event) => events.push(event));

    canvas.addNode({ type: 'a' });
    assert.equal(events.length, 1);

    unsub();
    canvas.addNode({ type: 'b' });
    assert.equal(events.length, 1);
  });
});

describe('renderCanvas', () => {
  test('renders all root nodes to HTML', () => {
    const canvas = createCanvas();
    canvas.addNode({ type: 'button', props: { label: 'Click Me' } });
    canvas.addNode({ type: 'text', props: { content: 'Hello' } });

    const componentMap = {
      button: (props) => `<button>${props.label}</button>`,
      text: (props) => `<p>${props.content}</p>`,
    };

    const html = renderCanvas(canvas, componentMap);
    assert.ok(html.includes('<button>Click Me</button>'));
    assert.ok(html.includes('<p>Hello</p>'));
  });

  test('renders unknown components as HTML comments', () => {
    const canvas = createCanvas();
    canvas.addNode({ type: 'widget' });

    const html = renderCanvas(canvas, {});
    assert.ok(html.includes('<!-- unknown component: widget -->'));
  });
});

describe('renderNode', () => {
  test('renders a single node', () => {
    const node = {
      id: 'n1',
      type: 'button',
      props: { label: 'Go' },
      children: [],
      position: { x: 0, y: 0 },
      size: { width: 100, height: 40 },
      parentId: null,
    };

    const componentMap = {
      button: (props) => `<button>${props.label}</button>`,
    };

    assert.equal(renderNode(node, componentMap), '<button>Go</button>');
  });

  test('renders node with children', () => {
    const node = {
      id: 'container',
      type: 'div',
      props: {},
      children: [
        {
          id: 'child1',
          type: 'span',
          props: { text: 'Hi' },
          children: [],
          position: { x: 0, y: 0 },
          size: { width: 50, height: 20 },
          parentId: 'container',
        },
      ],
      position: { x: 0, y: 0 },
      size: { width: 200, height: 100 },
      parentId: null,
    };

    const componentMap = {
      div: (props) => `<div>${props.children || ''}</div>`,
      span: (props) => `<span>${props.text}</span>`,
    };

    const html = renderNode(node, componentMap);
    assert.ok(html.includes('<div>'));
    assert.ok(html.includes('<span>Hi</span>'));
    assert.ok(html.includes('</div>'));
  });
});

describe('serialize/deserialize', () => {
  test('round-trips canvas state', () => {
    const canvas = createCanvas({ width: 800, height: 600, gridSize: 4 });
    canvas.addNode({
      type: 'button',
      id: 'btn1',
      props: { label: 'Save' },
      position: { x: 10, y: 20 },
      size: { width: 120, height: 40 },
    });
    canvas.addNode({
      type: 'container',
      id: 'cont1',
    });
    canvas.addNode({
      type: 'text',
      id: 'txt1',
      parentId: 'cont1',
      props: { content: 'Hello' },
    });

    const json = serialize(canvas);
    const parsed = JSON.parse(json);
    assert.equal(parsed.version, '0.2.0');
    assert.equal(parsed.width, 800);
    assert.equal(parsed.nodes.length, 3);

    const restored = deserialize(json);
    assert.equal(restored.width, 800);
    assert.equal(restored.height, 600);
    assert.equal(restored.gridSize, 4);
    assert.equal(restored.getNodes().length, 3);

    const btn = restored.getNode('btn1');
    assert.equal(btn.type, 'button');
    assert.deepEqual(btn.props, { label: 'Save' });
    assert.deepEqual(btn.position, { x: 10, y: 20 });

    const txt = restored.getNode('txt1');
    assert.equal(txt.parentId, 'cont1');
  });
});

describe('exportToHTML', () => {
  test('produces standalone HTML page', () => {
    const canvas = createCanvas();
    canvas.addNode({ type: 'heading', props: { text: 'Welcome' } });

    const componentMap = {
      heading: (props) => `<h1>${props.text}</h1>`,
    };

    const html = exportToHTML(canvas, componentMap);
    assert.ok(html.includes('<!DOCTYPE html>'));
    assert.ok(html.includes('<html'));
    assert.ok(html.includes('<head>'));
    assert.ok(html.includes('<body>'));
    assert.ok(html.includes('<h1>Welcome</h1>'));
    assert.ok(html.includes('</body>'));
    assert.ok(html.includes('</html>'));
  });
});

describe('createComponentPalette', () => {
  test('register and getAll', () => {
    const palette = createComponentPalette();
    palette.register({ type: 'button', label: 'Button', category: 'inputs' });
    palette.register({ type: 'text', label: 'Text', category: 'content' });

    const all = palette.getAll();
    assert.equal(all.length, 2);
    assert.equal(all[0].type, 'button');
  });

  test('register requires type', () => {
    const palette = createComponentPalette();
    assert.throws(() => palette.register({}), /must have a type/);
  });

  test('register fills defaults', () => {
    const palette = createComponentPalette();
    const def = palette.register({ type: 'custom' });
    assert.equal(def.label, 'custom');
    assert.equal(def.category, 'general');
    assert.deepEqual(def.defaultProps, {});
    assert.equal(def.icon, null);
  });

  test('getByCategory filters components', () => {
    const palette = createComponentPalette();
    palette.register({ type: 'button', category: 'inputs' });
    palette.register({ type: 'checkbox', category: 'inputs' });
    palette.register({ type: 'heading', category: 'content' });

    const inputs = palette.getByCategory('inputs');
    assert.equal(inputs.length, 2);

    const content = palette.getByCategory('content');
    assert.equal(content.length, 1);
    assert.equal(content[0].type, 'heading');
  });

  test('search finds by label, type, and category', () => {
    const palette = createComponentPalette();
    palette.register({ type: 'button', label: 'Action Button', category: 'inputs' });
    palette.register({ type: 'heading', label: 'Heading', category: 'content' });

    assert.equal(palette.search('button').length, 1);
    assert.equal(palette.search('action').length, 1);
    assert.equal(palette.search('input').length, 1);
    assert.equal(palette.search('xyz').length, 0);
  });

  test('getComponent returns single definition or null', () => {
    const palette = createComponentPalette();
    palette.register({ type: 'button', label: 'Button' });

    assert.equal(palette.getComponent('button').label, 'Button');
    assert.equal(palette.getComponent('missing'), null);
  });
});
