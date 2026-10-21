import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { createCanvas } from './canvas.js';
import { renderCanvas, renderNode } from './renderer.js';
import { serialize, deserialize, exportToHTML, importFromHTML } from './serializer.js';

// Robustness regression coverage for pathological structure — the family
// that broke the pre-rewrite implementation:
//
//   * removeNode walked descendants recursively and threw RangeError at
//     nesting depths around 10,000.
//   * deserialize ordered parents by recursing up the parent chain, and
//     renderNode recursed once per tree level — same failure class, at
//     whatever depth the engine's stack gave out.
//   * importFromHTML's timing margin on 50,000 unclosed tags was thin
//     enough to fail under parallel test load.
//
// The timing budgets here are regression guards, not the contract's
// 200ms assertions (those live in visual-builder.test.js): each budget is
// several times the measured cost on this machine, set so that an
// algorithmic regression (a rescan-per-node, a recursive walk coming
// back) blows through it by an order of magnitude while ordinary machine
// noise does not.

const DEPTH = 50000;

function chainState(depth) {
  const nodes = [];
  for (let i = 0; i < depth; i++) {
    nodes.push({
      id: `n${i}`,
      type: 'div',
      props: {},
      children: i + 1 < depth ? [`n${i + 1}`] : [],
      position: { x: 0, y: 0 },
      size: { width: 1, height: 1 },
      parentId: i === 0 ? null : `n${i - 1}`,
    });
  }
  return { width: 100, height: 100, gridSize: 8, nodes };
}

function treeDepth(tree) {
  let max = 0;
  const stack = tree.map((node) => ({ node, depth: 1 }));
  while (stack.length > 0) {
    const { node, depth } = stack.pop();
    if (depth > max) max = depth;
    for (const child of node.children) {
      stack.push({ node: child, depth: depth + 1 });
    }
  }
  return max;
}

describe('deep nesting', () => {
  test(`a ${DEPTH}-deep document deserializes, renders, and round-trips`, () => {
    const json = JSON.stringify(chainState(DEPTH));

    const start = Date.now();
    const canvas = deserialize(json);
    assert.ok(Date.now() - start < 2000, 'deserialize must stay linear at depth');
    assert.equal(canvas.getNodes().length, DEPTH);
    assert.equal(treeDepth(canvas.getTree()), DEPTH);

    const renderStart = Date.now();
    const html = renderCanvas(canvas, { div: (p) => `<div>${p.children || ''}</div>` });
    assert.ok(Date.now() - renderStart < 2000, 'render must stay linear at depth');
    assert.equal(html.split('<div>').length - 1, DEPTH);
    assert.equal(html.split('</div>').length - 1, DEPTH);

    // Round-trip: serialize the deep canvas and restore it byte-identically.
    const once = serialize(canvas);
    assert.equal(serialize(deserialize(once)), once);
  });

  test(`removing the root of a ${DEPTH}-deep tree completes and undoes`, () => {
    const canvas = deserialize(JSON.stringify(chainState(DEPTH)));

    const start = Date.now();
    assert.equal(canvas.removeNode('n0'), true);
    assert.ok(Date.now() - start < 2000, 'subtree removal must stay linear at depth');
    assert.equal(canvas.getNodes().length, 0);

    assert.equal(canvas.undo(), true);
    assert.equal(canvas.getNodes().length, DEPTH);
    assert.equal(treeDepth(canvas.getTree()), DEPTH);

    assert.equal(canvas.redo(), true);
    assert.equal(canvas.getNodes().length, 0);
  });

  test('exportToHTML survives a deep tree', () => {
    const canvas = deserialize(JSON.stringify(chainState(5000)));
    const html = exportToHTML(canvas, { div: (p) => `<div>${p.children || ''}</div>` });
    assert.ok(html.startsWith('<!DOCTYPE html>'));
    assert.equal(html.split('<div>').length - 1, 5000);
  });
});

