/**
 * Command palette — Cmd+K style searchable command menu.
 */
import { escapeAttr, escapeText } from '@basenative/runtime/shared/escape';
import { nextId } from './ids.js';
import { attrsSuffix } from './internal/attrs.js';

/**
 * Command palette — Cmd+K style searchable command menu in a native <dialog>.
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
  for (const [groupName, cmds] of groupsMap) {
    const itemsHtml = cmds
      .map(cmd => {
        const icon = cmd.icon ? `<span data-bn="command-icon">${cmd.icon}</span>` : '';
        const shortcut = cmd.shortcut ? `<kbd data-bn="command-shortcut">${escapeText(cmd.shortcut)}</kbd>` : '';
        return `<button data-bn="command-item" role="option" data-action="${escapeAttr(cmd.action ?? cmd.id ?? '')}" type="button">${icon}<span data-bn="command-label">${escapeText(cmd.label ?? '')}</span>${shortcut}</button>`;
      })
      .join('');
    groupsHtml += `<div data-bn="command-group" role="group" aria-label="${escapeAttr(groupName)}">
  <div data-bn="command-group-label">${escapeText(groupName)}</div>
  ${itemsHtml}
</div>`;
  }

  return `<dialog data-bn="command-palette" id="${escapeAttr(id)}"${open ? ' open' : ''}${attrsSuffix(attrs)}>
  <div data-bn="command-header">
    <input data-bn="command-input" type="text" placeholder="${escapeAttr(placeholder)}" role="combobox" aria-expanded="true" autocomplete="off" autofocus>
  </div>
  <div data-bn="command-list" role="listbox">${groupsHtml}</div>
  <div data-bn="command-footer">
    <span>↑↓ Navigate</span>
    <span>↵ Select</span>
    <span>Esc Close</span>
  </div>
</dialog>`;
}
