/**
 * Command palette — Cmd+K style searchable command menu.
 */
export function renderCommandPalette(options = {}) {
  const {
    commands = [],
    placeholder = 'Type a command...',
    open = false,
    id = `bn-command-${Math.random().toString(36).slice(2)}`,
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
        const shortcut = cmd.shortcut ? `<kbd data-bn="command-shortcut">${cmd.shortcut}</kbd>` : '';
        return `<button data-bn="command-item" role="option" data-action="${cmd.action ?? cmd.id ?? ''}" type="button">${icon}<span data-bn="command-label">${cmd.label}</span>${shortcut}</button>`;
      })
      .join('');
    groupsHtml += `<div data-bn="command-group" role="group" aria-label="${groupName}">
  <div data-bn="command-group-label">${groupName}</div>
  ${itemsHtml}
</div>`;
  }

  return `<dialog data-bn="command-palette" id="${id}"${open ? ' open' : ''} ${attrs}>
  <div data-bn="command-header">
    <input data-bn="command-input" type="text" placeholder="${placeholder}" role="combobox" aria-expanded="true" autocomplete="off" autofocus>
  </div>
  <div data-bn="command-list" role="listbox">${groupsHtml}</div>
  <div data-bn="command-footer">
    <span>↑↓ Navigate</span>
    <span>↵ Select</span>
    <span>Esc Close</span>
  </div>
</dialog>`;
}