describe('cyclic and self-referential structure', () => {
  test('removeNode terminates on a self-parent node', () => {
    const canvas = createCanvas();
    canvas.addNode({ type: 'div', id: 's', parentId: 's' });
    assert.equal(canvas.removeNode('s'), true);
    assert.equal(canvas.getNodes().length, 0);
  });

  test('removeNode terminates when children lists form a cycle', () => {
    const canvas = createCanvas();
    canvas.addNode({ type: 'div', id: 'root' });
    canvas.addNode({ type: 'div', id: 'x', parentId: 'root', children: ['y'] });
    canvas.addNode({ type: 'div', id: 'y', parentId: 'root', children: ['x'] });
    assert.equal(canvas.removeNode('root'), true);
    assert.equal(canvas.getNodes().length, 0);
  });

  test('renderNode throws RangeError on a true object cycle, like the recursive original', () => {
    const a = {
      id: 'a',
      type: 'div',
      props: {},
      children: [],
      position: { x: 0, y: 0 },
      size: { width: 1, height: 1 },
      parentId: null,
    };
    a.children = [a];
    assert.throws(
      () => renderNode(a, { div: (p) => `<div>${p.children || ''}</div>` }),
      RangeError,
    );
  });

  test('deserialize terminates on cyclic parent references with stable output', () => {
    const state = {
      nodes: [
        {
          id: 'a',
          type: 'div',
          props: {},
          children: ['b'],
          position: { x: 0, y: 0 },
          size: { width: 1, height: 1 },
          parentId: 'b',
        },
        {
          id: 'b',
          type: 'div',
          props: {},
          children: ['a'],
          position: { x: 0, y: 0 },
          size: { width: 1, height: 1 },
          parentId: 'a',
        },
      ],
    };
    const canvas = deserialize(JSON.stringify(state));
    assert.equal(canvas.getNodes().length, 2);
    assert.deepEqual(canvas.getTree(), []);
    // Ordering on a cycle is chain order (b before a here). A cyclic
    // document is not a serialize fixed point — re-deserializing flips
    // the pair — in either implementation; what matters is termination
    // and a stable node set.
    assert.deepEqual(
      canvas.getNodes().map((n) => n.id),
      ['b', 'a'],
    );
    assert.deepEqual(
      deserialize(serialize(canvas))
        .getNodes()
        .map((n) => n.id)
        .sort(),
      ['a', 'b'],
    );
  });
});

describe('misnested and malformed import — exact output', () => {
  test('same-named nesting: first open tag consumes the only closer', () => {
    const canvas = importFromHTML('<body><div><div>inner</div> outer</div><p>tail</p></body>');
    const nodes = canvas.getNodes();
    assert.equal(nodes.length, 2);
    assert.equal(nodes[0].type, 'div');
    assert.equal(nodes[0].props.content, '<div>inner');
    assert.equal(nodes[1].type, 'p');
    assert.equal(nodes[1].props.content, 'tail');
  });

  test('cross-misnested tags close by name, not by position', () => {
    const canvas = importFromHTML('<body><b><i></b></i></body>');
    const nodes = canvas.getNodes();
    assert.equal(nodes.length, 1);
    assert.equal(nodes[0].type, 'b');
    assert.equal(nodes[0].props.content, '<i>');
  });

  test('closer matching is case-sensitive', () => {
    const canvas = importFromHTML('<body><div>x</DIV></body>');
    const nodes = canvas.getNodes();
    assert.equal(nodes.length, 1);
    assert.equal(nodes[0].props.content, undefined);
  });

  test('mixed pathology: unclosed voids, stray closers, comments, text', () => {
    // Note: the scanner has never treated <!-- --> specially — markup
    // inside a comment is scanned as elements. That is long-standing
    // behavior (pinned here so it cannot drift unnoticed), not an
    // endorsement of it.
    const canvas = importFromHTML(
      '<body></div>lead<!-- <span>hidden</span> --><input type="text"><p>a < b</p><input type="number"></body>',
    );
    const nodes = canvas.getNodes();
    assert.deepEqual(
      nodes.map((n) => n.type),
      ['span', 'input', 'p', 'input'],
    );
    assert.equal(nodes[0].props.content, 'hidden');
    assert.equal(nodes[1].props.type, 'text');
    assert.equal(nodes[2].props.content, 'a < b');
    assert.equal(nodes[3].props.type, 'number');
  });

  test('50,000 unclosed siblings with attributes import completely', () => {
    const html = `<body>${'<section class="card" data-i="x">body</section>'.repeat(50000)}</body>`;
    const start = Date.now();
    const canvas = importFromHTML(html);
    assert.ok(Date.now() - start < 2000, 'wide imports must stay linear');
    const nodes = canvas.getNodes();
    assert.equal(nodes.length, 50000);
    assert.equal(nodes[49999].props.class, 'card');
    assert.equal(nodes[49999].props.content, 'body');
    assert.deepEqual(nodes[49999].position, { x: 0, y: 49999 * 50 });
  });
});
