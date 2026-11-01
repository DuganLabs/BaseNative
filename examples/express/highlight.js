/**
 * One syntax-highlighting pass for every code block the site renders.
 *
 * Before this module, highlighting existed only where an author had
 * hand-typed highlight spans into a template — two views out of the
 * whole site, so /compare's side-by-side code and every component
 * Quick-start and Source pane rendered as plain
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
import { hlCSS, hlHTML, hlJS, hlShell } from './public/highlight-engine.js';

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
  if (/(^|\n)\s*(import\s|export\s|const\s|let\s|var\s|function\s|class\s)/.test(code))
    return false;
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
export function looksLikeShell(code) {
  const lines = code.split('\n').filter((line) => line.trim());
  if (!lines.length) return false;
  const command =
    /^\s*(\$\s+|#\s)?(npm|npx|pnpm|yarn|bun|bunx|bn|git|curl|cd|node|brew|mkdir|deno|wrangler|cp|mv|echo|export|docker|gh)\b/;
  return (
    lines.every((line) => command.test(line) || /^\s*#/.test(line) || /^\s+\S/.test(line)) &&
    command.test(lines.find((line) => !/^\s*#/.test(line)) ?? '')
  );
}

const LANGUAGES = {
  html: hlHTML,
  xml: hlHTML,
  svg: hlHTML,
  js: hlJS,
  javascript: hlJS,
  mjs: hlJS,
  ts: hlJS,
  typescript: hlJS,
  jsx: hlJS,
  tsx: hlJS,
  json: hlJS,
  css: hlCSS,
  sh: hlShell,
  bash: hlShell,
  shell: hlShell,
  zsh: hlShell,
  console: hlShell,
};

export function highlightCode(code, lang) {
  const declared = lang && LANGUAGES[String(lang).toLowerCase()];
  if (declared) return declared(code);
  if (looksLikeShell(code)) return hlShell(code);
  if (/^\s*</.test(code) || /<\/[a-zA-Z]/.test(code)) return hlHTML(code);
  if (looksLikeCss(code)) return hlCSS(code);
  return hlJS(code);
}

/** The language a block declares: class="language-x" or data-lang="x" on <code> or <pre>. */
function declaredLanguage(open) {
  const m = open.match(/(?:class="[^"]*\blanguage-([\w-]+)|data-lang(?:uage)?="([\w-]+)")/);
  return m ? m[1] || m[2] : null;
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
    return open + codeLines(highlightCode(decodeEntities(inner), declaredLanguage(open))) + close;
  });
}

/** Deepest leading indent a line records. */
export const MAX_CODE_INDENT = 16;

/**
 * Split highlighted HTML into one element per source line, so each
 * line is its own box (code never wraps; a long line scrolls). A token that spans lines (a block comment, a
 * template string) is closed at the line end and reopened on the next
 * line, so every line is well-formed on its own. Each line keeps its
 * newline, so the block's text content is unchanged byte for byte, and
 * records its leading indent (spaces, tabs as two) in
 * data-code-indent, capped at MAX_CODE_INDENT.
 * The line element is a bdi: code reads left to right, and an
 * isolated line keeps a right-to-left string literal from reordering
 * the code around it. A line's leading whitespace sits in its own
 * unwrapping element.
 */
export function codeLines(highlighted) {
  const parts = highlighted.split(/(<[^>]+>)/);
  const lines = [];
  let open = [];
  let line = '';
  let text = '';
  const finish = (newline) => {
    const closing = open
      .slice()
      .reverse()
      .map((tag) => `</${tag.match(/^<([\w-]+)/)[1]}>`)
      .join('');
    const lead = text.match(/^[ \t]*/)[0];
    const indent = Math.min(MAX_CODE_INDENT, lead.replace(/\t/g, '  ').length);
    lines.push(
      `<bdi dir="ltr" data-code-line data-code-indent="${indent}">${line}${newline}${closing}</bdi>`,
    );
    line = open.join('');
    text = '';
  };
  for (const part of parts) {
    if (!part) continue;
    if (part.startsWith('<')) {
      if (part.startsWith('</')) open.pop();
      else if (!part.endsWith('/>')) open.push(part);
      line += part;
      continue;
    }
    const pieces = part.split('\n');
    pieces.forEach((piece, index) => {
      if (index > 0) finish('\n');
      const lead = text ? '' : piece.match(/^[ \t]*/)[0];
      line += lead ? `<bdi data-code-lead>${lead}</bdi>${piece.slice(lead.length)}` : piece;
      text += decodeEntities(piece);
    });
  }
  if (line !== open.join('') || text) finish('');
  return lines.join('');
}
