/**
 * The Holy Trinity catalog as the site presents it: categories and copy
 * for every component registered in @basenative/components, plus the
 * live specimens each component page and the showcase render. The facts
 * (names, roots, variants, the three files) come from the registry via
 * trinity.js — this file carries only what the registry does not: the
 * words, the grouping, and the demos.
 *
 * A demo is a function of the render helpers, so specimens compose the
 * way an app composes them — a field around an input, cards inside a
 * choice group, buttons inside a hero.
 */

export const trinityCategories = [
  { id: 'inputs', title: 'Form Controls', summary: 'Choice and entry primitives over native form elements — one behavior whether the substrate is a button, a radio, or a card.' },
  { id: 'feedback', title: 'Feedback', summary: 'Status surfaces: alerts, progress, badges, toasts, and the empty state.' },
  { id: 'content', title: 'Content', summary: 'Cards, tables, trees, calendars, and boards — data presented in semantic structures.' },
  { id: 'navigation', title: 'Navigation', summary: 'Wayfinding: breadcrumbs, pagination, grouped lists, toolbars, and the theme toggle.' },
  { id: 'overlays', title: 'Overlays', summary: 'Dialogs, drawers, menus, the command palette, and tooltips — floating surfaces with native semantics.' },
  { id: 'chrome', title: 'Site Chrome', summary: 'The frame of a whole site or app: hero, sidebar, app bar, app shell, and site footer.' },
];

const C = (title, category, summary, usage) => ({ title, category, summary, usage });

