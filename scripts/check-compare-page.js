/**
 * Fails the build when /compare and the source disagree.
 *
 * This is the reason the comparison page lives in this repository rather than
 * on duganlabs.com. The page asserts measurable facts about BaseNative — the
 * size of the runtime, the number of dependencies, the number of primitives —
 * and those rot the moment they are maintained away from the code that
 * produces them. Two checks together make that impossible:
 *
 *   1. The view must *bind* every BaseNative number (`{{ stats.x }}`), so no
 *      one can type a figure into the template.
 *   2. The rendered page must contain the value that `computeCompareStats()`
 *      measures from source right now, so a binding cannot render something
 *      stale.
 *
 * Run by `scripts/build-pages.js` before the site is written, and by the
 * cross-package integration suite on every pull request.
 *
 *   node scripts/check-compare-page.js
 *
 * Lives apart from `compare-stats.js` because rendering the page imports
 * `examples/express/site-data.js`, which imports `compare-stats.js` — putting
 * the render here keeps that cycle from ever forming.
 */
import { pathToFileURL } from 'node:url';
import {
  COMPARE_VIEW,
  RENDERED_CLAIMS,
  computeCompareStats,
  readRepoFile,
} from './compare-stats.js';
import { renderRoute, siteRoutes } from '../examples/express/page.js';

/**
 * @returns {string[]} problems found; empty means the page tells the truth.
 */
export function checkComparePage() {
  const stats = computeCompareStats();
  const view = readRepoFile(COMPARE_VIEW);
  const problems = [];

  for (const claim of RENDERED_CLAIMS) {
    if (!new RegExp(`\\{\\{\\s*stats\\.${claim}\\s*\\}\\}`).test(view)) {
      problems.push(
        `${COMPARE_VIEW} never binds {{ stats.${claim} }}. Every BaseNative number on /compare ` +
          `must be rendered from scripts/compare-stats.js, never typed into the view.`,
      );
    }
  }

  // Every element marked `data-claim` states a measured fact, so its text must
  // come entirely from bindings: strip the `{{ … }}` and no digit may remain.
  // Without this, adding a correct binding elsewhere on the page would let a
  // hand-typed number sit in the slot the reader actually looks at.
  const claimSlots = [...view.matchAll(/<([a-z]+)\b[^>]*\bdata-claim\b[^>]*>([\s\S]*?)<\/\1>/g)];
  if (claimSlots.length < RENDERED_CLAIMS.length) {
    problems.push(
      `${COMPARE_VIEW} marks only ${claimSlots.length} elements with data-claim but the page makes ` +
        `${RENDERED_CLAIMS.length} measured claims. Mark every slot that states one.`,
    );
  }
  for (const [, tag, inner] of claimSlots) {
    const literal = inner.replace(/\{\{[\s\S]*?\}\}/g, '');
    const digits = literal.match(/\d[\d,.]*/g);
    if (digits) {
      problems.push(
        `${COMPARE_VIEW} has a hand-typed ${digits.join(', ')} inside a <${tag} data-claim> slot: ` +
          `"${inner.trim().replace(/\s+/g, ' ').slice(0, 90)}". Bind it to scripts/compare-stats.js.`,
      );
    }
  }

  const route = siteRoutes.find((entry) => entry.path === '/compare');
  if (!route) {
    problems.push(
      'No /compare route in examples/express/page.js — the page would not be built or deployed.',
    );
    return problems;
  }

  const html = renderRoute(route, { tasks: [], hasApi: false });
  for (const claim of RENDERED_CLAIMS) {
    const value = String(stats[claim]);
    if (!html.includes(value)) {
      problems.push(
        `/compare renders without "${value}" (${claim}), which is what the source says today. ` +
          `The page and the repository disagree.`,
      );
    }
  }

  // Belt and braces for the two claims that were actually wrong when the page
  // moved here: a "~5 KB" runtime that measures 9.6 KB, and a line count typed
  // in by hand. Either one reappearing as a literal is a regression.
  if (/~\s*5\s*KB/i.test(view)) {
    problems.push(
      `${COMPARE_VIEW} hardcodes a "~5 KB" runtime size. The measured size is ` +
        `${stats.runtimeGzipKb} KB — bind {{ stats.runtimeGzipKb }} instead.`,
    );
  }
  if (/\b\d{2,}\s+lines\b/.test(view)) {
    problems.push(
      `${COMPARE_VIEW} hardcodes a line count. Bind it to scripts/compare-stats.js instead.`,
    );
  }

  return problems;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const problems = checkComparePage();
  if (problems.length) {
    console.error('/compare disagrees with the source:\n');
    for (const problem of problems) console.error(`  • ${problem}`);
    console.error('\nFix the page or the claim. Do not ship a number you cannot substantiate.');
    process.exit(1);
  }
  console.log('/compare matches the source.');
}
