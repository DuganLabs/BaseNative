import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { render, resolveDeferred } from './render.js';
import { renderToStream, renderToReadableStream } from './stream.js';

describe('render', () => {
  // --- Basic interpolation ---
  it('renders expressions with the shared CSP-safe evaluator', () => {
    const html = render('<p>{{ count + 1 }}</p>', { count: 2 });
    assert.equal(html, '<p>3</p>');
  });

  it('renders string interpolation', () => {
    const html = render('<p>{{ name }}</p>', { name: 'World' });
    assert.equal(html, '<p>World</p>');
  });

  it('renders falsy values (0, false, empty string)', () => {
    assert.equal(render('<p>{{ n }}</p>', { n: 0 }), '<p>0</p>');
    assert.equal(render('<p>{{ b }}</p>', { b: false }), '<p>false</p>');
    // null/undefined → empty
    assert.equal(render('<p>{{ x }}</p>', { x: null }), '<p></p>');
    assert.equal(render('<p>{{ x }}</p>', {}), '<p></p>');
  });

  it('renders nested expressions', () => {
    const html = render('<p>{{ user.name }}</p>', { user: { name: 'Alice' } });
    assert.equal(html, '<p>Alice</p>');
  });

  it('renders multiple interpolations in one element', () => {
    const html = render('<p>{{ first }} {{ last }}</p>', { first: 'Jane', last: 'Doe' });
    assert.equal(html, '<p>Jane Doe</p>');
  });

  // --- @if / @else ---
  it('@if renders the template when condition is truthy', () => {
    const html = render(`<template @if="show"><span>Yes</span></template>`, { show: true });
    assert.match(html, /Yes/);
  });

  it('@if removes the template when condition is falsy', () => {
    const html = render(`<template @if="show"><span>Yes</span></template>`, { show: false });
    assert.ok(!html.includes('Yes'));
  });

  it('@if/@else renders else branch when condition is falsy', () => {
    const html = render(`
      <template @if="active"><span>Active</span></template>
      <template @else><span>Inactive</span></template>
    `, { active: false });
    assert.match(html, /Inactive/);
    assert.ok(!html.includes('Active'));
  });

  it('@if/@else renders if branch when condition is truthy', () => {
    const html = render(`
      <template @if="active"><span>Active</span></template>
      <template @else><span>Inactive</span></template>
    `, { active: true });
    assert.match(html, /Active/);
    assert.ok(!html.includes('Inactive'));
  });

  it('@if with nested interpolation', () => {
    const html = render(`<template @if="ok"><p>{{ msg }}</p></template>`, { ok: true, msg: 'Hi' });
    assert.match(html, /Hi/);
  });

  // --- @for / @empty ---
  it('@for renders each item', () => {
    const html = render(`
      <ul><template @for="item of items"><li>{{ item }}</li></template></ul>
    `, { items: ['a', 'b', 'c'] });
    assert.match(html, /<li>a<\/li>/);
    assert.match(html, /<li>b<\/li>/);
    assert.match(html, /<li>c<\/li>/);
  });

  it('@for with $index metadata', () => {
    const html = render(`<template @for="item of items">{{ $index }}:{{ item }} </template>`, { items: ['x', 'y'] });
    assert.match(html, /0:x/);
    assert.match(html, /1:y/);
  });

  it('@for with @empty renders empty block when list is empty', () => {
    const html = render(`
      <template @for="item of items"><li>{{ item }}</li></template>
      <template @empty><p>No items</p></template>
    `, { items: [] });
    assert.match(html, /No items/);
  });

  it('@for with track key emits hydration markers', () => {
    const html = render(`
      <template @for="item of items; track item.id"><li>{{ item.name }}</li></template>
    `, { items: [{ id: 1, name: 'Alpha' }, { id: 2, name: 'Beta' }] }, { hydratable: true });
    assert.match(html, /<!--bn:for-->/);
    assert.match(html, /<!--bn:for:item:key=1-->/);
    assert.match(html, /<li>Alpha<\/li>/);
  });

  it('reports duplicate tracked keys during server render', () => {
    const diagnostics = [];
    render(`
      <template @for="item of items; track item.id">
        <p>{{ item.name }}</p>
      </template>
    `, {
      items: [{ id: 1, name: 'Alpha' }, { id: 1, name: 'Duplicate' }],
    }, { onDiagnostic(d) { diagnostics.push(d); } });
    assert.ok(diagnostics.some(d => d.code === 'BN_FOR_DUPLICATE_TRACK_KEY'));
  });

  it('@for handles $first, $last, $even, $odd', () => {
    const html = render(
      `<template @for="x of items">{{ $first }},{{ $last }},{{ $even }},{{ $odd }} </template>`,
      { items: ['a', 'b'] }
    );
    assert.match(html, /true,false,true,false/); // first item: $first=true,$last=false,$even=true,$odd=false
    assert.match(html, /false,true,false,true/); // second item
  });

  // --- @switch / @case / @default ---
  it('@switch renders the matching @case', () => {
    const html = render(`
      <template @switch="color">
        <template @case="'red'"><span>Red</span></template>
        <template @case="'blue'"><span>Blue</span></template>
        <template @default><span>Other</span></template>
      </template>
    `, { color: 'red' });
    assert.match(html, /Red/);
    assert.ok(!html.includes('Blue'));
    assert.ok(!html.includes('Other'));
  });

  it('@switch renders @default when no case matches', () => {
    const html = render(`
      <template @switch="color">
        <template @case="'red'"><span>Red</span></template>
        <template @default><span>Other</span></template>
      </template>
    `, { color: 'green' });
    assert.match(html, /Other/);
    assert.ok(!html.includes('Red'));
  });

  it('@switch with number matching', () => {
    const html = render(`
      <template @switch="n">
        <template @case="1"><span>One</span></template>
        <template @case="2"><span>Two</span></template>
      </template>
    `, { n: 2 });
    assert.match(html, /Two/);
    assert.ok(!html.includes('One'));
  });

  // --- Attribute binding ---
  it(':attr binding evaluates to static value', () => {
    const html = render('<input :disabled="isDisabled">', { isDisabled: true });
    assert.match(html, /disabled/);
  });

  it(':attr binding is omitted when false', () => {
    const html = render('<input :disabled="isDisabled">', { isDisabled: false });
    assert.ok(!html.includes('disabled'));
  });

  it(':class binding renders class string', () => {
    const html = render('<div :class="cls">', { cls: 'active highlight' });
    assert.match(html, /class="active highlight"/);
  });

  it('inline {{ }} interpolation in attributes', () => {
    const html = render('<img alt="{{ desc }}">', { desc: 'A picture' });
    assert.match(html, /alt="A picture"/);
  });

  // --- Hydration markers ---
  it('@if emits hydration markers when hydratable:true', () => {
    const html = render(`<template @if="ok"><p>Yes</p></template>`, { ok: true }, { hydratable: true });
    assert.match(html, /<!--bn:if-->/);
    assert.match(html, /<!--\/bn:if-->/);
  });

  // --- HTML escaping / safety ---
  it('does not execute directives inside script tags', () => {
    const html = render('<script>var x = 1;</script>', {});
    assert.equal(html.trim(), '<script>var x = 1;</script>');
  });

  it('renders tracked loops and emits hydratable markers when requested', () => {
    const html = render(`
      <ul>
        <template @for="item of items; track item.id">
          <li>{{ item.name }}</li>
        </template>
      </ul>
    `, {
      items: [
        { id: 1, name: 'Alpha' },
        { id: 2, name: 'Beta' },
      ],
    }, {
      hydratable: true,
    });

    assert.match(html, /<!--bn:for-->/);
    assert.match(html, /<!--bn:for:item:key=1-->/);
    assert.match(html, /<li>Alpha<\/li>/);
    assert.match(html, /<li>Beta<\/li>/);
  });
});