export const trinityCopy = {
  button: C('Button', 'inputs', 'The one action primitive — a native button, or a link carrying the variant when it navigates.', "create({ label: 'Save', variant: 'primary' })"),
  input: C('Input', 'inputs', 'A native input whose bindings write the DOM property — value, checked, and friends are state, not attributes.', "create({ id: 'email', type: 'email', value: '' })"),
  field: C('Field', 'inputs', 'A label, a control, and its hint — the hint swaps for the error, and only the field reports it.', "create({ label: 'Email', controlId: 'email', controlHtml, hint: '…' })"),
  textarea: C('Textarea', 'inputs', 'A native textarea that sizes to its content.', "create({ id: 'notes', value: '' })"),
  select: C('Select', 'inputs', 'A select that renders as a positioned popover by default; the native control is the variant, not the other way around.', "create({ id: 'county', options })"),
  checkbox: C('Checkbox', 'inputs', 'Choice behavior over a native checkbox — the same telemetry shape as every choice in the catalog.', "create({ label: 'Surge protection', name: 'addon', value: 'surge' })"),
  radio: C('Radio', 'inputs', 'Choice behavior over native radios in a fieldset, with a real legend.', "create({ legend: 'Plan', name: 'plan', options })"),
  toggle: C('Toggle', 'inputs', 'A switch with role="switch" over the same choice behavior.', "create({ label: 'Email notifications', name: 'notify' })"),
  combobox: C('Combobox', 'inputs', 'A text field with a listbox: filtering is a pure function of the field text — there is no second, committed state.', "create({ id: 'county', label: 'County', inputHtml, options })"),
  multiselect: C('Multiselect', 'inputs', 'The combobox popup with a set of selections, carried as dismissible chips.', "create({ id: 'trades', label: 'Trades', inputHtml, options })"),
  'search-field': C('Search Field', 'inputs', 'A labelled search input with its submit, composed for toolbars and list heads.', "create({ label: 'Search leads', controlId: 'q', name: 'q', submitHtml })"),
  form: C('Form', 'inputs', 'A form that validates as a whole: invalid fields are reported by their fields, never by a banner alone.', "create({ name: 'quote', heading: 'Request a quote', fieldsHtml, actionsHtml })"),
  'choice-group': C('Choice Group', 'inputs', 'Choose-one (or several) over any substrate — cards, rows, buttons — with one telemetry event shape.', "create({ legend: 'Pick a plan', name: 'plan', options })"),
  'segmented-control': C('Segmented Control', 'inputs', 'A radio group presented as segments — the iOS view switcher, with radio semantics intact.', "create({ legend: 'View', name: 'view', options })"),
  stepper: C('Stepper', 'inputs', 'A progress rail for a linear sequence — each step complete, current, or upcoming, the current step carrying aria-current. The view model moves the position and reports one event per move.', "create({ name: 'job-flow', current: 'confirm', steps })"),
  rating: C('Rating', 'inputs', 'A star rating over radios — the lit range is pure CSS off the checked step.', "create({ legend: 'Rate this job', name: 'rating', starHtml, value: 4 })"),
  alert: C('Alert', 'feedback', 'An inline status box whose ARIA role follows its variant — status for information, alert for danger.', "create({ title: 'Check the form', body: '…', variant: 'danger' })"),
  progress: C('Progress', 'feedback', 'A native progress element, determinate or indeterminate.', "create({ value: 60 })"),
  badge: C('Badge', 'feedback', 'A compact status pill — a small element carrying its tone as a variant.', "create({ label: 'Paid', variant: 'success' })"),
  toast: C('Toast', 'feedback', 'A stack of status messages, toned by an SVG glyph and color — meaning never rides color alone.', "create({ items: [{ message: 'Lead delivered', tone: 'success', dismissHtml }] })"),
  'empty-state': C('Empty State', 'feedback', 'The nothing-here-yet surface: media, a title, a body, and one way forward.', "create({ title: 'No leads yet', body: '…', actionHtml })"),
  'code-block': C('Code Block', 'content', 'A figure for code: the caption is the header bar — a file name or language, plus any caller-rendered actions — and the body is the code itself in a pre, interpolated and escaped like any other text. Highlighting belongs to the reader’s pipeline, never to the component.', "create({ code: '…', caption: 'counter.js' })"),
  card: C('Card', 'content', 'An article with header, body, and footer — and the substrate choice groups select over.', "create({ title: 'Panel upgrade', body: '…', footerHtml })"),
  avatar: C('Avatar', 'content', 'A figure that shows an image, or the initials where the image would be.', "create({ initials: 'WD', variant: 'tone-0' })"),
  accordion: C('Accordion', 'content', 'Native details and summary — disclosure the platform already knows how to run.', "create({ summary: 'What does a lead cost?', bodyHtml: '<p>…</p>', open: true })"),
  tabs: C('Tabs', 'content', 'A tablist with real tab semantics; the panels are the page’s own sections.', "create({ label: 'Job', tabs })"),
  table: C('Table', 'content', 'A real table — caption, column headers, row headers — that reflows instead of clipping on a phone.', "create({ caption: 'Delivered leads', columns, rows })"),
  datagrid: C('Data Grid', 'content', 'A table with selection and sortable headers, composed from the catalog’s own checkbox and button.', "create({ columns, rows, selectable: true })"),
  tree: C('Tree', 'content', 'A hierarchical list with disclosure toggles — services, settings, file systems.', "create({ items: [{ label: 'Services', childrenHtml }] })"),
  virtualizer: C('Virtualizer', 'content', 'A windowed list: ten thousand rows, a viewport’s worth of DOM.', "create({ id: 'leads', total: 100, rowHeight: 44, labelFor })"),
  calendar: C('Calendar', 'content', 'A month grid or a schedule, over a real table — today and selection are cell states, not decorations.', "create({ year: 2026, month: 10, today: '2026-10-24', bodyHtml })"),
  pipeline: C('Pipeline', 'content', 'A board of columns and cards — quoted, scheduled, paid — as nested lists.', "create({ columns: [{ title: 'Quoted', cardsHtml }] })"),
  breadcrumb: C('Breadcrumb', 'navigation', 'An ordered trail in a nav; the last item is the current page and says so.', "create({ items: [{ label: 'Home', href: '/' }, { label: 'Catalog' }] })"),
  pagination: C('Pagination', 'navigation', 'Previous, pages, and next — with the current page marked, not just styled.', "create({ page: 3, pages: 8 })"),
  'list-group': C('List Group', 'navigation', 'A list of rows, each a label or composed content with an optional trailing element.', "create({ items: [{ label: 'Plan', trailingHtml }] })"),
  toolbar: C('Toolbar', 'navigation', 'A labelled bar of actions with the overflow pattern: what does not fit rides behind More, in a menu.', "create({ label: 'Lead actions', actionsHtml, overflowHtml })"),
  'theme-toggle': C('Theme Toggle', 'navigation', 'System, light, and dark as a segmented choice over one document attribute.', 'create({})'),
  dialog: C('Dialog', 'overlays', 'A native dialog — the platform owns its focus, its backdrop, and its dismissal.', "create({ title: 'Archive this job?', body: '…', footerHtml })"),
  drawer: C('Drawer', 'overlays', 'The dialog skeleton at the edge of the screen — a detail panel that slides over the list.', "create({ title: 'Garcia — panel upgrade', body: '…', footerHtml })"),
  'dropdown-menu': C('Dropdown Menu', 'overlays', 'A button and its menu of actions or links, with separators as first-class items.', "create({ label: 'Lead actions', items })"),
  'command-palette': C('Command Palette', 'overlays', 'A dialog with a search field and grouped options — the keyboard-first index of everything.', "create({ id: 'palette', label: 'Command palette', searchHtml, groups })"),
  tooltip: C('Tooltip', 'overlays', 'A hint tied to its invoker — supplementary text, never the only place meaning lives.', "create({ text: 'Delivered into the schedule', invokerHtml })"),
  hero: C('Hero', 'chrome', 'A figure: the media is the content, the eyebrow, title, lede, and actions are its figcaption. Stacked, split, or riding the media on glass.', "create({ eyebrow: 'Compare', title: '…', lede: '…', actionsHtml })"),
  sidebar: C('Sidebar', 'chrome', 'The desktop form of a destination set: grouped sections in an aside, the current destination marked with aria-current.', "create({ label: 'Sections', sections })"),
  'app-bar': C('App Bar', 'chrome', 'The phone form of the same destinations: a glass bar on the bottom edge, the overflow behind a More popover.', "create({ items, barLimit: 4 })"),
  'app-shell': C('App Shell', 'chrome', 'The page frame, composed: a sidebar, the one main, and an app bar — it owns the layout between them, nothing else.', "create({ sidebarHtml, appBarHtml, contentHtml, mainId: 'main-content' })"),
  'site-footer': C('Site Footer', 'chrome', 'The page’s one contentinfo: grouped link columns, each a labelled nav, and an optional closing note.', "create({ groups, noteHtml })"),
};

