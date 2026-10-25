// Renders the Holy Trinity pilot proof page: the pilot trio composed the way
// an app composes them, plus the button's three files shown as the work.
// Run: node packages/components/scripts/render-trinity-proof.mjs [output.html]
import { readFile, writeFile } from 'node:fs/promises';
import { render } from '../../server/src/render.js';
import { loadRegistry, renderComponent, assembleStyles } from '../src/loader.js';
import { highlightCodeBlocks } from '../../../examples/express/highlight.js';

const registry = await loadRegistry();
const R = (name, props) => renderComponent(registry, render, name, props).html;

const buttons = [
  R('button', { label: 'Save draft' }),
  R('button', { label: 'Publish', variant: 'primary' }),
  R('button', { label: 'Cancel', variant: 'ghost' }),
  R('button', { label: 'Delete', variant: 'destructive' }),
  R('button', { label: 'Working', variant: 'primary', disabled: true }),
].join('\n      ');

const emailField = R('field', {
  label: 'Email', controlId: 'email',
  controlHtml: R('input', { id: 'email', value: '' }),
  hint: 'We only email about your jobs.',
});
const badInput = R('input', { id: 'email2', value: 'not-an-email', invalid: true });
const errorField = R('field', {
  label: 'Email', controlId: 'email2', controlHtml: badInput,
  hint: 'We only email about your jobs.', error: 'Enter a valid email address.',
});

const archiveDialog = R('dialog', {
  title: 'Archive this job?', body: 'Archived jobs leave the board but keep their history.',
  closeHtml: R('button', { label: 'Close', variant: 'ghost' }),
  footerHtml: R('button', { label: 'Cancel', variant: 'ghost' }) + R('button', { label: 'Archive', variant: 'primary' }),
}).replace('<dialog', '<dialog open');

const deleteDialog = R('dialog', {
  title: 'Delete this lead?', body: 'The Delete button below is a plain default button — the destructive dialog variant re-points its tokens by scope.',
  variant: 'destructive',
  closeHtml: R('button', { label: 'Close', variant: 'ghost' }),
  footerHtml: R('button', { label: 'Cancel', variant: 'ghost' }) + R('button', { label: 'Delete lead' }),
}).replace('<dialog', '<dialog open');


const badges = [
  R('badge', { label: 'Draft' }),
  R('badge', { label: 'New lead', variant: 'info' }),
  R('badge', { label: 'Paid', variant: 'success' }),
  R('badge', { label: 'Due soon', variant: 'warning' }),
  R('badge', { label: 'Overdue', variant: 'danger' }),
].join('\n      ');

const controls = [
  R('checkbox', { label: 'Licensed & insured', checked: true }),
  R('checkbox', { label: 'Offers financing' }),
  R('toggle', { label: 'Auto-book confirmed jobs', checked: true }),
  R('toggle', { label: 'Weekend work' }),
  R('radio', {
    legend: 'Arrival window', name: 'window', value: 'pm',
    options: [
      { value: 'am', label: 'Morning' },
      { value: 'pm', label: 'Afternoon' },
      { value: 'eve', label: 'Evening' },
    ],
  }),
  R('field', {
    label: 'Trade', controlId: 'trade',
    controlHtml: R('select', {
      id: 'trade', value: 'hvac',
      options: [
        { value: 'electrical', label: 'Electrical' },
        { value: 'plumbing', label: 'Plumbing' },
        { value: 'hvac', label: 'HVAC' },
      ],
    }),
    hint: 'The trade decides which pricing engine runs.',
  }),
  R('field', {
    label: 'Job notes', controlId: 'notes',
    controlHtml: R('textarea', { id: 'notes', rows: 3, value: 'Gate code 4211. Dog on site.' }),
  }),
].join('\n      ');

const alerts = [
  R('alert', { title: 'Schedule updated', body: 'Two crews are out today; afternoon windows shifted by an hour.', dismissHtml: R('button', { label: 'Dismiss', variant: 'ghost' }) }),
  R('alert', { title: 'Payment failed', body: 'The card on file was declined. Ask the customer for another method.', variant: 'danger', dismissHtml: R('button', { label: 'Dismiss', variant: 'ghost' }) }),
].join('\n      ');

const jobCard = R('card', {
  title: 'Panel upgrade — 200A service',
  body: 'Permit pulled. Materials on site. Progress is tracked against the quote.',
  footerHtml: R('button', { label: 'Open job', variant: 'primary' }),
});
const uploadBar = R('progress', { value: 60 });


