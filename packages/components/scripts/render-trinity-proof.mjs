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
  controlHtml: R('input', { id: 'email', type: 'email', value: '' }),
  hint: 'We only email about your jobs.',
});
const badInput = R('input', { id: 'email2', type: 'email', value: 'not-an-email', invalid: true });
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
      id: 'trade', value: 'hvac', label: 'Trade', open: true,
      options: [
        { value: 'electrical', label: 'Electrical' },
        { value: 'plumbing', label: 'Plumbing' },
        { value: 'hvac', label: 'HVAC' },
      ],
    }),
    hint: 'The trade decides which pricing engine runs.',
  }),
  R('field', {
    label: 'Trade (native variant)', controlId: 'trade-native',
    controlHtml: R('select', {
      id: 'trade-native', value: 'hvac', variant: 'native',
      options: [
        { value: 'electrical', label: 'Electrical' },
        { value: 'plumbing', label: 'Plumbing' },
        { value: 'hvac', label: 'HVAC' },
      ],
    }),
    hint: 'The native variant keeps the platform element, its menu, and native form submission.',
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
}).replace('<dialog', '<dialog open');
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
  inputHtml: R('input', { id: 'county', type: 'search', value: 'Orange County', ariaLabel: 'County' }),
  open: true, activeValue: 'orange',
  options: [
    { value: 'orange', label: 'Orange County' },
    { value: 'la', label: 'Los Angeles' },
    { value: 'riverside', label: 'Riverside' },
  ],
});

const tradesMulti = R('multiselect', {
  id: 'trades', label: 'Trades',
  inputHtml: R('input', { id: 'trades', type: 'search', value: '', ariaLabel: 'Trades' }),
  selected: [{ value: 'ev', label: 'EV charging', dismissHtml: R('button', { label: 'Remove', variant: 'ghost' }) }],
  open: true,
  options: [
    { value: 'ev', label: 'EV charging' },
    { value: 'panel', label: 'Panel upgrade' },
    { value: 'lighting', label: 'Lighting' },
  ],
});

const leadDrawer = R('drawer', {
  title: 'Garcia — panel upgrade',
  body: 'Quoted $2,400. Site survey done, permit pulled, awaiting the bilateral confirmation.',
  closeHtml: R('button', { label: 'Close', variant: 'ghost' }),
  footerHtml: R('button', { label: 'Open job', variant: 'primary' }),
}).replace('<dialog', '<dialog open');

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
    controlHtml: R('input', { id: 'palette-search', type: 'search', value: '', ariaLabel: 'Search commands' }),
  }),
  groups: [
    { heading: 'Leads', options: [{ value: 'new-lead', label: 'New lead' }, { value: 'import', label: 'Import leads' }] },
    { heading: 'Jobs', options: [{ value: 'schedule', label: "Today's schedule" }] },
  ],
}).replace('<dialog', '<dialog open');

const tip = R('tooltip', {
  text: 'Delivered into the schedule',
  invokerHtml: R('button', { label: 'What counts as delivered?', variant: 'ghost' }),
});

const toastTriggers =
  R('button', { label: 'Success toast', variant: 'default' }).replace('<button', '<button id="toast-fire-success"') +
  R('button', { label: 'Warning toast', variant: 'default' }).replace('<button', '<button id="toast-fire-warning"') +
  R('button', { label: 'Danger toast', variant: 'default' }).replace('<button', '<button id="toast-fire-danger"');

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
  id: 'leads', total: 100, scrollTop: 0, rowHeight: 44, viewportRows: 8, overscan: 2,
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

const quoteForm = R('form', {
  name: 'quote', heading: 'Request a quote',
  summaryHtml: R('alert', { title: 'Check the form', body: 'Enter a valid email address so we can send the quote.', variant: 'danger' }).replace('>', ' hidden>'),
  fieldsHtml:
    R('field', {
      label: 'Name', controlId: 'quote-name',
      controlHtml: R('input', { id: 'quote-name', value: '' }),
      hint: 'Whoever the crew should ask for on site.',
    }) +
    R('field', {
      label: 'Email', controlId: 'quote-email',
      controlHtml: R('input', { id: 'quote-email', type: 'email', value: '' }),
      hint: 'We send the exact quote here.',
    }),
  actionsHtml:
    R('button', { label: 'Cancel', variant: 'ghost' }) +
    R('button', { label: 'Request quote', variant: 'primary' }),
});

