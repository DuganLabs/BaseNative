/**
 * Per-component live demos for /components/:slug pages.
 *
 * Each entry returns:
 *   {
 *     quickstart: string,  // import + minimal usage
 *     examples: [{ title, description, html, code, scripted? }]
 *   }
 *
 * Demos that need post-render JS reference scripted: <slug-key>; the matching
 * script lives in the demoScripts() helper in server.js.
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

const code = (s) => s.replace(/^\n+/, '').replace(/\n+$/, '');

export const demos = {
  button: () => ({
    quickstart: code(`
import { renderButton } from '@basenative/components';

renderButton('Save', { variant: 'primary' });
    `),
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
        description: 'Sets the disabled attribute and reduces emphasis.',
        html: [
          renderButton('Disabled', { variant: 'primary', disabled: true }),
          renderButton('Disabled', { variant: 'secondary', disabled: true }),
        ].join(' '),
        code: code(`renderButton('Disabled', { variant: 'primary', disabled: true })`),
      },
      {
        title: 'Interactive counter',
        description:
          'Click events wired to a signal. The button is a real <button> element — no div with onclick.',
        scripted: 'button-counter',
        html: `
<output data-bn-demo-counter aria-live="polite" data-demo-display>0</output>
<nav data-bn-demo-row>
  ${renderButton('−', { variant: 'secondary', attrs: 'data-bn-demo-dec aria-label="Decrement"' })}
  ${renderButton('+', { variant: 'primary', attrs: 'data-bn-demo-inc aria-label="Increment"' })}
  ${renderButton('Reset', { variant: 'ghost', attrs: 'data-bn-demo-reset' })}
</nav>`,
        code: code(`
import { signal, effect } from '@basenative/runtime';

const count = signal(0);
effect(() => out.textContent = count());

inc.onclick   = () => count.set(count() + 1);
dec.onclick   = () => count.set(count() - 1);
reset.onclick = () => count.set(0);
        `),
      },
    ],
  }),

  input: () => ({
    quickstart: code(`
import { renderInput } from '@basenative/components';

renderInput({ name: 'email', label: 'Email', type: 'email' });
    `),
    examples: [
      {
        title: 'With help text',
        description: 'Label, help text, and placeholder rendered into a <label> + <input>.',
        html: renderInput({
          name: 'demo-email',
          label: 'Email',
          type: 'email',
          placeholder: 'you@example.com',
          helpText: 'We will never share your email.',
        }),
        code: code(`
renderInput({
  name: 'email',
  label: 'Email',
  type: 'email',
  placeholder: 'you@example.com',
  helpText: 'We will never share your email.',
})
        `),
      },
      {
        title: 'Error state',
        description: 'aria-invalid="true" and an error message linked via aria-describedby.',
        html: renderInput({
          name: 'demo-username',
          label: 'Username',
          value: 'ab',
          error: 'Must be at least 3 characters.',
        }),
        code: code(`
renderInput({
  name: 'username',
  label: 'Username',
  value: 'ab',
  error: 'Must be at least 3 characters.',
})
        `),
      },
      {
        title: 'Live character count',
        description: 'A signal mirrors the input length.',
        scripted: 'input-bio',
        html: `
${renderInput({ name: 'demo-bio', label: 'Bio', placeholder: 'Tell us a bit about yourself…', attrs: 'maxlength="120" data-bn-demo-bio' })}
<output data-bn-demo-bio-count aria-live="polite" data-demo-display>0 / 120</output>`,
        code: code(`
const text = signal('');
effect(() => count.textContent = text().length + ' / 120');

input.oninput = (e) => text.set(e.target.value);
        `),
      },
    ],
  }),

  textarea: () => ({
    quickstart: code(`
import { renderTextarea } from '@basenative/components';

renderTextarea({ name: 'message', label: 'Message', rows: 3 });
    `),
    examples: [
      {
        title: 'Auto-sizing',
        description: 'field-sizing: content lets the textarea grow with its value.',
        html: renderTextarea({
          name: 'demo-message',
          label: 'Message',
          placeholder: 'Type a longer message and watch this textarea grow with the content…',
          rows: 3,
        }),
        code: code(`renderTextarea({ name: 'message', label: 'Message', rows: 3 })`),
      },
      {
        title: 'Live word count',
        description: 'A signal recomputes on every input event.',
        scripted: 'textarea-words',
        html: `
${renderTextarea({ name: 'demo-thoughts', label: 'Thoughts', placeholder: 'Type a paragraph…', rows: 3, attrs: 'data-bn-demo-thoughts' })}
<output data-bn-demo-words aria-live="polite" data-demo-display>0 words · 0 chars</output>`,
        code: code(`
const text  = signal('');
const words = computed(() => text().trim().split(/\\s+/).filter(Boolean).length);

effect(() => out.textContent = words() + ' words · ' + text().length + ' chars');
        `),
      },
    ],
  }),

  select: () => ({
    quickstart: code(`
import { renderSelect } from '@basenative/components';

renderSelect({ name: 'role', label: 'Role', items: ['Admin', 'Editor', 'Viewer'] });
    `),
    examples: [
      {
        title: 'Native select',
        description:
          'Picks up appearance: base-select on supporting browsers, otherwise the platform select.',
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
      {
        title: 'Reactive selection',
        description: 'change events flow into a signal, the read-out updates synchronously.',
        scripted: 'select-reactive',
        html: `
${renderSelect({ name: 'demo-region', label: 'Region', items: ['Americas', 'EMEA', 'APAC'], placeholder: 'Pick a region', attrs: 'data-bn-demo-region' })}
<output data-bn-demo-region-out aria-live="polite" data-demo-display>No region selected</output>`,
        code: code(`
const region = signal('');
effect(() => out.textContent = region() || 'No region selected');

select.onchange = (e) => region.set(e.target.value);
        `),
      },
    ],
  }),

  checkbox: () => ({
    quickstart: code(`
import { renderCheckbox } from '@basenative/components';

renderCheckbox({ name: 'terms', label: 'I agree to the terms' });
    `),
    examples: [
      {
        title: 'Single checkbox',
        description: 'Native input[type=checkbox] with a custom indicator drawn by CSS.',
        html: renderCheckbox({ name: 'demo-terms', label: 'I agree to the terms and conditions' }),
        code: code(`renderCheckbox({ name: 'terms', label: 'I agree to the terms' })`),
      },
      {
        title: 'Reactive consent gate',
        description: 'A submit button disables itself until the checkbox is checked.',
        scripted: 'checkbox-gate',
        html: `
${renderCheckbox({ name: 'demo-consent', label: 'I have read the privacy policy', attrs: 'data-bn-demo-consent' })}
${renderButton('Continue', { variant: 'primary', disabled: true, attrs: 'data-bn-demo-consent-submit' })}`,
        code: code(`
const agreed = signal(false);
effect(() => submit.disabled = !agreed());

checkbox.onchange = (e) => agreed.set(e.target.checked);
        `),
      },
    ],
  }),

  radio: () => ({
    quickstart: code(`
import { renderRadioGroup } from '@basenative/components';

renderRadioGroup({ name: 'plan', label: 'Plan', items: ['Free', 'Pro', 'Enterprise'] });
    `),
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
      {
        title: 'Reactive description',
        description: 'A signal reads the selected radio and updates a description box.',
        scripted: 'radio-plan',
        html: `
${renderRadioGroup({ name: 'demo-tier', label: 'Pricing tier', items: ['Free', 'Pro', 'Enterprise'], selected: 'Free', attrs: 'data-bn-demo-tier' })}
<output data-bn-demo-tier-out aria-live="polite" data-demo-display>Free — 5 projects, community support</output>`,
        code: code(`
const TIERS = {
  Free:       '5 projects, community support',
  Pro:        'Unlimited projects, priority email',
  Enterprise: 'SLA, SAML SSO, dedicated CSM',
};

const tier = signal('Free');
effect(() => out.textContent = tier() + ' — ' + TIERS[tier()]);
        `),
      },
    ],
  }),

  toggle: () => ({
    quickstart: code(`
import { renderToggle } from '@basenative/components';

renderToggle({ name: 'notifications', label: 'Email notifications' });
    `),
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
      {
        title: 'Theme toggle',
        description: 'Mirrors the toggle state into a data attribute on the demo container.',
        scripted: 'toggle-theme',
        html: `
${renderToggle({ name: 'demo-theme', label: 'Dim mode', attrs: 'data-bn-demo-theme' })}
<aside data-bn-demo-theme-card data-demo-display>
  <strong>Surface preview</strong>
  <p>Toggle the switch above to flip this card between bright and dim.</p>
</aside>`,
        code: code(`
const dim = signal(false);
effect(() => card.dataset.dim = dim() ? 'on' : 'off');

toggle.onchange = (e) => dim.set(e.target.checked);
        `),
      },
    ],
  }),

  combobox: () => ({
    quickstart: code(`
import { renderCombobox } from '@basenative/components';

renderCombobox({ name: 'framework', label: 'Framework', items: [...] });
    `),
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
    quickstart: code(`
import { renderMultiselect } from '@basenative/components';

renderMultiselect({ name: 'tags', label: 'Tags', items: [...] });
    `),
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
    quickstart: code(`
import { renderAlert } from '@basenative/components';

renderAlert('Saved.', { variant: 'success' });
    `),
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
renderAlert('Saved.',    { variant: 'success' })
renderAlert('Heads up.', { variant: 'warning' })
renderAlert('Failed.',   { variant: 'error', dismissible: true })
        `),
      },
      {
        title: 'Dismissible queue',
        description: 'Click "Add alert" to push a new dismissible alert into the stack.',
        scripted: 'alert-queue',
        html: `
${renderButton('Add alert', { variant: 'primary', attrs: 'data-bn-demo-alert-push' })}
<section data-bn-demo-alert-stack data-demo-display></section>`,
        code: code(`
const counter = signal(0);

push.onclick = () => {
  counter.set(counter() + 1);
  stack.insertAdjacentHTML(
    'afterbegin',
    renderAlert('Alert #' + counter() + ' just landed.', {
      variant: 'info',
      dismissible: true,
    }),
  );
};
        `),
      },
    ],
  }),

  progress: () => ({
    quickstart: code(`
import { renderProgress } from '@basenative/components';

renderProgress({ value: 65, max: 100, label: 'Upload progress' });
    `),
    examples: [
      {
        title: 'Determinate',
        description: 'Native <progress> element themed with custom properties.',
        html: renderProgress({ value: 65, max: 100, label: 'Upload progress' }),
        code: code(`renderProgress({ value: 65, max: 100, label: 'Upload progress' })`),
      },
      {
        title: 'Animated demo',
        description: 'A signal ticks from 0 to 100 every 200ms. Reset to start over.',
        scripted: 'progress-ticker',
        html: `
${renderProgress({ value: 0, max: 100, label: 'Demo progress', attrs: 'data-bn-demo-progress' })}
<output data-bn-demo-progress-out aria-live="polite" data-demo-display>0%</output>
<nav data-bn-demo-row>
  ${renderButton('Reset', { variant: 'secondary', attrs: 'data-bn-demo-progress-reset' })}
</nav>`,
        code: code(`
const v = signal(0);

effect(() => bar.value = v());
effect(() => out.textContent = v() + '%');

setInterval(() => v.set((v() + 5) % 105), 200);
        `),
      },
    ],
  }),

  spinner: () => ({
    quickstart: code(`
import { renderSpinner } from '@basenative/components';

renderSpinner({ size: 'lg', label: 'Loading' });
    `),
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
    quickstart: code(`
import { renderSkeleton } from '@basenative/components';

renderSkeleton({ width: '100%', height: '1rem', count: 3 });
    `),
    examples: [
      {
        title: 'Three lines',
        description: 'Animated placeholder rows with a shimmer.',
        html: renderSkeleton({ width: '100%', height: '1rem', count: 3 }),
        code: code(`renderSkeleton({ width: '100%', height: '1rem', count: 3 })`),
      },
      {
        title: 'Simulated load',
        description:
          'Click "Reload" to swap the real content out for skeletons for 1.2s, then back.',
        scripted: 'skeleton-load',
        html: `
${renderButton('Reload', { variant: 'secondary', attrs: 'data-bn-demo-skel-reload' })}
<section data-bn-demo-skel-target data-demo-display>
  <h4>Project: Atlas</h4>
  <p>Last updated 12 minutes ago by Carol Davis.</p>
  <p>Status: shipped to staging — ready for review.</p>
</section>`,
        code: code(`
const loading = signal(false);

effect(() => target.innerHTML = loading()
  ? renderSkeleton({ count: 3 })
  : realContentHtml);

reload.onclick = () => {
  loading.set(true);
  setTimeout(() => loading.set(false), 1200);
};
        `),
      },
    ],
  }),

  badge: () => ({
    quickstart: code(`
import { renderBadge } from '@basenative/components';

renderBadge('Active', { variant: 'success' });
    `),
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
      {
        title: 'Live counter badge',
        description: 'A signal drives the badge content as you click.',
        scripted: 'badge-counter',
        html: `
<nav data-bn-demo-row>
  ${renderButton('−', { variant: 'secondary', attrs: 'data-bn-demo-badge-dec aria-label="Decrement"' })}
  ${renderButton('+', { variant: 'primary', attrs: 'data-bn-demo-badge-inc aria-label="Increment"' })}
</nav>
<aside data-demo-display>
  <strong>Inbox</strong>
  <span data-bn-demo-badge-slot></span>
</aside>`,
        code: code(`
const unread = signal(3);

effect(() => slot.innerHTML = renderBadge(unread(), {
  variant: unread() > 5 ? 'error' : 'primary',
}));
        `),
      },
    ],
  }),

  card: () => ({
    quickstart: code(`
import { renderCard } from '@basenative/components';

renderCard({ header: 'Title', body: '<p>Body</p>', footer: 'Updated now' });
    `),
    examples: [
      {
        title: 'Article with header, body, footer',
        description: 'Built on the article element. Hover lifts the border.',
        html: renderCard({
          header: 'Card Title',
          body: '<p>Card body content with descriptive text about the feature or item being presented.</p>',
          footer: 'Updated 2 hours ago',
        }),
        code: code(`
renderCard({
  header: 'Card Title',
  body:   '<p>Card body content…</p>',
  footer: 'Updated 2 hours ago',
})
        `),
      },
      {
        title: 'Live editing',
        description: 'Type in the input to update the card title in real time.',
        scripted: 'card-edit',
        html: `
${renderInput({ name: 'demo-card-title', label: 'Card title', value: 'Project Atlas', attrs: 'data-bn-demo-card-input' })}
<section data-bn-demo-card-slot data-demo-display></section>`,
        code: code(`
const title = signal('Project Atlas');

effect(() => slot.innerHTML = renderCard({
  header: title(),
  body:   '<p>The card title comes from a signal.</p>',
  footer: 'Live preview',
}));

input.oninput = (e) => title.set(e.target.value);
        `),
      },
    ],
  }),

  accordion: () => ({
    quickstart: code(`
import { renderAccordion } from '@basenative/components';

renderAccordion({ items: [{ title: '...', content: '...' }] });
    `),
    examples: [
      {
        title: 'Native disclosure',
        description: 'Built on native <details>/<summary>.',
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
      {
        title: 'Expand / collapse all',
        description: 'A button toggles the open attribute on every <details>.',
        scripted: 'accordion-toggle',
        html: `
<nav data-bn-demo-row>
  ${renderButton('Expand all', { variant: 'secondary', attrs: 'data-bn-demo-acc-expand' })}
  ${renderButton('Collapse all', { variant: 'ghost', attrs: 'data-bn-demo-acc-collapse' })}
</nav>
<section data-bn-demo-acc-slot data-demo-display>
${renderAccordion({
  items: [
    { title: 'Section one', content: 'Body for section one.' },
    { title: 'Section two', content: 'Body for section two.' },
    { title: 'Section three', content: 'Body for section three.' },
  ],
})}
</section>`,
        code: code(`
const open = signal(false);

effect(() => {
  for (const d of slot.querySelectorAll('details')) d.open = open();
});

expandBtn.onclick   = () => open.set(true);
collapseBtn.onclick = () => open.set(false);
        `),
      },
    ],
  }),

  tabs: () => ({
    quickstart: code(`
import { renderTabs } from '@basenative/components';

renderTabs({ tabs: [{ id: 'a', label: 'A', content: '...' }] });
    `),
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
    quickstart: code(`
import { renderAvatar } from '@basenative/components';

renderAvatar({ name: 'Alice Johnson', size: 'lg' });
    `),
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
        code: code(`
renderAvatar({ name: 'Alice Johnson', size: 'sm' })
renderAvatar({ name: 'Bob Smith' })
renderAvatar({ name: 'Carol Davis', size: 'lg' })
renderAvatar({ name: 'Dan Lee', size: 'xl' })
        `),
      },
      {
        title: 'Live initials',
        description: 'Type a name to see the initials recompute.',
        scripted: 'avatar-name',
        html: `
${renderInput({ name: 'demo-avatar-name', label: 'Name', value: 'Ada Lovelace', attrs: 'data-bn-demo-av-input' })}
<aside data-bn-demo-av-slot data-demo-display></aside>`,
        code: code(`
const name = signal('Ada Lovelace');

effect(() => slot.innerHTML = renderAvatar({ name: name(), size: 'xl' }));

input.oninput = (e) => name.set(e.target.value);
        `),
      },
    ],
  }),

  breadcrumb: () => ({
    quickstart: code(`
import { renderBreadcrumb } from '@basenative/components';

renderBreadcrumb({ items: [{ label: 'Home', href: '/' }, { label: 'Page' }] });
    `),
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
    quickstart: code(`
import { renderPagination } from '@basenative/components';

renderPagination({ currentPage: 3, totalPages: 10, baseUrl: '/items' });
    `),
    examples: [
      {
        title: 'Page 3 of 10',
        description: 'First, prev, page numbers with ellipsis, next, last.',
        html: renderPagination({ currentPage: 3, totalPages: 10, baseUrl: '#' }),
        code: code(`renderPagination({ currentPage: 3, totalPages: 10, baseUrl: '/items' })`),
      },
      {
        title: 'Reactive page',
        description: 'Click prev/next to drive a signal; the pager re-renders.',
        scripted: 'pagination-reactive',
        html: `
<section data-bn-demo-pager-slot data-demo-display>
  ${renderPagination({ currentPage: 1, totalPages: 8, baseUrl: '#p' })}
</section>
<output data-bn-demo-pager-out aria-live="polite" data-demo-display>Page 1 of 8</output>`,
        code: code(`
const page = signal(1);

effect(() => {
  slot.innerHTML = renderPagination({ currentPage: page(), totalPages: 8, baseUrl: '#p' });
  out.textContent = 'Page ' + page() + ' of 8';
});

slot.addEventListener('click', (e) => {
  const link = e.target.closest('a[data-page]');
  if (link) { e.preventDefault(); page.set(+link.dataset.page); }
});
        `),
      },
    ],
  }),

  'command-palette': () => ({
    quickstart: code(`
import { renderCommandPalette } from '@basenative/components';

renderCommandPalette({ commands: [{ label: 'Open', action: 'open' }] });
    `),
    examples: [
      {
        title: 'Cmd+K palette',
        description: 'Modal dialog with grouped commands and a fuzzy filter.',
        scripted: 'command-palette',
        html: `
${renderButton('Open command palette', { variant: 'secondary', attrs: `data-bn-demo-cmd-open` })}
<kbd>Ctrl</kbd> + <kbd>K</kbd>
${renderCommandPalette({
  commands: [
    { label: 'Go to Home', action: 'home', group: 'Navigation', icon: '🏠' },
    { label: 'Go to Showcase', action: 'showcase', group: 'Navigation', icon: '✨' },
    { label: 'New Task', action: 'new-task', group: 'Actions', icon: '➕', shortcut: 'Ctrl+N' },
    { label: 'Search', action: 'search', group: 'Actions', icon: '🔍', shortcut: 'Ctrl+K' },
  ],
  id: 'demo-cmd-page',
})}`,
        code: code(`
renderCommandPalette({
  commands: [
    { label: 'Go to Home',  action: 'home',     group: 'Navigation' },
    { label: 'New Task',    action: 'new-task', group: 'Actions', shortcut: 'Ctrl+N' },
  ],
  id: 'cmd',
})

document.getElementById('cmd').showModal();
        `),
      },
    ],
  }),

  table: () => ({
    quickstart: code(`
import { renderTable } from '@basenative/components';

renderTable({ columns: [{ key: 'name', label: 'Name' }], rows: [...] });
    `),
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
      {
        title: 'Live filter',
        description: 'Type a query and only matching rows stay visible.',
        scripted: 'table-filter',
        html: `
${renderInput({ name: 'demo-table-q', label: 'Filter', placeholder: 'Type to filter…', attrs: 'data-bn-demo-table-q' })}
<section data-bn-demo-table-slot data-demo-display>
${renderTable({
  columns: [
    { key: 'name', label: 'Name' },
    { key: 'role', label: 'Role' },
    { key: 'status', label: 'Status' },
  ],
  rows: [
    { name: 'Alice Johnson', role: 'Admin', status: 'Active' },
    { name: 'Bob Smith', role: 'Editor', status: 'Active' },
    { name: 'Carol Davis', role: 'Viewer', status: 'Inactive' },
    { name: 'Dan Lee', role: 'Editor', status: 'Active' },
    { name: 'Eve Martinez', role: 'Admin', status: 'Active' },
  ],
  caption: 'Team members',
})}
</section>`,
        code: code(`
const query = signal('');

effect(() => {
  for (const row of slot.querySelectorAll('tbody tr')) {
    row.hidden = !row.textContent.toLowerCase().includes(query());
  }
});

input.oninput = (e) => query.set(e.target.value.toLowerCase());
        `),
      },
    ],
  }),

  datagrid: () => ({
    quickstart: code(`
import { renderDataGrid } from '@basenative/components';

renderDataGrid({ columns: [...], rows: [...], sortBy: 'task', sortDir: 'asc' });
    `),
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
    quickstart: code(`
import { renderTree } from '@basenative/components';

renderTree({ items: [{ id: '1', label: 'src', children: [...] }] });
    `),
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
    quickstart: code(`
import { renderVirtualList } from '@basenative/components';

renderVirtualList({ items, itemHeight: 40, containerHeight: 240 });
    `),
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
    quickstart: code(`
import { renderDialog } from '@basenative/components';

renderDialog({ title: 'Confirm', content: '...', id: 'confirm' });
document.getElementById('confirm').showModal();
    `),
    examples: [
      {
        title: 'Modal dialog',
        description: 'Native <dialog> opened with showModal(). Backdrop click and Escape close it.',
        scripted: 'dialog-open',
        html: `
${renderButton('Open dialog', { variant: 'secondary', attrs: `data-bn-demo-dialog-open` })}
${renderDialog({
  title: 'Confirm action',
  content: '<p>Are you sure you want to proceed? This cannot be undone.</p>',
  footer:
    renderButton('Cancel', { variant: 'secondary', attrs: 'data-bn-demo-dialog-cancel' }) +
    ' ' +
    renderButton('Confirm', { variant: 'primary', attrs: 'data-bn-demo-dialog-confirm' }),
  id: 'demo-dialog-page',
})}`,
        code: code(`
const dialog = renderDialog({ title, content, footer, id: 'd' });

document.getElementById('d').showModal();
// Native: backdrop click + Escape close it.
        `),
      },
    ],
  }),

  drawer: () => ({
    quickstart: code(`
import { renderDrawer } from '@basenative/components';

renderDrawer({ title: 'Settings', content: '...', position: 'right' });
    `),
    examples: [
      {
        title: 'Right-side drawer',
        description: 'Slides in from the edge. Click the overlay or the close button to dismiss.',
        scripted: 'drawer-open',
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
    quickstart: code(`
import { renderDropdownMenu } from '@basenative/components';

renderDropdownMenu({ trigger: 'Actions', items: [{ label, action }, ...] });
    `),
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
    quickstart: code(`
import { renderTooltip } from '@basenative/components';

renderTooltip({ trigger: 'Help', content: 'Helpful context', position: 'top' });
    `),
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
    quickstart: code(`
import { showToast, renderToastContainer } from '@basenative/components';

showToast({ message: 'Saved.', variant: 'success' });
    `),
    examples: [
      {
        title: 'Live region',
        description: 'Click the buttons to push toasts. They auto-dismiss after a few seconds.',
        scripted: 'toast-push',
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
