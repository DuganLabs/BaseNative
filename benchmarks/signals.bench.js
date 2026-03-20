import { signal, computed, effect } from '@basenative/runtime';
import { performance } from 'node:perf_hooks';

const ITERATIONS = 10000;

function bench(name, fn) {
  // Warmup
  for (let i = 0; i < 100; i++) fn();

  const start = performance.now();
  for (let i = 0; i < ITERATIONS; i++) {
    fn();
  }
  const elapsed = performance.now() - start;
  const opsPerSec = Math.round((ITERATIONS / elapsed) * 1000);
  const avgMs = (elapsed / ITERATIONS).toFixed(4);

  console.log(`${name}: ${avgMs}ms avg, ${opsPerSec} ops/sec`);
}

console.log('BaseNative Signal Benchmarks');
console.log('='.repeat(50));

bench('Signal read/write', () => {
  const s = signal(0);
  for (let i = 0; i < 100; i++) {
    s.set(i);
    s();
  }
});

bench('Computed derivation', () => {
  const a = signal(1);
  const b = signal(2);
  const sum = computed(() => a() + b());
  for (let i = 0; i < 100; i++) {
    a.set(i);
    sum();
  }
});

bench('Effect subscription', () => {
  const s = signal(0);
  let count = 0;
  const e = effect(() => { count += s(); });
  for (let i = 0; i < 100; i++) {
    s.set(i);
  }
  e.dispose();
});

bench('Diamond dependency', () => {
  const a = signal(1);
  const b = computed(() => a() * 2);
  const c = computed(() => a() * 3);
  const d = computed(() => b() + c());
  for (let i = 0; i < 100; i++) {
    a.set(i);
    d();
  }
});

console.log('='.repeat(50));
console.log('Done.');
