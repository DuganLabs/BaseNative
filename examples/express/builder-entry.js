// Named import, referenced below on purpose: a bare
// `import '@basenative/builder'` is tree-shaken away by esbuild in
// this workspace (the package's sideEffects array is not honored
// through the pnpm symlink), which silently produced a bundle with
// the shim only and no <bn-builder> registration — the /builder
// page rendered empty. Keep the binding used.
import { BnBuilder } from '@basenative/builder';
import { hlHTML } from './public/highlight-engine.js';

if (typeof window !== 'undefined') window.__BnBuilder = BnBuilder;

const ready = (fn) =>
  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', fn, { once: true })
    : fn();

/* The inspector's enum props render with the custom select, the
   site's default (the platform <select> is the documented `native`
   variant). The template is fetched under the bundle's deploy
   version, as specimens.js does, so it always pairs with this view model. */
const assetVersion = new URL(import.meta.url).searchParams.get('v');
let selectTemplate = null;
const templateText = () =>
  (selectTemplate ??= fetch(
    assetVersion ? `/bn-css/select/index.html?v=${assetVersion}` : '/bn-css/select/index.html',
  )
    .then((response) => response.text())
    .then((text) => text.replace(/^\s*<template>/, '').replace(/<\/template>\s*$/, '')));

const openSelects = new Set();
document.addEventListener('pointerdown', (event) => {
  for (const entry of openSelects) {
    if (!entry.root.isConnected) openSelects.delete(entry);
    else if (entry.vm.open() && !entry.root.contains(event.target)) entry.vm.close();
  }
});

/* The select and hydrate come from the site bundle every page already
   loads (import-mapped to this deploy), not a second copy in this one. */
const siteBundle = '/basenative.js';
let site = null;
const loadSite = () => (site ??= import(siteBundle));

async function mountSelect(host, { id, label, value, options, onChoose, focus }) {
  const [{ select, hydrate }, markup] = await Promise.all([loadSite(), templateText()]);
  const vm = select.create({ id, label, value, options, onChoose });
  if (!host.isConnected) return;
  const template = document.createElement('template');
  template.innerHTML = markup;
  const root = template.content.firstElementChild;
  host.append(template.content);
  hydrate(host, vm);
  if (root) openSelects.add({ root, vm });
  if (focus) host.querySelector('button')?.focus();
}

ready(() => {
  const builder = document.querySelector('[data-bn-builder-root]');
  const inspector = builder?.querySelector('bn-builder-inspector');
  if (inspector) inspector.enumControl = mountSelect;
  const panel = document.querySelector('[data-bn-builder-export-panel]');
  const output = document.querySelector('[data-bn-builder-export-output] code');
  if (!builder || !panel || !output) return;

  builder.addEventListener('bn-builder-export', (event) => {
    panel.hidden = false;
    // The export is HTML; it goes through the site's one highlighter
    // (escapes every character, so innerHTML only ever gets token spans).
    output.innerHTML = hlHTML(event.detail?.code ?? '');
    panel.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  });

  const copy = document.querySelector('[data-bn-builder-export-copy]');
  if (copy) {
    copy.addEventListener('click', async () => {
      const code = output.textContent ?? '';
      if (!code) return;
      try {
        await navigator.clipboard.writeText(code);
      } catch {
        const range = document.createRange();
        range.selectNodeContents(output);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
        return;
      }
      const original = copy.textContent;
      copy.textContent = 'Copied';
      setTimeout(() => {
        copy.textContent = original;
      }, 1600);
    });
  }
});