const planCards = R('choice-group', {
  legend: 'Pick a plan', name: 'plan', value: 'schedule',
  options: [
    { value: 'leads', contentHtml: R('card', { title: 'Pay per delivered lead', body: 'One flat price per lead delivered into your schedule. No subscription, no tiers.' }) },
    { value: 'schedule', contentHtml: R('card', { title: 'Leads + schedule management', body: 'Auto-booking inside your availability windows, with instant notification and undo.' }) },
    { value: 'platform', contentHtml: R('card', { title: 'Full platform', body: 'Every job from first click to payment — Tesla work and everything else the shop runs.' }) },
  ],
});

const addOns = R('choice-group', {
  legend: 'Job add-ons', name: 'addons', type: 'checkbox', values: ['permit', 'surge'],
  options: [
    { value: 'permit', contentHtml: R('card', { title: 'Permit handling', body: 'We pull the permit and schedule the inspection.' }) },
    { value: 'surge', contentHtml: R('card', { title: 'Surge protection', body: 'Whole-panel surge device fitted during the same visit.' }) },
    { value: 'labeling', contentHtml: R('card', { title: 'Panel labeling', body: 'Every breaker identified and the directory reprinted.' }) },
  ],
});


const themeToggle = R('theme-toggle', {});

const avatarRow = [
  R('avatar', { initials: 'WD', variant: 'tone-0' }),
  R('avatar', { initials: 'OS', variant: 'tone-1' }),
  R('avatar', { initials: 'KC', variant: 'tone-3' }),
  R('avatar', { initials: 'GP', variant: 'default' }),
].join('\n');

const faq = R('accordion', {
  summary: 'What does a delivered lead cost?',
  bodyHtml: '<p>One flat price per service, the same whatever source the lead came from.</p>',
  open: true,
}) + R('accordion', {
  summary: 'When is the fee charged?',
  bodyHtml: '<p>When the lead is delivered into your schedule — never for a search or a click.</p>',
});

const crumbs = R('breadcrumb', {
  items: [
    { label: 'Home', href: '#' },
    { label: 'Components', href: '#' },
    { label: 'Catalog' },
  ],
});

const pager = R('pagination', { page: 3, pages: 8 });

const settingsList = R('list-group', {
  items: [
    { label: 'Email notifications', trailingHtml: R('badge', { label: 'On', variant: 'success' }) },
    { label: 'Plan', trailingHtml: R('badge', { label: 'Beta', variant: 'info' }) },
    { label: 'Jobs this month', trailingHtml: R('badge', { label: '12 delivered', variant: 'success' }) },
  ],
});

const countyCombo = R('combobox', {
  id: 'county', label: 'County',
  inputHtml: R('input', { id: 'county', type: 'text', value: 'Orange', ariaLabel: 'County' }),
  open: true, activeValue: 'orange',
  options: [
    { value: 'orange', label: 'Orange County' },
    { value: 'la', label: 'Los Angeles' },
    { value: 'riverside', label: 'Riverside' },
  ],
});

const tradesMulti = R('multiselect', {
  id: 'trades', label: 'Trades',
  inputHtml: R('input', { id: 'trades', type: 'text', value: '', ariaLabel: 'Trades' }),
  selected: [{ value: 'ev', label: 'EV charging', dismissHtml: R('button', { label: 'Remove', variant: 'ghost' }) }],
  options: [],
});

const leadDrawer = R('drawer', {
  title: 'Garcia — panel upgrade',
  body: 'Quoted $2,400. Site survey done, permit pulled, awaiting the bilateral confirmation.',
  closeHtml: R('button', { label: 'Close', variant: 'ghost' }),
  footerHtml: R('button', { label: 'Open job', variant: 'primary' }),
});

const actionsMenu = R('dropdown-menu', {
  label: 'Lead actions',
  items: [
    { label: 'Open lead', href: '#' },
    { label: 'Call customer' },
    { separator: true },
    { label: 'Archive' },
  ],
});

const palette = R('command-palette', {
  id: 'palette', label: 'Command palette', activeValue: 'new-lead',
  searchHtml: R('field', {
    label: 'Search commands', controlId: 'palette-search',
    controlHtml: R('input', { id: 'palette-search', type: 'text', value: '', ariaLabel: 'Search commands' }),
  }),
  groups: [
    { heading: 'Leads', options: [{ value: 'new-lead', label: 'New lead' }, { value: 'import', label: 'Import leads' }] },
    { heading: 'Jobs', options: [{ value: 'schedule', label: "Today's schedule" }] },
  ],
});

const tip = R('tooltip', {
  text: 'Delivered into the schedule',
  invokerHtml: R('button', { label: 'What counts as delivered?', variant: 'ghost' }),
});

