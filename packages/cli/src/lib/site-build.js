// Built with BaseNative — basenative.dev
/**
 * Deterministic static page generation — the core of `bn site build`.
 *
 * The input is a JSON file naming the site's page module (the same
 * module the dev server renders through: it exports `siteRoutes` and
 * `renderRoute`), an output directory, and the pages to generate.
 * A page entry is a route path, or an object whose `path` is the route
 * and whose remaining fields are the page spec, handed to the renderer
 * as data. Pages render through the site's own renderers with the
 * static snapshot context, so generated output and server output
 * agree by construction.
 *
 * Determinism contract: pages are written in sorted path order, the
 * output depends only on the input file and the site module — no
 * Date, no environment, no randomness — and regeneration overwrites.
 * Same input, same tree, byte for byte.
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export async function buildSite(inputPath, options = {}) {
  const { outdir: outdirOverride, dryRun = false, guard = null } = options;
  const inputFile = resolve(inputPath);
  const base = dirname(inputFile);
  const input = JSON.parse(readFileSync(inputFile, 'utf-8'));
  if (!input.module) throw new Error(`${inputPath}: "module" is required`);
  if (!Array.isArray(input.pages) || input.pages.length === 0) {
    throw new Error(`${inputPath}: "pages" must be a non-empty array`);
  }

  const mod = await import(pathToFileURL(resolve(base, input.module)).href);
  if (!Array.isArray(mod.siteRoutes) || typeof mod.renderRoute !== 'function') {
    throw new Error(`${input.module}: expected exports siteRoutes + renderRoute`);
  }

  const specs = new Map();
  for (const entry of input.pages) {
    if (typeof entry === 'string') specs.set(entry, {});
    else if (entry && typeof entry.path === 'string') specs.set(entry.path, entry);
    else throw new Error(`${inputPath}: page entries must be paths or { path, ...spec } objects`);
  }

  const routes = mod.siteRoutes.filter((route) => specs.has(route.path));
  const missing = [...specs.keys()].filter(
    (path) => !mod.siteRoutes.some((route) => route.path === path),
  );
  if (missing.length) {
    throw new Error(`${inputPath}: no route in ${input.module} for ${missing.join(', ')}`);
  }
  const publishable = routes.filter((route) => !route.internal);
  if (publishable.length !== routes.length) {
    const internal = routes.filter((route) => route.internal).map((route) => route.path);
    throw new Error(`${inputPath}: ${internal.join(', ')} is internal and is never published`);
  }
  publishable.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));

  const outdir = resolve(base, outdirOverride || input.outdir || 'dist');
  // The static snapshot context — the same one scripts/build-pages.js
  // hands the express renderer for the deploy build.
  const site = { tasks: [], hasApi: false };
  const written = [];
  for (const route of publishable) {
    let html = mod.renderRoute(route, site, specs.get(route.path));
    if (guard) html = guard(html, route.path);
    const rel = route.path.replace(/^\/+/, '');
    const dir = rel ? join(outdir, rel) : outdir;
    if (!dryRun) {
      mkdirSync(dir, { recursive: true });
      writeFileSync(join(dir, 'index.html'), html);
    }
    written.push(`/${rel ? `${rel}/` : ''}`);
  }
  return { outdir, written };
}
