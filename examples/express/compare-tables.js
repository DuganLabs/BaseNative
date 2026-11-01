/**
 * The /compare tables, composed from the catalog table.
 *
 * Every measured number below is composed from the `stats` object that
 * scripts/compare-stats.js derives from source — no figure is typed here
 * either. Measured cells are built with `m()` so scripts/check-compare-page.js
 * can hold this file to the same discipline it holds the view: strip the
 * `${stats.…}` interpolations out of an `m()` literal and no digit may remain.
 * Editorial cells (a competitor's "15+ hooks", a plain "Required") are built
 * with `t()` and may state their own text.
 *
 * Verdict tones ride a span in the cell content — the same app-level device
 * as the verdict cards' [data-compare-card] hooks — because tone is this
 * page's editorial layer, not the table's structure. styles.css colours the
 * spans as plain text: a pill in every cell of a five-column table reads as
 * noise, and the point of these tables is scanning one row against another.
 */
import { raw } from '@basenative/runtime/shared/escape';
import { renderTrinity } from './trinity.js';
import { cellProse } from './cell-prose.js';

/** A toned cell: the verdict is editorial content, carried by a span. */
function toned(text, tone) {
  if (!tone) return { contentHtml: cellProse(text) };
  // A span because the verdict is a run of coloured text inside the cell's
  // content slot — the page's sheet colours it; nothing is stamped on the
  // catalog table itself.
  return { contentHtml: `<span data-tone="${tone}">${cellProse(text)}</span>` };
}

/** An editorial cell — its text is the page's own wording, not a measurement. */
const t = (text, tone) => toned(text, tone);

/** A measured cell — its text must be composed from `stats`, never typed. */
const m = (text, tone) => toned(text, tone);

/** A row header cell. */
const h = (text) => ({ text, header: true });

function table(columns, rows) {
  return renderTrinity('table', { columns, rows });
}

/**
 * @param {ReturnType<import('../../scripts/compare-stats.js').computeCompareStats>} stats
 *   measured from source by scripts/compare-stats.js
 */
