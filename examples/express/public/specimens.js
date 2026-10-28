/**
 * Specimen boot for the catalog pages (/components/<slug>) and the
 * showcase — every page that renders catalog specimens loads this.
 *
 * The specimens are real server renders of @basenative/components.
 * A component owns its state and its rendering; the host page owns
 * the event wiring for the behaviours that live outside the
 * template (popup dismissal, the theme stamp, tab activation, and
 * the rest below). That wiring lived in component-demo-scripts.js
 * against the legacy markup, and the Holy Trinity re-source of the
 * catalog pages deleted it without a successor — from then on no
 * page shipped any specimen behaviour at all: the multiselect
 * staged open and would not close, and the theme toggle, labelled
 * "Live", stamped nothing. This file is the successor, written
 * against the catalog's own rendered markup (element + variant
 * selectors, the components' ARIA contracts), plus — for the
 * popovers and the virtualizer, whose resting markup does not carry
 * their data — the live specs the demos record as they render
 * (trinity-catalog.js), shipped to the page as JSON.
 *
 * Warren's popup rule, applied throughout: a popup closes on
 * outside pointerdown and on Escape.
 */

const STAGES = ':is([data-bn-component-preview], [data-bn-showcase-stage])';
const stageAll = (selector) => document.querySelectorAll(`${STAGES} ${selector}`);

/* ------------------------------------------------------------------ */
/* Live specs                                                          */
/* ------------------------------------------------------------------ */

const liveSpecs = (() => {
  const el = document.querySelector('[data-bn-live-specimens]');
  if (!el) return [];
  try {
    return JSON.parse(el.textContent);
  } catch {
    return [];
  }
})();

/* ------------------------------------------------------------------ */
/* Theme toggle — the one specimen that stamps the document.          */
/* The choice persists (localStorage) and boot.js honours it before   */
/* first paint on the next page; "system" clears it and the media     */
/* query decides again, exactly as applyTheme specifies.              */
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
    root.style.colorScheme = '';
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
  root.style.colorScheme = mode;
  if (meta) meta.setAttribute('content', mode === 'dark' ? '#000000' : '#f2f2f7');
}

for (const fieldset of document.querySelectorAll('fieldset[variant="theme-toggle"]')) {
  const stored = storedTheme();
  if (stored) {
    const radio = fieldset.querySelector(`input[type="radio"][value="${stored}"]`);
    if (radio) radio.checked = true;
  }
  fieldset.addEventListener('change', (event) => {
    const input = event.target.closest?.('input[type="radio"]');
    if (input) applyThemeMode(input.value);
  });
}

/* ------------------------------------------------------------------ */
/* Popovers — combobox, multiselect, select. Each composes closed;    */
/* the boot builds the listbox from the live spec on first open, in   */
/* the template's own shape, and drives it from there.                */
/* ------------------------------------------------------------------ */

function buildListbox(spec, { multiselectable = false } = {}) {
  const listbox = document.createElement('ul');
  listbox.setAttribute('role', 'listbox');
  listbox.id = `${spec.id}-listbox`;
  listbox.setAttribute('aria-label', spec.label);
  if (multiselectable) listbox.setAttribute('aria-multiselectable', 'true');
  const entries = spec.options.map((option) => {
    const li = document.createElement('li');
    li.setAttribute('role', 'option');
    li.id = `${spec.id}-option-${option.value}`;
    li.setAttribute('aria-selected', 'false');
    li.textContent = option.label;
    // Choosing must not move focus off the field or button — a
    // refocus would read as a fresh open to the focus wiring.
    li.addEventListener('pointerdown', (event) => event.preventDefault());
    listbox.appendChild(li);
    return { li, option };
  });
  listbox.hidden = true;
  return { listbox, entries };
}

/** Shared open/close + dismissal wiring for one popover root. */
function popover(root, control, openState) {
  const close = () => {
    openState.listbox.hidden = true;
    control.setAttribute('aria-expanded', 'false');
    openState.open = false;
  };
  const open = () => {
    openState.listbox.hidden = false;
    control.setAttribute('aria-expanded', 'true');
    openState.open = true;
  };
  document.addEventListener('pointerdown', (event) => {
    if (openState.open && !root.contains(event.target)) close();
  });
  root.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && openState.open) {
      event.preventDefault();
      close();
      control.focus();
    }
  });
  return { open, close };
}

/** Pure filter: an option shows iff the field text appears in its label. */
function filterEntries(entries, text) {
  const query = text.trim().toLowerCase();
  for (const { li, option } of entries) {
    li.hidden = query !== '' && !option.label.toLowerCase().includes(query);
  }
}

