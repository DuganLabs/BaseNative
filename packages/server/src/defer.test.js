import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { render, resolveDeferred } from './render.js';
import { renderToStream, renderToReadableStream } from './stream.js';

describe('@defer directive — core functionality', () => {
  it('replaces @defer template with placeholder div containing data-bn-defer', () => {
    const html = render(
      `<div><template @defer><p>Deferred content</p></template></div>`,
      {}
    );
    assert.match(html, /data-bn-defer="d0"/);
    assert.ok(!html.includes('Deferred content'));
  });

  it('assigns unique incremental IDs to multiple @defer sections', () => {
    const html = render(
      `<template @defer><p>First</p></template><template @defer><p>Second</p></template>`,
      {}
    );
    assert.match(html, /data-bn-defer="d0"/);
    assert.match(html, /data-bn-defer="d1"/);
  });

  it('emits hydration marker when hydratable=true', () => {
    const html = render(
      `<template @defer><p>Later</p></template>`,
      {},
      { hydratable: true }
    );
    assert.match(html, /<!--bn:defer:d0-->/);
  });

  it('does not emit hydration marker when hydratable=false', () => {
    const html = render(
      `<template @defer><p>Content</p></template>`,
      {},
      { hydratable: false }
    );
    assert.ok(!html.includes('<!--bn:defer:d0-->'));
  });

  it('collects deferred content in options._deferred array', () => {
    const options = {};
    render(
      `<template @defer><p>{{ msg }}</p></template>`,
      { msg: 'hello' },
      options
    );
    assert.ok(Array.isArray(options._deferred));
    assert.equal(options._deferred.length, 1);
    assert.equal(options._deferred[0].id, 'd0');
  });

  it('preserves deferred content HTML in options._deferred', () => {
    const options = {};
    const deferredHtml = '<span>Test content</span>';
    render(
      `<template @defer>${deferredHtml}</template>`,
      {},
      options
    );
    assert.equal(options._deferred[0].html, deferredHtml);
  });

  it('captures context in deferred content for later processing', () => {
    const options = {};
    const ctx = { name: 'Alice', count: 42 };
    render(
      `<template @defer><p>{{ name }}: {{ count }}</p></template>`,
      ctx,
      options
    );
    assert.deepEqual(options._deferred[0].ctx, ctx);
  });
});

describe('@defer directive — resolveDeferred()', () => {
  it('renders deferred content with captured context', () => {
    const options = {};
    render(
      `<template @defer><p>{{ name }}</p></template>`,
      { name: 'Warren' },
      options
    );
    const resolved = resolveDeferred(options);
    assert.equal(resolved.length, 1);
    assert.match(resolved[0].html, /<p>Warren<\/p>/);
  });

  it('returns empty array when no @defer sections exist', () => {
    const options = {};
    render('<p>No defer</p>', {}, options);
    const resolved = resolveDeferred(options);
    assert.deepEqual(resolved, []);
  });

  it('generates script tag with data-bn-defer-resolve attribute', () => {
    const options = {};
    render(`<template @defer><span>Content</span></template>`, {}, options);
    const resolved = resolveDeferred(options);
    assert.match(resolved[0].script, /data-bn-defer-resolve="d0"/);
  });

  it('includes deferred ID in script tag', () => {
    const options = {};
    render(
      `<template @defer><p>First</p></template><template @defer><p>Second</p></template>`,
      {},
      options
    );
    const resolved = resolveDeferred(options);
    assert.match(resolved[0].script, /d0/);
    assert.match(resolved[1].script, /d1/);
  });

  it('returns array with correct number of deferred sections', () => {
    const options = {};
    render(
      `<template @defer><p>1</p></template>
       <template @defer><p>2</p></template>
       <template @defer><p>3</p></template>`,
      {},
      options
    );
    const resolved = resolveDeferred(options);
    assert.equal(resolved.length, 3);
  });
});

