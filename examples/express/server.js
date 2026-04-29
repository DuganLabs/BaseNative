import express from 'express';
import { readFileSync, watch } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { render } from '@basenative/server';
import {
  renderButton, renderBadge, renderAvatar,
  renderInput, renderTextarea, renderSelect, renderCheckbox, renderRadioGroup, renderToggle,
  renderCombobox, renderMultiselect,
  renderAlert, renderProgress, renderSpinner, renderSkeleton,
  renderCard, renderAccordion, renderTabs,
  renderBreadcrumb, renderPagination,
  renderTable, renderDataGrid,
  renderDialog, renderDrawer, renderDropdownMenu, renderTooltip, renderCommandPalette,
  renderTree, renderVirtualList, renderToastContainer,
} from '../../packages/components/src/index.js';
import {
  getComponentsPageContext,
  getHomePageContext,
  getTasksPageContext,
  navPages,
} from './site-data.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkgRoot = join(__dirname, '..', '..');
const read = (file) => readFileSync(join(__dirname, file), 'utf-8');

const app = express();
app.use(express.json());
app.use(express.static(join(__dirname, 'public')));
app.use('/bn-css', express.static(join(pkgRoot, 'packages', 'components', 'src')));
app.use('/fonts', express.static(join(pkgRoot, 'packages', 'fonts')));
app.use('/icons', express.static(join(pkgRoot, 'packages', 'icons', 'src')));

// -- In-memory task store --
let nextId = 5;
let tasks = [
  { id: 1, title: 'Design token system', status: 'done' },
  { id: 2, title: 'Signal reactivity', status: 'done' },
  { id: 3, title: 'Server-side rendering', status: 'active' },
  { id: 4, title: 'Client hydration', status: 'pending' },
];

// -- Layout helper --
function renderPage(viewFile, ctx, { title, scripts = '', activePage = '' }) {
  const layout = read('views/layout.html');
  const view = read(`views/${viewFile}`);
  const content = render(view, ctx);
  let html = layout
    .replace('<!--TITLE-->', title)
    .replace('<!--CONTENT-->', content)
    .replace('<!--SCRIPTS-->', scripts);
  for (const page of navPages) {
    html = html.replace(
      `<!--${page.toUpperCase()}_ARIA-->`,
      activePage === page ? 'aria-current="page"' : ''
    );
  }
  return html;
}

// -- Routes --

app.get('/', (req, res) => {
  const ctx = getHomePageContext();
  const html = renderPage('home.html', ctx, { title: 'Home', activePage: 'home' });
  res.send(html);
});

app.get('/tasks', (req, res) => {
  const ctx = getTasksPageContext(tasks);
  const html = renderPage('tasks.html', ctx, { title: 'Tasks', activePage: 'tasks' });
  res.send(html);
});

app.get('/playground', (req, res) => {
  const html = renderPage('playground.html', {}, { title: 'Playground', activePage: 'playground' });
  res.send(html);
});

app.get('/docs', (req, res) => {
  const html = renderPage('docs.html', {}, { title: 'API Docs', activePage: 'docs' });
  res.send(html);
});

app.get('/components', (req, res) => {
  const ctx = getComponentsPageContext();
  const html = renderPage('components.html', ctx, { title: 'Components', activePage: 'components' });
  res.send(html);
});

app.get('/test-signals', (req, res) => {
  const items = [
    { id: 1, name: 'Server-rendered item A', status: 'done' },
    { id: 2, name: 'Server-rendered item B', status: 'active' },
    { id: 3, name: 'Server-rendered item C', status: 'pending' },
  ];
  const ctx = { items, itemsJson: JSON.stringify(items) };
  const html = renderPage('test-signals.html', ctx, { title: 'Signal Verification' });
  res.send(html);
});