const leadSearch = R('search-field', {
  label: 'Search leads', controlId: 'lead-q', name: 'lead-search', value: 'panel',
  submitHtml: R('button', { label: 'Search', variant: 'primary' }),
});

const calSegmented = R('segmented-control', {
  legend: 'Calendar view', name: 'cal-view', value: 'month',
  options: [
    { value: 'month', label: 'Month' },
    { value: 'schedule', label: 'Schedule' },
  ],
});

const jobStepper = R('stepper', {
  name: 'job-flow', current: 'confirm',
  steps: [
    { value: 'quote', label: 'Quote', detail: 'Exact price up front' },
    { value: 'confirm', label: 'Confirm', detail: 'Both ends confirm' },
    { value: 'schedule', label: 'Schedule', detail: 'In your windows' },
    { value: 'pay', label: 'Pay', detail: 'When the job is done' },
  ],
});
const stepBack = R('button', { label: 'Back', variant: 'ghost' }).replace('<button', '<button id="step-back"');
const stepNext = R('button', { label: 'Continue', variant: 'primary' }).replace('<button', '<button id="step-next"');

const jobTabs = R('tabs', {
  id: 'job', label: 'Job views', name: 'job-tabs',
  tabs: [
    { value: 'details', label: 'Details', panelHtml: '<p>Panel upgrade — 200A service. Permit pulled, materials on site, quoted at $2,400 exactly.</p>' },
    { value: 'activity', label: 'Activity', panelHtml: '<p>Quote sent Monday. The customer confirmed in-platform Tuesday; the crew is booked for the 26th.</p>' },
    { value: 'billing', label: 'Billing', panelHtml: '<p>Flat lead fee charged on delivery. The job invoice is issued when the work is done.</p>' },
  ],
});

const gridToolbar = R('toolbar', {
  label: 'Lead actions',
  actionsHtml: R('button', { label: 'New lead', variant: 'primary' }) + R('button', { label: 'Import', variant: 'ghost' }),
  overflowHtml: R('dropdown-menu', {
    label: 'More lead actions',
    items: [{ label: 'Export leads' }, { label: 'Archive delivered' }],
  }),
  overflowOpen: true,
}).replace('<menu ', '<menu hidden ');

const noLeads = R('empty-state', {
  title: 'No leads yet',
  body: 'Delivered leads land here — priced flat per service, tracked from quote to payment.',
  mediaHtml: R('avatar', { initials: 'GP' }),
  actionHtml: R('button', { label: 'Open the quote form', variant: 'primary' }).replace('<button', '<button id="empty-action"'),
});

const starSvg = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2l2.9 6.6 7.1.6-5.4 4.7 1.6 7-6.2-3.7-6.2 3.7 1.6-7L2 9.2l7.1-.6z"/></svg>';
const jobRating = R('rating', {
  legend: 'Rate this job', name: 'job-rating', starHtml: starSvg, value: 4,
});

const reopenArchive = R('button', { label: 'Reopen the dialog', variant: 'ghost' }).replace('<button', '<button id="reopen-archive" hidden');
const reopenDelete = R('button', { label: 'Reopen the dialog', variant: 'ghost' }).replace('<button', '<button id="reopen-delete" hidden');
const reopenDrawer = R('button', { label: 'Reopen the drawer', variant: 'ghost' }).replace('<button', '<button id="reopen-drawer" hidden');

