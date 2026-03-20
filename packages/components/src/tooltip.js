/**
 * Tooltip — popover-based tooltip using the Popover API.
 */
export function renderTooltip(options = {}) {
  const {
    content,
    trigger,
    position = 'top',
    id = `bn-tooltip-${Math.random().toString(36).slice(2)}`,
    attrs = '',
  } = options;

  return `<span data-bn="tooltip-trigger" popovertarget="${id}" popovertargetaction="toggle" ${attrs}>${trigger}</span><span data-bn="tooltip" id="${id}" popover data-position="${position}" role="tooltip">${content}</span>`;
}
