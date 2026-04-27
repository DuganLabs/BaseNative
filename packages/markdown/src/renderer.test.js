import { test } from 'node:test';
import assert from 'node:assert';
import { parse } from './parser.js';
import { render } from './renderer.js';

test('render heading with id', () => {
  const ast = parse('# Hello');
  const html = render(ast);
  assert(html.includes('id="hello"'));
  assert(html.includes('<h1'));
  assert(html.includes('Hello'));
});

test('render bold', () => {
  const ast = parse('**bold**');
  const html = render(ast);
  assert(html.includes('<strong>bold</strong>'));
});

test('render italic', () => {
  const ast = parse('*italic*');
  const html = render(ast);
  assert(html.includes('<em>italic</em>'));
});

test('XSS: escape HTML in text', () => {
  const ast = parse('Hello <script>alert("xss")</script>');
  const html = render(ast);
  assert(!html.includes('<script>'));
  assert(html.includes('&lt;script&gt;'));
});

test('XSS: block javascript: URLs', () => {
  const ast = parse('[click](javascript:alert(1))');
  const html = render(ast);
  assert(!html.includes('javascript:'));
  assert(html.includes('href=""'));
});

test('XSS: block data: URLs', () => {
  const ast = parse('[click](data:text/html,<script>alert(1)</script>)');
  const html = render(ast);
  assert(!html.includes('data:'));
  assert(html.includes('href=""'));
});

test('XSS: escape alt text', () => {
  const ast = parse('![<script>](image.jpg)');
  const html = render(ast);
  assert(!html.includes('<script>'));
  assert(html.includes('alt="&lt;script&gt;"'));
});

test('render list', () => {
  const ast = parse('- item 1\n- item 2');
  const html = render(ast);
  assert(html.includes('<ul>'));
  assert(html.includes('<li>item 1</li>'));
});

test('render code block', () => {
  const ast = parse('```js\nconst x = 1\n```');
  const html = render(ast);
  assert(html.includes('<pre>'));
  assert(html.includes('const x = 1'));
});

test('render blockquote', () => {
  const ast = parse('> quote');
  const html = render(ast);
  assert(html.includes('<blockquote>'));
});

test('render table', () => {
  const ast = parse('| H1 | H2 |\n| --- | --- |\n| a | b |');
  const html = render(ast);
  assert(html.includes('<table>'));
  assert(html.includes('<thead><tr><th>H1</th><th>H2</th></tr></thead>'));
  assert(html.includes('<tbody><tr><td>a</td><td>b</td></tr></tbody>'));
});

test('render table alignment as inline style', () => {
  const ast = parse('| L | C | R |\n| :--- | :---: | ---: |\n| a | b | c |');
  const html = render(ast);
  assert(html.includes('style="text-align:left"'));
  assert(html.includes('style="text-align:center"'));
  assert(html.includes('style="text-align:right"'));
});

test('XSS: escape HTML in table cells', () => {
  const ast = parse('| Header |\n| --- |\n| <script>alert(1)</script> |');
  const html = render(ast);
  assert(!html.includes('<script>'));
  assert(html.includes('&lt;script&gt;'));
});

test('round-trip', () => {
  const markdown = '# Title\n\nParagraph with **bold** and *italic*.';
  const ast = parse(markdown);
  const html = render(ast);
  assert(html.includes('id="title"'));
  assert(html.includes('<strong>'));
  assert(html.includes('<em>'));
});
