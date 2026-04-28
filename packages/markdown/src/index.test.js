import { test } from 'node:test';
import assert from 'node:assert';
import { parse, parseAST, render, parseFrontmatter } from './index.js';

test('parse() returns HTML', () => {
  const html = parse('# Hello\n\nWorld');
  assert.ok(html.includes('<h1'));
  assert.ok(html.includes('<p>World</p>'));
});

test('parseAST() + render() round-trips', () => {
  const ast = parseAST('**bold**');
  const html = render(ast);
  assert.ok(html.includes('<strong>bold</strong>'));
});

test('parseFrontmatter extracts key/value pairs', () => {
  const input = '---\ntitle: Hello\nauthor: Warren\n---\n\n# Body';
  const { meta, content } = parseFrontmatter(input);
  assert.equal(meta.title, 'Hello');
  assert.equal(meta.author, 'Warren');
  assert.ok(content.startsWith('# Body'));
});

test('parseFrontmatter strips quotes', () => {
  const input = '---\ntitle: "Quoted"\n---\nbody';
  const { meta } = parseFrontmatter(input);
  assert.equal(meta.title, 'Quoted');
});

test('parseFrontmatter strips single quotes', () => {
  const input = "---\ntitle: 'Quoted'\n---\nbody";
  const { meta } = parseFrontmatter(input);
  assert.equal(meta.title, 'Quoted');
});

test('parseFrontmatter returns empty meta when no fence', () => {
  const { meta, content } = parseFrontmatter('# Just a doc');
  assert.deepEqual(meta, {});
  assert.equal(content, '# Just a doc');
});

test('parseFrontmatter handles missing closing fence', () => {
  const { meta, content } = parseFrontmatter('---\ntitle: Open\nbody');
  assert.deepEqual(meta, {});
  assert.ok(content.startsWith('---'));
});

test('parseFrontmatter handles empty input', () => {
  const { meta, content } = parseFrontmatter('');
  assert.deepEqual(meta, {});
  assert.equal(content, '');
});

test('full pipeline: frontmatter + parse', () => {
  const input = '---\ntitle: Post\n---\n\n# Welcome\n\nA paragraph.';
  const { meta, content } = parseFrontmatter(input);
  const html = parse(content);
  assert.equal(meta.title, 'Post');
  assert.ok(html.includes('<h1'));
  assert.ok(html.includes('Welcome'));
});
