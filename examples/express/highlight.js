/**
 * One syntax-highlighting pass for every code block the site renders.
 *
 * Before this module, highlighting existed only where an author had
 * hand-typed highlight spans into a template — two views out of the
 * whole site, so /compare's side-by-side code, every component
 * Quick-start and Source pane, and the showcase rendered as plain
 * monochrome while /docs was coloured. The fix belongs in the render
 * pipeline, not in more hand-typed spans: page.js runs every view's
 * rendered HTML through highlightCodeBlocks(), so a code block is
 * highlighted because it is a code block, on every page, the same way.
 *
 * The highlighting itself is the playground's implementation, shared
 * verbatim: highlight-engine.js (in public/, so the browser loads the
 * same file) tokenizes HTML, JS and CSS into the tk-* classes the
 * sheets style from the --color-text-syntax-* tokens, and segments a
 * CTI+ custom property name by its dynamics — category, type, item,
 * state. This module previously carried a second scanner of its own
 * (different classes — .kw .str .fn … — colours pointing at pre-CTI+
 * --color-syntax-* names, and a segmentation vocabulary re-derived
 * from the DTCG source at load): two implementations of one idea,
 * visibly different on the page. It is gone; there is one engine, and
 * the playground is its reference behaviour.
 *
 * What stays here is the site plumbing the playground does not need:
 * finding <pre><code> blocks in a rendered page, decoding their
 * (already escaped) text before the engine sees it, and telling CSS
 * samples from JS/HTML ones — the playground knows its pane's language,
 * a code block on a page does not say. A block whose code carries real
 * child markup (the builder's export placeholder is the one case) is
 * not code text and is left exactly as rendered. The text content of
 * every block is preserved byte for byte, so copy-code and text-based
 * checks see the same code as before.
 */
import { hlCSS, hlHTML, hlJS } from './public/highlight-engine.js';

const NAMED_ENTITIES = { lt: '<', gt: '>', amp: '&', quot: '"', apos: "'" };

/** Decode HTML entities in one pass, so &amp;lt; decodes to &lt;, never <. */
export function decodeEntities(text) {
  return text.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (whole, body) => {
    if (body.startsWith('#x') || body.startsWith('#X')) {
      const code = parseInt(body.slice(2), 16);
      return Number.isFinite(code) ? String.fromCodePoint(code) : whole;
    }
    if (body.startsWith('#')) {
      const code = parseInt(body.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : whole;
    }
    return NAMED_ENTITIES[body] ?? whole;
  });
}

/** Escape text for HTML content. Quotes need no escaping outside attributes. */
export function escapeText(text) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * Is this sample CSS rather than JS/HTML? Stylesheets reach the same
 * pass (component Source panes show .css files whole). The signals are
 * conservative and one-way: a custom-property definition or an at-rule
 * or a selector block in a sample with no JS statement starters. A JS
 * file that merely mentions CSS (an embedded template string, an object
 * literal) keeps the JS scanner.
 */
export function looksLikeCss(code) {
  if (/(^|\n)\s*(import\s|export\s|const\s|let\s|var\s|function\s|class\s)/.test(code)) return false;
  if (/(^|[\n{;])\s*--[\w-]+\s*:/.test(code)) return true;
  if (/(^|\n)\s*@(media|supports|keyframes|font-face|import|layer)\b/.test(code)) return true;
  return /(^|\n)\s*[.#:&*\w][^{}=();]*\{[^{]*[-\w]+\s*:/.test(code);
}

/**
 * Highlight one code sample's text, returning HTML. The language is
 * sniffed, not declared: CSS by the signals above, HTML by a leading
 * tag or a closing tag, everything else JS — the three languages of
 * the shared engine.
 */
export function highlightCode(code) {
  if (looksLikeCss(code)) return hlCSS(code);
  if (/^\s*</.test(code) || /<\/[a-zA-Z]/.test(code)) return hlHTML(code);
  return hlJS(code);
}

const CODE_BLOCK = /(<pre\b[^>]*>\s*<code\b[^>]*>)([\s\S]*?)(<\/code>\s*<\/pre>)/g;

/**
 * Highlight every <pre><code> block in a rendered page. Blocks whose
 * code contains real child markup are placeholders, not code text —
 * they pass through untouched, as does everything outside code blocks.
 */
export function highlightCodeBlocks(html) {
  return html.replace(CODE_BLOCK, (whole, open, inner, close) => {
    if (inner.includes('<')) return whole;
    return open + highlightCode(decodeEntities(inner)) + close;
  });
}
