import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createLogger, consoleTransport, multiTransport, requestLogger } from './index.js';

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

  it('includes name when provided', () => {
    const t = captureTransport();
    const log = createLogger({ transport: t, name: 'myapp' });
    log.info('test');
    assert.equal(t.entries[0].name, 'myapp');
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
});
