import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parse, parseFrontmatter } from './index.js';

describe('parse', () => {
  describe('headings', () => {
    it('renders h1 through h6', () => {
      assert.ok(parse('# Hello').includes('<h1'));
      assert.ok(parse('## Hello').includes('<h2'));
      assert.ok(parse('### Hello').includes('<h3'));
      assert.ok(parse('#### Hello').includes('<h4'));
      assert.ok(parse('##### Hello').includes('<h5'));
      assert.ok(parse('###### Hello').includes('<h6'));
    });

    it('generates slug ids', () => {
      assert.ok(parse('# Hello World').includes('id="hello-world"'));
    });

    it('strips trailing hashes', () => {
      const html = parse('## Title ##');
      assert.ok(html.includes('Title'));
      assert.ok(!html.includes('##'));
    });
  });

  describe('paragraphs', () => {
    it('wraps plain text in <p>', () => {
      assert.equal(parse('Hello world'), '<p>Hello world</p>');
    });

    it('joins contiguous lines', () => {
      const html = parse('Line one\nLine two');
      assert.ok(html.includes('Line one'));
      assert.ok(html.includes('Line two'));
      assert.ok(html.startsWith('<p>'));
    });
  });

  describe('inline formatting', () => {
    it('renders bold with **', () => {
      assert.ok(parse('**bold**').includes('<strong>bold</strong>'));
    });

    it('renders bold with __', () => {
      assert.ok(parse('__bold__').includes('<strong>bold</strong>'));
    });

    it('renders italic with *', () => {
      assert.ok(parse('*italic*').includes('<em>italic</em>'));
    });

    it('renders italic with _', () => {
      assert.ok(parse('_italic_').includes('<em>italic</em>'));
    });

    it('renders bold+italic with ***', () => {
      const html = parse('***both***');
      assert.ok(html.includes('<strong><em>both</em></strong>'));
    });

    it('renders inline code', () => {
      assert.ok(parse('use `signal()`').includes('<code>signal()</code>'));
    });

    it('renders strikethrough', () => {
      assert.ok(parse('~~deleted~~').includes('<del>deleted</del>'));
    });
  });

  describe('links and images', () => {
    it('renders a link', () => {
      const html = parse('[Click](https://example.com)');
      assert.ok(html.includes('<a href="https://example.com">Click</a>'));
    });

    it('renders an image', () => {
      const html = parse('![Alt text](/img.png)');
      assert.ok(html.includes('<img src="/img.png" alt="Alt text">'));
    });
  });

  describe('code blocks', () => {
    it('renders fenced code blocks', () => {
      const md = '```js\nconst x = 1;\n```';
      const html = parse(md);
      assert.ok(html.includes('<pre><code class="language-js">'));
      assert.ok(html.includes('const x = 1;'));
    });

    it('renders code blocks without language', () => {
      const md = '```\nhello\n```';
      const html = parse(md);
      assert.ok(html.includes('<pre><code>'));
    });

    it('escapes HTML in code blocks', () => {
      const md = '```\n<script>alert(1)</script>\n```';
      const html = parse(md);
      assert.ok(html.includes('&lt;script&gt;'));
    });
  });

  describe('blockquotes', () => {
    it('renders blockquotes', () => {
      const html = parse('> Important note');
      assert.ok(html.includes('<blockquote>'));
      assert.ok(html.includes('Important note'));
    });
  });

  describe('lists', () => {
    it('renders unordered lists', () => {
      const md = '- Item one\n- Item two\n- Item three';
      const html = parse(md);
      assert.ok(html.includes('<ul>'));
      assert.ok(html.includes('<li>Item one</li>'));
      assert.ok(html.includes('<li>Item three</li>'));
    });

    it('renders ordered lists', () => {
      const md = '1. First\n2. Second';
      const html = parse(md);
      assert.ok(html.includes('<ol>'));
      assert.ok(html.includes('<li>First</li>'));
    });

    it('renders inline formatting in list items', () => {
      const html = parse('- **bold** item');
      assert.ok(html.includes('<strong>bold</strong>'));
    });
  });

  describe('horizontal rules', () => {
    it('renders --- as <hr>', () => {
      assert.ok(parse('---').includes('<hr>'));
    });

    it('renders *** as <hr>', () => {
      assert.ok(parse('***').includes('<hr>'));
    });

    it('renders ___ as <hr>', () => {
      assert.ok(parse('___').includes('<hr>'));
    });
  });

  describe('HTML escaping', () => {
    it('escapes angle brackets in text', () => {
      const html = parse('Use <div> for layout');
      assert.ok(html.includes('&lt;div&gt;'));
    });

    it('escapes ampersands', () => {
      const html = parse('Tom & Jerry');
      assert.ok(html.includes('&amp;'));
    });
  });

  describe('mixed content', () => {
    it('handles a full document', () => {
      const md = [
        '# Title',
        '',
        'A paragraph with **bold** and *italic*.',
        '',
        '## Section',
        '',
        '- List item',
        '',
        '```js',
        'console.log("hi");',
        '```',
        '',
        '> A quote',
        '',
        '---',
      ].join('\n');

      const html = parse(md);
      assert.ok(html.includes('<h1'));
      assert.ok(html.includes('<h2'));
      assert.ok(html.includes('<strong>bold</strong>'));
      assert.ok(html.includes('<em>italic</em>'));
      assert.ok(html.includes('<ul>'));
      assert.ok(html.includes('<pre><code'));
      assert.ok(html.includes('<blockquote>'));
      assert.ok(html.includes('<hr>'));
    });
  });
});

describe('parseFrontmatter', () => {
  it('extracts key-value pairs', () => {
    const input = '---\ntitle: Hello World\nauthor: Warren\n---\n\n# Content';
    const { meta, content } = parseFrontmatter(input);
    assert.equal(meta.title, 'Hello World');
    assert.equal(meta.author, 'Warren');
    assert.ok(content.includes('# Content'));
  });

  it('strips quotes from values', () => {
    const input = '---\ntitle: "Quoted"\n---\nBody';
    const { meta } = parseFrontmatter(input);
    assert.equal(meta.title, 'Quoted');
  });

  it('returns empty meta when no frontmatter', () => {
    const { meta, content } = parseFrontmatter('Just text');
    assert.deepEqual(meta, {});
    assert.equal(content, 'Just text');
  });

  it('handles missing closing delimiter', () => {
    const { meta } = parseFrontmatter('---\ntitle: Broken');
    assert.deepEqual(meta, {});
  });
});
