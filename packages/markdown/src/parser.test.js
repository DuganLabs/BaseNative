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
