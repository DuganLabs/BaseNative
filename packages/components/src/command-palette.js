/**
 * Command palette — Cmd+K style searchable command menu.
 */
import { escapeAttr, escapeText } from '@basenative/runtime/shared/escape';
import { nextId } from './ids.js';
import { attrsSuffix } from './internal/attrs.js';

/**
 * Command palette — Cmd+K style searchable command menu in a native <dialog>.
 *
 * The input is a `combobox` over the `listbox` of commands (`aria-controls`),
 * and every command carries an id (`<id>-item-<n>`) so `initCommandPalette()`
 * can point `aria-activedescendant` at the highlighted one. The footer's
 * "↑↓ Navigate / ↵ Select / Esc Close" hint names the keys that initialiser
 * binds; without it the dialog is a static list.
 *
 * @param {object} [options]
 * @param {Array<{label: string, action?: string, id?: string, group?: string, icon?: string, shortcut?: string}>} [options.commands]
 *   label, group and shortcut are escaped text; action/id are escaped attributes; icon is an HTML slot: not escaped; pass trusted markup only
 * @param {string} [options.placeholder]
 * @param {boolean} [options.open]
 * @param {string} [options.id]     Defaults to nextId('command')
 * @param {string} [options.attrs]  Raw attribute markup appended to the <dialog>; not escaped
 * @returns {string}
 */
export function renderCommandPalette(options = {}) {
  const {
    commands = [],
    placeholder = 'Type a command...',
    open = false,
    id = nextId('command'),
    attrs = '',
  } = options;

  const groupsMap = new Map();
  for (const cmd of commands) {
    const group = cmd.group ?? 'Commands';
    if (!groupsMap.has(group)) groupsMap.set(group, []);
    groupsMap.get(group).push(cmd);
  }

  let groupsHtml = '';
  let index = 0;
  for (const [groupName, cmds] of groupsMap) {
    const itemsHtml = cmds
      .map(cmd => {
        const icon = cmd.icon ? `<span data-bn="command-icon">${cmd.icon}</span>` : '';
        const shortcut = cmd.shortcut ? `<kbd data-bn="command-shortcut">${escapeText(cmd.shortcut)}</kbd>` : '';
        const itemId = escapeAttr(`${id}-item-${index++}`);
        return `<button data-bn="command-item" role="option" id="${itemId}" data-action="${escapeAttr(cmd.action ?? cmd.id ?? '')}" type="button">${icon}<span data-bn="command-label">${escapeText(cmd.label ?? '')}</span>${shortcut}</button>`;
      })
      .join('');
    groupsHtml += `<div data-bn="command-group" role="group" aria-label="${escapeAttr(groupName)}">
  <div data-bn="command-group-label">${escapeText(groupName)}</div>
  ${itemsHtml}
</div>`;
  }

  const listId = escapeAttr(`${id}-list`);
  return `<dialog data-bn="command-palette" id="${escapeAttr(id)}"${open ? ' open' : ''}${attrsSuffix(attrs)}>
  <div data-bn="command-header">
    <input data-bn="command-input" type="text" placeholder="${escapeAttr(placeholder)}" role="combobox" aria-expanded="true" aria-autocomplete="list" aria-controls="${listId}" autocomplete="off" autofocus>
  </div>
  <div data-bn="command-list" id="${listId}" role="listbox">${groupsHtml}</div>
  <div data-bn="command-footer">
    <span>↑↓ Navigate</span>
    <span>↵ Select</span>
    <span>Esc Close</span>
  </div>
</dialog>`;
}

const INPUT = '[data-bn="command-input"]';
const ITEM = '[data-bn="command-item"]';
const GROUP = '[data-bn="command-group"]';
const LABEL = '[data-bn="command-label"]';

function closestFrom(target, selector) {
  return target && typeof target.closest === 'function' ? target.closest(selector) : null;
}

function labelOf(item) {
  const label = item.querySelector(LABEL);
  return String((label ?? item).textContent ?? '');
}

/** 'Mod+K' → { key: 'k', mod, ctrl, meta, shift, alt }. Mod is Meta or Ctrl. */
function parseHotkey(hotkey) {
  const parts = String(hotkey).split('+').map(part => part.trim().toLowerCase()).filter(Boolean);
  const key = parts.pop() ?? '';
  return { key, mod: parts.includes('mod'), ctrl: parts.includes('ctrl'), meta: parts.includes('meta'), shift: parts.includes('shift'), alt: parts.includes('alt') };
}

function hotkeyMatches(spec, e) {
  if (String(e.key ?? '').toLowerCase() !== spec.key) return false;
  if (spec.mod && !(e.metaKey || e.ctrlKey)) return false;
  if (spec.ctrl && !e.ctrlKey) return false;
  if (spec.meta && !e.metaKey) return false;
  return spec.shift === Boolean(e.shiftKey) && spec.alt === Boolean(e.altKey);
}

