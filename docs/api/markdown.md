# @basenative/markdown

> Zero-dependency ES module markdown parser and SSR-safe HTML renderer.

## Overview

`@basenative/markdown` converts Markdown text to HTML in two explicit stages: `parseAST` turns a Markdown string into a plain-object AST, and `render` walks that AST to produce an HTML string. The top-level `parse` export is a convenience wrapper that runs both stages back-to-back. The renderer is SSR-safe — it does no DOM access (no `innerHTML`, no `document`), builds output by string concatenation, HTML-escapes all text content, and rejects `javascript:`/`data:`/`vbscript:` URLs in links and images. The package has no runtime dependencies (`package.json` declares none), matching the "zero-dependency" claim in its description.

Supported syntax: ATX and Setext headings (with generated `id` slugs), paragraphs, bold/italic/bold-italic, strikethrough, inline code and fenced code blocks (with language class), links and images (including title text), autolinks (`<https://...>`, `<user@host>`), hard line breaks, blockquotes (with lazy continuation), ordered/unordered lists (including GFM task lists), and GFM pipe tables with column alignment.

## Installation

```bash
npm install @basenative/markdown
```

## Quick Start

```js
import { parse, parseFrontmatter } from '@basenative/markdown';

const source = `---
title: Hello
---
# Hello, world

This is **bold** and this is *italic*, with some \`inline code\`.

- [ ] todo item
- [x] done item
`;

const { meta, content } = parseFrontmatter(source);
// meta = { title: 'Hello' }

const html = parse(content);
// '<h1 id="hello-world">Hello, world</h1><p>This is <strong>bold</strong>...</p>...'
```

Lower-level access to the AST — e.g. to inspect or transform nodes before rendering — is available via `parseAST` and `render`, imported from `@basenative/markdown` and `@basenative/markdown/renderer` respectively:

```js
import { parseAST } from '@basenative/markdown';
import { render } from '@basenative/markdown/renderer';

const ast = parseAST('# Title\n\nBody text.');
const html = render(ast);
```

## API Reference

### parse(markdown)

Parse markdown to an HTML string. Convenience wrapper that runs `parseAST` and `render` back-to-back — equivalent to `render(parseAST(markdown))`.

**Parameters:**
- `markdown` — raw Markdown source string

**Returns:** HTML string.

---

### parseFrontmatter(input)

Extract YAML-style frontmatter from a Markdown document. Recognizes a leading `---` block terminated by a line starting with `---`; each `key: value` line inside becomes a flat string entry (quoted values have their surrounding quotes stripped). If `input` has no leading `---` block, the original input is returned unchanged as `content` with an empty `meta`.

**Parameters:**
- `input` — raw document string (frontmatter block + Markdown body)

**Returns:** `{ meta: Record<string, string>, content: string }` — `meta` is a flat key/value map from the frontmatter block; `content` is the document body with the frontmatter block removed.

---

### parseAST(markdown)

Parse a Markdown string into an AST — an array of block-level nodes (`heading`, `paragraph`, `list`, `list-item`, `table`, `table-row`, `table-cell`, `code-block`, `blockquote`, `horizontal-rule`, `line-break`) whose inline content (`text`, `bold`, `italic`, `bold-italic`, `strikethrough`, `code`, `link`, `image`) is nested under `children`. This is the parsing half of `parse`, exposed separately so callers can inspect or transform the tree before rendering.

**Parameters:**
- `markdown` — raw Markdown source string

**Returns:** Array of AST block nodes.

---

### render(ast)

HTML renderer for the Markdown AST produced by `parseAST`. Imported from the `./renderer` subpath export. SSR-safe: produces a plain HTML string with no DOM access, escapes all text content (`&`, `<`, `>`, `"`, `'`), generates a slugged `id` on every heading from its text content, and sanitizes `href`/`src` attributes by rejecting `javascript:`, `data:`, and `vbscript:` schemes (the URL is dropped, replaced with an empty attribute value).

**Parameters:**
- `ast` — array of AST block nodes, as returned by `parseAST`

**Returns:** HTML string.

## Integration

`parse` and `render` are pure, synchronous, dependency-free functions that produce plain strings, so they drop into any SSR pipeline (a `@basenative/server` template, an Express/Node response body, a Cloudflare Worker `Response`) without adapters. Because rendering never touches the DOM, the same output is safe to generate on the server and diff/hydrate on the client using ordinary string comparison.

## License

Apache-2.0
