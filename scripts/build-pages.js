/**
 * Pre-renders all Express routes to static HTML for Cloudflare Pages deployment.
 * Run after `nx bundle basenative-example-express` so basenative.js exists.
 */
import { mkdirSync, writeFileSync, cpSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  renderComponentPage,
  renderNotFoundPage,
  renderRoute,
  siteRoutes,
} from '../examples/express/page.js';
import { flatComponents } from '../examples/express/component-catalog.js';
import { staticTasks } from '../examples/express/site-data.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const express = join(root, 'examples', 'express');
const dist = join(root, 'dist');

// The dev-only live-reload snippet (an EventSource against /__live, which
// only server.js serves) has no route on the static host, so it should
// never ship — Pages returns HTML for that request, which the browser then
// rejects and logs as a console error on every page load.
const LIVE_RELOAD_SCRIPT = /\s*<script>if\(!location\.search\.includes\('nolr'\)\)new EventSource\('\/__live'\)[^<]*<\/script>/;

function stripDevScripts(html) {
  return html.replace(LIVE_RELOAD_SCRIPT, '');
}

function writePage(path, html) {
  const route = path.replace(/^\/+/, '');
  const dir = route ? join(dist, route) : dist;
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'index.html'), stripDevScripts(html));
  console.log(`  /${route ? `${route}/` : ''}`);
}

// -- Build --
console.log('Building static site...');
mkdirSync(dist, { recursive: true });

// Top-level routes: the same table server.js serves, with the fixed task snapshot.
for (const route of siteRoutes) {
  writePage(route.path, renderRoute(route, { tasks: staticTasks, hasApi: false }));
}

// One page per catalog entry — the catalog links to every slug in flatComponents,
// so anything missing here is a soft 404 on Cloudflare Pages.
for (const component of flatComponents) {
  writePage(`components/${component.slug}`, renderComponentPage(component.slug));
}

// Cloudflare Pages serves dist/404.html with a 404 status for any unknown path
// (and stops falling back to index.html once the file exists).
writeFileSync(join(dist, '404.html'), stripDevScripts(renderNotFoundPage()));
console.log('  404.html');

// Copy static assets
cpSync(join(express, 'public', 'styles.css'), join(dist, 'styles.css'));
cpSync(join(express, 'public', 'theme.css'), join(dist, 'theme.css'));
cpSync(join(express, 'public', 'basenative.js'), join(dist, 'basenative.js'));
cpSync(join(express, 'public', 'showcase.js'), join(dist, 'showcase.js'));
cpSync(join(express, 'public', 'builder.js'), join(dist, 'builder.js'));
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

console.log('Done → dist/');
