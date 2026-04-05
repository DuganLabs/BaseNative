import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createLogger, consoleTransport, streamTransport, multiTransport, requestLogger, LEVELS, LEVEL_NAMES } from './index.js';

function captureTransport() {
  const entries = [];
  return {
    entries,
    write(entry) { entries.push(entry); },
  };
}

describe('createLogger', () => {
  it('logs at configured level and above', () => {
    const t = captureTransport();
    const log = createLogger({ level: 'warn', transport: t });
    log.info('ignored');
    log.warn('warning');
    log.error('error');
    assert.equal(t.entries.length, 2);
    assert.equal(t.entries[0].msg, 'warning');
    assert.equal(t.entries[1].msg, 'error');
  });

  it('includes timestamp by default', () => {
    const t = captureTransport();
    const log = createLogger({ transport: t });
    log.info('test');
    assert.ok(t.entries[0].time);
  });

  it('omits timestamp when timestamp=false', () => {
    const t = captureTransport();
    const log = createLogger({ transport: t, timestamp: false });
    log.info('test');
    assert.equal(t.entries[0].time, undefined);
  });

  it('includes name when provided', () => {
    const t = captureTransport();
    const log = createLogger({ transport: t, name: 'myapp' });
    log.info('test');
    assert.equal(t.entries[0].name, 'myapp');
  });

  it('does not include name property when name not provided', () => {
    const t = captureTransport();
    const log = createLogger({ transport: t });
    log.info('test');
    assert.equal(t.entries[0].name, undefined);
  });

  it('merges data into log entry', () => {
    const t = captureTransport();
    const log = createLogger({ transport: t });
    log.info('user login', { userId: 42, ip: '1.2.3.4' });
    assert.equal(t.entries[0].userId, 42);
    assert.equal(t.entries[0].ip, '1.2.3.4');
  });

  it('child logger inherits context', () => {
    const t = captureTransport();
    const log = createLogger({ transport: t, context: { service: 'api' } });
    const child = log.child({ requestId: 'abc' });
    child.info('test');
    assert.equal(t.entries[0].service, 'api');
    assert.equal(t.entries[0].requestId, 'abc');
  });

  it('child logger context overrides parent context', () => {
    const t = captureTransport();
    const log = createLogger({ transport: t, context: { env: 'dev' } });
    const child = log.child({ env: 'prod' });
    child.info('test');
    assert.equal(t.entries[0].env, 'prod');
  });

  it('exposes level getter', () => {
    const log = createLogger({ level: 'debug', transport: captureTransport() });
    assert.equal(log.level, 'debug');
  });

  it('defaults to info level', () => {
    const t = captureTransport();
    const log = createLogger({ transport: t });
    log.debug('should be filtered');
    log.info('should pass');
    assert.equal(t.entries.length, 1);
    assert.equal(t.entries[0].msg, 'should pass');
  });

  it('trace level logs at trace and above', () => {
    const t = captureTransport();
    const log = createLogger({ level: 'trace', transport: t });
    log.trace('trace msg');
    log.debug('debug msg');
    assert.equal(t.entries.length, 2);
    assert.equal(t.entries[0].level, 10);
    assert.equal(t.entries[1].level, 20);
  });

  it('fatal level only logs fatal', () => {
    const t = captureTransport();
    const log = createLogger({ level: 'fatal', transport: t });
    log.error('should be filtered');
    log.fatal('fatal msg');
    assert.equal(t.entries.length, 1);
    assert.equal(t.entries[0].level, 60);
    assert.equal(t.entries[0].msg, 'fatal msg');
  });

  it('includes context from options', () => {
    const t = captureTransport();
    const log = createLogger({ transport: t, context: { version: '1.0.0' } });
    log.info('startup');
    assert.equal(t.entries[0].version, '1.0.0');
  });

  it('log entry includes correct numeric level', () => {
    const t = captureTransport();
    const log = createLogger({ transport: t });
    log.warn('test warn');
    assert.equal(t.entries[0].level, 40);
  });
});

describe('LEVELS and LEVEL_NAMES', () => {
  it('exports LEVELS map with correct numeric values', () => {
    assert.equal(LEVELS.trace, 10);
    assert.equal(LEVELS.debug, 20);
    assert.equal(LEVELS.info, 30);
    assert.equal(LEVELS.warn, 40);
    assert.equal(LEVELS.error, 50);
    assert.equal(LEVELS.fatal, 60);
  });

  it('exports LEVEL_NAMES as reverse map', () => {
    assert.equal(LEVEL_NAMES[10], 'trace');
    assert.equal(LEVEL_NAMES[30], 'info');
    assert.equal(LEVEL_NAMES[50], 'error');
  });
});

