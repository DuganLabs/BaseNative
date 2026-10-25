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

test('table renders semantic structure with row headers and a caption', async () => {
  const registry = await loadRegistry();
  const { html } = renderComponent(registry, render, 'table', {
    caption: 'Delivered leads',
    columns: ['Lead', 'Service', 'Fee'],
    rows: [
      [{ text: 'Garcia', header: true }, 'Panel upgrade', '$85'],
      [{ text: 'Nguyen', header: true }, 'EV charger', '$65'],
    ],
    variant: 'striped',
  });
  assert.match(html, /<table variant="striped">/);
  assert.match(html, /<caption>Delivered leads<\/caption>/);
  assert.match(html, /<th scope="col">Service<\/th>/);
  assert.match(html, /<th scope="row">Garcia<\/th>\s*<td>Panel upgrade<\/td>\s*<td>\$85<\/td>/);
});

test('datagrid nests sort buttons and selection checkboxes in the table skeleton', async () => {
  const registry = await loadRegistry();
  const sortButton = renderComponent(registry, render, 'button', { label: 'Lead', variant: 'ghost' }).html;
  const box = renderComponent(registry, render, 'checkbox', { label: 'Select Garcia', name: 'sel', value: '1' }).html;
  const { html } = renderComponent(registry, render, 'datagrid', {
    selectable: true,
    selectAllHtml: box,
    columns: [
      { key: 'lead', label: 'Lead', sort: 'ascending', sortHtml: sortButton },
      { key: 'fee', label: 'Fee' },
    ],
    rows: [{ cells: ['Garcia', '$85'], selectHtml: box }],
  });
  assert.match(html, /<table variant="datagrid">/);
  assert.match(html, /<th scope="col" aria-sort="ascending">\s*<button variant="ghost" type="button">Lead<\/button>\s*<\/th>/);
  assert.match(html, /<td>\s*<label>\s*<input variant="checkbox" type="checkbox">\s*Select Garcia\s*<\/label>\s*<\/td>/);
});

test('tree nests a rendered child tree inside branch items', async () => {
  const registry = await loadRegistry();
  const toggle = renderComponent(registry, render, 'button', { label: 'Toggle', variant: 'ghost' }).html;
  const children = renderComponent(registry, render, 'tree', {
    items: [{ label: 'Panel upgrade' }, { label: 'EV charger' }],
  }).html;
  const { html } = renderComponent(registry, render, 'tree', {
    items: [
      { label: 'Services', expanded: true, toggleHtml: toggle, childrenHtml: children },
      { label: 'Settings' },
    ],
  });
  assert.match(html, /<ul variant="tree" role="tree">/);
  assert.match(html, /<li role="treeitem" aria-expanded="true">/);
  assert.match(html, /<ul role="group">\s*<ul variant="tree" role="tree">/);
  assert.match(html, /<li role="treeitem">Settings<\/li>/);
});

test('virtualizer windows the list: indices and spacer counts from scroll math', async () => {
  const registry = await loadRegistry();
  const { html, viewModel } = renderComponent(registry, render, 'virtualizer', {
    id: 'leads', total: 100, scrollTop: 44 * 20, rowHeight: 44, viewportRows: 8, overscan: 2,
    labelFor: (index) => `Lead ${index + 1}`,
  });
  assert.equal(viewModel.startIndex(), 18);
  assert.equal(viewModel.endIndex(), 30);
  assert.equal(viewModel.spacerStartCount(), 18);
  assert.equal(viewModel.spacerEndCount(), 70);
  assert.match(html, /<ol variant="virtualizer" id="leads">/);
  assert.match(html, /<li>\s*Lead 19\s*<\/li>/);
  assert.match(html, /<li>\s*Lead 30\s*<\/li>/);
  assert.doesNotMatch(html, /Lead 31/);
});

test('calendar computes the month grid and groups schedule events by day', async () => {
  const registry = await loadRegistry();
  const vm = renderComponent(registry, render, 'calendar', { year: 2026, month: 10, today: '2026-10-24' }).viewModel;
  assert.equal(vm.title(), 'October 2026');
  const weeks = vm.weeks();
  assert.equal(weeks.length, 6);
  assert.equal(weeks[0][0].date, '2026-09-27');
  const oct24 = weeks.flat().find((day) => day.date === '2026-10-24');
  assert.equal(oct24.isToday, true);
  assert.equal(oct24.inMonth, true);
  const { html } = renderComponent(registry, render, 'calendar', {
    year: 2026, month: 10, variant: 'schedule', today: '2026-10-24',
    events: [
      { date: '2026-10-26', title: 'Panel upgrade', at: '2026-10-26T09:00', timeLabel: '9:00 AM' },
      { date: '2026-10-26', title: 'Site survey', at: '2026-10-26T13:00', timeLabel: '1:00 PM' },
    ],
  });
  assert.match(html, /<section variant="schedule" aria-label="October 2026">/);
  assert.match(html, /<time datetime="2026-10-26">Mon, October 26<\/time>/);
  assert.match(html, /<h3>Panel upgrade<\/h3>/);
});

test('pipeline renders stage columns of rendered cards', async () => {
  const registry = await loadRegistry();
  const card = renderComponent(registry, render, 'card', { title: 'Garcia', body: 'Panel upgrade' }).html;
  const { html } = renderComponent(registry, render, 'pipeline', {
    columns: [
      { title: 'Quoted', cardsHtml: [card] },
      { title: 'Scheduled', cardsHtml: [] },
      { title: 'Paid', cardsHtml: [] },
    ],
  });
  assert.match(html, /<ol variant="pipeline">/);
  assert.match(html, /<h3>Quoted<\/h3>/);
  assert.match(html, /<article variant="default">/);
});

test('theme-toggle renders the three appearances as a radio choice over buttons', async () => {
  const registry = await loadRegistry();
  let event = null;
  const { html, viewModel } = renderComponent(registry, render, 'theme-toggle', {
    onThemeChange: (e) => { event = e; },
  });
  assert.match(html, /<fieldset variant="theme-toggle">/);
  assert.match(html, /<legend>Theme<\/legend>/);
  assert.match(html, /<input variant="default" type="radio" name="theme" value="system" checked="true">\s*System/);
  assert.match(html, /value="light">\s*Light/);
  assert.match(html, /value="dark">\s*Dark/);
  
  
  
  viewModel.change({ value: 'dark' });
  assert.deepEqual(event, { name: 'theme', mode: 'dark', previousMode: 'system' });
  assert.equal(viewModel.isChecked({ value: 'dark' }), true);
});

test('applyTheme stamps data-theme for forced modes and clears it for system', async () => {
  const { applyTheme } = await import('./theme-toggle/index.js');
  const el = { dataset: {}, style: { colorScheme: '' } };
  applyTheme('dark', el);
  assert.equal(el.dataset.theme, 'dark');
  assert.equal(el.style.colorScheme, 'dark');
  applyTheme('system', el);
  assert.equal(el.dataset.theme, undefined);
  assert.equal(el.style.colorScheme, '');
});

test('the token sheet carries all three appearance scopes', async () => {
  const { readFile } = await import('node:fs/promises');
  const tokens = await readFile(new URL('./tokens.css', import.meta.url), 'utf8');
  assert.match(tokens, /@media \(prefers-color-scheme: dark\) \{\n  :root:not\(\[data-theme="light"\]\)/);
  assert.match(tokens, /:root\[data-theme="dark"\] \{\n  color-scheme: dark;/);
  assert.match(tokens, /:root\[data-theme="light"\] \{\n    color-scheme: light;/);
});
