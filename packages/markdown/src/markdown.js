/**
 * @basenative/markdown — zero-dependency markdown parser.
 *
 * Converts Markdown text to HTML. Supports headings, paragraphs, bold,
 * italic, inline code, code blocks, links, images, blockquotes, lists
 * (ordered + unordered), horizontal rules, and line breaks.
 *
 * Security: HTML entities in source text are escaped by default.
 */

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };
const escapeHtml = (s) => s.replace(/[&<>"]/g, (c) => ESC[c]);

/**
 * Parse inline markdown: bold, italic, code, links, images, line breaks.
 */
function parseInline(text) {
  let out = '';
  let i = 0;
  const len = text.length;

  while (i < len) {
    // Inline code (backtick)
    if (text[i] === '`') {
      const end = text.indexOf('`', i + 1);
      if (end !== -1) {
        out += `<code>${escapeHtml(text.slice(i + 1, end))}</code>`;
        i = end + 1;
        continue;
      }
    }

    // Image ![alt](src)
    if (text[i] === '!' && text[i + 1] === '[') {
      const altEnd = text.indexOf(']', i + 2);
      if (altEnd !== -1 && text[altEnd + 1] === '(') {
        const srcEnd = text.indexOf(')', altEnd + 2);
        if (srcEnd !== -1) {
          const alt = escapeHtml(text.slice(i + 2, altEnd));
          const src = escapeHtml(text.slice(altEnd + 2, srcEnd));
          out += `<img src="${src}" alt="${alt}">`;
          i = srcEnd + 1;
          continue;
        }
      }
    }

    // Link [text](href)
    if (text[i] === '[') {
      const textEnd = text.indexOf(']', i + 1);
      if (textEnd !== -1 && text[textEnd + 1] === '(') {
        const hrefEnd = text.indexOf(')', textEnd + 2);
        if (hrefEnd !== -1) {
          const linkText = parseInline(text.slice(i + 1, textEnd));
          const href = escapeHtml(text.slice(textEnd + 2, hrefEnd));
          out += `<a href="${href}">${linkText}</a>`;
          i = hrefEnd + 1;
          continue;
        }
      }
    }

    // Bold + italic ***text*** or ___text___
    if ((text[i] === '*' || text[i] === '_') && text[i + 1] === text[i] && text[i + 2] === text[i]) {
      const marker = text[i];
      const end = text.indexOf(marker + marker + marker, i + 3);
      if (end !== -1) {
        out += `<strong><em>${parseInline(text.slice(i + 3, end))}</em></strong>`;
        i = end + 3;
        continue;
      }
    }

    // Bold **text** or __text__
    if ((text[i] === '*' || text[i] === '_') && text[i + 1] === text[i]) {
      const marker = text[i];
      const end = text.indexOf(marker + marker, i + 2);
      if (end !== -1) {
        out += `<strong>${parseInline(text.slice(i + 2, end))}</strong>`;
        i = end + 2;
        continue;
      }
    }

    // Italic *text* or _text_
    if (text[i] === '*' || text[i] === '_') {
      const marker = text[i];
      const end = text.indexOf(marker, i + 1);
      if (end !== -1 && end > i + 1) {
        out += `<em>${parseInline(text.slice(i + 1, end))}</em>`;
        i = end + 1;
        continue;
      }
    }

    // Strikethrough ~~text~~
    if (text[i] === '~' && text[i + 1] === '~') {
      const end = text.indexOf('~~', i + 2);
      if (end !== -1) {
        out += `<del>${parseInline(text.slice(i + 2, end))}</del>`;
        i = end + 2;
        continue;
      }
    }

    // Line break (two trailing spaces + newline or backslash + newline)
    if (text[i] === '\\' && text[i + 1] === '\n') {
      out += '<br>';
      i += 2;
      continue;
    }
    if (text[i] === ' ' && text[i + 1] === ' ' && text[i + 2] === '\n') {
      out += '<br>';
      i += 3;
      continue;
    }

    out += escapeHtml(text[i]);
    i++;
  }

  return out;
}

/**
 * Parse a markdown string into an HTML string.
 *
 * @param {string} source  Raw markdown text
 * @param {object} [options]
 * @param {boolean} [options.sanitize=true]  Escape HTML entities in source
 * @returns {string} HTML output
 */
export function parse(source, options = {}) {
  const lines = source.replace(/\r\n/g, '\n').split('\n');
  const blocks = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Blank line — skip
    if (line.trim() === '') {
      i++;
      continue;
    }

    // Fenced code block
    if (line.trimStart().startsWith('```')) {
      const indent = line.length - line.trimStart().length;
      const lang = line.trimStart().slice(3).trim();
      const codeLines = [];
      i++;
      while (i < lines.length) {
        const cl = lines[i];
        if (cl.trimStart().startsWith('```') && cl.trim() === '```') {
          i++;
          break;
        }
        codeLines.push(cl);
        i++;
      }
      const code = escapeHtml(codeLines.join('\n'));
      const langAttr = lang ? ` class="language-${escapeHtml(lang)}"` : '';
      blocks.push(`<pre><code${langAttr}>${code}</code></pre>`);
      continue;
    }

    // Heading (ATX style)
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const text = parseInline(headingMatch[2].replace(/\s+#+\s*$/, ''));
      const slug = headingMatch[2].toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
      blocks.push(`<h${level} id="${slug}">${text}</h${level}>`);
      i++;
      continue;
    }

    // Horizontal rule
    if (/^(\*{3,}|-{3,}|_{3,})\s*$/.test(line.trim())) {
      blocks.push('<hr>');
      i++;
      continue;
    }

    // Blockquote
    if (line.trimStart().startsWith('>')) {
      const quoteLines = [];
      while (i < lines.length && (lines[i].trimStart().startsWith('>') || (lines[i].trim() !== '' && quoteLines.length > 0 && !lines[i].trimStart().startsWith('#')))) {
        const ql = lines[i].replace(/^>\s?/, '');
        quoteLines.push(ql);
        i++;
        if (lines[i]?.trim() === '') break;
      }
      const inner = parse(quoteLines.join('\n'));
      blocks.push(`<blockquote>${inner}</blockquote>`);
      continue;
    }

    // Unordered list
    if (/^[\s]*[-*+]\s/.test(line)) {
      const items = [];
      while (i < lines.length && /^[\s]*[-*+]\s/.test(lines[i])) {
        const itemText = lines[i].replace(/^[\s]*[-*+]\s/, '');
        items.push(`<li>${parseInline(itemText)}</li>`);
        i++;
      }
      blocks.push(`<ul>${items.join('')}</ul>`);
      continue;
    }

    // Ordered list
    if (/^[\s]*\d+\.\s/.test(line)) {
      const items = [];
      while (i < lines.length && /^[\s]*\d+\.\s/.test(lines[i])) {
        const itemText = lines[i].replace(/^[\s]*\d+\.\s/, '');
        items.push(`<li>${parseInline(itemText)}</li>`);
        i++;
      }
      blocks.push(`<ol>${items.join('')}</ol>`);
      continue;
    }

    // Paragraph (collect contiguous non-blank, non-block lines)
    const paraLines = [];
    while (i < lines.length && lines[i].trim() !== '' && !lines[i].trimStart().startsWith('#') && !lines[i].trimStart().startsWith('```') && !/^(\*{3,}|-{3,}|_{3,})\s*$/.test(lines[i].trim()) && !lines[i].trimStart().startsWith('>') && !/^[\s]*[-*+]\s/.test(lines[i]) && !/^[\s]*\d+\.\s/.test(lines[i])) {
      paraLines.push(lines[i]);
      i++;
    }
    if (paraLines.length > 0) {
      blocks.push(`<p>${parseInline(paraLines.join('\n'))}</p>`);
    }
  }

  return blocks.join('\n');
}

/**
 * Extract YAML-style frontmatter from markdown source.
 *
 * @param {string} source  Raw markdown with optional --- frontmatter ---
 * @returns {{ meta: Record<string, string>, content: string }}
 */
export function parseFrontmatter(source) {
  const trimmed = source.trimStart();
  if (!trimmed.startsWith('---')) {
    return { meta: {}, content: source };
  }

  const endIndex = trimmed.indexOf('---', 3);
  if (endIndex === -1) {
    return { meta: {}, content: source };
  }

  const frontmatter = trimmed.slice(3, endIndex).trim();
  const content = trimmed.slice(endIndex + 3).trim();
  const meta = {};

  for (const line of frontmatter.split('\n')) {
    const colonIndex = line.indexOf(':');
    if (colonIndex !== -1) {
      const key = line.slice(0, colonIndex).trim();
      const value = line.slice(colonIndex + 1).trim().replace(/^["']|["']$/g, '');
      meta[key] = value;
    }
  }

  return { meta, content };
}
