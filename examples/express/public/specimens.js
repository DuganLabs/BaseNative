/**
 * Specimen mount for the catalog pages (/components/<slug>).
 *
 * The specimens are real server renders of @basenative/components,
 * and every behaviour they demonstrate lives in the components
 * themselves — the APG keyboard patterns, the popup filtering, the
 * dismissals — in each component's view model and template. This
 * file is the mount, and only the mount: for each specimen a demo
 * recorded (trinity-catalog.js ships the specs to the page as JSON),
 * it builds the component's view model from the very props the
 * specimen rendered with, swaps the server render for the
 * component's own template, and hydrates it. What remains here is
 * what a host page legitimately owns:
 *
 * - The theme toggle's document stamp. The component reports the
 *   choice (onThemeChange); stamping this document — the attribute,
 *   the persisted mode, the theme-color meta — is the page's move,
 *   and boot.js honours the persisted mode before first paint.
 * - The composed inputs' ARIA. The combobox, multiselect and
 *   command palette compose a caller-rendered input; their contracts
 *   assign the input's aria-expanded / aria-activedescendant to the
 *   composition, so the mount binds them from the view models' own
 *   computeds (and the palette's query, which its search field
 *   feeds).
 * - The popup rule's outside half. A popup closes on Escape (the
 *   components carry that at their own roots) and on an outside
 *   pointerdown; the pointerdown half is one document listener over
 *   the mounted popovers, driving each view model's own close.
 * - The field report. A field nests a server-rendered control, so its
 *   constraint validation binds once over the document
 *   (bindFieldValidation, the field's own behaviour): every field on
 *   the page reports, including the ones inside a form demo.
 * - The virtualizer's spacer channel. Its sheet sizes the spacers
 *   from two count tokens; the mount re-points them from the view
 *   model's spacer counts, the host channel the component documents.
 */

import {
  hydrate,
  effect,
  alert,
  combobox,
  commandPalette,
  datagrid,
  dialog,
  drawer,
  dropdownMenu,
  form,
  multiselect,
  searchField,
  select,
  tabs,
  themeToggle,
  toast,
  toolbar,
  tree,
  virtualizer,
  bindSpacerCounts,
  bindFieldValidation,
} from '/basenative.js';

const AGGREGATES = {
  alert,
  combobox,
  datagrid,
  dialog,
  drawer,
  form,
  multiselect,
  select,
  tabs,
  toast,
  toolbar,
  tree,
  virtualizer,
  'command-palette': commandPalette,
  'dropdown-menu': dropdownMenu,
  'search-field': searchField,
  'theme-toggle': themeToggle,
};

/* Each component's server-rendered root, as the mount finds it in a
   demo's preview figure. A spec may carry its own selector when a
   page stages two of a kind (the dialog's destructive variant, the
   alert's danger tone). */
const ROOT_SELECTORS = {
  alert: 'aside[variant="info"]',
  combobox: 'section[variant="default"]',
  datagrid: 'table[variant="datagrid"]',
  dialog: 'dialog[variant="default"]',
  drawer: 'dialog[variant="drawer"]',
  form: 'form[variant="default"]',
  multiselect: 'section[variant="multiselect"]',
  select: 'section[variant="select"]',
  tabs: 'section[variant="tabs"]',
  toast: 'ol[variant="default"]',
  toolbar: 'section[variant="toolbar"]',
  tree: 'ul[variant="tree"]',
  virtualizer: 'ol[variant="virtualizer"]',
  'command-palette': 'dialog[variant="command-palette"]',
  'dropdown-menu': 'menu[variant="default"]',
  'search-field': 'search[variant="default"]',
  'theme-toggle': 'fieldset[variant="theme-toggle"]',
};

const specs = (() => {
  const el = document.querySelector('[data-bn-live-specimens]');
  if (!el) return [];
  try {
    return JSON.parse(el.textContent);
  } catch {
    return [];
  }
})();

/* ------------------------------------------------------------------ */
/* Theme — the toggle specimen stamps this document. The choice       */
/* persists (localStorage) and boot.js honours it before first paint  */
/* on the next page; "system" clears it and the media query decides   */
/* again, exactly as the toggle's contract describes.                 */
/* ------------------------------------------------------------------ */

const THEME_KEY = 'bn-theme';

function storedTheme() {
  try {
    const mode = window.localStorage.getItem(THEME_KEY);
    return mode === 'light' || mode === 'dark' ? mode : null;
  } catch {
    return null;
  }
}

function applyThemeMode(mode) {
  const root = document.documentElement;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (mode === 'system') {
    try {
      window.localStorage.removeItem(THEME_KEY);
    } catch {
      /* private windows: the choice simply does not persist */
    }
    root.removeAttribute('data-theme-lock');
    const dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    root.setAttribute('data-theme', dark ? 'dark' : 'light');
    /* color-scheme follows [data-theme] from the token sheet */
    if (meta) meta.setAttribute('content', dark ? '#000000' : '#f2f2f7');
    return;
  }
  try {
    window.localStorage.setItem(THEME_KEY, mode);
  } catch {
    /* as above */
  }
  root.setAttribute('data-theme-lock', '');
  root.dataset.theme = mode;
  /* color-scheme follows [data-theme] from the token sheet */
  if (meta) meta.setAttribute('content', mode === 'dark' ? '#000000' : '#f2f2f7');
}

