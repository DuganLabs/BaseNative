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
        summary:
          'Tag-based multi-value select over a hidden select multiple; initMultiselect adds chip removal, Backspace and datalist entry.',
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
      {
        slug: 'field',
        title: 'Field',
        tag: 'div',
        fn: 'renderField',
        summary:
          'The form-field unit: label, control, help text and error composed as one piece of markup, with the help/error ids the controls’ aria-describedby points at.',
        api: [
          { name: 'id', type: 'string', default: '—', description: 'Field id; help and error ids derive from it.' },
          { name: 'label', type: 'string', default: "''", description: 'Visible label (escaped text).' },
          { name: 'control', type: 'string', default: '—', description: 'Pre-rendered control markup (HTML slot).' },
          { name: 'helpText', type: 'string', default: "''", description: 'Hint under the control (escaped text).' },
          { name: 'error', type: 'string', default: "''", description: 'Error message with role="alert" (escaped text).' },
        ],
      },
      {
        slug: 'form-field',
        title: 'Form Field',
        tag: 'div',
        fn: 'renderFormField',
        summary:
          'Compose a whole field in one call: name a built-in control (input, textarea, select, checkbox, radio, toggle) or pass pre-rendered markup, plus the shared label, help and error options.',
        api: [
          {
            name: 'control',
            type: "'input' | 'textarea' | 'select' | 'checkbox' | 'radio' | 'toggle'",
            default: "'input'",
            description: 'Which built-in control to render.',
          },
          { name: 'name', type: 'string', default: '—', description: 'Field name; also the default field id.' },
          { name: 'label', type: 'string', default: "''", description: 'Field label (escaped text).' },
          { name: 'helpText', type: 'string', default: "''", description: 'Hint under the control (escaped text).' },
          { name: 'error', type: 'string', default: "''", description: 'Error message (escaped text).' },
          {
            name: 'controlHtml',
            type: 'string',
            default: '—',
            description: 'Pre-rendered control markup, wrapped in the field shell instead of a named control.',
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
        summary: 'Tablist with proper ARIA wiring; initTabs adds the APG arrow-key navigation.',
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
      {
        slug: 'app-shell',
        title: 'App Shell',
        tag: 'main',
        fn: 'renderAppShell',
        summary:
          'The minimal page shell: skip link, header slot, main landmark and footer slot, with the skip link and the main id kept in sync by construction.',
        api: [
          { name: 'header', type: 'string', default: "''", description: 'Header HTML slot (e.g. renderSiteHeader output).' },
          { name: 'main', type: 'string', default: "''", description: 'Page body HTML slot.' },
          { name: 'footer', type: 'string', default: "''", description: 'Footer HTML slot (e.g. renderSiteFooter output).' },
          { name: 'mainId', type: 'string', default: "'main-content'", description: 'The main element’s id; the skip link targets it.' },
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
        summary: 'Page navigation with prev, next, and ellipsis handling.',
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
        summary:
          'Modal dialog with grouped commands and shortcuts; initCommandPalette adds the substring filter and the keys its footer names.',
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
      {
        slug: 'site-header',
        title: 'Site Header',
        tag: 'header',
        fn: 'renderSiteHeader',
        summary:
          'Brand link, nav toggle and primary nav menu; initSiteHeader wires the toggle (aria-expanded, Escape and outside-click close) for narrow viewports.',
        api: [
          {
            name: 'brand',
            type: '{ name?, logo?, href?, label? }',
            default: '{}',
            description: 'Brand name (escaped text) and logo mark (HTML slot).',
          },
          {
            name: 'items',
            type: '{ label, href, current? }[]',
            default: '[]',
            description: 'Nav items; the current one gets aria-current="page".',
          },
          {
            name: 'actions',
            type: 'string',
            default: "''",
            description: 'Call-to-action HTML rendered as the menu’s trailing item.',
          },
        ],
      },
      {
        slug: 'site-nav',
        title: 'Site Nav',
        tag: 'nav',
        fn: 'renderSiteNav',
        summary: 'A standalone labelled nav list — the header’s menu contract without the header around it.',
        api: [
          {
            name: 'items',
            type: '{ label, href, current? }[]',
            default: '[]',
            description: 'Nav items; the current one gets aria-current="page".',
          },
          { name: 'label', type: 'string', default: "'Primary'", description: 'The nav’s aria-label.' },
        ],
      },
      {
        slug: 'site-footer',
        title: 'Site Footer',
        tag: 'footer',
        fn: 'renderSiteFooter',
        summary: 'Brand block, grouped link columns as labelled navs, and a legal bar with copyright line.',
        api: [
          {
            name: 'brand',
            type: '{ name?, logo?, tagline? }',
            default: '{}',
            description: 'Brand name, logo mark (HTML slot) and tagline.',
          },
          {
            name: 'columns',
            type: '{ heading, label?, links }[]',
            default: '[]',
            description: 'Link columns; each renders as a nav with an h2 heading.',
          },
          {
            name: 'legal',
            type: '{ text?, links? }',
            default: '—',
            description: 'Copyright line and legal links for the bottom bar.',
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
        summary:
          'Sortable, selectable grid built on native table; initDataGrid adds sorting, selection and arrow-key cell navigation.',
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
        summary: 'role="tree" list; initTree adds expand/collapse, selection state and the APG tree keys.',
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
        summary:
          'Windowed list — the server renders only the first slice; initVirtualList re-slices it on scroll.',
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
        summary: 'Side sheet for settings and secondary tasks. Slides in from the left or right.',
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
        summary:
          'Popover-anchored menu with shortcuts; open, Escape and light dismiss are native, initDropdownMenu adds the arrow keys and close-on-select.',
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
  {
    id: 'marketing',
    title: 'Marketing & Content',
    summary:
      'The content shapes marketing pages are built from — hero, pricing, feature and stat cards, and FAQ — with copy as escaped data.',
    components: [
      {
        slug: 'hero',
        title: 'Hero',
        tag: 'section',
        fn: 'renderHero',
        summary:
          'Opening section of a marketing page: badge, heading, lead, actions, social proof and an optional visual; the page variant renders the compact heading-and-lead hero for interior pages.',
        api: [
          { name: 'badge', type: 'string', default: "''", description: 'Pill text above the heading (escaped).' },
          { name: 'heading', type: 'string', default: "''", description: 'Heading HTML slot; headingText is the escaped alternative.' },
          { name: 'lead', type: 'string', default: "''", description: 'Lead paragraph HTML slot; leadText is the escaped alternative.' },
          { name: 'actions', type: 'string', default: "''", description: 'Call-to-action HTML (button-styled anchors).' },
          { name: 'visual', type: 'string', default: "''", description: 'Visual HTML beside the copy.' },
          {
            name: 'variant',
            type: "'default' | 'page'",
            default: "'default'",
            description: 'The page variant renders the compact page-hero shape.',
          },
        ],
      },
      {
        slug: 'pricing-card',
        title: 'Pricing Card',
        tag: 'article',
        fn: 'renderPricingCard',
        summary:
          'One plan: badge, name, price, tagline, check-marked features and a CTA; a featured plan is stamped and its CTA turns primary. renderPricingCards renders the whole list.',
        api: [
          { name: 'name', type: 'string', default: '—', description: 'Plan name (escaped text).' },
          { name: 'priceLabel', type: 'string', default: '—', description: 'Price text (escaped).' },
          { name: 'features', type: 'string[]', default: '[]', description: 'Feature lines (escaped text).' },
          { name: 'featured', type: 'boolean', default: 'false', description: 'Stamps data-featured and defaults the CTA to primary.' },
          {
            name: 'cta',
            type: '{ label, href, variant? }',
            default: '—',
            description: 'Call-to-action link rendered as a full-width button.',
          },
        ],
      },
      {
        slug: 'feature-card',
        title: 'Feature Card',
        tag: 'article',
        fn: 'renderFeatureCard',
        summary: 'Icon, tag, title and description for feature grids; the description is escaped text or a body HTML slot.',
        api: [
          { name: 'icon', type: 'string', default: "''", description: 'Icon HTML slot inside the icon frame.' },
          { name: 'tag', type: 'string', default: "''", description: 'Eyebrow text above the title (escaped).' },
          { name: 'title', type: 'string', default: '—', description: 'Card title (escaped text).' },
          { name: 'text', type: 'string', default: "''", description: 'Description (escaped text); body is the HTML-slot alternative.' },
        ],
      },
      {
        slug: 'stat-card',
        title: 'Stat Card',
        tag: 'div',
        fn: 'renderStatCard',
        summary: 'A value, its label and an optional up/down trend indicator, for dashboards and proof sections.',
        api: [
          { name: 'value', type: 'string', default: '—', description: 'The stat value (escaped text).' },
          { name: 'label', type: 'string', default: '—', description: 'The stat label (escaped text).' },
          { name: 'trendText', type: 'string', default: "''", description: 'Trend text (e.g. "+12%"); renders the trend span when present.' },
          { name: 'trend', type: "'up' | 'down'", default: "'up'", description: 'Trend direction stamped as data-trend.' },
        ],
      },
      {
        slug: 'faq',
        title: 'FAQ',
        tag: 'dl',
        fn: 'renderFaq',
        summary:
          'A definition-list FAQ: each item is a question/answer pair in a faq-item wrapper; renderFaqItem renders a single entry.',
        api: [
          {
            name: 'items',
            type: '{ question, answer?, answerText? }[]',
            default: '[]',
            description: 'Question (escaped) with an HTML answer slot or escaped answerText.',
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
