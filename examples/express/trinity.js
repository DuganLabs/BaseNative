/**
 * Server-side access to the Holy Trinity catalog (@basenative/components).
 * The registry loads once at module scope; rendering is synchronous from
 * then on, so page.js keeps its synchronous assembly. Every component the
 * site renders — heroes, the shell, the footer, and (as pages migrate)
 * the content components — comes through here: the catalog is the one
 * source of site markup.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { render } from '@basenative/server';
import { loadRegistry, renderComponent, assembleStyles } from '../../packages/components/src/loader.js';

const componentsDir = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../packages/components/src',
);

const registry = await loadRegistry();
const siteCss = await assembleStyles(registry, [...registry.listComponents()]);

/** Render one catalog component to an HTML string. */
export function renderTrinity(name, props) {
  return renderComponent(registry, render, name, props).html;
}

/**
 * The chrome components' own sheets, concatenated in cascade order
 * (app-shell last: its frame rules win ties against the pieces it
 * composes). Inlined into every page as the shell's critical CSS —
 * pages cache stylesheets for hours and revalidate HTML immediately,
 * so the window chrome cannot depend on a linked sheet arriving fresh
 * (the 2026-10-20 phone incident). The token sheet itself rides the
 * versioned /bn-css link like every other sheet.
 */
export function trinityChromeCss() {
  return ['hero', 'sidebar', 'app-bar', 'site-footer', 'app-shell']
    .map((name) => registry.getComponent(name).styles.trim())
    .join('\n');
}

/**
 * The whole catalog as one sheet (tokens, then every component in
 * registry order), served at /bn-css/trinity.css — the catalog's styles
 * for every page, versioned and cached like the other sheets. The
 * chrome subset also rides inline as critical CSS (trinityChromeCss);
 * this sheet is what dresses everything else the catalog renders,
 * hero action buttons included.
 */
export function trinitySiteCss() {
  return siteCss;
}

/** Render one catalog component, returning the view model alongside the HTML. */
export function renderTrinityVm(name, props) {
  return renderComponent(registry, render, name, props);
}

/**
 * Every registered component with the facts the catalog pages present:
 * its root element, its registered variants, its template and sheet
 * (from the registry) and its logic file (read from the package — the
 * component is its three files, and the pages show all three).
 */
export function trinityComponentInfo() {
  return [...registry.listComponents()].map((name) => {
    const def = registry.getComponent(name);
    return {
      name,
      root: def.root,
      variants: registry.listVariants(name),
      template: readFileSync(join(componentsDir, name, 'index.html'), 'utf8'),
      styles: def.styles,
      source: readFileSync(join(componentsDir, name, 'index.js'), 'utf8'),
    };
  });
}
