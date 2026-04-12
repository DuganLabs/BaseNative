import { signal, computed, effect, batch } from '@basenative/runtime';
import { performance } from 'node:perf_hooks';

const WARMUP = 100;
const ITERATIONS = 2000;

function bench(name, fn) {
  for (let i = 0; i < WARMUP; i++) fn();

  const start = performance.now();
  for (let i = 0; i < ITERATIONS; i++) fn();
  const elapsed = performance.now() - start;

  const opsPerSec = Math.round((ITERATIONS / elapsed) * 1000);
  const avgMs = (elapsed / ITERATIONS).toFixed(4);
  console.log(`  ${name}: ${avgMs}ms avg, ${opsPerSec.toLocaleString()} ops/sec`);
}

console.log('Effect + DOM Node Re-render Benchmarks');
console.log('='.repeat(55));

// Simulate DOM text nodes as plain objects (no real DOM in Node.js)
function createDOMNode(id) {
  return { id, textContent: '' };
}

console.log('\n--- 10,000 DOM nodes, 1 signal each ---');

bench('create 10k signal→effect pairs', () => {
  const nodes = [];
  const effects = [];
  for (let i = 0; i < 10000; i++) {
    const s = signal(i);
    const node = createDOMNode(i);
    effects.push(effect(() => { node.textContent = String(s()); }));
  }
  for (const e of effects) e.dispose();
});

bench('update 1 signal observed by 10k effects', () => {
  const s = signal(0);
  const nodes = [];
  const effects = [];
  for (let i = 0; i < 10000; i++) {
    const node = createDOMNode(i);
    nodes.push(node);
    effects.push(effect(() => { node.textContent = `val:${s()}`; }));
  }
  s.set(1);
  for (const e of effects) e.dispose();
});

bench('batch update 1 signal observed by 10k effects', () => {
  const s = signal(0);
  const nodes = [];
  const effects = [];
  for (let i = 0; i < 10000; i++) {
    const node = createDOMNode(i);
    nodes.push(node);
    effects.push(effect(() => { node.textContent = `val:${s()}`; }));
  }
  batch(() => { s.set(1); });
  for (const e of effects) e.dispose();
});

console.log('\n--- 10,000 nodes with computed derivation ---');

bench('10k computed → effect chains, single source update', () => {
  const source = signal(0);
  const nodes = [];
  const effects = [];
  for (let i = 0; i < 10000; i++) {
    const idx = i;
    const derived = computed(() => source() + idx);
    const node = createDOMNode(i);
    nodes.push(node);
    effects.push(effect(() => { node.textContent = String(derived()); }));
  }
  source.set(1);
  for (const e of effects) e.dispose();
});

bench('10k computed → effect chains, batched source update', () => {
  const source = signal(0);
  const nodes = [];
  const effects = [];
  for (let i = 0; i < 10000; i++) {
    const idx = i;
    const derived = computed(() => source() + idx);
    const node = createDOMNode(i);
    nodes.push(node);
    effects.push(effect(() => { node.textContent = String(derived()); }));
  }
  batch(() => { source.set(1); });
  for (const e of effects) e.dispose();
});

console.log('\n--- Diamond dependency at scale ---');

bench('1000 diamond graphs (A→B,A→C,effect(B+C))', () => {
  const effects = [];
  for (let i = 0; i < 1000; i++) {
    const a = signal(i);
    const b = computed(() => a() * 2);
    const c = computed(() => a() * 3);
    const node = createDOMNode(i);
    effects.push(effect(() => { node.textContent = String(b() + c()); }));
    a.set(i + 1);
  }
  for (const e of effects) e.dispose();
});

bench('1000 diamond graphs batched', () => {
  const effects = [];
  for (let i = 0; i < 1000; i++) {
    const a = signal(i);
    const b = computed(() => a() * 2);
    const c = computed(() => a() * 3);
    const node = createDOMNode(i);
    effects.push(effect(() => { node.textContent = String(b() + c()); }));
    batch(() => { a.set(i + 1); });
  }
  for (const e of effects) e.dispose();
});

console.log('\n--- Multi-signal batch updates ---');

bench('batch 100 signal updates, 100 effects each', () => {
  const signals = Array.from({ length: 100 }, (_, i) => signal(i));
  const effects = [];
  for (let i = 0; i < 100; i++) {
    const s = signals[i];
    for (let j = 0; j < 100; j++) {
      const node = createDOMNode(i * 100 + j);
      effects.push(effect(() => { node.textContent = String(s()); }));
    }
  }
  batch(() => {
    for (const s of signals) s.set(v => v + 1);
  });
  for (const e of effects) e.dispose();
});

console.log('\n' + '='.repeat(55));
console.log('Done.');