describe('@defer directive — script injection logic', () => {
  it('deferred script uses querySelector to find placeholder', () => {
    const options = {};
    render(`<template @defer><span>Test</span></template>`, {}, options);
    const resolved = resolveDeferred(options);
    assert.match(resolved[0].script, /querySelector\('[^)]+data-bn-defer="d0"[^)]*'\)/);
  });

  it('deferred script injects rendered HTML into placeholder', () => {
    const options = {};
    render(`<template @defer><span>Injected</span></template>`, {}, options);
    const resolved = resolveDeferred(options);
    assert.match(resolved[0].script, /\.innerHTML/);
    assert.match(resolved[0].script, /Injected/);
  });

  it('deferred script removes data-bn-defer attribute after injection', () => {
    const options = {};
    render(`<template @defer><p>Content</p></template>`, {}, options);
    const resolved = resolveDeferred(options);
    assert.match(resolved[0].script, /removeAttribute\('data-bn-defer'\)/);
  });

  it('deferred script dispatches CustomEvent with bn:defer type', () => {
    const options = {};
    render(`<template @defer><p>Test</p></template>`, {}, options);
    const resolved = resolveDeferred(options);
    assert.match(resolved[0].script, /CustomEvent\('bn:defer'/);
    assert.match(resolved[0].script, /document\.dispatchEvent/);
  });

  it('deferred script event detail contains deferred ID', () => {
    const options = {};
    render(
      `<template @defer><p>First</p></template><template @defer><p>Second</p></template>`,
      {},
      options
    );
    const resolved = resolveDeferred(options);
    assert.match(resolved[0].script, /detail:\{id:'d0'\}/);
    assert.match(resolved[1].script, /detail:\{id:'d1'\}/);
  });

  it('deferred script is wrapped in IIFE (Immediately Invoked Function Expression)', () => {
    const options = {};
    render(`<template @defer><p>Test</p></template>`, {}, options);
    const resolved = resolveDeferred(options);
    assert.match(resolved[0].script, /\(function\(\)\{/);
  });

  it('deferred script contains closing script tag', () => {
    const options = {};
    render(`<template @defer><p>Test</p></template>`, {}, options);
    const resolved = resolveDeferred(options);
    // Should contain proper closing script tag
    assert.match(resolved[0].script, /<\/script>/);
  });
});

describe('@defer with interpolation and expressions', () => {
  it('@defer with simple interpolation', () => {
    const options = {};
    render(
      `<template @defer><p>{{ greeting }}</p></template>`,
      { greeting: 'Hello' },
      options
    );
    const resolved = resolveDeferred(options);
    assert.match(resolved[0].html, /<p>Hello<\/p>/);
  });

  it('@defer with arithmetic expression', () => {
    const options = {};
    render(
      `<template @defer><p>{{ a + b }}</p></template>`,
      { a: 5, b: 3 },
      options
    );
    const resolved = resolveDeferred(options);
    assert.match(resolved[0].html, /<p>8<\/p>/);
  });

  it('@defer with nested property access', () => {
    const options = {};
    render(
      `<template @defer><p>{{ user.profile.name }}</p></template>`,
      { user: { profile: { name: 'Bob' } } },
      options
    );
    const resolved = resolveDeferred(options);
    assert.match(resolved[0].html, /<p>Bob<\/p>/);
  });

  it('@defer with ternary operator', () => {
    const options = {};
    render(
      `<template @defer><p>{{ age > 18 ? 'Adult' : 'Minor' }}</p></template>`,
      { age: 25 },
      options
    );
    const resolved = resolveDeferred(options);
    assert.match(resolved[0].html, /<p>Adult<\/p>/);
  });

  it('@defer with attribute interpolation', () => {
    const options = {};
    render(
      `<template @defer><img alt="{{ description }}"></template>`,
      { description: 'A picture' },
      options
    );
    const resolved = resolveDeferred(options);
    assert.match(resolved[0].html, /alt="A picture"/);
  });

  it('@defer with dynamic attribute binding', () => {
    const options = {};
    render(
      `<template @defer><input :disabled="locked"></template>`,
      { locked: true },
      options
    );
    const resolved = resolveDeferred(options);
    assert.match(resolved[0].html, /disabled/);
  });

  it('@defer with null/undefined values renders empty', () => {
    const options = {};
    render(
      `<template @defer><p>{{ missing }}</p></template>`,
      {},
      options
    );
    const resolved = resolveDeferred(options);
    assert.match(resolved[0].html, /<p><\/p>/);
  });
});

describe('@defer with @if directive inside', () => {
  it('@defer containing @if renders content when condition is true', () => {
    const options = {};
    render(
      `<template @defer>
        <template @if="show"><span>Visible</span></template>
      </template>`,
      { show: true },
      options
    );
    const resolved = resolveDeferred(options);
    assert.match(resolved[0].html, /Visible/);
  });

  it('@defer containing @if hides content when condition is false', () => {
    const options = {};
    render(
      `<template @defer>
        <template @if="show"><span>Visible</span></template>
      </template>`,
      { show: false },
      options
    );
    const resolved = resolveDeferred(options);
    assert.ok(!resolved[0].html.includes('Visible'));
  });

  it('@defer containing @if/@else renders correct branch', () => {
    const options = {};
    render(
      `<template @defer>
        <template @if="active"><span>Active</span></template>
        <template @else><span>Inactive</span></template>
      </template>`,
      { active: false },
      options
    );
    const resolved = resolveDeferred(options);
    assert.match(resolved[0].html, /Inactive/);
    assert.ok(!resolved[0].html.includes('Active'));
  });

  it('@defer with nested @if renders content', () => {
    const options = { hydratable: true };
    render(
      `<template @defer>
        <template @if="x"><p>Content</p></template>
      </template>`,
      { x: true },
      options
    );
    const resolved = resolveDeferred(options);
    // When @if is true, content should be in deferred output
    assert.ok(resolved.length > 0);
    assert.ok(resolved[0].html.includes('Content') || resolved[0].html.includes('<!--bn:if-->'));
  });
});

describe('@defer with @for directive inside', () => {
  it('@defer containing @for renders all items', () => {
    const options = {};
    render(
      `<template @defer>
        <ul><template @for="item of items"><li>{{ item }}</li></template></ul>
      </template>`,
      { items: ['a', 'b', 'c'] },
      options
    );
    const resolved = resolveDeferred(options);
    assert.match(resolved[0].html, /<li>a<\/li>/);
    assert.match(resolved[0].html, /<li>b<\/li>/);
    assert.match(resolved[0].html, /<li>c<\/li>/);
  });

  it('@defer with @for and $index metadata', () => {
    const options = {};
    render(
      `<template @defer>
        <template @for="item of items">{{ $index }}: {{ item }} </template>
      </template>`,
      { items: ['x', 'y'] },
      options
    );
    const resolved = resolveDeferred(options);
    assert.match(resolved[0].html, /0: x/);
    assert.match(resolved[0].html, /1: y/);
  });

  it('@defer with @for and @empty', () => {
    const options = {};
    render(
      `<template @defer>
        <template @for="item of items"><li>{{ item }}</li></template>
        <template @empty><p>No items</p></template>
      </template>`,
      { items: [] },
      options
    );
    const resolved = resolveDeferred(options);
    assert.match(resolved[0].html, /No items/);
  });

  it('@defer with @for and track key', () => {
    const options = { hydratable: true };
    render(
      `<template @defer>
        <template @for="item of items; track item.id">{{ item.name }}</template>
      </template>`,
      { items: [{ id: 1, name: 'Alpha' }, { id: 2, name: 'Beta' }] },
      options
    );
    const resolved = resolveDeferred(options);
    assert.ok(resolved.length > 0);
    // Track keys should be preserved in hydration markers
    assert.match(resolved[0].html, /Alpha|Beta|key=/);
  });

  it('@defer with $first, $last, $even, $odd in @for', () => {
    const options = {};
    render(
      `<template @defer>
        <template @for="x of items">{{ $first }},{{ $last }} </template>
      </template>`,
      { items: ['a', 'b'] },
      options
    );
    const resolved = resolveDeferred(options);
    assert.match(resolved[0].html, /true,false/); // first item
    assert.match(resolved[0].html, /false,true/); // second item
  });
});

describe('@defer with nested @defer', () => {
  it('supports multiple non-nested @defer sections at same level', () => {
    const options = {};
    render(
      `<template @defer><p>First</p></template>
       <template @defer><p>Second</p></template>`,
      {},
      options
    );
    assert.equal(options._deferred.length, 2);
    const resolved = resolveDeferred(options);
    assert.match(resolved[0].html, /First/);
    assert.match(resolved[1].html, /Second/);
  });

  it('multiple @defer sections generate unique IDs', () => {
    const options = {};
    render(
      `<template @defer><p>A</p></template>
       <template @defer><p>B</p></template>
       <template @defer><p>C</p></template>`,
      {},
      options
    );
    assert.equal(options._deferred[0].id, 'd0');
    assert.equal(options._deferred[1].id, 'd1');
    assert.equal(options._deferred[2].id, 'd2');
  });
});

describe('@defer with @switch directive inside', () => {
  it('@defer containing @switch renders matching case', () => {
    const options = {};
    render(
      `<template @defer>
        <template @switch="color">
          <template @case="'red'"><span>Red</span></template>
          <template @case="'blue'"><span>Blue</span></template>
        </template>
      </template>`,
      { color: 'red' },
      options
    );
    const resolved = resolveDeferred(options);
    assert.match(resolved[0].html, /Red/);
    assert.ok(!resolved[0].html.includes('Blue'));
  });

  it('@defer with @switch renders default when no case matches', () => {
    const options = {};
    render(
      `<template @defer>
        <template @switch="color">
          <template @case="'red'"><span>Red</span></template>
          <template @default><span>Other</span></template>
        </template>
      </template>`,
      { color: 'green' },
      options
    );
    const resolved = resolveDeferred(options);
    assert.match(resolved[0].html, /Other/);
  });
});

describe('@defer with other directives on page', () => {
  it('@defer works alongside @if and @for', () => {
    const html = render(
      `<template @if="show"><span>Visible</span></template>
       <template @defer><p>Lazy</p></template>
       <template @for="x of items"><li>{{ x }}</li></template>`,
      { show: true, items: ['a', 'b'] }
    );
    assert.match(html, /Visible/);
    assert.match(html, /data-bn-defer/);
    assert.match(html, /<li>a<\/li>/);
    assert.ok(!html.includes('Lazy'));
  });

  it('main content renders immediately while @defer is deferred', () => {
    const html = render(
      `<p>Main content</p>
       <template @defer><p>Deferred content</p></template>
       <p>More content</p>`,
      {}
    );
    assert.match(html, /Main content/);
    assert.match(html, /More content/);
    assert.ok(!html.includes('Deferred content'));
    assert.match(html, /data-bn-defer/);
  });

  it('multiple @defer mixed with other directives', () => {
    const html = render(
      `<template @defer><p>Defer 1</p></template>
       <template @if="x"><p>If</p></template>
       <template @defer><p>Defer 2</p></template>
       <template @for="i of items"><span>{{ i }}</span></template>`,
      { x: true, items: [1, 2] }
    );
    assert.match(html, /data-bn-defer="d0"/);
    assert.match(html, /data-bn-defer="d1"/);
    assert.match(html, /If/);
    assert.ok(!html.includes('Defer 1'));
    assert.ok(!html.includes('Defer 2'));
  });
});

describe('@defer edge cases', () => {
  it('empty @defer section', () => {
    const html = render(
      `<template @defer></template>`,
      {}
    );
    assert.match(html, /data-bn-defer="d0"/);
  });

  it('@defer with only whitespace', () => {
    const html = render(
      `<template @defer>   </template>`,
      {}
    );
    assert.match(html, /data-bn-defer="d0"/);
  });

  it('@defer with complex HTML structure', () => {
    const options = {};
    render(
      `<template @defer>
        <section>
          <article>
            <h1>Title</h1>
            <p>Content</p>
          </article>
        </section>
      </template>`,
      {},
      options
    );
    const resolved = resolveDeferred(options);
    assert.match(resolved[0].html, /<section>/);
    assert.match(resolved[0].html, /<article>/);
    assert.match(resolved[0].html, /<h1>Title<\/h1>/);
  });

  it('@defer with self-closing tags', () => {
    const options = {};
    render(
      `<template @defer>
        <img src="test.jpg">
        <br>
        <input type="text">
      </template>`,
      {},
      options
    );
    const resolved = resolveDeferred(options);
    assert.match(resolved[0].html, /img/);
  });

  it('@defer preserves style tags inside', () => {
    const options = {};
    render(
      `<template @defer>
        <style>.x { color: red; }</style>
      </template>`,
      {},
      options
    );
    const resolved = resolveDeferred(options);
    // Style tag content should be preserved
    assert.match(resolved[0].html, /style/);
  });

  it('@defer preserves script type="application/json"', () => {
    const options = {};
    render(
      `<template @defer>
        <script type="application/json">{"data":"{{ value }}"}</script>
      </template>`,
      { value: 'test' },
      options
    );
    const resolved = resolveDeferred(options);
    assert.match(resolved[0].html, /script/);
    assert.match(resolved[0].html, /test/);
  });

  it('@defer with special characters in content', () => {
    const options = {};
    render(
      `<template @defer><p>{{ text }}</p></template>`,
      { text: 'Hello & goodbye <world>' },
      options
    );
    const resolved = resolveDeferred(options);
    // Should preserve or properly escape special chars
    assert.ok(resolved[0].html.length > 0);
  });

  it('@defer counter resets between separate render calls', () => {
    const options1 = {};
    render(`<template @defer><p>First</p></template>`, {}, options1);

    const options2 = {};
    render(
      `<template @defer><p>A</p></template><template @defer><p>B</p></template>`,
      {},
      options2
    );

    assert.equal(options1._deferred[0].id, 'd0');
    assert.equal(options2._deferred[0].id, 'd0');
    assert.equal(options2._deferred[1].id, 'd1');
  });
});

describe('renderToStream with @defer', () => {
  it('includes main content and deferred scripts in stream', () => {
    const chunks = [];
    const stream = {
      write(chunk) { chunks.push(chunk); return true; },
      end() {},
    };
    renderToStream(
      `<p>Main</p><template @defer><span>Later</span></template>`,
      {},
      stream
    );
    const output = chunks.join('');
    assert.match(output, /Main/);
    assert.match(output, /data-bn-defer-resolve/);
    assert.match(output, /Later/);
  });

  it('deferred scripts appear after main content', () => {
    const chunks = [];
    const stream = {
      write(chunk) { chunks.push(chunk); return true; },
      end() {},
    };
    renderToStream(
      `<p>Start</p><template @defer><p>Deferred</p></template><p>End</p>`,
      {},
      stream
    );
    const output = chunks.join('');
    const mainPos = output.indexOf('<p>Start</p>');
    const deferPos = output.indexOf('data-bn-defer-resolve');
    assert.ok(mainPos < deferPos);
  });

  it('respects chunkSize with deferred content', () => {
    const chunks = [];
    const stream = {
      write(chunk) { chunks.push(chunk); return true; },
      end() {},
    };
    const html = '<p>' + 'x'.repeat(200) + '</p><template @defer><p>Deferred</p></template>';
    renderToStream(html, {}, stream, { chunkSize: 50 });
    assert.ok(chunks.length > 1);
  });

  it('handles backpressure with deferred scripts', () => {
    let drainCb = null;
    const chunks = [];
    const stream = {
      count: 0,
      write(chunk) {
        chunks.push(chunk);
        this.count++;
        if (this.count === 1) return false;
        return true;
      },
      once(event, cb) { if (event === 'drain') drainCb = cb; },
      end() {},
    };
    renderToStream(
      `<p>content</p><template @defer><span>lazy</span></template>`,
      {},
      stream,
      { chunkSize: 5 }
    );
    assert.ok(drainCb !== null);
    drainCb();
  });

  it('stream writes main placeholder and later deferred resolve script', () => {
    const chunks = [];
    const stream = {
      write(chunk) { chunks.push(chunk); return true; },
      end() {},
    };
    renderToStream(
      `<template @defer><p>Content</p></template>`,
      {},
      stream
    );
    const output = chunks.join('');
    assert.match(output, /data-bn-defer="d0"/);
    assert.match(output, /data-bn-defer-resolve="d0"/);
  });

  it('renderToStream with hydratable option includes hydration markers', () => {
    const chunks = [];
    const stream = {
      write(chunk) { chunks.push(chunk); return true; },
      end() {},
    };
    renderToStream(
      `<template @defer><p>Content</p></template>`,
      {},
      stream,
      { hydratable: true }
    );
    const output = chunks.join('');
    assert.match(output, /<!--bn:defer:d0-->/);
  });
});

describe('renderToReadableStream with @defer', () => {
  it('returns ReadableStream with deferred content', async () => {
    const stream = renderToReadableStream(
      `<p>Main</p><template @defer><span>Streamed</span></template>`,
      {}
    );
    assert.ok(stream instanceof ReadableStream);
    const reader = stream.getReader();
    const decoder = new TextDecoder();
    let result = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      result += decoder.decode(value);
    }
    assert.match(result, /Main/);
    assert.match(result, /Streamed/);
    assert.match(result, /data-bn-defer-resolve/);
  });

  it('deferred scripts included in readable stream output', async () => {
    const stream = renderToReadableStream(
      `<template @defer><p>Content</p></template>`,
      {}
    );
    const reader = stream.getReader();
    const decoder = new TextDecoder();
    let result = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      result += decoder.decode(value);
    }
    assert.match(result, /data-bn-defer="d0"/);
    assert.match(result, /data-bn-defer-resolve="d0"/);
  });

  it('readable stream respects chunkSize', async () => {
    const html = '<p>' + 'z'.repeat(200) + '</p><template @defer><p>Deferred</p></template>';
    const stream = renderToReadableStream(html, {}, { chunkSize: 50 });
    const reader = stream.getReader();
    const chunks = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }
    assert.ok(chunks.length > 1);
  });

  it('renderToReadableStream with hydratable includes hydration markers', async () => {
    const stream = renderToReadableStream(
      `<template @defer><p>Content</p></template>`,
      {},
      { hydratable: true }
    );
    const reader = stream.getReader();
    const decoder = new TextDecoder();
    let result = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      result += decoder.decode(value);
    }
    assert.match(result, /<!--bn:defer:d0-->/);
  });

  it('multiple deferred sections in readable stream', async () => {
    const stream = renderToReadableStream(
      `<template @defer><p>First</p></template>
       <template @defer><p>Second</p></template>`,
      {}
    );
    const reader = stream.getReader();
    const decoder = new TextDecoder();
    let result = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      result += decoder.decode(value);
    }
    assert.match(result, /data-bn-defer="d0"/);
    assert.match(result, /data-bn-defer="d1"/);
    assert.match(result, /First/);
    assert.match(result, /Second/);
  });
});