describe('streamTransport', () => {
  it('writes JSON lines to a stream', () => {
    const chunks = [];
    const fakeStream = { write(chunk) { chunks.push(chunk); } };
    const t = streamTransport(fakeStream);
    t.write({ level: 30, msg: 'hello', time: 1000 });
    assert.equal(chunks.length, 1);
    assert.ok(chunks[0].endsWith('\n'));
    const parsed = JSON.parse(chunks[0]);
    assert.equal(parsed.msg, 'hello');
    assert.equal(parsed.level, 30);
  });

  it('writes multiple entries as separate lines', () => {
    const chunks = [];
    const fakeStream = { write(chunk) { chunks.push(chunk); } };
    const t = streamTransport(fakeStream);
    t.write({ level: 30, msg: 'first' });
    t.write({ level: 40, msg: 'second' });
    assert.equal(chunks.length, 2);
    assert.equal(JSON.parse(chunks[0]).msg, 'first');
    assert.equal(JSON.parse(chunks[1]).msg, 'second');
  });
});

describe('multiTransport', () => {
  it('writes to multiple transports', () => {
    const t1 = captureTransport();
    const t2 = captureTransport();
    const multi = multiTransport([t1, t2]);
    const log = createLogger({ transport: multi });
    log.info('test');
    assert.equal(t1.entries.length, 1);
    assert.equal(t2.entries.length, 1);
  });

  it('passes pretty flag to each transport', () => {
    const prettyFlags = [];
    const spyTransport = {
      write(_entry, pretty) { prettyFlags.push(pretty); },
    };
    const multi = multiTransport([spyTransport, spyTransport]);
    multi.write({ level: 30, msg: 'x' }, true);
    assert.equal(prettyFlags.length, 2);
    assert.ok(prettyFlags.every(f => f === true));
  });

  it('works with an empty transport list', () => {
    const multi = multiTransport([]);
    assert.doesNotThrow(() => multi.write({ level: 30, msg: 'test' }, false));
  });
});

describe('requestLogger', () => {
  it('attaches request context', async () => {
    const t = captureTransport();
    const log = createLogger({ transport: t });
    const mw = requestLogger(log);
    const ctx = {
      request: { method: 'GET', url: '/api/test', headers: { 'x-request-id': 'req-123' } },
      response: { headers: {} },
      state: {},
    };
    await mw(ctx, async () => {
      ctx.state.logger.info('inside request');
    });
    assert.equal(ctx.state.requestId, 'req-123');
    assert.equal(t.entries[0].requestId, 'req-123');
    assert.equal(t.entries[0].method, 'GET');
  });

  it('auto-generates request ID when header is absent', async () => {
    const t = captureTransport();
    const log = createLogger({ transport: t });
    const mw = requestLogger(log);
    const ctx = {
      request: { method: 'POST', url: '/api/create', headers: {} },
      state: {},
    };
    await mw(ctx, async () => {
      ctx.state.logger.info('no header');
    });
    assert.ok(ctx.state.requestId.startsWith('req-'));
    assert.equal(t.entries[0].requestId, ctx.state.requestId);
  });

  it('uses custom idHeader when provided', async () => {
    const t = captureTransport();
    const log = createLogger({ transport: t });
    const mw = requestLogger(log, { idHeader: 'x-trace-id' });
    const ctx = {
      request: { method: 'GET', url: '/trace', headers: { 'x-trace-id': 'trace-999' } },
      state: {},
    };
    await mw(ctx, async () => {
      ctx.state.logger.info('traced');
    });
    assert.equal(ctx.state.requestId, 'trace-999');
    assert.equal(t.entries[0].requestId, 'trace-999');
  });

  it('increments counter for successive auto-generated IDs', async () => {
    const log = createLogger({ transport: captureTransport() });
    const mw = requestLogger(log);
    const ids = [];
    for (let i = 0; i < 3; i++) {
      const ctx = { request: { method: 'GET', url: '/', headers: {} }, state: {} };
      await mw(ctx, async () => { ids.push(ctx.state.requestId); });
    }
    assert.equal(ids[0], 'req-1');
    assert.equal(ids[1], 'req-2');
    assert.equal(ids[2], 'req-3');
  });
});
