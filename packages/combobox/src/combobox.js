// Built with BaseNative — basenative.dev
/**
 * Combobox primitive — typeahead input that filters an existing list
 * AND lets the user create a new entry. WAI-ARIA APG combobox/listbox.
 *
 * Two surfaces, one DOM contract:
 *
 *   1. `renderCombobox(options)` — returns an SSR-safe HTML string.
 *      Works without JS (the input still submits its value as a form field).
 *
 *   2. `Combobox(options)` — `{ html, hydrate(rootEl) }` factory.
 *      Calling `hydrate` wires up filtering, keyboard navigation,
 *      virtual focus, signal interop, and the create-option flow.
 *
 * Layout-shift-free: the listbox is `position: absolute` and only
 * shown when expanded, so opening/closing never reflows the page.
 */

import { defaultFilter } from './filter.js';
import { applyAriaAttributes, announce } from './a11y.js';

function escapeHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Lift a raw option (string OR `{ value, label, hint? }`) into a normalized
 * shape. Strings become `{ value: s, label: s }`.
 */
export function normalizeOption(raw) {
  if (raw == null) return null;
  if (typeof raw === 'string') return { value: raw, label: raw };
  if (typeof raw !== 'object') return null;
  const value = raw.value != null ? String(raw.value) : '';
  const label = raw.label != null ? String(raw.label) : value;
  const out = { value, label };
  if (raw.hint != null) out.hint = String(raw.hint);
  if (raw.disabled) out.disabled = true;
  return out;
}

/**
 * Read the current value out of a possibly-signal-shaped input. Accepts
 * `signal` accessors (functions), explicit `{ get }` readers, or scalars.
 */
function readValue(v) {
  if (v == null) return '';
  if (typeof v === 'function') {
    try {
      return String(v() ?? '');
    } catch {
      return '';
    }
  }
  if (typeof v === 'object' && typeof v.get === 'function') {
    try {
      return String(v.get() ?? '');
    } catch {
      return '';
    }
  }
  return String(v);
}

/**
 * Default create-option text. Consumers can override via `createLabel`.
 */
function defaultCreateLabel(input) {
  return `+ Create "${input}"`;
}

function findOptionByValue(options, value) {
  if (!value) return null;
  for (const o of options) {
    if (o && o.value === value) return o;
  }
  return null;
}

function exactLabelMatch(options, query) {
  if (!query) return null;
  const q = query.trim().toLowerCase();
  for (const o of options) {
    if (o && String(o.label).toLowerCase() === q) return o;
  }
  return null;
}

/**
 * Render the combobox as an HTML string — pre-paint friendly. The
 * static markup includes:
 *   - root <div role="combobox" aria-expanded="false">
 *   - <label> (only when `label` provided)
 *   - <input role="combobox" aria-autocomplete="list">
 *   - <ul role="listbox" hidden>  (hydration unhides + populates)
 *   - <span aria-live="polite">   (screen-reader-only announcements)
 *
 * Because the listbox is hidden initially, no JS == a plain text input.
 */
