import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { createSSEServer, sseMiddleware, createChannelManager, createWSHandler } from './index.js';

function mockResponse() {
  const chunks = [];
  const res = new EventEmitter();
  res.writeHead = (status, headers) => {
    res._status = status;
    res._headers = headers;
  };
  res.write = (data) => {
    chunks.push(data);
    return true;
  };
  res.end = () => {
    res.writableEnded = true;
  };
  res.writableEnded = false;
  res.chunks = chunks;
  return res;
}

function mockWS() {
  const ws = new EventEmitter();
  ws.sent = [];
  ws.send = (data) => ws.sent.push(data);
  ws.ping = () => {};
  ws.close = () => {};
  ws.terminate = () => {};
  return ws;
}

describe('createSSEServer', () => {
  it('adds a client and returns an id', () => {
    const sse = createSSEServer({ heartbeatInterval: 0 });
    const res = mockResponse();
    const id = sse.addClient(res);
    assert.ok(id);
    assert.equal(sse.getClients().length, 1);
    sse.close();
  });

  it('sets correct SSE headers on response', () => {
    const sse = createSSEServer({ heartbeatInterval: 0 });
    const res = mockResponse();
    sse.addClient(res);
    assert.equal(res._headers['Content-Type'], 'text/event-stream');
    assert.equal(res._headers['Cache-Control'], 'no-cache');
    assert.equal(res._headers['Connection'], 'keep-alive');
    sse.close();
  });

  it('broadcasts events to all clients', () => {
    const sse = createSSEServer({ heartbeatInterval: 0 });
    const res1 = mockResponse();
    const res2 = mockResponse();
    sse.addClient(res1);
    sse.addClient(res2);
    const count = sse.broadcast('update', { value: 42 });
    assert.equal(count, 2);
    assert.ok(res1.chunks.some((c) => c.includes('event: update')));
    assert.ok(res1.chunks.some((c) => c.includes('data: {"value":42}')));
    assert.ok(res2.chunks.some((c) => c.includes('event: update')));
    sse.close();
  });

  it('sends event to a specific client', () => {
    const sse = createSSEServer({ heartbeatInterval: 0 });
    const res1 = mockResponse();
    const res2 = mockResponse();
    const id1 = sse.addClient(res1);
    sse.addClient(res2);
    sse.send(id1, 'private', 'hello');
    assert.ok(res1.chunks.some((c) => c.includes('data: hello')));
    // res2 should only have the initial newline
    assert.equal(res2.chunks.filter((c) => c.includes('data:')).length, 0);
    sse.close();
  });

  it('removes a client', () => {
    const sse = createSSEServer({ heartbeatInterval: 0 });
    const res = mockResponse();
    const id = sse.addClient(res);
    assert.equal(sse.getClients().length, 1);
    sse.removeClient(id);
    assert.equal(sse.getClients().length, 0);
    sse.close();
  });
});

describe('sseMiddleware', () => {
  it('upgrades request with text/event-stream accept header', () => {
    const sse = createSSEServer({ heartbeatInterval: 0 });
    const mw = sseMiddleware(sse);
    const req = { headers: { accept: 'text/event-stream' }, url: '/events' };
    const res = mockResponse();
    mw(req, res, () => {});
    assert.ok(req.sseClientId);
    assert.equal(sse.getClients().length, 1);
    sse.close();
  });

  it('passes through non-SSE requests', () => {
    const sse = createSSEServer({ heartbeatInterval: 0 });
    const mw = sseMiddleware(sse);
    const req = { headers: { accept: 'application/json' }, url: '/api' };
    const res = mockResponse();
    let nextCalled = false;
    mw(req, res, () => { nextCalled = true; });
    assert.ok(nextCalled);
    assert.equal(sse.getClients().length, 0);
    sse.close();
  });
});

describe('createChannelManager', () => {
  it('creates channels and manages members', () => {
    const cm = createChannelManager();
    cm.createChannel('room1');
    cm.join('room1', 'client-a');
    cm.join('room1', 'client-b');
    assert.deepEqual(cm.getMembers('room1').sort(), ['client-a', 'client-b']);
  });

  it('auto-creates channel on join if not exists', () => {
    const cm = createChannelManager();
    cm.join('lobby', 'user1');
    assert.deepEqual(cm.getMembers('lobby'), ['user1']);
    assert.ok(cm.getChannels().includes('lobby'));
  });

  it('leaves a channel', () => {
    const cm = createChannelManager();
    cm.join('room', 'a');
    cm.join('room', 'b');
    cm.leave('room', 'a');
    assert.deepEqual(cm.getMembers('room'), ['b']);
  });

  it('broadcasts to channel members via sendFn', () => {
    const cm = createChannelManager();
    cm.join('ch1', 'c1');
    cm.join('ch1', 'c2');
    const sent = [];
    const sendFn = (clientId, event, data) => {
      sent.push({ clientId, event, data });
      return true;
    };
    const count = cm.broadcast('ch1', 'msg', { text: 'hi' }, sendFn);
    assert.equal(count, 2);
    assert.equal(sent[0].event, 'msg');
    assert.deepEqual(sent[0].data, { text: 'hi' });
  });

  it('removes client from all channels', () => {
    const cm = createChannelManager();
    cm.join('a', 'user1');
    cm.join('b', 'user1');
    cm.join('b', 'user2');
    cm.removeFromAll('user1');
    assert.deepEqual(cm.getMembers('a'), []);
    assert.deepEqual(cm.getMembers('b'), ['user2']);
  });
});

describe('createWSHandler', () => {
  it('creates a handler with config', () => {
    const handler = createWSHandler({
      heartbeatInterval: 5000,
      reconnect: true,
      reconnectMaxRetries: 3,
    });
    assert.equal(handler.config.heartbeatInterval, 5000);
    assert.equal(handler.config.reconnect, true);
    assert.equal(handler.config.reconnectMaxRetries, 3);
  });

  it('handles a connection and calls onConnect', () => {
    let connected = null;
    const handler = createWSHandler({
      onConnect: (conn) => { connected = conn; },
    });
    const ws = mockWS();
    const conn = handler.handleConnection(ws, { url: '/ws' });
    assert.ok(conn.id);
    assert.equal(connected.id, conn.id);
    assert.equal(handler.getConnections().length, 1);
    handler.close();
  });

  it('handles messages with JSON parsing', () => {
    const messages = [];
    const handler = createWSHandler({
      onMessage: (conn, data) => { messages.push(data); },
    });
    const ws = mockWS();
    handler.handleConnection(ws, {});
    ws.emit('message', '{"type":"chat","text":"hi"}');
    assert.deepEqual(messages[0], { type: 'chat', text: 'hi' });
    handler.close();
  });

  it('sends data to a specific connection', () => {
    const handler = createWSHandler();
    const ws = mockWS();
    const conn = handler.handleConnection(ws, {});
    handler.send(conn.id, { event: 'ping' });
    assert.equal(ws.sent.length, 1);
    assert.equal(ws.sent[0], '{"event":"ping"}');
    handler.close();
  });

  it('broadcasts to all connections', () => {
    const handler = createWSHandler();
    const ws1 = mockWS();
    const ws2 = mockWS();
    handler.handleConnection(ws1, {});
    handler.handleConnection(ws2, {});
    const count = handler.broadcast('hello');
    assert.equal(count, 2);
    assert.equal(ws1.sent[0], 'hello');
    assert.equal(ws2.sent[0], 'hello');
    handler.close();
  });
});
