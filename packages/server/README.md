# @basenative/server

> SSR renderer for BaseNative templates — interpolation, @if, @for, @switch, and streaming

Part of the [BaseNative](https://github.com/DuganLabs/basenative) ecosystem — a signal-based web runtime over native HTML.

## Install

```bash
npm install @basenative/server
```

## Quick Start

```js
import { render, renderToStream, renderToReadableStream } from '@basenative/server';

const html = `
<h1>Hello, {{ name }}!</h1>
<template @if="items.length > 0">
  <ul>
    <template @for="item of items; track item.id">
      <li>{{ item.name }}</li>
    </template>
  </ul>
</template>
<template @else>
  <p>No items found.</p>
</template>
`;

const output = render(html, { name: 'World', items: [{ id: 1, name: 'First' }] });
```

## Streaming

```js
// Express streaming response
renderToStream(html, ctx, res, { hydratable: true });

// Web Streams (Cloudflare Workers, Deno, Bun)
const stream = renderToReadableStream(html, ctx, { hydratable: true });
return new Response(stream);
```

## Template Directives

- `{{ expr }}` — Interpolates an expression into text or attribute values.
- `@if="expr"` — Conditionally renders a `<template>` block.
- `@else` — Fallback block immediately following an `@if` template.
- `@for="item of list; track item.id"` — Iterates a list. Loop variables: `$index`, `$first`, `$last`, `$even`, `$odd`.
- `@empty` — Rendered when an `@for` list is empty.
- `@switch="expr"` / `@case="value"` / `@default` — Switch/case rendering.
- `:attr="expr"` — Evaluates an expression and sets it as an HTML attribute (omitted if `false` or `null`).

## API

- `render(html, ctx, options?)` — Renders an HTML template string synchronously. Returns the rendered HTML string.
- `renderToStream(html, ctx, stream, options?)` — Renders and pipes output to a Node.js writable stream.
- `renderToReadableStream(html, ctx, options?)` — Renders and returns a Web Streams `ReadableStream`.

### Options

- `hydratable` — Wraps directive output in `<!--bn:*-->` markers for client-side hydration.
- `onDiagnostic(diagnostic)` — Callback invoked for template warnings and errors.

## License

MIT
