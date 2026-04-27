import { test } from 'node:test';
import assert from 'node:assert';
import { parse } from './parser.js';

test('parse headings', () => {
  const ast = parse('# H1\n## H2\n### H3');
  assert.equal(ast[0].type, 'heading');
  assert.equal(ast[0].level, 1);
  assert.equal(ast[1].type, 'heading');
  assert.equal(ast[1].level, 2);
});

test('parse paragraph', () => {
  const ast = parse('Hello world');
  assert.equal(ast[0].type, 'paragraph');
  assert.equal(ast[0].children[0].type, 'text');
  assert.equal(ast[0].children[0].value, 'Hello world');
});

test('parse bold text', () => {
  const ast = parse('**bold text**');
  assert.equal(ast[0].type, 'paragraph');
  assert.equal(ast[0].children[0].type, 'bold');
});

test('parse italic text', () => {
  const ast = parse('*italic text*');
  assert.equal(ast[0].type, 'paragraph');
  assert.equal(ast[0].children[0].type, 'italic');
});

test('parse inline code', () => {
  const ast = parse('`const x = 1`');
  assert.equal(ast[0].type, 'paragraph');
  assert.equal(ast[0].children[0].type, 'code');
  assert.equal(ast[0].children[0].value, 'const x = 1');
});

test('parse link', () => {
  const ast = parse('[click here](https://example.com)');
  assert.equal(ast[0].type, 'paragraph');
  assert.equal(ast[0].children[0].type, 'link');
  assert.equal(ast[0].children[0].href, 'https://example.com');
});

test('parse image', () => {
  const ast = parse('![alt text](https://example.com/image.jpg)');
  assert.equal(ast[0].type, 'paragraph');
  assert.equal(ast[0].children[0].type, 'image');
  assert.equal(ast[0].children[0].alt, 'alt text');
  assert.equal(ast[0].children[0].src, 'https://example.com/image.jpg');
});

test('parse unordered list', () => {
  const ast = parse('- Item 1\n- Item 2\n- Item 3');
  assert.equal(ast[0].type, 'list');
  assert.equal(ast[0].ordered, false);
  assert.equal(ast[0].children.length, 3);
});

test('parse ordered list', () => {
  const ast = parse('1. First\n2. Second\n3. Third');
  assert.equal(ast[0].type, 'list');
  assert.equal(ast[0].ordered, true);
  assert.equal(ast[0].children.length, 3);
});

test('parse code block', () => {
  const ast = parse('```js\nconst x = 1\nconsole.log(x)\n```');
  assert.equal(ast[0].type, 'code-block');
  assert.equal(ast[0].language, 'js');
  assert(ast[0].value.includes('const x = 1'));
});

test('parse blockquote', () => {
  const ast = parse('> This is a quote');
  assert.equal(ast[0].type, 'blockquote');
});

test('parse horizontal rule', () => {
  const ast = parse('---');
  assert.equal(ast[0].type, 'horizontal-rule');
});

test('handle empty input', () => {
  const ast = parse('');
  assert.equal(ast.length, 0);
});

test('handle whitespace only', () => {
  const ast = parse('   \n\n   ');
  assert.equal(ast.length, 0);
});

test('parse table', () => {
  const md = '| Name | Age |\n| --- | --- |\n| Alice | 30 |\n| Bob | 25 |';
  const ast = parse(md);
  assert.equal(ast[0].type, 'table');
  assert.equal(ast[0].children.length, 3);
  assert.equal(ast[0].children[0].type, 'table-row');
  assert.equal(ast[0].children[0].children[0].header, true);
  assert.equal(ast[0].children[0].children[0].children[0].value, 'Name');
  assert.equal(ast[0].children[1].children[0].header, false);
  assert.equal(ast[0].children[1].children[0].children[0].value, 'Alice');
});

test('parse table alignments', () => {
  const md = '| L | C | R |\n| :--- | :---: | ---: |\n| a | b | c |';
  const ast = parse(md);
  const headerCells = ast[0].children[0].children;
  assert.equal(headerCells[0].align, 'left');
  assert.equal(headerCells[1].align, 'center');
  assert.equal(headerCells[2].align, 'right');
  const bodyCells = ast[0].children[1].children;
  assert.equal(bodyCells[0].align, 'left');
  assert.equal(bodyCells[1].align, 'center');
  assert.equal(bodyCells[2].align, 'right');
});

test('parse table without leading/trailing pipes', () => {
  const md = 'Name | Age\n--- | ---\nAlice | 30';
  const ast = parse(md);
  assert.equal(ast[0].type, 'table');
  assert.equal(ast[0].children[0].children.length, 2);
});

