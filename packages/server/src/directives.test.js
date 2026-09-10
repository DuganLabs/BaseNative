/**
 * Tests for the generic plugin-directive dispatch added to render() (see
 * findBlockDirective/processDirectiveBlock and the contentDirective branch of
 * processNode in render.js), plus the real @feature (from @basenative/flags) and
 * @t (from @basenative/i18n) directives registered through it.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { render } from './render.js';
import { registerDirective, unregisterDirective } from '@basenative/runtime/shared/directives';
import { raw } from '@basenative/runtime';

describe('custom directive registry (registerDirective) — server', () => {
  it('dispatches an "on: template" directive like @if, including @else', () => {
    registerDirective('probe-block', {
      on: 'template',
      server: (value, ctx) => Boolean(ctx[value]),
    });
    try {
      const html = render(
        `<template @probe-block="flag"><p>On</p></template><template @else><p>Off</p></template>`,
        { flag: true }
      );
      assert.match(html, /On/);
      assert.ok(!html.includes('Off'));

      const html2 = render(
        `<template @probe-block="flag"><p>On</p></template><template @else><p>Off</p></template>`,
        { flag: false }
      );
      assert.match(html2, /Off/);
      assert.ok(!html2.includes('On'));
    } finally {
      unregisterDirective('probe-block');
    }
  });

  it('dispatches an "on: element" directive that returns plain text (escaped)', () => {
    registerDirective('probe-text', {
      on: 'element',
      server: (value) => `<${value}>`,
    });
    try {
      const html = render(`<span @probe-text="hi">fallback</span>`, {});
      assert.equal(html, '<span>&lt;hi&gt;</span>');
    } finally {
      unregisterDirective('probe-text');
    }
  });

  it('supports raw() to opt an "on: element" directive result out of escaping', () => {
    registerDirective('probe-raw', {
      on: 'element',
      server: (value) => raw(`<b>${value}</b>`),
    });
    try {
      const html = render(`<span @probe-raw="hi">fallback</span>`, {});
      assert.equal(html, '<span><b>hi</b></span>');
    } finally {
      unregisterDirective('probe-raw');
    }
  });

  it('leaves existing content (and nested interpolation) untouched when the handler returns undefined', () => {
    registerDirective('probe-noop', {
      on: 'element',
      server: () => undefined,
    });
    try {
      const html = render(`<span @probe-noop="x">Hi {{ name }}</span>`, { name: 'Ada' });
      assert.equal(html, '<span>Hi Ada</span>');
    } finally {
      unregisterDirective('probe-noop');
    }
  });
});

describe('@feature directive (from @basenative/flags) — server', () => {
  it('renders the feature branch when the flag is enabled', async () => {
    const { createFlagManager, createMemoryProvider, createFlagContext } = await import('@basenative/flags');
    const flags = createFlagManager(createMemoryProvider({ beta: { enabled: true } }));
    const $flags = await createFlagContext(flags);

    const html = render(
      `<template @feature="beta"><p>Beta UI</p></template><template @else><p>Classic UI</p></template>`,
      { $flags }
    );
    assert.match(html, /Beta UI/);
    assert.ok(!html.includes('Classic UI'));
  });

  it('renders the @else branch when the flag is disabled', async () => {
    const { createFlagManager, createMemoryProvider, createFlagContext } = await import('@basenative/flags');
    const flags = createFlagManager(createMemoryProvider({ beta: { enabled: false } }));
    const $flags = await createFlagContext(flags);

    const html = render(
      `<template @feature="beta"><p>Beta UI</p></template><template @else><p>Classic UI</p></template>`,
      { $flags }
    );
    assert.match(html, /Classic UI/);
    assert.ok(!html.includes('Beta UI'));
  });

  it('renders nothing when the flag is disabled and there is no @else', async () => {
    const { createFlagManager, createMemoryProvider, createFlagContext } = await import('@basenative/flags');
    const flags = createFlagManager(createMemoryProvider({ beta: { enabled: false } }));
    const $flags = await createFlagContext(flags);

    const html = render(`<template @feature="beta"><p>Beta UI</p></template>`, { $flags });
    assert.equal(html.trim(), '');
  });

  it('treats a missing $flags provider as disabled and emits a diagnostic', async () => {
    await import('@basenative/flags');
    const diagnostics = [];
    const html = render(
      `<template @feature="beta"><p>Beta UI</p></template><template @else><p>Classic UI</p></template>`,
      {},
      { onDiagnostic: (d) => diagnostics.push(d) }
    );
    assert.match(html, /Classic UI/);
    assert.ok(diagnostics.some((d) => d.code === 'BN_FEATURE_NO_PROVIDER'));
  });

  it('a <div @feature="x"> not on a <template> is treated as an event listener, not control flow', async () => {
    // Matches the existing @if/@for/@switch behavior: `@name` is only control flow on
    // a <template>. This exercises processNode's contentDirective path finding no
    // registered "on: element" directive named "feature" and falling through unchanged.
    await import('@basenative/flags');
    const html = render(`<div @feature="beta">Always here</div>`, { $flags: { isEnabled: () => false } });
    assert.match(html, /Always here/);
  });
});

describe('@t directive (from @basenative/i18n) — server', () => {
  it('sets text content to the translated message, interpolating from context', async () => {
    const { createI18n } = await import('@basenative/i18n');
    const i18n = createI18n({ defaultLocale: 'en', messages: { en: { greeting: 'Hello, {name}!' } } });

    const html = render(`<h1 @t="greeting">fallback</h1>`, { $i18n: i18n, name: 'Ada' });
    assert.equal(html, '<h1>Hello, Ada!</h1>');
  });

  it('escapes translated text so message content cannot inject markup', async () => {
    const { createI18n } = await import('@basenative/i18n');
    const i18n = createI18n({ defaultLocale: 'en', messages: { en: { hostile: '<script>evil()</script>' } } });

    const html = render(`<span @t="hostile"></span>`, { $i18n: i18n });
    assert.equal(html, '<span>&lt;script&gt;evil()&lt;/script&gt;</span>');
  });

  it('falls back to the key itself when the key is missing from every locale', async () => {
    const { createI18n } = await import('@basenative/i18n');
    const i18n = createI18n({ defaultLocale: 'en', messages: { en: {} } });

    const html = render(`<span @t="missing.key">fallback</span>`, { $i18n: i18n });
    assert.equal(html, '<span>missing.key</span>');
  });

  it('leaves existing content untouched and emits a diagnostic when $i18n is missing', async () => {
    await import('@basenative/i18n');
    const diagnostics = [];
    const html = render(`<h1 @t="greeting">Static fallback</h1>`, {}, {
      onDiagnostic: (d) => diagnostics.push(d),
    });
    assert.equal(html, '<h1>Static fallback</h1>');
    assert.ok(diagnostics.some((d) => d.code === 'BN_T_NO_PROVIDER'));
  });
});
