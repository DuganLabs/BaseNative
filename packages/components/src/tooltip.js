/**
 * Tooltip — popover-based tooltip using the Popover API.
 */
import { escapeAttr, escapeText } from '@basenative/runtime/shared/escape';
import { nextId } from './ids.js';
import { attrsSuffix } from './internal/attrs.js';

/**
 * Per the HTML spec, only button-like elements (`<button>`, and `<input
 * type="button|submit|reset|image">`) can be popover invokers — a `<span
 * popovertarget>` never opens anything, by click or by keyboard, in any
 * browser. Matches an already-invoker-capable opening tag at the start of a
 * trigger HTML slot so it is not double-wrapped.
 */
const INVOKER_TAG_RE = /^(\s*<(?:button|input)\b)([^>]*)(>)/i;

/**
 * Tooltip — popover-based tooltip using the Popover API.
 *
 * The trigger is always rendered as a real popover invoker so it can be
 * opened by click or keyboard in every browser:
 *
 * - Plain text (or any markup not already starting with `<button` or
 *   `<input`) is wrapped in a fresh `<button type="button">`.
 * - A `trigger` HTML slot that already starts with `<button` or `<input`
 *   (case-insensitive, leading whitespace allowed) is used as-is — its
 *   opening tag is not wrapped, since nesting one interactive element inside
 *   another is invalid HTML — and instead gets `data-bn="tooltip-trigger"`,
 *   `popovertarget`, `popovertargetaction="toggle"`, `aria-describedby` and
 *   `attrs` spliced onto that existing tag.
 *
 * @param {object} [options]
 * @param {string} [options.content]  Tooltip text; escaped
 * @param {string} [options.trigger]  HTML slot: not escaped; pass trusted markup only.
 *   Wrapped in a `<button type="button">` invoker unless it already starts with
 *   `<button` or `<input`, in which case that tag becomes the invoker in place.
 * @param {string} [options.position='top']
 * @param {string} [options.id]       Defaults to nextId('tooltip')
 * @param {string} [options.attrs]    Raw attribute markup spliced onto the trigger invoker; not escaped
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

  const escapedId = escapeAttr(id);
  const invokerAttrs = ` data-bn="tooltip-trigger" popovertarget="${escapedId}" popovertargetaction="toggle" aria-describedby="${escapedId}"${attrsSuffix(attrs)}`;

  const match = trigger.match(INVOKER_TAG_RE);
  const triggerHtml = match
    ? `${match[1]}${invokerAttrs}${match[2]}${match[3]}${trigger.slice(match[0].length)}`
    : `<button type="button"${invokerAttrs}>${trigger}</button>`;

  return `${triggerHtml}<span data-bn="tooltip" id="${escapedId}" popover data-position="${escapeAttr(position)}" role="tooltip">${escapeText(content)}</span>`;
}
