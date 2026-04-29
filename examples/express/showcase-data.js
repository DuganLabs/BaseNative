import {
  renderButton,
  renderBadge,
  renderAvatar,
  renderInput,
  renderTextarea,
  renderSelect,
  renderCheckbox,
  renderRadioGroup,
  renderToggle,
  renderCombobox,
  renderMultiselect,
  renderAlert,
  renderProgress,
  renderSpinner,
  renderSkeleton,
  renderCard,
  renderAccordion,
  renderTabs,
  renderBreadcrumb,
  renderPagination,
  renderTable,
  renderDataGrid,
  renderDialog,
  renderDrawer,
  renderDropdownMenu,
  renderTooltip,
  renderCommandPalette,
  renderTree,
  renderVirtualList,
  renderToastContainer,
  renderCalendar,
  renderPipeline,
  renderLayoutGrid,
} from '../../packages/components/src/index.js';

export const PACKAGES = [
  {
    name: '@basenative/runtime',
    tag: 'core',
    summary: 'Signal-based web runtime over native HTML — zero build step, ~5KB gzipped.',
  },
  {
    name: '@basenative/server',
    tag: 'core',
    summary: 'Server-side rendering with @if / @for / @switch evaluation and streaming.',
  },
  {
    name: '@basenative/router',
    tag: 'core',
    summary: 'SSR-aware path routing with named params, wildcards, and history API.',
  },
  {
    name: '@basenative/forms',
    tag: 'core',
    summary: 'Signal-based form state with dirty / touched tracking and schema adapters.',
  },
  {
    name: '@basenative/components',
    tag: 'ui',
    summary: '25+ semantic UI components with CSS-custom-property theming.',
  },
  {
    name: '@basenative/markdown',
    tag: 'ui',
    summary: 'Zero-dependency ESM markdown parser and SSR-safe HTML renderer.',
  },
  {
    name: '@basenative/visual-builder',
    tag: 'ui',
    summary: 'Drag-and-drop component builder — composes layouts, generates BaseNative code.',
  },
  {
    name: '@basenative/builder',
    tag: 'ui',
    summary: 'Signal-based drag-and-drop component builder runtime for layout editors.',
  },
  {
    name: '@basenative/keyboard',
    tag: 'ui',
    summary: 'Layout-agnostic on-screen virtual keyboard primitive — themable and signal-driven.',
  },
  {
    name: '@basenative/icons',
    tag: 'ui',
    summary: 'Icon system with the curated SVG set used by BaseNative components.',
  },
  {
    name: '@basenative/fonts',
    tag: 'ui',
    summary: 'Font-loading utilities and the bundled Inter font for theme.css.',
  },
  {
    name: '@basenative/favicon',
    tag: 'ui',
    summary: 'SVG-first favicon generator: maskable, manifest, and apple-touch-icon tags.',
  },
  {
    name: '@basenative/auth',
    tag: 'data',
    summary: 'Sessions, RBAC, password hashing, OAuth2/OIDC.',
  },
  {
    name: '@basenative/auth-webauthn',
    tag: 'data',
    summary: 'Passkey adapter for @basenative/auth — Workers/Pages handlers included.',
  },
  {
    name: '@basenative/db',
    tag: 'data',
    summary: 'Query builder with SQLite, Postgres, and Cloudflare D1 adapters.',
  },
  {
    name: '@basenative/middleware',
    tag: 'data',
    summary: 'CORS, rate-limit, CSRF, and signal-aware request adapters.',
  },
  {
    name: '@basenative/tenant',
    tag: 'data',
    summary: 'Multi-tenant middleware with subdomain resolution and row-level scoping.',
  },
  {
    name: '@basenative/upload',
    tag: 'data',
    summary: 'File upload handling with R2 and S3 adapters.',
  },
  {
    name: '@basenative/persist',
    tag: 'data',
    summary: 'Signal-driven local persistence with TTL and conflict resolution.',
  },
  {
    name: '@basenative/realtime',
    tag: 'data',
    summary: 'SSE + WebSocket connections exposed as reactive signals.',
  },
  {
    name: '@basenative/fetch',
    tag: 'data',
    summary: 'Signal-based resource fetching with cache and SSR preload.',
  },
  {
    name: '@basenative/notify',
    tag: 'data',
    summary: 'Email via SMTP and SendGrid with template rendering.',
  },
  {
    name: '@basenative/i18n',
    tag: 'data',
    summary: 'ICU messages, locale detection, and the @t template directive.',
  },
  {
    name: '@basenative/date',
    tag: 'data',
    summary: 'Date utilities, timezone handling, and relative time formatting.',
  },
  {
    name: '@basenative/flags',
    tag: 'data',
    summary: 'Feature flags with percentage rollouts and the @feature directive.',
  },
  {
    name: '@basenative/logger',
    tag: 'data',
    summary: 'Structured logging with multiple transports and child loggers.',
  },
  {
    name: '@basenative/config',
    tag: 'data',
    summary: 'Type-safe environment configuration loading and validation.',
  },
  {
    name: '@basenative/integrations',
    tag: 'data',
    summary: 'Headless wrappers for Plaid, Stripe, and other third parties.',
  },
  {
    name: '@basenative/share',
    tag: 'data',
    summary: 'Web Share API with clipboard fallback and OG-redirect landing pages.',
  },
  {
    name: '@basenative/og-image',
    tag: 'data',
    summary: 'Worker-runtime OG / social-share PNG renderer with KV-cached fonts.',
  },
  {
    name: '@basenative/admin',
    tag: 'data',
    summary: 'Pluggable admin / moderation surface — protected routes, audit log.',
  },
  {
    name: '@basenative/marketplace',
    tag: 'data',
    summary: 'Community component marketplace runtime and registry helpers.',
  },
  {
    name: '@basenative/station',
    tag: 'data',
    summary: 'Queue-driven local-inference primitive with vLLM + Workers AI fallback.',
  },
  {
    name: '@basenative/cli',
    tag: 'tools',
    summary: 'The bn CLI — create, prd, speckit, gh, nx, deploy, doctor.',
  },
  {
    name: '@basenative/claude-config',
    tag: 'tools',
    summary: 'Bundled Claude Code subagents, skills, and slash commands.',
  },
  {
    name: '@basenative/doppler',
    tag: 'tools',
    summary: 'Thin DX layer around Doppler — local-dev wrapper, CI helper, validation.',
  },
  {
    name: '@basenative/wrangler-preset',
    tag: 'tools',
    summary: 'Pinned Wrangler version + typed wrangler.toml fragment generator.',
  },
  {
    name: '@basenative/eslint-config',
    tag: 'tools',
    summary: 'Shared ESLint flat-config — security, hygiene, zero-noise defaults.',
  },
  {
    name: '@basenative/tsconfig',
    tag: 'tools',
    summary: 'Shared base tsconfigs — strict, modern, runtime-targeted.',
  },
];

