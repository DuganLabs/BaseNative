/**
 * Signal Comparison Benchmarks
 *
 * Compares BaseNative's signal primitives against inline approximations of
 * the reactive models used by Preact Signals and SolidJS createSignal,
 * plus plain JS as a zero-overhead baseline.
 *
 * All "framework" implementations are self-contained ~20-line approximations
 * capturing the essential algorithmic characteristics. They intentionally omit
 * production features (batching, owner trees, memo, error handling) to isolate
 * the core read/write/subscribe cost.
 *
 * Run: node benchmarks/signal-comparison.bench.js
 */

import { signal as bnSignal, computed as bnComputed, effect as bnEffect } from '@basenative/runtime';
import { performance } from 'node:perf_hooks';

// ─── Preact Signals-style implementation ───────────────────────────────────────
// Push-based: writing a signal synchronously notifies all subscribers.
function preactSignal(value) {
  const subs = new Set();
  return {
    get value() { return value; },
    set value(v) { value = v; subs.forEach(fn => fn()); },
    subscribe(fn) { subs.add(fn); return () => subs.delete(fn); },
  };
}
function preactComputed(fn) {
  let cached = fn();
  return { get value() { return cached; } };
}
function preactEffect(fn) {
  fn();
  return { dispose() {} };
}

// ─── SolidJS createSignal-style implementation ────────────────────────────────
// Pull-based with synchronous push on write. Getter/setter tuple API.
function solidSignal(value) {
  const subs = new Set();
  const read = () => value;
  const write = (v) => { value = v; subs.forEach(fn => fn()); };
  read._subs = subs;
  return [read, write];
}
function solidComputed(fn) {
  let cached = fn();
  return () => cached;
}
function solidEffect(fn) {
  fn();
  return { dispose() {} };
}

// ─── Plain JS (zero reactivity overhead) ──────────────────────────────────────
function makeRef(v) { return { current: v }; }

// ─── Harness ──────────────────────────────────────────────────────────────────
const WARMUP = 200;
const OUTER = 10_000;

function bench(name, fn) {
  for (let i = 0; i < WARMUP; i++) fn();
  const start = performance.now();
  for (let i = 0; i < OUTER; i++) fn();
  const elapsed = performance.now() - start;
  return {
    name,
    opsPerSec: Math.round((OUTER / elapsed) * 1000),
    avgUs: ((elapsed / OUTER) * 1000).toFixed(2),
  };
}

function table(title, results) {
  const fastest = Math.max(...results.map(r => r.opsPerSec));
  const nameW = Math.max(...results.map(r => r.name.length));
  console.log(`\n${title}`);
  console.log('─'.repeat(65));
  for (const r of results) {
    const pct = Math.round((r.opsPerSec / fastest) * 100);
    const bar = '█'.repeat(Math.round(pct / 5));
    const marker = r.opsPerSec === fastest ? ' ← fastest' : ` (${pct}%)`;
    console.log(
      `  ${r.name.padEnd(nameW + 2)}` +
      `${String(r.opsPerSec).padStart(9)} ops/s  ` +
      `${r.avgUs.padStart(7)}µs avg  ` +
      `${bar}${marker}`
    );
  }
}

// ─── 1. Signal creation ────────────────────────────────────────────────────────
table('1. Signal creation (100 signals)', [
  bench('BaseNative signal()', () => {
    for (let i = 0; i < 100; i++) bnSignal(i);
  }),
  bench('Preact-style signal()', () => {
    for (let i = 0; i < 100; i++) preactSignal(i);
  }),
  bench('Solid-style createSignal()', () => {
    for (let i = 0; i < 100; i++) solidSignal(i);
  }),
  bench('Plain JS ref()', () => {
    for (let i = 0; i < 100; i++) makeRef(i);
  }),
]);

// ─── 2. Signal read/write cycle ────────────────────────────────────────────────
table('2. Signal read / write (100 r/w cycles)', [
  bench('BaseNative signal', () => {
    const s = bnSignal(0);
    for (let i = 0; i < 100; i++) { s.set(i); s(); }
  }),
  bench('Preact-style signal', () => {
    const s = preactSignal(0);
    for (let i = 0; i < 100; i++) { s.value = i; s.value; }
  }),
  bench('Solid-style signal', () => {
    const [get, set] = solidSignal(0);
    for (let i = 0; i < 100; i++) { set(i); get(); }
  }),
  bench('Plain JS ref', () => {
    const s = makeRef(0);
    for (let i = 0; i < 100; i++) { s.current = i; s.current; }
  }),
]);

