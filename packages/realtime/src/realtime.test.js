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

  it('broadcasts object data as JSON string', () => {
    const handler = createWSHandler();
    const ws = mockWS();
    handler.handleConnection(ws, {});
    handler.broadcast({ type: 'update', value: 1 });
    assert.equal(ws.sent[0], '{"type":"update","value":1}');
    handler.close();
  });

  it('calls onClose when connection closes', () => {
    let closed = null;
    const handler = createWSHandler({
      onClose: (conn) => { closed = conn; },
    });
    const ws = mockWS();
    const conn = handler.handleConnection(ws, {});
    ws.emit('close', 1000, 'normal');
    assert.equal(closed.id, conn.id);
    handler.close();
  });

  it('removes connection from list on close', () => {
    const handler = createWSHandler();
    const ws = mockWS();
    handler.handleConnection(ws, {});
    assert.equal(handler.getConnections().length, 1);
    ws.emit('close', 1000);
    assert.equal(handler.getConnections().length, 0);
    handler.close();
  });

  it('calls onError with error object', () => {
    let errorInfo = null;
    const handler = createWSHandler({
      onError: (conn, err) => { errorInfo = { conn, err }; },
    });
    const ws = mockWS();
    handler.handleConnection(ws, {});
    const err = new Error('network error');
    ws.emit('error', err);
    assert.ok(errorInfo);
    assert.equal(errorInfo.err.message, 'network error');
    handler.close();
  });

  it('handles non-JSON message when parseJSON is false', () => {
    const messages = [];
    const handler = createWSHandler({
      parseJSON: false,
      onMessage: (conn, data) => { messages.push(data); },
    });
    const ws = mockWS();
    handler.handleConnection(ws, {});
    ws.emit('message', 'plain text message');
    assert.equal(messages[0], 'plain text message');
    handler.close();
  });

  it('falls back to raw string on invalid JSON when parseJSON is true', () => {
    const messages = [];
    const handler = createWSHandler({
      onMessage: (conn, data) => { messages.push(data); },
    });
    const ws = mockWS();
    handler.handleConnection(ws, {});
    ws.emit('message', 'not{json}');
    assert.equal(messages[0], 'not{json}');
    handler.close();
  });

  it('send returns false for unknown connection id', () => {
    const handler = createWSHandler();
    const result = handler.send('nonexistent', 'data');
    assert.equal(result, false);
    handler.close();
  });

  it('close terminates all connections', () => {
    const handler = createWSHandler();
    handler.handleConnection(mockWS(), {});
    handler.handleConnection(mockWS(), {});
    assert.equal(handler.getConnections().length, 2);
    handler.close();
    assert.equal(handler.getConnections().length, 0);
  });

  it('metadata includes url from request', () => {
    const handler = createWSHandler();
    const ws = mockWS();
    const conn = handler.handleConnection(ws, { url: '/live/chat' });
    assert.equal(conn.metadata.url, '/live/chat');
    handler.close();
  });
});

describe('createSSEServer — edge cases', () => {
  it('send returns false for unknown client id', () => {
    const sse = createSSEServer({ heartbeatInterval: 0 });
    const result = sse.send('nonexistent', 'event', 'data');
    assert.equal(result, false);
    sse.close();
  });

  it('removeClient returns false for unknown id', () => {
    const sse = createSSEServer({ heartbeatInterval: 0 });
    const result = sse.removeClient('nobody');
    assert.equal(result, false);
    sse.close();
  });

  it('removes client automatically on response close', () => {
    const sse = createSSEServer({ heartbeatInterval: 0 });
    const res = mockResponse();
    sse.addClient(res);
    assert.equal(sse.getClients().length, 1);
    res.emit('close');
    assert.equal(sse.getClients().length, 0);
    sse.close();
  });

  it('accepts custom client id via options', () => {
    const sse = createSSEServer({ heartbeatInterval: 0 });
    const res = mockResponse();
    const id = sse.addClient(res, { id: 'my-client-id' });
    assert.equal(id, 'my-client-id');
    sse.close();
  });

  it('stores metadata on client', () => {
    const sse = createSSEServer({ heartbeatInterval: 0 });
    const res = mockResponse();
    sse.addClient(res, { metadata: { userId: 42 } });
    const clients = sse.getClients();
    assert.equal(clients[0].metadata.userId, 42);
    sse.close();
  });

  it('formats multi-line data as multiple data: lines', () => {
    const sse = createSSEServer({ heartbeatInterval: 0 });
    const res = mockResponse();
    sse.addClient(res, { id: 'ml' });
    sse.send('ml', 'note', 'line1\nline2');
    const allChunks = res.chunks.join('');
    assert.ok(allChunks.includes('data: line1'));
    assert.ok(allChunks.includes('data: line2'));
    sse.close();
  });
});

