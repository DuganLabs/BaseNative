/**
 * Prose for a table cell. A cell wraps only between words (the catalog
 * table sets `overflow-wrap: break-word`), so its longest unbreakable run
 * sets the column's minimum width. Two kinds of run would size a column
 * past the table on a narrow page or a wider fallback font:
 *
 *  - identifiers (package specs, globals, calls) are set as <code>,
 *    which the table lets wrap at any character;
 *  - slash compounds ("Runes/compiler") may break after the slash, the
 *    one place a reader expects them to. Short pairs ("N/A") hold.
 */
import { escapeText } from '@basenative/runtime/shared/escape';

const CODE_TOKEN =
  /@basenative\/[a-z-]+(?:\/[a-z-]+)*|\bglobalThis(?:\.[\w$]+)+|\b[A-Za-z_$][\w$]*\(\)/g;

const prose = (text) => escapeText(text).replace(/(?<=[A-Za-z]{2})\/(?=[A-Za-z]{2})/g, '/<wbr>');

/** @param {string} text @returns {string} trusted HTML */
export function cellProse(text) {
  let html = '';
  let last = 0;
  for (const match of text.matchAll(CODE_TOKEN)) {
    html += prose(text.slice(last, match.index)) + `<code>${escapeText(match[0])}</code>`;
    last = match.index + match[0].length;
  }
  return html + prose(text.slice(last));
}
