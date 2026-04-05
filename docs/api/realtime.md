# @basenative/realtime

> Server-Sent Events, WebSocket helpers, and named channel management.

## Overview

`@basenative/realtime` provides three building blocks for real-time server push. `createSSEServer` manages long-lived SSE connections and exposes a broadcast API. `createChannelManager` organizes clients into named channels (chat rooms, live feeds, etc.) and works with any underlying transport. `createWSHandler` handles WebSocket connections with a message routing API. All implementations are server-agnostic and require no external dependencies.

## Installation

```bash
npm install @basenative/realtime
```

## Quick Start

```js
import { createSSEServer, sseMiddleware, createChannelManager } from '@basenative/realtime';
import http from 'node:http';

const sse = createSSEServer({ heartbeatInterval: 30_000 });
const channels = createChannelManager();

// Register new SSE client
http.createServer((req, res) => {
  if (req.url === '/events') {
    const clientId = sse.addClient(res, { metadata: { url: req.url } });
    channels.join('global', clientId);
    return;
  }
  res.end('OK');
}).listen(3000);

// Broadcast to all clients in a channel
channels.broadcast('global', 'message', { text: 'Hello!' }, (id, event, data) =>
  sse.send(id, event, data)
);
```

## API Reference

### createSSEServer(options)

Creates an SSE server that manages connections and broadcasts events.

**Parameters:**
- `options.heartbeatInterval` — interval in ms for sending keep-alive comments; default `30000`; set to `0` to disable

**Returns:** SSE server object.

---

#### sseServer.addClient(res, options)

Registers a new SSE client and sends the required HTTP headers.

**Parameters:**
- `res` — Node.js `ServerResponse` object
- `options.id` — custom client ID; auto-generated if omitted
- `options.metadata` — arbitrary metadata stored with the client
- `options.headers` — additional response headers

**Returns:** Client ID string. The client is automatically removed when the connection closes.

---

#### sseServer.send(clientId, event, data)

Sends an event to a specific client.

**Parameters:**
- `clientId` — client ID returned by `addClient`
- `event` — event name string (sent as `event:` field); pass `null` for unnamed events
- `data` — string or JSON-serializable value (sent as `data:` field)

**Returns:** `true` if sent successfully; `false` if client not found or connection closed.

---

#### sseServer.broadcast(event, data)

Sends an event to all connected clients.

**Parameters:**
- `event` — event name
- `data` — string or JSON-serializable value

**Returns:** Number of clients reached.

---

#### sseServer.removeClient(clientId)

Disconnects and removes a client.

**Returns:** `true` if the client existed.

---

#### sseServer.getClients()

Returns an array of `{ id, metadata }` for all connected clients.

---

#### sseServer.close()

Disconnects all clients and stops the heartbeat timer.

---

### sseMiddleware(sseServer)

Express-compatible middleware that upgrades requests with `Accept: text/event-stream` to SSE connections.

**Parameters:**
- `sseServer` — SSE server instance

**Returns:** Middleware function `(req, res, next) => void`.

After upgrade:
- `req.sseClientId` — the assigned client ID

**Example:**
```js
app.get('/events', sseMiddleware(sse), (req, res) => {
  // req.sseClientId is set; response is held open
});
```

---

### createChannelManager()

Creates a channel manager for grouping clients into named channels.

**Returns:** Channel manager object.

---

#### channelManager.join(channelName, clientId)

Adds a client to a channel, creating it if necessary.

**Returns:** `true`

---

#### channelManager.leave(channelName, clientId)

Removes a client from a channel.

**Returns:** `true` if the client was removed.

---

#### channelManager.broadcast(channelName, event, data, sendFn)

Broadcasts to all members of a channel using a caller-supplied send function.

**Parameters:**
- `channelName` — channel name string
- `event` — event name
- `data` — event payload
- `sendFn` — function `(clientId, event, data) => boolean`

**Returns:** Number of successful sends.

---

#### channelManager.getMembers(channelName)

Returns an array of client IDs in a channel.

---

#### channelManager.removeFromAll(clientId)

Removes a client from every channel. Call this when a connection closes.

**Returns:** Number of channels the client was removed from.

---

#### channelManager.deleteChannel(channelName)

Removes a channel and all its member references.

---

#### channelManager.getChannels()

Returns an array of all channel name strings.

---

### createWSHandler(options)

Creates a WebSocket connection handler with message routing.

**Parameters:**
- `options.onConnect(ws, req)` — called when a client connects
- `options.onDisconnect(ws, code, reason)` — called when a client disconnects
- `options.onMessage(ws, message)` — called for each incoming message
- `options.onError(ws, error)` — called on socket errors

**Returns:** Handler function for use with a WebSocket server.

## Integration

Combine `createSSEServer` and `createChannelManager` for chat-style features. Use the channel manager's `removeFromAll` in the SSE close event to keep membership state clean. Pair with `@basenative/auth` session data to scope channels per user or tenant.
