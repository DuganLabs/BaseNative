/**
 * Tabs — tab navigation with panels.
 */
export function renderTabs(options = {}) {
  const {
    tabs = [],
    activeTab,
    variant = 'default',
    id = `bn-tabs-${Math.random().toString(36).slice(2)}`,
    attrs = '',
  } = options;

  const active = activeTab ?? tabs[0]?.id;

  const tabList = tabs
    .map(tab => {
      const isActive = tab.id === active;
      return `<button data-bn="tab" role="tab" id="${id}-tab-${tab.id}" aria-selected="${isActive}" aria-controls="${id}-panel-${tab.id}" data-tab="${tab.id}"${tab.disabled ? ' disabled' : ''}>${tab.label}</button>`;
    })
    .join('');

  const panels = tabs
    .map(tab => {
      const isActive = tab.id === active;
      return `<div data-bn="tab-panel" role="tabpanel" id="${id}-panel-${tab.id}" aria-labelledby="${id}-tab-${tab.id}"${isActive ? '' : ' hidden'}>${tab.content ?? ''}</div>`;
    })
    .join('');

  return `<div data-bn="tabs" data-variant="${variant}" id="${id}" ${attrs}>
  <div data-bn="tab-list" role="tablist">${tabList}</div>
  ${panels}
</div>`;
}