function wireCombobox(spec) {
  const input = document.getElementById(spec.id);
  const root = input?.closest('section');
  if (!input || !root) return;
  // The caller wires the input's combobox ARIA to the listbox id —
  // the component's documented contract; the boot is that caller.
  input.setAttribute('role', 'combobox');
  input.setAttribute('aria-autocomplete', 'list');
  input.setAttribute('aria-expanded', 'false');
  input.setAttribute('aria-controls', `${spec.id}-listbox`);

  let built = null;
  const state = { listbox: null, open: false };
  const { open, close } = popover(root, input, state);
  const ensure = () => {
    if (built) return;
    built = buildListbox(spec);
    state.listbox = built.listbox;
    for (const { li, option } of built.entries) {
      li.setAttribute('aria-selected', String(input.value === option.label));
      li.addEventListener('click', () => {
        input.value = option.label;
        for (const entry of built.entries) {
          entry.li.setAttribute('aria-selected', String(entry.option === option));
        }
        close();
      });
    }
    root.appendChild(built.listbox);
  };
  const openFiltered = () => {
    ensure();
    filterEntries(built.entries, input.value);
    open();
  };
  input.addEventListener('focus', openFiltered);
  input.addEventListener('click', openFiltered);
  input.addEventListener('input', openFiltered);
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && state.open) {
      const first = built.entries.find(({ li }) => !li.hidden);
      if (first) {
        event.preventDefault();
        first.li.click();
      }
    }
  });
}

function wireMultiselect(spec) {
  const input = document.getElementById(spec.id);
  const root = input?.closest('section');
  if (!input || !root) return;
  input.setAttribute('aria-expanded', 'false');
  input.setAttribute('aria-controls', `${spec.id}-listbox`);

  const chosen = new Set(spec.selected ?? []);
  let built = null;
  let suppressOpen = false;
  const state = { listbox: null, open: false };
  const { open } = popover(root, input, state);

  const chipList = () => root.querySelector(':scope > ul:not([role])');
  const ensureChipList = () => {
    let list = chipList();
    if (!list) {
      list = document.createElement('ul');
      root.prepend(list);
    }
    return list;
  };
  const addChip = (option) => {
    const li = document.createElement('li');
    li.textContent = `${option.label} `;
    const button = document.createElement('button');
    button.setAttribute('variant', 'ghost');
    button.setAttribute('type', 'button');
    button.textContent = 'Remove';
    li.appendChild(button);
    li._bnOptionValue = option.value;
    ensureChipList().appendChild(li);
  };
  const removeChip = (value) => {
    for (const li of chipList()?.querySelectorAll(':scope > li') ?? []) {
      if (li._bnOptionValue === value) li.remove();
    }
  };
  // The server-rendered chips pair with the recorded selection by
  // order — the template renders the selection set in order.
  [...(chipList()?.querySelectorAll(':scope > li') ?? [])].forEach((li, index) => {
    li._bnOptionValue = (spec.selected ?? [])[index];
  });
  root.addEventListener('click', (event) => {
    const button = event.target.closest?.('button');
    if (!button) return;
    const li = button.closest('li');
    if (!li || li.getAttribute('role') === 'option' || li._bnOptionValue === undefined) return;
    chosen.delete(li._bnOptionValue);
    li.remove();
    built?.entries.forEach((entry) => {
      if (entry.option.value === li._bnOptionValue) entry.li.setAttribute('aria-selected', 'false');
    });
    // Back to the field, without the focus reading as a fresh open —
    // the popup stays as it was, and Escape still reaches the root.
    suppressOpen = true;
    input.focus();
    suppressOpen = false;
  });

  const ensure = () => {
    if (built) return;
    built = buildListbox(spec, { multiselectable: true });
    state.listbox = built.listbox;
    for (const { li, option } of built.entries) {
      li.setAttribute('aria-selected', String(chosen.has(option.value)));
      li.addEventListener('click', () => {
        if (chosen.has(option.value)) {
          chosen.delete(option.value);
          li.setAttribute('aria-selected', 'false');
          removeChip(option.value);
        } else {
          chosen.add(option.value);
          li.setAttribute('aria-selected', 'true');
          addChip(option);
        }
      });
    }
    root.appendChild(built.listbox);
  };
  const openFiltered = () => {
    if (suppressOpen) return;
    ensure();
    filterEntries(built.entries, input.value);
    open();
  };
  input.addEventListener('focus', openFiltered);
  input.addEventListener('click', openFiltered);
  input.addEventListener('input', openFiltered);
}

