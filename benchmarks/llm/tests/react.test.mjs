import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

// Documented translations applied in the first pass (see RUN_LOG_REFRESH.md):
// R-1: React SSR inserts <!-- --> between text nodes, so the shared
// assertions are applied after stripping them.
// R-2: Node 24's global navigator is getter-only; set jsdom's with
// Object.defineProperty.
// R-3 family: React 19 schedules mount effects + setState asynchronously;
// assertions wait for a 50 ms macrotask settle (no act() wrapping — the
// act from a second React copy does not wrap the bundled copy).

const products = JSON.parse(readFileSync(new URL('../shared/products.json', import.meta.url), 'utf-8'));
const strip = (html) => html.replaceAll('<!-- -->', '');

test('task1: populated catalog renders all required behavior', async () => {
  const { renderCatalog } = await import('../react/dist/task1.mjs');
  const html = strip(renderCatalog(products, { sale: true }));
  assert.ok(html.includes('Product Catalog'), 'title interpolation');
  assert.ok(html.includes('Sale now on'), 'sale banner when sale is true');
  assert.ok(html.includes('Aurora Lamp'), 'product name');
  assert.ok(html.includes('$49'), 'Aurora Lamp price');
  assert.ok(html.includes('Ember Mug'), 'second product name');
  assert.ok(html.includes('$24'), 'Ember Mug price');
  assert.ok(html.includes('In stock'), 'in-stock conditional');
  assert.ok(html.includes('Out of stock'), 'out-of-stock conditional');
  assert.ok(html.includes('Featured'), 'featured status label');
  assert.ok(html.includes('Clearance'), 'clearance status label');
  assert.ok(html.includes('Standard'), 'standard status label');
});

test('task1: sale=false hides the banner', async () => {
  const { renderCatalog } = await import('../react/dist/task1.mjs');
  const html = strip(renderCatalog(products, { sale: false }));
  assert.ok(!html.includes('Sale now on'), 'banner hidden when sale is false');
  assert.ok(html.includes('Aurora Lamp'), 'catalog still renders');
});

test('task1: empty catalog renders the empty state', async () => {
  const { renderCatalog } = await import('../react/dist/task1.mjs');
  const html = strip(renderCatalog([], { sale: true }));
  assert.ok(html.includes('No products available'), 'empty state');
  assert.ok(!html.includes('Aurora Lamp'), 'no products rendered');
});

const settle = () => new Promise((resolve) => setTimeout(resolve, 50));

test('task2: counter, computed, parity, effect log, batch, list', async () => {
  const dom = new JSDOM('<!doctype html><body><div id="app"></div></body>', { url: 'http://localhost/' });
  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  Object.defineProperty(globalThis, 'navigator', { value: dom.window.navigator, configurable: true });
  globalThis.Node = dom.window.Node;
  globalThis.Element = dom.window.Element;
  globalThis.HTMLElement = dom.window.HTMLElement;
  globalThis.HTMLInputElement = dom.window.HTMLInputElement;
  globalThis.CustomEvent = dom.window.CustomEvent;
  globalThis.Event = dom.window.Event;
  globalThis.MutationObserver = dom.window.MutationObserver;
  globalThis.IS_REACT_ACT_ENVIRONMENT = false;

  const { App, createRoot, React } = await import('../react/dist/task2.mjs');
  const root = document.getElementById('app');
  createRoot(root).render(React.createElement(App));
  await settle();

  const text = (selector) => root.querySelector(selector).textContent;
  const logItems = () => [...root.querySelectorAll('[data-log] li')].map((li) => li.textContent);
  const itemTexts = () => [...root.querySelectorAll('[data-items] li')].map((li) => li.textContent);

  // 1-4: initial render
  assert.equal(text('[data-count]'), '0'); // 1
  assert.equal(text('[data-doubled]'), '0'); // 2
  assert.equal(text('[data-parity]'), 'Even'); // 3
  assert.deepEqual(logItems(), ['count=0 doubled=0']); // 4

  root.querySelector('[data-inc]').click();
  await settle();
  // 5-8: after one increment
  assert.equal(text('[data-count]'), '1'); // 5
  assert.equal(text('[data-doubled]'), '2'); // 6
  assert.equal(text('[data-parity]'), 'Odd'); // 7
  assert.deepEqual(logItems(), ['count=0 doubled=0', 'count=1 doubled=2']); // 8

  root.querySelector('[data-batch]').click();
  await settle();
  // 9-11: three setCount calls in one handler, auto-batched — log ONCE
  assert.equal(text('[data-count]'), '4'); // 9
  assert.equal(text('[data-doubled]'), '8'); // 10
  assert.deepEqual(logItems(), ['count=0 doubled=0', 'count=1 doubled=2', 'count=4 doubled=8']); // 11

  // Controlled input: React ignores a direct .value set (value tracking),
  // so use the native prototype setter, then dispatch input.
  const input = root.querySelector('[data-draft]');
  const setter = Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, 'value').set;
  setter.call(input, 'Milk');
  input.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
  await settle();
  root.querySelector('[data-add]').click();
  await settle();
  // 12: item added, empty state gone
  assert.ok(itemTexts().includes('Milk') && !itemTexts().includes('No items yet')); // 12

  root.querySelector('[data-clear]').click();
  await settle();
  // 13: cleared, empty state back
  assert.ok(itemTexts().includes('No items yet') && !itemTexts().includes('Milk')); // 13
});
