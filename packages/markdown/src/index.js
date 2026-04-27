import { parse as parseToAST } from './parser.js';
import { render as renderAST } from './renderer.js';

/**
 * Backward-compatible parse function that returns HTML
 */
export function parse(_markdown) {
  const ast = parseToAST(_markdown);
  return renderAST(ast);
}

// Export new API as well
export { parseToAST as parseAST, renderAST as render };

/**
 * Extract YAML-style frontmatter from markdown content.
 * Returns { meta, content } where meta is key-value pairs
 * and content is the remaining markdown after the frontmatter block.
 */
export function parseFrontmatter(input) {
  if (!input.startsWith('---')) {
    return { meta: {}, content: input };
  }

  const closingIndex = input.indexOf('\n---', 3);
  if (closingIndex === -1) {
    return { meta: {}, content: input };
  }

  const frontmatterBlock = input.slice(4, closingIndex);
  const content = input.slice(closingIndex + 4).replace(/^\n+/, '');

  const meta = {};
  for (const line of frontmatterBlock.split('\n')) {
    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) continue;
    const key = line.slice(0, colonIndex).trim();
    let value = line.slice(colonIndex + 1).trim();
    // Strip surrounding quotes
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (key) meta[key] = value;
  }

  return { meta, content };
}
