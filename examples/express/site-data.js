import { escapeAttr, escapeText, raw } from '@basenative/runtime/shared/escape';
import { renderTabs } from '../../packages/components/src/index.js';
import { computeCompareStats } from '../../scripts/compare-stats.js';
import { componentCategories, flatComponents } from './component-catalog.js';

export const navPages = [
  'home',
  'tasks',
  'playground',
  'docs',
  'components',
  'showcase',
  'roadmap',
  'builder',
  'compare',
];

// Deriving the stats bundles the runtime with esbuild to weigh it; both the
// home page and /compare read through this one cache rather than paying it
// twice, or per request on the dev server.
let compareStats;
const stats = () => (compareStats ??= computeCompareStats());

/**
 * The home page's runtime-size stat. Measured, not typed: this line read
 * "9.2KB / 10KB budget" long after the runtime had grown past it.
 */
function runtimeSizeStat() {
  const { runtimeGzipKb, runtimeBudgetKb } = stats();
  return `${runtimeGzipKb}KB / ${runtimeBudgetKb}KB budget`;
}

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
      { id: 1, name: 'CSP-safe expression evaluator — no eval, no new Function', status: 'done' },
      { id: 2, name: 'Model self-check — @basenative/validate, /mcp, /evals', status: 'done' },
      { id: 3, name: '@if / @else conditional rendering', status: 'done' },
      { id: 4, name: '@for list rendering with track', status: 'done' },
      { id: 5, name: '@switch state matching', status: 'done' },
      { id: 6, name: 'Signal-based reactivity', status: 'done' },
      { id: 7, name: 'Server-side rendering', status: 'done' },
      { id: 8, name: 'Client hydration', status: 'done' },
      { id: 9, name: 'Expression binding (:attr, @event)', status: 'done' },
      { id: 10, name: 'SSR + hydration example', status: 'done' },
    ],
    stats: [
      { label: 'security boundary', value: 'no eval, no Function' },
      { label: 'render()', value: 'template string at runtime' },
      { label: 'self-check loop', value: 'validate + mcp + evals' },
      { label: '@basenative/runtime (gzip)', value: runtimeSizeStat() },
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

export function getTasksPageContext(tasks, hasApi = true) {
  return {
    tasks,
    tasksJson: JSON.stringify(tasks),
    hasApi,
  };
}

export function getComponentsPageContext() {
  return {
    categories: componentCategories,
    totalCount: flatComponents.length,
    categoryCount: componentCategories.length,
  };
}

// The browsers the roadmap's policy section names; the readiness tile counts
// this list rather than restating it.
const targetBrowsers = ['Chrome', 'Edge', 'Firefox', 'Safari'];

export function getRoadmapPageContext() {
  const releaseStages = [
    {
      milestone: 'v0.2',
      focus: 'Trust blockers',
      outcome:
        'CSP-safe expressions, keyed reconciliation, hydration diagnostics, browser feature helpers, honest docs.',
      status: 'Implemented',
      tone: 'done',
    },
    {
      milestone: 'v0.3',
      focus: 'Pilot baseline',
      outcome:
        'Router, forms, semantic component baseline, reference business app, edge deployment example, published metrics.',
      status: 'Implemented',
      tone: 'done',
    },
    {
      milestone: 'v0.4+',
      focus: 'Workflow breadth',
      outcome:
        'Dialog, drawer, menu, tabs, shell navigation, loading states, and DX hardening after pilot evidence is green.',
      status: 'Implemented',
      tone: 'done',
    },
  ];
  return {
    // Measured or derived, never typed: the package count read "39" while the
    // workspace published 42, and "4 engines" counted four browsers that share
    // three engines. 'Shipped' is a judgement, not a measurement, so it stays.
    readinessStats: [
      { label: 'Current Milestone', value: releaseStages.at(-1).milestone },
      { label: 'Browser Support', value: `${targetBrowsers.length} browsers` },
      { label: 'Public Packages', value: String(stats().publicPackages) },
      { label: 'Advanced Widgets', value: 'Shipped' },
    ],
    targetBrowserList: `${targetBrowsers.slice(0, -1).join(', ')}, and ${targetBrowsers.at(-1)}`,
    releaseStages,
    trustBlockers: [
      {
        item: 'Template evaluation',
        state: 'Done',
        tone: 'done',
        notes:
          'Client and server now share a constrained expression parser/interpreter instead of eval-like execution.',
      },
      {
        item: '@for track identity',
        state: 'Done',
        tone: 'done',
        notes:
          'Keyed reconciliation preserves DOM segments and supports reorder behavior needed for business UIs.',
      },
      {
        item: 'Hydration diagnostics',
        state: 'Done',
        tone: 'done',
        notes:
          'Hydration now exposes mismatch reporting hooks and deterministic markers for SSR handoff.',
      },
      {
        item: 'Browser capability policy',
        state: 'Done',
        tone: 'done',
        notes:
          'Dialog, popover, anchor positioning, and base-select are detected centrally with documented fallbacks.',
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
        detail:
          'Server rendering and client hydration are in place with diagnostics and keyed updates.',
      },
      {
        category: 'Forms and validation',
        status: 'Ready',
        tone: 'done',
        detail:
          'Field system, validation primitives, form orchestration, and schema adapters are implemented.',
      },
      {
        category: 'Routing and layouts',
        status: 'Ready',
        tone: 'done',
        detail:
          'Client-side routing, SSR-aware resolution, pattern matching, and link interception are implemented.',
      },
      {
        category: 'Async data and errors',
        status: 'Ready',
        tone: 'done',
        detail:
          'Runtime is the home for resources, diagnostics, and global error surfaces in v0.x.',
      },
      {
        category: 'Accessibility and browser policy',
        status: 'Ready',
        tone: 'done',
        detail:
          'Browser support, fallbacks, semantic defaults, and component a11y contracts are documented and enforced.',
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
        reason:
          'Implemented — combobox and multiselect shipped; date and time inputs planned for next cycle.',
      },
      {
        item: 'Tree, data grid, treegrid, virtualizer',
        reason:
          'Implemented — all four components shipped with keyboard support and virtual scroll.',
      },
      {
        item: 'Broad workflow widgets',
        reason:
          'Implemented — dialog, drawer, tabs, accordion, breadcrumb, tooltip, dropdown menu, and command palette shipped.',
      },
    ],
  };
}

// ─── /compare ────────────────────────────────────────────────────────────────

/**
 * The counter written four ways.
 *
 * Code is pre-escaped: it is handed to renderTabs() as an HTML slot, and the
 * BaseNative and Angular samples both contain `{{ … }}`, which `render()` would
 * otherwise evaluate as a live interpolation instead of printing.
 */
const COUNTER_EXAMPLES = [
  {
    id: 'basenative',
    label: 'BaseNative',
    file: 'index.html',
    note: 'Valid HTML. No build. Drop a script tag and go.',
    code: `&lt;div :data="{ count: 0 }"&gt;
  &lt;p&gt;Count: &#123;&#123; count &#125;&#125;&lt;/p&gt;
  &lt;button @click="count++"&gt;+1&lt;/button&gt;
&lt;/div&gt;
&lt;script type="module"&gt;
  import { hydrate } from '/basenative.js';
  hydrate(document.body, { count: 0 });
&lt;/script&gt;`,
  },
  {
    id: 'react',
    label: 'React',
    file: 'Counter.jsx',
    note: 'Requires JSX transpilation, a bundler, and react + react-dom installed.',
    code: `import { useState } from 'react';

export default function Counter() {
  const [count, setCount] = useState(0);
  return (
    &lt;div&gt;
      &lt;p&gt;Count: {count}&lt;/p&gt;
      &lt;button onClick={() =&gt; setCount(c =&gt; c + 1)}&gt;
        +1
      &lt;/button&gt;
    &lt;/div&gt;
  );
}`,
  },
  {
    id: 'angular',
    label: 'Angular',
    file: 'counter.component.ts',
    note: 'Requires TypeScript, Angular CLI, AOT compilation, and the full Angular runtime.',
    code: `import { Component, signal } from '@angular/core';

@Component({
  selector: 'app-counter',
  template: \`
    &lt;p&gt;Count: &#123;&#123; count() &#125;&#125;&lt;/p&gt;
    &lt;button (click)="count.set(count() + 1)"&gt;
      +1
    &lt;/button&gt;
  \`,
})
export class CounterComponent {
  count = signal(0);
}`,
  },
  {
    id: 'svelte',
    label: 'Svelte',
    file: 'Counter.svelte',
    note: 'Concise, but requires the Svelte compiler — no .svelte files run natively in browsers.',
    code: `&lt;script&gt;
  let count = $state(0);
&lt;/script&gt;

&lt;p&gt;Count: {count}&lt;/p&gt;
&lt;button onclick={() =&gt; count++}&gt;+1&lt;/button&gt;`,
  },
];

/**
 * Context for /compare.
 *
 * `stats` is measured from source by scripts/compare-stats.js and the view
 * binds every BaseNative number to it rather than stating one, so the page
 * cannot drift from the runtime it describes.
 */
export function getComparePageContext() {
  const tabs = COUNTER_EXAMPLES.map((example) => ({
    id: example.id,
    label: example.label,
    content: `<figure data-compare-code>
  <figcaption>${escapeText(example.file)}</figcaption>
  <pre tabindex="0" aria-label="Counter example: ${escapeAttr(example.label)}"><code>${example.code}</code></pre>
  <p data-compare-note>${escapeText(example.note)}</p>
</figure>`,
  }));

  return {
    stats: stats(),
    counterTabs: raw(renderTabs({ tabs, attrs: 'data-compare-tabs' })),
  };
}
