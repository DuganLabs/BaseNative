/**
 * Component catalog — single source of truth for component pages and showcase TOC.
 * Each entry drives the /components index, /components/:slug demo pages, and
 * the in-page anchor nav on /showcase.
 */
export const componentCategories = [
  {
    id: 'inputs',
    title: 'Form Controls',
    summary:
      'Input primitives wired to native form events with help text, error states, and field semantics.',
    components: [
      {
        slug: 'button',
        title: 'Button',
        tag: 'button',
        summary: 'Primary, secondary, destructive, and ghost variants on a native button.',
      },
      {
        slug: 'input',
        title: 'Input',
        tag: 'input',
        summary: 'Text, email, password, and search inputs with label, help, and error states.',
      },
      {
        slug: 'textarea',
        title: 'Textarea',
        tag: 'textarea',
        summary: 'Auto-sizing textarea with field-sizing: content and a vertical resize handle.',
      },
      {
        slug: 'select',
        title: 'Select',
        tag: 'select',
        summary: 'Native select with appearance: base-select progressive enhancement.',
      },
      {
        slug: 'checkbox',
        title: 'Checkbox',
        tag: 'input',
        summary: 'Native checkbox with custom indicator built from CSS pseudo-elements.',
      },
      {
        slug: 'radio',
        title: 'Radio Group',
        tag: 'fieldset',
        summary: 'Grouped radio inputs inside a fieldset/legend with keyboard support.',
      },
      {
        slug: 'toggle',
        title: 'Toggle',
        tag: 'input',
        summary: 'Switch-style checkbox with role="switch" and animated thumb.',
      },
      {
        slug: 'combobox',
        title: 'Combobox',
        tag: 'div',
        summary: 'Filterable single-select with listbox semantics and keyboard navigation.',
      },
      {
        slug: 'multiselect',
        title: 'Multiselect',
        tag: 'div',
        summary: 'Tag-based multi-value select with chip removal and keyboard support.',
      },
    ],
  },
  {
    id: 'feedback',
    title: 'Feedback',
    summary: 'Status surfaces — alerts, toasts, progress, spinners, and loading skeletons.',
    components: [
      {
        slug: 'alert',
        title: 'Alert',
        tag: 'div',
        summary: 'Inline status box with info, success, warning, and error variants.',
      },
      {
        slug: 'progress',
        title: 'Progress',
        tag: 'progress',
        summary: 'Native progress element with deterministic and indeterminate states.',
      },
      {
        slug: 'spinner',
        title: 'Spinner',
        tag: 'span',
        summary: 'CSS-only loading indicator with three sizes and a screen-reader label.',
      },
      {
        slug: 'skeleton',
        title: 'Skeleton',
        tag: 'div',
        summary: 'Animated placeholder for content that is still loading.',
      },
      {
        slug: 'badge',
        title: 'Badge',
        tag: 'span',
        summary: 'Compact status pill with semantic color variants.',
      },
    ],
  },
  {
    id: 'layout',
    title: 'Cards & Layout',
    summary: 'Article-shaped cards, accordions, and tabs that use native disclosure semantics.',
    components: [
      {
        slug: 'card',
        title: 'Card',
        tag: 'article',
        summary: 'Article element with header/body/footer slots and hover affordance.',
      },
      {
        slug: 'accordion',
        title: 'Accordion',
        tag: 'details',
        summary: 'Native details/summary stack — exclusive or multi-open.',
      },
      {
        slug: 'tabs',
        title: 'Tabs',
        tag: 'div',
        summary: 'Tablist with arrow-key navigation and proper ARIA wiring.',
      },
      {
        slug: 'avatar',
        title: 'Avatar',
        tag: 'span',
        summary: 'Initials fallback with optional image source and four sizes.',
      },
    ],
  },
  {
    id: 'navigation',
    title: 'Navigation',
    summary: 'Wayfinding primitives. Breadcrumbs, pagination, and command palette.',
    components: [
      {
        slug: 'breadcrumb',
        title: 'Breadcrumb',
        tag: 'nav',
        summary: 'Ordered list of links inside a nav with aria-current on the leaf.',
      },
      {
        slug: 'pagination',
        title: 'Pagination',
        tag: 'nav',
        summary: 'Page navigation with first, prev, next, last, and ellipsis handling.',
      },
      {
        slug: 'command-palette',
        title: 'Command Palette',
        tag: 'dialog',
        summary: 'Modal dialog with grouped commands, fuzzy filter, and shortcuts.',
      },
    ],
  },
  {
    id: 'data',
    title: 'Data Display',
    summary: 'Tables and grids — from a basic table to a virtualized data grid and tree.',
    components: [
      {
        slug: 'table',
        title: 'Table',
        tag: 'table',
        summary: 'Native table with caption, sticky header, and hover row highlight.',
      },
      {
        slug: 'datagrid',
        title: 'Data Grid',
        tag: 'table',
        summary: 'Sortable, selectable grid built on native table with arrow-key navigation.',
      },
      {
        slug: 'tree',
        title: 'Tree',
        tag: 'ul',
        summary: 'role="tree" list with expand/collapse and selection state.',
      },
      {
        slug: 'virtual-list',
        title: 'Virtual List',
        tag: 'div',
        summary: 'Windowed list — only renders the visible slice for long collections.',
      },
    ],
  },
  {
    id: 'overlays',
    title: 'Overlays',
    summary: 'Layered surfaces built on native dialog and the Popover API.',
    components: [
      {
        slug: 'dialog',
        title: 'Dialog',
        tag: 'dialog',
        summary: 'Native modal dialog with backdrop, focus trap, and escape-to-close.',
      },
      {
        slug: 'drawer',
        title: 'Drawer',
        tag: 'aside',
        summary: 'Side sheet for settings and secondary tasks. Slides in from any edge.',
      },
      {
        slug: 'dropdown-menu',
        title: 'Dropdown Menu',
        tag: 'menu',
        summary: 'Popover-anchored menu with keyboard navigation and shortcuts.',
      },
      {
        slug: 'tooltip',
        title: 'Tooltip',
        tag: 'span',
        summary: 'Popover-anchored tooltip with role="tooltip" and four positions.',
      },
      {
        slug: 'toast',
        title: 'Toast',
        tag: 'output',
        summary: 'Live region for non-blocking notifications. Auto-dismisses.',
      },
    ],
  },
];

export const flatComponents = componentCategories.flatMap((c) =>
  c.components.map((comp) => ({ ...comp, categoryId: c.id, categoryTitle: c.title })),
);

export function findComponent(slug) {
  return flatComponents.find((c) => c.slug === slug);
}