const D = (title, html, note) => ({ title, html, ...(note ? { note } : {}) });

/**
 * Demo factories take (renderTrinity, renderTrinityVm, live). A demo
 * whose behaviour the site boot drives — the popovers and the
 * virtualizer, whose closed/resting markup does not carry their data —
 * calls live(spec) with the very props it renders from, and the page
 * ships those specs to public/specimens.js as JSON. One source: the
 * props a specimen renders with are the props its behaviour runs on.
 */
export const trinityDemos = {
  button: (r) => [
    D('Variants', [
      r('button', { label: 'Save draft' }),
      r('button', { label: 'Publish', variant: 'primary' }),
      r('button', { label: 'Cancel', variant: 'ghost' }),
      r('button', { label: 'Delete', variant: 'destructive' }),
      r('button', { label: 'Working', variant: 'primary', disabled: true }),
    ].join('\n')),
    D('The link form', r('button', { label: 'Read the docs', variant: 'primary', href: '#' }),
      'With an href, the same component renders a link carrying the variant — navigation is not a second component.'),
  ],
  input: (r) => [
    D('Email', r('input', { id: 'demo-email', type: 'email', value: '' })),
    D('Search', r('input', { id: 'demo-search', type: 'search', value: 'panel', ariaLabel: 'Search' })),
  ],
  field: (r) => [
    D('With a hint', r('field', {
      label: 'Email', controlId: 'demo-field-email',
      controlHtml: r('input', { id: 'demo-field-email', type: 'email', value: '' }),
      hint: 'We only email about your jobs.',
    })),
    D('With an error', r('field', {
      label: 'Email', controlId: 'demo-field-email2',
      controlHtml: r('input', { id: 'demo-field-email2', type: 'email', value: 'not-an-email', invalid: true }),
      hint: 'We only email about your jobs.', error: 'Enter a valid email address.',
    }), 'The hint swaps for the error; the field, not a banner, reports it.'),
  ],
  textarea: (r) => [
    D('Notes', r('textarea', { id: 'demo-notes', rows: 3, value: 'Gate code 4211. Dog on site.' })),
  ],
  select: (r, _vm, live) => {
    const options = [
      { value: 'electrical', label: 'Electrical' },
      { value: 'plumbing', label: 'Plumbing' },
      { value: 'hvac', label: 'HVAC' },
    ];
    // The popover composes closed — its rest state. The site boot
    // (public/specimens.js) opens it on demand from this live spec.
    live?.({ kind: 'select', id: 'demo-trade', label: 'Trade', value: 'hvac', options });
    return [
    D('Trade, popover', r('field', {
      label: 'Trade', controlId: 'demo-trade',
      controlHtml: r('select', {
        id: 'demo-trade', value: 'hvac', label: 'Trade',
        options,
      }),
      hint: 'The trade decides which pricing engine runs.',
    })),
    D('The native variant', r('field', {
      label: 'Trade (native)', controlId: 'demo-trade-native',
      controlHtml: r('select', {
        id: 'demo-trade-native', value: 'hvac', variant: 'native',
        options,
      }),
      hint: 'The native variant keeps the platform element, its menu, and native form submission.',
    }), 'A positioned popover by default; the native control is the variant, not the other way around.'),
    ];
  },
  checkbox: (r) => [
    D('Add-ons', [
      r('checkbox', { label: 'Permit handling', name: 'demo-addon', value: 'permit', checked: true }),
      r('checkbox', { label: 'Surge protection', name: 'demo-addon', value: 'surge' }),
    ].join('\n')),
  ],
  radio: (r) => [
    D('Plan', r('radio', {
      legend: 'Plan', name: 'demo-plan', value: 'schedule',
      options: [
        { value: 'leads', label: 'Pay per delivered lead' },
        { value: 'schedule', label: 'Leads + schedule management' },
      ],
    })),
  ],
  toggle: (r) => [
    D('Notifications', [
      r('toggle', { label: 'Email notifications', name: 'demo-notify', checked: true }),
      r('toggle', { label: 'Text notifications', name: 'demo-text' }),
    ].join('\n')),
  ],
  combobox: (r, _vm, live) => {
    const options = [
      { value: 'orange', label: 'Orange County' },
      { value: 'la', label: 'Los Angeles' },
      { value: 'riverside', label: 'Riverside' },
    ];
    // Composes closed — the popup's rest state. specimens.js opens it
    // on focus from this live spec and filters purely by the field text.
    live?.({ kind: 'combobox', id: 'demo-combo', label: 'County', options });
    return [
    D('County', r('combobox', {
      id: 'demo-combo', label: 'County',
      inputHtml: r('input', { id: 'demo-combo', type: 'search', value: 'Orange County', ariaLabel: 'County' }),
      options,
    })),
    ];
  },
  multiselect: (r, _vm, live) => {
    const options = [
      { value: 'ev', label: 'EV charging' },
      { value: 'panel', label: 'Panel upgrade' },
      { value: 'lighting', label: 'Lighting' },
    ];
    // Composes closed, one chip already chosen. specimens.js drives
    // the popup and the chip set from this live spec.
    live?.({ kind: 'multiselect', id: 'demo-trades', label: 'Trades', options, selected: ['ev'] });
    return [
    D('Trades', r('multiselect', {
      id: 'demo-trades', label: 'Trades',
      inputHtml: r('input', { id: 'demo-trades', type: 'search', value: '', ariaLabel: 'Trades' }),
      selected: [{ value: 'ev', label: 'EV charging', dismissHtml: r('button', { label: 'Remove', variant: 'ghost' }) }],
      options,
    })),
    ];
  },
  'search-field': (r) => [
    D('Search leads', r('search-field', {
      label: 'Search leads', controlId: 'demo-lead-q', name: 'lead-search', value: 'panel',
      submitHtml: r('button', { label: 'Search', variant: 'primary' }),
    })),
  ],
  form: (r) => [
    D('Request a quote', r('form', {
      name: 'demo-quote', heading: 'Request a quote',
      fieldsHtml:
        r('field', { label: 'Name', controlId: 'demo-q-name', controlHtml: r('input', { id: 'demo-q-name', value: '' }), hint: 'Whoever the crew should ask for on site.' }) +
        r('field', { label: 'Email', controlId: 'demo-q-email', controlHtml: r('input', { id: 'demo-q-email', type: 'email', value: '' }), hint: 'We send the exact quote here.' }),
      actionsHtml: r('button', { label: 'Cancel', variant: 'ghost' }) + r('button', { label: 'Request quote', variant: 'primary' }),
    })),
  ],
  'choice-group': (r) => [
    D('Pick a plan', r('choice-group', {
      legend: 'Pick a plan', name: 'demo-cg-plan', value: 'schedule',
      options: [
        { value: 'leads', contentHtml: r('card', { title: 'Pay per delivered lead', body: 'One flat price per lead delivered into your schedule. No subscription, no tiers.' }) },
        { value: 'schedule', contentHtml: r('card', { title: 'Leads + schedule management', body: 'Auto-booking inside your availability windows, with instant notification and undo.' }) },
        { value: 'platform', contentHtml: r('card', { title: 'Full platform', body: 'Every job from first click to payment.' }) },
      ],
    }), 'Cards as the substrate — the choice behavior is identical over rows, buttons, or cards.'),
  ],
  'segmented-control': (r) => [
    D('Calendar view', r('segmented-control', {
      legend: 'Calendar view', name: 'demo-cal-view', value: 'month',
      options: [
        { value: 'month', label: 'Month' },
        { value: 'schedule', label: 'Schedule' },
      ],
    })),
  ],
  stepper: (r) => [
    D('The job flow', r('stepper', {
      name: 'demo-job-flow', current: 'confirm',
      steps: [
        { value: 'quote', label: 'Quote', detail: 'Exact price up front' },
        { value: 'confirm', label: 'Confirm', detail: 'Both ends confirm' },
        { value: 'schedule', label: 'Schedule', detail: 'In your windows' },
        { value: 'pay', label: 'Pay', detail: 'When the job is done' },
      ],
    })),
  ],
  rating: (r) => [
    D('Rate this job', r('rating', {
      legend: 'Rate this job', name: 'demo-rating', value: 4,
      starHtml: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2l2.9 6.6 7.1.6-5.4 4.7 1.6 7-6.2-3.7-6.2 3.7 1.6-7L2 9.2l7.1-.6z"/></svg>',
    })),
  ],
  alert: (r) => [
    D('Tones', [
      r('alert', { title: 'Schedule updated', body: 'Two crews are out today; afternoon windows shifted by an hour.', dismissHtml: r('button', { label: 'Dismiss', variant: 'ghost' }) }),
      r('alert', { title: 'Payment failed', body: 'The card on file was declined. Ask the customer for another method.', variant: 'danger', dismissHtml: r('button', { label: 'Dismiss', variant: 'ghost' }) }),
    ].join('\n')),
  ],
  progress: (r) => [
    D('Upload, 60%', r('progress', { value: 60 })),
    D('Indeterminate', r('progress', {})),
  ],
  badge: (r) => [
    D('Tones', [
      r('badge', { label: 'Paid', variant: 'success' }),
      r('badge', { label: 'Beta', variant: 'info' }),
      r('badge', { label: 'Overdue', variant: 'danger' }),
      r('badge', { label: '12 delivered', variant: 'success' }),
    ].join('\n')),
  ],
  toast: (r) => [
    D('Stack', r('toast', {
      items: [
        { message: 'Lead delivered — Garcia, panel upgrade', tone: 'success', dismissHtml: r('button', { label: 'Dismiss', variant: 'ghost' }) },
        { message: 'Payment failed — retry scheduled', tone: 'danger', dismissHtml: r('button', { label: 'Dismiss', variant: 'ghost' }) },
      ],
    })),
  ],
  'empty-state': (r) => [
    D('No leads yet', r('empty-state', {
      title: 'No leads yet',
      body: 'Delivered leads land here — priced flat per service, tracked from quote to payment.',
      mediaHtml: r('avatar', { initials: 'GP' }),
      actionHtml: r('button', { label: 'Open the quote form', variant: 'primary' }),
    })),
  ],
  card: (r) => [
    D('Job card', r('card', {
      title: 'Panel upgrade — 200A service',
      body: 'Permit pulled. Materials on site. Progress is tracked against the quote.',
      footerHtml: r('button', { label: 'Open job', variant: 'primary' }),
    })),
  ],
  avatar: (r) => [
    D('Initials and tones', [
      r('avatar', { initials: 'WD', variant: 'tone-0' }),
      r('avatar', { initials: 'OS', variant: 'tone-1' }),
      r('avatar', { initials: 'KC', variant: 'tone-3' }),
      r('avatar', { initials: 'GP', variant: 'default' }),
    ].join('\n')),
  ],
  accordion: (r) => [
    D('Questions', [
      r('accordion', { summary: 'What does a delivered lead cost?', bodyHtml: '<p>One flat price per service, the same whatever source the lead came from.</p>', open: true }),
      r('accordion', { summary: 'When is the fee charged?', bodyHtml: '<p>When the lead is delivered into your schedule — never for a search or a click.</p>' }),
    ].join('\n')),
  ],
  tabs: (r) => [
    D('Job views', r('tabs', {
      id: 'demo-job', label: 'Job views', name: 'demo-job-tabs',
      tabs: [
        { value: 'details', label: 'Details', panelHtml: '<p>Panel upgrade — 200A service. Permit pulled, materials on site, quoted at $2,400 exactly.</p>' },
        { value: 'activity', label: 'Activity', panelHtml: '<p>Quote sent Monday. The customer confirmed in-platform Tuesday; the crew is booked for the 26th.</p>' },
        { value: 'billing', label: 'Billing', panelHtml: '<p>Flat lead fee charged on delivery. The job invoice is issued when the work is done.</p>' },
      ],
    })),
  ],
  table: (r) => [
    D('Delivered leads', r('table', {
      variant: 'striped', caption: 'Delivered leads this week',
      columns: ['Lead', 'Service', 'Fee'],
      rows: [
        [{ text: 'Garcia', header: true }, 'Panel upgrade', '$85'],
        [{ text: 'Nguyen', header: true }, 'EV charger install', '$65'],
        [{ text: 'Patel', header: true }, 'Service call', '$45'],
      ],
    })),
  ],
  datagrid: (r) => [
    D('Selectable, sortable', r('datagrid', {
      selectable: true,
      selectAllHtml: r('checkbox', { label: 'Select all', name: 'demo-grid-all', value: 'all' }),
      columns: [
        { key: 'lead', label: 'Lead', sort: 'ascending', sortHtml: r('button', { label: 'Lead', variant: 'ghost' }) },
        { key: 'fee', label: 'Fee' },
      ],
      rows: [
        { cells: ['Garcia', '$85'], selectHtml: r('checkbox', { label: 'Select Garcia', name: 'demo-grid-sel', value: '1' }) },
        { cells: ['Nguyen', '$65'], selectHtml: r('checkbox', { label: 'Select Nguyen', name: 'demo-grid-sel', value: '2' }) },
      ],
    })),
  ],
  tree: (r) => [
    D('Services', r('tree', {
      items: [
        { label: 'Services', expanded: true, toggleHtml: r('button', { label: 'Services', variant: 'ghost' }), childrenHtml: r('tree', { items: [{ label: 'Panel upgrade' }, { label: 'EV charger' }, { label: 'Lighting' }] }) },
        { label: 'Settings' },
      ],
    })),
  ],
  virtualizer: (r, _vm, live) => {
    // The label is a template so the live spec can rebuild any row the
    // window scrolls to — one source for the server render and the boot.
    const labelTemplate = 'Lead {n} — Orange County';
    live?.({
      kind: 'virtualizer', id: 'demo-leads', total: 100, rowHeight: 44,
      viewportRows: 8, overscan: 2, labelTemplate,
    });
    return [
    D('One hundred leads, eight in the DOM', r('virtualizer', {
      id: 'demo-leads', total: 100, scrollTop: 0, rowHeight: 44, viewportRows: 8, overscan: 2,
      labelFor: (i) => labelTemplate.replace('{n}', String(i + 1)),
    })),
    ];
  },
  calendar: (r, vm) => {
    const month = vm('calendar', { year: 2026, month: 10, today: '2026-10-24', selected: '2026-10-26' });
    const table = r('table', {
      columns: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
      rows: month.viewModel.weeks().map((week) => week.map((day) => ({
        text: String(day.day),
        current: day.isToday ? 'date' : day.isSelected ? 'true' : undefined,
        small: !day.inMonth,
      }))),
    });
    return [
      D('October 2026', r('calendar', {
        year: 2026, month: 10, today: '2026-10-24', selected: '2026-10-26', bodyHtml: table,
        prevHtml: r('button', { label: 'Previous', variant: 'ghost' }),
        nextHtml: r('button', { label: 'Next', variant: 'ghost' }),
      })),
      D('Schedule', r('calendar', {
        year: 2026, month: 10, today: '2026-10-24', variant: 'schedule',
        events: [
          { date: '2026-10-26', title: 'Garcia — panel upgrade', at: '2026-10-26T09:00', timeLabel: '9:00 AM' },
          { date: '2026-10-26', title: 'Nguyen — site survey', at: '2026-10-26T13:00', timeLabel: '1:00 PM' },
          { date: '2026-10-27', title: 'Patel — EV charger', at: '2026-10-27T10:30', timeLabel: '10:30 AM' },
        ],
      })),
    ];
  },
  pipeline: (r) => [
    D('The board', r('pipeline', {
      columns: [
        { title: 'Quoted', cardsHtml: [r('card', { title: 'Garcia', body: 'Panel upgrade — $2,400' })] },
        { title: 'Scheduled', cardsHtml: [r('card', { title: 'Nguyen', body: 'EV charger — Mon 9 AM' })] },
        { title: 'Paid', cardsHtml: [r('card', { title: 'Patel', body: 'Service call — $180' })] },
      ],
    })),
  ],
  breadcrumb: (r) => [
    D('Trail', r('breadcrumb', {
      items: [
        { label: 'Home', href: '#' },
        { label: 'Components', href: '#' },
        { label: 'Catalog' },
      ],
    })),
  ],
  pagination: (r) => [
    D('Page 3 of 8', r('pagination', { page: 3, pages: 8 })),
  ],
  'list-group': (r) => [
    D('Settings', r('list-group', {
      items: [
        { label: 'Email notifications', trailingHtml: r('badge', { label: 'On', variant: 'success' }) },
        { label: 'Plan', trailingHtml: r('badge', { label: 'Beta', variant: 'info' }) },
        { label: 'Jobs this month', trailingHtml: r('badge', { label: '12 delivered', variant: 'success' }) },
      ],
    })),
  ],
  toolbar: (r) => [
    // The overflow composes as the component renders it — no string
    // surgery on the output. specimens.js owns the More toggle.
    D('Lead actions, with overflow', r('toolbar', {
      label: 'Lead actions',
      actionsHtml: r('button', { label: 'New lead', variant: 'primary' }) + r('button', { label: 'Import', variant: 'ghost' }),
      overflowHtml: r('dropdown-menu', { label: 'More lead actions', items: [{ label: 'Export leads' }, { label: 'Archive delivered' }] }),
      overflowOpen: true,
    })),
  ],
  'theme-toggle': (r) => [
    D('Appearance', r('theme-toggle', {}), 'Live — it stamps this document and the token sheet answers.'),
  ],
  dialog: (r) => [
    D('Archive, open', r('dialog', {
      title: 'Archive this job?',
      body: 'Archived jobs leave the board but keep their history.',
      closeHtml: r('button', { label: 'Close', variant: 'ghost' }),
      footerHtml: r('button', { label: 'Cancel', variant: 'ghost' }) + r('button', { label: 'Archive', variant: 'primary' }),
    }).replace('<dialog', '<dialog open')),
    D('Delete, destructive', r('dialog', {
      title: 'Delete this lead?', variant: 'destructive',
      body: 'The destructive variant re-points the dialog tokens by scope — the footer button below is a plain default button.',
      closeHtml: r('button', { label: 'Close', variant: 'ghost' }),
      footerHtml: r('button', { label: 'Cancel', variant: 'ghost' }) + r('button', { label: 'Delete lead' }),
    }).replace('<dialog', '<dialog open')),
  ],
  drawer: (r) => [
    D('Lead detail, open', r('drawer', {
      title: 'Garcia — panel upgrade',
      body: 'Quoted $2,400. Site survey done, permit pulled, awaiting the bilateral confirmation.',
      closeHtml: r('button', { label: 'Close', variant: 'ghost' }),
      footerHtml: r('button', { label: 'Open job', variant: 'primary' }),
    }).replace('<dialog', '<dialog open')),
  ],
  'dropdown-menu': (r) => [
    D('Lead actions', r('dropdown-menu', {
      label: 'Lead actions',
      items: [
        { label: 'Open lead', href: '#' },
        { label: 'Call customer' },
        { separator: true },
        { label: 'Archive' },
      ],
    })),
  ],
  'command-palette': (r) => [
    D('Open', r('command-palette', {
      id: 'demo-palette', label: 'Command palette', activeValue: 'new-lead',
      searchHtml: r('field', {
        label: 'Search commands', controlId: 'demo-palette-search',
        controlHtml: r('input', { id: 'demo-palette-search', type: 'search', value: '', ariaLabel: 'Search commands' }),
      }),
      groups: [
        { heading: 'Leads', options: [{ value: 'new-lead', label: 'New lead' }, { value: 'import', label: 'Import leads' }] },
        { heading: 'Jobs', options: [{ value: 'schedule', label: "Today's schedule" }] },
      ],
    }).replace('<dialog', '<dialog open')),
  ],
  tooltip: (r) => [
    D('On a ghost button', r('tooltip', {
      text: 'Delivered into the schedule',
      invokerHtml: r('button', { label: 'What counts as delivered?', variant: 'ghost' }),
    })),
  ],
  hero: (r) => [
    D('Stacked', r('hero', {
      eyebrow: 'GreenPut',
      title: 'The operating system for trade contractors',
      lede: 'Lead to job to payment in one pipeline — priced flat per delivered lead.',
      actionsHtml: r('button', { label: 'Start a quote', variant: 'primary', href: '#' }) + r('button', { label: 'See how it works', variant: 'ghost', href: '#' }),
    })),
    D('Overlay', r('hero', {
      variant: 'overlay', headingLevel: 'h2',
      title: 'Every job, one pipeline',
      lede: 'The caption rides the media on glass — eyebrow, title, lede and actions are the figcaption.',
      mediaHtml: '<svg viewBox="0 0 800 450" role="img" aria-label="Rooftops at sunset"><defs><linearGradient id="demo-hero-sky2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f7b733"/><stop offset="1" stop-color="#e8920a"/></linearGradient></defs><rect width="800" height="450" fill="url(#demo-hero-sky2)"/><circle cx="620" cy="120" r="52" fill="#fff3d6"/><path d="M0 450 L300 250 L520 450 Z" fill="#3a2c14"/><path d="M380 450 L610 290 L800 450 Z" fill="#2a200e"/></svg>',
      actionsHtml: r('button', { label: 'Start a quote', variant: 'primary' }),
    })),
    D('Split', r('hero', {
      variant: 'split', headingLevel: 'h2', eyebrow: 'Field notes',
      title: 'Quoted right, the first time',
      lede: 'Qualification so complete the quote is effectively the invoice.',
      mediaHtml: '<svg viewBox="0 0 800 450" role="img" aria-label="Rooftops at sunset"><defs><linearGradient id="demo-hero-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f7b733"/><stop offset="1" stop-color="#e8920a"/></linearGradient></defs><rect width="800" height="450" fill="url(#demo-hero-sky)"/><circle cx="620" cy="120" r="52" fill="#fff3d6"/><path d="M0 450 L300 250 L520 450 Z" fill="#3a2c14"/><path d="M380 450 L610 290 L800 450 Z" fill="#2a200e"/></svg>',
    })),
  ],
  sidebar: (r) => [
    D('Grouped destinations', r('sidebar', {
      label: 'Demo sections',
      sections: [
        { label: 'Start', items: [{ label: 'Home', href: '#', current: true }, { label: 'Compare', href: '#' }, { label: 'Docs', href: '#' }] },
        { label: 'Build', items: [{ label: 'Playground', href: '#' }, { label: 'Tasks', href: '#' }] },
      ],
    })),
  ],
  'app-bar': (r) => [
    D('The destinations, phone form', r('app-bar', {
      id: 'demo-tabs', label: 'Demo tabs', barLimit: 4,
      items: [
        { label: 'Home', href: '#' },
        { label: 'Compare', href: '#' },
        { label: 'Components', href: '#', current: true },
        { label: 'Docs', href: '#' },
        { label: 'Tasks', href: '#' },
      ],
    }), 'Staged here in flow — on a narrow screen, this page’s own bottom bar is this component, live.'),
  ],
  'app-shell': (r) => [
    D('The pieces it composes', r('sidebar', {
      label: 'Demo sections',
      sections: [{ label: 'Start', items: [{ label: 'Home', href: '#', current: true }, { label: 'Docs', href: '#' }] }],
    }), 'You are looking at the composition: this page’s own frame is the app shell — the sidebar on the left (or the app bar below, on a phone), the one main in the middle. Its template is the three lines in the source below.'),
  ],
  'code-block': (r) => [
    D('Caption and code', r('code-block', {
      caption: 'counter.js',
      code: "import { signal } from '@basenative/runtime';\n\nconst count = signal(0);",
    }), 'The code is data: it renders escaped, and the site’s highlighting pass colours it the same way it colours every block on the page.'),
  ],
  'site-footer': (r) => [
    D('Columns and a note', r('site-footer', {
      groups: [
        { label: 'Product', links: [{ label: 'Components', href: '#' }, { label: 'Docs', href: '#' }] },
        { label: 'Project', links: [{ label: 'Roadmap', href: '#' }, { label: 'Tasks', href: '#' }] },
      ],
      noteHtml: '<p>Built with BaseNative.</p>',
    })),
  ],
};

/** The catalog as the pages consume it: registry facts joined with copy. */
export function trinityCatalog(info) {
  return info.map((entry) => {
    const copy = trinityCopy[entry.name];
    if (!copy) throw new Error(`trinity-catalog: no copy for ${entry.name}`);
    return {
      slug: entry.name,
      name: entry.name,
      title: copy.title,
      tag: entry.root,
      variants: entry.variants,
      variantLabel: entry.variants.join(', '),
      summary: copy.summary,
      usage: copy.usage,
      categoryId: copy.category,
      categoryTitle: trinityCategories.find((c) => c.id === copy.category)?.title ?? copy.category,
      template: entry.template,
      styles: entry.styles,
      source: entry.source,
    };
  });
}

export function trinityCategoriesWith(entries) {
  return trinityCategories
    .map((cat) => ({ ...cat, components: entries.filter((e) => e.categoryId === cat.id) }))
    .filter((cat) => cat.components.length > 0);
}
