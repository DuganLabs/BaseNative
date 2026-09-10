/**
 * Tooltip — popover-based tooltip using the Popover API.
 */
import { escapeAttr, escapeText } from '@basenative/runtime/shared/escape';
import { nextId } from './ids.js';
import { attrsSuffix } from './internal/attrs.js';

/**
 * Tooltip — popover-based tooltip using the Popover API.
 *
 * @param {object} [options]
 * @param {string} [options.content]  Tooltip text; escaped
 * @param {string} [options.trigger]  HTML slot: not escaped; pass trusted markup only
 * @param {string} [options.position='top']
 * @param {string} [options.id]       Defaults to nextId('tooltip')
 * @param {string} [options.attrs]    Raw attribute markup appended to the trigger; not escaped
 * @returns {string}
 */
export function renderTooltip(options = {}) {
  const {
    content = '',
    trigger = '',
    position = 'top',
    id = nextId('tooltip'),
    attrs = '',
  } = options;

  return `<span data-bn="tooltip-trigger" popovertarget="${escapeAttr(id)}" popovertargetaction="toggle"${attrsSuffix(attrs)}>${trigger}</span><span data-bn="tooltip" id="${escapeAttr(id)}" popover data-position="${escapeAttr(position)}" role="tooltip">${escapeText(content)}</span>`;
}