app.get('/showcase', (req, res) => {
  const ctx = {
    // Buttons
    buttons: [
      renderButton('Primary', { variant: 'primary' }),
      renderButton('Secondary', { variant: 'secondary' }),
      renderButton('Destructive', { variant: 'destructive' }),
      renderButton('Ghost', { variant: 'ghost' }),
      renderButton('Disabled', { variant: 'primary', disabled: true }),
    ].join('\n'),

    // Badges
    badges: [
      renderBadge('Default', { variant: 'default' }),
      renderBadge('Primary', { variant: 'primary' }),
      renderBadge('Success', { variant: 'success' }),
      renderBadge('Warning', { variant: 'warning' }),
      renderBadge('Error', { variant: 'error' }),
    ].join('\n'),

    // Avatars
    avatars: [
      renderAvatar({ name: 'Alice Johnson', size: 'sm' }),
      renderAvatar({ name: 'Bob Smith' }),
      renderAvatar({ name: 'Carol Davis', size: 'lg' }),
      renderAvatar({ name: 'Dan Lee', size: 'xl' }),
    ].join('\n'),

    // Form controls
    inputDefault: renderInput({ name: 'email', label: 'Email', type: 'email', placeholder: 'you@example.com', helpText: 'We will not share your email.' }),
    inputError: renderInput({ name: 'username', label: 'Username', value: 'ab', error: 'Must be at least 3 characters' }),
    textarea: renderTextarea({ name: 'bio', label: 'Bio', placeholder: 'Tell us about yourself...', rows: 3 }),
    select: renderSelect({ name: 'role', label: 'Role', items: ['Admin', 'Editor', 'Viewer'], placeholder: 'Choose a role' }),
    combobox: renderCombobox({ name: 'framework', label: 'Framework', items: ['Angular', 'React', 'Vue', 'Svelte', 'Solid'], placeholder: 'Search frameworks...' }),
    multiselect: renderMultiselect({ name: 'tags', label: 'Tags', items: ['JavaScript', 'TypeScript', 'CSS', 'HTML', 'Node.js'], selected: ['JavaScript', 'CSS'] }),
    checkbox: renderCheckbox({ name: 'terms', label: 'I agree to the terms and conditions' }),
    radioGroup: renderRadioGroup({ name: 'plan', label: 'Plan', items: ['Free', 'Pro', 'Enterprise'], selected: 'Pro' }),
    toggle: renderToggle({ name: 'notifications', label: 'Email notifications', checked: true }),

    // Feedback
    alertInfo: renderAlert('This is an informational message.', { variant: 'info' }),
    alertSuccess: renderAlert('Operation completed successfully.', { variant: 'success' }),
    alertWarning: renderAlert('Proceed with caution.', { variant: 'warning' }),
    alertError: renderAlert('Something went wrong.', { variant: 'error', dismissible: true }),
    progress: renderProgress({ value: 65, max: 100, label: 'Upload progress' }),
    spinner: renderSpinner({ label: 'Loading' }),
    spinnerLg: renderSpinner({ size: 'lg', label: 'Loading' }),
    skeleton: renderSkeleton({ width: '100%', height: '1rem', count: 3 }),

    // Cards & layout
    card: renderCard({ header: 'Card Title', body: '<p>Card body content with descriptive text about the feature or item being presented.</p>', footer: 'Updated 2 hours ago' }),
    accordion: renderAccordion({ items: [
      { title: 'What is BaseNative?', content: 'A lightweight signals-based runtime for native template elements with ~120 lines of client code.' },
      { title: 'How does SSR work?', content: 'The server renderer evaluates @if, @for, @switch directives at request time and returns clean HTML.' },
      { title: 'What about hydration?', content: 'The client hydrate() function walks the DOM tree, binds reactive expressions, and attaches event handlers.' },
    ] }),
    tabs: renderTabs({ tabs: [
      { id: 'overview', label: 'Overview', content: '<p>BaseNative brings Angular-inspired control flow to native template elements.</p>' },
      { id: 'features', label: 'Features', content: '<p>Signals, computed values, effects, SSR, hydration, and template directives.</p>' },
      { id: 'api', label: 'API', content: '<p>signal(), computed(), effect(), hydrate(), render().</p>' },
    ] }),

    // Navigation
    breadcrumb: renderBreadcrumb({ items: [
      { label: 'Home', href: '/' },
      { label: 'Components', href: '/components' },
      { label: 'Showcase' },
    ] }),
    pagination: renderPagination({ currentPage: 3, totalPages: 10, baseUrl: '/showcase' }),

    // Data
    table: renderTable({
      columns: [
        { key: 'name', label: 'Name' },
        { key: 'role', label: 'Role' },
        { key: 'status', label: 'Status' },
      ],
      rows: [
        { name: 'Alice Johnson', role: 'Admin', status: 'Active' },
        { name: 'Bob Smith', role: 'Editor', status: 'Active' },
        { name: 'Carol Davis', role: 'Viewer', status: 'Inactive' },
      ],
      caption: 'Team members',
    }),
    datagrid: renderDataGrid({
      columns: [
        { key: 'task', label: 'Task', sortable: true },
        { key: 'assignee', label: 'Assignee', sortable: true },
        { key: 'priority', label: 'Priority' },
        { key: 'status', label: 'Status' },
      ],
      rows: [
        { id: 1, task: 'Design token system', assignee: 'Alice', priority: 'High', status: 'Done' },
        { id: 2, task: 'Signal reactivity', assignee: 'Bob', priority: 'High', status: 'Done' },
        { id: 3, task: 'Server rendering', assignee: 'Carol', priority: 'Medium', status: 'Active' },
        { id: 4, task: 'Client hydration', assignee: 'Dan', priority: 'Medium', status: 'Pending' },
        { id: 5, task: 'Component library', assignee: 'Alice', priority: 'Low', status: 'Active' },
      ],
      sortBy: 'task',
      sortDir: 'asc',
      selectable: true,
      caption: 'Project tasks',
    }),
    tree: renderTree({
      items: [
        { id: '1', label: 'src', icon: '\u{1F4C1}', children: [
          { id: '1-1', label: 'runtime', icon: '\u{1F4C1}', children: [
            { id: '1-1-1', label: 'signals.js', icon: '\u{1F4C4}' },
            { id: '1-1-2', label: 'hydrate.js', icon: '\u{1F4C4}' },
            { id: '1-1-3', label: 'bind.js', icon: '\u{1F4C4}' },
          ]},
          { id: '1-2', label: 'server', icon: '\u{1F4C1}', children: [
            { id: '1-2-1', label: 'render.js', icon: '\u{1F4C4}' },
          ]},
        ]},
        { id: '2', label: 'examples', icon: '\u{1F4C1}', children: [
          { id: '2-1', label: 'express', icon: '\u{1F4C1}' },
          { id: '2-2', label: 'enterprise', icon: '\u{1F4C1}' },
        ]},
      ],
      expanded: new Set(['1', '1-1']),
      selected: '1-1-1',
    }),
    virtualList: renderVirtualList({
      items: Array.from({ length: 50 }, (_, i) => `Item ${i + 1}`),
      itemHeight: 40,
      containerHeight: 200,
    }),

    // Overlays
    dialog: renderDialog({
      title: 'Confirm Action',
      content: '<p>Are you sure you want to proceed? This action cannot be undone.</p>',
      footer: renderButton('Cancel', { variant: 'secondary' }) + renderButton('Confirm', { variant: 'primary' }),
      id: 'demo-dialog',
    }),
    drawer: renderDrawer({
      title: 'Settings',
      content: '<p>Drawer body content goes here. This slides in from the edge of the viewport.</p>',
      position: 'right',
      id: 'demo-drawer',
    }),
    dropdown: renderDropdownMenu({
      trigger: 'Actions',
      items: [
        { label: 'Edit', action: 'edit', icon: '\u{270F}\u{FE0F}' },
        { label: 'Duplicate', action: 'duplicate', icon: '\u{1F4CB}' },
        { separator: true },
        { label: 'Delete', action: 'delete', icon: '\u{1F5D1}\u{FE0F}' },
      ],
    }),
    tooltip: renderTooltip({
      trigger: 'Hover me',
      content: 'This is a tooltip with helpful context',
      position: 'top',
    }),
    commandPalette: renderCommandPalette({
      commands: [
        { label: 'Go to Home', action: 'home', group: 'Navigation', icon: '\u{1F3E0}' },
        { label: 'Go to Tasks', action: 'tasks', group: 'Navigation', icon: '\u{2705}' },
        { label: 'New Task', action: 'new-task', group: 'Actions', icon: '\u{2795}', shortcut: 'Ctrl+N' },
        { label: 'Search', action: 'search', group: 'Actions', icon: '\u{1F50D}', shortcut: 'Ctrl+K' },
      ],
      id: 'demo-cmd',
    }),

    toastContainer: renderToastContainer('top-right'),
  };
  const html = renderPage('showcase.html', ctx, {
    title: 'Showcase',
    activePage: 'showcase',
    scripts: '<script type="module" src="/showcase.js"></script>',
  });
  res.send(html);
});

