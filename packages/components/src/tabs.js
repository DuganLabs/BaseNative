/**
 * Tabs — tab navigation with panels.
 */
import { escapeAttr, escapeText } from '@basenative/runtime/shared/escape';
import { nextId } from './ids.js';
import { attrsSuffix } from './internal/attrs.js';

/**
 * Tabs — tab navigation with panels. Tab buttons are type="button" and wired
 * to their panels with aria-controls / aria-labelledby.
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

  const tabList = tabs
    .map(tab => {
      const isActive = tab.id === active;
      return `<button data-bn="tab" role="tab" type="button" id="${escapeAttr(`${id}-tab-${tab.id}`)}" aria-selected="${isActive}" aria-controls="${escapeAttr(`${id}-panel-${tab.id}`)}" data-tab="${escapeAttr(tab.id)}"${tab.disabled ? ' disabled' : ''}>${escapeText(tab.label ?? '')}</button>`;
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
