# @basenative/realtime

> Server-Sent Events, WebSocket handling, and named channel management

Part of the [BaseNative](https://github.com/DuganLabs/basenative) ecosystem — a signal-based web runtime over native HTML.

## Install

```bash
npm install @basenative/realtime
```

## Quick Start — SSE

```js
import { createSSEServer, sseMiddleware } from '@basenative/realtime';
import { createPipeline } from '@basenative/middleware';

const sse = createSSEServer({ heartbeatInterval: 30_000 });

// Broadcast to all connected clients
sse.broadcast('update', { timestamp: Date.now() });

// SSE endpoint
const pipeline = createPipeline().use(sseMiddleware(sse));
```

## Quick Start — Channels

```js
import { createChannelManager } from '@basenative/realtime';

const channels = createChannelManager();

// Subscribe
const unsub = channels.subscribe('room:42', (event, data) => {
  console.log(event, data);
});

// Publish
channels.publish('room:42', 'message', { text: 'Hello!' });

// Cleanup
unsub();
```

## Quick Start — WebSockets

```js
import { createWSHandler } from '@basenative/realtime';

const ws = createWSHandler({
  onConnect(socket) { console.log('connected'); },
  onMessage(socket, message) { socket.send(message); },
  onClose(socket) { console.log('disconnected'); },
});

// Pass to your HTTP upgrade handler
server.on('upgrade', ws.handleUpgrade);
```

## API

### `createSSEServer(options?)`

Creates an SSE server managing multiple client connections. Options: `heartbeatInterval` (ms, default: 30000).

Returns:

- `addClient(res, options?)` — Registers a response stream as an SSE client. Returns a client ID.
- `removeClient(id)` — Removes a client connection.
- `send(clientId, event, data?)` — Sends an event to a specific client.
- `broadcast(event, data?)` — Sends an event to all connected clients.
- `clients` — Map of connected client objects.

### `sseMiddleware(sseServer, options?)`

Middleware that automatically registers incoming requests as SSE clients.

### `createChannelManager()`

Creates a named pub/sub channel manager.

- `subscribe(channel, handler)` — Subscribes to a channel. Returns an unsubscribe function.
- `publish(channel, event, data?)` — Publishes an event to all channel subscribers.
- `unsubscribeAll(channel)` — Removes all subscribers from a channel.

### `createWSHandler(options)`

Creates a WebSocket connection handler. Options: `onConnect`, `onMessage`, `onClose`, `onError`.

- `handleUpgrade(req, socket, head)` — Node.js HTTP upgrade event handler.

## License

MIT
