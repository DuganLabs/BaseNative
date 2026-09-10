/**
 * Tabs — tab navigation with panels.
 */
import { escapeAttr, escapeText } from '@basenative/runtime/shared/escape';
import { nextId } from './ids.js';
import { attrsSuffix } from './internal/attrs.js';

/**
 * Tabs — tab navigation with panels. Tab buttons are type="button" and wired
 * to their panels with aria-controls / aria-labelledby, and carry a roving
 * tabindex (0 on the active tab, -1 elsewhere) so only one tab is in the
 * page's tab sequence. Pair with initTabs() on the client for switching.
 *
 * @param {object} [options]
 * @param {Array<{id: string, label: string, content?: string, disabled?: boolean}>} [options.tabs]
 *   label is escaped text; content is an HTML slot: not escaped; pass trusted markup only
 * @param {string} [options.activeTab]  Defaults to the first tab
 * @param {string} [options.variant='default']
 * @param {string} [options.id]     Defaults to nextId('tabs')
 * @param {string} [options.attrs]  Raw attribute markup appended to the wrapper; not escaped
 * @returns {string}
 */
export function renderTabs(options = {}) {
  const {
    tabs = [],
    activeTab,
    variant = 'default',
    id = nextId('tabs'),
    attrs = '',
  } = options;

  const active = activeTab ?? tabs[0]?.id;
  const focusable = tabs.find(tab => tab.id === active && !tab.disabled) ?? tabs.find(tab => !tab.disabled);

  const tabList = tabs
    .map(tab => {
      const isActive = tab.id === active;
      return `<button data-bn="tab" role="tab" type="button" tabindex="${tab === focusable ? 0 : -1}" id="${escapeAttr(`${id}-tab-${tab.id}`)}" aria-selected="${isActive}" aria-controls="${escapeAttr(`${id}-panel-${tab.id}`)}" data-tab="${escapeAttr(tab.id)}"${tab.disabled ? ' disabled' : ''}>${escapeText(tab.label ?? '')}</button>`;
    })
    .join('');

  const panels = tabs
    .map(tab => {
      const isActive = tab.id === active;
      return `<div data-bn="tab-panel" role="tabpanel" id="${escapeAttr(`${id}-panel-${tab.id}`)}" aria-labelledby="${escapeAttr(`${id}-tab-${tab.id}`)}"${isActive ? '' : ' hidden'}>${tab.content ?? ''}</div>`;
    })
    .join('');

  return `<div data-bn="tabs" data-variant="${escapeAttr(variant)}" id="${escapeAttr(id)}"${attrsSuffix(attrs)}>
  <div data-bn="tab-list" role="tablist">${tabList}</div>
  ${panels}
</div>`;
}

function closestTab(target) {
  return target && typeof target.closest === 'function' ? target.closest('[data-bn="tab"]') : null;
}

/**
 * Client-side: wire a rendered tabs widget to the WAI-ARIA APG tabs pattern.
 *
 * Click and ArrowLeft / ArrowRight / Home / End switch tabs (wrapping at the
 * ends and skipping disabled tabs); `aria-selected` and the roving `tabindex`
 * follow the selection, and every panel except the selected one is `hidden`.
 * Activation is automatic by default — moving focus with the arrow keys also
 * selects; with `activation: 'manual'` the arrow keys only move focus and
 * Enter / Space (the button's native click) select.
 *
 * `onChange` fires after a user-driven change only. `select(id)` is silent, so
 * a route can keep its own state as the source of truth and reflect it back
 * into the DOM. Tabs and panels are re-queried on every interaction, so tabs
 * added after init are picked up; widgets nested inside `root` are ignored.
 *
 * @param {HTMLElement} root  The [data-bn="tabs"] element
 * @param {object} [options]
 * @param {(id: string, tab: HTMLElement) => void} [options.onChange]
 * @param {'automatic'|'manual'} [options.activation='automatic']
 * @returns {{ select: (id: string) => boolean, active: () => string | null, destroy: () => void }}
 */
export function initTabs(root, options = {}) {
  const { onChange, activation = 'automatic' } = options;

  const own = selector =>
    Array.from(root.querySelectorAll(selector)).filter(
      el => typeof el.closest !== 'function' || el.closest('[data-bn="tabs"]') === root
    );
  const tabs = () => own('[data-bn="tab"]');
  const panels = () => own('[data-bn="tab-panel"]');
  const enabled = () => tabs().filter(tab => !tab.hasAttribute('disabled'));
  const idOf = tab => tab.getAttribute('data-tab');

  function roving(target) {
    for (const tab of tabs()) tab.setAttribute('tabindex', tab === target ? '0' : '-1');
  }

  function apply(target) {
    for (const tab of tabs()) tab.setAttribute('aria-selected', tab === target ? 'true' : 'false');
    roving(target);
    const controls = target.getAttribute('aria-controls');
    for (const panel of panels()) {
      if (panel.getAttribute('id') === controls) panel.removeAttribute('hidden');
      else panel.setAttribute('hidden', '');
    }
  }

  let current = tabs().find(tab => tab.getAttribute('aria-selected') === 'true') ?? enabled()[0] ?? null;
  if (current) apply(current);

  function change(tab, focus = false) {
    const changed = tab !== current;
    if (changed) {
      current = tab;
      apply(tab);
    }
    if (focus && typeof tab.focus === 'function') tab.focus();
    if (changed && onChange) onChange(idOf(tab), tab);
  }

  function onClick(e) {
    const tab = closestTab(e.target);
    if (!tab || tab.hasAttribute('disabled') || !tabs().includes(tab)) return;
    change(tab);
  }

  function onKeydown(e) {
    const tab = closestTab(e.target);
    if (!tab) return;
    const list = enabled();
    const index = list.indexOf(tab);
    if (index < 0) return;

    let next;
    switch (e.key) {
      case 'ArrowRight': next = list[(index + 1) % list.length]; break;
      case 'ArrowLeft': next = list[(index - 1 + list.length) % list.length]; break;
      case 'Home': next = list[0]; break;
      case 'End': next = list[list.length - 1]; break;
      default: return;
    }
    e.preventDefault();
    if (activation === 'manual') {
      roving(next);
      if (typeof next.focus === 'function') next.focus();
    } else {
      change(next, true);
    }
  }

  root.addEventListener('click', onClick);
  root.addEventListener('keydown', onKeydown);

  return {
    select(id) {
      const tab = tabs().find(t => idOf(t) === id);
      if (!tab) return false;
      if (tab !== current) {
        current = tab;
        apply(tab);
      }
      return true;
    },
    active: () => (current ? idOf(current) : null),
    destroy() {
      root.removeEventListener('click', onClick);
      root.removeEventListener('keydown', onKeydown);
    },
  };
}