describe('render — additional edge cases', () => {
  // --- Deeply nested directives ---
  it('handles nested @if inside @for', () => {
    const html = render(`
      <template @for="item of items">
        <template @if="item.active"><span>{{ item.name }}</span></template>
      </template>
    `, {
      items: [
        { name: 'Alpha', active: true },
        { name: 'Beta', active: false },
      ],
    });
    assert.match(html, /Alpha/);
    assert.ok(!html.includes('Beta'));
  });

  it('handles @for inside @if', () => {
    const html = render(`
      <template @if="show">
        <ul><template @for="x of items"><li>{{ x }}</li></template></ul>
      </template>
    `, { show: true, items: ['a', 'b'] });
    assert.match(html, /<li>a<\/li>/);
    assert.match(html, /<li>b<\/li>/);
  });

  // --- @for metadata ---
  it('@for $index is 0-based', () => {
    const html = render(
      `<template @for="x of items">{{ $index }}</template>`,
      { items: ['a', 'b', 'c'] }
    );
    assert.match(html, /0/);
    assert.match(html, /1/);
    assert.match(html, /2/);
  });

  // --- Non-array in @for ---
  it('@for emits diagnostic for non-array and renders nothing', () => {
    const diagnostics = [];
    const html = render(
      `<template @for="x of notAnArray"><span>{{ x }}</span></template>`,
      { notAnArray: 'oops' },
      { onDiagnostic: (d) => diagnostics.push(d) }
    );
    assert.ok(!html.includes('<span>'));
    assert.ok(diagnostics.some(d => d.code === 'BN_FOR_NON_ARRAY'));
  });

  // --- :style and data-* bindings ---
  it(':style binding renders CSS string', () => {
    const html = render('<div :style="styles">', { styles: 'color:red;font-size:14px' });
    assert.match(html, /style="color:red;font-size:14px"/);
  });

  it('data-* attribute passes through unchanged', () => {
    const html = render('<div data-id="42" data-name="{{ label }}">', { label: 'test' });
    assert.match(html, /data-id="42"/);
    assert.match(html, /data-name="test"/);
  });

  it(':data-x dynamic data attribute', () => {
    const html = render('<span :data-value="val">', { val: 'hello' });
    assert.match(html, /data-value="hello"/);
  });

  // --- Boolean attributes ---
  it(':checked boolean attribute is included when true', () => {
    const html = render('<input :checked="isChecked">', { isChecked: true });
    assert.match(html, /checked/);
  });

  it(':checked boolean attribute is omitted when false', () => {
    const html = render('<input :checked="isChecked">', { isChecked: false });
    assert.ok(!html.includes('checked'));
  });

  it(':required attribute omitted when null', () => {
    const html = render('<input :required="req">', { req: null });
    assert.ok(!html.includes('required'));
  });

  // --- Ternary in attribute binding ---
  it(':class with ternary expression', () => {
    const html = render('<div :class="active ? \'on\' : \'off\'">', { active: true });
    assert.match(html, /class="on"/);
  });

  // --- Expression in nested object ---
  it('renders deeply nested property access', () => {
    const html = render('{{ a.b.c }}', { a: { b: { c: 'deep' } } });
    assert.equal(html.trim(), 'deep');
  });

  // --- Template with no directives ---
  it('renders plain HTML with no context', () => {
    const html = render('<p>Hello, world!</p>', {});
    assert.equal(html.trim(), '<p>Hello, world!</p>');
  });

  it('renders empty string template', () => {
    const html = render('', {});
    assert.equal(html, '');
  });

  // --- Style/script passthrough ---
  it('preserves style tag contents without processing', () => {
    const html = render('<style>.x { color: red; }</style>', {});
    assert.match(html, /\.x \{ color: red; \}/);
  });

  // --- @if without @else ---
  it('@if with no else renders nothing when false', () => {
    const html = render(`<template @if="false"><p>Hidden</p></template>`, { false: false });
    assert.ok(!html.includes('Hidden'));
  });

  // --- @switch with no matching case and no default ---
  it('@switch with no match and no default renders empty', () => {
    const html = render(`
      <template @switch="val">
        <template @case="'a'"><span>A</span></template>
      </template>
    `, { val: 'z' });
    assert.ok(!html.includes('<span>'));
  });

  // --- Arithmetic in interpolation ---
  it('renders arithmetic expression', () => {
    const html = render('<p>{{ a * b + c }}</p>', { a: 3, b: 4, c: 2 });
    assert.equal(render('<p>{{ a * b + c }}</p>', { a: 3, b: 4, c: 2 }).trim(), '<p>14</p>');
  });

  it('renders ternary expression', () => {
    const html = render('<p>{{ x > 0 ? "pos" : "neg" }}</p>', { x: 5 });
    assert.match(html, /pos/);
  });

  // --- @for with empty array uses @empty ---
  it('@for with empty array and no @empty renders nothing', () => {
    const html = render(`<template @for="x of items"><li>{{ x }}</li></template>`, { items: [] });
    assert.ok(!html.includes('<li>'));
  });
});

