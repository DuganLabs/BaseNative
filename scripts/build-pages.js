/**
 * Pre-renders all Express routes to static HTML for Cloudflare Pages deployment.
 * Run after `nx bundle basenative-example-express` so basenative.js exists.
 */
import { existsSync, mkdirSync, writeFileSync, cpSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  SITE_URL,
  renderComponentPage,
  renderNotFoundPage,
  renderRoute,
  siteRoutes,
} from '../examples/express/page.js';
import { flatComponents } from '../examples/express/component-catalog.js';
import { staticTasks } from '../examples/express/site-data.js';
import { checkComparePage } from './check-compare-page.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const express = join(root, 'examples', 'express');
const dist = join(root, 'dist');

// The dev-only client is injected by `hmrMiddleware()` at request time, which
// this build never runs — so the static output carries no dev script to strip.
// Guarded anyway: a dev tag reaching Pages would 404 on every page load.
function assertNoDevScripts(html, route) {
  if (html.includes('data-bn-hmr')) {
    throw new Error(`dev-only HMR client leaked into the static build for ${route || '/'}`);
  }
  return html;
}

// Markup handed to the template through {{ }} is HTML-escaped by default, which
// is correct for text and silently wrong for markup: the value renders as a wall
// of visible tags where a component should be. That is how every
// /components/:slug page shipped its "Live render" pane and its breadcrumb as
// source text. The fix is raw() at the context boundary; this is the guard that
// the next one gets caught before it reaches Pages, since nothing about an
// escaped page is broken enough to fail a build or a test on its own.
const ESCAPED_MARKUP = /&lt;(?:\/?)[a-z][a-z0-9-]*(?=[\s&])[^<]*?data-bn/i;

function assertNoEscapedMarkup(html, route) {
  const hit = ESCAPED_MARKUP.exec(html);
  if (hit) {
    throw new Error(
      `escaped component markup reached the page for ${route || '/'} — ` +
        `a {{ }} value holds markup and needs raw() at the context boundary:\n  ` +
        `${hit[0].slice(0, 120)}`,
    );
  }
  return html;
}

// Every page path this build writes, in order — the sitemap is derived from
// it rather than from a second list that could disagree with what shipped.
const published = [];

function writePage(path, html) {
  const route = path.replace(/^\/+/, '');
  const dir = route ? join(dist, route) : dist;
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'index.html'), assertNoEscapedMarkup(assertNoDevScripts(html, route), route));
  published.push(`/${route ? `${route}/` : ''}`);
  console.log(`  /${route ? `${route}/` : ''}`);
}

// -- Build --
console.log('Building static site...');

// /compare states measured facts about this repository. Refuse to publish a
// build where those numbers and the source disagree.
const comparePageProblems = checkComparePage();
if (comparePageProblems.length) {
  console.error('/compare disagrees with the source — refusing to build:\n');
  for (const problem of comparePageProblems) console.error(`  • ${problem}`);
  console.error('\nRun `node scripts/compare-stats.js` to see what the source actually says.');
  process.exit(1);
}

mkdirSync(dist, { recursive: true });

// Top-level routes: the same table server.js serves, with the fixed task snapshot.
// Internal routes (the signal-verification harness) stay on the dev server.
for (const route of siteRoutes) {
  if (route.internal) continue;
  writePage(route.path, renderRoute(route, { tasks: staticTasks, hasApi: false }));
}

// One page per catalog entry — the catalog links to every slug in flatComponents,
// so anything missing here is a soft 404 on Cloudflare Pages.
for (const component of flatComponents) {
  writePage(`components/${component.slug}`, renderComponentPage(component.slug));
}

// Cloudflare Pages serves dist/404.html with a 404 status for any unknown path
// (and stops falling back to index.html once the file exists).
writeFileSync(
  join(dist, '404.html'),
  assertNoEscapedMarkup(assertNoDevScripts(renderNotFoundPage(), '404.html'), '404.html'),
);
console.log('  404.html');