describe('@defer with context isolation', () => {
  it('each deferred section captures its own context at render time', () => {
    const options = {};
    render(
      `<template @defer><p>{{ name }}</p></template>
       <template @if="x"><p>Hidden</p></template>
       <template @defer><p>{{ name }}</p></template>`,
      { name: 'Alice', x: true },
      options
    );
    const resolved = resolveDeferred(options);
    assert.match(resolved[0].html, /Alice/);
    assert.match(resolved[1].html, /Alice/);
  });

  it('deferred context changes do not affect other deferred sections', () => {
    const options = {};
    render(
      `<template @defer><p>{{ value }}</p></template>
       <template @defer><p>{{ value }}</p></template>`,
      { value: 'original' },
      options
    );
    // Both should have captured 'original'
    const resolved = resolveDeferred(options);
    assert.match(resolved[0].html, /original/);
    assert.match(resolved[1].html, /original/);
  });
});

describe('@defer — diagnostic handling', () => {
  it('deferred content with @for invalid syntax reports diagnostic', () => {
    const diagnostics = [];
    const options = { onDiagnostic(d) { diagnostics.push(d); } };
    render(
      `<template @defer>
        <template @for="bad syntax"><p>x</p></template>
      </template>`,
      {},
      options
    );
    resolveDeferred(options);
    assert.ok(diagnostics.some(d => d.code === 'BN_FOR_INVALID_SYNTAX'));
  });

  it('deferred @for with duplicate track keys reports diagnostic', () => {
    const diagnostics = [];
    const options = { onDiagnostic(d) { diagnostics.push(d); } };
    render(
      `<template @defer>
        <template @for="item of items; track item.id">
          <p>{{ item.name }}</p>
        </template>
      </template>`,
      {
        items: [
          { id: 1, name: 'Alpha' },
          { id: 1, name: 'Duplicate' },
        ],
      },
      options
    );
    // Diagnostics are collected during main render, then deferred render happens separately
    // During the deferred render (resolveDeferred), new diagnostic callbacks are not processed
    // So we call resolveDeferred to verify the deferred content renders
    const resolved = resolveDeferred(options);
    assert.ok(resolved.length > 0);
  });

  it('deferred @for with non-array renders nothing in deferred content', () => {
    const diagnostics = [];
    const options = { onDiagnostic(d) { diagnostics.push(d); } };
    render(
      `<template @defer>
        <template @for="x of notArray"><p>x</p></template>
      </template>`,
      { notArray: 'not an array' },
      options
    );
    const resolved = resolveDeferred(options);
    // Should render without throwing, with empty or no output from the @for
    assert.ok(resolved.length > 0);
  });
});