const toasts = R('toast', {
  items: [
    { message: 'Lead delivered — Garcia, panel upgrade', tone: 'success', dismissHtml: R('button', { label: 'Dismiss', variant: 'ghost' }) },
    { message: 'Payment failed — retry scheduled', tone: 'danger', dismissHtml: R('button', { label: 'Dismiss', variant: 'ghost' }) },
  ],
});

const leadsTable = R('table', {
  variant: 'striped', caption: 'Delivered leads this week',
  columns: ['Lead', 'Service', 'Fee'],
  rows: [
    [{ text: 'Garcia', header: true }, 'Panel upgrade', '$85'],
    [{ text: 'Nguyen', header: true }, 'EV charger install', '$65'],
    [{ text: 'Patel', header: true }, 'Service call', '$45'],
  ],
});

const grid = R('datagrid', {
  selectable: true,
  selectAllHtml: R('checkbox', { label: 'Select all', name: 'all', value: 'all' }),
  columns: [
    { key: 'lead', label: 'Lead', sort: 'ascending', sortHtml: R('button', { label: 'Lead', variant: 'ghost' }) },
    { key: 'fee', label: 'Fee' },
  ],
  rows: [
    { cells: ['Garcia', '$85'], selectHtml: R('checkbox', { label: 'Select Garcia', name: 'sel', value: '1' }) },
    { cells: ['Nguyen', '$65'], selectHtml: R('checkbox', { label: 'Select Nguyen', name: 'sel', value: '2' }) },
  ],
});

const treeInner = R('tree', { items: [{ label: 'Panel upgrade' }, { label: 'EV charger' }, { label: 'Lighting' }] });
const treeDemo = R('tree', {
  items: [
    { label: 'Services', expanded: true, toggleHtml: R('button', { label: 'Services', variant: 'ghost' }), childrenHtml: treeInner },
    { label: 'Settings' },
  ],
});

const virt = R('virtualizer', {
  id: 'leads', total: 100, scrollTop: 44 * 20, rowHeight: 44, viewportRows: 8, overscan: 2,
  labelFor: (i) => `Lead ${i + 1} — Orange County`,
});

const calVm = renderComponent(registry, render, 'calendar', { year: 2026, month: 10, today: '2026-10-24', selected: '2026-10-26' }).viewModel;
const calTable = R('table', {
  columns: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
  rows: calVm.weeks().map((week) => week.map((day) => ({
    text: String(day.day),
    current: day.isToday ? 'date' : day.isSelected ? 'true' : undefined,
    small: !day.inMonth,
  }))),
});
const calMonth = R('calendar', {
  year: 2026, month: 10, today: '2026-10-24', selected: '2026-10-26', bodyHtml: calTable,
  prevHtml: R('button', { label: 'Previous', variant: 'ghost' }),
  nextHtml: R('button', { label: 'Next', variant: 'ghost' }),
});
const calSchedule = R('calendar', {
  year: 2026, month: 10, today: '2026-10-24', variant: 'schedule',
  events: [
    { date: '2026-10-26', title: 'Garcia — panel upgrade', at: '2026-10-26T09:00', timeLabel: '9:00 AM' },
    { date: '2026-10-26', title: 'Nguyen — site survey', at: '2026-10-26T13:00', timeLabel: '1:00 PM' },
    { date: '2026-10-27', title: 'Patel — EV charger', at: '2026-10-27T10:30', timeLabel: '10:30 AM' },
  ],
});

const board = R('pipeline', {
  columns: [
    { title: 'Quoted', cardsHtml: [R('card', { title: 'Garcia', body: 'Panel upgrade — $2,400' })] },
    { title: 'Scheduled', cardsHtml: [R('card', { title: 'Nguyen', body: 'EV charger — Mon 9 AM' })] },
    { title: 'Paid', cardsHtml: [R('card', { title: 'Patel', body: 'Service call — $180' })] },
  ],
});

const css = await assembleStyles(registry, ['button', 'input', 'field', 'dialog', 'badge', 'checkbox', 'toggle', 'radio', 'textarea', 'select', 'alert', 'progress', 'card', 'choice-group', 'avatar', 'accordion', 'breadcrumb', 'pagination', 'list-group', 'combobox', 'multiselect', 'drawer', 'dropdown-menu', 'command-palette', 'tooltip', 'toast', 'table', 'datagrid', 'tree', 'virtualizer', 'calendar', 'pipeline', 'theme-toggle']);
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const buttonHtml = await readFile(new URL('../src/button/index.html', import.meta.url), 'utf8');
const buttonCss = await readFile(new URL('../src/button/styles.css', import.meta.url), 'utf8');
const buttonJs = await readFile(new URL('../src/button/index.js', import.meta.url), 'utf8');

