/**
 * Per-component live demos for /components/:slug pages.
 * Each entry returns { html, code } where html is rendered into the demo
 * area and code is the source snippet shown alongside it.
 */
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
} from '../../packages/components/src/index.js';

const code = (s) => s.trim();

export const demos = {
  button: () => ({
    examples: [
      {
        title: 'Variants',
        description: 'Primary, secondary, destructive, and ghost.',
        html: [
          renderButton('Primary', { variant: 'primary' }),
          renderButton('Secondary', { variant: 'secondary' }),
          renderButton('Destructive', { variant: 'destructive' }),
          renderButton('Ghost', { variant: 'ghost' }),
        ].join(' '),
        code: code(`
renderButton('Primary',     { variant: 'primary' })
renderButton('Secondary',   { variant: 'secondary' })
renderButton('Destructive', { variant: 'destructive' })
renderButton('Ghost',       { variant: 'ghost' })
        `),
      },
      {
        title: 'Disabled',
        description: 'Adds the disabled attribute and a reduced-emphasis style.',
        html: [
          renderButton('Disabled', { variant: 'primary', disabled: true }),
          renderButton('Disabled', { variant: 'secondary', disabled: true }),
        ].join(' '),
        code: code(`renderButton('Disabled', { variant: 'primary', disabled: true })`),
      },
      {
        title: 'Interactive counter',
        description:
          'Click events wired in client-side script. Demonstrates that the component is a real button element, not a div with click handlers.',
        html: `
<output data-bn-demo-counter aria-live="polite">0</output>
<nav data-bn-demo-row>
  ${renderButton('-', { variant: 'secondary', attrs: 'data-bn-demo-dec' })}
  ${renderButton('+', { variant: 'primary', attrs: 'data-bn-demo-inc' })}
  ${renderButton('Reset', { variant: 'ghost', attrs: 'data-bn-demo-reset' })}
</nav>`,
        code: code(`
const count = signal(0);
effect(() => output.textContent = count());
inc.onclick = () => count.set(count() + 1);
dec.onclick = () => count.set(count() - 1);
        `),
      },
    ],
  }),

  input: () => ({
    examples: [
      {
        title: 'With help text',
        description: 'Label, help text, and placeholder.',
        html: renderInput({
          name: 'demo-email',
          label: 'Email',
          type: 'email',
          placeholder: 'you@example.com',
          helpText: 'We will never share your email.',
        }),
        code: code(
          `renderInput({ name: 'email', label: 'Email', type: 'email', helpText: '...' })`,
        ),
      },
      {
        title: 'Error state',
        description: 'aria-invalid="true" plus an error message linked to aria-describedby.',
        html: renderInput({
          name: 'demo-username',
          label: 'Username',
          value: 'ab',
          error: 'Must be at least 3 characters.',
        }),
        code: code(
          `renderInput({ name: 'username', label: 'Username', value: 'ab', error: '...' })`,
        ),
      },
      {
        title: 'Live character count',
        description: 'Hydrated with a signal that mirrors input length.',
        html: `
${renderInput({ name: 'demo-bio', label: 'Bio', placeholder: 'Tell us a bit about yourself…', attrs: 'maxlength="120" data-bn-demo-bio' })}
<output data-bn-demo-bio-count aria-live="polite">0 / 120</output>`,
        code: code(`
const text = signal('');
effect(() => count.textContent = text().length + ' / 120');
input.oninput = (e) => text.set(e.target.value);
        `),
      },
    ],
  }),

  textarea: () => ({
    examples: [
      {
        title: 'Auto-sizing',
        description: 'Uses field-sizing: content so the textarea grows with its value.',
        html: renderTextarea({
          name: 'demo-message',
          label: 'Message',
          placeholder: 'Type a longer message and watch this textarea grow with the content…',
          rows: 3,
        }),
        code: code(`renderTextarea({ name: 'message', label: 'Message', rows: 3 })`),
      },
    ],
  }),

  select: () => ({
    examples: [
      {
        title: 'Native select',
        description:
          'Picks up appearance: base-select on supporting browsers for a custom popup, otherwise falls back to the platform select.',
        html: renderSelect({
          name: 'demo-role',
          label: 'Role',
          items: ['Admin', 'Editor', 'Viewer'],
          placeholder: 'Choose a role',
        }),
        code: code(
          `renderSelect({ name: 'role', label: 'Role', items: ['Admin', 'Editor', 'Viewer'] })`,
        ),
      },
    ],
  }),

  checkbox: () => ({
    examples: [
      {
        title: 'Single checkbox',
        description: 'Native input[type=checkbox] with a custom indicator drawn from CSS.',
        html: renderCheckbox({ name: 'demo-terms', label: 'I agree to the terms and conditions' }),
        code: code(`renderCheckbox({ name: 'terms', label: 'I agree to the terms' })`),
      },
    ],
  }),

  radio: () => ({
    examples: [
      {
        title: 'Plan picker',
        description: 'Grouped radios inside a fieldset/legend.',
        html: renderRadioGroup({
          name: 'demo-plan',
          label: 'Plan',
          items: ['Free', 'Pro', 'Enterprise'],
          selected: 'Pro',
        }),
        code: code(
          `renderRadioGroup({ name: 'plan', label: 'Plan', items: [...], selected: 'Pro' })`,
        ),
      },
    ],
  }),

  toggle: () => ({
    examples: [
      {
        title: 'Switch role',
        description: 'role="switch" — same data shape as checkbox, different semantics.',
        html: renderToggle({
          name: 'demo-notifications',
          label: 'Email notifications',
          checked: true,
        }),
        code: code(`renderToggle({ name: 'notifications', label: '...', checked: true })`),
      },
    ],
  }),

  combobox: () => ({
    examples: [
      {
        title: 'Filterable select',
        description: 'Type to filter; arrow keys to navigate; enter to select.',
        html: renderCombobox({
          name: 'demo-framework',
          label: 'Framework',
          items: ['Angular', 'React', 'Vue', 'Svelte', 'Solid', 'Lit', 'Qwik', 'Astro'],
          placeholder: 'Search frameworks…',
        }),
        code: code(`renderCombobox({ name: 'framework', label: 'Framework', items: [...] })`),
      },
    ],
  }),

  multiselect: () => ({
    examples: [
      {
        title: 'Tag picker',
        description: 'Type to filter, click to add a chip, click × on the chip to remove.',
        html: renderMultiselect({
          name: 'demo-tags',
          label: 'Tags',
          items: ['JavaScript', 'TypeScript', 'CSS', 'HTML', 'Node.js', 'Deno', 'Bun'],
          selected: ['JavaScript', 'CSS'],
        }),
        code: code(
          `renderMultiselect({ name: 'tags', label: 'Tags', items: [...], selected: [...] })`,
        ),
      },
    ],
  }),

  alert: () => ({
    examples: [
      {
        title: 'Variants',
        description: 'Info, success, warning, error. The error variant is dismissible.',
        html: [
          renderAlert('This is an informational message.', { variant: 'info' }),
          renderAlert('Operation completed successfully.', { variant: 'success' }),
          renderAlert('Proceed with caution.', { variant: 'warning' }),
          renderAlert('Something went wrong.', { variant: 'error', dismissible: true }),
        ].join(''),
        code: code(`
renderAlert('Saved.',         { variant: 'success' })
renderAlert('Heads up.',      { variant: 'warning' })
renderAlert('Failed.',        { variant: 'error', dismissible: true })
        `),
      },
    ],
  }),

  progress: () => ({
    examples: [
      {
        title: 'Determinate',
        description: 'Native <progress> element, themed with custom properties.',
        html: renderProgress({ value: 65, max: 100, label: 'Upload progress' }),
        code: code(`renderProgress({ value: 65, max: 100, label: 'Upload progress' })`),
      },
      {
        title: 'Animated demo',
        description: 'Hydrated with a signal that ticks from 0 to 100. Resets on click.',
        html: `
${renderProgress({ value: 0, max: 100, label: 'Demo progress', attrs: 'data-bn-demo-progress' })}
<nav data-bn-demo-row>
  ${renderButton('Reset', { variant: 'secondary', attrs: 'data-bn-demo-progress-reset' })}
</nav>`,
        code: code(`
const v = signal(0);
effect(() => bar.value = v());
setInterval(() => v.set((v() + 5) % 105), 200);
        `),
      },
    ],
  }),

  spinner: () => ({
    examples: [
      {
        title: 'Sizes',
        description: 'CSS-only spinner with three sizes.',
        html: `<div data-bn-demo-row>
          ${renderSpinner({ size: 'sm', label: 'Loading' })}
          ${renderSpinner({ size: 'md', label: 'Loading' })}
          ${renderSpinner({ size: 'lg', label: 'Loading' })}
        </div>`,
        code: code(`renderSpinner({ size: 'lg', label: 'Loading' })`),
      },
    ],
  }),

  skeleton: () => ({
    examples: [
      {
        title: 'Three lines',
        description: 'Animated placeholder rows with a shimmer.',
        html: renderSkeleton({ width: '100%', height: '1rem', count: 3 }),
        code: code(`renderSkeleton({ width: '100%', height: '1rem', count: 3 })`),
      },
    ],
  }),

  badge: () => ({
    examples: [
      {
        title: 'Variants',
        description: 'Default, primary, success, warning, error.',
        html: [
          renderBadge('Default', { variant: 'default' }),
          renderBadge('Primary', { variant: 'primary' }),
          renderBadge('Success', { variant: 'success' }),
          renderBadge('Warning', { variant: 'warning' }),
          renderBadge('Error', { variant: 'error' }),
        ].join(' '),
        code: code(`renderBadge('Active', { variant: 'success' })`),
      },
    ],
  }),

  card: () => ({
    examples: [
      {
        title: 'Article with header, body, footer',
        description: 'Built on the article element. Hover lifts the border.',
        html: renderCard({
          header: 'Card Title',
          body: '<p>Card body content with descriptive text about the feature or item being presented.</p>',
          footer: 'Updated 2 hours ago',
        }),
        code: code(`renderCard({ header, body, footer })`),
      },
    ],
  }),

  accordion: () => ({
    examples: [
      {
        title: 'Exclusive (one open at a time)',
        description: 'Built on native <details>/<summary> with a shared name attribute.',
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
        code: code(`renderAccordion({ items: [{ title, content }, ...] })`),
      },
    ],
  }),

  tabs: () => ({
    examples: [
      {
        title: 'Three tabs',
        description:
          'role="tablist", role="tab", role="tabpanel", arrow-key navigation, hidden panels via the hidden attribute.',
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
        code: code(`renderTabs({ tabs: [{ id, label, content }, ...] })`),
      },
    ],
  }),

  avatar: () => ({
    examples: [
      {
        title: 'Sizes',
        description:
          'Initials fallback derived from the name; supports an optional src for a real image.',
        html: `<div data-bn-demo-row>
          ${renderAvatar({ name: 'Alice Johnson', size: 'sm' })}
          ${renderAvatar({ name: 'Bob Smith' })}
          ${renderAvatar({ name: 'Carol Davis', size: 'lg' })}
          ${renderAvatar({ name: 'Dan Lee', size: 'xl' })}
        </div>`,
        code: code(`renderAvatar({ name: 'Alice Johnson', size: 'lg' })`),
      },
    ],
  }),

  breadcrumb: () => ({
    examples: [
      {
        title: 'Hierarchical path',
        description:
          'Ordered list of links inside a nav element. Final crumb has aria-current="page".',
        html: renderBreadcrumb({
          items: [
            { label: 'Home', href: '/' },
            { label: 'Components', href: '/components' },
            { label: 'Breadcrumb' },
          ],
        }),
        code: code(`renderBreadcrumb({ items: [{ label, href }, ...] })`),
      },
    ],
  }),

  pagination: () => ({
    examples: [
      {
        title: 'Page 3 of 10',
        description: 'First, prev, page numbers with ellipsis, next, last.',
        html: renderPagination({ currentPage: 3, totalPages: 10, baseUrl: '#' }),
        code: code(`renderPagination({ currentPage: 3, totalPages: 10, baseUrl: '/items' })`),
      },
    ],
  }),

  'command-palette': () => ({
    examples: [
      {
        title: 'Cmd+K palette',
        description: 'Modal dialog with grouped commands and a fuzzy filter.',
        html: `
${renderButton('Open command palette', { variant: 'secondary', attrs: `onclick="document.getElementById('demo-cmd-page').showModal()"` })}
${renderCommandPalette({
  commands: [
    { label: 'Go to Home', action: 'home', group: 'Navigation', icon: '🏠' },
    { label: 'Go to Showcase', action: 'showcase', group: 'Navigation', icon: '✨' },
    { label: 'New Task', action: 'new-task', group: 'Actions', icon: '➕', shortcut: 'Ctrl+N' },
    { label: 'Search', action: 'search', group: 'Actions', icon: '🔍', shortcut: 'Ctrl+K' },
  ],
  id: 'demo-cmd-page',
})}`,
        code: code(`renderCommandPalette({ commands: [{ label, action, group, shortcut }, ...] })`),
      },
    ],
  }),

  table: () => ({
    examples: [
      {
        title: 'Team members',
        description: 'Native <table> with caption, thead/tbody, sticky header.',
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
        code: code(`renderTable({ columns: [...], rows: [...], caption: '...' })`),
      },
    ],
  }),

  datagrid: () => ({
    examples: [
      {
        title: 'Sortable, selectable rows',
        description: 'Native table with sort indicators and a checkbox column for selection.',
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
            { id: 2, task: 'Signal reactivity', assignee: 'Bob', priority: 'High', status: 'Done' },
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
        code: code(`renderDataGrid({ columns, rows, sortBy, sortDir, selectable: true })`),
      },
    ],
  }),

  tree: () => ({
    examples: [
      {
        title: 'File tree',
        description: 'role="tree" with expandable nodes, icons, and selection state.',
        html: renderTree({
          items: [
            {
              id: '1',
              label: 'src',
              icon: '📁',
              children: [
                {
                  id: '1-1',
                  label: 'runtime',
                  icon: '📁',
                  children: [
                    { id: '1-1-1', label: 'signals.js', icon: '📄' },
                    { id: '1-1-2', label: 'hydrate.js', icon: '📄' },
                    { id: '1-1-3', label: 'bind.js', icon: '📄' },
                  ],
                },
                {
                  id: '1-2',
                  label: 'server',
                  icon: '📁',
                  children: [{ id: '1-2-1', label: 'render.js', icon: '📄' }],
                },
              ],
            },
            { id: '2', label: 'examples', icon: '📁' },
          ],
          expanded: new Set(['1', '1-1']),
          selected: '1-1-1',
        }),
        code: code(`renderTree({ items: [...], expanded: Set, selected: id })`),
      },
    ],
  }),

  'virtual-list': () => ({
    examples: [
      {
        title: 'Windowed 1,000 rows',
        description: 'Only the visible slice is in the DOM. Scroll to see new rows materialize.',
        html: renderVirtualList({
          items: Array.from({ length: 1000 }, (_, i) => `Item ${i + 1}`),
          itemHeight: 40,
          containerHeight: 240,
        }),
        code: code(`renderVirtualList({ items, itemHeight: 40, containerHeight: 240 })`),
      },
    ],
  }),

  dialog: () => ({
    examples: [
      {
        title: 'Modal dialog',
        description: 'Native <dialog> opened with showModal(). Backdrop click and Escape close it.',
        html: `
${renderButton('Open dialog', { variant: 'secondary', attrs: `onclick="document.getElementById('demo-dialog-page').showModal()"` })}
${renderDialog({
  title: 'Confirm action',
  content: '<p>Are you sure you want to proceed? This cannot be undone.</p>',
  footer:
    renderButton('Cancel', {
      variant: 'secondary',
      attrs: `onclick="document.getElementById('demo-dialog-page').close()"`,
    }) +
    ' ' +
    renderButton('Confirm', {
      variant: 'primary',
      attrs: `onclick="document.getElementById('demo-dialog-page').close()"`,
    }),
  id: 'demo-dialog-page',
})}`,
        code: code(`
const d = renderDialog({ title, content, footer })
// d.showModal() to open, d.close() to dismiss
        `),
      },
    ],
  }),

  drawer: () => ({
    examples: [
      {
        title: 'Right-side drawer',
        description: 'Slides in from the edge. Click the overlay or the close button to dismiss.',
        html: `
${renderButton('Open drawer', { variant: 'secondary', attrs: 'data-bn-demo-drawer-open' })}
${renderDrawer({
  title: 'Settings',
  content:
    '<p>Drawer body content goes here. Useful for secondary tasks where a full modal would be excessive.</p>',
  position: 'right',
  id: 'demo-drawer-page',
})}`,
        code: code(`renderDrawer({ title, content, position: 'right' })`),
      },
    ],
  }),

  'dropdown-menu': () => ({
    examples: [
      {
        title: 'Action menu',
        description: 'Built on the Popover API. Anchored to its trigger.',
        html: renderDropdownMenu({
          trigger: 'Actions',
          items: [
            { label: 'Edit', action: 'edit', icon: '✏️' },
            { label: 'Duplicate', action: 'duplicate', icon: '📋' },
            { separator: true },
            { label: 'Delete', action: 'delete', icon: '🗑️' },
          ],
        }),
        code: code(`renderDropdownMenu({ trigger, items: [{ label, action, icon }, ...] })`),
      },
    ],
  }),

  tooltip: () => ({
    examples: [
      {
        title: 'Hover for context',
        description: 'role="tooltip" anchored to its trigger via the Popover API.',
        html: renderTooltip({
          trigger: renderButton('Hover or focus me', { variant: 'secondary' }),
          content: 'This is a tooltip with helpful context.',
          position: 'top',
        }),
        code: code(`renderTooltip({ trigger, content, position: 'top' })`),
      },
    ],
  }),

  toast: () => ({
    examples: [
      {
        title: 'Live region',
        description: 'Click the buttons to push toasts. They auto-dismiss after a few seconds.',
        html: `
<nav data-bn-demo-row>
  ${renderButton('Info toast', { variant: 'secondary', attrs: `data-bn-demo-toast="info"` })}
  ${renderButton('Success toast', { variant: 'primary', attrs: `data-bn-demo-toast="success"` })}
  ${renderButton('Error toast', { variant: 'destructive', attrs: `data-bn-demo-toast="error"` })}
</nav>
${renderToastContainer('top-right')}`,
        code: code(`
import { showToast } from '@basenative/components';
showToast({ message: 'Saved.', variant: 'success' });
        `),
      },
    ],
  }),
};

export function getDemo(slug) {
  const fn = demos[slug];
  return fn ? fn() : null;
}
