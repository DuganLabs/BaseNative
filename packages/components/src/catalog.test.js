/* Catalog completion tests: the components built after the
   pilot, exercised through the same loader + server renderer. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadRegistry, renderComponent } from './loader.js';
import { render } from '../../server/src/render.js';
import { readFileSync } from 'node:fs';

test('avatar renders initials on a toned figure, or the image when given one', async () => {
  const registry = await loadRegistry();
  const initials = renderComponent(registry, render, 'avatar', {
    initials: 'WD',
    variant: 'tone-2',
  }).html;
  assert.match(initials, /<figure variant="tone-2">\s*WD\s*<\/figure>/);
  const image = renderComponent(registry, render, 'avatar', { src: '/me.jpg', alt: 'Warren' }).html;
  assert.match(
    image,
    /<figure variant="default">\s*<img src="\/me.jpg" alt="Warren">\s*<\/figure>/,
  );
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
  const labels = vm
    .items()
    .filter((item) => item.only !== 'narrow')
    .map((item) => item.label);
  assert.deepEqual(labels, ['Previous', '1', '…', '4', '5', '6', '…', '12', 'Next']);
  assert.equal(vm.items()[4].current, true);
  const { html } = renderComponent(registry, render, 'pagination', { page: 5, pages: 12 });
  assert.match(html, /<a aria-current="page">5<\/a>/);
  assert.match(html, /<a href="#page-4">4<\/a>/);
});

test('pagination keeps the first and last pages in its narrow window', async () => {
  const registry = await loadRegistry();
  const vm = renderComponent(registry, render, 'pagination', { page: 3, pages: 8 }).viewModel;
  const shown = (scope) =>
    vm
      .items()
      .filter((item) => item.only !== (scope === 'wide' ? 'narrow' : 'wide'))
      .map((item) => item.label);
  assert.deepEqual(shown('wide'), ['Previous', '1', '2', '3', '4', '…', '8', 'Next']);
  // Five targets and two narrow gaps fit a phone; six targets don't.
  assert.deepEqual(shown('narrow'), ['Previous', '1', '…', '3', '…', '8', 'Next']);
  const mid = renderComponent(registry, render, 'pagination', { page: 5, pages: 12 }).viewModel;
  const midNarrow = mid
    .items()
    .filter((item) => item.only !== 'wide')
    .map((item) => item.label);
  assert.deepEqual(midNarrow, ['Previous', '1', '…', '5', '…', '12', 'Next']);
  const { html } = renderComponent(registry, render, 'pagination', { page: 3, pages: 8 });
  assert.match(html, /<li variant="wide">\s*<a href="#page-4">4<\/a>\s*<\/li>/);
  assert.match(html, /<li variant="narrow">\s*<a aria-hidden="true">…<\/a>\s*<\/li>/);
  // Previous and Next keep their text, so their name, when the narrow window shows only the chevron.
  assert.match(
    html,
    /<a href="#page-2"><svg aria-hidden="true"[^>]*>\s*<path d="M10 4l-4 4 4 4"[^>]*><\/path>\s*<\/svg>Previous<\/a>/,
  );
  assert.match(
    html,
    /<a href="#page-4"><svg aria-hidden="true"[^>]*>\s*<path d="M6 4l4 4-4 4"[^>]*><\/path>\s*<\/svg>Next<\/a>/,
  );
});

test('pagination windows hold both ends, one gap per run, and five narrow targets at most', async () => {
  const registry = await loadRegistry();
  for (const [page, pages] of [
    [1, 3],
    [1, 8],
    [8, 8],
    [4, 5],
  ]) {
    const items = renderComponent(registry, render, 'pagination', {
      page,
      pages,
    }).viewModel.items();
    const narrow = items.filter((item) => item.only !== 'wide');
    const pageNumbers = narrow
      .filter((item) => /^\d+$/.test(item.label))
      .map((item) => Number(item.label));
    assert.ok(
      pageNumbers.includes(1) && pageNumbers.includes(pages) && pageNumbers.includes(page),
      `${page}/${pages}`,
    );
    // No two gaps in a row, and a gap only where pages are missing.
    for (let i = 1; i < narrow.length; i += 1)
      assert.ok(!(narrow[i].label === '…' && narrow[i - 1].label === '…'));
    const shownSet = new Set(pageNumbers);
    for (let i = 0; i < pageNumbers.length - 1; i += 1) {
      const gap = pageNumbers[i + 1] - pageNumbers[i] > 1;
      const at = narrow.findIndex((item) => item.label === String(pageNumbers[i]));
      assert.equal(narrow[at + 1].label === '…', gap, `${page}/${pages} after ${pageNumbers[i]}`);
    }
    assert.ok(shownSet.size === pageNumbers.length);
    // At most five targets in the narrow window: Previous, three pages, Next.
    assert.ok(
      narrow.filter((item) => item.label !== '…').length <= 5,
      `${page}/${pages} narrow targets`,
    );
    // The wide window never spends an ellipsis on a single page.
    const wideNumbers = items
      .filter((item) => item.only !== 'narrow' && /^\d+$/.test(item.label))
      .map((item) => Number(item.label));
    for (let i = 0; i < wideNumbers.length - 1; i += 1) {
      assert.notEqual(wideNumbers[i + 1] - wideNumbers[i], 2, `${page}/${pages}: a one-page gap`);
    }
  }
});

test('list-group renders text rows, trailing content, and rich rows', async () => {
  const registry = await loadRegistry();
  const badge = renderComponent(registry, render, 'badge', {
    label: 'Paid',
    variant: 'success',
  }).html;
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
    id: 'county',
    type: 'text',
    value: '',
    ariaLabel: 'County',
  }).html;
  const { html, viewModel } = renderComponent(registry, render, 'combobox', {
    id: 'county',
    label: 'County',
    inputHtml: input,
    open: true,
    activeValue: 'orange',
    options: [
      { value: 'orange', label: 'Orange County' },
      { value: 'la', label: 'Los Angeles' },
    ],
  });
  assert.match(html, /<section variant="default" aria-label="County">/);
  assert.match(html, /<ul role="listbox" id="county-listbox" aria-label="County">/);
  assert.match(
    html,
    /<li role="option" id="county-option-orange" aria-selected="true">Orange County<\/li>/,
  );
  assert.match(
    html,
    /<li role="option" id="county-option-la" aria-selected="false">Los Angeles<\/li>/,
  );
  let picked = null;
  const vm2 = renderComponent(registry, render, 'combobox', {
    id: 'c2',
    label: 'C',
    inputHtml: input,
    onSelect: (event) => {
      picked = event;
    },
  }).viewModel;
  vm2.select({ value: 'la', label: 'Los Angeles' });
  assert.deepEqual(picked, { value: 'la', label: 'Los Angeles' });
  assert.equal(vm2.open(), false);
  assert.equal(viewModel.listboxId(), 'county-listbox');
});

test('combobox shows a decorative chevron after its input, as the select trigger does', async () => {
  const registry = await loadRegistry();
  const input = renderComponent(registry, render, 'input', {
    id: 'county',
    type: 'text',
    value: '',
    ariaLabel: 'County',
  }).html;
  const { html } = renderComponent(registry, render, 'combobox', {
    id: 'county',
    label: 'County',
    inputHtml: input,
    options: [{ value: 'orange', label: 'Orange County' }],
  });
  assert.match(html, /<input[^>]*>\s*<svg aria-hidden="true" viewBox="0 0 16 16">/);
  const css = readFileSync(new URL('./combobox/styles.css', import.meta.url), 'utf8');
  assert.match(css, /& > svg \{[^}]*pointer-events: var\(--pointer-events-combobox-chevron\)/);
  assert.match(css, /input\[aria-expanded="true"\] ~ svg/);
});

test('multiselect renders chips with dismiss buttons and reports the set on toggle', async () => {
  const registry = await loadRegistry();
  const input = renderComponent(registry, render, 'input', {
    id: 'trades',
    type: 'text',
    value: '',
    ariaLabel: 'Trades',
  }).html;
  const dismiss = renderComponent(registry, render, 'button', {
    label: 'Remove',
    variant: 'ghost',
  }).html;
  let reported = null;
  const { html, viewModel } = renderComponent(registry, render, 'multiselect', {
    id: 'trades',
    label: 'Trades',
    inputHtml: input,
    open: true,
    options: [{ value: 'solar', label: 'Solar' }],
    selected: [{ value: 'ev', label: 'EV charging', dismissHtml: dismiss }],
    onChange: (event) => {
      reported = event;
    },
  });
  assert.match(html, /<section variant="multiselect" aria-label="Trades">/);
  assert.match(
    html,
    /<li>EV charging\s*<button variant="ghost" type="button">Remove<\/button>\s*<\/li>/,
  );
  assert.match(
    html,
    /<ul role="listbox" aria-multiselectable="true" id="trades-listbox" aria-label="Trades">/,
  );
  assert.match(
    html,
    /<li role="option" id="trades-option-solar" aria-selected="false">Solar\s*<svg aria-hidden="true"/,
  );
  viewModel.toggle({ value: 'solar', label: 'Solar', dismissHtml: dismiss });
  assert.deepEqual(reported, { values: ['ev', 'solar'] });
  viewModel.toggle({ value: 'ev', label: 'EV charging', dismissHtml: dismiss });
  assert.deepEqual(reported, { values: ['solar'] });
});

test('drawer is an edge-anchored dialog with the dialog skeleton', async () => {
  const registry = await loadRegistry();
  const close = renderComponent(registry, render, 'button', {
    label: 'Close',
    variant: 'ghost',
  }).html;
  const { html } = renderComponent(registry, render, 'drawer', {
    title: 'Lead details',
    body: 'Panel upgrade, quoted.',
    closeHtml: close,
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
  assert.match(html, /<a role="menuitem" href="\/leads\/1" aria-disabled="false">Open<\/a>/);
  assert.match(html, /<button type="button" role="menuitem" aria-disabled="false">Call<\/button>/);
  assert.match(html, /<li role="none"><hr><\/li>/);
});

test('command-palette groups its options under headings in a dialog listbox', async () => {
  const registry = await loadRegistry();
  const field = renderComponent(registry, render, 'field', {
    label: 'Search commands',
    controlId: 'palette-search',
    controlHtml: renderComponent(registry, render, 'input', {
      id: 'palette-search',
      type: 'text',
      value: '',
      ariaLabel: 'Search commands',
    }).html,
  }).html;
  const { html } = renderComponent(registry, render, 'command-palette', {
    id: 'palette',
    label: 'Command palette',
    searchHtml: field,
    activeValue: 'new-lead',
    groups: [
      {
        heading: 'Leads',
        options: [
          { value: 'new-lead', label: 'New lead' },
          { value: 'import', label: 'Import leads' },
        ],
      },
    ],
  });
  assert.match(
    html,
    /<dialog id="palette-dialog" variant="command-palette" aria-label="Command palette">/,
  );
  assert.match(html, /<li role="group" aria-label="Leads">/);
  assert.match(html, /<h3>Leads<\/h3>/);
  assert.match(html, /id="palette-option-new-lead"[\s\S]*aria-selected="true"[\s\S]*New lead/);
});

test('tooltip pairs a rendered invoker with its note', async () => {
  const registry = await loadRegistry();
  const invoker = renderComponent(registry, render, 'button', {
    label: 'More info',
    variant: 'ghost',
  }).html;
  const { html } = renderComponent(registry, render, 'tooltip', {
    text: 'Delivered into the schedule',
    invokerHtml: invoker,
  });
  assert.match(html, /<aside variant="default">/);
  assert.match(html, /<p role="tooltip">Delivered into the schedule<\/p>/);
});

test('toast lists toned items in a live region and the toaster queues them', async () => {
  const registry = await loadRegistry();
  const dismiss = renderComponent(registry, render, 'button', {
    label: 'Dismiss',
    variant: 'ghost',
  }).html;
  const { html } = renderComponent(registry, render, 'toast', {
    items: [
      { message: 'Lead delivered', tone: 'success', dismissHtml: dismiss },
      { message: 'Payment failed', tone: 'danger', dismissHtml: dismiss },
    ],
  });
  assert.match(html, /<ol variant="default" aria-live="polite">/);
  assert.match(html, /<li variant="success"><svg[^>]*>.*Lead delivered/);
  assert.match(html, /<li variant="danger"><svg[^>]*>.*Payment failed/);
  const { createToaster } = await import('./toast/index.js');
  const toaster = createToaster();
  const first = toaster.push({ message: 'One' });
  toaster.push({ message: 'Two' });
  assert.equal(toaster.items().length, 2);
  assert.match(first, /^bn-toast-/);
  toaster.dismiss(first);
  assert.deepEqual(
    toaster.items().map((item) => item.message),
    ['Two'],
  );
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
  // Every data cell carries its column heading as a key (shown when the
  // table restacks narrow); the row header is the row's own label line
  // and carries none.
  assert.match(
    html,
    /<th scope="row">Garcia<\/th>\s*<td><b>Service<\/b>Panel upgrade<\/td>\s*<td><b>Fee<\/b>\$85<\/td>/,
  );
});

test('datagrid nests sort buttons and selection checkboxes in the table skeleton', async () => {
  const registry = await loadRegistry();
  const sortButton = renderComponent(registry, render, 'button', {
    label: 'Lead',
    variant: 'ghost',
  }).html;
  const box = renderComponent(registry, render, 'checkbox', {
    label: 'Select Garcia',
    name: 'sel',
    value: '1',
  }).html;
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
  assert.match(
    html,
    /<th scope="col" aria-sort="ascending" tabindex="-1">\s*<button variant="ghost" type="button">Lead<\/button>\s*<svg/,
  );
  /* The roving cell tabindex starts on the first header cell. */
  assert.match(html, /<th scope="col" tabindex="0">\s*<label>/);
  assert.match(
    html,
    /<td tabindex="-1">\s*<label>\s*<input variant="checkbox" type="checkbox">\s*Select Garcia\s*<\/label>\s*<\/td>/,
  );
});

