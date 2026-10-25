/* Catalog completion tests: the eighteen components built after the
   pilot, exercised through the same loader + server renderer. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadRegistry, renderComponent } from './loader.js';
import { render } from '../../server/src/render.js';

test('avatar renders initials on a toned figure, or the image when given one', async () => {
  const registry = await loadRegistry();
  const initials = renderComponent(registry, render, 'avatar', { initials: 'WD', variant: 'tone-2' }).html;
  assert.match(initials, /<figure variant="tone-2">\s*WD\s*<\/figure>/);
  const image = renderComponent(registry, render, 'avatar', { src: '/me.jpg', alt: 'Warren' }).html;
  assert.match(image, /<figure variant="default">\s*<img src="\/me.jpg" alt="Warren">\s*<\/figure>/);
});

test('accordion is a details whose summary and section carry the content', async () => {
  const registry = await loadRegistry();
  const { html } = renderComponent(registry, render, 'accordion', {
    summary: 'What does a delivered lead cost?',
    bodyHtml: '<p>One flat price per service.</p>',
    open: true,
  });
  assert.match(html, /<details variant="default" open="true">/);
  assert.match(html, /<summary>What does a delivered lead cost\?<\/summary>/);
  assert.match(html, /<section><p>One flat price per service\.<\/p><\/section>/);
});

test('breadcrumb links the trail and marks the last item current', async () => {
  const registry = await loadRegistry();
  const { html } = renderComponent(registry, render, 'breadcrumb', {
    items: [
      { label: 'Home', href: '/' },
      { label: 'Components', href: '/components' },
      { label: 'Breadcrumb' },
    ],
  });
  assert.match(html, /<nav variant="breadcrumb" aria-label="Breadcrumb">/);
  assert.match(html, /<a href="\/">Home<\/a>/);
  assert.match(html, /<a aria-current="page">Breadcrumb<\/a>/);
});

test('pagination windows the pages, elides runs, and flags the current page', async () => {
  const registry = await loadRegistry();
  const vm = renderComponent(registry, render, 'pagination', { page: 5, pages: 12 }).viewModel;
  const labels = vm.items().map((item) => item.label);
  assert.deepEqual(labels, ['Previous', '1', '…', '4', '5', '6', '…', '12', 'Next']);
  assert.equal(vm.items()[4].current, true);
  const { html } = renderComponent(registry, render, 'pagination', { page: 5, pages: 12 });
  assert.match(html, /<a aria-current="page">5<\/a>/);
  assert.match(html, /<a href="#page-4">4<\/a>/);
});

test('list-group renders text rows, trailing content, and rich rows', async () => {
  const registry = await loadRegistry();
  const badge = renderComponent(registry, render, 'badge', { label: 'Paid', variant: 'success' }).html;
  const { html } = renderComponent(registry, render, 'list-group', {
    items: [
      { label: 'Panel upgrade', trailingHtml: badge },
      { contentHtml: '<article><p>Rich row</p></article>' },
    ],
  });
  assert.match(html, /<ul variant="default">/);
  assert.match(html, /<li>\s*Panel upgrade\s*<small variant="success">Paid<\/small>\s*<\/li>/);
  assert.match(html, /<li>\s*<article><p>Rich row<\/p><\/article>\s*<\/li>/);
});

test('combobox renders its input and, when open, the listbox with the active option flagged', async () => {
  const registry = await loadRegistry();
  const input = renderComponent(registry, render, 'input', {
    id: 'county', type: 'text', value: '', ariaLabel: 'County',
  }).html;
  const { html, viewModel } = renderComponent(registry, render, 'combobox', {
    id: 'county', label: 'County', inputHtml: input, open: true, activeValue: 'orange',
    options: [
      { value: 'orange', label: 'Orange County' },
      { value: 'la', label: 'Los Angeles' },
    ],
  });
  assert.match(html, /<section variant="default" aria-label="County">/);
  assert.match(html, /<ul role="listbox" id="county-listbox" aria-label="County">/);
  assert.match(html, /<li role="option" id="county-option-orange" aria-selected="true">Orange County<\/li>/);
  assert.match(html, /<li role="option" id="county-option-la" aria-selected="false">Los Angeles<\/li>/);
  let picked = null;
  const vm2 = renderComponent(registry, render, 'combobox', {
    id: 'c2', label: 'C', inputHtml: input, onSelect: (event) => { picked = event; },
  }).viewModel;
  vm2.select({ value: 'la', label: 'Los Angeles' });
  assert.deepEqual(picked, { value: 'la', label: 'Los Angeles' });
  assert.equal(vm2.open(), false);
  assert.equal(viewModel.listboxId(), 'county-listbox');
});

test('multiselect renders chips with dismiss buttons and reports the set on toggle', async () => {
  const registry = await loadRegistry();
  const input = renderComponent(registry, render, 'input', {
    id: 'trades', type: 'text', value: '', ariaLabel: 'Trades',
  }).html;
  const dismiss = renderComponent(registry, render, 'button', { label: 'Remove', variant: 'ghost' }).html;
  let reported = null;
  const { html, viewModel } = renderComponent(registry, render, 'multiselect', {
    id: 'trades', label: 'Trades', inputHtml: input, open: true,
    options: [{ value: 'solar', label: 'Solar' }],
    selected: [{ value: 'ev', label: 'EV charging', dismissHtml: dismiss }],
    onChange: (event) => { reported = event; },
  });
  assert.match(html, /<section variant="multiselect" aria-label="Trades">/);
  assert.match(html, /<li>EV charging\s*<button variant="ghost" type="button">Remove<\/button>\s*<\/li>/);
  assert.match(html, /<ul role="listbox" aria-multiselectable="true" id="trades-listbox" aria-label="Trades">/);
  assert.match(html, /<li role="option" id="trades-option-solar" aria-selected="false">Solar<\/li>/);
  viewModel.toggle({ value: 'solar', label: 'Solar', dismissHtml: dismiss });
  assert.deepEqual(reported, { values: ['ev', 'solar'] });
  viewModel.toggle({ value: 'ev', label: 'EV charging', dismissHtml: dismiss });
  assert.deepEqual(reported, { values: ['solar'] });
});