/**
 * Client-side: wire a rendered `[data-bn="command-palette"]` `<dialog>` to
 * the keys its footer names.
 *
 * Typing in the input filters the commands by case-insensitive substring of
 * their label — non-matching items and then-empty groups are `hidden` — and
 * the first visible command becomes the highlighted one (`aria-selected` on
 * the item, `aria-activedescendant` on the input). ArrowDown / ArrowUp move
 * the highlight through the visible commands, wrapping at the ends; Enter or
 * a click activates one, which closes the dialog and calls
 * `onSelect(action, item)` with its `data-action`; Escape closes without
 * selecting. With `hotkey` (e.g. `'Mod+K'`, where Mod is Meta or Ctrl) a
 * document-level keydown toggles the palette. `open()` clears the filter,
 * shows the dialog modally and focuses the input; `filter(query)` and
 * `close()` do what they say. Items are re-queried on every interaction, so
 * commands added after init are picked up.
 *
 * @param {HTMLDialogElement} dialog  The [data-bn="command-palette"] element
 * @param {object} [options]
 * @param {(action: string, item: HTMLElement) => void} [options.onSelect]
 * @param {string} [options.hotkey]  e.g. 'Mod+K'; omitted → no global key
 * @returns {{ open(): void, close(): void, isOpen(): boolean, filter(query: string): HTMLElement[], active(): string | null, destroy(): void }}
 */
export function initCommandPalette(dialog, options = {}) {
  const { onSelect, hotkey } = options;
  const doc = dialog.ownerDocument ?? (typeof document === 'undefined' ? null : document);
  const input = dialog.querySelector(INPUT);
  const items = () => Array.from(dialog.querySelectorAll(ITEM));
  const groups = () => Array.from(dialog.querySelectorAll(GROUP));
  const visible = () => items().filter(item => !item.hasAttribute('hidden'));
  const isOpen = () => dialog.hasAttribute('open');
  let active = null;

  const prefix = dialog.getAttribute('id') || 'bn-command';
  items().forEach((item, i) => {
    if (!item.getAttribute('id')) item.setAttribute('id', `${prefix}-item-${i}`);
  });

  function setActive(item) {
    active = item ?? null;
    for (const it of items()) {
      if (it === active) it.setAttribute('aria-selected', 'true');
      else it.removeAttribute('aria-selected');
    }
    if (input) {
      if (active) input.setAttribute('aria-activedescendant', active.getAttribute('id'));
      else input.removeAttribute('aria-activedescendant');
    }
    if (active && typeof active.scrollIntoView === 'function') active.scrollIntoView({ block: 'nearest' });
  }

  function filter(query) {
    const q = String(query ?? '').trim().toLowerCase();
    for (const item of items()) {
      if (q === '' || labelOf(item).toLowerCase().includes(q)) item.removeAttribute('hidden');
      else item.setAttribute('hidden', '');
    }
    for (const group of groups()) {
      const any = Array.from(group.querySelectorAll(ITEM)).some(item => !item.hasAttribute('hidden'));
      if (any) group.removeAttribute('hidden');
      else group.setAttribute('hidden', '');
    }
    const list = visible();
    setActive(list[0] ?? null);
    return list;
  }

  function close() {
    if (!isOpen()) return;
    if (typeof dialog.close === 'function') dialog.close();
    else dialog.removeAttribute('open');
  }

  function open() {
    if (!isOpen()) {
      if (typeof dialog.showModal === 'function') dialog.showModal();
      else dialog.setAttribute('open', '');
    }
    if (input) {
      input.value = '';
      if (typeof input.focus === 'function') input.focus();
    }
    filter('');
  }

  function activate(item) {
    if (!item) return;
    close();
    if (onSelect) onSelect(item.getAttribute('data-action') ?? '', item);
  }

  function onInput(e) {
    if (input && e.target === input) filter(input.value);
  }

  function onClick(e) {
    const item = closestFrom(e.target, ITEM);
    if (!item || item.hasAttribute('hidden')) return;
    e.preventDefault();
    activate(item);
  }

  function onKeydown(e) {
    const list = visible();
    const index = list.indexOf(active);
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (list.length) setActive(list[(index + 1) % list.length]);
        return;
      case 'ArrowUp':
        e.preventDefault();
        if (list.length) setActive(list[(index - 1 + list.length) % list.length]);
        return;
      case 'Enter':
        e.preventDefault();
        activate(list.includes(active) ? active : list[0]);
        return;
      case 'Escape':
        e.preventDefault();
        close();
        return;
      default:
    }
  }

  const spec = hotkey ? parseHotkey(hotkey) : null;
  function onHotkey(e) {
    if (!spec || !hotkeyMatches(spec, e)) return;
    e.preventDefault();
    if (isOpen()) close();
    else open();
  }

  filter(input ? input.value ?? '' : '');

  dialog.addEventListener('input', onInput);
  dialog.addEventListener('click', onClick);
  dialog.addEventListener('keydown', onKeydown);
  if (spec && doc) doc.addEventListener('keydown', onHotkey);

  return {
    open,
    close,
    isOpen,
    filter,
    active: () => (active ? active.getAttribute('data-action') ?? '' : null),
    destroy() {
      dialog.removeEventListener('input', onInput);
      dialog.removeEventListener('click', onClick);
      dialog.removeEventListener('keydown', onKeydown);
      if (spec && doc) doc.removeEventListener('keydown', onHotkey);
    },
  };
}