describe('createChannelManager — edge cases', () => {
  it('returns empty array for members of nonexistent channel', () => {
    const cm = createChannelManager();
    assert.deepEqual(cm.getMembers('ghost'), []);
  });

  it('leave returns false for nonexistent channel', () => {
    const cm = createChannelManager();
    const result = cm.leave('ghost', 'user1');
    assert.equal(result, false);
  });

  it('leave returns false when member not in channel', () => {
    const cm = createChannelManager();
    cm.createChannel('room');
    const result = cm.leave('room', 'nobody');
    assert.equal(result, false);
  });

  it('deleteChannel removes it from list', () => {
    const cm = createChannelManager();
    cm.createChannel('temp');
    assert.ok(cm.getChannels().includes('temp'));
    cm.deleteChannel('temp');
    assert.ok(!cm.getChannels().includes('temp'));
  });

  it('broadcast returns 0 for nonexistent channel', () => {
    const cm = createChannelManager();
    const count = cm.broadcast('ghost', 'event', {}, () => true);
    assert.equal(count, 0);
  });

  it('removeFromAll returns count of channels removed from', () => {
    const cm = createChannelManager();
    cm.join('a', 'u1');
    cm.join('b', 'u1');
    cm.join('c', 'u2');
    const count = cm.removeFromAll('u1');
    assert.equal(count, 2);
  });

  it('createChannel is idempotent — returns existing channel on duplicate', () => {
    const cm = createChannelManager();
    const ch1 = cm.createChannel('room');
    cm.join('room', 'a');
    const ch2 = cm.createChannel('room'); // should return same channel
    assert.equal(ch1.name, ch2.name);
    assert.deepEqual(cm.getMembers('room'), ['a']); // member should still be there
  });
});

describe('createSSEServer — broadcast edge cases', () => {
  it('broadcast with no clients returns 0', () => {
    const sse = createSSEServer({ heartbeatInterval: 0 });
    const count = sse.broadcast('update', { value: 1 });
    assert.equal(count, 0);
    sse.close();
  });

  it('broadcast serialises object data to JSON', () => {
    const sse = createSSEServer({ heartbeatInterval: 0 });
    const res = mockResponse();
    sse.addClient(res, { id: 'c1' });
    sse.broadcast('tick', { n: 99 });
    const all = res.chunks.join('');
    assert.ok(all.includes('data: {"n":99}'));
    sse.close();
  });

  it('sseMiddleware stores url in client metadata', () => {
    const sse = createSSEServer({ heartbeatInterval: 0 });
    const mw = sseMiddleware(sse);
    const req = { headers: { accept: 'text/event-stream' }, url: '/events/live' };
    const res = mockResponse();
    mw(req, res, () => {});
    const clients = sse.getClients();
    assert.equal(clients[0].metadata.url, '/events/live');
    sse.close();
  });

  it('send formats plain string data without JSON serialization', () => {
    const sse = createSSEServer({ heartbeatInterval: 0 });
    const res = mockResponse();
    sse.addClient(res, { id: 'plain' });
    sse.send('plain', 'msg', 'just a string');
    const all = res.chunks.join('');
    assert.ok(all.includes('data: just a string'));
    sse.close();
  });
});

