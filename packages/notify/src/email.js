import { escapeAttr, isRaw, unwrapRaw } from '@basenative/runtime/shared/escape';

/**
 * `@basenative/runtime/shared/escape` is the canonical escaping shared by the
 * SSR renderer and client runtime (see `packages/runtime/src/shared/escape.js`
 * and its use in `packages/server/src/render.js`). This module used to carry
 * its own local copy so notify wouldn't need the dependency; it now imports
 * the shared one instead, so the two template languages can't drift apart.
 *
 * Unlike the runtime's `escapeText`/`escapeAttr` split, every substitution
 * here uses `escapeAttr`, which also escapes quotes. The runtime can tell
 * apart a text-node interpolation from an attribute-value one because its
 * renderer parses the template; this module's `{{ key }}` substitution is a
 * plain string replace with no idea which context it lands in (`<img
 * src="{{ src }}">` vs `<p>{{ name }}</p>`). A value safe only in text nodes
 * would let `" onerror="alert(1)` break out of an attribute, so every
 * substituted value gets the stricter escaping.
 *
 * A value wrapped in `raw()` (also exported by `@basenative/runtime/shared/escape`)
 * is inserted verbatim as trusted markup, matching the SSR renderer's opt-out.
 */

/** Named character references this module round-trips through `htmlToText`. */
const NAMED_ENTITIES = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  '#39': "'",
};

/**
 * Decode a single HTML entity starting at `html[i]` (which must be `&`).
 * Returns the decoded text and the index just past what was consumed.
 * Reads only from the original source — never from text this module has
 * already emitted — so decoding one entity can never resurrect a tag from
 * characters produced by decoding an earlier one.
 */
function decodeEntityAt(html, i) {
  const match = /^&(#x[0-9a-fA-F]+|#\d+|[a-zA-Z]+);/.exec(html.slice(i, i + 12));
  if (!match) return { text: '&', next: i + 1 };

  const body = match[1];
  let decoded = match[0];
  if (body[0] === '#') {
    const isHex = body[1] === 'x' || body[1] === 'X';
    const codePoint = parseInt(body.slice(isHex ? 2 : 1), isHex ? 16 : 10);
    if (Number.isFinite(codePoint) && codePoint >= 0 && codePoint <= 0x10ffff) {
      decoded = String.fromCodePoint(codePoint);
    }
  } else if (Object.hasOwn(NAMED_ENTITIES, body)) {
    decoded = NAMED_ENTITIES[body];
  }
  return { text: decoded, next: i + match[0].length };
}

/**
 * Convert rendered HTML to a plain-text approximation in a single linear
 * pass over the string.
 *
 * The previous implementation chained regex `.replace()` calls: strip
 * `<script>`/`<style>` content, convert a few tags to whitespace, strip all
 * remaining tags, then decode HTML entities. Each step re-scans the *output*
 * of the step before it — which is exactly how tag filters get bypassed. A
 * payload like `<scr<script>ipt>` survives a single non-greedy
 * `<script...>...</script>` strip, because removing the inner `<script>`
 * leaves behind a brand new, complete `<script>` tag assembled from the
 * pieces on either side. Decoding entities in a fixed sequential order has
 * the same failure mode in reverse: decoding `&amp;` before `&lt;` turns the
 * inert text `&amp;lt;` into a live `&lt;` that a later step then decodes
 * again into a live `<`, resurrecting markup that was double-encoded on
 * purpose.
 *
 * This walks the string once, left to right, and never reinterprets output
 * it has already produced as new input.
 */
function htmlToText(html) {
  const lower = html.toLowerCase();
  const n = html.length;
  let out = '';
  let i = 0;

  while (i < n) {
    const ch = html[i];

    if (ch === '&') {
      const { text, next } = decodeEntityAt(html, i);
      out += text;
      i = next;
      continue;
    }

    if (ch !== '<') {
      out += ch;
      i += 1;
      continue;
    }

    const tagEnd = html.indexOf('>', i);
    if (tagEnd === -1) {
      // No closing '>' anywhere in the rest of the string: there is no
      // complete tag left to interpret, so the remainder is inert text.
      break;
    }

    const isClosing = html[i + 1] === '/';
    const nameMatch = /^\/?\s*([a-zA-Z][a-zA-Z0-9]*)/.exec(html.slice(i + 1, tagEnd));
    const name = nameMatch ? nameMatch[1].toLowerCase() : '';

    if (!isClosing && (name === 'script' || name === 'style')) {
      // Skip to a literal, well-formed `</name>` close tag, verified against
      // the raw source — never trust a nested open tag to end the content.
      const closer = `</${name}`;
      let searchFrom = tagEnd + 1;
      let consumed = n; // default: nothing valid found, drop the rest
      for (;;) {
        const closeStart = lower.indexOf(closer, searchFrom);
        if (closeStart === -1) break;
        const afterCloser = closeStart + closer.length;
        const closeTagEnd = html.indexOf('>', afterCloser);
        if (closeTagEnd === -1) break;
        if (/^\s*$/.test(html.slice(afterCloser, closeTagEnd))) {
          consumed = closeTagEnd + 1;
          break;
        }
        searchFrom = afterCloser;
      }
      i = consumed;
      continue;
    }

    if (!isClosing && name === 'br') out += '\n';
    else if (isClosing && name === 'p') out += '\n\n';
    else if (isClosing && name === 'div') out += '\n';
    else if (isClosing && /^h[1-6]$/.test(name)) out += '\n\n';
    else if (!isClosing && name === 'li') out += '- ';
    // Any other tag, opening or closing, contributes nothing.

    i = tagEnd + 1;
  }

  return out.replace(/\n{3,}/g, '\n\n').trim();
}

/**
 * Render an HTML email template with {{ variable }} interpolation.
 * @param {string} template - HTML template with {{ variable }} placeholders.
 * @param {Record<string, string>} data - Key-value pairs for interpolation.
 * @returns {{ html: string, text: string }}
 */
export function renderEmail(template, data) {
  const html = template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key) => {
    if (!(key in data)) return '';
    const value = data[key];
    return isRaw(value) ? unwrapRaw(value) : escapeAttr(value ?? '');
  });

  return { html, text: htmlToText(html) };
}

/**
 * Create an email sender that delegates to a transport.
 * @param {{ send: (email: object) => Promise<any> }} transport
 * @returns {{ send: (options: { to: string, from: string, subject: string, html: string, text?: string }) => Promise<any> }}
 */
export function createEmailSender(transport) {
  return {
    send(options) {
      return transport.send(options);
    },
  };
}