// Copy static assets
cpSync(join(express, 'public', 'styles.css'), join(dist, 'styles.css'));
cpSync(join(express, 'public', 'theme.css'), join(dist, 'theme.css'));
cpSync(join(express, 'public', 'basenative.js'), join(dist, 'basenative.js'));
cpSync(join(express, 'public', 'showcase.js'), join(dist, 'showcase.js'));
cpSync(join(express, 'public', 'builder.js'), join(dist, 'builder.js'));
cpSync(join(express, 'public', 'compare.js'), join(dist, 'compare.js'));
// Brand assets — favicon bundle (bn-favicon, preset `basenative`) + OG card
for (const file of [
  'favicon.svg',
  'favicon.ico',
  'apple-touch-icon.png',
  'icon-192.png',
  'icon-512.png',
  'maskable.png',
  'manifest.json',
  'og-default.png',
]) {
  cpSync(join(express, 'public', file), join(dist, file));
}
cpSync(join(express, 'public', 'avatar-eve.svg'), join(dist, 'avatar-eve.svg'));

// Copy component CSS (served as /bn-css/ in Express, must exist in dist)
const bnCssDir = join(dist, 'bn-css');
mkdirSync(bnCssDir, { recursive: true });
const componentSrc = join(root, 'packages', 'components', 'src');
for (const file of [
  'index.css',
  'layers.css',
  'reset.css',
  'tokens.css',
  'theme.css',
  'layout.css',
  'components.css',
  'states.css',
]) {
  cpSync(join(componentSrc, file), join(bnCssDir, file));
}

// Copy builder CSS (served as /bn-builder-css/ in Express, must exist in dist)
const bnBuilderCssDir = join(dist, 'bn-builder-css');
mkdirSync(bnBuilderCssDir, { recursive: true });
cpSync(
  join(root, 'packages', 'builder', 'src', 'builder.css'),
  join(bnBuilderCssDir, 'builder.css'),
);

// Copy fonts (preserve structure so fonts.css relative paths work)
cpSync(join(root, 'packages', 'fonts'), join(dist, 'fonts'), { recursive: true });

// Copy icons
cpSync(join(root, 'packages', 'icons', 'src'), join(dist, 'icons'), { recursive: true });

// Write Cloudflare Pages _headers file for security headers
const headers = `/*
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: geolocation=(), microphone=(), camera=()
  Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data:; connect-src 'self'
  Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
  Cross-Origin-Opener-Policy: same-origin
`;
writeFileSync(join(dist, '_headers'), headers);
console.log('  _headers (security)');

// Discovery files. The sitemap lists exactly what writePage() wrote, so a route
// added without a nav entry still gets indexed and a route skipped above never
// appears. llms.txt / llms-full.txt are generated by scripts/llms-txt.js and CI
// fails on drift, so the committed copies are copied, not regenerated here.
const sitemap =
  `<?xml version="1.0" encoding="UTF-8"?>\n` +
  `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  published.map((path) => `  <url><loc>${SITE_URL}${path}</loc></url>`).join('\n') +
  `\n</urlset>\n`;
writeFileSync(join(dist, 'sitemap.xml'), sitemap);
console.log(`  sitemap.xml (${published.length} urls)`);

writeFileSync(join(dist, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}/sitemap.xml\n`);
console.log('  robots.txt');

for (const file of ['llms.txt', 'llms-full.txt']) {
  cpSync(join(root, file), join(dist, file));
  console.log(`  ${file}`);
}

// The build refuses to finish without its discovery files, and with a page it
// was told not to publish.
for (const file of ['sitemap.xml', 'robots.txt', 'llms.txt', 'llms-full.txt', '_headers', '404.html']) {
  if (!existsSync(join(dist, file))) throw new Error(`dist/${file} was not written`);
}
for (const route of siteRoutes) {
  if (!route.internal) continue;
  const dir = join(dist, route.path.replace(/^\/+/, ''));
  if (existsSync(dir)) {
    throw new Error(`${route.path} is internal but dist/${route.path.replace(/^\/+/, '')} exists — ` +
      `delete dist/ before building, or the route was written anyway`);
  }
}

console.log('Done → dist/');
