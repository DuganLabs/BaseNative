/**
 * WebSocket handler utilities.
 * This is a wrapper/helper — actual WebSocket server creation is left to the user (ws package or native).
 */

/**
 * Creates a WebSocket handler with lifecycle hooks and optional heartbeat/ping-pong.
 */
export function createWSHandler(options = {}) {
  const {
    onConnect,
    onMessage,
    onClose,
    onError,
    heartbeatInterval = 30000,
    reconnect = false,
    reconnectInterval = 1000,
    reconnectMaxRetries = 5,
    parseJSON = true,
  } = options;

  const connections = new Map();
  let connIdCounter = 0;

  function handleConnection(ws, req) {
    const id = `ws-${++connIdCounter}`;
    const conn = {
      id,
      ws,
      alive: true,
      metadata: { url: req?.url, headers: req?.headers },
    };

    connections.set(id, conn);

    if (onConnect) {
      try {
        onConnect(conn);
      } catch {
        // user handler error
      }
    }

    ws.on('message', (raw) => {
      conn.alive = true;
      if (!onMessage) return;
      let data = raw;
      if (parseJSON) {
        try {
          data = JSON.parse(typeof raw === 'string' ? raw : raw.toString());
        } catch {
          data = typeof raw === 'string' ? raw : raw.toString();
        }
      }
      try {
        onMessage(conn, data);
      } catch {
        // user handler error
      }
    });

    ws.on('pong', () => {
      conn.alive = true;
    });

    ws.on('close', (code, reason) => {
      connections.delete(id);
      if (onClose) {
        try {
          onClose(conn, code, reason);
        } catch {
          // user handler error
        }
      }
    });

    ws.on('error', (err) => {
      if (onError) {
        try {
          onError(conn, err);
        } catch {
          // user handler error
        }
      }
    });

    return conn;
  }

  let heartbeatTimer = null;

  function startHeartbeat() {
    if (heartbeatTimer || heartbeatInterval <= 0) return;
    heartbeatTimer = setInterval(() => {
      for (const [id, conn] of connections) {
        if (!conn.alive) {
          conn.ws.terminate?.();
          connections.delete(id);
          continue;
        }
        conn.alive = false;
        try {
          conn.ws.ping?.();
        } catch {
          connections.delete(id);
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

  function send(connectionId, data) {
    const conn = connections.get(connectionId);
    if (!conn) return false;
    const payload = typeof data === 'string' ? data : JSON.stringify(data);
    try {
      conn.ws.send(payload);
      return true;
    } catch {
      return false;
    }
  }

  function broadcast(data) {
    const payload = typeof data === 'string' ? data : JSON.stringify(data);
    let count = 0;
    for (const conn of connections.values()) {
      try {
        conn.ws.send(payload);
        count++;
      } catch {
        // skip failed
      }
    }
    return count;
  }

  function getConnections() {
    return Array.from(connections.values()).map((c) => ({
      id: c.id,
      alive: c.alive,
      metadata: c.metadata,
    }));
  }

  function close() {
    stopHeartbeat();
    for (const conn of connections.values()) {
      try {
        conn.ws.close?.();
      } catch {
        // ignore
      }
    }
    connections.clear();
  }

  return {
    handleConnection,
    send,
    broadcast,
    getConnections,
    startHeartbeat,
    stopHeartbeat,
    close,
    get config() {
      return {
        heartbeatInterval,
        reconnect,
        reconnectInterval,
        reconnectMaxRetries,
        parseJSON,
      };
    },
  };
}