test('parse table with inline formatting in cells', () => {
  const md = '| A | B |\n| --- | --- |\n| **bold** | `code` |';
  const ast = parse(md);
  const firstBodyCell = ast[0].children[1].children[0];
  assert.equal(firstBodyCell.children[0].type, 'bold');
  const secondBodyCell = ast[0].children[1].children[1];
  assert.equal(secondBodyCell.children[0].type, 'code');
});

test('table-like paragraph without separator stays a paragraph', () => {
  const ast = parse('Name | Age');
  assert.equal(ast[0].type, 'paragraph');
});

test('parse mixed content', () => {
  const markdown = `# Title

This is a paragraph with **bold** and *italic*.

- List item 1
- List item 2

\`\`\`js
console.log('hello');
\`\`\`

> A quote`;
  const ast = parse(markdown);
  assert(ast.length > 0);
  assert.equal(ast[0].type, 'heading');
});

test('parse strikethrough', () => {
  const ast = parse('~~deleted~~');
  assert.equal(ast[0].children[0].type, 'strikethrough');
});

test('parse bold+italic', () => {
  const ast = parse('***both***');
  assert.equal(ast[0].children[0].type, 'bold-italic');
});

test('parse setext h1', () => {
  const ast = parse('Title\n=====');
  assert.equal(ast[0].type, 'heading');
  assert.equal(ast[0].level, 1);
});

test('parse setext h2', () => {
  const ast = parse('Subhead\n-------');
  assert.equal(ast[0].type, 'heading');
  assert.equal(ast[0].level, 2);
});

test('parse task list (unchecked)', () => {
  const ast = parse('- [ ] todo');
  assert.equal(ast[0].type, 'list');
  assert.equal(ast[0].children[0].checked, false);
});

test('parse task list (checked)', () => {
  const ast = parse('- [x] done');
  assert.equal(ast[0].children[0].checked, true);
});

test('parse task list (uppercase X)', () => {
  const ast = parse('- [X] done');
  assert.equal(ast[0].children[0].checked, true);
});

test('parse mixed task list', () => {
  const ast = parse('- [ ] one\n- [x] two\n- plain');
  assert.equal(ast[0].children[0].checked, false);
  assert.equal(ast[0].children[1].checked, true);
  assert.equal(ast[0].children[2].checked, undefined);
});

test('parse nested unordered list', () => {
  const md = '- outer\n  - inner one\n  - inner two\n- outer two';
  const ast = parse(md);
  assert.equal(ast[0].type, 'list');
  assert.equal(ast[0].children.length, 2);
  const nested = ast[0].children[0].children.find((c) => c.type === 'list');
  assert.ok(nested, 'nested list present');
  assert.equal(nested.children.length, 2);
});

test('parse nested mixed list', () => {
  const md = '- bullet\n  1. ordered nested\n  2. ordered two';
  const ast = parse(md);
  const nested = ast[0].children[0].children.find((c) => c.type === 'list');
  assert.ok(nested);
  assert.equal(nested.ordered, true);
});

test('parse hard line break (two spaces)', () => {
  const ast = parse('line one  \nline two');
  const children = ast[0].children;
  assert.ok(children.some((c) => c.type === 'line-break'));
});

test('parse hard line break (backslash)', () => {
  const ast = parse('line one\\\nline two');
  const children = ast[0].children;
  assert.ok(children.some((c) => c.type === 'line-break'));
});

test('parse autolink (URL)', () => {
  const ast = parse('<https://example.com>');
  const link = ast[0].children[0];
  assert.equal(link.type, 'link');
  assert.equal(link.href, 'https://example.com');
  assert.equal(link.autolink, true);
});

test('parse autolink (email)', () => {
  const ast = parse('<warren@greenput.com>');
  const link = ast[0].children[0];
  assert.equal(link.type, 'link');
  assert.equal(link.href, 'mailto:warren@greenput.com');
});

test('parse link with title', () => {
  const ast = parse('[click](https://example.com "click here")');
  const link = ast[0].children[0];
  assert.equal(link.title, 'click here');
});

test('parse backslash escape', () => {
  const ast = parse('not \\*italic\\*');
  const text = ast[0].children.map((c) => c.value || '').join('');
  assert.ok(text.includes('*italic*'));
});

test('parse double-backtick code with single backtick inside', () => {
  const ast = parse('``a `b` c``');
  assert.equal(ast[0].children[0].type, 'code');
  assert.equal(ast[0].children[0].value, 'a `b` c');
});

test('parse fenced code with tilde', () => {
  const md = '~~~js\nconst x = 1\n~~~';
  const ast = parse(md);
  assert.equal(ast[0].type, 'code-block');
  assert.equal(ast[0].language, 'js');
});

test('does not loop on lone special chars', () => {
  const ast = parse('*');
  assert.equal(ast[0].type, 'paragraph');
  assert.equal(ast[0].children[0].value, '*');
});
