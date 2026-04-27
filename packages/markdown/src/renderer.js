/**
 * HTML renderer for markdown AST - SSR-safe with XSS protection
 */

export function render(ast) {
  return ast.map((node) => renderNode(node)).join('');
}

function renderNode(node) {
  switch (node.type) {
    case 'heading': {
      const id = generateSlug(getTextContent(node.children));
      return `<h${node.level} id="${id}">${renderNodes(node.children)}</h${node.level}>`;
    }
    case 'paragraph':
      return `<p>${renderNodes(node.children)}</p>`;
    case 'bold':
      return `<strong>${renderNodes(node.children)}</strong>`;
    case 'bold-italic':
      return `<strong><em>${renderNodes(node.children)}</em></strong>`;
    case 'italic':
      return `<em>${renderNodes(node.children)}</em>`;
    case 'strikethrough':
      return `<del>${renderNodes(node.children)}</del>`;
    case 'code':
      return `<code>${escapeHtml(node.value)}</code>`;
    case 'link':
      return `<a href="${sanitizeUrl(node.href)}">${renderNodes(node.children)}</a>`;
    case 'image':
      return `<img src="${sanitizeUrl(node.src)}" alt="${escapeHtml(node.alt)}">`;
    case 'list': {
      const tag = node.ordered ? 'ol' : 'ul';
      return `<${tag}>${renderNodes(node.children)}</${tag}>`;
    }
    case 'list-item':
      return `<li>${renderNodes(node.children)}</li>`;
    case 'code-block': {
      const lang = node.language ? ` class="language-${escapeHtml(node.language)}"` : '';
      return `<pre><code${lang}>${escapeHtml(node.value)}</code></pre>`;
    }
    case 'blockquote':
      return `<blockquote>${renderNodes(node.children)}</blockquote>`;
    case 'horizontal-rule':
      return '<hr>';
    case 'table': {
      const rows = node.children;
      if (rows.length === 0) return '<table></table>';
      const [headerRow, ...bodyRows] = rows;
      const thead = `<thead>${renderNode(headerRow)}</thead>`;
      const tbody = bodyRows.length > 0
        ? `<tbody>${bodyRows.map((r) => renderNode(r)).join('')}</tbody>`
        : '';
      return `<table>${thead}${tbody}</table>`;
    }
    case 'table-row':
      return `<tr>${renderNodes(node.children)}</tr>`;
    case 'table-cell': {
      const tag = node.header ? 'th' : 'td';
      const align = node.align ? ` style="text-align:${node.align}"` : '';
      return `<${tag}${align}>${renderNodes(node.children)}</${tag}>`;
    }
    case 'text':
      return escapeHtml(node.value);
    default:
      return '';
  }
}

function renderNodes(nodes) {
  return nodes.map((node) => renderNode(node)).join('');
}

function getTextContent(nodes) {
  return nodes
    .map((node) => {
      if (node.type === 'text') return node.value;
      if (node.children) return getTextContent(node.children);
      return '';
    })
    .join('');
}

function generateSlug(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function escapeHtml(str) {
  if (!str) return '';
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };
  return String(str).replace(/[&<>"']/g, (char) => map[char]);
}

function sanitizeUrl(url) {
  if (!url) return '';
  const trimmed = url.trim();
  // Block javascript: and data: schemes
  if (/^(javascript|data|vbscript):/i.test(trimmed)) {
    return '';
  }
  return escapeHtml(trimmed);
}
