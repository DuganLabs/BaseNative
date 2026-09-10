# @basenative/mcp

> MCP server exposing BaseNative validation, SSR preview, and directive reference to any agent.

## Overview

`@basenative/mcp` implements a Model Context Protocol server directly against the JSON-RPC 2.0 / stdio wire protocol — no MCP SDK dependency, consistent with BaseNative's zero-production-dependency stance. It exposes five tools an agent can call over `tools/call`: `validate_template` and `check_expression` wrap `@basenative/validate`'s `validateTemplate` and `@basenative/runtime/shared/expression`'s `compileExpression` to catch invalid BaseNative markup and CSP-unsafe expressions before they're handed back to a user; `render_preview` wraps `@basenative/server`'s `render` to confirm a template actually produces the HTML it looks like it should; `list_directives` (and, indirectly, `scaffold_component`) serve the directive/primitive/forbidden-syntax reference data in `directives.js`, so an agent can look up exact BaseNative syntax instead of guessing from whichever other framework's syntax is most represented in its training data. The package ships a `basenative-mcp` bin (`src/bin.js`) that simply calls `serve()` over stdio — that's the entry point most consumers actually run; the JS exports documented below exist for embedding the same protocol handling over a different transport, or for testing it directly without spawning a process.

## Installation

```bash
npm install @basenative/mcp
```

Or run it directly as a stdio MCP server without adding it as a library dependency:

```bash
npx --package=@basenative/mcp basenative-mcp
```

## Quick Start

```js
import { serve } from '@basenative/mcp';

// Runs the newline-delimited JSON-RPC stdio loop expected by the
// Claude Code / MCP stdio transport.
serve();
```

Handling messages yourself, e.g. over a different transport or in a test:

```js
import { handleMessage } from '@basenative/mcp';

const response = handleMessage({
  jsonrpc: '2.0',
  id: 1,
  method: 'tools/call',
  params: { name: 'validate_template', arguments: { template: '<p>{{ name }}</p>' } },
});
// response.result.content[0].text -> 'VALID — no diagnostics.'
```

## API Reference

### serve({ input = process.stdin, output = process.stdout } = {})

Run the stdio loop. Messages are newline-delimited JSON, which is what the Claude Code / MCP stdio transport emits.

**Parameters:**
- `input` — a readable stream in `utf8` mode; default `process.stdin`
- `output` — a writable stream; default `process.stdout`

Buffers incoming data, splits on `\n`, and for each non-empty line parses it as JSON and passes it to `handleMessage`. Any response `handleMessage` returns (i.e. not `null`) is written back as `JSON.stringify(response) + '\n'`. A line that fails to parse produces a JSON-RPC `-32700` "Parse error" response instead of throwing.

**Returns:** `undefined` (registers a `data` listener on `input` and returns immediately).

---

### handleMessage(msg)

Handle one JSON-RPC message and return the response, or `null` for a notification.

**Parameters:** `msg` — a parsed JSON-RPC request, `{ jsonrpc: '2.0', id?, method, params? }`

**Returns:** a JSON-RPC response object, or `null` when no reply should be sent (a notification, i.e. `id` is `undefined`/`null`). Supported `method`s:

- `'initialize'` — returns `{ protocolVersion: PROTOCOL_VERSION, capabilities: { tools: {} }, serverInfo: SERVER_INFO }`
- `'notifications/initialized'` — returns `null`
- `'tools/list'` — returns `{ tools: [{ name, description, inputSchema }, ...] }`, projected from `TOOLS`
- `'tools/call'` — looks up `params.name` in `TOOL_MAP` (a `-32602` error if unknown), checks `params.arguments` against the tool's `inputSchema.required` and returns an `isError` text result naming any missing arguments *without* invoking the handler (a missing argument reaching a handler as `undefined` can produce a confidently wrong answer), then calls `tool.handler(args)` and wraps its `{ text, isError? }` return as `{ content: [{ type: 'text', text }], isError }`. A thrown handler error is caught and returned as an `isError` text result rather than propagating.
- `'ping'` — returns `{}`
- anything else — a `-32601` "Method not found" error, or `null` if it was a notification

A message that isn't `{ jsonrpc: '2.0', ... }` returns a `-32600` "Invalid Request" error.

---