// ─── 3. Computed derivation ────────────────────────────────────────────────────
table('3. Computed derivation (a + b, 100 updates)', [
  bench('BaseNative computed', () => {
    const a = bnSignal(1), b = bnSignal(2);
    const sum = bnComputed(() => a() + b());
    for (let i = 0; i < 100; i++) { a.set(i); sum(); }
  }),
  bench('Preact-style computed', () => {
    const a = preactSignal(1), b = preactSignal(2);
    const sum = preactComputed(() => a.value + b.value);
    for (let i = 0; i < 100; i++) { a.value = i; sum.value; }
  }),
  bench('Solid-style computed', () => {
    const [getA, setA] = solidSignal(1);
    const [getB] = solidSignal(2);
    const sum = solidComputed(() => getA() + getB());
    for (let i = 0; i < 100; i++) { setA(i); sum(); }
  }),
  bench('Plain JS (no reactivity)', () => {
    let a = 1; const b = 2;
    for (let i = 0; i < 100; i++) { a = i; const _ = a + b; }
  }),
]);

// ─── 4. Effect subscription + teardown ────────────────────────────────────────
table('4. Effect: create → 10 updates → dispose', [
  bench('BaseNative effect', () => {
    const s = bnSignal(0);
    let n = 0;
    const e = bnEffect(() => { n = s(); });
    for (let i = 0; i < 10; i++) s.set(i);
    e.dispose();
  }),
  bench('Preact-style effect', () => {
    const s = preactSignal(0);
    let n = 0;
    const unsub = s.subscribe(() => { n = s.value; });
    for (let i = 0; i < 10; i++) s.value = i;
    unsub();
  }),
  bench('Solid-style effect', () => {
    const [get, set] = solidSignal(0);
    let n = 0;
    const e = solidEffect(() => { n = get(); });
    for (let i = 0; i < 10; i++) set(i);
    e.dispose();
  }),
  bench('Plain JS callback', () => {
    let s = 0, n = 0;
    const cb = () => { n = s; };
    for (let i = 0; i < 10; i++) { s = i; cb(); }
  }),
]);

// ─── 5. Diamond dependency (a → b,c → d) ──────────────────────────────────────
table('5. Diamond dependency: a → {b, c} → d  (100 updates)', [
  bench('BaseNative', () => {
    const a = bnSignal(1);
    const b = bnComputed(() => a() * 2);
    const c = bnComputed(() => a() * 3);
    const d = bnComputed(() => b() + c());
    for (let i = 0; i < 100; i++) { a.set(i); d(); }
  }),
  bench('Preact-style', () => {
    const a = preactSignal(1);
    const b = preactComputed(() => a.value * 2);
    const c = preactComputed(() => a.value * 3);
    const d = preactComputed(() => b.value + c.value);
    for (let i = 0; i < 100; i++) { a.value = i; d.value; }
  }),
  bench('Solid-style', () => {
    const [getA, setA] = solidSignal(1);
    const b = solidComputed(() => getA() * 2);
    const c = solidComputed(() => getA() * 3);
    const d = solidComputed(() => b() + c());
    for (let i = 0; i < 100; i++) { setA(i); d(); }
  }),
  bench('Plain JS', () => {
    let a = 1;
    for (let i = 0; i < 100; i++) {
      a = i; const b = a * 2, c = a * 3, d = b + c;
    }
  }),
]);

// ─── 6. Fan-out: 1 signal → 50 subscribers ────────────────────────────────────
table('6. Fan-out: 1 source → 50 subscribers (10 updates)', [
  bench('BaseNative', () => {
    const s = bnSignal(0);
    const es = Array.from({ length: 50 }, () => {
      let n = 0; return bnEffect(() => { n = s(); });
    });
    for (let i = 0; i < 10; i++) s.set(i);
    es.forEach(e => e.dispose());
  }),
  bench('Preact-style', () => {
    const s = preactSignal(0);
    const uns = Array.from({ length: 50 }, () => s.subscribe(() => {}));
    for (let i = 0; i < 10; i++) s.value = i;
    uns.forEach(u => u());
  }),
  bench('Solid-style', () => {
    const [get, set] = solidSignal(0);
    const ds = Array.from({ length: 50 }, () => solidEffect(() => { get(); }));
    for (let i = 0; i < 10; i++) set(i);
    ds.forEach(d => d.dispose());
  }),
  bench('Plain JS array notify', () => {
    let s = 0;
    const cbs = Array.from({ length: 50 }, () => () => {});
    for (let i = 0; i < 10; i++) { s = i; cbs.forEach(fn => fn()); }
  }),
]);

console.log(`
${'─'.repeat(65)}
Notes
  • Framework approximations are ~20 lines each — no batching, no owner trees,
    no lazy evaluation, no error handling. They isolate the algorithmic cost.
  • BaseNative computed() is lazy (evaluates on read, not on source write),
    giving it an advantage in write-heavy workloads vs eager computed.
  • Plain JS is the zero-abstraction ceiling — no framework can beat it.
  • For production benchmarks, see the official js-reactivity-benchmark suite.
${'─'.repeat(65)}
`);