test('tree nests a rendered child tree inside branch items', async () => {
  const registry = await loadRegistry();
  const toggle = renderComponent(registry, render, 'button', {
    label: 'Services',
    variant: 'ghost',
  }).html;
  const children = renderComponent(registry, render, 'tree', {
    nested: true,
    items: [{ label: 'Panel upgrade' }, { label: 'EV charger' }],
  }).html;
  const { html } = renderComponent(registry, render, 'tree', {
    items: [
      { label: 'Services', expanded: true, toggleHtml: toggle, childrenHtml: children },
      { label: 'Settings' },
    ],
  });
  assert.match(html, /<ul variant="tree" role="tree">/);
  assert.match(
    html,
    /<li role="treeitem" aria-expanded="true" aria-selected="false" tabindex="0">\s*<svg aria-hidden="true" viewBox="0 0 16 16"><path d="M6 4l4 4-4 4"[^>]*><\/path><\/svg>\s*<button variant="ghost" type="button">Services<\/button>/,
  );
  assert.doesNotMatch(
    html,
    /<li role="treeitem" aria-selected="false" tabindex="-1">Settings<\/li>[\s\S]*Services\s*<ul/,
  );
  assert.match(html, /Services<\/button>\s*<ul variant="tree" role="group">\s*<li role="treeitem"/);
  assert.doesNotMatch(html, /<ul role="group">/, 'no wrapper list around the child list');
  assert.match(html, /<li role="treeitem" aria-selected="false" tabindex="-1">Settings<\/li>/);
});