const PACKAGE_GROUPS = [
  { tag: 'core', label: 'Runtime core' },
  { tag: 'ui', label: 'UI & rendering' },
  { tag: 'data', label: 'Data, auth & infra' },
  { tag: 'tools', label: 'Tooling & DX' },
];

function renderPackageCards() {
  const groupHtml = PACKAGE_GROUPS.map((group) => {
    const cards = PACKAGES.filter((p) => p.tag === group.tag)
      .map(
        (p) => `<li data-bn-package-card data-tag="${p.tag}">
  <code>${p.name}</code>
  <p>${p.summary}</p>
</li>`,
      )
      .join('');
    return `<li data-bn-package-group>
  <h3>${group.label}</h3>
  <ul data-bn-package-list>${cards}</ul>
</li>`;
  }).join('');
  return groupHtml;
}

function calendarStartOfWeek() {
  const d = new Date();
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d.toISOString().split('T')[0];
}

function calendarEvents(startDate) {
  const base = new Date(startDate);
  const isoAt = (offsetDays, hour, minute = 0) => {
    const d = new Date(base);
    d.setDate(d.getDate() + offsetDays);
    d.setHours(hour, minute, 0, 0);
    return d.toISOString().slice(0, 16);
  };
  return [
    {
      id: 'e1',
      title: 'Sprint review',
      start: isoAt(1, 9, 0),
      end: isoAt(1, 10, 30),
      status: 'scheduled',
      assignee: 'Alice',
    },
    {
      id: 'e2',
      title: 'Customer call: Greenput',
      start: isoAt(2, 13, 0),
      end: isoAt(2, 14, 0),
      status: 'in_progress',
      assignee: 'Bob',
    },
    {
      id: 'e3',
      title: 'Release cut',
      start: isoAt(4, 16, 0),
      end: isoAt(4, 17, 0),
      status: 'completed',
      assignee: 'Carol',
    },
    {
      id: 'e4',
      title: 'Office hours',
      start: isoAt(5, 11, 0),
      end: isoAt(5, 12, 0),
      status: 'scheduled',
      assignee: 'Dan',
    },
  ];
}