export function getCompareTables(stats) {
  const frameworks = ['Measure', 'BaseNative', stats.reactLabel, stats.angularLabel, stats.svelteLabel];

  const bundleTable = table(frameworks, [
    [
      h('Runtime size (min+gz)'),
      m(`${stats.runtimeGzipKb} KB`, 'win'),
      m(`~${stats.reactGzipKb} KB`, 'cost'),
      m(`~${stats.angularGzipKb} KB`, 'cost'),
      m(`~${stats.svelteGzipKb} KB`, 'even'),
    ],
    [
      h('Core production deps'),
      m(`${stats.runtimeProdDeps}`, 'win'),
      m(`${stats.reactDeps}`, 'even'),
      m(`${stats.angularDeps}`, 'cost'),
      m(`${stats.svelteDeps}`, 'win'),
    ],
    [
      h('Build step'),
      t('None', 'win'),
      t('Required (JSX)', 'cost'),
      t('Required (TS + AOT)', 'cost'),
      t('Required (compiler)', 'cost'),
    ],
    [
      h('Runtime source you can read'),
      m(`${stats.runtimeSourceLines} lines`, 'win'),
      m(`~${stats.reactSourceLines} lines`, 'even'),
      m(`~${stats.angularSourceLines} lines`, 'even'),
      m(`~${stats.svelteSourceLines} lines`, 'even'),
    ],
  ]);

  const postureTable = table(frameworks, [
    [
      h('eval / Function constructor in shipped code'),
      m(`${stats.unsafeEvalUses}`, 'win'),
      t('0 — after its compiler runs', 'even'),
      t('0 — after AOT compilation', 'even'),
      t('0 — after its compiler runs', 'even'),
    ],
    [
      h('Template stays data at runtime'),
      t('Yes — parsed, never compiled to code', 'win'),
      t('No — JSX compiles to JavaScript', 'cost'),
      t('No — templates compile at build time', 'cost'),
      t('No — .svelte compiles to JavaScript', 'cost'),
    ],
    [
      h('A stored template (CMS, database, model output) renders as-is'),
      t('Yes — interpreted against a scope, prototype access blocklisted', 'win'),
      t('No — it must go through the build first', 'cost'),
      t('No — it must go through the build first', 'cost'),
      t('No — it must go through the build first', 'cost'),
    ],
  ]);

  const benchTable = table(['Measure', 'BaseNative', 'React'], [
    [
      h('Build and tooling fixes before tests passed'),
      m(`${stats.benchBnToolingFixes}`, 'win'),
      m(`${stats.benchReactToolingFixes}`, 'cost'),
    ],
    [
      h('App-code fixes'),
      m(`${stats.benchBnAppFixes}`, 'even'),
      m(`${stats.benchReactAppFixes}`, 'even'),
    ],
    [
      h('Production dependencies (interactive task)'),
      m(`${stats.benchBnDeps}`, 'win'),
      m(`${stats.benchReactDeps}`, 'even'),
    ],
    [
      h('Hand-written lines (both tasks)'),
      m(`${stats.benchBnLines}`, 'even'),
      m(`${stats.benchReactLines}`, 'even'),
    ],
    [
      h('Approx. code tokens (both tasks)'),
      m(`${stats.benchBnTokens}`, 'cost'),
      m(`${stats.benchReactTokens}`, 'win'),
    ],
  ]);

  const apiTable = table(frameworks, [
    [
      h('Core concepts to learn'),
      m(`${stats.corePrimitives}`, 'win'),
      t('15+ hooks', 'cost'),
      t('30+ concepts', 'cost'),
      t('~8 runes', 'win'),
    ],
    [
      h('Reactivity model'),
      t('Signals (push)', 'even'),
      t('Virtual DOM (pull)', 'even'),
      t('Signals (push)', 'even'),
      t('Runes/compiler (push)', 'even'),
    ],
    [
      h('Template syntax'),
      t('Valid HTML', 'win'),
      t('JSX (not HTML)', 'cost'),
      t('Extended HTML', 'even'),
      t('Custom (.svelte)', 'even'),
    ],
    [
      h('TypeScript'),
      t('Optional', 'even'),
      t('Optional', 'even'),
      t('Required', 'cost'),
      t('Optional', 'even'),
    ],
  ]);

  const ssrTable = table(frameworks, [
    [
      h('SSR built-in'),
      t('Yes', 'win'),
      t('Via Next.js / manual', 'cost'),
      t('Yes (built-in SSR)', 'win'),
      t('Via SvelteKit', 'cost'),
    ],
    [
      h('Lazy hydration'),
      m(`${stats.hydrationStrategies} strategies built-in`, 'win'),
      t('Manual / React.lazy', 'cost'),
      t('@defer (partial)', 'even'),
      t('Manual', 'cost'),
    ],
    [
      h('Hydration strategies'),
      m(`${stats.hydrationStrategyNames}`, 'win'),
      t('N/A', 'even'),
      t('@defer on viewport', 'even'),
      t('N/A', 'even'),
    ],
    [
      h('CSP-safe expressions'),
      t('Yes (no eval/Function)', 'win'),
      t('Yes (JSX compiled)', 'win'),
      t('Yes (AOT compiled)', 'win'),
      t('Yes (compiled)', 'win'),
    ],
  ]);

  const dxTable = table(frameworks, [
    [
      h('Time to first render'),
      t('Open HTML file', 'win'),
      t('npm create vite@latest', 'cost'),
      t('ng new + ng serve', 'cost'),
      t('npx sv create', 'cost'),
    ],
    [
      h('Hot reload'),
      t('HMR (@basenative/hmr)', 'win'),
      t('Fast Refresh', 'win'),
      t('HMR', 'win'),
      t('HMR', 'win'),
    ],
    [
      h('Ecosystem packages'),
      t('Growing', 'cost'),
      t('Massive', 'win'),
      t('Large', 'win'),
      t('Moderate', 'even'),
    ],
    [
      h('Component model'),
      t('Semantic HTML — W3C primitives are the component model', 'even'),
      t('Components + hooks', 'win'),
      t('Components + DI', 'win'),
      t('Components', 'win'),
    ],
    [
      h('Community size'),
      t('Solo project', 'cost'),
      t('Millions', 'win'),
      t('Millions', 'win'),
      t('Hundreds of thousands', 'even'),
    ],
  ]);

  return {
    bundleTable: raw(bundleTable),
    postureTable: raw(postureTable),
    benchTable: raw(benchTable),
    apiTable: raw(apiTable),
    ssrTable: raw(ssrTable),
    dxTable: raw(dxTable),
  };
}
