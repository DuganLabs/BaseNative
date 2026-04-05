import { compilePattern, matchRoute } from '@basenative/router';
import { performance } from 'node:perf_hooks';

const ITERATIONS = 10000;

function bench(name, fn) {
  for (let i = 0; i < 100; i++) fn();
  const start = performance.now();
  for (let i = 0; i < ITERATIONS; i++) fn();
  const elapsed = performance.now() - start;
  const opsPerSec = Math.round((ITERATIONS / elapsed) * 1000);
  const avgMs = (elapsed / ITERATIONS).toFixed(4);
  console.log(`${name}: ${avgMs}ms avg, ${opsPerSec} ops/sec`);
}

// Pre-compile patterns
const staticPattern = compilePattern('/about');
const paramPattern = compilePattern('/users/:id');
const nestedParamPattern = compilePattern('/users/:id/posts/:postId');
const deepPattern = compilePattern('/admin/reports');

// Simulate full route table scan (20 routes)
const routePatterns = [
  compilePattern('/'),
  compilePattern('/about'),
  compilePattern('/users'),
  compilePattern('/users/:id'),
  compilePattern('/users/:id/posts'),
  compilePattern('/users/:id/posts/:postId'),
  compilePattern('/settings'),
  compilePattern('/settings/profile'),
  compilePattern('/settings/security'),
  compilePattern('/admin'),
  compilePattern('/admin/users'),
  compilePattern('/admin/reports'),
  compilePattern('/blog'),
  compilePattern('/blog/:slug'),
  compilePattern('/products'),
  compilePattern('/products/:category'),
  compilePattern('/products/:category/:id'),
  compilePattern('/search'),
  compilePattern('/404'),
  compilePattern('*'),
];

function matchAll(pathname) {
  for (const pattern of routePatterns) {
    const match = matchRoute(pattern, pathname);
    if (match !== null) return match;
  }
  return null;
}

console.log('BaseNative Router Benchmarks');
console.log('='.repeat(50));

bench('compilePattern (static)', () => {
  compilePattern('/about');
});

bench('compilePattern (params)', () => {
  compilePattern('/users/:id/posts/:postId');
});

bench('matchRoute (static hit)', () => {
  matchRoute(staticPattern, '/about');
});

bench('matchRoute (param hit)', () => {
  matchRoute(paramPattern, '/users/42');
});

bench('matchRoute (nested params)', () => {
  matchRoute(nestedParamPattern, '/users/42/posts/99');
});

bench('Full route table scan (20 routes, static)', () => {
  matchAll('/admin/reports');
});

bench('Full route table scan (20 routes, params)', () => {
  matchAll('/users/42/posts/99');
});

bench('Full route table scan (20 routes, miss/wildcard)', () => {
  matchAll('/some/unknown/path');
});

console.log('='.repeat(50));
console.log('Done.');
