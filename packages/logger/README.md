# @basenative/logger

> Structured JSON logging with Pino-compatible output, transports, and child loggers

Part of the [BaseNative](https://github.com/DuganLabs/basenative) ecosystem — a signal-based web runtime over native HTML.

## Install

```bash
npm install @basenative/logger
```

## Quick Start

```js
import { createLogger } from '@basenative/logger';

const log = createLogger({ name: 'api', level: 'info' });

log.info('Server started', { port: 3000 });
log.warn('Slow query', { duration: 1200, table: 'users' });
log.error('Unhandled error', { err });
```

## Child Loggers

```js
const requestLog = log.child({ requestId: 'abc-123' });
requestLog.info('Incoming request'); // always includes requestId
```

## Request Middleware

```js
import { createLogger, requestLogger } from '@basenative/logger';
import { createPipeline } from '@basenative/middleware';

const log = createLogger({ name: 'http' });

const pipeline = createPipeline().use(requestLogger(log));
// ctx.state.logger is now a child logger with requestId, method, url
```

## API

### `createLogger(options?)`

Creates a logger instance. Options:

- `level` — Minimum log level: `'trace'`, `'debug'`, `'info'`, `'warn'`, `'error'`, `'fatal'`. Default: `'info'`.
- `name` — Logger name, included in every log entry.
- `transport` — Transport instance (default: `consoleTransport()`).
- `context` — Static key/value pairs merged into every log entry.
- `timestamp` — Include `time` field (milliseconds since epoch). Default: `true`.
- `pretty` — Pretty-print with colors in development. Default: `NODE_ENV !== 'production'`.

Logger methods: `trace`, `debug`, `info`, `warn`, `error`, `fatal` — each accepts `(msg, data?)`.

- `.child(context)` — Returns a new logger inheriting all settings with additional static context.
- `.level` — Read-only current level string.

### Transports

- `consoleTransport()` — Writes to `console.log`. Pretty-prints in development, JSON in production.
- `streamTransport(stream)` — Writes JSON lines to any Node.js writable stream (e.g. a file stream).
- `multiTransport(transports[])` — Fans out to multiple transports simultaneously.

### Middleware

- `requestLogger(logger, options?)` — Middleware that creates a child logger per request with `requestId`, `method`, and `url`. Attaches it to `ctx.state.logger`. Options: `idHeader` (default: `'x-request-id'`).

## License

MIT
