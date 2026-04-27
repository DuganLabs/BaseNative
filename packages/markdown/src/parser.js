/**
 * Markdown parser — converts a markdown string to an AST.
 *
 * Supports CommonMark essentials plus a useful slice of GitHub Flavored
 * Markdown: tables, task lists, strikethrough, autolinks, and hard breaks.
 */

const HEADING_RE = /^(#{1,6})\s+(.*?)(?:\s+#+)?\s*$/;
const SETEXT_H1_RE = /^=+\s*$/;
const SETEXT_H2_RE = /^-+\s*$/;
const HR_RE = /^\s{0,3}([-_*])\s*(?:\1\s*){2,}$/;
const FENCE_RE = /^(\s{0,3})(```+|~~~+)\s*([^\s`~]*)\s*$/;
const BLOCKQUOTE_RE = /^\s{0,3}>\s?(.*)$/;
const UL_ITEM_RE = /^(\s*)([-*+])\s+(.*)$/;
const OL_ITEM_RE = /^(\s*)(\d{1,9})\.\s+(.*)$/;
const TASK_RE = /^\[( |x|X)\]\s+(.*)$/;
const TABLE_DIVIDER_RE = /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/;

export function parse(markdown) {
  const lines = markdown.replace(/\r\n?/g, '\n').split('\n');
  return parseBlocks(lines, 0, lines.length, 0);
}