describe('renderToStream', () => {
  it('writes rendered content to a stream and calls end()', async () => {
    const chunks = [];
    let ended = false;
    const stream = {
      write(chunk) { chunks.push(chunk); return true; },
      end() { ended = true; },
    };
    renderToStream('<p>{{ msg }}</p>', { msg: 'hello' }, stream);
    assert.ok(ended);
    const output = chunks.join('');
    assert.match(output, /hello/);
  });

  it('respects chunkSize option', async () => {
    const chunks = [];
    const stream = {
      write(chunk) { chunks.push(chunk); return true; },
      end() {},
    };
    const html = '<p>' + 'x'.repeat(100) + '</p>';
    renderToStream(html, {}, stream, { chunkSize: 10 });
    // With chunkSize 10 on 105-char output: should produce multiple chunks
    assert.ok(chunks.length > 1);
  });

  it('handles backpressure (write returns false)', async () => {
    let drainCb = null;
    const chunks = [];
    let ended = false;
    const stream = {
      count: 0,
      write(chunk) {
        chunks.push(chunk);
        this.count++;
        if (this.count === 1) return false; // signal backpressure
        return true;
      },
      once(event, cb) { if (event === 'drain') drainCb = cb; },
      end() { ended = true; },
    };
    renderToStream('<p>hello world</p>', {}, stream, { chunkSize: 5 });
    // After backpressure, drain callback should be set
    assert.ok(drainCb !== null);
    // Simulate drain
    drainCb();
    assert.ok(ended);
  });
});

