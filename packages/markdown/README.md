# @basenative/markdown

Zero-dependency ES module markdown parser and SSR-safe HTML renderer for BaseNative.

## Features

- **Zero dependencies** — No external packages required
- **Pure ES modules** — Works in Node.js 22+ and modern browsers
- **SSR-safe** — No DOM access, generates plain HTML strings
- **Security-focused** — XSS prevention, URL sanitization, HTML entity escaping
- **AST-first** — Parse to AST and render separately, or use the convenience `parse()` for HTML

## Supported Markdown

- ATX headings (`#`–`######`)
- Paragraphs
- Bold (`**text**`, `__text__`)
- Italic (`*text*`, `_text_`)
- Bold+italic (`***text***`, `___text___`)
- Strikethrough (`~~text~~`)
- Inline code (`` `text` ``)
- Links (`[text](url)`)
- Images (`![alt](url)`)
- Unordered lists (`-`, `*`, `+`)
- Ordered lists (`1.`, `2.`, ...)
- Code blocks (` ```lang `)
- Blockquotes (`>`)
- Horizontal rules (`---`, `___`, `***`)
- Tables (GFM-style, with column alignment)
- YAML-style frontmatter (`---` ... `---`)

## Usage

```js
import { parse, parseAST, render, parseFrontmatter } from '@basenative/markdown';

// One-shot: markdown → HTML
const html = parse('# Hello\n\nThis is **bold**.');

// Two-step: markdown → AST → HTML (lets you transform the AST)
const ast = parseAST('# Hello');
const html2 = render(ast);

// Frontmatter
const { meta, content } = parseFrontmatter(`---
title: Post
---

# Body`);
```

The renderer is also available as a separate subpath import:

```js
import { render } from '@basenative/markdown/renderer';
```

## Tables

```md
| Name  | Role     | Score |
| :---  | :------: | ----: |
| Alice | designer |    42 |
| Bob   | engineer |   100 |
```

Column alignment is taken from the separator row (`:---` left, `:---:` center, `---:` right) and emitted as `style="text-align:..."` on each cell.

## Security

The renderer includes built-in protections against XSS attacks:

- HTML entities are escaped in all text nodes (including table cells)
- `javascript:`, `data:`, and `vbscript:` URLs are blocked
- Image alt text and code language classes are escaped
- All attributes are safely quoted

## Limitations

- Single-level lists (nested lists not supported)
- No GitHub Flavored Markdown beyond tables and strikethrough
- No LaTeX/math support
- No custom syntax extensions

## License

Apache-2.0