export function getShowcaseContext() {
  const startDate = calendarStartOfWeek();

  return {
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
      renderAvatar({ name: 'Eve Martinez', src: '/avatar-eve.svg', size: 'lg' }),
    ].join('\n'),

    inputDefault: renderInput({
      name: 'email',
      label: 'Email',
      type: 'email',
      placeholder: 'you@example.com',
      helpText: 'We will not share your email.',
    }),
    inputError: renderInput({
      name: 'username',
      label: 'Username',
      value: 'ab',
      error: 'Must be at least 3 characters',
    }),
    textarea: renderTextarea({
      name: 'bio',
      label: 'Bio',
      placeholder: 'Tell us about yourself...',
      rows: 3,
    }),
    select: renderSelect({
      name: 'role',
      label: 'Role',
      items: ['Admin', 'Editor', 'Viewer'],
      placeholder: 'Choose a role',
    }),
    combobox: renderCombobox({
      name: 'framework',
      label: 'Framework',
      items: ['Angular', 'React', 'Vue', 'Svelte', 'Solid'],
      placeholder: 'Search frameworks...',
    }),
    multiselect: renderMultiselect({
      name: 'tags',
      label: 'Tags',
      items: ['JavaScript', 'TypeScript', 'CSS', 'HTML', 'Node.js'],
      selected: ['JavaScript', 'CSS'],
    }),
    checkbox: renderCheckbox({ name: 'terms', label: 'I agree to the terms and conditions' }),
    radioGroup: renderRadioGroup({
      name: 'plan',
      label: 'Plan',
      items: ['Free', 'Pro', 'Enterprise'],
      selected: 'Pro',
    }),
    toggle: renderToggle({ name: 'notifications', label: 'Email notifications', checked: true }),

    alertInfo: renderAlert('This is an informational message.', { variant: 'info' }),
    alertSuccess: renderAlert('Operation completed successfully.', { variant: 'success' }),
    alertWarning: renderAlert('Proceed with caution.', { variant: 'warning' }),
    alertError: renderAlert('Something went wrong.', { variant: 'error', dismissible: true }),
    progress: renderProgress({ value: 65, max: 100, label: 'Upload progress' }),
    spinner: renderSpinner({ label: 'Loading' }),
    spinnerLg: renderSpinner({ size: 'lg', label: 'Loading' }),
    skeleton: renderSkeleton({ width: '100%', height: '1rem', count: 3 }),

    card: renderCard({
      header: 'Card Title',
      body: '<p>Card body content with descriptive text about the feature or item being presented.</p>',
      footer: 'Updated 2 hours ago',
    }),
    accordion: renderAccordion({
      items: [
        {
          title: 'What is BaseNative?',
          content:
            'A lightweight signals-based runtime for native template elements with ~120 lines of client code.',
        },
        {
          title: 'How does SSR work?',
          content:
            'The server renderer evaluates @if, @for, @switch directives at request time and returns clean HTML.',
        },
        {
          title: 'What about hydration?',
          content:
            'The client hydrate() function walks the DOM tree, binds reactive expressions, and attaches event handlers.',
        },
      ],
    }),
    tabs: renderTabs({
      tabs: [
        {
          id: 'overview',
          label: 'Overview',
          content:
            '<p>BaseNative brings Angular-inspired control flow to native template elements.</p>',
        },
        {
          id: 'features',
          label: 'Features',
          content:
            '<p>Signals, computed values, effects, SSR, hydration, and template directives.</p>',
        },
        {
          id: 'api',
          label: 'API',
          content:
            '<p><code>signal()</code>, <code>computed()</code>, <code>effect()</code>, <code>hydrate()</code>, <code>render()</code>.</p>',
        },
      ],
    }),
    layoutGrid: renderLayoutGrid({
      id: 'showcase-layout-grid',
      columns: 6,
      gap: '0.75rem',
      cells: [
        { id: 'g1', label: 'Header', colSpan: 6 },
        { id: 'g2', label: 'Sidebar', colSpan: 2, rowSpan: 2 },
        { id: 'g3', label: 'Main content', colSpan: 4 },
        { id: 'g4', label: 'Aside', colSpan: 4 },
        { id: 'g5', label: 'Footer', colSpan: 6 },
      ],
    }),

    breadcrumb: renderBreadcrumb({
      items: [
        { label: 'Home', href: '/' },
        { label: 'Components', href: '/components' },
        { label: 'Showcase' },
      ],
    }),
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
        {
          id: 3,
          task: 'Server rendering',
          assignee: 'Carol',
          priority: 'Medium',
          status: 'Active',
        },
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
        {
          id: '1',
          label: 'src',
          icon: '\u{1F4C1}',
          children: [
            {
              id: '1-1',
              label: 'runtime',
              icon: '\u{1F4C1}',
              children: [
                { id: '1-1-1', label: 'signals.js', icon: '\u{1F4C4}' },
                { id: '1-1-2', label: 'hydrate.js', icon: '\u{1F4C4}' },
                { id: '1-1-3', label: 'bind.js', icon: '\u{1F4C4}' },
              ],
            },
            {
              id: '1-2',
              label: 'server',
              icon: '\u{1F4C1}',
              children: [{ id: '1-2-1', label: 'render.js', icon: '\u{1F4C4}' }],
            },
          ],
        },
        {
          id: '2',
          label: 'examples',
          icon: '\u{1F4C1}',
          children: [
            { id: '2-1', label: 'express', icon: '\u{1F4C1}' },
            { id: '2-2', label: 'enterprise', icon: '\u{1F4C1}' },
          ],
        },
      ],
      expanded: new Set(['1', '1-1']),
      selected: '1-1-1',
    }),
    virtualList: renderVirtualList({
      items: Array.from(
        { length: 200 },
        (_, i) => `Row ${i + 1} — generated server-side, scrolled client-side`,
      ),
      itemHeight: 44,
      containerHeight: 240,
    }),
    calendar: renderCalendar({
      startDate,
      events: calendarEvents(startDate),
      hours: { start: 8, end: 18 },
    }),
    pipeline: renderPipeline({
      columns: [
        { id: 'todo', title: 'Todo' },
        { id: 'doing', title: 'In progress' },
        { id: 'done', title: 'Done' },
      ],
      cards: [
        {
          id: 'c1',
          columnId: 'todo',
          title: 'Wire showcase hydration',
          subtitle: 'web',
          status: 'scheduled',
        },
        { id: 'c2', columnId: 'todo', title: 'Audit page navigation', subtitle: 'web' },
        {
          id: 'c3',
          columnId: 'doing',
          title: 'Render every package',
          subtitle: 'docs',
          description: 'Cards for all 30+ @basenative/* packages.',
        },
        {
          id: 'c4',
          columnId: 'done',
          title: 'Fix Open dialog handler',
          subtitle: 'overlay',
          status: 'completed',
        },
        {
          id: 'c5',
          columnId: 'done',
          title: 'Tooltip hover',
          subtitle: 'overlay',
          status: 'completed',
        },
      ],
    }),

    dialog: renderDialog({
      title: 'Confirm Action',
      content: '<p>Are you sure you want to proceed? This action cannot be undone.</p>',
      footer:
        renderButton('Cancel', { variant: 'secondary' }) +
        renderButton('Confirm', { variant: 'primary' }),
      id: 'demo-dialog',
    }),
    drawer: renderDrawer({
      title: 'Settings',
      content:
        '<p>Drawer body content goes here. This slides in from the edge of the viewport.</p>',
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
      content: 'This is a tooltip with helpful context. Triggers on hover or focus.',
      position: 'top',
    }),
    commandPalette: renderCommandPalette({
      commands: [
        { label: 'Go to Home', action: 'home', group: 'Navigation', icon: '\u{1F3E0}' },
        { label: 'Go to Tasks', action: 'tasks', group: 'Navigation', icon: '\u{2705}' },
        {
          label: 'New Task',
          action: 'new-task',
          group: 'Actions',
          icon: '\u{2795}',
          shortcut: 'Ctrl+N',
        },
        {
          label: 'Search',
          action: 'search',
          group: 'Actions',
          icon: '\u{1F50D}',
          shortcut: 'Ctrl+K',
        },
      ],
      id: 'demo-cmd',
    }),

    toastContainer: renderToastContainer('top-right'),

    packageCount: PACKAGES.length,
    packageCards: renderPackageCards(),
  };
}
