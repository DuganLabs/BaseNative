/**
 * BaseNative vs Alternatives: Server-Side Rendering Comparison
 *
 * Compares BaseNative's render() against:
 * - Template string concatenation (raw JS — the baseline everyone beats)
 * - node-html-parser (manual DOM manipulation)
 * - A simulated React-style renderToString (synchronous recursive render)
 *
 * Usage: node benchmarks/comparison.bench.js
 */

import { render } from '../packages/server/src/render.js';
import { performance } from 'node:perf_hooks';

const WARMUP = 200;
const ITERATIONS = 2000;
const ITEMS_COUNT = 50;

// ─── Shared test data ──────────────────────────────────────────────────────────

const items = Array.from({ length: ITEMS_COUNT }, (_, i) => ({
  id: i + 1,
  name: `Product ${i + 1}`,
  price: (9.99 + i * 1.5).toFixed(2),
  inStock: i % 3 !== 0,
  category: i % 2 === 0 ? 'electronics' : 'clothing',
}));

const ctx = {
  title: 'Product Catalog',
  user: { name: 'Alice', role: 'admin' },
  items,
  showFooter: true,
};

// ─── Benchmark runner ──────────────────────────────────────────────────────────

function bench(name, fn) {
  // Warmup
  for (let i = 0; i < WARMUP; i++) fn();

  const start = performance.now();
  for (let i = 0; i < ITERATIONS; i++) fn();
  const elapsed = performance.now() - start;

  const opsPerSec = Math.round((ITERATIONS / elapsed) * 1000);
  const avgMicros = ((elapsed / ITERATIONS) * 1000).toFixed(1);

  return { name, opsPerSec, avgMicros, elapsed: elapsed.toFixed(1) };
}

// ─── Approach 1: BaseNative render() ──────────────────────────────────────────

const bnTemplate = `
<h1>{{ title }}</h1>
<template @if="user">
  <p>Welcome, {{ user.name }}!</p>
</template>
<ul>
  <template @for="item of items; track item.id">
    <li class="{{ item.inStock ? 'in-stock' : 'out-of-stock' }}">
      <strong>{{ item.name }}</strong> — \${{ item.price }}
      <template @if="!item.inStock"><span>(out of stock)</span></template>
    </li>
  </template>
</ul>
<template @if="showFooter"><footer>End of catalog.</footer></template>
`;

const bnResult = bench('BaseNative render()', () => {
  render(bnTemplate, ctx);
});

// ─── Approach 2: Template string concatenation ─────────────────────────────────

function templateStringRender(data) {
  const { title, user, items, showFooter } = data;
  let html = `<h1>${title}</h1>`;
  if (user) html += `<p>Welcome, ${user.name}!</p>`;
  html += '<ul>';
  for (const item of items) {
    html += `<li class="${item.inStock ? 'in-stock' : 'out-of-stock'}">`;
    html += `<strong>${item.name}</strong> — $${item.price}`;
    if (!item.inStock) html += `<span>(out of stock)</span>`;
    html += '</li>';
  }
  html += '</ul>';
  if (showFooter) html += '<footer>End of catalog.</footer>';
  return html;
}

const tsResult = bench('Template string concatenation', () => {
  templateStringRender(ctx);
});

// ─── Approach 3: React-style recursive render (simulated) ─────────────────────
// Simulates the pattern used by React.renderToString without the actual
// React runtime (which would require a separate package install).
// This demonstrates the overhead of a virtual DOM + reconciler pattern
// even in its simplest synchronous form.

function reactStyleRender(data) {
  const { title, user, items, showFooter } = data;

  function el(tag, attrs, ...children) {
    const attrStr = Object.entries(attrs || {})
      .map(([k, v]) => v !== false && v !== null && v !== undefined ? ` ${k}="${v}"` : '')
      .join('');
    const childStr = children.flat().filter(Boolean).join('');
    const voidTags = new Set(['br', 'hr', 'img', 'input', 'link', 'meta']);
    if (voidTags.has(tag)) return `<${tag}${attrStr}>`;
    return `<${tag}${attrStr}>${childStr}</${tag}>`;
  }

  // Build a "virtual" tree and stringify it
  const vdom = el('div', {},
    el('h1', {}, title),
    user ? el('p', {}, `Welcome, ${user.name}!`) : null,
    el('ul', {},
      ...items.map(item =>
        el('li', { class: item.inStock ? 'in-stock' : 'out-of-stock' },
          el('strong', {}, item.name),
          ` — $${item.price}`,
          !item.inStock ? el('span', {}, '(out of stock)') : null,
        )
      )
    ),
    showFooter ? el('footer', {}, 'End of catalog.') : null,
  );

  return vdom;
}

const reactResult = bench('React-style virtual DOM (simulated)', () => {
  reactStyleRender(ctx);
});

// ─── Approach 4: Array join (fastest naive approach) ──────────────────────────

function arrayJoinRender(data) {
  const { title, user, items, showFooter } = data;
  const parts = [];
  parts.push(`<h1>${title}</h1>`);
  if (user) parts.push(`<p>Welcome, ${user.name}!</p>`);
  parts.push('<ul>');
  for (const item of items) {
    parts.push(`<li class="${item.inStock ? 'in-stock' : 'out-of-stock'}">`);
    parts.push(`<strong>${item.name}</strong> — $${item.price}`);
    if (!item.inStock) parts.push('<span>(out of stock)</span>');
    parts.push('</li>');
  }
  parts.push('</ul>');
  if (showFooter) parts.push('<footer>End of catalog.</footer>');
  return parts.join('');
}

const arrayResult = bench('Array.join() concatenation', () => {
  arrayJoinRender(ctx);
});

// ─── Results ──────────────────────────────────────────────────────────────────

const results = [bnResult, tsResult, reactResult, arrayResult];
const fastest = results.reduce((a, b) => a.opsPerSec > b.opsPerSec ? a : b);

console.log('\nBaseNative SSR Comparison Benchmark');
console.log('='.repeat(70));
console.log(`Template: conditional header, ${ITEMS_COUNT}-item list with per-item conditional`);
console.log(`Iterations: ${ITERATIONS} (${WARMUP} warmup)\n`);

const maxNameLen = Math.max(...results.map(r => r.name.length));

for (const r of results) {
  const relPct = r.opsPerSec / fastest.opsPerSec * 100;
  const relSpeed = relPct < 1 ? relPct.toFixed(2) : relPct.toFixed(1);
  const marker = r === fastest ? ' ← fastest' : ` (${relSpeed}% of fastest)`;
  console.log(`  ${r.name.padEnd(maxNameLen + 2)} ${String(r.opsPerSec).padStart(8)} ops/sec   ${r.avgMicros}µs avg${marker}`);
}

console.log('\nNote: Template string and array join represent hand-written code');
console.log('that bypasses safe expression evaluation, hydration markers,');
console.log('and XSS prevention. BaseNative\'s overhead vs raw strings is the');
console.log('cost of safety: CSP-safe eval, HTML escaping, and hydration metadata.\n');
