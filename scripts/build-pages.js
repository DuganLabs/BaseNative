/**
 * Pre-renders all Express routes to static HTML for Cloudflare Pages deployment.
 * Run after `nx bundle basenative-example-express` so basenative.js exists.
 */
import { readFileSync, mkdirSync, writeFileSync, cpSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { render } from '../packages/server/src/render.js';
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
} from '../packages/components/src/index.js';
import {
  getComponentsPageContext,
  getHomePageContext,
  getTasksPageContext,
  navPages,
  staticTasks,
} from '../examples/express/site-data.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const express = join(root, 'examples', 'express');
const dist = join(root, 'dist');
const read = (file) => readFileSync(join(express, file), 'utf-8');

// -- Layout helper (mirrors server.js) --
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

function writePage(route, html) {
  const dir = route === '/' ? dist : join(dist, route);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'index.html'), html);
  console.log(`  ${route === '/' ? '/' : `/${route}/`}`);
}

// -- Page contexts (mirrors server.js) --
const pages = {
  '/': {
    view: 'home.html',
    title: 'Home',
    activePage: 'home',
    ctx: getHomePageContext(),
  },
  tasks: {
    view: 'tasks.html',
    title: 'Tasks',
    activePage: 'tasks',
    ctx: getTasksPageContext(staticTasks),
  },
  playground: {
    view: 'playground.html',
    title: 'Playground',
    activePage: 'playground',
    ctx: {},
  },
  docs: {
    view: 'docs.html',
    title: 'API Docs',
    activePage: 'docs',
    ctx: {},
  },
  components: {
    view: 'components.html',
    title: 'Components',
    activePage: 'components',
    ctx: getComponentsPageContext(),
  },
  'test-signals': {
    view: 'test-signals.html',
    title: 'Signal Verification',
    activePage: '',
    ctx: {
      items: [
        { id: 1, name: 'Server-rendered item A', status: 'done' },
        { id: 2, name: 'Server-rendered item B', status: 'active' },
        { id: 3, name: 'Server-rendered item C', status: 'pending' },
      ],
      get itemsJson() {
        return JSON.stringify(this.items);
      },
    },
  },
  showcase: {
    view: 'showcase.html',
    title: 'Showcase',
    activePage: 'showcase',
    ctx: {
      buttons: [
        renderButton('Primary', { variant: 'primary' }),
        renderButton('Secondary', { variant: 'secondary' }),
        renderButton('Destructive', { variant: 'destructive' }),
        renderButton('Ghost', { variant: 'ghost' }),
        renderButton('Disabled', { variant: 'primary', disabled: true }),
      ].join('\n'),
      badges: [
        renderBadge('Default', { variant: 'default' }),
        renderBadge('Primary', { variant: 'primary' }),
        renderBadge('Success', { variant: 'success' }),
        renderBadge('Warning', { variant: 'warning' }),
        renderBadge('Error', { variant: 'error' }),
      ].join('\n'),
      avatars: [
        renderAvatar({ name: 'Alice Johnson', size: 'sm' }),
        renderAvatar({ name: 'Bob Smith' }),
        renderAvatar({ name: 'Carol Davis', size: 'lg' }),
        renderAvatar({ name: 'Dan Lee', size: 'xl' }),
      ].join('\n'),
      inputDefault: renderInput({ name: 'email', label: 'Email', type: 'email', placeholder: 'you@example.com', helpText: 'We will not share your email.' }),
      inputError: renderInput({ name: 'username', label: 'Username', value: 'ab', error: 'Must be at least 3 characters' }),
      textarea: renderTextarea({ name: 'bio', label: 'Bio', placeholder: 'Tell us about yourself...', rows: 3 }),
      select: renderSelect({ name: 'role', label: 'Role', items: ['Admin', 'Editor', 'Viewer'], placeholder: 'Choose a role' }),
      combobox: renderCombobox({ name: 'framework', label: 'Framework', items: ['Angular', 'React', 'Vue', 'Svelte', 'Solid'], placeholder: 'Search frameworks...' }),
      multiselect: renderMultiselect({ name: 'tags', label: 'Tags', items: ['JavaScript', 'TypeScript', 'CSS', 'HTML', 'Node.js'], selected: ['JavaScript', 'CSS'] }),
      checkbox: renderCheckbox({ name: 'terms', label: 'I agree to the terms and conditions' }),
      radioGroup: renderRadioGroup({ name: 'plan', label: 'Plan', items: ['Free', 'Pro', 'Enterprise'], selected: 'Pro' }),
      toggle: renderToggle({ name: 'notifications', label: 'Email notifications', checked: true }),
      alertInfo: renderAlert('This is an informational message.', { variant: 'info' }),
      alertSuccess: renderAlert('Operation completed successfully.', { variant: 'success' }),
      alertWarning: renderAlert('Proceed with caution.', { variant: 'warning' }),
      alertError: renderAlert('Something went wrong.', { variant: 'error', dismissible: true }),
      progress: renderProgress({ value: 65, max: 100, label: 'Upload progress' }),
      spinner: renderSpinner({ label: 'Loading' }),
      spinnerLg: renderSpinner({ size: 'lg', label: 'Loading' }),
      skeleton: renderSkeleton({ width: '100%', height: '1rem', count: 3 }),
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
      breadcrumb: renderBreadcrumb({ items: [
        { label: 'Home', href: '/' },
        { label: 'Components', href: '/components' },
        { label: 'Showcase' },
      ] }),
      pagination: renderPagination({ currentPage: 3, totalPages: 10, baseUrl: '/showcase' }),
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
    },
  },
};

// -- Build --
console.log('Building static site...');
mkdirSync(dist, { recursive: true });

// Render pages
for (const [route, { view, title, activePage, ctx }] of Object.entries(pages)) {
  const html = renderPage(view, ctx, { title, activePage });
  writePage(route, html);
}

// Copy static assets
cpSync(join(express, 'public', 'styles.css'), join(dist, 'styles.css'));
cpSync(join(express, 'public', 'theme.css'), join(dist, 'theme.css'));
cpSync(join(express, 'public', 'basenative.js'), join(dist, 'basenative.js'));

// Copy component CSS (served as /bn-css/ in Express, must exist in dist)
const bnCssDir = join(dist, 'bn-css');
mkdirSync(bnCssDir, { recursive: true });
const componentSrc = join(root, 'packages', 'components', 'src');
for (const file of ['index.css', 'layers.css', 'reset.css', 'tokens.css', 'theme.css', 'layout.css', 'components.css', 'states.css']) {
  cpSync(join(componentSrc, file), join(bnCssDir, file));
}

// Copy fonts (preserve structure so fonts.css relative paths work)
cpSync(join(root, 'packages', 'fonts'), join(dist, 'fonts'), { recursive: true });

// Copy icons
cpSync(join(root, 'packages', 'icons', 'src'), join(dist, 'icons'), { recursive: true });

// Write Cloudflare Pages _headers file for security headers
const headers = `/*
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: geolocation=(), microphone=(), camera=()
  Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data:; connect-src 'self'
  Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
  Cross-Origin-Opener-Policy: same-origin
`;
writeFileSync(join(dist, '_headers'), headers);
console.log('  _headers (security)');

console.log('Done → dist/');
