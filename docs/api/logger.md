# @basenative/logger

> Structured logging with Pino-compatible JSON output and pluggable transports.

## Overview

`@basenative/logger` produces structured JSON log lines in production and colorized human-readable output in development. It is Pino-compatible in its output format. The logger supports named child loggers for adding request or module context, and ships three transport implementations: console (default), file stream, and multi (fan-out).

## Installation

```bash
npm install @basenative/logger
```

## Quick Start

```js
import { createLogger, consoleTransport, streamTransport } from '@basenative/logger';
import { createWriteStream } from 'node:fs';

const logger = createLogger({ name: 'app', level: 'info' });

logger.info('Server started', { port: 3000 });
logger.warn('High memory usage', { heapMb: 512 });
logger.error('Unhandled rejection', { err: error.message });

const requestLog = logger.child({ requestId: 'req-001' });
requestLog.info('Request received');
```

## API Reference

### createLogger(options)

Creates a logger instance.

**Parameters:**
- `options.level` — minimum log level; one of `'trace'`, `'debug'`, `'info'`, `'warn'`, `'error'`, `'fatal'`; default `'info'`
- `options.name` — logger name; included in every log entry
- `options.transport` — transport instance; default `consoleTransport()`
- `options.context` — object of key/value pairs merged into every log entry
- `options.timestamp` — include `time` field (Unix ms); default `true`
- `options.pretty` — colorize output; default `true` outside production

**Returns:** Logger object with methods: `trace`, `debug`, `info`, `warn`, `error`, `fatal`, `child`, and `level` getter.

**Logger methods:**

| Method | Level Number | Description |
|--------|-------------|-------------|
| `logger.trace(msg, data)` | 10 | Detailed tracing |
| `logger.debug(msg, data)` | 20 | Debug information |
| `logger.info(msg, data)` | 30 | Standard informational messages |
| `logger.warn(msg, data)` | 40 | Potentially harmful situations |
| `logger.error(msg, data)` | 50 | Error events |
| `logger.fatal(msg, data)` | 60 | Severe errors causing early exit |

Each method takes:
- `msg` — log message string
- `data` — optional object of additional fields merged into the log entry

---

### logger.child(childContext)

Creates a child logger that inherits all options and prepends `childContext` to every log entry.

**Parameters:**
- `childContext` — object of key/value pairs to add to every entry

**Returns:** New logger instance.

**Example:**
```js
const reqLogger = logger.child({ requestId: 'abc123', userId: 42 });
reqLogger.info('Processing request'); // { requestId: 'abc123', userId: 42, msg: 'Processing request', ... }
```

---

### consoleTransport()

Default transport. Writes pretty-printed output in development and JSON lines in production.

**Returns:** Transport object with `write(entry, pretty)` method.

---

### streamTransport(stream)

Writes JSON lines to any Node.js writable stream.

**Parameters:**
- `stream` — Node.js `Writable` stream (e.g. `fs.createWriteStream`)

**Returns:** Transport object.

**Example:**
```js
import { createWriteStream } from 'node:fs';

const logger = createLogger({
  transport: streamTransport(createWriteStream('./app.log', { flags: 'a' })),
});
```

---

### multiTransport(transports)

Fan-out transport that writes to multiple transports simultaneously.

**Parameters:**
- `transports` — array of transport instances

**Returns:** Transport object.

**Example:**
```js
import { createLogger, consoleTransport, streamTransport, multiTransport } from '@basenative/logger';
import { createWriteStream } from 'node:fs';

const logger = createLogger({
  transport: multiTransport([
    consoleTransport(),
    streamTransport(createWriteStream('./errors.log')),
  ]),
});
```

---

### requestLogger(logger, options)

Creates middleware that attaches a child logger to each request context.

**Parameters:**
- `logger` — logger instance
- `options.idHeader` — header name for request ID; default `'x-request-id'`

**Returns:** Middleware function `(ctx, next) => void`.

After this middleware runs:
- `ctx.state.requestId` — request ID from header or auto-generated
- `ctx.state.logger` — child logger with `requestId`, `method`, and `url`

**Example:**
```js
import { createPipeline } from '@basenative/middleware';
import { createLogger, requestLogger } from '@basenative/logger';

const logger = createLogger({ name: 'api' });
const pipeline = createPipeline();
pipeline.use(requestLogger(logger));

// In later middleware:
ctx.state.logger.info('User fetched', { userId: 42 });
```

## Log Entry Format

In production (JSON mode):

```json
{"level":30,"time":1712345678901,"name":"app","msg":"Server started","port":3000}
```

In development (pretty mode):

```
INFO [app] Server started {"port":3000}
```

Level numbers follow the Pino convention (10–60), making logs compatible with Pino transports and log aggregation tools.

## Integration

Pass `requestLogger` into `createPipeline` from `@basenative/middleware` as an early middleware. Each downstream handler then accesses `ctx.state.logger` to log with full request context without threading the logger manually.