function wireSelect(spec) {
  const button = document.getElementById(spec.id);
  const root = button?.closest('section');
  if (!button || !root) return;
  let value = spec.value;
  let built = null;
  const state = { listbox: null, open: false };
  const { open, close } = popover(root, button, state);

  const setButtonLabel = (label) => {
    for (const node of button.childNodes) {
      if (node.nodeType === Node.TEXT_NODE) {
        node.textContent = label;
        return;
      }
    }
    button.prepend(document.createTextNode(label));
  };
  const ensure = () => {
    if (built) return;
    built = buildListbox(spec);
    state.listbox = built.listbox;
    for (const { li, option } of built.entries) {
      li.setAttribute('aria-selected', String(option.value === value));
      li.addEventListener('click', () => {
        value = option.value;
        for (const entry of built.entries) {
          entry.li.setAttribute('aria-selected', String(entry.option === option));
        }
        setButtonLabel(option.label);
        close();
      });
    }
    root.appendChild(built.listbox);
  };
  button.addEventListener('click', () => {
    if (state.open) {
      close();
    } else {
      ensure();
      open();
    }
  });
}

for (const spec of liveSpecs) {
  if (spec.kind === 'combobox') wireCombobox(spec);
  else if (spec.kind === 'multiselect') wireMultiselect(spec);
  else if (spec.kind === 'select') wireSelect(spec);
  else if (spec.kind === 'virtualizer') wireVirtualizer(spec);
}

/* ------------------------------------------------------------------ */
/* Tabs — every panel is already in the DOM; activation is the host's */
/* ------------------------------------------------------------------ */

for (const tablist of stageAll('[role="tablist"]')) {
  const tabs = [...tablist.querySelectorAll('[role="tab"]')];
  const activate = (tab, focus = false) => {
    for (const other of tabs) {
      const on = other === tab;
      other.setAttribute('aria-selected', String(on));
      other.tabIndex = on ? 0 : -1;
      const panel = document.getElementById(other.getAttribute('aria-controls'));
      if (panel) panel.hidden = !on;
    }
    if (focus) tab.focus();
  };
  tabs.forEach((tab, index) => {
    tab.tabIndex = tab.getAttribute('aria-selected') === 'true' ? 0 : -1;
    tab.addEventListener('click', () => activate(tab));
    tab.addEventListener('keydown', (event) => {
      let next = null;
      if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
      else if (event.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
      else if (event.key === 'Home') next = 0;
      else if (event.key === 'End') next = tabs.length - 1;
      if (next !== null) {
        event.preventDefault();
        activate(tabs[next], true);
      }
    });
  });
}

/* ------------------------------------------------------------------ */
/* Dialogs — dialog, drawer, command palette. The specimens stage     */
/* open in flow; any action inside dismisses, Escape dismisses (a      */
/* non-modal dialog gets no Escape from the platform). The palette's  */
/* search filters its options, purely by the field text.              */
/* ------------------------------------------------------------------ */

for (const dialog of stageAll('dialog')) {
  dialog.addEventListener('click', (event) => {
    if (event.target.closest?.('button') && dialog.open) dialog.close();
  });
  dialog.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && dialog.open) {
      event.preventDefault();
      dialog.close();
    }
  });
  const search = dialog.querySelector('input[type="search"]');
  const listbox = dialog.querySelector('[role="listbox"]');
  if (search && listbox) {
    search.addEventListener('input', () => {
      const query = search.value.trim().toLowerCase();
      for (const group of listbox.querySelectorAll('[role="group"]')) {
        let anyVisible = false;
        for (const option of group.querySelectorAll('[role="option"]')) {
          const show = query === '' || option.textContent.toLowerCase().includes(query);
          option.hidden = !show;
          anyVisible = anyVisible || show;
        }
        group.hidden = !anyVisible;
      }
    });
    listbox.addEventListener('click', (event) => {
      if (event.target.closest?.('[role="option"]') && dialog.open) dialog.close();
    });
  }
}

/* ------------------------------------------------------------------ */
/* Dismissals — toast items and alerts remove themselves              */
/* ------------------------------------------------------------------ */

for (const button of stageAll('ol[aria-live] > li button')) {
  button.addEventListener('click', () => button.closest('li')?.remove());
}

for (const aside of stageAll('aside[variant]')) {
  const button = aside.querySelector(':scope > button');
  button?.addEventListener('click', () => aside.remove());
}

/* ------------------------------------------------------------------ */
/* Toolbar overflow — the More button owns its menu's visibility      */
/* ------------------------------------------------------------------ */

