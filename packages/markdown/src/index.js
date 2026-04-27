import { parse as parseToAST } from './parser.js';
import { render as renderAST } from './renderer.js';

/**
 * Parse markdown to an HTML string. Convenience wrapper that runs the parser
 * and renderer back-to-back.
 *
 * @param {string} markdown
 * @returns {string} HTML
 */
export function parse(markdown) {
  return renderAST(parseToAST(markdown));
}

export { parseToAST as parseAST, renderAST as render };

/**
 * Extract YAML-style frontmatter from a markdown document.
 *
 * Returns `{ meta, content }` where `meta` is a flat string-to-string map of
 * key/value pairs and `content` is the markdown body with the frontmatter
 * block removed. If no frontmatter is present, returns the original input as
 * `content` and an empty `meta`.
 */
export function parseFrontmatter(input) {
  if (typeof input !== 'string' || !input.startsWith('---')) {
    return { meta: {}, content: input ?? '' };
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
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (key) meta[key] = value;
  }

  return { meta, content };
}
