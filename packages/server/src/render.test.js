import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { render } from './render.js';
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
