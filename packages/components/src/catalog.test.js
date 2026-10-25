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

test('drawer is an edge-anchored dialog with the dialog skeleton', async () => {
  const registry = await loadRegistry();
  const close = renderComponent(registry, render, 'button', { label: 'Close', variant: 'ghost' }).html;
  const { html } = renderComponent(registry, render, 'drawer', {
    title: 'Lead details', body: 'Panel upgrade, quoted.', closeHtml: close,
  });
  assert.match(html, /<dialog variant="drawer" aria-label="Lead details">/);
  assert.match(html, /<h2>Lead details<\/h2>/);
  assert.match(html, /<p>Panel upgrade, quoted\.<\/p>/);
});

test('dropdown-menu renders actions, links, and separators', async () => {
  const registry = await loadRegistry();
  const { html } = renderComponent(registry, render, 'dropdown-menu', {
    label: 'Lead actions',
    items: [
      { label: 'Open', href: '/leads/1' },
      { label: 'Call' },
      { separator: true },
      { label: 'Archive' },
    ],
  });
  assert.match(html, /<menu variant="default" aria-label="Lead actions">/);
  assert.match(html, /<a href="\/leads\/1">Open<\/a>/);
  assert.match(html, /<button type="button">Call<\/button>/);
  assert.match(html, /<li><hr><\/li>/);
});

test('command-palette groups its options under headings in a dialog listbox', async () => {
  const registry = await loadRegistry();
  const field = renderComponent(registry, render, 'field', {
    label: 'Search commands', controlId: 'palette-search', controlHtml: renderComponent(registry, render, 'input', {
      id: 'palette-search', type: 'text', value: '', ariaLabel: 'Search commands',
    }).html,
  }).html;
  const { html } = renderComponent(registry, render, 'command-palette', {
    id: 'palette', label: 'Command palette', searchHtml: field, activeValue: 'new-lead',
    groups: [{ heading: 'Leads', options: [{ value: 'new-lead', label: 'New lead' }, { value: 'import', label: 'Import leads' }] }],
  });
  assert.match(html, /<dialog variant="command-palette" aria-label="Command palette">/);
  assert.match(html, /<li role="group" aria-label="Leads">/);
  assert.match(html, /<h3>Leads<\/h3>/);
  assert.match(html, /<li role="option" id="palette-option-new-lead" aria-selected="true">New lead<\/li>/);
});

test('tooltip pairs a rendered invoker with its note', async () => {
  const registry = await loadRegistry();
  const invoker = renderComponent(registry, render, 'button', { label: 'More info', variant: 'ghost' }).html;
  const { html } = renderComponent(registry, render, 'tooltip', { text: 'Delivered into the schedule', invokerHtml: invoker });
  assert.match(html, /<aside variant="default">/);
  assert.match(html, /<p role="tooltip">Delivered into the schedule<\/p>/);
});

test('toast lists toned items in a live region and the toaster queues them', async () => {
  const registry = await loadRegistry();
  const dismiss = renderComponent(registry, render, 'button', { label: 'Dismiss', variant: 'ghost' }).html;
  const { html } = renderComponent(registry, render, 'toast', {
    items: [
      { message: 'Lead delivered', tone: 'success', dismissHtml: dismiss },
      { message: 'Payment failed', tone: 'danger', dismissHtml: dismiss },
    ],
  });
  assert.match(html, /<ol variant="default" aria-live="polite">/);
  assert.match(html, /<li variant="success">Lead delivered/);
  assert.match(html, /<li variant="danger">Payment failed/);
  const { createToaster } = await import('./toast/index.js');
  const toaster = createToaster();
  toaster.push({ message: 'One' });
  toaster.push({ message: 'Two' });
  assert.equal(toaster.items().length, 2);
  toaster.dismiss(0);
  assert.deepEqual(toaster.items().map((item) => item.message), ['Two']);
});