const css = await assembleStyles(registry, ['button', 'input', 'field', 'dialog', 'badge', 'checkbox', 'toggle', 'radio', 'textarea', 'select', 'alert', 'progress', 'card', 'choice-group', 'avatar', 'accordion', 'breadcrumb', 'pagination', 'list-group', 'combobox', 'multiselect', 'drawer', 'dropdown-menu', 'command-palette', 'tooltip', 'toast', 'table', 'datagrid', 'tree', 'virtualizer', 'calendar', 'pipeline', 'theme-toggle', 'form', 'search-field', 'segmented-control', 'stepper', 'tabs', 'empty-state', 'toolbar', 'rating']);
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
  html { -webkit-text-size-adjust: 100%; text-size-adjust: 100%; }
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
  main [hidden] { display: none !important; }
  article:has(> details[variant="default"]) { row-gap: var(--space-0); }
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
  #leads { --virtualizer__spacer-start-count: 0; --virtualizer__spacer-end-count: 88; }
  section.toast-stage { transform: translateZ(0); min-block-size: 26rem; border: var(--hairline) solid var(--separator); border-radius: var(--radius-container); }
  p.toast-triggers { display: flex; flex-wrap: wrap; gap: .5rem; margin: 0; }
  section:has(#email) article, section:has(#trade) article { --input-background-color: var(--fill-3); --textarea-background-color: var(--fill-3); --select__native-background-color: var(--fill-3); --select__trigger-background-color: var(--fill-3); }
  article.drawer-stage { position: relative; block-size: 26rem; border: var(--hairline) solid var(--separator); border-radius: var(--radius-container); overflow: hidden; }
  article.drawer-stage > dialog[variant="drawer"] { position: absolute; inset-block: 0; inset-inline-end: 0; }
</style>
</head>
<body>
<main>
  <section>
    <h1>Holy Trinity pilot — rendered proof</h1>
    <p class="note">The full catalog — thirty-one components and ten composites (choice-group, theme-toggle, form, search-field, segmented-control, stepper, tabs, empty-state, toolbar, rating) — each a directory of index.html / styles.css / index.js, rendered server-side through @basenative/server. Every style below comes from global tokens — the component sheets declare no values of their own. The theme toggle at the top of this page is live: it stamps the document and the token sheet answers in system, light, or dark. So is everything else that looks interactive — dismiss the alerts and toasts, submit the form, switch the tabs, drive the stepper, open the toolbar menu, rate the job.</p>
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


  <section id="quote-form">
    <h2>Form — the quote flow, composed and live</h2>
    ${quoteForm}
    <p class="note" id="quote-sent" hidden>Quote requested — the exact price goes to the email above.</p>
    <p class="note">The composite owns the shape — heading, error summary, fields, actions. Submit with the bad email and the summary appears; fix the email and the error clears as you type, and the actions row undims — that dimming is the form's own sheet, reading :invalid relationally. In an app the same moments are the view model's: submit fires onSubmit, field errors live on the fields.</p>
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
    <h2>Stepper — the job flow as a rail</h2>
    ${jobStepper}
    <p>${stepBack} ${stepNext}</p>
    <p class="note">Back and Continue move the same state the view model owns — goTo, next, previous, one event per move. What changes hands here is the item variant; the rail, the disc, and the label weight follow from the sheet.</p>
  </section>

  <section>
    <h2>Tabs — one job, three views</h2>
    ${jobTabs}
    <p class="note">Every tab is paired to its panel by id, the selected one announced with aria-selected; the rest are present and hidden, as the pattern wants.</p>
  </section>

  <section>
    <h2>Dialog — composed of buttons</h2>
    ${archiveDialog}
    ${deleteDialog}
    <p>${reopenArchive} ${reopenDelete}</p>
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
    <h2>Search field — the standardized search control</h2>
    <article>
      ${leadSearch}
      <p class="note" id="search-status">Showing every lead.</p>
    </article>
    <p class="note">The control the combobox and the palette used to take as caller-rendered HTML, owned by one composite — label, input, a clear button that exists exactly while the field holds text, and the app's submit button. Search (or press Enter) and it reports the query; clear it and it reports that.</p>
  </section>

  <section>
    <h2>Combobox — an input and its listbox</h2>
    <article>
      ${countyCombo}
    </article>
    <h2>Multiselect — the same popup, a set of chips</h2>
    <article>
      ${tradesMulti}
    </article>
  </section>

  <section>
    <h2>Drawer — the dialog skeleton at the edge</h2>
    <article class="drawer-stage">
      ${leadDrawer}
    </article>
    <p>${reopenDrawer}</p>
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
    <h2>Toolbar — a bar of actions, with overflow</h2>
    ${gridToolbar}
    <p class="note">The overflow set rides in a dropdown menu behind More — the view model owns the open state and the expanded announcement; the bar only places the menu at its end edge. This is the header a datagrid wears.</p>
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
    <h2>Rating — the choice paradigm over a star</h2>
    <article>
      ${jobRating}
      <p class="note">Click a star. The lit range is pure CSS — the sheet lights the checked step and every step before it through :has, so the document order stays the value order and no script paints anything.</p>
    </article>
  </section>

  <section>
    <h2>Tree — recursion by composition</h2>
    <article>
      ${treeDemo}
    </article>
  </section>

  <section>
    <h2>Virtualizer — the first window of 100 rows, spacers sized by tokens</h2>
    <article>
      ${virt}
    </article>
  </section>

  <section>
    <h2>Calendar — month (composed with the table) and schedule</h2>
    ${calSegmented}
    ${calMonth}
    ${calSchedule}
  </section>

  <section>
    <h2>Pipeline — stage columns of cards</h2>
    ${board}
  </section>

  <section>
    <h2>Empty state — a surface before its first lead</h2>
    ${noLeads}
    <p class="note">Its action starts the flow that fills the surface — here it takes you to the quote form above.</p>
  </section>

  <section>
    <h2>Toasts — staged in a frame</h2>
    <p class="note">In an app the region pins to the viewport corner and the toasts expire; here they are staged inside a frame so they do not cover the page while you read it. Their Dismiss buttons work, and each one auto-expires after nine seconds, as a real region's would. The triggers fire fresh ones on demand.</p>
    <p class="toast-triggers">${toastTriggers}</p>
    <section class="toast-stage">${toasts}</section>
  </section>

  <section>
    <h2>The work — button/ in full</h2>
    <pre><code>${esc(buttonHtml)}</code></pre>
    <pre><code>${esc(buttonCss)}</code></pre>
    <pre><code>${esc(buttonJs)}</code></pre>
  </section>
</main>
<script>
  const email = document.querySelector('#email2');
  if (email) {
    const field = email.closest('p');
    const errorNote = field ? field.querySelector('small') : null;
    email.addEventListener('input', () => {
      const text = email.value.trim();
      const at = text.indexOf('@');
      const dot = text.lastIndexOf('.');
      const valid = at > 0 && dot > at + 1 && dot < text.length - 1 && !text.includes(' ');
      if (valid) {
        email.removeAttribute('aria-invalid');
        if (errorNote) errorNote.hidden = true;
      } else {
        email.setAttribute('aria-invalid', 'true');
        if (errorNote) errorNote.hidden = false;
      }
    });
  }

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

  // Toasts: dismiss removes, nine seconds expires, and the staged
  // region's triggers fire fresh ones in its tones.
  const toastRegion = document.querySelector('section.toast-stage ol[aria-live]');
  if (toastRegion) {
    const armToast = (li) => {
      const button = li.querySelector('button');
      if (button) button.addEventListener('click', () => li.remove());
      setTimeout(() => li.remove(), 9000);
    };
    toastRegion.querySelectorAll(':scope > li').forEach(armToast);
    const toastGlyphs = {
      success: '<circle cx="8" cy="8" r="6"/><path d="M5.5 8.2l1.8 1.8 3.4-3.8"/>',
      info: '<circle cx="8" cy="8" r="6"/><path d="M8 7.4v3.4"/><path d="M8 5v.1"/>',
      warning: '<path d="M8 2.9l5.3 9.1H2.7z"/><path d="M8 6.5v2.7"/><path d="M8 11v.1"/>',
      danger: '<circle cx="8" cy="8" r="6"/><path d="M5.8 5.8l4.4 4.4"/><path d="M10.2 5.8l-4.4 4.4"/>',
    };
    const fireToast = (tone, message) => {
      const li = document.createElement('li');
      li.setAttribute('variant', tone);
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('aria-hidden', 'true');
      svg.setAttribute('viewBox', '0 0 16 16');
      svg.setAttribute('fill', 'none');
      svg.setAttribute('stroke', 'currentColor');
      svg.setAttribute('stroke-width', '1.5');
      svg.setAttribute('stroke-linecap', 'round');
      svg.setAttribute('stroke-linejoin', 'round');
      svg.innerHTML = toastGlyphs[tone];
      li.append(svg);
      li.append(message + ' ');
      const button = document.createElement('button');
      button.setAttribute('variant', 'ghost');
      button.setAttribute('type', 'button');
      button.textContent = 'Dismiss';
      li.append(button);
      toastRegion.append(li);
      armToast(li);
    };
    const toastTriggers = [
      ['toast-fire-success', 'success', 'Lead delivered — Garcia, panel upgrade'],
      ['toast-fire-warning', 'warning', 'Crew running late — traffic on the 55'],
      ['toast-fire-danger', 'danger', 'Payment failed — retry scheduled'],
    ];
    toastTriggers.forEach(([id, tone, message]) => {
      const trigger = document.querySelector('#' + id);
      if (trigger) trigger.addEventListener('click', () => fireToast(tone, message));
    });
  }

  // Email revalidation: the error clears as soon as the value parses,
  // and returns when it stops parsing.
  // ---- The quote form: a failed submit surfaces the summary, typing
  // a valid email clears the field error live, a good submit confirms.
  const quoteForm = document.querySelector('#quote-form form');
  if (quoteForm) {
    const summary = quoteForm.querySelector('aside');
    const emailInput = quoteForm.querySelector('#quote-email');
    let errorNote = null;
    const ensureErrorNote = () => {
      if (!errorNote) {
        errorNote = document.createElement('small');
        errorNote.textContent = 'Enter a valid email address.';
        emailInput.after(errorNote);
      }
      return errorNote;
    };
    const sent = document.querySelector('#quote-sent');
    const validEmail = (value) => {
      const parts = value.split('@');
      return parts.length === 2 && parts[0] !== '' && parts[1].includes('.') && !value.includes(' ');
    };
    const showFieldError = () => {
      emailInput.setAttribute('aria-invalid', 'true');
      ensureErrorNote().hidden = false;
    };
    const clearFieldError = () => {
      emailInput.removeAttribute('aria-invalid');
      if (errorNote) errorNote.hidden = true;
    };
    const showError = () => {
      showFieldError();
      if (summary) summary.hidden = false;
    };
    const clearError = () => {
      emailInput.removeAttribute('aria-invalid');
      if (errorNote) errorNote.hidden = true;
      if (summary) summary.hidden = true;
    };
    clearError();
    const validateLive = () => {
      if (validEmail(emailInput.value)) { clearError(); return; }
      if (emailInput.value !== '') showFieldError(); else clearFieldError();
    };
    emailInput.addEventListener('input', validateLive);
    emailInput.addEventListener('blur', validateLive);
    const attemptSubmit = () => {
      if (!validEmail(emailInput.value)) {
        showError();
        emailInput.focus();
        return;
      }
      clearError();
      if (sent) sent.hidden = false;
    };
    quoteForm.addEventListener('submit', (event) => {
      event.preventDefault();
      attemptSubmit();
    });
    quoteForm.querySelectorAll('footer button').forEach((button) => {
      if (button.textContent.trim() === 'Request quote') {
        button.addEventListener('click', attemptSubmit);
      } else {
        button.addEventListener('click', () => {
          quoteForm.querySelectorAll('input').forEach((input) => { input.value = ''; });
          clearError();
          if (sent) sent.hidden = true;
        });
      }
    });
  }

  // ---- Search field: submit reports the query, clear reports itself.
  const search = document.querySelector('search[variant="default"]');
  if (search) {
    const input = search.querySelector('input');
    const clearButton = [...search.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Clear');
    const status = document.querySelector('#search-status');
    const report = (text) => { if (status) status.textContent = text; };
    const runSearch = () => report(input.value ? 'Showing leads matching \u201c' + input.value + '\u201d.' : 'Showing every lead.');
    input.addEventListener('input', () => {
      if (clearButton) clearButton.hidden = input.value === '';
    });
    input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') { event.preventDefault(); runSearch(); }
    });
    search.querySelectorAll('button').forEach((button) => {
      if (button.textContent.trim() === 'Search') button.addEventListener('click', runSearch);
    });
    if (clearButton) {
      clearButton.addEventListener('click', () => {
        input.value = '';
        clearButton.hidden = true;
        report('Showing every lead.');
        input.focus();
      });
    }
  }

  // ---- Dialogs and the drawer: their buttons close them, and a
  // reopen button appears in their place.
  const closables = [
    { dialog: document.querySelector('dialog[variant="default"]'), reopen: document.querySelector('#reopen-archive') },
    { dialog: document.querySelector('dialog[variant="destructive"]'), reopen: document.querySelector('#reopen-delete') },
    { dialog: document.querySelector('dialog[variant="drawer"]'), reopen: document.querySelector('#reopen-drawer') },
  ];
  closables.forEach(({ dialog, reopen }) => {
    if (!dialog) return;
    dialog.querySelectorAll('button').forEach((button) => {
      button.addEventListener('click', () => {
        dialog.removeAttribute('open');
        if (reopen) reopen.hidden = false;
      });
    });
    if (reopen) {
      reopen.addEventListener('click', () => {
        dialog.setAttribute('open', '');
        reopen.hidden = true;
      });
    }
  });

  // ---- Command palette: typing filters its options, group by group.
  const paletteSearch = document.querySelector('#palette-search');
  if (paletteSearch) {
    const palette = paletteSearch.closest('dialog');
    paletteSearch.addEventListener('input', () => {
      const query = paletteSearch.value.trim().toLowerCase();
      palette.querySelectorAll('li[role="group"]').forEach((group) => {
        let anyVisible = false;
        group.querySelectorAll('li[role="option"]').forEach((option) => {
          const matches = option.textContent.toLowerCase().includes(query);
          option.hidden = !matches;
          if (matches) anyVisible = true;
        });
        group.hidden = !anyVisible;
      });
    });
  }

  // ---- Combobox: closed until the field is used; typing filters,
  // choosing closes, Escape and an outside click close.
  const county = document.querySelector('#county');
  if (county) {
    const combo = county.closest('section');
    const comboList = combo.querySelector('ul[role="listbox"]');
    const options = [...combo.querySelectorAll('li[role="option"]')];
    const setComboOpen = (openState) => {
      comboList.hidden = !openState;
      county.setAttribute('aria-expanded', openState ? 'true' : 'false');
    };
    const filterCombo = () => {
      const query = county.value.trim().toLowerCase();
      options.forEach((option) => {
        option.hidden = !option.textContent.toLowerCase().includes(query);
      });
    };
    let comboEscaped = false;
    setComboOpen(false);
    county.addEventListener('focus', () => { setComboOpen(true); filterCombo(); });
    county.addEventListener('click', () => { setComboOpen(true); filterCombo(); });
    county.addEventListener('input', () => {
      if (comboEscaped) { comboEscaped = false; filterCombo(); return; }
      setComboOpen(true); filterCombo();
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && !comboList.hidden) { comboEscaped = true; setComboOpen(false); }
    });
    document.addEventListener('pointerdown', (event) => {
      if (!combo.contains(event.target)) setComboOpen(false);
    });
    options.forEach((option) => {
      option.addEventListener('click', () => {
        county.value = option.textContent.trim();
        options.forEach((other) => other.setAttribute('aria-selected', 'false'));
        option.setAttribute('aria-selected', 'true');
        options.forEach((other) => { other.hidden = false; });
        setComboOpen(false);
      });
    });
  }

  // ---- Multiselect: closed until the field is used; typing
  // filters, clicking an option toggles its chip and the list stays
  // open, Escape and an outside click close.
  const multi = document.querySelector('section[variant="multiselect"]');
  if (multi) {
    const multiInput = multi.querySelector('input');
    const multiList = multi.querySelector('ul[role="listbox"]');
    const multiOptions = [...multi.querySelectorAll('li[role="option"]')];
    const chips = multi.querySelector('ul:not([role])');
    const setMultiOpen = (openState) => {
      multiList.hidden = !openState;
      multiInput.setAttribute('aria-expanded', openState ? 'true' : 'false');
    };
    const chipLabel = (li) => li.textContent.replace('Remove', '').trim();
    const wireChip = (li) => {
      const button = li.querySelector('button');
      if (button) button.addEventListener('click', () => {
        const label = chipLabel(li);
        li.remove();
        multiOptions.forEach((option) => {
          if (option.textContent.trim() === label) option.setAttribute('aria-selected', 'false');
        });
      });
    };
    chips.querySelectorAll('li').forEach(wireChip);
    const filterMulti = () => {
      const query = multiInput.value.trim().toLowerCase();
      multiOptions.forEach((option) => {
        option.hidden = !option.textContent.toLowerCase().includes(query);
      });
    };
    let multiEscaped = false;
    setMultiOpen(false);
    multiInput.addEventListener('focus', () => setMultiOpen(true));
    multiInput.addEventListener('click', () => setMultiOpen(true));
    multiInput.addEventListener('input', () => {
      if (multiEscaped) { multiEscaped = false; filterMulti(); return; }
      setMultiOpen(true);
      filterMulti();
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && !multiList.hidden) { multiEscaped = true; setMultiOpen(false); }
    });
    document.addEventListener('pointerdown', (event) => {
      if (!multi.contains(event.target)) setMultiOpen(false);
    });
    multiOptions.forEach((option) => {
      option.addEventListener('click', () => {
        const label = option.textContent.trim();
        if (option.getAttribute('aria-selected') === 'true') {
          option.setAttribute('aria-selected', 'false');
          [...chips.querySelectorAll('li')].forEach((li) => {
            if (chipLabel(li) === label) li.remove();
          });
          return;
        }
        option.setAttribute('aria-selected', 'true');
        const li = document.createElement('li');
        li.append(label + ' ');
        const button = document.createElement('button');
        button.setAttribute('variant', 'ghost');
        button.setAttribute('type', 'button');
        button.textContent = 'Remove';
        li.append(button);
        wireChip(li);
        chips.append(li);
      });
    });
  }

  // ---- Datagrid: select-all and the row boxes keep each other
  // true (some selected reads indeterminate), and the sort button
  // sorts, flipping aria-sort as it goes.
  const grid = document.querySelector('table[variant="datagrid"]');
  if (grid) {
    const headBox = grid.querySelector('thead input[type="checkbox"]');
    const rowBoxes = [...grid.querySelectorAll('tbody input[type="checkbox"]')];
    const syncHead = () => {
      const n = rowBoxes.filter((b) => b.checked).length;
      headBox.checked = n > 0 && n === rowBoxes.length;
      headBox.indeterminate = n > 0 && n < rowBoxes.length;
    };
    if (headBox) {
      headBox.addEventListener('change', () => {
        rowBoxes.forEach((b) => { b.checked = headBox.checked; });
        syncHead();
      });
      rowBoxes.forEach((b) => b.addEventListener('change', syncHead));
    }
    grid.querySelectorAll('thead th[aria-sort]').forEach((th) => {
      th.addEventListener('click', () => {
        const idx = [...th.parentElement.children].indexOf(th);
        const next = th.getAttribute('aria-sort') === 'ascending' ? 'descending' : 'ascending';
        th.setAttribute('aria-sort', next);
        const tbody = grid.querySelector('tbody');
        const rows = [...tbody.querySelectorAll('tr')];
        rows.sort((a, b) => {
          const x = a.children[idx].textContent.trim();
          const y = b.children[idx].textContent.trim();
          return next === 'ascending' ? x.localeCompare(y) : y.localeCompare(x);
        });
        rows.forEach((r) => tbody.append(r));
      });
    });
  }

  // ---- Tree: the branch toggle folds its group away.
  const branch = document.querySelector('li[aria-expanded]');
  if (branch) {
    const toggle = branch.querySelector('button');
    const group = branch.querySelector('ul[role="group"]');
    toggle.addEventListener('click', () => {
      const expanded = branch.getAttribute('aria-expanded') === 'true';
      branch.setAttribute('aria-expanded', String(!expanded));
      group.hidden = expanded;
    });
  }

  // ---- Pagination: clicking a page number moves the current mark.
  const pager = document.querySelector('nav[variant="pagination"]');
  if (pager) {
    pager.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', (event) => {
        event.preventDefault();
        const label = link.textContent.trim();
        if (label === '' || Number.isNaN(Number(label))) return;
        const current = pager.querySelector('a[aria-current="page"]');
        if (current && current !== link) {
          current.removeAttribute('aria-current');
          current.setAttribute('href', '#');
        }
        link.setAttribute('aria-current', 'page');
        link.removeAttribute('href');
      });
    });
  }

  // ---- Stepper: Back and Continue move the current step.
  const stepper = document.querySelector('ol[variant="stepper"]');
  if (stepper) {
    const items = [...stepper.querySelectorAll('li')];
    const back = document.querySelector('#step-back');
    const next = document.querySelector('#step-next');
    const states = ['complete', 'current', 'upcoming'];
    const renderStepper = () => {
      const currentIndex = items.findIndex((li) => li.getAttribute('variant') === 'current');
      if (back) back.disabled = currentIndex <= 0;
      if (next) next.disabled = currentIndex >= items.length - 1;
    };
    const move = (delta) => {
      const currentIndex = items.findIndex((li) => li.getAttribute('variant') === 'current');
      const target = currentIndex + delta;
      if (target < 0 || target >= items.length) return;
      items.forEach((li, index) => {
        li.setAttribute('variant', states[index < target ? 0 : index === target ? 1 : 2]);
        if (index === target) li.setAttribute('aria-current', 'step');
        else li.removeAttribute('aria-current');
      });
      renderStepper();
    };
    if (back) back.addEventListener('click', () => move(-1));
    if (next) next.addEventListener('click', () => move(1));
    renderStepper();
  }

  // ---- Segmented control: switches the calendar between its views.
  const calView = document.querySelector('fieldset[variant="segmented-control"]');
  if (calView) {
    const month = document.querySelector('section[variant="month"]');
    const schedule = document.querySelector('section[variant="schedule"]');
    const applyView = (value) => {
      if (month) month.hidden = value !== 'month';
      if (schedule) schedule.hidden = value !== 'schedule';
    };
    calView.querySelectorAll('input').forEach((input) => {
      input.addEventListener('change', () => applyView(input.value));
    });
    applyView('month');
  }

  // ---- Tabs: clicking a tab selects it and shows its panel.
  document.querySelectorAll('section[variant="tabs"]').forEach((tabsRoot) => {
    const tabButtons = [...tabsRoot.querySelectorAll('button[role="tab"]')];
    tabButtons.forEach((button) => {
      button.addEventListener('click', () => {
        tabButtons.forEach((other) => other.setAttribute('aria-selected', 'false'));
        button.setAttribute('aria-selected', 'true');
        tabsRoot.querySelectorAll('article[role="tabpanel"]').forEach((panel) => {
          panel.hidden = panel.id !== button.getAttribute('aria-controls');
        });
      });
    });
  });

  // ---- Toolbar: More opens and closes the overflow menu, and
  // choosing an item closes it.
  const toolbar = document.querySelector('section[variant="toolbar"]');
  if (toolbar) {
    const more = [...toolbar.querySelectorAll('button')].find((b) => b.textContent.trim() === 'More');
    const menu = toolbar.querySelector('menu');
    if (more && menu) {
      more.setAttribute('aria-expanded', 'false');
      more.addEventListener('click', () => {
        const open = menu.hidden;
        menu.hidden = !open;
        more.setAttribute('aria-expanded', String(open));
      });
      menu.querySelectorAll('a, button').forEach((item) => {
        item.addEventListener('click', () => {
          menu.hidden = true;
          more.setAttribute('aria-expanded', 'false');
        });
      });
    }
  }

  // ---- Empty state: its action goes to the quote form.
  const emptyAction = document.querySelector('#empty-action');
  if (emptyAction) {
    emptyAction.addEventListener('click', () => {
      const formSection = document.querySelector('#quote-form');
      formSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      const firstInput = formSection.querySelector('input');
      if (firstInput) firstInput.focus({ preventScroll: true });
    });
  }

  // ---- Select popover: the trigger toggles its listbox, an option
  // click chooses it, Escape closes it.
  const tradeButton = document.querySelector('#trade');
  if (tradeButton) {
    const tradeSection = tradeButton.closest('section');
    const tradeList = tradeSection.querySelector('ul');
    const setTradeOpen = (isOpen) => {
      tradeList.hidden = !isOpen;
      tradeButton.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    };
    setTradeOpen(false);
    tradeButton.addEventListener('click', () => setTradeOpen(tradeList.hidden));
    tradeList.querySelectorAll('li').forEach((li) => {
      li.addEventListener('click', () => {
        tradeList.querySelectorAll('li').forEach((o) => o.setAttribute('aria-selected', o === li ? 'true' : 'false'));
        const labelNode = [...tradeButton.childNodes].find((n) => n.nodeType === 3 && n.textContent.trim() !== '');
        if (labelNode) labelNode.textContent = li.textContent;
        setTradeOpen(false);
      });
    });
    document.addEventListener('keydown', (event) => { if (event.key === 'Escape') setTradeOpen(false); });
    document.addEventListener('pointerdown', (event) => { if (!tradeSection.contains(event.target)) setTradeOpen(false); });
  }
</script>
</body>
</html>
`;

const output = process.argv[2] ?? new URL('./trinity-proof.html', import.meta.url);
await writeFile(output, highlightCodeBlocks(page));
console.log(`proof written to ${output}`);