/* ------------------------------------------------------------------ */
/* The mount                                                          */
/* ------------------------------------------------------------------ */

const mounted = new WeakSet();
const popovers = [];
const templateCache = new Map();
/* This module's own ?v= (page.js stamps it): component templates are
   fetched under the same deploy version as the bundle, so a cached
   template can never pair with a newer view model. */
const assetVersion = new URL(import.meta.url).searchParams.get('v');
const versioned = (url) => (assetVersion ? `${url}?v=${assetVersion}` : url);

function templateFor(name) {
  if (!templateCache.has(name)) {
    templateCache.set(
      name,
      (async () => {
        const response = await fetch(versioned(`/bn-css/${name}/index.html`));
        if (!response.ok) throw new Error(`specimens: no template for ${name}`);
        const text = await response.text();
        return text.replace(/^\s*<template>/, '').replace(/<\/template>\s*$/, '');
      })(),
    );
  }
  return templateCache.get(name);
}

async function mount(spec) {
  const aggregate = AGGREGATES[spec.name];
  const selector = spec.selector ?? ROOT_SELECTORS[spec.name];
  if (!aggregate || !selector) return;

  let root = null;
  let figure = null;
  for (const candidate of document.querySelectorAll('[data-bn-component-preview]')) {
    const found = [...candidate.querySelectorAll(selector)].find((el) => !mounted.has(el));
    if (found) {
      root = found;
      figure = candidate;
      break;
    }
  }
  if (!root || !figure) return;
  mounted.add(root);

  const props = { ...(spec.props ?? {}) };
  if (spec.name === 'theme-toggle') {
    /* The page is this specimen's app: it supplies the persisted
       starting mode and takes the stamp on every change. */
    props.value = storedTheme() ?? 'system';
    props.onThemeChange = (event) => applyThemeMode(event.mode);
  }
  if (spec.name === 'virtualizer' && spec.labelTemplate) {
    props.labelFor = (index) => spec.labelTemplate.replace('{n}', String(index + 1));
  }

  const vm = aggregate.create(props);
  const host = document.createElement('template');
  host.innerHTML = await templateFor(spec.name);
  const live = host.content.firstElementChild;
  root.replaceWith(host.content);
  hydrate(figure, vm);
  if (!live) return;

  /* A dialog-family specimen stays closed until its trigger asks. */
  if (spec.open && live instanceof HTMLDialogElement) live.open = true;
  for (const button of figure.querySelectorAll('[data-bn-dialog-trigger]')) {
    button.addEventListener('click', () => {
      const dialog = document.getElementById(button.getAttribute('data-bn-dialog-trigger'));
      if (dialog && !dialog.open) dialog.showModal();
    });
  }

  if (spec.name === 'combobox' || spec.name === 'multiselect') {
    const input = live.querySelector('input');
    if (input) {
      if (spec.name === 'combobox') {
        input.setAttribute('role', 'combobox');
        input.setAttribute('aria-autocomplete', 'list');
      }
      input.setAttribute('aria-controls', vm.listboxId());
      effect(() => {
        input.setAttribute('aria-expanded', String(vm.expanded()));
        input.setAttribute('aria-activedescendant', vm.activeDescendant());
      });
    }
    popovers.push({ root: live, isOpen: () => vm.open(), close: () => vm.open.set(false) });
  }

  if (spec.name === 'select') {
    popovers.push({ root: live, isOpen: () => vm.open(), close: () => vm.close() });
  }

  if (spec.name === 'toolbar') {
    popovers.push({ root: live, isOpen: () => vm.overflowOpen(), close: () => vm.closeOverflow() });
  }

  if (spec.name === 'command-palette') {
    const input = live.querySelector('input');
    if (input) {
      input.addEventListener('input', () => vm.setQuery(input.value));
      effect(() => {
        input.setAttribute('aria-activedescendant', vm.activeDescendant());
      });
    }
  }

  if (spec.name === 'virtualizer') bindSpacerCounts(live, vm);
}

for (const spec of specs) {
  try {
    await mount(spec);
  } catch {
    /* A specimen that cannot mount keeps its server render. */
  }
}

/* The popup rule's outside half: one pointerdown listener over the
   mounted popovers — each closes through its own view model. */
if (popovers.length > 0) {
  document.addEventListener('pointerdown', (event) => {
    for (const popover of popovers) {
      if (popover.isOpen() && !popover.root.contains(event.target)) popover.close();
    }
  });
}

bindFieldValidation(document);

document.documentElement.setAttribute('data-bn-specimens-mounted', '');
