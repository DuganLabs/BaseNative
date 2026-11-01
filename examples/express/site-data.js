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
  const toc = raw(
    renderTrinity('sidebar', {
      variant: 'subnav',
      label: 'On this page',
      sections: [
        {
          label: 'On this page',
          items: [
            { label: 'API reference', href: '#api-reference' },
            { label: 'Template directives', href: '#template-directives' },
            { label: 'Server rendering', href: '#server-rendering' },
            { label: 'Full API reference', href: '#full-api-reference' },
            { label: 'Design tokens', href: '#design-tokens' },
          ],
        },
      ],
    }),
  );
  return {
    toc,
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


export const HERO_DEMO_SOURCE = `<button @click="increment()">
  Clicked {{ count() }} times
</button>

<script type="module">
  import { signal, hydrate } from '@basenative/runtime';

  const count = signal(0);
  const increment = () => count.set(count() + 1);

  hydrate(document.body, { count, increment });
</script>`;

export const START_SOURCE = `<!doctype html>
<p>{{ count() }} × 2 = {{ doubled() }}</p>
<button @click="increment()">Add one</button>

<script type="module">
  import { signal, computed, effect, hydrate } from '@basenative/runtime';

  const count = signal(0);
  const doubled = computed(() => count() * 2);

  // Effects re-run when a signal they read changes.
  effect(() => {
    document.title = \`Count: \${count()}\`;
  });

  function increment() {
    count.set(count() + 1);
  }

  hydrate(document.body, { count, doubled, increment });
</script>`;
export function getHomePageContext() {
  const runtimeVersion = pkgVersion('runtime');
  const packages = stats().publicPackages;
  const catalogCount = trinityCatalog(trinityComponentInfo()).length;
  const escapeTags = (text) => text.replace(/</g, "&lt;");
  // The home lists are the catalog's list-group: each row is one
  // paragraph — the row's mark as a badge, its title, its detail — so
  // the item is a single child of the row, the shape the component's
  // layout is built for. The platform's renderBnList left with the
  // platform.
  const listOf = (rows) =>
    raw(
      renderTrinity('list-group', {
        items: rows.map((row) => ({
          contentHtml: `<p><strong>${row.title}</strong> ${row.detail}</p>`,
        })),
      }),
    );
  // The hero's live demo: the code it shows is the code that runs. The
  // button in the mount is the no-script render; hero-demo.js swaps in
  // the template copy and hydrates it with the real runtime.
  const codeBlock = (caption, code) => renderTrinity('code-block', { caption, code });
  const liveButton = (label) =>
    renderTrinity('button', { label, variant: 'primary' }).trim();
  const heroDemo =
    '<section aria-label="Live demo" data-bn-hero-demo>' +
    codeBlock('counter.html', HERO_DEMO_SOURCE) +
    '<p data-bn-hero-demo-live aria-live="polite">' +
    liveButton('Clicked 0 times') +
    '<small>Live — this page’s runtime</small></p>' +
    '<template data-bn-hero-demo-source>' +
    liveButton('Clicked {{ count() }} times').replace('<button ', '<button @click="increment()" ') +
    '<small>Live — this page’s runtime</small></template>' +
    '</section>';
  return {
    runtimeVersion,
    heroDemo,
    // The install command, copyable, above the fold — the first thing a
    // visitor takes from the page.
    installBlock: renderTrinity('code-block', {
      caption: 'Terminal',
      code: 'npm install @basenative/runtime',
      actionsHtml: renderTrinity('button', { label: 'Copy', variant: 'ghost' })
        .trim()
        .replace('<button ', '<button hidden data-bn-copy aria-label="Copy the install command" '),
    }),
    startBlocks: raw(
      codeBlock('Terminal', 'npm install @basenative/runtime') +
        codeBlock('index.html', START_SOURCE),
    ),
    runtimeList: listOf([
      {
        title: 'Apple-grade design.',
        detail: `${catalogCount} components with a platform kit’s finish: one type scale, light and dark, 44px touch targets, from a 320px phone to a desktop. <a href="/components">Browse them</a>.`,
      },
      {
        title: 'All in code.',
        detail:
          'Platform design kits ship as drawing files you rebuild by hand. BaseNative ships the components themselves: an HTML template, a token sheet and a view model for each one.',
      },
      {
        title: 'Open source.',
        detail:
          'Apache-2.0 and published on npm. Theme it with tokens, fork it, ship it. <a href="https://github.com/DuganLabs/BaseNative">Source on GitHub</a>.',
      },
      {
        title: 'Web standards.',
        detail: `Built on ${escapeTags('<button>, <dialog>, <details>, <table>')} and the popover API. No build step, no virtual DOM, no dependencies in core. Runtime gzip ${runtimeSizeStat()}.`,
      },
      {
        title: 'AI-safe.',
        detail:
          'The expression language is an allowlist, never eval, so generated templates run under a strict CSP. An effect that writes a signal it read throws <code>BN_EFFECT_LOOP</code> instead of looping.',
      },
      {
        title: 'Agent-ready.',
        detail:
          '<code>npx -p @basenative/cli bn create my-app</code> scaffolds a project, <code>@basenative/mcp</code> gives any agent validation and previews, and <a href="/llms.txt">llms.txt</a> indexes the docs. <a href="/ai">How it works</a>.',
      },
    ]),
    catalogList: listOf([
      {
        title: '@basenative/components',
        detail: `${catalogCount} components, each three files: a template, a token sheet and its logic, in light and dark.`,
      },
      {
        title: '@basenative/runtime',
        detail: 'Signals, computed values, effects and hydrate(), over the HTML you already write.',
      },
      {
        title: '@basenative/server',
        detail: 'render() turns the same templates into HTML, so pages are fast and crawlable before any script runs.',
      },
      {
        title: '@basenative/validate',
        detail:
          'Flags className, htmlFor, onClick, {expr} text, useState, useEffect, and useMemo, and names the replacement.',
      },
      {
        title: '@basenative/cli',
        detail: 'bn create scaffolds a project; bn from-jsx rewrites a React or JSX draft into BaseNative.',
      },
      {
        title: 'Public packages',
        detail: `${packages} on npmjs.org.`,
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
  // The client script in components.html (the app demo section) keeps
  // this list in sync in the same shape as the signals move.
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
    // The static build has no API: the demo keeps tasks in the browser
    // there, and the section says so up front (the dev server, with a
    // live API, shows no notice).
    tasksNotice: hasApi
      ? ''
      : raw(
          '<p data-tasks-static-notice>This is the static demo — tasks you add are kept in your browser and are not saved to a server.</p>',
        ),
  };
}

function sentenceCase(title) {
  const text = String(title);
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}

export function getComponentsPageContext() {
  const entries = trinityCatalog(trinityComponentInfo());
  const categories = trinityCategoriesWith(entries);
  const filters = raw(
    renderTrinity('sidebar', {
      variant: 'subnav',
      label: 'Filter by category',
      sections: [
        {
          label: 'Filter by category',
          items: [
            { label: 'All', value: 'all', pressed: true },
            ...categories.map((cat) => ({ label: sentenceCase(cat.title), value: cat.id })),
          ],
        },
      ],
    }),
  );
  return {
    categories,
    filters,
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