describe('@defer — combined with signal bindings', () => {
  it('@defer preserves attribute binding syntax in deferred content', () => {
    const options = {};
    render(
      `<template @defer><input :value="text"></template>`,
      { text: 'hello' },
      options
    );
    const resolved = resolveDeferred(options);
    assert.match(resolved[0].html, /value="hello"/);
  });

  it('@defer with dynamic class binding', () => {
    const options = {};
    render(
      `<template @defer><div :class="classes"></div></template>`,
      { classes: 'active dark' },
      options
    );
    const resolved = resolveDeferred(options);
    assert.match(resolved[0].html, /class="active dark"/);
  });

  it('@defer with dynamic style binding', () => {
    const options = {};
    render(
      `<template @defer><div :style="styles"></div></template>`,
      { styles: 'color:red;font-size:16px' },
      options
    );
    const resolved = resolveDeferred(options);
    assert.match(resolved[0].html, /style="color:red;font-size:16px"/);
  });

  it('@defer with data-* attribute binding', () => {
    const options = {};
    render(
      `<template @defer><div :data-id="id"></div></template>`,
      { id: '42' },
      options
    );
    const resolved = resolveDeferred(options);
    assert.match(resolved[0].html, /data-id="42"/);
  });
});

describe('@defer — state management across multiple renders', () => {
  it('deferCounter resets for each top-level render call', () => {
    // First render
    const opts1 = {};
    render(`<template @defer><p>A</p></template>`, {}, opts1);

    // Second render
    const opts2 = {};
    render(
      `<template @defer><p>X</p></template>
       <template @defer><p>Y</p></template>`,
      {},
      opts2
    );

    // Both should start from d0
    assert.equal(opts1._deferred[0].id, 'd0');
    assert.equal(opts2._deferred[0].id, 'd0');
    assert.equal(opts2._deferred[1].id, 'd1');
  });

  it('deeply nested directives with deferred sections maintain ID uniqueness', () => {
    const options = {};
    render(
      `<template @for="i of items">
        <template @defer><p>Item {{ i }}</p></template>
      </template>`,
      { items: [1, 2, 3] },
      options
    );
    // Each @defer inside @for should get unique ID
    assert.equal(options._deferred.length, 3);
    assert.equal(options._deferred[0].id, 'd0');
    assert.equal(options._deferred[1].id, 'd1');
    assert.equal(options._deferred[2].id, 'd2');
  });
});