test('virtualizer windows the list: indices and spacer counts from scroll math', async () => {
  const registry = await loadRegistry();
  const { html, viewModel } = renderComponent(registry, render, 'virtualizer', {
    id: 'leads',
    total: 100,
    scrollTop: 44 * 20,
    rowHeight: 44,
    viewportRows: 8,
    overscan: 2,
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
  const vm = renderComponent(registry, render, 'calendar', {
    year: 2026,
    month: 10,
    today: '2026-10-24',
  }).viewModel;
  assert.equal(vm.title(), 'October 2026');
  const weeks = vm.weeks();
  assert.equal(weeks.length, 6);
  assert.equal(weeks[0][0].date, '2026-09-27');
  const oct24 = weeks.flat().find((day) => day.date === '2026-10-24');
  assert.equal(oct24.isToday, true);
  assert.equal(oct24.inMonth, true);
  const { html } = renderComponent(registry, render, 'calendar', {
    year: 2026,
    month: 10,
    variant: 'schedule',
    today: '2026-10-24',
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
  const card = renderComponent(registry, render, 'card', {
    title: 'Garcia',
    body: 'Panel upgrade',
  }).html;
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
    onThemeChange: (e) => {
      event = e;
    },
  });
  assert.match(html, /<fieldset variant="theme-toggle">/);
  assert.match(html, /<legend>Theme<\/legend>/);
  assert.match(
    html,
    /<input variant="default" type="radio" name="theme" value="system" checked="true">\s*System/,
  );
  assert.match(html, /value="light">\s*Light/);
  assert.match(html, /value="dark">\s*Dark/);

  viewModel.change({ value: 'dark' });
  assert.deepEqual(event, { name: 'theme', mode: 'dark', previousMode: 'system' });
  assert.equal(viewModel.isChecked({ value: 'dark' }), true);
});

test('applyTheme stamps data-theme for forced modes and clears it for system', async () => {
  const { applyTheme } = await import('./theme-toggle/index.js');
  const el = { dataset: {} };
  applyTheme('dark', el);
  assert.equal(el.dataset.theme, 'dark');
  applyTheme('system', el);
  assert.equal(el.dataset.theme, undefined);
});

test('the token sheet carries all three appearance scopes', async () => {
  const { readFile } = await import('node:fs/promises');
  const tokens = await readFile(new URL('./tokens.css', import.meta.url), 'utf8');
  assert.match(
    tokens,
    /@media \(prefers-color-scheme: dark\) \{\n {2}:root:not\(\[data-theme="light"\]\)/,
  );
  assert.match(tokens, /:root\[data-theme="dark"\] \{\n {2}color-scheme: dark;/);
  assert.match(tokens, /:root\[data-theme="light"\] \{\n {4}color-scheme: light;/);
});

test('alert renders an optional dismiss and the toggle hugs its content', async () => {
  const registry = await loadRegistry();
  const dismiss = renderComponent(registry, render, 'button', {
    label: 'Dismiss',
    variant: 'ghost',
  }).html;
  const { html } = renderComponent(registry, render, 'alert', {
    title: 'Payment failed',
    body: 'Card declined.',
    variant: 'danger',
    dismissHtml: dismiss,
  });
  assert.match(html, /<button variant="ghost" type="button">Dismiss<\/button>/);
  const { readFile } = await import('node:fs/promises');
  const tokens = await readFile(new URL('./tokens.css', import.meta.url), 'utf8');
  const toggleCss = await readFile(new URL('./theme-toggle/styles.css', import.meta.url), 'utf8');
  assert.match(tokens, /--size-theme-toggle-inline: var\(--size-max-content\)/);
  assert.match(toggleCss, /inline-size: var\(--size-theme-toggle-inline\)/);
});

test('table cells carry aria-current and de-emphasis for the calendar composition', async () => {
  const registry = await loadRegistry();
  const { html } = renderComponent(registry, render, 'table', {
    columns: ['Sun', 'Mon'],
    rows: [
      [
        { text: '27', small: true },
        { text: '28', current: 'date' },
      ],
    ],
  });
  assert.match(html, /<td><b>Sun<\/b><small>27<\/small><\/td>/);
  assert.match(html, /<td aria-current="date"><b>Mon<\/b>28<\/td>/);
});

test('form composes heading, summary, fields, and actions, and owns the submit moment', async () => {
  const registry = await loadRegistry();
  const field = renderComponent(registry, render, 'field', {
    label: 'Email',
    controlId: 'quote-email',
    controlHtml: renderComponent(registry, render, 'input', { id: 'quote-email', value: '' }).html,
    hint: 'We only email about your jobs.',
  }).html;
  const summary = renderComponent(registry, render, 'alert', {
    title: 'Check the form',
    body: 'One field needs attention.',
    variant: 'danger',
  }).html;
  const actions = renderComponent(registry, render, 'button', {
    label: 'Request quote',
    variant: 'primary',
  }).html;
  const { html, viewModel } = renderComponent(registry, render, 'form', {
    name: 'quote',
    heading: 'Request a quote',
    fieldsHtml: field,
    summaryHtml: summary,
    actionsHtml: actions,
  });
  assert.match(html, /<form variant="default">/);
  assert.match(html, /<h3>Request a quote<\/h3>/);
  assert.match(html, /<aside variant="danger" role="alert">/);
  assert.match(html, /<label for="quote-email">Email<\/label>/);
  assert.match(html, /<footer>\s*<button variant="primary" type="button">Request quote<\/button>/);
  assert.equal(viewModel.submitted(), false);
  let prevented = false;
  const events = [];
  const vm = registry.getComponent('form').create({
    name: 'quote',
    fieldsHtml: field,
    onSubmit: (event) => events.push(event),
  });
  vm.submit({
    preventDefault: () => {
      prevented = true;
    },
  });
  assert.equal(prevented, true);
  assert.equal(vm.submitted(), true);
  assert.deepEqual(events, [{ name: 'quote' }]);
  const bare = renderComponent(registry, render, 'form', { fieldsHtml: field }).html;
  assert.doesNotMatch(bare, /<h3>|<footer>/);
});

test('search-field standardizes the search control and reports its query', async () => {
  const registry = await loadRegistry();
  const searches = [];
  const clears = [];
  const vm = registry.getComponent('search-field').create({
    label: 'Search leads',
    controlId: 'q',
    name: 'lead-search',
    value: 'panel',
    onSearch: (event) => searches.push(event),
    onClear: (event) => clears.push(event),
  });
  assert.equal(vm.hasValue(), true);
  vm.update({ target: { value: 'garage' } });
  vm.keydown({ key: 'a' });
  assert.deepEqual(searches, []);
  vm.keydown({ key: 'Enter' });
  assert.deepEqual(searches, [{ name: 'lead-search', value: 'garage' }]);
  vm.clear();
  assert.equal(vm.value(), '');
  assert.equal(vm.hasValue(), false);
  assert.deepEqual(clears, [{ name: 'lead-search' }]);
  const { html } = renderComponent(registry, render, 'search-field', {
    label: 'Search leads',
    controlId: 'q',
    name: 'lead-search',
    value: 'panel',
    submitHtml: renderComponent(registry, render, 'button', { label: 'Search', variant: 'primary' })
      .html,
  });
  assert.match(html, /<search variant="default">/);
  assert.match(html, /<label for="q">Search leads<\/label>/);
  assert.match(
    html,
    /<input variant="default" id="q" type="search" name="lead-search" value="panel">/,
  );
  assert.match(html, /<button type="button">Clear<\/button>/);
  assert.match(html, /<button variant="primary" type="button">Search<\/button>/);
  const empty = renderComponent(registry, render, 'search-field', {
    label: 'Search leads',
    controlId: 'q2',
  }).html;
  assert.doesNotMatch(empty, />Clear<\/button>/);
});

test('segmented-control runs the choice paradigm over its own segments', async () => {
  const registry = await loadRegistry();
  const events = [];
  const vm = registry.getComponent('segmented-control').create({
    legend: 'Calendar view',
    name: 'cal-view',
    value: 'month',
    options: [
      { value: 'month', label: 'Month' },
      { value: 'schedule', label: 'Schedule' },
    ],
    onChange: (change) => events.push(change),
  });
  assert.equal(vm.isChecked(vm.options()[0]), true);
  vm.change(vm.options()[1]);
  vm.change(vm.options()[1]);
  assert.deepEqual(events, [
    {
      name: 'cal-view',
      mode: 'segmented',
      values: ['schedule'],
      changed: 'schedule',
      selected: true,
    },
  ]);
  const { html } = renderComponent(registry, render, 'segmented-control', {
    legend: 'Calendar view',
    name: 'cal-view',
    value: 'schedule',
    options: [
      { value: 'month', label: 'Month' },
      { value: 'schedule', label: 'Schedule' },
    ],
  });
  assert.match(html, /<fieldset variant="segmented-control">/);
  assert.match(
    html,
    /<input variant="default" type="radio" name="cal-view" value="schedule" checked="true">/,
  );
  assert.doesNotMatch(html, /value="month" checked/);
});

test('stepper marks complete, current, and upcoming steps and moves on request', async () => {
  const registry = await loadRegistry();
  const steps = [
    { value: 'quote', label: 'Quote', detail: 'Exact price up front' },
    { value: 'confirm', label: 'Confirm', detail: 'Both ends confirm' },
    { value: 'schedule', label: 'Schedule' },
    { value: 'pay', label: 'Pay' },
  ];
  const events = [];
  const vm = registry.getComponent('stepper').create({
    name: 'job-flow',
    steps,
    current: 'confirm',
    onStep: (event) => events.push(event),
  });
  assert.equal(vm.stateFor(steps[0]), 'complete');
  assert.equal(vm.stateFor(steps[1]), 'current');
  assert.equal(vm.stateFor(steps[2]), 'upcoming');
  assert.equal(vm.stepNumber(steps[2]), '3');
  vm.next();
  vm.previous();
  vm.previous();
  vm.previous();
  assert.equal(vm.currentValue(), 'quote');
  assert.deepEqual(events, [
    { name: 'job-flow', index: 2, value: 'schedule', label: 'Schedule' },
    { name: 'job-flow', index: 1, value: 'confirm', label: 'Confirm' },
    { name: 'job-flow', index: 0, value: 'quote', label: 'Quote' },
  ]);
  const { html } = renderComponent(registry, render, 'stepper', { steps, current: 'confirm' });
  assert.match(html, /<ol variant="stepper">/);
  assert.match(html, /<li variant="complete">/);
  assert.match(html, /<li variant="current" aria-current="step">/);
  assert.match(html, /<li variant="upcoming">/);
  assert.match(html, /<small>Both ends confirm<\/small>/);
});

test('tabs pairs every tab with its panel and reports selection', async () => {
  const registry = await loadRegistry();
  const events = [];
  const vm = registry.getComponent('tabs').create({
    id: 'job',
    label: 'Job views',
    name: 'job-tabs',
    value: 'details',
    tabs: [
      { value: 'details', label: 'Details', panelHtml: '<p>Scope and price.</p>' },
      { value: 'activity', label: 'Activity', panelHtml: '<p>Every event.</p>' },
    ],
    onSelect: (change) => events.push(change),
  });
  vm.select(vm.tabs()[1]);
  vm.select(vm.tabs()[1]);
  assert.deepEqual(events, [
    { name: 'job-tabs', mode: 'tabs', values: ['activity'], changed: 'activity', selected: true },
  ]);
  const { html } = renderComponent(registry, render, 'tabs', {
    id: 'job',
    label: 'Job views',
    value: 'details',
    tabs: [
      { value: 'details', label: 'Details', panelHtml: '<p>Scope and price.</p>' },
      { value: 'activity', label: 'Activity', panelHtml: '<p>Every event.</p>' },
    ],
  });
  assert.match(html, /<section variant="tabs">/);
  assert.match(html, /<ul role="tablist" aria-label="Job views">/);
  assert.match(
    html,
    /<button type="button" role="tab" id="job-tab-details" aria-selected="true" aria-controls="job-panel-details" tabindex="0">Details<\/button>/,
  );
  assert.match(
    html,
    /<button type="button" role="tab" id="job-tab-activity" aria-selected="false" aria-controls="job-panel-activity" tabindex="-1">Activity<\/button>/,
  );
  /* The APG keys live in the view model: ArrowRight from the last tab
     wraps to the first and selects it under automatic activation. */
  vm.onKeydown({ key: 'ArrowRight', preventDefault() {}, currentTarget: null }, vm.tabs()[1]);
  assert.equal(vm.selected(), 'details');
  assert.equal(vm.focused(), 'details');
  assert.match(
    html,
    /<section role="tabpanel" id="job-panel-details" aria-labelledby="job-tab-details">/,
  );
  assert.match(
    html,
    /<section role="tabpanel" id="job-panel-activity" aria-labelledby="job-tab-activity" hidden>/,
  );
});

test('empty-state composes a mark, a message, and the action that fills the surface', async () => {
  const registry = await loadRegistry();
  const { html } = renderComponent(registry, render, 'empty-state', {
    title: 'No leads yet',
    body: 'Delivered leads land here, priced and outcome-tracked.',
    mediaHtml: renderComponent(registry, render, 'avatar', { initials: 'GP' }).html,
    actionHtml: renderComponent(registry, render, 'button', {
      label: 'Open the quote form',
      variant: 'primary',
    }).html,
  });
  assert.match(html, /<article variant="empty-state">/);
  assert.match(html, /<figure variant="default">/);
  assert.match(html, /<h3>No leads yet<\/h3>/);
  assert.match(html, /<p>Delivered leads land here, priced and outcome-tracked\.<\/p>/);
  assert.match(html, /<button variant="primary" type="button">Open the quote form<\/button>/);
  const bare = renderComponent(registry, render, 'empty-state', { title: 'Nothing here' }).html;
  assert.doesNotMatch(bare, /<p>/);
});

test('toolbar owns its overflow state and places the menu', async () => {
  const registry = await loadRegistry();
  const events = [];
  const vm = registry.getComponent('toolbar').create({
    label: 'Lead actions',
    actionsHtml: '<button variant="primary" type="button">New lead</button>',
    overflowHtml: '<menu variant="default"></menu>',
    onOverflow: (event) => events.push(event),
  });
  assert.equal(vm.overflowOpen(), false);
  vm.toggleOverflow();
  assert.equal(vm.overflowOpen(), true);
  vm.toggleOverflow();
  assert.deepEqual(events, [{ open: true }, { open: false }]);
  const menu = renderComponent(registry, render, 'dropdown-menu', {
    label: 'More actions',
    items: [{ label: 'Import leads' }, { label: 'Export' }],
  }).html;
  const closed = renderComponent(registry, render, 'toolbar', {
    label: 'Lead actions',
    actionsHtml: renderComponent(registry, render, 'button', {
      label: 'New lead',
      variant: 'primary',
    }).html,
    overflowHtml: menu,
  }).html;
  assert.match(closed, /<section variant="toolbar" aria-label="Lead actions">/);
  assert.match(closed, /aria-expanded="false"/);
  assert.doesNotMatch(closed, /<menu/);
  const open = renderComponent(registry, render, 'toolbar', {
    label: 'Lead actions',
    actionsHtml: renderComponent(registry, render, 'button', {
      label: 'New lead',
      variant: 'primary',
    }).html,
    overflowHtml: menu,
    overflowOpen: true,
  }).html;
  assert.match(open, /aria-expanded="true"/);
  assert.match(open, /<menu variant="default"/);
});

test('rating runs the choice paradigm over a star substrate and lights its range in CSS', async () => {
  const registry = await loadRegistry();
  const star =
    '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2l2.9 6.6 7.1.6-5.4 4.7 1.6 7-6.2-3.7-6.2 3.7 1.6-7L2 9.2l7.1-.6z"/></svg>';
  const events = [];
  const vm = registry.getComponent('rating').create({
    legend: 'Rate this job',
    name: 'job-rating',
    starHtml: star,
    value: 3,
    onChange: (change) => events.push(change),
  });
  assert.equal(vm.options().length, 5);
  assert.equal(vm.isChecked(vm.options()[2]), true);
  vm.change(vm.options()[4]);
  assert.deepEqual(events, [
    { name: 'job-rating', mode: 'rating', values: [5], changed: 5, selected: true },
  ]);
  assert.throws(
    () =>
      registry.getComponent('rating').create({ legend: 'x', name: 'x', starHtml: star, max: 10 }),
    /one to five/,
  );
  const { html } = renderComponent(registry, render, 'rating', {
    legend: 'Rate this job',
    name: 'job-rating',
    starHtml: star,
    value: 4,
  });
  assert.match(html, /<fieldset variant="rating">/);
  assert.equal((html.match(/type="radio"/g) ?? []).length, 5);
  assert.match(html, /<label aria-label="4 stars">/);
  assert.match(html, /name="job-rating" value="4" checked="true"/);
  const { readFile } = await import('node:fs/promises');
  const ratingCss = await readFile(new URL('./rating/styles.css', import.meta.url), 'utf8');
  assert.match(
    ratingCss,
    /fieldset\[variant="rating"\]:has\(> label:nth-of-type\(4\) > input:checked\) > label:nth-of-type\(-n\+4\)/,
  );
});

test('search-field and toolbar style only their own buttons, never a slotted component', async () => {
  const { readFile } = await import('node:fs/promises');
  const searchCss = await readFile(new URL('./search-field/styles.css', import.meta.url), 'utf8');
  assert.match(searchCss, /& > button:not\(\[variant\]\)/);
  const toolbarCss = await readFile(new URL('./toolbar/styles.css', import.meta.url), 'utf8');
  assert.match(toolbarCss, /& > button:not\(\[variant\]\)/);
});

test('the overlay components size like the dialog — border-box, full width, token caps', async () => {
  const { readFile } = await import('node:fs/promises');
  const tokens = await readFile(new URL('./tokens.css', import.meta.url), 'utf8');
  for (const primitive of ['--size-drawer-max:', '--size-palette-max:', '--size-menu-min:']) {
    assert.ok(tokens.includes(primitive), 'tokens.css is missing ' + primitive);
  }
  const drawerCss = await readFile(new URL('./drawer/styles.css', import.meta.url), 'utf8');
  assert.match(tokens, /--size-drawer-inline: var\(--size-full\)/);
  assert.match(tokens, /--size-drawer-max-inline: var\(--size-drawer-max\)/);
  assert.match(drawerCss, /box-sizing: var\(--box-sizing-drawer\)/);
  const paletteCss = await readFile(
    new URL('./command-palette/styles.css', import.meta.url),
    'utf8',
  );
  assert.match(tokens, /--size-command-palette-max-inline: var\(--size-palette-max\)/);
  assert.match(paletteCss, /box-sizing: var\(--box-sizing-command-palette\)/);
  assert.doesNotMatch(drawerCss + paletteCss, /: (24|36)rem;/);
});

test('the popup composites anchor below their section, and their fields take the fill', async () => {
  const { readFile } = await import('node:fs/promises');
  const tokens = await readFile(new URL('./tokens.css', import.meta.url), 'utf8');
  const comboCss = await readFile(new URL('./combobox/styles.css', import.meta.url), 'utf8');
  assert.match(tokens, /--spacing-combobox-listbox-inset-block-start: var\(--size-full\)/);
  assert.match(comboCss, /--color-bkg-input: var\(--color-fill-3\)/);
  const multiCss = await readFile(new URL('./multiselect/styles.css', import.meta.url), 'utf8');
  assert.match(tokens, /--spacing-multiselect-listbox-inset-block-start: var\(--size-full\)/);
  assert.match(multiCss, /--color-bkg-input: var\(--color-fill-3\)/);
  const paletteCss = await readFile(
    new URL('./command-palette/styles.css', import.meta.url),
    'utf8',
  );
  assert.match(paletteCss, /--color-bkg-input: var\(--color-fill-3\)/);
});

test('virtualizer rows center their content, and the restacked table sets each key over its value', async () => {
  const { readFile } = await import('node:fs/promises');
  const tokens = await readFile(new URL('./tokens.css', import.meta.url), 'utf8');
  assert.match(tokens, /--display-virtualizer-item: var\(--display-flex\)/);
  assert.match(tokens, /--align-virtualizer-item: var\(--align-center\)/);
  assert.match(tokens, /--spacing-table-row-padding-block-restack: var\(--spacing-1\)/);
  assert.match(tokens, /--spacing-table-cell-padding-block-restack: var\(--spacing-1\)/);
  assert.match(tokens, /--display-table-cell-key-restack: block;/);
  assert.match(tokens, /--spacing-table-cell-key-padding-block-end: var\(--spacing-0\)/);
  assert.match(tokens, /--size-border-table-row-block-end-restack: var\(--size-hairline\)/);
});

test('select anchors its popover to the section edge; multiselect marks a choice with a check, not a tiled fill', async () => {
  const { readFile } = await import('node:fs/promises');
  const tokens = await readFile(new URL('./tokens.css', import.meta.url), 'utf8');
  const selectCss = await readFile(new URL('./select/styles.css', import.meta.url), 'utf8');
  assert.match(tokens, /--spacing-select-listbox-inset-block-start: var\(--size-full\)/);
  assert.match(selectCss, /section\[variant="native"\]/);
  const multiCss = await readFile(new URL('./multiselect/styles.css', import.meta.url), 'utf8');
  assert.match(multiCss, /li\[aria-selected="true"\] > svg/);
  assert.match(multiCss, /li\[variant="active"\]/);
  assert.doesNotMatch(multiCss, /li\[aria-selected="true"\] \+ li\[aria-selected="true"\]/);
  assert.match(tokens, /--color-bkg-toggle-knob: var\(--palette-white\)/);
});

test('the select chevron rides the end edge and rotates when the popover opens', async () => {
  const { readFile } = await import('node:fs/promises');
  const tokens = await readFile(new URL('./tokens.css', import.meta.url), 'utf8');
  const css = await readFile(new URL('./select/styles.css', import.meta.url), 'utf8');
  assert.match(tokens, /--justify-select-trigger: var\(--justify-space-between\)/);
  assert.match(
    tokens,
    /--spacing-select-chevron-margin-inline-start: var\(--spacing-margin-auto\)/,
  );
  assert.match(css, /button\[aria-expanded="true"\] > svg/);
  assert.match(tokens, /--transform-select-chevron-open: rotate\(180deg\)/);
});

test('the accordion separator is between items only: the last item drops it', async () => {
  const { readFile } = await import('node:fs/promises');
  const tokens = await readFile(new URL('./tokens.css', import.meta.url), 'utf8');
  const css = await readFile(new URL('./accordion/styles.css', import.meta.url), 'utf8');
  assert.match(tokens, /--size-border-accordion-block-end-last: var\(--size-border-none\)/);
  assert.match(
    css,
    /details\[variant="default"\]:last-of-type \{\s*border-block-end-width: var\(--size-border-accordion-block-end-last\)/,
  );
});

test('the accordion keeps the same space around its separators open and closed', async () => {
  const { readFile } = await import('node:fs/promises');
  const tokens = await readFile(new URL('./tokens.css', import.meta.url), 'utf8');
  assert.match(tokens, /--spacing-accordion-summary-padding-block: var\(--spacing-3\)/);
  assert.match(tokens, /--spacing-accordion-content-padding-block-end: var\(--spacing-3\)/);
});

test('the accordion trims body edge margins so open spacing matches closed', async () => {
  const { readFile } = await import('node:fs/promises');
  const tokens = await readFile(new URL('./tokens.css', import.meta.url), 'utf8');
  const css = await readFile(new URL('./accordion/styles.css', import.meta.url), 'utf8');
  assert.match(tokens, /--spacing-accordion-content-margin-block-start: var\(--spacing-0\)/);
  assert.match(tokens, /--spacing-accordion-content-margin-block-end: var\(--spacing-0\)/);
  assert.match(
    css,
    /& > :first-child \{\s*margin-block-start: var\(--spacing-accordion-content-margin-block-start\)/,
  );
  assert.match(
    css,
    /& > :last-child \{\s*margin-block-end: var\(--spacing-accordion-content-margin-block-end\)/,
  );
});

test('an invalid field colors only its error note; the hint keeps its own color', async () => {
  const { readFile } = await import('node:fs/promises');
  const css = await readFile(new URL('./field/styles.css', import.meta.url), 'utf8');
  assert.match(
    css,
    /&:has\(> input\[aria-invalid="true"\]\) \{\s*--color-border-input: var\(--color-border-input-invalid\);\s*& > small:first-of-type \{/,
  );
});

test('the form takes its invalid cue from declared state, never native validity', async () => {
  const { readFile } = await import('node:fs/promises');
  const css = await readFile(new URL('./form/styles.css', import.meta.url), 'utf8');
  assert.match(css, /&:has\(\[aria-invalid="true"\]\) > footer/);
  assert.ok(!css.includes(':invalid'), 'native :invalid must not drive the form');
});

test('the datagrid shows its sort direction with a chevron that flips', async () => {
  const { readFile } = await import('node:fs/promises');
  const html = await readFile(new URL('./datagrid/index.html', import.meta.url), 'utf8');
  const css = await readFile(new URL('./datagrid/styles.css', import.meta.url), 'utf8');
  const tokens = await readFile(new URL('./tokens.css', import.meta.url), 'utf8');
  assert.match(
    html,
    /:aria-sort="column\.sort" :tabindex="headerTabIndex\(column\)" @click="sortClick\(\$event, column\)">\{\{ raw\(column\.sortHtml\) \}\}<svg/,
  );
  assert.match(tokens, /--transform-datagrid-sort-icon-ascending: rotate\(180deg\)/);
  assert.match(
    css,
    /th\[aria-sort="ascending"\] > svg \{\s*transform: var\(--transform-datagrid-sort-icon-ascending\)/,
  );
});

test('a grid header button paints no pill: the cell owns the surface', async () => {
  const { readFile } = await import('node:fs/promises');
  const css = await readFile(new URL('./datagrid/styles.css', import.meta.url), 'utf8');
  assert.match(
    css,
    /thead th > button \{\s*--color-bkg-button-hover: var\(--palette-transparent\);\s*--color-bkg-button-active: var\(--palette-transparent\);/,
  );
});

test('a toast carries its tone as a glyph, not a colored edge', async () => {
  const { readFile } = await import('node:fs/promises');
  const css = await readFile(new URL('./toast/styles.css', import.meta.url), 'utf8');
  const js = await readFile(new URL('./toast/index.js', import.meta.url), 'utf8');
  assert.ok(!css.includes('border-inline-start'), 'the accent bar is gone');
  assert.match(css, /& > li > svg \{\s*inline-size: var\(--size-toast-item-icon-inline\);/);
  assert.match(css, /color: var\(--color-accent-toast-item\);/);
  for (const tone of ['success', 'info', 'warning', 'danger'])
    assert.ok(js.includes(tone + ':'), 'glyph for ' + tone);
});

test('code-block renders its caption as the header bar and its code escaped in a pre', async () => {
  const registry = await loadRegistry();
  const copy = renderComponent(registry, render, 'button', {
    label: 'Copy',
    variant: 'ghost',
  }).html;
  const { html } = renderComponent(registry, render, 'code-block', {
    caption: 'counter.html',
    code: '<p>{{ count() }}</p>',
    actionsHtml: copy,
  });
  assert.match(html, /<figure variant="code">/);
  assert.match(
    html,
    /<figcaption>counter\.html\s*<button variant="ghost" type="button">Copy<\/button>\s*<\/figcaption>/,
  );
  assert.match(
    html,
    /<pre tabindex="0"><code>&lt;p&gt;\{\{ count\(\) \}\}&lt;\/p&gt;<\/code><\/pre>/,
  );
  assert.doesNotMatch(html, /class=|data-/);
});

test('code-block drops the header bar when it has neither caption nor actions', async () => {
  const registry = await loadRegistry();
  const bare = renderComponent(registry, render, 'code-block', { code: 'count.set(1);' }).html;
  assert.match(bare, /<figure variant="code">/);
  assert.doesNotMatch(bare, /<figcaption>/);
  assert.match(bare, /<pre tabindex="0"><code>count\.set\(1\);<\/code><\/pre>/);
  assert.throws(() => registry.getComponent('code-block').create({}), /code is required/);
  // The figure element's other addresses stay the avatar's.
  assert.deepEqual(registry.listVariants('code-block'), ['code']);
  assert.ok(registry.listVariants('avatar').includes('default'));
});
