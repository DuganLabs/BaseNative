import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { renderCatalog } from '../basenative/task1/catalog.js';
import { mount } from '../basenative/task2/app.js';

const products = JSON.parse(readFileSync(new URL('../shared/products.json', import.meta.url), 'utf-8'));

test('task1: populated catalog renders all required behavior', () => {
  const html = renderCatalog(products, { sale: true });
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

test('task1: sale=false hides the banner', () => {
  const html = renderCatalog(products, { sale: false });
  assert.ok(!html.includes('Sale now on'), 'banner hidden when sale is false');
  assert.ok(html.includes('Aurora Lamp'), 'catalog still renders');
});

test('task1: empty catalog renders the empty state', () => {
  const html = renderCatalog([], { sale: true });
  assert.ok(html.includes('No products available'), 'empty state');
  assert.ok(!html.includes('Aurora Lamp'), 'no products rendered');
});

test('task2: counter, computed, parity, effect log, batch, list', () => {
  const dom = new JSDOM('<!doctype html><body><div id="app"></div></body>');
  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  globalThis.Node = dom.window.Node;
  globalThis.Element = dom.window.Element;
  globalThis.HTMLElement = dom.window.HTMLElement;
  globalThis.CustomEvent = dom.window.CustomEvent;
  globalThis.Event = dom.window.Event;
  globalThis.MutationObserver = dom.window.MutationObserver;

  const root = document.getElementById('app');
  mount(root);
  const text = (selector) => root.querySelector(selector).textContent;
  const logItems = () => [...root.querySelectorAll('[data-log] li')].map((li) => li.textContent);
  const itemTexts = () => [...root.querySelectorAll('[data-items] li')].map((li) => li.textContent);

  // 1-4: initial render (BaseNative effects are synchronous — no settling)
  assert.equal(text('[data-count]'), '0'); // 1
  assert.equal(text('[data-doubled]'), '0'); // 2
  assert.equal(text('[data-parity]'), 'Even'); // 3
  assert.deepEqual(logItems(), ['count=0 doubled=0']); // 4

  root.querySelector('[data-inc]').click();
  // 5-8: after one increment
  assert.equal(text('[data-count]'), '1'); // 5
  assert.equal(text('[data-doubled]'), '2'); // 6
  assert.equal(text('[data-parity]'), 'Odd'); // 7
  assert.deepEqual(logItems(), ['count=0 doubled=0', 'count=1 doubled=2']); // 8

  root.querySelector('[data-batch]').click();
  // 9-11: batch +3 must log ONCE
  assert.equal(text('[data-count]'), '4'); // 9
  assert.equal(text('[data-doubled]'), '8'); // 10
  assert.deepEqual(logItems(), ['count=0 doubled=0', 'count=1 doubled=2', 'count=4 doubled=8']); // 11

  const input = root.querySelector('[data-draft]');
  input.value = 'Milk';
  input.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
  root.querySelector('[data-add]').click();
  // 12: item added, empty state gone
  assert.ok(itemTexts().includes('Milk') && !itemTexts().includes('No items yet')); // 12

  root.querySelector('[data-clear]').click();
  // 13: cleared, empty state back
  assert.ok(itemTexts().includes('No items yet') && !itemTexts().includes('Milk')); // 13
});