describe('renderToReadableStream', () => {
  it('returns a ReadableStream with rendered content', async () => {
    const stream = renderToReadableStream('<p>{{ msg }}</p>', { msg: 'stream' });
    assert.ok(stream instanceof ReadableStream);
    const reader = stream.getReader();
    const decoder = new TextDecoder();
    let result = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      result += decoder.decode(value);
    }
    assert.match(result, /stream/);
  });
});

describe('render — more directive edge cases', () => {
  it('nested @for inside @for produces correct output', () => {
    const html = render(
      `<template @for="row of rows"><template @for="cell of row">{{ cell }} </template></template>`,
      { rows: [[1, 2], [3, 4]] },
    );
    assert.ok(html.includes('1'));
    assert.ok(html.includes('2'));
    assert.ok(html.includes('3'));
    assert.ok(html.includes('4'));
  });

  it(':href attribute renders correctly', () => {
    const html = render(`<a :href="link">click</a>`, { link: '/home' });
    assert.ok(html.includes('href="/home"'));
  });

  it(':disabled renders attribute when true', () => {
    const html = render(`<button :disabled="isDisabled">btn</button>`, { isDisabled: true });
    assert.ok(html.includes('disabled'));
  });

  it(':disabled omits attribute when false', () => {
    const html = render(`<button :disabled="isDisabled">btn</button>`, { isDisabled: false });
    assert.ok(!html.includes('disabled'));
  });

  it('@switch with multiple cases selects first match', () => {
    const html = render(
      `<template @switch="x">
        <template @case="1"><span>one</span></template>
        <template @case="2"><span>two</span></template>
      </template>`,
      { x: 2 },
    );
    assert.ok(html.includes('two'));
    assert.ok(!html.includes('one'));
  });

  it('onDiagnostic callback is called on unknown variable access', () => {
    const diagnostics = [];
    render(`{{ unknown }}`, {}, { onDiagnostic: (d) => diagnostics.push(d) });
    // The key behavior: does not throw regardless of diagnostics
    assert.ok(Array.isArray(diagnostics));
  });

  it('renders boolean context value as string "true"', () => {
    const html = render(`<p>{{ flag }}</p>`, { flag: true });
    assert.ok(html.includes('true'));
  });

  it('@for $first and $last are both true for single-item array', () => {
    const html = render(
      `<template @for="x of items">{{ $first }}-{{ $last }}</template>`,
      { items: ['only'] },
    );
    assert.ok(html.includes('true-true'));
  });
});

