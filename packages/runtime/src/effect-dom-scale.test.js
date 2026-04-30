import { test } from 'node:test';
import assert from 'node:assert/strict';
import { signal, computed, effect, batch } from './signals.js';
import { performance } from 'node:perf_hooks';

// Simulate DOM text node
function createDOMNode(id) {
  return { id, textContent: '' };
}

function measureEffect(name, fn, nodeCount = 1000) {
  const start = performance.now();
  fn();
  const elapsed = performance.now() - start;
  const timePerNode = elapsed / nodeCount;

  console.log(`  ${name}: ${elapsed.toFixed(2)}ms total, ${timePerNode.toFixed(4)}ms per node`);
  return { elapsed, timePerNode };
}

test('effect() re-render overhead at scale — benchmarking tests', async (t) => {
  await t.test('should create 1000 signal→effect pairs efficiently', () => {
    const nodeCount = 1000;
    const result = measureEffect(
      'create 1000 signal→effect pairs',
      () => {
        const effects = [];
        for (let i = 0; i < nodeCount; i++) {
          const s = signal(i);
          const node = createDOMNode(i);
          effects.push(
            effect(() => {
              node.textContent = String(s());
            }),
          );
        }
        for (const e of effects) e.dispose();
      },
      nodeCount,
    );

    // Reasonable expectation: < 1ms per node setup
    assert.ok(
      result.timePerNode < 1,
      `setup took ${result.timePerNode.toFixed(4)}ms per node, expected < 1ms`,
    );
  });

  await t.test('should update 1 signal→1000 effects efficiently', () => {
    const nodeCount = 1000;
    const s = signal(0);
    const nodes = [];
    const effects = [];

    // Setup: create signal + effects
    for (let i = 0; i < nodeCount; i++) {
      const node = createDOMNode(i);
      nodes.push(node);
      effects.push(
        effect(() => {
          node.textContent = `val:${s()}`;
        }),
      );
    }

    // Measure: update the signal
    const start = performance.now();
    s.set(1);
    const elapsed = performance.now() - start;
    const timePerNode = elapsed / nodeCount;

    console.log(
      `  update 1→1000 effects: ${elapsed.toFixed(2)}ms total, ${timePerNode.toFixed(4)}ms per node`,
    );

    // All nodes should have been updated
    nodes.forEach((node, i) => {
      assert.equal(node.textContent, 'val:1', `node ${i} should be updated`);
    });

    // Expectation: < 0.1ms per node
    assert.ok(
      timePerNode < 0.1,
      `update took ${timePerNode.toFixed(4)}ms per node, expected < 0.1ms`,
    );

    for (const e of effects) e.dispose();
  });

  await t.test('batch() reduces effect re-runs on multiple mutations', () => {
    const nodeCount = 100;
    const s = signal(0);
    const effects = [];
    let effectRuns = 0;

    for (let i = 0; i < nodeCount; i++) {
      const node = createDOMNode(i);
      effects.push(
        effect(() => {
          effectRuns++;
          node.textContent = String(s());
        }),
      );
    }

    // Reset after setup
    effectRuns = 0;

    // Unbatched: 2 mutations = 2*100 effect runs (effect runs after each set)
    s.set(1);
    s.set(2);
    const unbatchedRuns = effectRuns;

    // Batched: 2 mutations = 1*100 effect runs (effect runs once after batch)
    effectRuns = 0;
    batch(() => {
      s.set(3);
      s.set(4);
    });
    const batchedRuns = effectRuns;

    console.log(
      `  unbatched 2 mutations: ${unbatchedRuns} effect runs (${unbatchedRuns / nodeCount} per effect)`,
    );
    console.log(
      `  batched 2 mutations: ${batchedRuns} effect runs (${batchedRuns / nodeCount} per effect)`,
    );

    assert.equal(batchedRuns, nodeCount, 'batch() should run effects once');
    assert.equal(unbatchedRuns, nodeCount * 2, 'unbatched should run effects twice');

    for (const e of effects) e.dispose();
  });

  await t.test('computed chains with effects scale to 500 nodes', () => {
    const nodeCount = 500;
    const source = signal(0);
    const nodes = [];
    const effects = [];

    for (let i = 0; i < nodeCount; i++) {
      const idx = i;
      const derived = computed(() => source() + idx);
      const node = createDOMNode(i);
      nodes.push(node);
      effects.push(
        effect(() => {
          node.textContent = String(derived());
        }),
      );
    }

    // Verify initial state
    assert.equal(nodes[0].textContent, '0', 'first node should be 0');
    assert.equal(nodes[10].textContent, '10', 'eleventh node should be 10');

    // Update source and verify all nodes update
    source.set(100);
    assert.equal(nodes[0].textContent, '100', 'first node should be 100');
    assert.equal(nodes[10].textContent, '110', 'eleventh node should be 110');

    for (const e of effects) e.dispose();
  });

  await t.test('diamond dependency: unbatched causes intermediate state', () => {
    // Diamond: a → [b, c], effect reads b + c
    // Unbatched a.set() can cause effect to see intermediate state (b updated, c not yet)
    const a = signal(1);
    const b = computed(() => a() * 2);
    const c = computed(() => a() * 3);
    const values = [];

    effect(() => {
      values.push(b() + c());
    });

    // After setup: effect ran once with correct value
    assert.deepEqual(values, [5], 'initial: b=2, c=3, sum=5');

    // Unbatched: effect may see intermediate state
    a.set(2);
    // This may push [7, 10] or just [10] depending on implementation
    // [7, 10] means: first run saw b=4,c=3 (intermediate), second run saw b=4,c=6 (final)
    assert.ok(values.includes(10), 'final value should include sum=10 (b=4, c=6)');
  });

  await t.test('diamond dependency: batched always sees final state', () => {
    // Same diamond, but wrapped in batch()
    const a = signal(1);
    const b = computed(() => a() * 2);
    const c = computed(() => a() * 3);
    const values = [];

    effect(() => {
      values.push(b() + c());
    });

    assert.deepEqual(values, [5]);

    // Batched: effect only runs after all mutations complete
    batch(() => {
      a.set(2);
    });

    // Should see only final state: b=4, c=6, sum=10
    assert.deepEqual(values, [5, 10], 'batch should only trigger effect once with final values');
  });
});
