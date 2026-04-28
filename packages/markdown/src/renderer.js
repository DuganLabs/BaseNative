/**
 * HTML renderer for the markdown AST. SSR-safe: produces a plain HTML string
 * with no DOM access, escapes text content, and rejects dangerous URL schemes.
 */

export function render(ast) {
  return ast.map(renderNode).join('');
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
    case 'link': {
      const titleAttr = node.title ? ` title="${escapeHtml(node.title)}"` : '';
      return `<a href="${sanitizeUrl(node.href)}"${titleAttr}>${renderNodes(node.children)}</a>`;
    }
    case 'image': {
      const titleAttr = node.title ? ` title="${escapeHtml(node.title)}"` : '';
      return `<img src="${sanitizeUrl(node.src)}" alt="${escapeHtml(node.alt)}"${titleAttr}>`;
    }
    case 'list': {
      const tag = node.ordered ? 'ol' : 'ul';
      const hasTask = node.children.some((c) => typeof c.checked === 'boolean');
      const cls = hasTask ? ' class="task-list"' : '';
      return `<${tag}${cls}>${renderNodes(node.children)}</${tag}>`;
    }
    case 'list-item': {
      if (typeof node.checked === 'boolean') {
        const checkbox = node.checked
          ? '<input type="checkbox" checked disabled>'
          : '<input type="checkbox" disabled>';
        return `<li class="task-list-item">${checkbox} ${renderNodes(node.children)}</li>`;
      }
      return `<li>${renderNodes(node.children)}</li>`;
    }
    case 'code-block': {
      const lang = node.language ? ` class="language-${escapeHtml(node.language)}"` : '';
      return `<pre><code${lang}>${escapeHtml(node.value)}</code></pre>`;
    }
    case 'blockquote':
      return `<blockquote>${renderNodes(node.children)}</blockquote>`;
    case 'horizontal-rule':
      return '<hr>';
    case 'line-break':
      return '<br>';
    case 'table': {
      const [header, ...body] = node.children;
      const thead = header ? `<thead>${renderNode(header)}</thead>` : '';
      const tbody = body.length > 0 ? `<tbody>${body.map(renderNode).join('')}</tbody>` : '';
      return `<table>${thead}${tbody}</table>`;
    }
    case 'table-row':
      return `<tr>${renderNodes(node.children)}</tr>`;
    case 'table-cell': {
      const tag = node.header ? 'th' : 'td';
      const alignAttr = node.align ? ` style="text-align:${node.align}"` : '';
      return `<${tag}${alignAttr}>${renderNodes(node.children)}</${tag}>`;
    }
    case 'text':
      return escapeHtml(node.value);
    default:
      return '';
  }
}

function renderNodes(nodes) {
  return nodes.map(renderNode).join('');
}

function getTextContent(nodes) {
  return nodes
    .map((node) => {
      if (node.type === 'text') return node.value;
      if (node.type === 'code') return node.value;
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

const ENTITIES = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

function escapeHtml(str) {
  if (str == null) return '';
  return String(str).replace(/[&<>"']/g, (ch) => ENTITIES[ch]);
}

function sanitizeUrl(url) {
  if (!url) return '';
  const trimmed = String(url).trim();
  if (/^(javascript|data|vbscript):/i.test(trimmed)) return '';
  return escapeHtml(trimmed);
}