// -- API --

app.post('/api/tasks', (req, res) => {
  const { title } = req.body;
  if (!title || typeof title !== 'string') {
    return res.status(400).json({ error: 'title is required' });
  }
  const task = { id: nextId++, title: title.trim(), status: 'active' };
  tasks.push(task);
  res.status(201).json(task);
});

app.delete('/api/tasks/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const idx = tasks.findIndex(t => t.id === id);
  if (idx === -1) return res.status(404).json({ error: 'not found' });
  tasks.splice(idx, 1);
  res.status(204).end();
});

// -- Live reload (dev only) --
const liveClients = new Set();

app.get('/__live', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });
  res.write('data: connected\n\n');
  liveClients.add(res);
  req.on('close', () => liveClients.delete(res));
});

let reloadTimer;
function notifyReload() {
  clearTimeout(reloadTimer);
  reloadTimer = setTimeout(() => {
    for (const client of liveClients) client.write('data: reload\n\n');
  }, 200);
}

const watchDirs = [
  join(__dirname, 'views'),
  join(__dirname, 'public'),
  join(pkgRoot, 'packages', 'components', 'src'),
];
for (const dir of watchDirs) {
  try {
    watch(dir, { recursive: true }, () => notifyReload());
  } catch { /* dir may not exist in CI */ }
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`BaseNative Express → http://localhost:${PORT}`);
});
