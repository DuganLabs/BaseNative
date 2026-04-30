/**
 * Structured logging with Pino-compatible JSON output.
 */

const LEVELS = { trace: 10, debug: 20, info: 30, warn: 40, error: 50, fatal: 60 };
const LEVEL_NAMES = Object.fromEntries(Object.entries(LEVELS).map(([k, v]) => [v, k]));

export function createLogger(options = {}) {
  const {
    level = 'info',
    name,
    transport = consoleTransport(),
    context = {},
    timestamp = true,
    pretty = process.env.NODE_ENV !== 'production',
  } = options;

  const minLevel = LEVELS[level] ?? 30;

  function log(levelNum, msg, data = {}) {
    if (levelNum < minLevel) return;

    const entry = {
      level: levelNum,
      ...(timestamp ? { time: Date.now() } : {}),
      ...(name ? { name } : {}),
      ...context,
      ...data,
      msg,
    };

    transport.write(entry, pretty);
  }

  const logger = {
    trace: (msg, data) => log(10, msg, data),
    debug: (msg, data) => log(20, msg, data),
    info: (msg, data) => log(30, msg, data),
    warn: (msg, data) => log(40, msg, data),
    error: (msg, data) => log(50, msg, data),
    fatal: (msg, data) => log(60, msg, data),

    child(childContext) {
      return createLogger({
        level,
        name,
        transport,
        context: { ...context, ...childContext },
        timestamp,
        pretty,
      });
    },

    get level() { return level; },
  };

  return logger;
}

/**
 * Console transport with optional pretty-printing.
 */
export function consoleTransport() {
  return {
    write(entry, pretty) {
      if (pretty) {
        const levelName = LEVEL_NAMES[entry.level] ?? 'info';
        const color = entry.level >= 50 ? '\x1b[31m' : entry.level >= 40 ? '\x1b[33m' : '\x1b[36m';
        const { level: _level, time: _time, msg, name, ...rest } = entry;
        const prefix = name ? `[${name}] ` : '';
        const extra = Object.keys(rest).length > 0 ? ' ' + JSON.stringify(rest) : '';
        console.log(`${color}${levelName.toUpperCase()}\x1b[0m ${prefix}${msg}${extra}`);
      } else {
        console.log(JSON.stringify(entry));
      }
    },
  };
}

/**
 * File transport — writes JSON lines to a writable stream.
 */
export function streamTransport(stream) {
  return {
    write(entry) {
      stream.write(JSON.stringify(entry) + '\n');
    },
  };
}

/**
 * Multi-transport — writes to multiple transports.
 */
export function multiTransport(transports) {
  return {
    write(entry, pretty) {
      for (const t of transports) {
        t.write(entry, pretty);
      }
    },
  };
}

/**
 * Request context logger — creates a child logger with request metadata.
 */
export function requestLogger(logger, options = {}) {
  const { idHeader = 'x-request-id' } = options;
  let counter = 0;

  return (ctx, next) => {
    const requestId = ctx.request.headers?.[idHeader] ?? `req-${++counter}`;
    ctx.state.requestId = requestId;
    ctx.state.logger = logger.child({
      requestId,
      method: ctx.request.method,
      url: ctx.request.url ?? ctx.request.path,
    });
    return next();
  };
}

export { LEVELS, LEVEL_NAMES };