const page = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Holy Trinity pilot — proof</title>
<style>
${css}
</style>
<style>
  /* Proof-page chrome only — not component CSS. */
  body { font-family: system-ui, sans-serif; margin: 0; padding: 2rem 1rem 4rem; background: var(--background-grouped); color: var(--label); }
  main { max-width: 44rem; margin: 0 auto; display: grid; gap: 2.5rem; }
  section { display: grid; gap: 1rem; min-width: 0; }
  article { min-width: 0; }
  @media (max-width: 40rem) {
    body { padding: 1.25rem .75rem 3rem; }
    article { padding: 1rem; }
    h1 { font-size: 1.25rem; }
  }
  h1 { font-size: 1.5rem; margin: 0; }
  h2 { font-size: 1.05rem; margin: 0; }
  p.note { color: var(--label-2); font-size: .875rem; margin: 0; }
  main > section > article { background: var(--background-grouped-2); border: 1px solid var(--separator); border-radius: .75rem; padding: 1.25rem; display: grid; gap: 1rem; }
  dialog { position: static; }
  pre { background: #111827; color: #f3f4f6; padding: 1rem; border-radius: .5rem; overflow-x: auto; font-size: .78rem; line-height: 1.5;
    --syntax-keyword: #c792ea; --syntax-string: #c3e88d; --syntax-function: #82aaff; --syntax-number: #f78c6c; --syntax-comment: #7a98a5; --syntax-tag: #f07178; --syntax-attr: #ffcb6b; --syntax-variable: #89ddff; }
  .kw { color: var(--syntax-keyword); }
  .str { color: var(--syntax-string); }
  .fn { color: var(--syntax-function); }
  .num { color: var(--syntax-number); }
  .cmt { color: var(--syntax-comment); font-style: italic; }
  .tag { color: var(--syntax-tag); }
  .attr { color: var(--syntax-attr); }
  .var { color: var(--syntax-variable); }
  article > p { display: flex; flex-wrap: wrap; gap: .5rem; align-items: center; margin: 0; }
  #leads { --virtualizer__spacer-start-count: 18; --virtualizer__spacer-end-count: 70; }
  section.toast-stage { transform: translateZ(0); min-block-size: 19rem; align-content: start; }
</style>
</head>
<body>
<main>
  <section>
    <h1>Holy Trinity pilot — rendered proof</h1>
    <p class="note">The full catalog — thirty-one components and two composites (choice-group, theme-toggle) — each a directory of index.html / styles.css / index.js, rendered server-side through @basenative/server. Every style below comes from global tokens — the component sheets declare no values of their own. The theme toggle at the top of this page is live: it stamps the document and the token sheet answers in system, light, or dark.</p>
    ${themeToggle}
  </section>

  <section>
    <h2>Buttons — four registered variants, one disabled, one vanilla</h2>
    <article>
      <p>${buttons}</p>
      <p>Vanilla, for contrast — no variant attribute, untouched by the catalog: <button>Plain button</button></p>
    </article>
  </section>

  <section>
    <h2>Field + input — hint, then error</h2>
    <article>
      ${emailField}
      ${errorField}
    </article>
  </section>


  <section>
    <h2>Badges — one element, five registered tones</h2>
    <article>
      <p>${badges}</p>
    </article>
  </section>

  <section>
    <h2>Form controls — checkbox, switch, radio, select, textarea</h2>
    <article>
      ${controls}
    </article>
  </section>

  <section>
    <h2>Alerts — the variant picks the tone and the ARIA role</h2>
    ${alerts}
  </section>

  <section>
    <h2>Card + progress</h2>
    ${jobCard}
    <article>
      ${uploadBar}
    </article>
  </section>

  <section>
    <h2>Choice group — choose one (radio) over the card substrate</h2>
    ${planCards}
    <h2>Same group, choose many (checkbox) — a different mode, the same substrate</h2>
    ${addOns}
    <p class="note">Every change in either group reaches the app as one event — group, mode, values, and what changed — whatever the options are made of. The control notches into the card: the group positions the input, and the selected look plus the notch reservation live in the card's own sheet; the group never styles inside its options.</p>
  </section>

  <section>
    <h2>Dialog — composed of buttons</h2>
    ${archiveDialog}
    ${deleteDialog}
  </section>


  <section>
    <h2>Theme toggle — system, light, or dark (live, above)</h2>
    <p class="note">A composite on the choice paradigm: one radio group over button substrates, one event per change. System leaves the document unstamped and the media query decides; light and dark stamp it and the token sheet's forced scopes answer.</p>
  </section>

  <section>
    <h2>Avatars — initials on registered tones</h2>
    <article>
      <p>${avatarRow}</p>
    </article>
  </section>

  <section>
    <h2>Accordion — native details, bound summary</h2>
    <article>
      ${faq}
    </article>
  </section>

  <section>
    <h2>Breadcrumb and pagination — one nav shape, two addresses</h2>
    <article>
      ${crumbs}
      ${pager}
    </article>
  </section>

  <section>
    <h2>List group — text rows, trailing components, rich rows</h2>
    ${settingsList}
  </section>

  <section>
    <h2>Combobox — an input and its listbox</h2>
    <article style="padding-block-end: 10rem">
      ${countyCombo}
    </article>
    <h2>Multiselect — the same popup, a set of chips</h2>
    <article>
      ${tradesMulti}
    </article>
  </section>

  <section>
    <h2>Drawer — the dialog skeleton at the edge</h2>
    ${leadDrawer}
  </section>

  <section>
    <h2>Dropdown menu and command palette</h2>
    <article>
      ${actionsMenu}
    </article>
    ${palette}
  </section>

  <section>
    <h2>Tooltip — hover or focus the invoker</h2>
    <article>
      <p>${tip}</p>
    </article>
  </section>

  <section>
    <h2>Table — real semantics, striped variant</h2>
    <article>
      ${leadsTable}
    </article>
    <h2>Datagrid — sort buttons and selection composed into the skeleton</h2>
    <article>
      ${grid}
    </article>
  </section>

  <section>
    <h2>Tree — recursion by composition</h2>
    <article>
      ${treeDemo}
    </article>
  </section>

  <section>
    <h2>Virtualizer — rows 19–30 of 100, spacers sized by tokens</h2>
    <article>
      ${virt}
    </article>
  </section>

  <section>
    <h2>Calendar — month (composed with the table) and schedule</h2>
    ${calMonth}
    ${calSchedule}
  </section>

  <section>
    <h2>Pipeline — stage columns of cards</h2>
    ${board}
  </section>

  <section class="toast-stage">
    <h2>Toasts — staged in a frame</h2>
    <p class="note">In an app the region pins to the viewport corner and the toasts expire; here they are staged inside a frame so they do not cover the page while you read it. Their Dismiss buttons work, and the pair auto-expires after nine seconds, as a real region's would.</p>
    ${toasts}
  </section>

  <section>
    <h2>The work — button/ in full</h2>
    <pre><code>${esc(buttonHtml)}</code></pre>
    <pre><code>${esc(buttonCss)}</code></pre>
    <pre><code>${esc(buttonJs)}</code></pre>
  </section>
</main>
<script>
  document.querySelectorAll('input[name="theme"]').forEach((input) => {
    input.addEventListener('change', () => {
      const root = document.documentElement;
      if (input.value === 'system') {
        root.removeAttribute('data-theme');
        root.style.colorScheme = '';
      } else {
        root.dataset.theme = input.value;
        root.style.colorScheme = input.value;
      }
    });
  });

  // Alert dismissals: the button removes its alert.
  document.querySelectorAll('aside[variant="info"] > button, aside[variant="success"] > button, aside[variant="warning"] > button, aside[variant="danger"] > button').forEach((button) => {
    button.addEventListener('click', () => button.closest('aside').remove());
  });

  // Toast dismissals, plus the auto-expire a live region runs.
  document.querySelectorAll('ol[aria-live] > li > button, ol[aria-live] > li > label').forEach((button) => {
    button.addEventListener('click', () => button.closest('li').remove());
  });
  setTimeout(() => {
    document.querySelectorAll('section.toast-stage ol[aria-live] > li').forEach((li) => li.remove());
  }, 9000);

  // Email revalidation: the error clears as soon as the value parses,
  // and returns when it stops parsing.
  const email = document.querySelector('#email2');
  if (email) {
    const field = email.closest('p');
    const errorNote = field ? field.querySelector('small') : null;
    email.addEventListener('input', () => {
      const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value);
      if (valid) {
        email.removeAttribute('aria-invalid');
        if (errorNote) errorNote.hidden = true;
      } else {
        email.setAttribute('aria-invalid', 'true');
        if (errorNote) errorNote.hidden = false;
      }
    });
  }
</script>
</body>
</html>
`;

const output = process.argv[2] ?? new URL('./trinity-proof.html', import.meta.url);
await writeFile(output, highlightCodeBlocks(page));
console.log(`proof written to ${output}`);
