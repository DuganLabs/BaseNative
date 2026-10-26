import { readFileSync } from 'node:fs';
import { renderTrinity, trinityComponentInfo } from './trinity.js';
import { trinityCatalog, trinityCategoriesWith } from './trinity-catalog.js';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { escapeAttr, escapeText, raw } from '@basenative/runtime/shared/escape';
import { computeCompareStats } from '../../scripts/compare-stats.js';
import { getCompareTables } from './compare-tables.js';

const siteDir = dirname(fileURLToPath(import.meta.url));

function pkgVersion(name) {
  return JSON.parse(readFileSync(join(siteDir, '../../packages', name, 'package.json'), 'utf8'))
    .version;
}

export const navPages = [
  'home',
  'compare',
  'components',
  'docs',
  'ai',
  'playground',
  'builder',
  'tasks',
];

/** One nav glyph: a 24-unit-grid stroke SVG, the icons package's convention. */
const glyph = (paths) =>
  `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;

/**
 * The app nav's destinations, in travel order: the four that stay in
 * the phone-class bar first — Home (what it is), Compare (why it
 * wins), Components (the proof), Docs (how to use it / reference) —
 * then the ones the More sheet carries, also in travel order:
 * AI (the scorecard for models), Playground (try it), Builder (build
 * with it), Tasks (the demo app, living under Components). The rail
 * reads the same list top to
 * bottom. `page` is the route's activePage key. The phone bar keeps
 * the first four items; AI is the first overflow item so that bar
 * does not change.
 */
const appNavSpec = [
  {
    page: 'home',
    label: 'Home',
    href: '/',
    icon: glyph('<path d="M4 11l8-7 8 7"/><path d="M6 9.5V20h12V9.5"/><path d="M10 20v-5h4v5"/>'),
  },
  {
    page: 'compare',
    label: 'Compare',
    href: '/compare',
    icon: glyph(
      '<path d="M3 20h18"/><path d="M6 20v-9"/><path d="M12 20V5"/><path d="M18 20v-6"/>',
    ),
  },
  {
    page: 'components',
    label: 'Components',
    shortLabel: 'Parts',
    href: '/components',
    icon: glyph(
      '<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/>',
    ),
  },
  {
    page: 'docs',
    label: 'Docs',
    href: '/docs',
    icon: glyph(
      '<path d="M12 6c-1.5-1.5-3.5-2-7-2v14c3.5 0 5.5.5 7 2 1.5-1.5 3.5-2 7-2V4c-3.5 0-5.5.5-7 2z"/><path d="M12 6v14"/>',
    ),
  },
  {
    page: 'ai',
    label: 'AI',
    href: '/ai',
    icon: glyph(
      '<path d="M12 3l1.5 4 4 1.5-4 1.5L12 14l-1.5-4-4-1.5 4-1.5L12 3z"/><path d="M5 19h14"/>',
    ),
  },
  {
    page: 'playground',
    label: 'Playground',
    href: '/playground',
    icon: glyph(
      '<rect x="4" y="4" width="16" height="16" rx="4"/><path d="M10.5 8.8v6.4L15.8 12z" fill="currentColor" stroke="none"/>',
    ),
  },
  {
    page: 'builder',
    label: 'Builder',
    href: '/builder',
    icon: glyph(
      '<path d="M5 7h14M5 12h14M5 17h14"/><circle cx="10" cy="7" r="2"/><circle cx="15" cy="12" r="2"/><circle cx="8" cy="17" r="2"/>',
    ),
  },
  {
    page: 'tasks',
    label: 'Tasks',
    href: '/components/tasks',
    icon: glyph(
      '<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M8.5 12.5l2.5 2.5 5-5.5"/>',
    ),
  },
];

/** renderAppNav items for the shell, with `current` set from the active page. */
export function getAppNavItems(activePage = '') {
  return appNavSpec.map(({ page, ...item }) => ({
    ...item,
    current: page === activePage,
  }));
}

/**
 * The docs page's "Full API reference" list, rendered as the catalog's
 * list-group instead of a hand-rolled <ul>. Every link and description
 * is the text the list has always carried.
 */
export function getDocsPageContext() {
  const runtimeVersion = pkgVersion('runtime');
  const apiRefs = [
    {
      label: '@basenative/runtime — signal, computed, effect, batch, hydrate, directives, devtools',
      href: 'https://github.com/DuganLabs/BaseNative/blob/main/docs/api/runtime.md',
    },
    {
      label: '@basenative/server — render, renderToStream, renderToReadableStream, @defer',
      href: 'https://github.com/DuganLabs/BaseNative/blob/main/docs/api/server.md',
    },
    {
      label: '@basenative/router — path patterns, resolveRoute, navigation guards',
      href: 'https://github.com/DuganLabs/BaseNative/blob/main/docs/api/router.md',
    },
    {
      label: '@basenative/forms — createForm, createField, validators',
      href: 'https://github.com/DuganLabs/BaseNative/blob/main/docs/api/forms.md',
    },
    {
      label: '@basenative/components — every render* helper; see them live on /components',
      href: 'https://github.com/DuganLabs/BaseNative/blob/main/docs/api/components.md',
    },
  ];
  return {
    runtimeVersion,
    // Assembled from hand-authored data by the catalog's own renderer —
    // the same raw() trust assertion the other assembled contexts make.
    apiRefs: raw(
      renderTrinity('list-group', {
        items: apiRefs.map((ref) => ({
          contentHtml: `<a href="${ref.href}">${escapeText(ref.label)}</a>`,
        })),
      }),
    ),
  };
}

// Deriving the stats bundles the runtime with esbuild to weigh it; both the
// home page and /compare read through this one cache rather than paying it
// twice, or per request on the dev server.
let compareStats;
const stats = () => (compareStats ??= computeCompareStats());

/** Measured compare stats, shared so /ai does not bundle the runtime a second time. */
export function getMeasuredStats() {
  return stats();
}

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
  const runtimeVersion = pkgVersion('runtime');
  const packages = stats().publicPackages;
  // The home lists are the catalog's list-group: each row is one
  // paragraph — the row's mark as a badge, its title, its detail — so
  // the item is a single child of the row, the shape the component's
  // layout is built for. The platform's renderBnList left with the
  // platform.
  const tones = ['info', 'warning', 'success', 'danger'];
  const listOf = (rows) =>
    raw(
      renderTrinity('list-group', {
        items: rows.map((row, i) => ({
          contentHtml:
            `<p>${renderTrinity('badge', { label: row.mark, variant: tones[i % tones.length] })} ` +
            `<strong>${row.title}</strong> ${row.detail}</p>`,
        })),
      }),
    );
  return {
    runtimeVersion,
    runtimeList: listOf([
      {
        title: 'One set()',
        detail: 'Derived computeds settle, then each affected effect runs once.',
        mark: '1',
      },
      {
        title: 'BN_EFFECT_LOOP',
        detail:
          'An effect that writes a signal it also read throws. Use .peek(), or write a different signal.',
        mark: '!',
      },
      {
        title: 'class and :class',
        detail: 'The two merge. A false binding adds nothing.',
        mark: 'C',
      },
      {
        title: ':value and :checked',
        detail: 'Those bindings write the DOM property.',
        mark: 'V',
      },
      {
        title: 'Evaluator',
        detail: `An allowlist. Gzip ${runtimeSizeStat()}.`,
        mark: 'E',
      },
    ]),
    catalogList: listOf([
      {
        title: '@basenative/components',
        detail:
          'The Holy Trinity catalog — every component three files: a template, a token sheet, and its logic, in light and dark.',
        mark: 'C',
      },
      {
        title: 'npmjs.org',
        detail: 'npm install @basenative/runtime @basenative/server. No token.',
        mark: 'N',
      },
      {
        title: '/ai',
        detail:
          'The model scorecard. Pass rates stay unpublished while the prompt corpus is empty.',
        mark: 'A',
      },
      {
        title: '@basenative/validate',
        detail:
          'Flags className, htmlFor, onClick, {expr} text, useState, useEffect, and useMemo, and names the replacement.',
        mark: 'V',
      },
      {
        title: 'bn from-jsx',
        detail: 'Rewrites a React or JSX draft into BaseNative.',
        mark: 'J',
      },
      {
        title: 'Public packages',
        detail: `${packages} on npmjs.org.`,
        mark: '#',
      },
    ]),
  };
}

// Status → badge variant for the tasks app's list, following the page's own
// status language (the mark[data-status] rules group active with done).
const TASK_STATUS_VARIANT = { done: 'success', active: 'success', pending: 'default' };

export function getTasksPageContext(tasks, hasApi = true) {
  // The server-rendered list is the catalog list-group: the title in a
  // paragraph, the status as the catalog badge pinned to the row's end.
  // The client script in tasks.html keeps this list in sync in the same
  // shape as the signals move.
  const taskList = renderTrinity('list-group', {
    items: tasks.length
      ? tasks.map((task) => ({
          contentHtml: `<p><strong>${escapeText(task.title)}</strong></p>`,
          trailingHtml: renderTrinity('badge', {
            label: task.status,
            variant: TASK_STATUS_VARIANT[task.status] || 'default',
          }),
        }))
      : [{ contentHtml: '<p>No tasks yet — add one below</p>' }],
  });
  return {
    tasks,
    taskList: raw(taskList),
    tasksJson: JSON.stringify(tasks),
    hasApi,
  };
}

export function getComponentsPageContext() {
  const entries = trinityCatalog(trinityComponentInfo());
  const categories = trinityCategoriesWith(entries);
  return {
    categories,
    totalCount: entries.length,
    categoryCount: categories.length,
  };
}

// ─── /compare ────────────────────────────────────────────────────────────────

/**
 * The counter written four ways.
 *
 * Code is pre-escaped: it is handed to the tabs composite as a panel slot, and the
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
 * `stats` is measured from source by scripts/compare-stats.js and every
 * BaseNative number on the page is bound to it rather than stated — the
 * view's prose binds `{{ stats.… }}`, and compare-tables.js composes the
 * tables from the same object — so the page cannot drift from the runtime
 * it describes.
 */
export function getComparePageContext() {
  const tabs = COUNTER_EXAMPLES.map((example) => ({
    value: example.id,
    label: example.label,
    panelHtml: `<figure data-compare-code>
  <figcaption>${escapeText(example.file)}</figcaption>
  <pre tabindex="0" aria-label="Counter example: ${escapeAttr(example.label)}"><code>${example.code}</code></pre>
  <p data-compare-note>${escapeText(example.note)}</p>
</figure>`,
  }));

  return {
    stats: stats(),
    ...getCompareTables(stats()),
    counterTabs: raw(
      renderTrinity('tabs', {
        id: 'counter',
        label: 'Counter examples',
        name: 'counter-examples',
        tabs,
      }),
    ),
  };
}