for (const bar of stageAll('section[variant="toolbar"]')) {
  const button = bar.querySelector('button[aria-expanded]');
  const menu = bar.querySelector('menu');
  if (!button || !menu) continue;
  const setOpen = (openState) => {
    menu.hidden = !openState;
    button.setAttribute('aria-expanded', String(openState));
  };
  button.addEventListener('click', () => setOpen(menu.hidden));
  button.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') setOpen(false);
  });
  document.addEventListener('pointerdown', (event) => {
    if (!menu.hidden && !bar.contains(event.target)) setOpen(false);
  });
}

/* ------------------------------------------------------------------ */
/* Tree — a disclosure toggle flips its item and its group            */
/* ------------------------------------------------------------------ */

for (const tree of stageAll('[role="tree"]')) {
  tree.addEventListener('click', (event) => {
    const button = event.target.closest?.('button');
    if (!button || !tree.contains(button)) return;
    const item = button.closest('[role="treeitem"]');
    if (!item || item.getAttribute('aria-expanded') === null) return;
    const openState = item.getAttribute('aria-expanded') === 'true';
    item.setAttribute('aria-expanded', String(!openState));
    const group = item.querySelector(':scope > ul[role="group"]');
    if (group) group.hidden = openState;
  });
}

/* ------------------------------------------------------------------ */
/* Data grid — a sort header reorders the body rows by its column     */
/* ------------------------------------------------------------------ */

for (const table of stageAll('table')) {
  const heads = [...table.querySelectorAll('thead th')];
  heads.forEach((th, column) => {
    const button = th.querySelector('button');
    if (!button || !th.hasAttribute('aria-sort')) return;
    button.addEventListener('click', () => {
      const direction = th.getAttribute('aria-sort') === 'ascending' ? 'descending' : 'ascending';
      for (const other of heads) other.removeAttribute('aria-sort');
      th.setAttribute('aria-sort', direction);
      const tbody = table.querySelector('tbody');
      if (!tbody) return;
      const text = (row) => row.cells[column]?.textContent.trim() ?? '';
      const rows = [...tbody.rows].sort((a, b) =>
        text(a).localeCompare(text(b), undefined, { numeric: true }),
      );
      if (direction === 'descending') rows.reverse();
      for (const row of rows) tbody.appendChild(row);
    });
  });
}

/* ------------------------------------------------------------------ */
/* Search field — the clear button clears, and goes                   */
/* ------------------------------------------------------------------ */

for (const search of stageAll('search')) {
  const input = search.querySelector('input[type="search"]');
  const clear = [...search.querySelectorAll('button')].find((b) => !b.hasAttribute('variant'));
  if (!input || !clear) continue;
  clear.addEventListener('click', () => {
    input.value = '';
    clear.remove();
    input.focus();
  });
  input.addEventListener('input', () => {
    if (input.value === '') clear.remove();
  });
}

/* ------------------------------------------------------------------ */
/* Forms — the submit moment is the app's; on a specimen page the     */
/* app does nothing, and the form must not navigate away from itself  */
/* ------------------------------------------------------------------ */

for (const form of stageAll('form')) {
  form.addEventListener('submit', (event) => event.preventDefault());
}

/* ------------------------------------------------------------------ */
/* Virtualizer — the host re-points the spacer counts and swaps the   */
/* window as the list scrolls: the component's documented channel.    */
/* The window arithmetic is the view model's own.                     */
/* ------------------------------------------------------------------ */

function wireVirtualizer(spec) {
  const list = document.getElementById(spec.id);
  if (!list) return;
  const { total, rowHeight, viewportRows, overscan, labelTemplate } = spec;
  const labelFor = (index) => labelTemplate.replace('{n}', String(index + 1));
  let ticking = false;
  const render = () => {
    ticking = false;
    const start = Math.max(0, Math.floor(list.scrollTop / rowHeight) - overscan);
    const end = Math.min(total, start + viewportRows + overscan * 2);
    list.style.setProperty('--number-virtualizer-spacer-start-count', String(start));
    list.style.setProperty('--number-virtualizer-spacer-end-count', String(total - end));
    const bottomSpacer = list.querySelector(':scope > li[aria-hidden="true"]:last-child');
    for (const row of list.querySelectorAll(':scope > li:not([aria-hidden])')) row.remove();
    const fragment = document.createDocumentFragment();
    for (let index = start; index < end; index += 1) {
      const li = document.createElement('li');
      li.textContent = labelFor(index);
      fragment.appendChild(li);
    }
    list.insertBefore(fragment, bottomSpacer);
  };
  list.addEventListener(
    'scroll',
    () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(render);
      }
    },
    { passive: true },
  );
  render();
}
