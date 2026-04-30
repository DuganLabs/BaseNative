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
  return PACKAGE_GROUPS.map((group) => {
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

const trim = (s) => s.replace(/^\n/, '').replace(/\n$/, '');

/**
 * Build a single showcase section.
 * Each section has { id, title, description, demos: [{ caption, html, code }] }.
 * Sections drive both the TOC and the page body.
 */
export function getShowcaseSections() {
  const startDate = calendarStartOfWeek();

  return [
    {
      id: 'sec-buttons',
      category: 'inputs',
      title: 'Buttons',
      description:
        'Real button elements. Variants, disabled state, and a hydrated counter to prove the click handler is native.',
      demos: [
        {
          caption: 'Variants',
          layout: 'row',
          html: [
            renderButton('Primary', { variant: 'primary' }),
            renderButton('Secondary', { variant: 'secondary' }),
            renderButton('Destructive', { variant: 'destructive' }),
            renderButton('Ghost', { variant: 'ghost' }),
            renderButton('Disabled', { variant: 'primary', disabled: true }),
          ].join('\n'),
          code: trim(`
renderButton('Primary',     { variant: 'primary' })
renderButton('Secondary',   { variant: 'secondary' })
renderButton('Destructive', { variant: 'destructive' })
renderButton('Ghost',       { variant: 'ghost' })
renderButton('Disabled',    { variant: 'primary', disabled: true })`),
        },
        {
          caption: 'Live counter (signal + effect)',
          layout: 'stack',
          html: `
<output data-bn-live-counter aria-live="polite">0</output>
<nav data-bn-demo-row aria-label="Counter controls">
  ${renderButton('−', { variant: 'secondary', attrs: 'data-bn-action="counter-dec" aria-label="Decrement"' })}
  ${renderButton('+', { variant: 'primary', attrs: 'data-bn-action="counter-inc" aria-label="Increment"' })}
  ${renderButton('Reset', { variant: 'ghost', attrs: 'data-bn-action="counter-reset"' })}
</nav>`,
          code: trim(`
const count = signal(0);
effect(() => out.textContent = count());
inc.onclick   = () => count.set(c => c + 1);
dec.onclick   = () => count.set(c => c - 1);
reset.onclick = () => count.set(0);`),
        },
      ],
    },
    {
      id: 'sec-badges',
      category: 'feedback',
      title: 'Badges & avatars',
      description:
        'Compact status pills and an initials-fallback avatar that reads from the name attribute. Both are built on a single span element.',
      demos: [
        {
          caption: 'Badge variants',
          layout: 'row',
          html: [
            renderBadge('Default', { variant: 'default' }),
            renderBadge('Primary', { variant: 'primary' }),
            renderBadge('Success', { variant: 'success' }),
            renderBadge('Warning', { variant: 'warning' }),
            renderBadge('Error', { variant: 'error' }),
          ].join(' '),
          code: trim(`
renderBadge('Active',  { variant: 'success' })
renderBadge('Warning', { variant: 'warning' })`),
        },
        {
          caption: 'Avatar sizes',
          layout: 'row',
          html: [
            renderAvatar({ name: 'Alice Johnson', size: 'sm' }),
            renderAvatar({ name: 'Bob Smith' }),
            renderAvatar({ name: 'Carol Davis', size: 'lg' }),
            renderAvatar({ name: 'Dan Lee', size: 'xl' }),
          ].join(' '),
          code: trim(`renderAvatar({ name: 'Alice Johnson', size: 'lg' })`),
        },
      ],
    },
    {
      id: 'sec-form',
      category: 'inputs',
      title: 'Form controls',
      description:
        'Native form fields with label / help / error wiring, plus a live-validating input that toggles aria-invalid based on signal state.',
      demos: [
        {
          caption: 'Inputs (default + error)',
          layout: 'form',
          html: [
            renderInput({
              name: 'email',
              label: 'Email',
              type: 'email',
              placeholder: 'you@example.com',
              helpText: 'We will not share your email.',
            }),
            renderInput({
              name: 'username',
              label: 'Username',
              value: 'ab',
              error: 'Must be at least 3 characters',
            }),
          ].join('\n'),
          code: trim(`
renderInput({ name: 'email',    label: 'Email',    type: 'email', helpText: '...' })
renderInput({ name: 'username', label: 'Username', value: 'ab',   error: '...' })`),
        },
        {
          caption: 'Live validation',
          layout: 'form',
          html: `
${renderInput({ name: 'live-username', label: 'Username (live-validated)', placeholder: 'pick a handle', attrs: 'data-bn-live-validate minlength="3" maxlength="20"' })}
<output data-bn-live-validate-feedback role="status" aria-live="polite"></output>`,
          code: trim(`
const value = signal('');
const valid = computed(() => value().length >= 3);
effect(() => input.setAttribute('aria-invalid', String(!valid())));`),
        },
        {
          caption: 'Textarea, select, combobox, multiselect',
          layout: 'form',
          html: [
            renderTextarea({
              name: 'bio',
              label: 'Bio',
              placeholder: 'Tell us about yourself...',
              rows: 3,
            }),
            renderSelect({
              name: 'role',
              label: 'Role',
              items: ['Admin', 'Editor', 'Viewer'],
              placeholder: 'Choose a role',
            }),
            renderCombobox({
              name: 'framework',
              label: 'Framework',
              items: ['Angular', 'React', 'Vue', 'Svelte', 'Solid'],
              placeholder: 'Search frameworks...',
            }),
            renderMultiselect({
              name: 'tags',
              label: 'Tags',
              items: ['JavaScript', 'TypeScript', 'CSS', 'HTML', 'Node.js'],
              selected: ['JavaScript', 'CSS'],
            }),
          ].join('\n'),
          code: trim(`
renderTextarea({ name: 'bio',       rows: 3 })
renderSelect({   name: 'role',      items: [...] })
renderCombobox({ name: 'framework', items: [...] })
renderMultiselect({ name: 'tags',   items: [...], selected: [...] })`),
        },
        {
          caption: 'Checkbox, radio group, toggle',
          layout: 'form',
          html: [
            renderCheckbox({ name: 'terms', label: 'I agree to the terms and conditions' }),
            renderRadioGroup({
              name: 'plan',
              label: 'Plan',
              items: ['Free', 'Pro', 'Enterprise'],
              selected: 'Pro',
            }),
            renderToggle({ name: 'notifications', label: 'Email notifications', checked: true }),
          ].join('\n'),
          code: trim(`
renderCheckbox({   name: 'terms',         label: '...' })
renderRadioGroup({ name: 'plan',          items: [...], selected: 'Pro' })
renderToggle({     name: 'notifications', checked: true })`),
        },
      ],
    },
    {
      id: 'sec-feedback',
      category: 'feedback',
      title: 'Feedback',
      description:
        'Inline alerts, native progress, CSS spinners, skeletons, and an animated progress bar that ticks via setInterval bound to a signal.',
      demos: [
        {
          caption: 'Alerts',
          layout: 'stack',
          html: [
            renderAlert('This is an informational message.', { variant: 'info' }),
            renderAlert('Operation completed successfully.', { variant: 'success' }),
            renderAlert('Proceed with caution.', { variant: 'warning' }),
            renderAlert('Something went wrong.', { variant: 'error', dismissible: true }),
          ].join('\n'),
          code: trim(`
renderAlert('Saved.',   { variant: 'success' })
renderAlert('Heads up.',{ variant: 'warning' })
renderAlert('Failed.',  { variant: 'error', dismissible: true })`),
        },
        {
          caption: 'Live progress (signal-driven)',
          layout: 'stack',
          html: `
${renderProgress({ value: 0, max: 100, label: 'Uploading…', attrs: 'data-bn-live-progress' })}
<nav data-bn-demo-row aria-label="Progress controls">
  ${renderButton('Pause / play', { variant: 'secondary', attrs: 'data-bn-action="progress-toggle"' })}
  ${renderButton('Reset', { variant: 'ghost', attrs: 'data-bn-action="progress-reset"' })}
</nav>`,
          code: trim(`
const v = signal(0);
effect(() => bar.value = v());
setInterval(() => v.set(p => (p + 5) % 105), 200);`),
        },
        {
          caption: 'Spinners',
          layout: 'row',
          html: [
            renderSpinner({ size: 'sm', label: 'Loading' }),
            renderSpinner({ label: 'Loading' }),
            renderSpinner({ size: 'lg', label: 'Loading' }),
          ].join('\n'),
          code: trim(`renderSpinner({ size: 'lg', label: 'Loading' })`),
        },
        {
          caption: 'Skeleton',
          layout: 'stack',
          html: renderSkeleton({ width: '100%', height: '1rem', count: 3 }),
          code: trim(`renderSkeleton({ width: '100%', height: '1rem', count: 3 })`),
        },
      ],
    },
    {
      id: 'sec-layout',
      category: 'layout',
      title: 'Cards & layout',
      description:
        'Article-shaped cards, accordions built on the native details element, and ARIA tablists with arrow-key navigation.',
      demos: [
        {
          caption: 'Card',
          layout: 'card',
          html: renderCard({
            header: 'Card Title',
            body: '<p>Card body content with descriptive text about the feature or item being presented.</p>',
            footer: 'Updated 2 hours ago',
          }),
          code: trim(`renderCard({ header, body, footer })`),
        },
        {
          caption: 'Accordion (native <details>)',
          layout: 'form',
          html: renderAccordion({
            items: [
              {
                title: 'What is BaseNative?',
                content:
                  'A signal-based runtime over native HTML — ~120 lines for the core primitives.',
              },
              {
                title: 'How does SSR work?',
                content:
                  'The server renderer evaluates @if, @for, @switch directives at request time and emits clean HTML with hydration markers.',
              },
              {
                title: 'What about hydration?',
                content:
                  'hydrate() walks the DOM, binds reactive expressions, and attaches event handlers without reconstructing the tree.',
              },
            ],
          }),
          code: trim(`renderAccordion({ items: [{ title, content }, ...] })`),
        },
        {
          caption: 'Tabs (arrow-key navigation)',
          layout: 'plain',
          html: renderTabs({
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
          code: trim(`renderTabs({ tabs: [{ id, label, content }, ...] })`),
        },
      ],
    },
    {
      id: 'sec-nav',
      category: 'navigation',
      title: 'Navigation',
      description:
        'Wayfinding primitives wrapped in a semantic nav element with proper aria-label and aria-current wiring.',
      demos: [
        {
          caption: 'Breadcrumb',
          layout: 'plain',
          html: renderBreadcrumb({
            items: [
              { label: 'Home', href: '/' },
              { label: 'Components', href: '/components' },
              { label: 'Showcase' },
            ],
          }),
          code: trim(`renderBreadcrumb({ items: [{ label, href }, ...] })`),
        },
        {
          caption: 'Pagination',
          layout: 'plain',
          html: renderPagination({ currentPage: 3, totalPages: 10, baseUrl: '/showcase' }),
          code: trim(`renderPagination({ currentPage: 3, totalPages: 10, baseUrl: '/items' })`),
        },
      ],
    },
    {
      id: 'sec-data',
      category: 'data',
      title: 'Data display',
      description:
        'From a basic table to a sortable data grid, an aria-tree, and a windowed virtual list of 200 rows.',
      demos: [
        {
          caption: 'Table',
          layout: 'plain',
          html: renderTable({
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
          code: trim(`renderTable({ columns: [...], rows: [...], caption: 'Team members' })`),
        },
        {
          caption: 'Data grid (sortable + selectable)',
          layout: 'plain',
          html: renderDataGrid({
            columns: [
              { key: 'task', label: 'Task', sortable: true },
              { key: 'assignee', label: 'Assignee', sortable: true },
              { key: 'priority', label: 'Priority' },
              { key: 'status', label: 'Status' },
            ],
            rows: [
              {
                id: 1,
                task: 'Design token system',
                assignee: 'Alice',
                priority: 'High',
                status: 'Done',
              },
              {
                id: 2,
                task: 'Signal reactivity',
                assignee: 'Bob',
                priority: 'High',
                status: 'Done',
              },
              {
                id: 3,
                task: 'Server rendering',
                assignee: 'Carol',
                priority: 'Medium',
                status: 'Active',
              },
              {
                id: 4,
                task: 'Client hydration',
                assignee: 'Dan',
                priority: 'Medium',
                status: 'Pending',
              },
              {
                id: 5,
                task: 'Component library',
                assignee: 'Alice',
                priority: 'Low',
                status: 'Active',
              },
            ],
            sortBy: 'task',
            sortDir: 'asc',
            selectable: true,
            caption: 'Project tasks',
          }),
          code: trim(
            `renderDataGrid({ columns, rows, sortBy: 'task', sortDir: 'asc', selectable: true })`,
          ),
        },
        {
          caption: 'Tree',
          layout: 'card',
          html: renderTree({
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
          code: trim(
            `renderTree({ items: [...], expanded: new Set(['1', '1-1']), selected: '1-1-1' })`,
          ),
        },
        {
          caption: 'Virtual list (200 rows, windowed)',
          layout: 'form',
          html: renderVirtualList({
            items: Array.from(
              { length: 200 },
              (_, i) => `Row ${i + 1} — generated server-side, scrolled client-side`,
            ),
            itemHeight: 44,
            containerHeight: 240,
          }),
          code: trim(`renderVirtualList({ items: [...], itemHeight: 44, containerHeight: 240 })`),
        },
      ],
    },
    {
      id: 'sec-overlays',
      category: 'overlays',
      title: 'Overlays',
      description:
        'Native dialog, drawer that slides in, popover-anchored menus and tooltips, and a Cmd+K command palette.',
      demos: [
        {
          caption: 'Dialog (native showModal)',
          layout: 'plain',
          html: `
${renderButton('Open dialog', { variant: 'secondary', attrs: 'data-bn-action="open-dialog" data-bn-target="demo-dialog"' })}
${renderDialog({
  title: 'Confirm action',
  content: '<p>Are you sure you want to proceed? This cannot be undone.</p>',
  footer:
    renderButton('Cancel', { variant: 'secondary' }) +
    ' ' +
    renderButton('Confirm', { variant: 'primary' }),
  id: 'demo-dialog',
})}`,
          code: trim(`
const d = renderDialog({ title, content, footer, id: 'my-dialog' });
document.getElementById('my-dialog').showModal();`),
        },
        {
          caption: 'Drawer (slide-in)',
          layout: 'plain',
          html: `
${renderButton('Open drawer', { variant: 'secondary', attrs: 'data-bn-action="open-drawer" data-bn-target="demo-drawer"' })}
${renderDrawer({
  title: 'Settings',
  content: '<p>Drawer body content goes here. This slides in from the edge of the viewport.</p>',
  position: 'right',
  id: 'demo-drawer',
})}`,
          code: trim(`renderDrawer({ title, content, position: 'right' })`),
        },
        {
          caption: 'Dropdown menu (Popover API)',
          layout: 'plain',
          html: renderDropdownMenu({
            trigger: 'Actions',
            items: [
              { label: 'Edit', action: 'edit', icon: '\u{270F}\u{FE0F}' },
              { label: 'Duplicate', action: 'duplicate', icon: '\u{1F4CB}' },
              { separator: true },
              { label: 'Delete', action: 'delete', icon: '\u{1F5D1}\u{FE0F}' },
            ],
          }),
          code: trim(
            `renderDropdownMenu({ trigger: 'Actions', items: [{ label, action, icon }, ...] })`,
          ),
        },
        {
          caption: 'Tooltip',
          layout: 'plain',
          html: renderTooltip({
            trigger: renderButton('Hover or focus', { variant: 'secondary' }),
            content: 'This is a tooltip with helpful context. Triggers on hover or focus.',
            position: 'top',
          }),
          code: trim(`renderTooltip({ trigger, content, position: 'top' })`),
        },
        {
          caption: 'Command palette',
          layout: 'plain',
          html: `
${renderButton('Open command palette', { variant: 'secondary', attrs: 'data-bn-action="open-command-palette" data-bn-target="demo-cmd"' })}
<kbd>Ctrl</kbd> + <kbd>K</kbd>
${renderCommandPalette({
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
    { label: 'Search', action: 'search', group: 'Actions', icon: '\u{1F50D}', shortcut: 'Ctrl+K' },
  ],
  id: 'demo-cmd',
})}`,
          code: trim(
            `renderCommandPalette({ commands: [{ label, action, group, shortcut }, ...] })`,
          ),
        },
        {
          caption: 'Toasts (live region)',
          layout: 'stack',
          html: `
<nav data-bn-demo-row aria-label="Toast triggers">
  ${renderButton('Info', { variant: 'secondary', attrs: 'data-bn-action="toast" data-bn-message="For your information." data-bn-variant="info"' })}
  ${renderButton('Success', { variant: 'primary', attrs: 'data-bn-action="toast" data-bn-message="All good — saved." data-bn-variant="success"' })}
  ${renderButton('Error', { variant: 'destructive', attrs: 'data-bn-action="toast" data-bn-message="Something went sideways." data-bn-variant="error"' })}
</nav>`,
          code: trim(`
import { showToast } from '@basenative/components';
showToast({ message: 'Saved.', variant: 'success' });`),
        },
      ],
    },
    {
      id: 'sec-blocks',
      category: 'data',
      title: 'Block components',
      description:
        'Higher-order layouts: a layout grid, a week calendar, and a pipeline board — all server-rendered, all on native primitives.',
      demos: [
        {
          caption: 'Layout grid (6-col)',
          layout: 'plain',
          html: renderLayoutGrid({
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
          code: trim(
            `renderLayoutGrid({ columns: 6, cells: [{ id, label, colSpan, rowSpan }, ...] })`,
          ),
        },
        {
          caption: 'Week calendar',
          layout: 'plain',
          html: renderCalendar({
            startDate,
            events: calendarEvents(startDate),
            hours: { start: 8, end: 18 },
          }),
          code: trim(`renderCalendar({ startDate, events: [...], hours: { start: 8, end: 18 } })`),
        },
        {
          caption: 'Pipeline board',
          layout: 'plain',
          html: renderPipeline({
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
          code: trim(
            `renderPipeline({ columns: [...], cards: [{ id, columnId, title, ... }, ...] })`,
          ),
        },
      ],
    },
    {
      id: 'sec-live',
      category: 'live',
      title: 'Live runtime',
      description:
        'Pure-runtime demos that prove signals + effects work without virtual DOM, without rebuilds, without classes.',
      demos: [
        {
          caption: 'Live clock (signal + setInterval)',
          layout: 'stack',
          html: `
<time data-bn-clock aria-live="polite">--:--:--</time>
<p data-bn-clock-note>Updates every second. The &lt;time&gt; element is server-rendered with a placeholder; hydration takes over on the client.</p>`,
          code: trim(`
const time = signal(new Date());
effect(() => el.textContent = time().toLocaleTimeString());
setInterval(() => time.set(new Date()), 1000);`),
        },
        {
          caption: 'Theme picker (CSS custom property swap)',
          layout: 'stack',
          html: `
<nav data-bn-demo-row aria-label="Pick an accent">
  ${renderButton('Amber', { variant: 'secondary', attrs: 'data-bn-action="theme" data-bn-accent="#e8a44a"' })}
  ${renderButton('Mint', { variant: 'secondary', attrs: 'data-bn-action="theme" data-bn-accent="#7fd1a8"' })}
  ${renderButton('Sky', { variant: 'secondary', attrs: 'data-bn-action="theme" data-bn-accent="#82aaff"' })}
  ${renderButton('Rose', { variant: 'secondary', attrs: 'data-bn-action="theme" data-bn-accent="#f07178"' })}
  ${renderButton('Reset', { variant: 'ghost', attrs: 'data-bn-action="theme" data-bn-accent=""' })}
</nav>
<output data-bn-theme-preview>
  ${renderBadge('Live preview', { variant: 'primary' })}
  ${renderButton('Buttons re-tint', { variant: 'primary' })}
  ${renderButton('Outlines re-tint', { variant: 'secondary' })}
</output>`,
          code: trim(`
btn.onclick = (e) => {
  document.documentElement.style
    .setProperty('--accent', e.target.dataset.bnAccent);
};`),
        },
        {
          caption: 'Computed signals (counter → doubled / parity)',
          layout: 'stack',
          html: `
<dl data-bn-counter-readout>
  <dt>Value</dt>     <dd data-bn-counter-value>0</dd>
  <dt>Doubled</dt>   <dd data-bn-counter-doubled>0</dd>
  <dt>Parity</dt>    <dd data-bn-counter-parity data-parity="even">even</dd>
</dl>
<nav data-bn-demo-row aria-label="Computed counter controls">
  ${renderButton('−', { variant: 'secondary', attrs: 'data-bn-action="cc-dec" aria-label="Decrement"' })}
  ${renderButton('+', { variant: 'primary', attrs: 'data-bn-action="cc-inc" aria-label="Increment"' })}
</nav>`,
          code: trim(`
const n       = signal(0);
const doubled = computed(() => n() * 2);
const parity  = computed(() => n() % 2 === 0 ? 'even' : 'odd');
effect(() => { value.textContent = n();
               doubledEl.textContent = doubled();
               parityEl.textContent = parity(); });`),
        },
      ],
    },
  ];
}

export function getShowcaseContext() {
  const sections = getShowcaseSections();
  return {
    sections,
    toastContainer: renderToastContainer('top-right'),
    packageCount: PACKAGES.length,
    packageCards: renderPackageCards(),
  };
}
