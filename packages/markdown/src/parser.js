/**
 * Markdown parser - converts markdown text to AST
 */

export function parse(markdown) {
  const lines = markdown.split('\n');
  const ast = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Empty line - skip
    if (!line.trim()) {
      i++;
      continue;
    }

    // Headings
    const headingMatch = line.match(/^(#{1,6})\s+(.+?)(?:\s+#+)?\s*$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const content = headingMatch[2];
      ast.push({
        type: 'heading',
        level,
        children: parseInline(content),
      });
      i++;
      continue;
    }

    // Horizontal rules
    if (/^(-{3,}|_{3,}|\*{3,})$/.test(line.trim())) {
      ast.push({ type: 'horizontal-rule' });
      i++;
      continue;
    }

    // Code blocks
    if (line.trim().startsWith('```')) {
      const lang = line.trim().slice(3);
      const codeLines = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      ast.push({
        type: 'code-block',
        language: lang,
        value: codeLines.join('\n'),
      });
      i++;
      continue;
    }

    // Tables (GFM): header row | separator row | body rows
    if (isTableRow(line) && i + 1 < lines.length && isTableSeparator(lines[i + 1])) {
      const { table, nextIndex } = parseTable(lines, i);
      ast.push(table);
      i = nextIndex;
      continue;
    }

    // Blockquotes
    if (line.trim().startsWith('>')) {
      const quoteLines = [];
      while (i < lines.length && lines[i].trim().startsWith('>')) {
        quoteLines.push(lines[i].replace(/^\s*>\s?/, ''));
        i++;
      }
      const quoteContent = quoteLines.join('\n');
      ast.push({
        type: 'blockquote',
        children: parse(quoteContent),
      });
      continue;
    }

    // Lists (unordered or ordered)
    if (/^\s*[-*+]\s/.test(line) || /^\s*\d+\.\s/.test(line)) {
      const { list, nextIndex } = parseList(lines, i);
      ast.push(list);
      i = nextIndex;
      continue;
    }

    // Paragraphs
    const paragraphLines = [line];
    i++;
    while (
      i < lines.length &&
      lines[i].trim() &&
      !lines[i].match(/^(#{1,6})\s+/) &&
      !lines[i].trim().startsWith('>') &&
      !lines[i].trim().startsWith('```') &&
      !/^\s*[-*+]\s/.test(lines[i]) &&
      !/^\s*\d+\.\s/.test(lines[i]) &&
      !/^(-{3,}|_{3,}|\*{3,})$/.test(lines[i].trim()) &&
      !(isTableRow(lines[i]) && i + 1 < lines.length && isTableSeparator(lines[i + 1]))
    ) {
      paragraphLines.push(lines[i]);
      i++;
    }
    const paragraphText = paragraphLines.join(' ');
    ast.push({
      type: 'paragraph',
      children: parseInline(paragraphText),
    });
  }

  return ast;
}

function parseInline(text) {
  const nodes = [];
  let i = 0;

  while (i < text.length) {
    // Bold+Italic: ***text*** or ___text___ (must precede bold/italic checks)
    const boldItalicMatch = text.slice(i).match(/^\*\*\*(.+?)\*\*\*/);
    if (boldItalicMatch) {
      nodes.push({
        type: 'bold-italic',
        children: parseInline(boldItalicMatch[1]),
      });
      i += boldItalicMatch[0].length;
      continue;
    }

    const boldItalicUnderscore = text.slice(i).match(/^___(.+?)___/);
    if (boldItalicUnderscore) {
      nodes.push({
        type: 'bold-italic',
        children: parseInline(boldItalicUnderscore[1]),
      });
      i += boldItalicUnderscore[0].length;
      continue;
    }

    // Bold: **text**
    const boldMatch = text.slice(i).match(/^\*\*(.+?)\*\*/);
    if (boldMatch) {
      nodes.push({
        type: 'bold',
        children: parseInline(boldMatch[1]),
      });
      i += boldMatch[0].length;
      continue;
    }

    // Bold: __text__
    const boldUnderscore = text.slice(i).match(/^__(.+?)__/);
    if (boldUnderscore) {
      nodes.push({
        type: 'bold',
        children: parseInline(boldUnderscore[1]),
      });
      i += boldUnderscore[0].length;
      continue;
    }

    // Italic: *text* (but not **)
    if (text[i] === '*' && text[i + 1] !== '*') {
      const italicMatch = text.slice(i).match(/^\*(.+?)\*(?!\*)/);
      if (italicMatch) {
        nodes.push({
          type: 'italic',
          children: parseInline(italicMatch[1]),
        });
        i += italicMatch[0].length;
        continue;
      }
    }

    // Italic: _text_ (but not __)
    if (text[i] === '_' && text[i + 1] !== '_') {
      const italicMatch = text.slice(i).match(/^_(.+?)_(?!_)/);
      if (italicMatch) {
        nodes.push({
          type: 'italic',
          children: parseInline(italicMatch[1]),
        });
        i += italicMatch[0].length;
        continue;
      }
    }

    // Strikethrough: ~~text~~
    const strikeMatch = text.slice(i).match(/^~~(.+?)~~/);
    if (strikeMatch) {
      nodes.push({
        type: 'strikethrough',
        children: parseInline(strikeMatch[1]),
      });
      i += strikeMatch[0].length;
      continue;
    }

    // Inline code: `text`
    const codeMatch = text.slice(i).match(/^`([^`]+)`/);
    if (codeMatch) {
      nodes.push({
        type: 'code',
        value: codeMatch[1],
      });
      i += codeMatch[0].length;
      continue;
    }

    // Image: ![alt](src)
    const imageMatch = text.slice(i).match(/^!\[([^\]]*)\]\(([^)]+)\)/);
    if (imageMatch) {
      nodes.push({
        type: 'image',
        alt: imageMatch[1],
        src: imageMatch[2],
      });
      i += imageMatch[0].length;
      continue;
    }

    // Link: [text](url)
    const linkMatch = text.slice(i).match(/^\[([^\]]+)\]\(([^)]+)\)/);
    if (linkMatch) {
      nodes.push({
        type: 'link',
        href: linkMatch[2],
        children: parseInline(linkMatch[1]),
      });
      i += linkMatch[0].length;
      continue;
    }

    // Plain text - find next special char
    let nextSpecialChar = text.length;
    const specialChars = ['*', '_', '`', '[', '!', '~'];
    for (const char of specialChars) {
      const idx = text.indexOf(char, i + 1);
      if (idx !== -1 && idx < nextSpecialChar) {
        nextSpecialChar = idx;
      }
    }

    // If the cursor is sitting on a special char that didn't form any pattern
    // above, emit it as a literal so we always advance and never loop forever.
    const startedOnSpecial = specialChars.includes(text[i]);
    const sliceEnd = startedOnSpecial ? Math.max(i + 1, nextSpecialChar) : nextSpecialChar;
    const textNode = text.slice(i, sliceEnd);
    if (textNode) {
      if (nodes.length > 0 && nodes[nodes.length - 1].type === 'text') {
        nodes[nodes.length - 1].value += textNode;
      } else {
        nodes.push({
          type: 'text',
          value: textNode,
        });
      }
    }
    i = sliceEnd;
  }

  return nodes.length > 0 ? nodes : [{ type: 'text', value: '' }];
}

function parseList(lines, startIndex) {
  const items = [];
  let i = startIndex;
  let ordered = null;

  while (i < lines.length) {
    const line = lines[i];
    const unorderedMatch = line.match(/^\s*[-*+]\s+(.*)$/);
    const orderedMatch = line.match(/^\s*\d+\.\s+(.*)$/);

    if (!unorderedMatch && !orderedMatch) {
      break;
    }

    if (unorderedMatch) {
      if (ordered === null) ordered = false;
      if (ordered) break;
      const content = unorderedMatch[1];
      items.push({
        type: 'list-item',
        children: parseInline(content),
      });
    } else if (orderedMatch) {
      if (ordered === null) ordered = true;
      if (!ordered) break;
      const content = orderedMatch[1];
      items.push({
        type: 'list-item',
        children: parseInline(content),
      });
    }

    i++;
  }

  return {
    list: {
      type: 'list',
      ordered: ordered || false,
      children: items,
    },
    nextIndex: i,
  };
}

function isTableRow(line) {
  if (!line) return false;
  const trimmed = line.trim();
  return trimmed.includes('|') && trimmed.length > 0;
}

function isTableSeparator(line) {
  if (!line) return false;
  const cells = splitRow(line);
  if (cells.length === 0) return false;
  return cells.every((cell) => /^:?-{1,}:?$/.test(cell.trim()));
}

function splitRow(line) {
  let trimmed = line.trim();
  // Strip leading/trailing pipe so we don't get empty edge cells.
  if (trimmed.startsWith('|')) trimmed = trimmed.slice(1);
  if (trimmed.endsWith('|')) trimmed = trimmed.slice(0, -1);

  const cells = [];
  let current = '';
  let escaped = false;
  for (let i = 0; i < trimmed.length; i++) {
    const ch = trimmed[i];
    if (escaped) {
      current += ch;
      escaped = false;
      continue;
    }
    if (ch === '\\') {
      escaped = true;
      continue;
    }
    if (ch === '|') {
      cells.push(current);
      current = '';
      continue;
    }
    current += ch;
  }
  cells.push(current);
  return cells;
}

function alignmentFor(cell) {
  const trimmed = cell.trim();
  const left = trimmed.startsWith(':');
  const right = trimmed.endsWith(':');
  if (left && right) return 'center';
  if (right) return 'right';
  if (left) return 'left';
  return null;
}

function parseTable(lines, startIndex) {
  const headerCells = splitRow(lines[startIndex]).map((c) => c.trim());
  const separatorCells = splitRow(lines[startIndex + 1]);
  const align = separatorCells.map(alignmentFor);

  const headerNodes = headerCells.map((cell, idx) => ({
    type: 'table-cell',
    header: true,
    align: align[idx] ?? null,
    children: parseInline(cell),
  }));

  const rows = [
    {
      type: 'table-row',
      children: headerNodes,
    },
  ];

  let i = startIndex + 2;
  while (i < lines.length && isTableRow(lines[i]) && lines[i].trim() !== '') {
    const cells = splitRow(lines[i]).map((c) => c.trim());
    const rowCells = cells.map((cell, idx) => ({
      type: 'table-cell',
      header: false,
      align: align[idx] ?? null,
      children: parseInline(cell),
    }));
    rows.push({ type: 'table-row', children: rowCells });
    i++;
  }

  return {
    table: {
      type: 'table',
      align,
      children: rows,
    },
    nextIndex: i,
  };
}
