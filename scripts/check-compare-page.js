/**
 * Fails the build when /compare (or /roadmap) and the source disagree.
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
  workspacePackages,
} from './compare-stats.js';
import { renderRoute, siteRoutes } from '../examples/express/page.js';

/**
 * Prose claims that BaseNative *lacks* a capability, paired with the workspace
 * package that would make the claim false. The numeric checks below cannot see
 * these — "No HMR" survived on /compare for as long as @basenative/hmr had
 * existed — so a negative phrase is a problem the moment its package ships.
 */
export const CAPABILITY_CLAIMS = [
  { phrase: /\bNo HMR\b/i, packageDir: 'hmr' },
  { phrase: /\bno hot[- ]module\b/i, packageDir: 'hmr' },
  { phrase: /\bno (?:client[- ]side )?router\b/i, packageDir: 'router' },
  { phrase: /\bno forms? (?:library|package|support)\b/i, packageDir: 'forms' },
  { phrase: /\bno i18n\b/i, packageDir: 'i18n' },
  { phrase: /\bno auth(?:entication)?\b/i, packageDir: 'auth' },
];

/** The roadmap's readiness tiles are read from this file; see roadmapProblems(). */
export const SITE_DATA = 'examples/express/site-data.js';

/**
 * @param {string} text  rendered page or view source
 * @param {string[]} [packageDirs]  workspace package directories (defaults to the real ones)
 * @returns {string[]} one problem per negative claim whose package exists
 */
export function capabilityProblems(
  text,
  packageDirs = workspacePackages().map((p) => p.dir),
  view = COMPARE_VIEW,
) {
  const shipped = new Set(packageDirs);
  const problems = [];
  for (const { phrase, packageDir } of CAPABILITY_CLAIMS) {
    const hit = text.match(phrase);
    if (hit && shipped.has(packageDir)) {
      problems.push(`${view} says "${hit[0]}" but packages/${packageDir} ships.`);
    }
  }
  return problems;
}

/**
 * /roadmap's readiness tiles state facts about the repository the same way
 * /compare's numbers do, and the "Public Packages" tile read 39 while the
 * workspace published 42. A tile value may not be a typed number, and the
 * rendered page must carry the count the source measures today.
 *
 * @param {{ publicPackages: number }} stats
 * @returns {string[]}
 */
export function roadmapProblems(stats) {
  const problems = [];
  const source = readRepoFile(SITE_DATA);
  const tiles = source.match(/readinessStats:\s*\[([\s\S]*?)\]/);
  if (!tiles) {
    problems.push(
      `${SITE_DATA} no longer defines readinessStats; the /roadmap guard has nothing to check.`,
    );
    return problems;
  }
  for (const [, literal] of tiles[1].matchAll(/value:\s*'(\d[\d,.]*)'/g)) {
    problems.push(
      `${SITE_DATA} hardcodes '${literal}' as a /roadmap readiness tile. Derive it from ` +
        `scripts/compare-stats.js (computeCompareStats()) instead of retyping it.`,
    );
  }
  const route = siteRoutes.find((entry) => entry.path === '/roadmap');
  if (!route) {
    problems.push(
      'No /roadmap route in examples/express/page.js — the page would not be built or deployed.',
    );
    return problems;
  }
  const html = renderRoute(route, { tasks: [], hasApi: false });
  const expected = `<strong>${stats.publicPackages}</strong>`;
  if (!html.includes(expected)) {
    problems.push(
      `/roadmap renders without a "${stats.publicPackages}" readiness tile, which is how many ` +
        `non-private packages the workspace has today. The page and the repository disagree.`,
    );
  }
  return problems;
}

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

  problems.push(...capabilityProblems(html));
  problems.push(...roadmapProblems(stats));

  return problems;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const problems = checkComparePage();
  if (problems.length) {
    console.error('/compare or /roadmap disagrees with the source:\n');
    for (const problem of problems) console.error(`  • ${problem}`);
    console.error('\nFix the page or the claim. Do not ship a number you cannot substantiate.');
    process.exit(1);
  }
  console.log('/compare matches the source.');
}
