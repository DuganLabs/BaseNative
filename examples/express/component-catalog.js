/**
 * Component catalog — single source of truth for /components, per-component
 * pages, and the showcase TOC. Each entry carries enough metadata to generate
 * the entire surface (slug, semantic tag, render function, summary, API).
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
        fn: 'renderButton',
        summary: 'Primary, secondary, destructive, and ghost variants on a native button.',
        api: [
          { name: 'content', type: 'string', default: '—', description: 'Button label text.' },
          {
            name: 'variant',
            type: "'primary' | 'secondary' | 'destructive' | 'ghost'",
            default: "'primary'",
            description: 'Visual treatment.',
          },
          {
            name: 'disabled',
            type: 'boolean',
            default: 'false',
            description: 'Adds the disabled attribute and reduces emphasis.',
          },
          {
            name: 'attrs',
            type: 'string',
            default: "''",
            description: 'Extra HTML attributes appended to the button tag.',
          },
        ],
      },
      {
        slug: 'input',
        title: 'Input',
        tag: 'input',
        fn: 'renderInput',
        summary: 'Text, email, password, and search inputs with label, help, and error states.',
        api: [
          { name: 'name', type: 'string', default: '—', description: 'Form field name.' },
          { name: 'label', type: 'string', default: '—', description: 'Visible field label.' },
          { name: 'type', type: 'string', default: "'text'", description: 'HTML input type.' },
          {
            name: 'value',
            type: 'string',
            default: "''",
            description: 'Initial value.',
          },
          {
            name: 'placeholder',
            type: 'string',
            default: "''",
            description: 'Placeholder text.',
          },
          {
            name: 'helpText',
            type: 'string',
            default: "''",
            description: 'Hint shown below the field.',
          },
          {
            name: 'error',
            type: 'string',
            default: "''",
            description: 'Error message; sets aria-invalid="true".',
          },
        ],
      },
      {
        slug: 'textarea',
        title: 'Textarea',
        tag: 'textarea',
        fn: 'renderTextarea',
        summary: 'Auto-sizing textarea with field-sizing: content and a vertical resize handle.',
        api: [
          { name: 'name', type: 'string', default: '—', description: 'Form field name.' },
          { name: 'label', type: 'string', default: '—', description: 'Visible field label.' },
          { name: 'rows', type: 'number', default: '3', description: 'Initial visible rows.' },
          { name: 'value', type: 'string', default: "''", description: 'Initial value.' },
          {
            name: 'placeholder',
            type: 'string',
            default: "''",
            description: 'Placeholder text.',
          },
        ],
      },
      {
        slug: 'select',
        title: 'Select',
        tag: 'select',
        fn: 'renderSelect',
        summary: 'Native select with appearance: base-select progressive enhancement.',
        api: [
          { name: 'name', type: 'string', default: '—', description: 'Form field name.' },
          { name: 'label', type: 'string', default: '—', description: 'Visible field label.' },
          {
            name: 'items',
            type: 'string[] | { value, label }[]',
            default: '—',
            description: 'Option list.',
          },
          {
            name: 'placeholder',
            type: 'string',
            default: "''",
            description: 'Empty-state option text.',
          },
        ],
      },
      {
        slug: 'checkbox',
        title: 'Checkbox',
        tag: 'input',
        fn: 'renderCheckbox',
        summary: 'Native checkbox with custom indicator built from CSS pseudo-elements.',
        api: [
          { name: 'name', type: 'string', default: '—', description: 'Form field name.' },
          { name: 'label', type: 'string', default: '—', description: 'Adjacent label text.' },
          {
            name: 'checked',
            type: 'boolean',
            default: 'false',
            description: 'Initial checked state.',
          },
        ],
      },
      {
        slug: 'radio',
        title: 'Radio Group',
        tag: 'fieldset',
        fn: 'renderRadioGroup',
        summary: 'Grouped radio inputs inside a fieldset/legend with keyboard support.',
        api: [
          { name: 'name', type: 'string', default: '—', description: 'Shared input name.' },
          {
            name: 'label',
            type: 'string',
            default: '—',
            description: 'Group legend.',
          },
          { name: 'items', type: 'string[]', default: '—', description: 'Option labels.' },
          { name: 'selected', type: 'string', default: "''", description: 'Initially selected.' },
        ],
      },
      {
        slug: 'toggle',
        title: 'Toggle',
        tag: 'input',
        fn: 'renderToggle',
        summary: 'Switch-style checkbox with role="switch" and animated thumb.',
        api: [
          { name: 'name', type: 'string', default: '—', description: 'Form field name.' },
          { name: 'label', type: 'string', default: '—', description: 'Adjacent label text.' },
          {
            name: 'checked',
            type: 'boolean',
            default: 'false',
            description: 'Initial state.',
          },
        ],
      },
      {
        slug: 'combobox',
        title: 'Combobox',
        tag: 'div',
        fn: 'renderCombobox',
        summary: 'Filterable single-select with listbox semantics and keyboard navigation.',
        api: [
          { name: 'name', type: 'string', default: '—', description: 'Form field name.' },
          { name: 'label', type: 'string', default: '—', description: 'Field label.' },
          { name: 'items', type: 'string[]', default: '—', description: 'Available options.' },
          {
            name: 'placeholder',
            type: 'string',
            default: "''",
            description: 'Empty input placeholder.',
          },
        ],
      },
      {
        slug: 'multiselect',
        title: 'Multiselect',
        tag: 'div',
        fn: 'renderMultiselect',
        summary: 'Tag-based multi-value select with chip removal and keyboard support.',
        api: [
          { name: 'name', type: 'string', default: '—', description: 'Form field name.' },
          { name: 'label', type: 'string', default: '—', description: 'Field label.' },
          { name: 'items', type: 'string[]', default: '—', description: 'Available options.' },
          {
            name: 'selected',
            type: 'string[]',
            default: '[]',
            description: 'Initially selected.',
          },
        ],
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
        fn: 'renderAlert',
        summary: 'Inline status box with info, success, warning, and error variants.',
        api: [
          { name: 'content', type: 'string', default: '—', description: 'Message body.' },
          {
            name: 'variant',
            type: "'info' | 'success' | 'warning' | 'error'",
            default: "'info'",
            description: 'Status color.',
          },
          {
            name: 'dismissible',
            type: 'boolean',
            default: 'false',
            description: 'Adds a close button.',
          },
        ],
      },
      {
        slug: 'progress',
        title: 'Progress',
        tag: 'progress',
        fn: 'renderProgress',
        summary: 'Native progress element with deterministic and indeterminate states.',
        api: [
          { name: 'value', type: 'number', default: '0', description: 'Current value.' },
          { name: 'max', type: 'number', default: '100', description: 'Maximum value.' },
          {
            name: 'label',
            type: 'string',
            default: '—',
            description: 'Accessible label.',
          },
        ],
      },
      {
        slug: 'spinner',
        title: 'Spinner',
        tag: 'span',
        fn: 'renderSpinner',
        summary: 'CSS-only loading indicator with three sizes and a screen-reader label.',
        api: [
          {
            name: 'size',
            type: "'sm' | 'md' | 'lg'",
            default: "'md'",
            description: 'Diameter preset.',
          },
          {
            name: 'label',
            type: 'string',
            default: "'Loading'",
            description: 'Visually-hidden label.',
          },
        ],
      },
      {
        slug: 'skeleton',
        title: 'Skeleton',
        tag: 'div',
        fn: 'renderSkeleton',
        summary: 'Animated placeholder for content that is still loading.',
        api: [
          { name: 'width', type: 'string', default: "'100%'", description: 'CSS width.' },
          { name: 'height', type: 'string', default: "'1rem'", description: 'CSS height.' },
          { name: 'count', type: 'number', default: '1', description: 'Number of bars.' },
        ],
      },
      {
        slug: 'badge',
        title: 'Badge',
        tag: 'span',
        fn: 'renderBadge',
        summary: 'Compact status pill with semantic color variants.',
        api: [
          { name: 'content', type: 'string', default: '—', description: 'Badge text.' },
          {
            name: 'variant',
            type: "'default' | 'primary' | 'success' | 'warning' | 'error'",
            default: "'default'",
            description: 'Color variant.',
          },
        ],
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
        fn: 'renderCard',
        summary: 'Article element with header/body/footer slots and hover affordance.',
        api: [
          { name: 'header', type: 'string', default: "''", description: 'Card header HTML.' },
          { name: 'body', type: 'string', default: "''", description: 'Card body HTML.' },
          { name: 'footer', type: 'string', default: "''", description: 'Card footer HTML.' },
        ],
      },
      {
        slug: 'accordion',
        title: 'Accordion',
        tag: 'details',
        fn: 'renderAccordion',
        summary: 'Native details/summary stack — exclusive or multi-open.',
        api: [
          {
            name: 'items',
            type: '{ title, content }[]',
            default: '—',
            description: 'Accordion sections.',
          },
        ],
      },
      {
        slug: 'tabs',
        title: 'Tabs',
        tag: 'div',
        fn: 'renderTabs',
        summary: 'Tablist with arrow-key navigation and proper ARIA wiring.',
        api: [
          {
            name: 'tabs',
            type: '{ id, label, content }[]',
            default: '—',
            description: 'Tab definitions.',
          },
        ],
      },
      {
        slug: 'avatar',
        title: 'Avatar',
        tag: 'span',
        fn: 'renderAvatar',
        summary: 'Initials fallback with optional image source and four sizes.',
        api: [
          { name: 'name', type: 'string', default: '—', description: 'Used to derive initials.' },
          { name: 'src', type: 'string', default: "''", description: 'Image source URL.' },
          {
            name: 'size',
            type: "'sm' | 'md' | 'lg' | 'xl'",
            default: "'md'",
            description: 'Diameter preset.',
          },
        ],
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
        fn: 'renderBreadcrumb',
        summary: 'Ordered list of links inside a nav with aria-current on the leaf.',
        api: [
          {
            name: 'items',
            type: '{ label, href }[]',
            default: '—',
            description: 'Path segments. Last entry omits href.',
          },
        ],
      },
      {
        slug: 'pagination',
        title: 'Pagination',
        tag: 'nav',
        fn: 'renderPagination',
        summary: 'Page navigation with first, prev, next, last, and ellipsis handling.',
        api: [
          { name: 'currentPage', type: 'number', default: '1', description: 'Active page.' },
          { name: 'totalPages', type: 'number', default: '1', description: 'Total page count.' },
          {
            name: 'baseUrl',
            type: 'string',
            default: "'#'",
            description: 'Page link prefix.',
          },
        ],
      },
      {
        slug: 'command-palette',
        title: 'Command Palette',
        tag: 'dialog',
        fn: 'renderCommandPalette',
        summary: 'Modal dialog with grouped commands, fuzzy filter, and shortcuts.',
        api: [
          {
            name: 'commands',
            type: '{ label, action, group?, icon?, shortcut? }[]',
            default: '—',
            description: 'Available commands.',
          },
          {
            name: 'id',
            type: 'string',
            default: "'command-palette'",
            description: 'Element id used by showModal().',
          },
        ],
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
        fn: 'renderTable',
        summary: 'Native table with caption, sticky header, and hover row highlight.',
        api: [
          {
            name: 'columns',
            type: '{ key, label }[]',
            default: '—',
            description: 'Column definitions.',
          },
          {
            name: 'rows',
            type: 'object[]',
            default: '—',
            description: 'Row data, keyed by column.',
          },
          { name: 'caption', type: 'string', default: "''", description: 'Caption text.' },
        ],
      },
      {
        slug: 'datagrid',
        title: 'Data Grid',
        tag: 'table',
        fn: 'renderDataGrid',
        summary: 'Sortable, selectable grid built on native table with arrow-key navigation.',
        api: [
          {
            name: 'columns',
            type: '{ key, label, sortable? }[]',
            default: '—',
            description: 'Column definitions.',
          },
          { name: 'rows', type: 'object[]', default: '—', description: 'Row data.' },
          {
            name: 'sortBy',
            type: 'string',
            default: "''",
            description: 'Active sort column key.',
          },
          {
            name: 'sortDir',
            type: "'asc' | 'desc'",
            default: "'asc'",
            description: 'Active sort direction.',
          },
          {
            name: 'selectable',
            type: 'boolean',
            default: 'false',
            description: 'Adds a checkbox column.',
          },
        ],
      },
      {
        slug: 'tree',
        title: 'Tree',
        tag: 'ul',
        fn: 'renderTree',
        summary: 'role="tree" list with expand/collapse and selection state.',
        api: [
          {
            name: 'items',
            type: '{ id, label, icon?, children? }[]',
            default: '—',
            description: 'Tree nodes.',
          },
          {
            name: 'expanded',
            type: 'Set<string>',
            default: 'new Set()',
            description: 'IDs of expanded nodes.',
          },
          {
            name: 'selected',
            type: 'string',
            default: "''",
            description: 'ID of selected node.',
          },
        ],
      },
      {
        slug: 'virtual-list',
        title: 'Virtual List',
        tag: 'div',
        fn: 'renderVirtualList',
        summary: 'Windowed list — only renders the visible slice for long collections.',
        api: [
          { name: 'items', type: 'string[]', default: '—', description: 'Items to render.' },
          { name: 'itemHeight', type: 'number', default: '40', description: 'Row height in px.' },
          {
            name: 'containerHeight',
            type: 'number',
            default: '320',
            description: 'Viewport height in px.',
          },
        ],
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
        fn: 'renderDialog',
        summary: 'Native modal dialog with backdrop, focus trap, and escape-to-close.',
        api: [
          { name: 'title', type: 'string', default: '—', description: 'Dialog header text.' },
          { name: 'content', type: 'string', default: '—', description: 'Body HTML.' },
          { name: 'footer', type: 'string', default: "''", description: 'Footer HTML (buttons).' },
          { name: 'id', type: 'string', default: "'dialog'", description: 'Element id.' },
        ],
      },
      {
        slug: 'drawer',
        title: 'Drawer',
        tag: 'aside',
        fn: 'renderDrawer',
        summary: 'Side sheet for settings and secondary tasks. Slides in from any edge.',
        api: [
          { name: 'title', type: 'string', default: '—', description: 'Drawer title.' },
          { name: 'content', type: 'string', default: '—', description: 'Body HTML.' },
          {
            name: 'position',
            type: "'left' | 'right'",
            default: "'right'",
            description: 'Edge to slide from.',
          },
          { name: 'id', type: 'string', default: "'drawer'", description: 'Element id.' },
        ],
      },
      {
        slug: 'dropdown-menu',
        title: 'Dropdown Menu',
        tag: 'menu',
        fn: 'renderDropdownMenu',
        summary: 'Popover-anchored menu with keyboard navigation and shortcuts.',
        api: [
          { name: 'trigger', type: 'string', default: '—', description: 'Trigger button label.' },
          {
            name: 'items',
            type: '{ label, action, icon?, separator? }[]',
            default: '—',
            description: 'Menu items.',
          },
        ],
      },
      {
        slug: 'tooltip',
        title: 'Tooltip',
        tag: 'span',
        fn: 'renderTooltip',
        summary: 'Popover-anchored tooltip with role="tooltip" and four positions.',
        api: [
          { name: 'trigger', type: 'string', default: '—', description: 'Trigger HTML or text.' },
          { name: 'content', type: 'string', default: '—', description: 'Tooltip body.' },
          {
            name: 'position',
            type: "'top' | 'right' | 'bottom' | 'left'",
            default: "'top'",
            description: 'Anchor side.',
          },
        ],
      },
      {
        slug: 'toast',
        title: 'Toast',
        tag: 'output',
        fn: 'renderToastContainer',
        summary: 'Live region for non-blocking notifications. Auto-dismisses.',
        api: [
          {
            name: 'position',
            type: "'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'",
            default: "'top-right'",
            description: 'Container corner.',
          },
        ],
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
