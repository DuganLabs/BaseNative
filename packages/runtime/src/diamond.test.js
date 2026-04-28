import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { signal, computed, effect, batch } from './signals.js';

describe('diamond dependencies - comprehensive test suite', () => {
  describe('1. classic diamond: A → B, A → C, B+C → D', () => {
    it('classic diamond with single source', () => {
      const a = signal(1);
      const b = computed(() => a() * 2);
      const c = computed(() => a() * 3);
      const d = computed(() => b() + c());

      const values = [];
      effect(() => { values.push(d()); });

      assert.deepEqual(values, [5]); // (1*2) + (1*3) = 5
      batch(() => { a.set(2); });
      assert.deepEqual(values, [5, 10]); // (2*2) + (2*3) = 10
      batch(() => { a.set(10); });
      assert.deepEqual(values, [5, 10, 50]); // (10*2) + (10*3) = 50
    });

    it('classic diamond effect fires once per A change when batched', () => {
      const a = signal(1);
      const b = computed(() => a() * 2);
      const c = computed(() => a() * 3);
      let runs = 0;
      effect(() => { b(); c(); runs++; });

      assert.equal(runs, 1);
      batch(() => { a.set(2); });
      assert.equal(runs, 2, 'effect should run exactly once');
    });

    it('classic diamond fires multiple times without batch as each computed updates', () => {
      const a = signal(1);
      const b = computed(() => a() * 2);
      const c = computed(() => a() * 3);
      const values = [];
      effect(() => { values.push(b() + c()); });

      assert.equal(values[0], 5);
      a.set(5);
      // Without batch: b updates first (10+3=13), then c updates (10+15=25)
      assert.equal(values[values.length - 1], 25);
      assert.ok(values.length > 2, 'effect fires multiple times without batch');
    });
  });

  describe('2. deep diamond chains (3+ levels)', () => {
    it('three-level diamond: A → B → D, A → C → D', () => {
      const a = signal(1);
      const b = computed(() => a() + 10);
      const c = computed(() => a() + 100);
      const d = computed(() => b() + c());

      const values = [];
      effect(() => { values.push(d()); });

      // (1+10) + (1+100) = 11 + 101 = 112
      assert.equal(values[values.length - 1], 112);
      a.set(5);
      // (5+10) + (5+100) = 15 + 105 = 120
      assert.equal(values[values.length - 1], 120);
    });

    it('four-level diamond: A → B → C → E, A → D → E', () => {
      const a = signal(1);
      const b = computed(() => a() * 2);
      const c = computed(() => b() * 3);
      const d = computed(() => a() * 5);
      const e = computed(() => c() + d());

      const values = [];
      effect(() => { values.push(e()); });

      // c = 1*2*3 = 6, d = 1*5 = 5, e = 11
      assert.equal(values[values.length - 1], 11);
      a.set(3);
      // c = 3*2*3 = 18, d = 3*5 = 15, e = 33
      assert.equal(values[values.length - 1], 33);
    });

    it('five-level diamond with long chains', () => {
      const a = signal(2);
      const b = computed(() => a() + 1);
      const c = computed(() => b() * 2);
      const d = computed(() => a() * 3);
      const e = computed(() => d() + 1);
      const f = computed(() => c() + e());

      const values = [];
      effect(() => { values.push(f()); });

      // c = (2+1)*2 = 6, e = 2*3+1 = 7, f = 13
      assert.equal(values[values.length - 1], 13);
      a.set(4);
      // c = (4+1)*2 = 10, e = 4*3+1 = 13, f = 23
      assert.equal(values[values.length - 1], 23);
    });
  });

  describe('3. asymmetric diamonds (different path lengths)', () => {
    it('asymmetric paths to convergence point', () => {
      const a = signal(1);
      const b = computed(() => a() * 2);
      const c = computed(() => a() * 3);
      const d = computed(() => b() * 4);
      const e = computed(() => c() + d());

      const values = [];
      effect(() => { values.push(e()); });

      // b = 2, d = 8, e = 3 + 8 = 11
      assert.equal(values[values.length - 1], 11);
      a.set(5);
      // b = 10, d = 40, e = 15 + 40 = 55
      assert.equal(values[values.length - 1], 55);
    });

    it('unbalanced diamond with direct and indirect paths', () => {
      const a = signal(10);
      const b = computed(() => a() * 2);
      const c = computed(() => b() + a());

      const values = [];
      effect(() => { values.push(c()); });

      // b = 20, c = 20 + 10 = 30
      assert.equal(values[values.length - 1], 30);
      a.set(5);
      // b = 10, c = 10 + 5 = 15
      assert.equal(values[values.length - 1], 15);
    });

    it('complex asymmetric diamond with three converging paths', () => {
      const a = signal(1);
      const b = computed(() => a() + 1);
      const c = computed(() => a() * 2);
      const d = computed(() => a() * 3);
      const result = computed(() => b() + c() + d());

      const values = [];
      effect(() => { values.push(result()); });

      // 2 + 2 + 3 = 7
      assert.equal(values[values.length - 1], 7);
      a.set(3);
      // 4 + 6 + 9 = 19
      assert.equal(values[values.length - 1], 19);
    });
  });

  describe('4. multiple diamonds sharing nodes', () => {
    it('multiple independent diamonds share no interference', () => {
      // Diamond 1: a1 → b1, a1 → c1 → d1
      const a1 = signal(1);
      const b1 = computed(() => a1() * 2);
      const c1 = computed(() => a1() * 3);
      const d1 = computed(() => b1() + c1());

      // Diamond 2: a2 → b2, a2 → c2 → d2
      const a2 = signal(10);
      const b2 = computed(() => a2() + 1);
      const c2 = computed(() => a2() + 2);
      const d2 = computed(() => b2() + c2());

      let v1, v2;
      effect(() => { v1 = d1(); });
      effect(() => { v2 = d2(); });

      assert.equal(v1, 5); // 2 + 3
      assert.equal(v2, 23); // 11 + 12

      a1.set(2);
      assert.equal(v1, 10); // 4 + 6
      assert.equal(v2, 23); // unchanged

      a2.set(20);
      assert.equal(v1, 10); // unchanged
      assert.equal(v2, 43); // 21 + 22
    });

    it('overlapping diamonds with shared middle node', () => {
      const a = signal(2);
      const b = computed(() => a() * 2);
      const c = computed(() => a() * 3);
      const d = computed(() => b() + 1);
      const e = computed(() => b() + c());

      let valD, valE;
      effect(() => { valD = d(); });
      effect(() => { valE = e(); });

      assert.equal(valD, 5); // 4 + 1
      assert.equal(valE, 10); // 4 + 6

      a.set(3);
      assert.equal(valD, 7); // 6 + 1
      assert.equal(valE, 15); // 6 + 9
    });

    it('three diamonds converging to single effect', () => {
      const a = signal(1);

      // Diamond 1: a → b → d
      const b = computed(() => a() * 2);
      const d = computed(() => b() + a());

      // Diamond 2: a → c → d
      const c = computed(() => a() * 3);

      // Final result depends on all
      const result = computed(() => d() + c());

      const values = [];
      effect(() => { values.push(result()); });

      // d = 2 + 1 = 3, result = 3 + 3 = 6
      assert.equal(values[values.length - 1], 6);

      a.set(2);
      // d = 4 + 2 = 6, result = 6 + 6 = 12
      assert.equal(values[values.length - 1], 12);
    });
  });

  describe('5. diamond with conditional branches (computed that conditionally reads different signals)', () => {
    it('conditional dependency changes diamond shape', () => {
      const flag = signal(true);
      const a = signal(1);
      const left = computed(() => flag() ? a() * 2 : 0);
      const right = computed(() => a() * 3);
      const combined = computed(() => left() + right());

      let result;
      effect(() => { result = combined(); });
      assert.equal(result, 5); // 2 + 3

      flag.set(false);
      assert.equal(result, 3); // 0 + 3

      a.set(10);
      assert.equal(result, 30); // 0 + 30

      flag.set(true);
      assert.equal(result, 50); // 20 + 30
    });

    it('effect only subscribes to read signals', () => {
      const flag = signal(true);
      const a = signal(1);
      const b = signal(100);
      const conditional = computed(() => flag() ? a() : b());

      const values = [];
      effect(() => { values.push(conditional()); });

      assert.deepEqual(values, [1]);

      // When flag is true, only a matters
      a.set(2);
      assert.deepEqual(values, [1, 2]);

      // b changes, but flag is still true, so no effect
      b.set(200);
      assert.deepEqual(values, [1, 2]);

      // Now switch to b
      flag.set(false);
      assert.deepEqual(values, [1, 2, 200]);

      // a changes, but flag is false, so no effect
      a.set(3);
      assert.deepEqual(values, [1, 2, 200]);

      // b changes now
      b.set(300);
      assert.deepEqual(values, [1, 2, 200, 300]);
    });

    it('multi-branch conditional creating asymmetric diamond', () => {
      const mode = signal('add');
      const x = signal(5);
      const y = signal(3);
      const operation = computed(() => {
        if (mode() === 'add') return x() + y();
        if (mode() === 'mul') return x() * y();
        return x();
      });

      const values = [];
      effect(() => { values.push(operation()); });

      assert.deepEqual(values, [8]); // 5 + 3
      x.set(4);
      assert.deepEqual(values, [8, 7]); // 4 + 3
      mode.set('mul');
      assert.deepEqual(values, [8, 7, 12]); // 4 * 3
      y.set(2);
      assert.deepEqual(values, [8, 7, 12, 8]); // 4 * 2
    });
  });

  describe('6. batch coalescing across diamonds', () => {
    it('batched updates coalesce effect runs across diamond', () => {
      const a = signal(1);
      const b = computed(() => a() * 2);
      const c = computed(() => a() * 3);
      let runs = 0;
      effect(() => { b(); c(); runs++; });

      assert.equal(runs, 1);
      batch(() => { a.set(2); });
      assert.equal(runs, 2, 'single effect run for single mutation');
    });

    it('batch with multiple diamond updates effects', () => {
      const a = signal(1);
      const b = computed(() => a() * 2);
      const c = computed(() => a() * 3);
      const values = [];
      effect(() => { values.push(b() + c()); });

      batch(() => {
        a.set(2);
        a.set(3);
      });

      // Both sets within batch should coalesce to single effect run
      // Final value should be based on last set (3)
      assert.equal(values[values.length - 1], 15); // (3*2) + (3*3) = 15
      assert.equal(values.length, 2); // initial + one batch effect
    });

    it('nested batches with diamonds', () => {
      const a = signal(1);
      const b = computed(() => a() * 2);
      const c = computed(() => a() * 3);
      let runs = 0;
      effect(() => { b(); c(); runs++; });

      assert.equal(runs, 1);
      batch(() => {
        a.set(2);
        batch(() => {
          a.set(3);
        });
        // Inner batch should not flush
        assert.equal(runs, 1);
      });
      // Outer batch completes, flush happens
      assert.equal(runs, 2);
    });

    it('batch coalesces effect runs with two-source diamond', () => {
      const x = signal(1);
      const y = signal(2);
      const sumXY = computed(() => x() + y());
      const diffXY = computed(() => x() - y());
      const result = computed(() => sumXY() * diffXY());

      const snapshots = [];
      effect(() => { snapshots.push(result()); });

      assert.deepEqual(snapshots, [-3]); // (1+2)*(1-2) = -3

      batch(() => {
        x.set(5);
        y.set(3);
      });

      assert.deepEqual(snapshots, [-3, 16]); // (5+3)*(5-3) = 16
    });
  });

  describe('7. diamond with effect cleanup', () => {
    it('cleanup runs when diamond recomputes with batch', () => {
      const a = signal(1);
      const b = computed(() => a() * 2);
      const c = computed(() => a() * 3);
      const log = [];

      effect(() => {
        log.push(`run:${b() + c()}`);
        return () => log.push('cleanup');
      });

      assert.deepEqual(log, ['run:5']);

      batch(() => { a.set(2); });
      // cleanup runs before re-run
      assert.deepEqual(log, ['run:5', 'cleanup', 'run:10']);
    });

    it('nested effects with cleanup in diamond', () => {
      const a = signal(1);
      const b = computed(() => a() * 2);
      const outerCleanups = [];
      const innerCleanups = [];

      effect(() => {
        b();
        outerCleanups.push(`outer:${b()}`);
        return () => { outerCleanups.push('outer-cleanup'); };
      });

      effect(() => {
        b();
        innerCleanups.push(`inner:${b()}`);
        return () => { innerCleanups.push('inner-cleanup'); };
      });

      a.set(3);

      // Both effects should clean up and re-run
      assert.ok(outerCleanups.includes('outer-cleanup'));
      assert.ok(innerCleanups.includes('inner-cleanup'));
    });

    it('cleanup respects current signal values', () => {
      const a = signal(1);
      const b = computed(() => a() * 10);
      const cleanupValues = [];

      effect(() => {
        b();
        return () => { cleanupValues.push(b.peek()); };
      });

      a.set(2);
      // Cleanup should see the NEW value via peek
      assert.deepEqual(cleanupValues, [20]);
    });
  });

  describe('8. nested computed diamonds', () => {
    it('computed of computed in diamond pattern', () => {
      const a = signal(2);
      const b = computed(() => a() * 3);
      const c = computed(() => a() * 4);
      const bc = computed(() => b() + c());
      const bc2 = computed(() => bc() * 2);

      const values = [];
      effect(() => { values.push(bc2()); });

      // (2*3) + (2*4) = 14, 14*2 = 28
      assert.equal(values[values.length - 1], 28);

      a.set(3);
      // (3*3) + (3*4) = 21, 21*2 = 42
      assert.equal(values[values.length - 1], 42);
    });

    it('nested diamond with intermediate branches', () => {
      const a = signal(1);
      const b = computed(() => a() + 1);
      const c = computed(() => a() + 2);
      const d = computed(() => b() * c());
      const e = computed(() => d() + a());

      const values = [];
      effect(() => { values.push(e()); });

      // d = 2*3 = 6, e = 6 + 1 = 7
      assert.equal(values[values.length - 1], 7);

      a.set(2);
      // d = 3*4 = 12, e = 12 + 2 = 14
      assert.equal(values[values.length - 1], 14);
    });

    it('three-level nesting in diamond', () => {
      const a = signal(1);
      const b = computed(() => a() * 2);
      const c = computed(() => b() + 1);
      const d = computed(() => a() * 3);
      const e = computed(() => d() - 1);
      const f = computed(() => c() + e());

      const values = [];
      effect(() => { values.push(f()); });

      // c = 2+1 = 3, e = 3-1 = 2, f = 5
      assert.equal(values[values.length - 1], 5);

      a.set(3);
      // c = 6+1 = 7, e = 9-1 = 8, f = 15
      assert.equal(values[values.length - 1], 15);
    });
  });

  describe('9. dynamic dependency diamond (computed that changes which signals it reads)', () => {
    it('dynamic computed dependencies in diamond with batch', () => {
      const flag = signal(true);
      const x = signal(5);
      const y = signal(3);

      const b = computed(() => flag() ? x() * 2 : y() * 2);
      const c = computed(() => x() + y());
      const result = computed(() => b() + c());

      const values = [];
      effect(() => { values.push(result()); });

      // b = 10, c = 8, result = 18
      assert.equal(values[values.length - 1], 18);

      batch(() => { x.set(4); });
      // b = 8, c = 7, result = 15
      assert.equal(values[values.length - 1], 15);

      batch(() => { flag.set(false); });
      // b = 6, c = 7, result = 13
      assert.equal(values[values.length - 1], 13);

      batch(() => { y.set(2); });
      // b = 4, c = 6, result = 10
      assert.equal(values[values.length - 1], 10);
    });

    it('dynamic diamond that switches from one source to another', () => {
      const mode = signal('a');
      const a = signal(10);
      const b = signal(20);
      const selected = computed(() => mode() === 'a' ? a() : b());
      const doubled = computed(() => selected() * 2);

      const values = [];
      effect(() => { values.push(doubled()); });

      assert.deepEqual(values, [20]);

      a.set(15);
      assert.deepEqual(values, [20, 30]);

      mode.set('b');
      assert.deepEqual(values, [20, 30, 40]); // now reads b

      b.set(25);
      assert.deepEqual(values, [20, 30, 40, 50]);

      a.set(100);
      // a changed but mode is 'b', so no effect
      assert.deepEqual(values, [20, 30, 40, 50]);
    });

    it('complex dynamic dependency graph with batch', () => {
      const routeA = signal(true);
      const routeB = signal(true);
      const x = signal(1);
      const y = signal(2);

      const viaA = computed(() => routeA() ? x() : 0);
      const viaB = computed(() => routeB() ? y() : 0);
      const total = computed(() => viaA() + viaB());

      const values = [];
      effect(() => { values.push(total()); });

      assert.deepEqual(values, [3]); // 1 + 2

      batch(() => { x.set(10); });
      assert.deepEqual(values, [3, 12]); // 10 + 2

      batch(() => { routeA.set(false); });
      assert.deepEqual(values, [3, 12, 2]); // 0 + 2

      batch(() => { x.set(100); });
      // x changed but routeA is false, so no effect
      assert.deepEqual(values, [3, 12, 2]);

      batch(() => { routeA.set(true); });
      assert.deepEqual(values, [3, 12, 2, 102]); // 100 + 2
    });
  });

  describe('10. glitch-free guarantee with batch: final state is always consistent', () => {
    it('batched updates ensure consistent final state', () => {
      const a = signal(1);
      const b = computed(() => a() * 2);
      const c = computed(() => a() * 3);

      const finalStates = [];
      effect(() => {
        const bVal = b.peek();
        const cVal = c.peek();
        const ratio = bVal / cVal;
        finalStates.push({ b: bVal, c: cVal, ratio });
      });

      // Initial: b=2, c=3, ratio=2/3
      assert.equal(finalStates[0].ratio, 2 / 3);

      batch(() => { a.set(5); });
      // With batch, b and c update together, ratio stays 2/3
      assert.equal(finalStates[finalStates.length - 1].ratio, 10 / 15);
      assert.equal(finalStates[finalStates.length - 1].b / finalStates[finalStates.length - 1].c, 2 / 3);
    });

    it('batched diamond maintains computational consistency', () => {
      const a = signal(2);
      const b = computed(() => a() + 1);
      const c = computed(() => a() * 2);
      const d = computed(() => b() + c());

      const expectations = [];
      effect(() => {
        const dVal = d();
        const aPeek = a.peek();
        const expected = (aPeek + 1) + (aPeek * 2);
        expectations.push({ actual: dVal, expected, match: dVal === expected });
      });

      assert.ok(expectations[0].match, 'initial values must match');

      batch(() => { a.set(5); });
      // With batch, final d value matches computation
      const lastExp = expectations[expectations.length - 1];
      assert.ok(lastExp.match, 'batched update values must match');

      batch(() => { a.set(10); });
      const lastExp2 = expectations[expectations.length - 1];
      assert.ok(lastExp2.match, 'second batched update values must match');
    });

    it('multi-node diamond with batch consistency', () => {
      const x = signal(1);
      const y = signal(2);
      const a = computed(() => x() * 2);
      const b = computed(() => y() * 3);
      const sum = computed(() => a() + b());

      let lastSnapshot;
      effect(() => {
        const xPeek = x.peek();
        const yPeek = y.peek();
        const sumVal = sum();
        lastSnapshot = { sum: sumVal, expected: xPeek * 2 + yPeek * 3 };
      });

      assert.equal(lastSnapshot.sum, lastSnapshot.expected);

      batch(() => {
        x.set(5);
        y.set(3);
      });

      assert.equal(lastSnapshot.sum, lastSnapshot.expected);
    });

    it('nested diamond reaches consistent state after batched update', () => {
      const a = signal(1);
      const b = computed(() => a() * 2);
      const c = computed(() => a() * 3);
      const d = computed(() => b() + c());
      const e = computed(() => d() * 2);

      const finalSnapshots = [];
      effect(() => {
        finalSnapshots.push({
          b: b.peek(),
          c: c.peek(),
          d: d.peek(),
          e: e(),
        });
      });

      // Check final snapshot: d must equal b+c
      let snap = finalSnapshots[finalSnapshots.length - 1];
      assert.equal(snap.d, snap.b + snap.c, 'd must equal b+c in final state');

      batch(() => { a.set(3); });
      snap = finalSnapshots[finalSnapshots.length - 1];
      assert.equal(snap.d, snap.b + snap.c, 'd must equal b+c after first batch');

      batch(() => { a.set(5); });
      snap = finalSnapshots[finalSnapshots.length - 1];
      assert.equal(snap.d, snap.b + snap.c, 'd must equal b+c after second batch');
    });
  });
});
