/**
 * Server-Sent Events (SSE) utilities.
 */

let clientIdCounter = 0;

/**
 * Creates an SSE server instance for managing SSE connections and broadcasting events.
 */
export function createSSEServer(options = {}) {
  const { heartbeatInterval = 30000 } = options;
  const clients = new Map();
  let heartbeatTimer = null;

  function startHeartbeat() {
    if (heartbeatTimer || heartbeatInterval <= 0) return;
    heartbeatTimer = setInterval(() => {
      for (const [id, client] of clients) {
        try {
          client.res.write(': heartbeat\n\n');
        } catch {
          removeClient(id);
        }
      }
    }, heartbeatInterval);
    if (heartbeatTimer.unref) heartbeatTimer.unref();
  }

  function stopHeartbeat() {
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer);
      heartbeatTimer = null;
    }
  }

  function addClient(res, options = {}) {
    const id = options.id ?? `sse-${++clientIdCounter}`;
    const client = { id, res, metadata: options.metadata ?? {} };

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      ...options.headers,
    });
    res.write('\n');

    clients.set(id, client);

    res.on('close', () => removeClient(id));

    if (clients.size === 1) startHeartbeat();

    return id;
  }

  function removeClient(id) {
    const client = clients.get(id);
    if (client) {
      clients.delete(id);
      try {
        if (!client.res.writableEnded) client.res.end();
      } catch {
        // already closed
      }
    }
    if (clients.size === 0) stopHeartbeat();
    return client !== undefined;
  }

  function formatEvent(event, data) {
    let message = '';
    if (event) message += `event: ${event}\n`;
    const payload = typeof data === 'string' ? data : JSON.stringify(data);
    for (const line of payload.split('\n')) {
      message += `data: ${line}\n`;
    }
    message += '\n';
    return message;
  }

  function send(clientId, event, data) {
    const client = clients.get(clientId);
    if (!client) return false;
    try {
      client.res.write(formatEvent(event, data));
      return true;
    } catch {
      removeClient(clientId);
      return false;
    }
  }

  function broadcast(event, data) {
    const message = formatEvent(event, data);
    let count = 0;
    for (const [id, client] of clients) {
      try {
        client.res.write(message);
        count++;
      } catch {
        removeClient(id);
      }
    }
    return count;
  }

  function getClients() {
    return Array.from(clients.entries()).map(([id, c]) => ({
      id,
      metadata: c.metadata,
    }));
  }

  function close() {
    stopHeartbeat();
    for (const [id] of clients) {
      removeClient(id);
    }
  }

  return { addClient, removeClient, send, broadcast, getClients, close };
}

/**
 * Middleware that upgrades requests with Accept: text/event-stream to SSE connections.
 */
export function sseMiddleware(sseServer) {
  return (req, res, next) => {
    const accept = req.headers?.accept ?? '';
    if (accept.includes('text/event-stream')) {
      const clientId = sseServer.addClient(res, { metadata: { url: req.url } });
      req.sseClientId = clientId;
      return;
    }
    if (typeof next === 'function') next();
  };
}
