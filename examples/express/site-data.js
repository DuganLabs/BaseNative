export const navPages = ['home', 'tasks', 'playground', 'docs', 'components', 'showcase'];

export const staticTasks = [
  { id: 1, title: 'Design token system', status: 'done' },
  { id: 2, title: 'Signal reactivity', status: 'done' },
  { id: 3, title: 'Server-side rendering', status: 'active' },
  { id: 4, title: 'Client hydration', status: 'pending' },
];

export function getHomePageContext() {
  return {
    showStats: true,
    features: [
      { id: 1, name: '@if / @else conditional rendering', status: 'done' },
      { id: 2, name: '@for list rendering with track', status: 'done' },
      { id: 3, name: '@switch state matching', status: 'done' },
      { id: 4, name: 'Signal-based reactivity', status: 'done' },
      { id: 5, name: 'Server-side rendering', status: 'done' },
      { id: 6, name: 'Client hydration', status: 'done' },
      { id: 7, name: 'Expression binding (:attr, @event)', status: 'done' },
      { id: 8, name: 'SSR + hydration example', status: 'done' },
    ],
    stats: [
      { label: 'runtime direction', value: 'CSP-safe + keyed' },
      { label: 'workspace tooling', value: 'Nx + esbuild' },
      { label: 'ssr mode', value: 'render + markers' },
      { label: 'virtual DOM nodes', value: '0' },
    ],
    updates: [
      { id: 1, text: 'Initial proof of concept complete', date: '2025-01-15' },
      { id: 2, text: 'Server renderer implemented', date: '2025-02-01' },
      { id: 3, text: 'Express example with SSR + hydration', date: '2025-02-15' },
      { id: 4, text: 'Signals playground added', date: '2025-03-01' },
      { id: 5, text: 'API documentation page', date: '2025-03-15' },
    ],
  };
}

export function getTasksPageContext(tasks) {
  return {
    tasks,
    tasksJson: JSON.stringify(tasks),
  };
}

