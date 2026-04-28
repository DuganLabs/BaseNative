# @basenative/markdown

Zero-dependency ES module markdown parser and SSR-safe HTML renderer for BaseNative.

## Features

- **Zero dependencies** — No external packages required
- **Pure ES modules** — Works in Node.js 22+ and modern browsers
- **SSR-safe** — No DOM access, generates plain HTML strings
- **Security-focused** — XSS prevention, URL sanitization, HTML entity escaping
- **AST-first** — Parse to AST and render separately, or use the convenience `parse()` for HTML

## Supported Markdown

- ATX headings (`#`–`######`) and Setext headings (`===`, `---` underlines)
- Paragraphs
- Bold (`**text**`, `__text__`)
- Italic (`*text*`, `_text_`)
- Bold+italic (`***text***`, `___text___`)
- Strikethrough (`~~text~~`)
- Inline code (`` `text` ``) and double-backtick code with embedded backticks
- Links (`[text](url)`) and titled links (`[text](url "title")`)
- Images (`![alt](url)`)
- Autolinks (`<https://example.com>`, `<user@example.com>`)
- Unordered lists (`-`, `*`, `+`) and ordered lists (`1.`, `2.`, ...)
- Nested lists (indent by two spaces)
- Task lists (`- [ ] todo`, `- [x] done`) — GFM
- Code blocks — fenced with `` ``` `` or `~~~`, with optional language tag
- Blockquotes (`>`) with lazy continuation
- Horizontal rules (`---`, `___`, `***`)
- Tables — GFM-style, with column alignment (`:---`, `:---:`, `---:`)
- Hard line breaks (two trailing spaces or trailing `\`)
- Backslash escapes for punctuation
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

## Task lists

```md
- [x] Write the parser
- [x] Write the renderer
- [ ] Ship it
```

Renders as a `<ul class="task-list">` with `<input type="checkbox" disabled>` (or `checked disabled`) inside each `<li class="task-list-item">`.

## Limitations

- No reference-style links (`[text][id]` + `[id]: url`)
- No HTML passthrough — raw HTML is escaped
- No LaTeX/math support
- No custom syntax extensions

## License

Apache-2.0