export function renderCombobox(options = {}) {
  const id = options.id || `bn-cb-${Math.random().toString(36).slice(2)}`;
  const listId = `${id}-listbox`;
  const liveId = `${id}-live`;
  const name = options.name || '';
  const label = options.label || '';
  const placeholder = options.placeholder || '';
  const themeAttr = options.theme ? ` data-theme="${escapeHtml(options.theme)}"` : '';
  const value = readValue(options.value);
  const describedBy = options.ariaDescribedBy
    ? ` aria-describedby="${escapeHtml(options.ariaDescribedBy)} ${liveId}"`
    : ` aria-describedby="${liveId}"`;
  const opts = (options.options || []).map(normalizeOption).filter(Boolean);
  const allowCreate = options.allowCreate === true;

  // Pre-render the option list so that JS-disabled clients still see
  // selectable choices via a fallback <datalist>. The visible listbox
  // (the ARIA one) is hidden until hydrate() unhides it.
  const datalistOptions = opts
    .map((o) => `<option value="${escapeHtml(o.value)}">${escapeHtml(o.label)}</option>`)
    .join('');

  const labelHtml = label
    ? `<label for="${id}-input" data-bn="cb-label" class="bn-cb-label">${escapeHtml(label)}</label>`
    : '';

  // Visible-shadow listbox is empty in SSR; hydrate() fills it. Including
  // it here (with hidden) keeps DOM identity stable so hydration is
  // strictly additive (no client-side rebuild).
  return (
    `<div data-bn="combobox" id="${id}" class="bn-cb"${themeAttr}` +
    ` role="combobox" aria-haspopup="listbox" aria-expanded="false" aria-owns="${listId}"` +
    ` data-allow-create="${allowCreate ? 'true' : 'false'}">` +
    labelHtml +
    `<div data-bn="cb-field" class="bn-cb-field">` +
    `<input data-bn="cb-input" id="${id}-input" class="bn-cb-input"` +
    ` type="text" inputmode="text" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false"` +
    (name ? ` name="${escapeHtml(name)}"` : '') +
    ` value="${escapeHtml(value)}"` +
    (placeholder ? ` placeholder="${escapeHtml(placeholder)}"` : '') +
    ` role="combobox" aria-autocomplete="list" aria-expanded="false"` +
    ` aria-controls="${listId}"` +
    describedBy +
    `>` +
    `<button type="button" data-bn="cb-toggle" class="bn-cb-toggle"` +
    ` tabindex="-1" aria-label="Show suggestions" aria-hidden="true">` +
    `<span aria-hidden="true">▾</span>` +
    `</button>` +
    `</div>` +
    `<ul data-bn="cb-listbox" id="${listId}" class="bn-cb-listbox" role="listbox" hidden` +
    (label ? ` aria-label="${escapeHtml(label)}"` : '') +
    `></ul>` +
    // Hidden datalist as no-JS fallback so the bare <input> typeahead
    // still works without our JS.
    `<datalist id="${id}-datalist">${datalistOptions}</datalist>` +
    // Visually-hidden live region for SR announcements.
    `<span data-bn="cb-live" id="${liveId}" class="bn-cb-live" aria-live="polite" aria-atomic="true"></span>` +
    `</div>`
  );
}

/**
 * Hydrate a rendered combobox. `rootEl` is the element produced by
 * `renderCombobox` (or any DOM that follows the data-bn contract).
 *
 * Returns `{ destroy(), refresh(), open(), close(), setOptions(next) }`.
 *
 *   options          — array of `{ value, label, hint? }` or strings
 *   value            — initial selection (string or signal accessor)
 *   onChange(value)  — fires on selection
 *   onCreate(label)  — fires when a non-matching value is committed
 *                      (only if absent + allowCreate, the typed string is
 *                      treated as the value)
 *   allowCreate      — boolean — show "+ Create '...'" entry
 *   createLabel(s)   — function returning the create-option label
 *   filter(opt, q)   — custom filter; defaults to substring match
 *   placeholder      — runtime placeholder swap (rare)
 *   runtime          — optional `{ effect }` for signal value tracking
 */