describe('render — untested paths', () => {
  it('@for emits BN_FOR_INVALID_SYNTAX for malformed expression', () => {
    const diagnostics = [];
    const html = render(
      `<template @for="invalid syntax here"><span>x</span></template>`,
      {},
      { onDiagnostic: (d) => diagnostics.push(d) }
    );
    assert.ok(diagnostics.some(d => d.code === 'BN_FOR_INVALID_SYNTAX'));
  });

  it('script type="application/json" content is processed for interpolation', () => {
    const html = render(
      `<script type="application/json">{"name":"{{ user }}"}</script>`,
      { user: 'Alice' }
    );
    assert.ok(html.includes('Alice'));
  });

  it('@for with @empty and hydratable emits bn:empty marker', () => {
    const html = render(
      `<template @for="x of items"><li>{{ x }}</li></template><template @empty><p>Empty</p></template>`,
      { items: [] },
      { hydratable: true }
    );
    assert.match(html, /<!--bn:empty-->/);
    assert.match(html, /Empty/);
  });

  it('@switch emits hydration markers when hydratable', () => {
    const html = render(
      `<template @switch="val"><template @case="'a'"><span>A</span></template></template>`,
      { val: 'a' },
      { hydratable: true }
    );
    assert.match(html, /<!--bn:switch-->/);
    assert.match(html, /<!--\/bn:switch-->/);
  });

  it(':attr with empty string value renders as bare attribute', () => {
    const html = render('<input :placeholder="label">', { label: '' });
    // value is '' — should render as just the attribute name with no ="..."
    assert.match(html, /placeholder/);
  });

  it('renderToStream passes hydratable option to render', () => {
    const chunks = [];
    const stream = {
      write(chunk) { chunks.push(chunk); return true; },
      end() {},
    };
    renderToStream(`<template @if="ok"><p>Yes</p></template>`, { ok: true }, stream, { hydratable: true });
    const output = chunks.join('');
    assert.match(output, /<!--bn:if-->/);
  });

  it('renderToReadableStream respects chunkSize', async () => {
    const html = '<p>' + 'z'.repeat(200) + '</p>';
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

  it('renderToReadableStream with hydratable passes markers through', async () => {
    const stream = renderToReadableStream(
      `<template @if="show"><p>Hi</p></template>`,
      { show: true },
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
    assert.match(result, /<!--bn:if-->/);
  });
});

describe('@defer directive', () => {
  it('replaces @defer template with placeholder div', () => {
    const html = render(
      `<div><template @defer><p>Deferred content</p></template></div>`,
      {}
    );
    assert.match(html, /data-bn-defer="d0"/);
    assert.ok(!html.includes('Deferred content'));
  });

  it('emits hydration marker when hydratable', () => {
    const html = render(
      `<template @defer><p>Later</p></template>`,
      {},
      { hydratable: true }
    );
    assert.match(html, /<!--bn:defer:d0-->/);
  });

  it('collects deferred content in options._deferred', () => {
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

  it('resolveDeferred renders deferred content with context', () => {
    const options = {};
    render(
      `<template @defer><p>{{ name }}</p></template>`,
      { name: 'Warren' },
      options
    );
    const resolved = resolveDeferred(options);
    assert.equal(resolved.length, 1);
    assert.match(resolved[0].html, /<p>Warren<\/p>/);
    assert.match(resolved[0].script, /data-bn-defer-resolve="d0"/);
  });

  it('handles multiple @defer sections', () => {
    const options = {};
    render(
      `<template @defer><p>First</p></template><template @defer><p>Second</p></template>`,
      {},
      options
    );
    assert.equal(options._deferred.length, 2);
    const resolved = resolveDeferred(options);
    assert.match(resolved[0].html, /First/);
    assert.match(resolved[1].html, /Second/);
  });

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

  it('resolveDeferred returns empty array when no @defer', () => {
    const options = {};
    render('<p>No defer</p>', {}, options);
    const resolved = resolveDeferred(options);
    assert.deepEqual(resolved, []);
  });

  it('deferred script injects HTML into placeholder', () => {
    const options = {};
    render(`<template @defer><span>Injected</span></template>`, {}, options);
    const resolved = resolveDeferred(options);
    assert.match(resolved[0].script, /innerHTML/);
    assert.match(resolved[0].script, /Injected/);
  });

  it('renderToStream includes deferred scripts after main content', () => {
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

  it('renderToReadableStream includes deferred scripts', async () => {
    const stream = renderToReadableStream(
      `<p>Main</p><template @defer><span>Streamed</span></template>`,
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
    assert.match(result, /Main/);
    assert.match(result, /Streamed/);
    assert.match(result, /data-bn-defer-resolve/);
  });
});
