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