export function hydrateCombobox(rootEl, options = {}) {
  if (!rootEl || rootEl.nodeType !== 1) {
    throw new TypeError('hydrateCombobox: rootEl must be a DOM element');
  }

  const input = rootEl.querySelector('[data-bn="cb-input"]');
  const listbox = rootEl.querySelector('[data-bn="cb-listbox"]');
  const toggle = rootEl.querySelector('[data-bn="cb-toggle"]');
  if (!input || !listbox) {
    throw new Error('hydrateCombobox: rendered DOM is missing required parts');
  }

  applyAriaAttributes(rootEl, { label: options.label, expanded: false });

  const cleanups = [];
  let allOptions = (options.options || []).map(normalizeOption).filter(Boolean);
  const filterFn = typeof options.filter === 'function' ? options.filter : defaultFilter;
  const onChange = typeof options.onChange === 'function' ? options.onChange : null;
  const onCreate = typeof options.onCreate === 'function' ? options.onCreate : null;
  const allowCreate = options.allowCreate === true;
  const createLabel =
    typeof options.createLabel === 'function' ? options.createLabel : defaultCreateLabel;

  let isOpen = false;
  let activeIndex = -1;
  let visibleOptions = []; // [{ kind: 'opt'|'create', option?, query?, id }]
  let lastQuery = input.value || '';

  const optId = (i) => `${rootEl.id}-opt-${i}`;

  // ── Render the listbox contents based on the current query ──
  function renderList(query) {
    lastQuery = query;
    const matches = allOptions.filter((o) => filterFn(o, query));
    const exact = exactLabelMatch(allOptions, query);
    const showCreate = allowCreate && query.trim().length > 0 && !exact;

    visibleOptions = matches.map((o, i) => ({
      kind: 'opt',
      option: o,
      id: optId(i),
    }));
    if (showCreate) {
      visibleOptions.push({
        kind: 'create',
        query,
        id: optId(visibleOptions.length),
      });
    }

    // Build option DOM. Direct innerHTML write is fine here — content is
    // escaped, this is the same root we own, and re-rendering the small
    // popup is faster than diff-walking it.
    const html = visibleOptions
      .map((entry, i) => {
        if (entry.kind === 'create') {
          return (
            `<li role="option" data-bn="cb-option" data-bn-cb-create="true"` +
            ` id="${entry.id}" data-index="${i}"` +
            ` aria-selected="false" class="bn-cb-option bn-cb-option--create">` +
            `<span class="bn-cb-option-label">${escapeHtml(createLabel(entry.query))}</span>` +
            `</li>`
          );
        }
        const o = entry.option;
        const cls = 'bn-cb-option' + (o.disabled ? ' bn-cb-option--disabled' : '');
        const hint = o.hint ? `<span class="bn-cb-option-hint">${escapeHtml(o.hint)}</span>` : '';
        return (
          `<li role="option" data-bn="cb-option" id="${entry.id}" data-index="${i}"` +
          ` data-value="${escapeHtml(o.value)}"` +
          (o.disabled ? ' aria-disabled="true"' : '') +
          ` aria-selected="false" class="${cls}">` +
          `<span class="bn-cb-option-label">${escapeHtml(o.label)}</span>${hint}` +
          `</li>`
        );
      })
      .join('');

    listbox.innerHTML = html || `<li class="bn-cb-empty" role="presentation">No matches</li>`;

    // Reset active index. APG: don't auto-activate on type — wait for arrow.
    activeIndex = -1;
    input.removeAttribute('aria-activedescendant');

    // SR announcement: option count + create-option hint
    const parts = [];
    if (visibleOptions.length === 0) {
      parts.push('No matches');
    } else {
      const optCount = visibleOptions.filter((e) => e.kind === 'opt').length;
      parts.push(`${optCount} option${optCount === 1 ? '' : 's'} available`);
      if (showCreate) parts.push(`Press Enter to create "${query}"`);
    }
    announce(rootEl, parts.join('. '));
  }

  function setOpen(next) {
    if (next === isOpen) return;
    isOpen = next;
    rootEl.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    input.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    if (isOpen) {
      listbox.removeAttribute('hidden');
      renderList(input.value);
    } else {
      listbox.setAttribute('hidden', '');
      activeIndex = -1;
      input.removeAttribute('aria-activedescendant');
    }
  }

  function setActive(index) {
    // Clamp / wrap
    if (visibleOptions.length === 0) {
      activeIndex = -1;
      input.removeAttribute('aria-activedescendant');
      return;
    }
    if (index < 0) index = visibleOptions.length - 1;
    if (index >= visibleOptions.length) index = 0;
    // Skip disabled rows
    const start = index;
    while (
      visibleOptions[index] &&
      visibleOptions[index].option &&
      visibleOptions[index].option.disabled
    ) {
      index = (index + 1) % visibleOptions.length;
      if (index === start) break;
    }
    activeIndex = index;
    const entry = visibleOptions[index];
    if (!entry) return;
    input.setAttribute('aria-activedescendant', entry.id);
    // Update aria-selected on options + scroll into view
    const items = listbox.querySelectorAll('[data-bn="cb-option"]');
    for (const item of items) {
      const i = Number(item.getAttribute('data-index'));
      const selected = i === activeIndex;
      item.setAttribute('aria-selected', selected ? 'true' : 'false');
      if (selected) {
        item.classList.add('bn-cb-option--active');
        if (typeof item.scrollIntoView === 'function') {
          try {
            item.scrollIntoView({ block: 'nearest' });
          } catch {
            /* ignore */
          }
        }
      } else {
        item.classList.remove('bn-cb-option--active');
      }
    }
  }

  function commit(entry) {
    if (!entry) {
      // Bare Enter with no active row: try exact match, else create, else no-op.
      const q = input.value;
      const exact = exactLabelMatch(allOptions, q);
      if (exact) return commit({ kind: 'opt', option: exact });
      if (allowCreate && q.trim().length > 0) {
        return commit({ kind: 'create', query: q });
      }
      return;
    }
    if (entry.kind === 'create') {
      const label = entry.query;
      // IMPORTANT: never wipe the user's typed input on create.
      input.value = label;
      if (onCreate) {
        onCreate(label);
      } else if (allowCreate && onChange) {
        // No onCreate provided — treat the new label as the value.
        onChange(label);
      }
      announce(rootEl, `Created "${label}"`);
    } else if (entry.option && !entry.option.disabled) {
      const o = entry.option;
      input.value = o.label;
      if (onChange) onChange(o.value);
      announce(rootEl, `Selected ${o.label}`);
    }
    setOpen(false);
  }

  // ── Event wiring ────────────────────────────────────────────
  function onInput() {
    if (!isOpen) setOpen(true);
    else renderList(input.value);
  }

  function onFocus() {
    setOpen(true);
  }

  function onKeydown(e) {
    switch (e.key) {
      case 'ArrowDown': {
        e.preventDefault();
        if (!isOpen) {
          setOpen(true);
          setActive(0);
          return;
        }
        setActive(activeIndex + 1);
        return;
      }
      case 'ArrowUp': {
        e.preventDefault();
        if (!isOpen) {
          setOpen(true);
          setActive(visibleOptions.length - 1);
          return;
        }
        setActive(activeIndex - 1);
        return;
      }
      case 'Home': {
        if (!isOpen) return;
        e.preventDefault();
        setActive(0);
        return;
      }
      case 'End': {
        if (!isOpen) return;
        e.preventDefault();
        setActive(visibleOptions.length - 1);
        return;
      }
      case 'Enter': {
        if (!isOpen) {
          // Allow form submit via bare Enter with no popup
          return;
        }
        e.preventDefault();
        const entry = activeIndex >= 0 ? visibleOptions[activeIndex] : null;
        commit(entry);
        return;
      }
      case 'Escape': {
        if (isOpen) {
          e.preventDefault();
          setOpen(false);
        }
        return;
      }
      case 'Tab': {
        // APG: Tab commits the active option (if any) and moves focus.
        if (isOpen && activeIndex >= 0) {
          const entry = visibleOptions[activeIndex];
          commit(entry);
        } else if (isOpen) {
          setOpen(false);
        }
        return;
      }
      default:
        return;
    }
  }

  function onListClick(e) {
    const li = e.target && e.target.closest && e.target.closest('[data-bn="cb-option"]');
    if (!li) return;
    const idx = Number(li.getAttribute('data-index'));
    const entry = visibleOptions[idx];
    if (!entry) return;
    commit(entry);
    // Keep focus in the input after a click — the soft keyboard should
    // not vanish on touch devices.
    if (typeof input.focus === 'function') input.focus();
  }

  // Mouse-down inside the listbox shouldn't blur the input. Without this
  // the input fires `blur` -> `setOpen(false)` -> click never lands.
  function onListMousedown(e) {
    if (e.target && e.target !== input) e.preventDefault();
  }

  function onDocPointerdown(e) {
    if (!isOpen) return;
    const t = e.target;
    if (t === rootEl) return;
    if (rootEl.contains && rootEl.contains(t)) return;
    setOpen(false);
  }

  function onToggleClick(e) {
    e.preventDefault();
    if (typeof input.focus === 'function') input.focus();
    setOpen(!isOpen);
  }

  input.addEventListener('input', onInput);
  cleanups.push(() => input.removeEventListener('input', onInput));

  input.addEventListener('focus', onFocus);
  cleanups.push(() => input.removeEventListener('focus', onFocus));

  input.addEventListener('keydown', onKeydown);
  cleanups.push(() => input.removeEventListener('keydown', onKeydown));

  listbox.addEventListener('mousedown', onListMousedown);
  cleanups.push(() => listbox.removeEventListener('mousedown', onListMousedown));

  listbox.addEventListener('click', onListClick);
  cleanups.push(() => listbox.removeEventListener('click', onListClick));

  if (toggle) {
    toggle.addEventListener('click', onToggleClick);
    cleanups.push(() => toggle.removeEventListener('click', onToggleClick));
  }

  if (typeof document !== 'undefined') {
    document.addEventListener('pointerdown', onDocPointerdown, true);
    cleanups.push(() => document.removeEventListener('pointerdown', onDocPointerdown, true));
  }

  // ── Signal interop: track a value signal -> reflect into input ─
  const runtime = options.runtime || null;
  const valueSrc = options.value;
  if (typeof valueSrc === 'function') {
    if (runtime && typeof runtime.effect === 'function') {
      const stop = runtime.effect(() => {
        const v = readValue(valueSrc);
        const matched = findOptionByValue(allOptions, v);
        const display = matched ? matched.label : v;
        if (input.value !== display) input.value = display;
      });
      cleanups.push(typeof stop === 'function' ? stop : () => {});
    } else {
      // One-shot read on hydrate
      const v = readValue(valueSrc);
      const matched = findOptionByValue(allOptions, v);
      input.value = matched ? matched.label : v;
    }
  }

  return {
    destroy() {
      for (const fn of cleanups) {
        try {
          fn();
        } catch {
          /* ignore */
        }
      }
    },
    refresh() {
      if (isOpen) renderList(input.value);
    },
    open() {
      setOpen(true);
    },
    close() {
      setOpen(false);
    },
    setOptions(next) {
      allOptions = (next || []).map(normalizeOption).filter(Boolean);
      if (isOpen) renderList(input.value);
    },
    /** Test/inspection hook — current visible option entries. */
    _getVisible() {
      return visibleOptions.slice();
    },
    _getQuery() {
      return lastQuery;
    },
  };
}

/**
 * One-shot convenience. Returns `{ html, hydrate }` so callers can embed
 * the markup in SSR output and wire reactivity later.
 *
 *   const cb = Combobox({ id: 'category', label: 'CATEGORY', options, ... });
 *   container.innerHTML = cb.html;
 *   const handle = cb.hydrate(container.querySelector('[data-bn="combobox"]'));
 *   // ...
 *   handle.destroy();
 */
export function Combobox(options = {}) {
  const html = renderCombobox(options);
  return {
    html,
    hydrate(rootEl) {
      return hydrateCombobox(rootEl, options);
    },
  };
}