export function getComponentsPageContext() {
  return {
    readinessStats: [
      { label: 'Current Milestone', value: 'v0.4+' },
      { label: 'Browser Support', value: '4 engines' },
      { label: 'Public Packages', value: '5' },
      { label: 'Advanced Widgets', value: 'Shipped' },
    ],
    releaseStages: [
      {
        milestone: 'v0.2',
        focus: 'Trust blockers',
        outcome: 'CSP-safe expressions, keyed reconciliation, hydration diagnostics, browser feature helpers, honest docs.',
        status: 'Implemented',
        tone: 'done',
      },
      {
        milestone: 'v0.3',
        focus: 'Pilot baseline',
        outcome: 'Router, forms, semantic component baseline, reference business app, edge deployment example, published metrics.',
        status: 'Implemented',
        tone: 'done',
      },
      {
        milestone: 'v0.4+',
        focus: 'Workflow breadth',
        outcome: 'Dialog, drawer, menu, tabs, shell navigation, loading states, and DX hardening after pilot evidence is green.',
        status: 'Implemented',
        tone: 'done',
      },
    ],
    trustBlockers: [
      {
        item: 'Template evaluation',
        state: 'Done',
        tone: 'done',
        notes: 'Client and server now share a constrained expression parser/interpreter instead of eval-like execution.',
      },
      {
        item: '@for track identity',
        state: 'Done',
        tone: 'done',
        notes: 'Keyed reconciliation preserves DOM segments and supports reorder behavior needed for business UIs.',
      },
      {
        item: 'Hydration diagnostics',
        state: 'Done',
        tone: 'done',
        notes: 'Hydration now exposes mismatch reporting hooks and deterministic markers for SSR handoff.',
      },
      {
        item: 'Browser capability policy',
        state: 'Done',
        tone: 'done',
        notes: 'Dialog, popover, anchor positioning, and base-select are detected centrally with documented fallbacks.',
      },
    ],
    packageSurface: [
      {
        pkg: '@basenative/runtime',
        status: 'Current',
        tone: 'done',
        scope: 'Signals, hydrate, diagnostics, feature detection, runtime utilities.',
      },
      {
        pkg: '@basenative/server',
        status: 'Current',
        tone: 'done',
        scope: 'SSR rendering, hydration handoff markers, Node and edge-friendly helpers.',
      },
      {
        pkg: '@basenative/components',
        status: 'Current',
        tone: 'done',
        scope: 'Semantic primitives, tokens, accessibility contracts, keyboard expectations.',
      },
      {
        pkg: '@basenative/router',
        status: 'Current',
        tone: 'done',
        scope: 'Route definitions, params/query helpers, nested layouts, SSR-aware navigation.',
      },
      {
        pkg: '@basenative/forms',
        status: 'Current',
        tone: 'done',
        scope: 'Field state, validation lifecycle, schema adapters, submit/error orchestration.',
      },
    ],
    workflowParity: [
      {
        category: 'SSR and hydration',
        status: 'Ready',
        tone: 'done',
        detail: 'Server rendering and client hydration are in place with diagnostics and keyed updates.',
      },
      {
        category: 'Forms and validation',
        status: 'Ready',
        tone: 'done',
        detail: 'Field system, validation primitives, form orchestration, and schema adapters are implemented.',
      },
      {
        category: 'Routing and layouts',
        status: 'Ready',
        tone: 'done',
        detail: 'Client-side routing, SSR-aware resolution, pattern matching, and link interception are implemented.',
      },
      {
        category: 'Async data and errors',
        status: 'Ready',
        tone: 'done',
        detail: 'Runtime is the home for resources, diagnostics, and global error surfaces in v0.x.',
      },
      {
        category: 'Accessibility and browser policy',
        status: 'Ready',
        tone: 'done',
        detail: 'Browser support, fallbacks, semantic defaults, and component a11y contracts are documented and enforced.',
      },
    ],
    p0Components: [
      {
        component: 'Field system',
        release: 'v0.3',
        status: 'Implemented',
        tone: 'done',
        notes: 'Foundation for labels, help text, errors, density, and validation messaging.',
      },
      {
        component: 'Button family',
        release: 'v0.3',
        status: 'Implemented',
        tone: 'done',
        notes: 'Primary, secondary, destructive, quiet, loading, and disabled states.',
      },
      {
        component: 'Input and textarea',
        release: 'v0.3',
        status: 'Implemented',
        tone: 'done',
        notes: 'Text entry primitives built on the field system with native validation hooks.',
      },
      {
        component: 'Checkbox radio switch',
        release: 'v0.3',
        status: 'Implemented',
        tone: 'done',
        notes: 'Selection controls with keyboard contracts and form integration.',
      },
      {
        component: 'Select',
        release: 'v0.3',
        status: 'Implemented',
        tone: 'done',
        notes: 'Native-first select with capability-aware styling and fallback behavior.',
      },
      {
        component: 'Alert and toast',
        release: 'v0.3',
        status: 'Implemented',
        tone: 'done',
        notes: 'Feedback primitives for inline status, non-blocking notifications, and errors.',
      },
      {
        component: 'Table and empty state',
        release: 'v0.3',
        status: 'Implemented',
        tone: 'done',
        notes: 'Business-data baseline before grid, treegrid, or virtualized views.',
      },
      {
        component: 'Pagination',
        release: 'v0.3',
        status: 'Implemented',
        tone: 'done',
        notes: 'Server-friendly pagination controls for list and table workflows.',
      },
    ],
    browserSupport: [
      {
        feature: 'dialog',
        status: 'Supported with fallback',
        tone: 'done',
        fallback: 'Use plain document flow when modal behavior is unavailable.',
      },
      {
        feature: 'popover',
        status: 'Supported with fallback',
        tone: 'done',
        fallback: 'Render inline disclosures when the Popover API is missing.',
      },
      {
        feature: 'anchor positioning',
        status: 'Supported with fallback',
        tone: 'done',
        fallback: 'Use default document positioning when anchor-based placement is unavailable.',
      },
      {
        feature: 'appearance: base-select',
        status: 'Supported with fallback',
        tone: 'done',
        fallback: 'Fall back to native select chrome without blocking form workflows.',
      },
    ],
    deferredWork: [
      {
        item: 'Combobox, multiselect, date and time inputs',
        reason: 'Implemented — combobox and multiselect shipped; date and time inputs planned for next cycle.',
      },
      {
        item: 'Tree, data grid, treegrid, virtualizer',
        reason: 'Implemented — all four components shipped with keyboard support and virtual scroll.',
      },
      {
        item: 'Broad workflow widgets',
        reason: 'Implemented — dialog, drawer, tabs, accordion, breadcrumb, tooltip, dropdown menu, and command palette shipped.',
      },
    ],
  };
}