### PROTOCOL_VERSION

The MCP protocol version string this server implements and reports from `initialize` — currently `'2024-11-05'`.

---

### SERVER_INFO

`{ name: 'basenative', version: '0.1.0' }` — the `serverInfo` object reported from `initialize`. This tracks the protocol/server implementation version and is maintained independently of the `@basenative/mcp` npm package version.

---

### TOOLS

The array of tool definitions served over `tools/list` and dispatched by `tools/call`, each shaped `{ name, description, inputSchema, handler(args) }`:

- **`validate_template`** — `{ template, context? }`. Runs `validateTemplate` from `@basenative/validate` and formats each diagnostic as `SEVERITY CODE (line, col) [confidence: ...]` plus message and suggested fix. `isError: true` when the template is invalid.
- **`render_preview`** — `{ template, context? }`. Validates first — refuses to render an invalid template and returns its error diagnostics instead of confusing output — then calls `render(template, context)` from `@basenative/server` and returns the resulting HTML.
- **`list_directives`** — `{ filter? }`. With no filter, lists every entry in `DIRECTIVES`; `filter: 'primitives'` lists `PRIMITIVES`; `filter: 'forbidden'` lists `FORBIDDEN`; any other string does a case-insensitive substring match against directive names (leading `@` stripped) and returns an `isError` result naming valid names if nothing matches.
- **`check_expression`** — `{ expression }`. Runs `compileExpression` from `@basenative/runtime/shared/expression`; a compile failure returns what's supported/unsupported in the CSP-safe subset and a remedy. If it compiles, the tool double-checks it by wrapping it as `<p>{{ expression }}</p>` and running it through `validateTemplate` too, so this tool can never disagree with what the validator itself would report on the same expression.
- **`scaffold_component`** — `{ name, features? }`. Generates a Trinity Standard component skeleton (`signal`/`computed` state, a template string, and a `{ template, context }` return) for the given `name` (converted to PascalCase/kebab-case), optionally including `'list' | 'conditional' | 'form'` feature blocks. Validates the generated template with `validateTemplate` before returning it and appends a `WARNING` comment to the source if validation fails, rather than silently handing back broken code.

---

### TOOL_MAP

`Map<string, ToolDefinition>` — `TOOLS` indexed by `name`. Used internally by `handleMessage`'s `tools/call` handling to look up the requested tool; also convenient for testing a single tool's handler directly (`TOOL_MAP.get('validate_template').handler({ template })`).

---

### DIRECTIVES

The BaseNative directive reference, in one place — the data behind the `list_directives` tool. One entry per directive (`@if`, `@else`, `@for`, `@empty`, `@switch`, `@case`, `@default`, `@defer`, `@catch`, `@feature`, `@t`, `@<event>`, `:<attr>`, `{{ }}`), each shaped `{ name, on, signature, summary, example, notes }`. Kept as data rather than prose so `list_directives`, the eval harness, and any future docs generator can read one source of truth instead of three independently-drifting descriptions of the same language.

---

### PRIMITIVES

Reactivity primitives, exported from `@basenative/runtime`. Reference entries — `signal`, `computed`, `effect`, `batch` — each shaped `{ name, signature, summary }`, served by `list_directives({ filter: 'primitives' })`.

---

### FORBIDDEN

Syntax from other frameworks that BaseNative does NOT accept. A lookup table from foreign syntax (Vue, Angular, Angular 17 block syntax, Svelte, Svelte 5 runes, React, Alpine) to the BaseNative equivalent, each shaped `{ foreign, framework, use }`, served by `list_directives({ filter: 'forbidden' })`.

## Integration

- **`@basenative/validate`** — `validateTemplate` backs `validate_template`, `render_preview` (pre-render check), `check_expression` (cross-check), and `scaffold_component` (pre-return check).
- **`@basenative/server`** — `render` backs `render_preview`.
- **`@basenative/runtime`** — `compileExpression`, imported from its `shared/expression` subpath, backs `check_expression`; `PRIMITIVES` documents the runtime's `signal`/`computed`/`effect`/`batch` API for `list_directives`.
- **bin**: the package's `basenative-mcp` bin points at `src/bin.js`, which does nothing but call `serve()` — the whole CLI surface is `serve()`'s stdio loop.

## License

Apache-2.0