describe('createWSHandler — additional', () => {
  it('getConnections returns all connection ids', () => {
    const handler = createWSHandler();
    const ws1 = mockWS();
    const ws2 = mockWS();
    const c1 = handler.handleConnection(ws1, {});
    const c2 = handler.handleConnection(ws2, {});
    const ids = handler.getConnections().map(c => c.id);
    assert.ok(ids.includes(c1.id));
    assert.ok(ids.includes(c2.id));
    handler.close();
  });

  it('connection alive defaults to true', () => {
    const handler = createWSHandler();
    const ws = mockWS();
    handler.handleConnection(ws, {});
    const conns = handler.getConnections();
    assert.equal(conns[0].alive, true);
    handler.close();
  });

  it('onConnect error is swallowed and connection still added', () => {
    const handler = createWSHandler({
      onConnect: () => { throw new Error('connect error'); },
    });
    const ws = mockWS();
    const conn = handler.handleConnection(ws, {});
    assert.ok(conn.id);
    assert.equal(handler.getConnections().length, 1);
    handler.close();
  });

  it('pong event sets alive back to true', () => {
    const handler = createWSHandler({ heartbeatInterval: 0 });
    const ws = mockWS();
    handler.handleConnection(ws, {});
    ws.emit('pong');
    const conns = handler.getConnections();
    assert.equal(conns[0].alive, true);
    handler.close();
  });
});

describe('createWSHandler — send and broadcast', () => {
  it('send returns true on success', () => {
    const sent = [];
    const ws = mockWS();
    ws.send = (d) => { sent.push(d); };
    const handler = createWSHandler();
    const conn = handler.handleConnection(ws, {});
    const result = handler.send(conn.id, 'hello');
    assert.equal(result, true);
    assert.equal(sent.length, 1);
    handler.close();
  });

  it('send returns false for unknown id', () => {
    const handler = createWSHandler();
    const result = handler.send('nonexistent', 'data');
    assert.equal(result, false);
    handler.close();
  });

  it('broadcast returns count of recipients', () => {
    const handler = createWSHandler();
    const ws1 = mockWS();
    const ws2 = mockWS();
    handler.handleConnection(ws1, {});
    handler.handleConnection(ws2, {});
    const count = handler.broadcast('ping');
    assert.equal(count, 2);
    handler.close();
  });

  it('broadcast serializes object to JSON', () => {
    const received = [];
    const ws = mockWS();
    ws.send = (d) => { received.push(d); };
    const handler = createWSHandler();
    handler.handleConnection(ws, {});
    handler.broadcast({ type: 'event' });
    assert.equal(received[0], JSON.stringify({ type: 'event' }));
    handler.close();
  });

  it('config getter returns handler configuration', () => {
    const handler = createWSHandler({ heartbeatInterval: 5000 });
    const cfg = handler.config;
    assert.equal(cfg.heartbeatInterval, 5000);
    handler.close();
  });
});

describe('createWSHandler — message and close events', () => {
  it('onMessage receives parsed JSON when parseJSON is true', () => {
    const received = [];
    const handler = createWSHandler({ onMessage: (conn, data) => received.push(data) });
    const ws = mockWS();
    handler.handleConnection(ws, {});
    ws.emit('message', JSON.stringify({ action: 'ping' }));
    assert.deepEqual(received[0], { action: 'ping' });
    handler.close();
  });

  it('ws close event removes connection', () => {
    const handler = createWSHandler();
    const ws = mockWS();
    handler.handleConnection(ws, {});
    assert.equal(handler.getConnections().length, 1);
    ws.emit('close');
    assert.equal(handler.getConnections().length, 0);
    handler.close();
  });
});
