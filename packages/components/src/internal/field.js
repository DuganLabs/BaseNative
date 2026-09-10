import { escapeAttr, escapeText } from '@basenative/runtime/shared/escape';

/**
 * aria-describedby for a form control: lists `<id>-help` when helpText is set
 * and `<id>-error` when error is set (both, space separated, when both are).
 * Returns '' when neither is set so it can be interpolated directly.
 *
 * @param {string} id
 * @param {string} [helpText]
 * @param {string} [error]
 * @returns {string}
 */
export function describedBy(id, helpText, error) {
  const ids = [];
  if (helpText) ids.push(`${id}-help`);
  if (error) ids.push(`${id}-error`);
  return ids.length ? ` aria-describedby="${escapeAttr(ids.join(' '))}"` : '';
}

/**
 * Shared field wrapper for input, textarea and select: label, the control
 * markup, then optional help and error spans whose ids match describedBy().
 * label, helpText and error are escaped text; `control` is the already-built
 * control markup and is inserted verbatim.
 *
 * @param {{id: string, label?: string, control: string, helpText?: string, error?: string}} field
 * @returns {string}
 */
export function renderField({ id, label, control, helpText = '', error = '' }) {
  const safeId = escapeAttr(id);
  let html = `<div data-bn="field">`;
  if (label) {
    html += `<label for="${safeId}">${escapeText(label)}</label>`;
  }
  html += control;
  if (helpText) {
    html += `<span data-bn="field-help" id="${safeId}-help">${escapeText(helpText)}</span>`;
  }
  if (error) {
    html += `<span data-bn="field-error" id="${safeId}-error" role="alert">${escapeText(error)}</span>`;
  }
  html += `</div>`;
  return html;
}
