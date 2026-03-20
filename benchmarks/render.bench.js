import { render } from '@basenative/server';
import { performance } from 'node:perf_hooks';

const ITERATIONS = 1000;

// -- Templates --

const simpleTemplate = `<h1>{{ title }}</h1><p>{{ body }}</p>`;
const simpleCtx = { title: 'Hello', body: 'World' };

const listTemplate = `
  <ul>
    <template @for="item of items; track item.id">
      <li>{{ item.name }} — {{ item.status }}</li>
    </template>
  </ul>
`;
const listCtx = {
  items: Array.from({ length: 100 }, (_, i) => ({
    id: i,
    name: `Item ${i}`,
    status: i % 2 === 0 ? 'active' : 'inactive',
  })),
};

const conditionalTemplate = `
  <template @if="showHeader">
    <header><h1>{{ title }}</h1></header>
  </template>
  <template @for="section of sections; track section.id">
    <section>
      <h2>{{ section.heading }}</h2>
      <template @if="section.visible">
        <p>{{ section.content }}</p>
      </template>
    </section>
  </template>
`;
const conditionalCtx = {
  showHeader: true,
  title: 'Dashboard',
  sections: Array.from({ length: 20 }, (_, i) => ({
    id: i,
    heading: `Section ${i}`,
    content: `Content for section ${i}`,
    visible: i % 3 !== 0,
  })),
};

// -- Benchmark runner --

function bench(name, template, ctx) {
  // Warmup
  for (let i = 0; i < 10; i++) render(template, ctx);

  const start = performance.now();
  for (let i = 0; i < ITERATIONS; i++) {
    render(template, ctx);
  }
  const elapsed = performance.now() - start;
  const opsPerSec = Math.round((ITERATIONS / elapsed) * 1000);
  const avgMs = (elapsed / ITERATIONS).toFixed(3);

  console.log(`${name}: ${avgMs}ms avg, ${opsPerSec} ops/sec (${ITERATIONS} iterations)`);
}

console.log('BaseNative Server Render Benchmarks');
console.log('='.repeat(50));

bench('Simple interpolation', simpleTemplate, simpleCtx);
bench('List rendering (100 items)', listTemplate, listCtx);
bench('Conditionals + nested list', conditionalTemplate, conditionalCtx);

console.log('='.repeat(50));
console.log('Done.');