function parseBlocks(lines, start, end, baseIndent) {
  const ast = [];
  let i = start;

  while (i < end) {
    const line = lines[i];

    if (!line.trim()) {
      i++;
      continue;
    }

    // Fenced code block
    const fence = line.match(FENCE_RE);
    if (fence) {
      const closer = fence[2][0].repeat(fence[2].length);
      const lang = fence[3];
      const codeLines = [];
      i++;
      while (i < end) {
        const stripped = lines[i].trimStart();
        if (stripped.startsWith(closer) && /^[`~]+\s*$/.test(stripped)) {
          i++;
          break;
        }
        codeLines.push(lines[i]);
        i++;
      }
      ast.push({
        type: 'code-block',
        language: lang,
        value: codeLines.join('\n'),
      });
      continue;
    }

    // Setext heading: text line followed by ===/--- underline
    if (i + 1 < end && line.trim() && !isBlockStart(line)) {
      const nextLine = lines[i + 1];
      if (SETEXT_H1_RE.test(nextLine)) {
        ast.push({
          type: 'heading',
          level: 1,
          children: parseInline(line.trim()),
        });
        i += 2;
        continue;
      }
      if (SETEXT_H2_RE.test(nextLine) && !UL_ITEM_RE.test(line) && !HR_RE.test(nextLine)) {
        ast.push({
          type: 'heading',
          level: 2,
          children: parseInline(line.trim()),
        });
        i += 2;
        continue;
      }
    }

    // ATX heading
    const headingMatch = line.match(HEADING_RE);
    if (headingMatch) {
      ast.push({
        type: 'heading',
        level: headingMatch[1].length,
        children: parseInline(headingMatch[2].trim()),
      });
      i++;
      continue;
    }

    // Horizontal rule
    if (HR_RE.test(line)) {
      ast.push({ type: 'horizontal-rule' });
      i++;
      continue;
    }

    // Table — pipe-delimited row followed by a divider row
    if (line.includes('|') && i + 1 < end && TABLE_DIVIDER_RE.test(lines[i + 1])) {
      const { table, nextIndex } = parseTable(lines, i, end);
      if (table) {
        ast.push(table);
        i = nextIndex;
        continue;
      }
    }

    // Blockquote
    if (BLOCKQUOTE_RE.test(line)) {
      const quoteLines = [];
      while (i < end) {
        const m = lines[i].match(BLOCKQUOTE_RE);
        if (m) {
          quoteLines.push(m[1]);
          i++;
          continue;
        }
        // lazy continuation: a non-blank line that isn't a new block
        if (lines[i].trim() && !isBlockStart(lines[i])) {
          quoteLines.push(lines[i]);
          i++;
          continue;
        }
        break;
      }
      ast.push({
        type: 'blockquote',
        children: parse(quoteLines.join('\n')),
      });
      continue;
    }

    // Lists
    if (UL_ITEM_RE.test(line) || OL_ITEM_RE.test(line)) {
      const { list, nextIndex } = parseList(lines, i, end, baseIndent);
      ast.push(list);
      i = nextIndex;
      continue;
    }

    // Paragraph
    const paragraphLines = [line];
    i++;
    while (i < end) {
      const next = lines[i];
      if (!next.trim()) break;
      if (isBlockStart(next)) break;
      if (i + 1 < end && (SETEXT_H1_RE.test(next) || SETEXT_H2_RE.test(next))) break;
      paragraphLines.push(next);
      i++;
    }
    ast.push({
      type: 'paragraph',
      children: parseInline(paragraphLines.join('\n')),
    });
  }

  return ast;
}

function isBlockStart(line) {
  if (HEADING_RE.test(line)) return true;
  if (HR_RE.test(line)) return true;
  if (FENCE_RE.test(line)) return true;
  if (BLOCKQUOTE_RE.test(line)) return true;
  if (UL_ITEM_RE.test(line)) return true;
  if (OL_ITEM_RE.test(line)) return true;
  return false;
}

function parseList(lines, start, end, baseIndent) {
  const items = [];
  let i = start;

  const firstUl = lines[i].match(UL_ITEM_RE);
  const firstOl = lines[i].match(OL_ITEM_RE);
  const ordered = !!firstOl;
  const startIndent = (firstUl || firstOl)[1].length;

  if (startIndent < baseIndent) {
    return { list: { type: 'list', ordered, children: [] }, nextIndex: i };
  }

  while (i < end) {
    const line = lines[i];

    if (!line.trim()) {
      const nextNonBlank = i + 1;
      if (
        nextNonBlank < end &&
        (UL_ITEM_RE.test(lines[nextNonBlank]) || OL_ITEM_RE.test(lines[nextNonBlank]))
      ) {
        const m = lines[nextNonBlank].match(UL_ITEM_RE) || lines[nextNonBlank].match(OL_ITEM_RE);
        if (m && m[1].length === startIndent) {
          i++;
          continue;
        }
      }
      break;
    }

    const ul = line.match(UL_ITEM_RE);
    const ol = line.match(OL_ITEM_RE);
    const m = ul || ol;

    if (!m) break;
    if (ul && ordered) break;
    if (ol && !ordered) break;
    if (m[1].length !== startIndent) break;

    const itemContentLines = [m[3]];
    const itemIndent = startIndent + (ul ? 2 : m[2].length + 2);
    i++;

    while (i < end) {
      const ln = lines[i];
      if (!ln.trim()) {
        if (
          i + 1 < end &&
          ln.length === 0 &&
          /^\s+/.test(lines[i + 1]) &&
          (lines[i + 1].length - lines[i + 1].trimStart().length) >= itemIndent
        ) {
          itemContentLines.push('');
          i++;
          continue;
        }
        break;
      }
      const ind = ln.length - ln.trimStart().length;
      if (ind >= itemIndent) {
        itemContentLines.push(ln.slice(itemIndent));
        i++;
        continue;
      }
      const nestedUl = ln.match(UL_ITEM_RE);
      const nestedOl = ln.match(OL_ITEM_RE);
      if ((nestedUl || nestedOl) && (nestedUl || nestedOl)[1].length > startIndent) {
        itemContentLines.push(ln.slice(itemIndent));
        i++;
        continue;
      }
      break;
    }

    const itemContent = itemContentLines.join('\n');
    items.push(buildListItem(itemContent, startIndent + 2));
  }

  return {
    list: { type: 'list', ordered, children: items },
    nextIndex: i,
  };
}

function buildListItem(rawContent, childIndent) {
  const lines = rawContent.split('\n');
  const firstLine = lines[0] ?? '';

  const taskMatch = firstLine.match(TASK_RE);
  const checked = taskMatch ? taskMatch[1].toLowerCase() === 'x' : null;
  const inlineText = taskMatch ? taskMatch[2] : firstLine;

  const rest = lines.slice(1);

  const children = [];
  if (rest.length === 0 || rest.every((ln) => !ln.trim())) {
    children.push(...parseInline(inlineText));
  } else {
    // Multi-line item: parse the rest as blocks (handles nested lists, code, etc.)
    const allLines = [inlineText, ...rest];
    const blocks = parseBlocks(allLines, 0, allLines.length, childIndent);
    if (blocks.length === 1 && blocks[0].type === 'paragraph') {
      children.push(...blocks[0].children);
    } else if (
      blocks.length > 0 &&
      blocks[0].type === 'paragraph'
    ) {
      children.push(...blocks[0].children);
      children.push(...blocks.slice(1));
    } else {
      children.push(...blocks);
    }
  }

  const item = { type: 'list-item', children };
  if (checked !== null) item.checked = checked;
  return item;
}

function parseTable(lines, start, end) {
  const headerLine = lines[start];
  const dividerLine = lines[start + 1];
  const headerCells = splitTableRow(headerLine);
  const dividerCells = splitTableRow(dividerLine);

  if (headerCells.length === 0 || dividerCells.length !== headerCells.length) {
    return { table: null, nextIndex: start };
  }

  const aligns = dividerCells.map((cell) => {
    const left = cell.startsWith(':');
    const right = cell.endsWith(':');
    if (left && right) return 'center';
    if (right) return 'right';
    if (left) return 'left';
    return null;
  });

  const header = {
    type: 'table-row',
    header: true,
    children: headerCells.map((cell, idx) => ({
      type: 'table-cell',
      header: true,
      align: aligns[idx],
      children: parseInline(cell),
    })),
  };

  const rows = [header];
  let i = start + 2;
  while (i < end) {
    const ln = lines[i];
    if (!ln.trim() || !ln.includes('|')) break;
    const cells = splitTableRow(ln);
    if (cells.length === 0) break;
    const normalized = [];
    for (let c = 0; c < headerCells.length; c++) {
      normalized.push(cells[c] ?? '');
    }
    rows.push({
      type: 'table-row',
      header: false,
      children: normalized.map((cell, idx) => ({
        type: 'table-cell',
        header: false,
        align: aligns[idx],
        children: parseInline(cell),
      })),
    });
    i++;
  }

  return {
    table: { type: 'table', children: rows },
    nextIndex: i,
  };
}

function splitTableRow(line) {
  let trimmed = line.trim();
  if (trimmed.startsWith('|')) trimmed = trimmed.slice(1);
  if (trimmed.endsWith('|') && !trimmed.endsWith('\\|')) trimmed = trimmed.slice(0, -1);
  if (!trimmed) return [];

  const cells = [];
  let buf = '';
  let escaped = false;
  for (const ch of trimmed) {
    if (escaped) {
      buf += ch;
      escaped = false;
      continue;
    }
    if (ch === '\\') {
      escaped = true;
      continue;
    }
    if (ch === '|') {
      cells.push(buf.trim());
      buf = '';
      continue;
    }
    buf += ch;
  }
  cells.push(buf.trim());
  return cells;
}

export function parseInline(text) {
  const nodes = [];
  let i = 0;

  while (i < text.length) {
    // Hard line break: backslash + newline, or two trailing spaces + newline
    if (text[i] === '\\' && text[i + 1] === '\n') {
      pushBreak(nodes);
      i += 2;
      continue;
    }
    if (text[i] === ' ' && text[i + 1] === ' ' && text[i + 2] === '\n') {
      pushBreak(nodes);
      i += 3;
      continue;
    }
    if (text[i] === '\n') {
      pushText(nodes, ' ');
      i++;
      continue;
    }

    // Backslash escape of a punctuation character
    if (text[i] === '\\' && i + 1 < text.length && /[\\`*_{}[\]()#+\-.!~|>]/.test(text[i + 1])) {
      pushText(nodes, text[i + 1]);
      i += 2;
      continue;
    }

    // Bold+Italic: ***text*** or ___text___
    if (
      (text[i] === '*' || text[i] === '_') &&
      text[i + 1] === text[i] &&
      text[i + 2] === text[i]
    ) {
      const marker = text[i].repeat(3);
      const end = text.indexOf(marker, i + 3);
      if (end !== -1) {
        nodes.push({
          type: 'bold-italic',
          children: parseInline(text.slice(i + 3, end)),
        });
        i = end + 3;
        continue;
      }
    }

    // Bold: **text** or __text__
    if ((text[i] === '*' || text[i] === '_') && text[i + 1] === text[i]) {
      const marker = text[i].repeat(2);
      const end = text.indexOf(marker, i + 2);
      if (end !== -1) {
        nodes.push({
          type: 'bold',
          children: parseInline(text.slice(i + 2, end)),
        });
        i = end + 2;
        continue;
      }
    }

    // Italic: *text* or _text_
    if (text[i] === '*' || text[i] === '_') {
      const marker = text[i];
      let end = -1;
      for (let j = i + 1; j < text.length; j++) {
        if (text[j] === marker && text[j + 1] !== marker && text[j - 1] !== marker) {
          end = j;
          break;
        }
      }
      if (end > i + 1) {
        nodes.push({
          type: 'italic',
          children: parseInline(text.slice(i + 1, end)),
        });
        i = end + 1;
        continue;
      }
    }

    // Strikethrough: ~~text~~
    if (text[i] === '~' && text[i + 1] === '~') {
      const end = text.indexOf('~~', i + 2);
      if (end !== -1) {
        nodes.push({
          type: 'strikethrough',
          children: parseInline(text.slice(i + 2, end)),
        });
        i = end + 2;
        continue;
      }
    }

    // Inline code: `text` or ``code with ` inside``
    if (text[i] === '`') {
      let runLen = 1;
      while (text[i + runLen] === '`') runLen++;
      const closer = '`'.repeat(runLen);
      const end = text.indexOf(closer, i + runLen);
      if (end !== -1) {
        nodes.push({
          type: 'code',
          value: text.slice(i + runLen, end).replace(/^ | $/g, ''),
        });
        i = end + runLen;
        continue;
      }
    }

    // Image: ![alt](src "title"?)
    if (text[i] === '!' && text[i + 1] === '[') {
      const closeBracket = findMatching(text, i + 1, '[', ']');
      if (closeBracket !== -1 && text[closeBracket + 1] === '(') {
        const closeParen = findMatching(text, closeBracket + 1, '(', ')');
        if (closeParen !== -1) {
          const alt = text.slice(i + 2, closeBracket);
          const dest = text.slice(closeBracket + 2, closeParen).trim();
          const { url, title } = splitDestTitle(dest);
          const node = { type: 'image', alt, src: url };
          if (title) node.title = title;
          nodes.push(node);
          i = closeParen + 1;
          continue;
        }
      }
    }

    // Link: [text](href "title"?)
    if (text[i] === '[') {
      const closeBracket = findMatching(text, i, '[', ']');
      if (closeBracket !== -1 && text[closeBracket + 1] === '(') {
        const closeParen = findMatching(text, closeBracket + 1, '(', ')');
        if (closeParen !== -1) {
          const inner = text.slice(i + 1, closeBracket);
          const dest = text.slice(closeBracket + 2, closeParen).trim();
          const { url, title } = splitDestTitle(dest);
          const node = {
            type: 'link',
            href: url,
            children: parseInline(inner),
          };
          if (title) node.title = title;
          nodes.push(node);
          i = closeParen + 1;
          continue;
        }
      }
    }

    // Autolink: <https://...> or <foo@bar.com>
    if (text[i] === '<') {
      const close = text.indexOf('>', i + 1);
      if (close !== -1) {
        const inner = text.slice(i + 1, close);
        if (/^[a-z][a-z0-9+.-]*:\S+$/i.test(inner)) {
          nodes.push({
            type: 'link',
            href: inner,
            children: [{ type: 'text', value: inner }],
            autolink: true,
          });
          i = close + 1;
          continue;
        }
        if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inner)) {
          nodes.push({
            type: 'link',
            href: `mailto:${inner}`,
            children: [{ type: 'text', value: inner }],
            autolink: true,
          });
          i = close + 1;
          continue;
        }
      }
    }

    pushText(nodes, text[i]);
    i++;
  }

  return nodes.length > 0 ? nodes : [{ type: 'text', value: '' }];
}

function pushText(nodes, value) {
  if (!value) return;
  const last = nodes[nodes.length - 1];
  if (last && last.type === 'text') {
    last.value += value;
  } else {
    nodes.push({ type: 'text', value });
  }
}

function pushBreak(nodes) {
  nodes.push({ type: 'line-break' });
}

function findMatching(text, start, open, close) {
  let depth = 0;
  let escaped = false;
  for (let j = start; j < text.length; j++) {
    if (escaped) {
      escaped = false;
      continue;
    }
    if (text[j] === '\\') {
      escaped = true;
      continue;
    }
    if (text[j] === open) depth++;
    else if (text[j] === close) {
      depth--;
      if (depth === 0) return j;
    }
  }
  return -1;
}

function splitDestTitle(dest) {
  const m = dest.match(/^(\S+)\s+(['"(])(.*)$/);
  if (m) {
    const closer = m[2] === '(' ? ')' : m[2];
    if (m[3].endsWith(closer)) {
      return { url: m[1], title: m[3].slice(0, -1) };
    }
  }
  return { url: dest, title: '' };
}
